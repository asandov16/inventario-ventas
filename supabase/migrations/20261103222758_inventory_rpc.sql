-- Inventory: create products, restock and edit/adjust counts (CU-09, CU-10, CU-11, RF-INV-05).

-- Lets a retried "create product" return the product already created (RN-18).
alter table public.products add column idempotency_key uuid unique;

-- Product as returned to the UI. The cost is only included for users with costs.read.
create or replace function private.product_json(p_product_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
    select jsonb_build_object(
        'id', p.id,
        'code', p.code,
        'name', p.name,
        'category_id', p.category_id,
        'category_name', c.name,
        'price', p.price,
        'stock', p.stock,
        'min_stock', p.min_stock,
        'active', p.active,
        'version', p.version,
        'unit_cost', case when private.has_permission('costs.read') then pc.unit_cost end
    )
    from public.products as p
    inner join public.categories as c on p.category_id = c.id
    left join public.product_costs as pc on p.id = pc.product_id
    where p.id = p_product_id;
$$;

create or replace function private.validate_product_fields(
    p_name text, p_price integer, p_min_stock integer, p_unit_cost integer
)
returns void
language plpgsql
set search_path = ''
as $$
begin
    if length(trim(coalesce(p_name, ''))) < 2 then
        perform private.raise_business_error('invalid_name');
    end if;
    if p_price is null or p_price <= 0 then
        perform private.raise_business_error('invalid_price');
    end if;
    if p_min_stock is null or p_min_stock < 0 then
        perform private.raise_business_error('invalid_quantity', jsonb_build_object('field', 'min_stock'));
    end if;
    if p_unit_cost is not null and p_unit_cost < 0 then
        perform private.raise_business_error('invalid_amount', jsonb_build_object('field', 'unit_cost'));
    end if;
end;
$$;

-- CU-10. Code = <category prefix>-<next sequence>, e.g. PER-006 (RF-INV-01).
create or replace function public.create_product(
    p_idempotency_key uuid,
    p_name text,
    p_category_id uuid,
    p_price integer,
    p_min_stock integer,
    p_initial_qty integer,
    p_unit_cost integer,
    p_confirm_similar boolean default false,
    p_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
    v_product_id uuid;
    v_code text;
    v_similar jsonb;
    v_movement_id uuid;
    v_qty integer := coalesce(p_initial_qty, 0);
begin
    perform private.require_permission('inventory.restock');
    v_business_id := private.current_business_id();
    perform private.lock_key('product:' || p_idempotency_key::text);

    select p.id into v_product_id
    from public.products as p
    where p.business_id = v_business_id and (p.idempotency_key = p_idempotency_key or p.id = p_id);
    if v_product_id is not null then
        return jsonb_build_object('status', 'replay', 'product', private.product_json(v_product_id));
    end if;

    perform private.validate_product_fields(p_name, p_price, p_min_stock, p_unit_cost);
    if v_qty < 0 then
        perform private.raise_business_error('invalid_quantity', jsonb_build_object('field', 'initial_qty'));
    end if;

    -- Same or very similar name: offer to restock the existing product instead (CU-10).
    if not coalesce(p_confirm_similar, false) then
        select jsonb_agg(jsonb_build_object('id', p.id, 'code', p.code, 'name', p.name, 'stock', p.stock))
        into v_similar
        from public.products as p
        where
            p.business_id = v_business_id
            and (
                private.search_text(p.name) = private.search_text(p_name)
                or extensions.similarity(private.search_text(p.name), private.search_text(p_name)) > 0.6
            );
        if v_similar is not null then
            return jsonb_build_object('status', 'similar', 'candidates', v_similar);
        end if;
    end if;

    -- Next code for the category, taken under a row lock.
    update public.categories
    set last_seq = last_seq + 1
    where id = p_category_id and business_id = v_business_id and active
    returning prefix || '-' || lpad(last_seq::text, 3, '0') into v_code;
    if v_code is null then
        perform private.raise_business_error('category_required');
    end if;

    insert into public.products (
        id, business_id, code, name, category_id, price, stock, min_stock, idempotency_key
    ) values (
        coalesce(p_id, gen_random_uuid()), v_business_id, v_code, trim(p_name), p_category_id,
        p_price, v_qty, p_min_stock, p_idempotency_key
    )
    returning id into v_product_id;

    insert into public.product_costs (product_id, unit_cost, updated_by)
    values (v_product_id, coalesce(p_unit_cost, 0), auth.uid());

    if v_qty > 0 then
        insert into public.inventory_movements (
            business_id, product_id, type, qty_delta, stock_after, reason, created_by
        ) values (v_business_id, v_product_id, 'initial', v_qty, v_qty, 'Producto nuevo', auth.uid())
        returning id into v_movement_id;

        if p_unit_cost is not null then
            insert into public.inventory_movement_costs (movement_id, unit_cost) values (v_movement_id, p_unit_cost);
        end if;
    end if;

    return jsonb_build_object('status', 'ok', 'product', private.product_json(v_product_id));
end;
$$;

-- CU-09. Adds units; optionally updates the current cost.
create or replace function public.restock_product(
    p_idempotency_key uuid,
    p_product_id uuid,
    p_qty integer,
    p_unit_cost integer default null,
    p_confirm_duplicate boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
    v_product public.products%rowtype;
    v_existing public.inventory_movements%rowtype;
    v_movement_id uuid;
begin
    perform private.require_permission('inventory.restock');
    v_business_id := private.current_business_id();
    perform private.lock_key('restock:' || p_idempotency_key::text);

    select m.* into v_existing
    from public.inventory_movements as m
    where m.business_id = v_business_id and m.idempotency_key = p_idempotency_key;
    if found then
        return jsonb_build_object(
            'status', 'replay',
            'product', private.product_json(v_existing.product_id),
            'stock_before', v_existing.stock_after - v_existing.qty_delta,
            'stock_after', v_existing.stock_after
        );
    end if;

    if p_qty is null or p_qty <= 0 then
        perform private.raise_business_error('invalid_quantity', jsonb_build_object('field', 'qty'));
    end if;
    if p_unit_cost is not null and p_unit_cost < 0 then
        perform private.raise_business_error('invalid_amount', jsonb_build_object('field', 'unit_cost'));
    end if;

    select p.* into v_product
    from public.products as p
    where p.id = p_product_id and p.business_id = v_business_id
    for update;
    if not found then
        perform private.raise_business_error('product_not_found');
    end if;

    -- Possible duplicate: same product and quantity in the last 10 minutes (RN-18).
    if not coalesce(p_confirm_duplicate, false) then
        select m.* into v_existing
        from public.inventory_movements as m
        where
            m.product_id = v_product.id and m.type = 'restock' and m.qty_delta = p_qty
            and m.created_at > now() - private.duplicate_window()
        order by m.created_at desc
        limit 1;
        if found then
            return jsonb_build_object(
                'status', 'possible_duplicate',
                'existing', jsonb_build_object('id', v_existing.id, 'qty', v_existing.qty_delta,
                    'created_at', v_existing.created_at),
                'product', private.product_json(v_product.id)
            );
        end if;
    end if;

    update public.products set stock = stock + p_qty where id = v_product.id;

    insert into public.inventory_movements (
        business_id, product_id, type, qty_delta, stock_after, idempotency_key, created_by
    ) values (
        v_business_id, v_product.id, 'restock', p_qty, v_product.stock + p_qty, p_idempotency_key, auth.uid()
    )
    returning id into v_movement_id;

    if p_unit_cost is not null then
        insert into public.inventory_movement_costs (movement_id, unit_cost) values (v_movement_id, p_unit_cost);
        insert into public.product_costs (product_id, unit_cost, updated_by)
        values (v_product.id, p_unit_cost, auth.uid())
        on conflict (product_id) do update
        set unit_cost = excluded.unit_cost, updated_by = excluded.updated_by;
    end if;

    return jsonb_build_object(
        'status', 'ok',
        'product', private.product_json(v_product.id),
        'stock_before', v_product.stock,
        'stock_after', v_product.stock + p_qty
    );
end;
$$;

-- CU-11 and RF-INV-05. Optimistic locking with `version`: if someone else saved first, the
-- edit is refused with concurrent_update instead of silently overwriting their change.
create or replace function public.update_product(
    p_product_id uuid,
    p_expected_version integer,
    p_name text,
    p_price integer,
    p_min_stock integer,
    p_unit_cost integer default null,
    p_counted_stock integer default null,
    p_active boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
    v_product public.products%rowtype;
    v_cost integer;
begin
    perform private.require_permission('products.edit');
    v_business_id := private.current_business_id();

    select p.* into v_product
    from public.products as p
    where p.id = p_product_id and p.business_id = v_business_id
    for update;
    if not found then
        perform private.raise_business_error('product_not_found');
    end if;
    if v_product.version <> p_expected_version then
        perform private.raise_business_error(
            'concurrent_update', jsonb_build_object('version', v_product.version)
        );
    end if;

    perform private.validate_product_fields(p_name, p_price, p_min_stock, p_unit_cost);
    if p_counted_stock is not null and p_counted_stock < 0 then
        perform private.raise_business_error('invalid_quantity', jsonb_build_object('field', 'counted_stock'));
    end if;

    update public.products
    set
        name = trim(p_name),
        price = p_price,
        min_stock = p_min_stock,
        stock = coalesce(p_counted_stock, stock),
        active = coalesce(p_active, active),
        version = version + 1
    where id = v_product.id;

    -- A physical count different from the system is recorded as an adjustment (RN-12).
    if p_counted_stock is not null and p_counted_stock <> v_product.stock then
        insert into public.inventory_movements (
            business_id, product_id, type, qty_delta, stock_after, reason, created_by
        ) values (
            v_business_id, v_product.id, 'adjustment', p_counted_stock - v_product.stock, p_counted_stock,
            format('Ajuste de conteo: %s → %s', v_product.stock, p_counted_stock), auth.uid()
        );
    end if;

    if p_unit_cost is not null then
        insert into public.product_costs (product_id, unit_cost, updated_by)
        values (v_product.id, p_unit_cost, auth.uid())
        on conflict (product_id) do update
        set unit_cost = excluded.unit_cost, updated_by = excluded.updated_by;
    end if;

    select pc.unit_cost into v_cost from public.product_costs as pc where pc.product_id = v_product.id;

    return jsonb_build_object(
        'status', 'ok',
        'product', private.product_json(v_product.id),
        'stock_adjusted', case
            when p_counted_stock is not null and p_counted_stock <> v_product.stock
                then jsonb_build_object('from', v_product.stock, 'to', p_counted_stock)
        end,
        -- Non-blocking warning shown by the UI (CU-11).
        'price_below_cost', v_cost is not null and p_price < v_cost
    );
end;
$$;

revoke execute on function public.create_product(uuid, text, uuid, integer, integer, integer, integer, boolean, uuid)
from public, anon;
revoke execute on function public.restock_product(uuid, uuid, integer, integer, boolean) from public, anon;
revoke execute on function public.update_product(uuid, integer, text, integer, integer, integer, integer, boolean)
from public, anon;

grant execute on function public.create_product(uuid, text, uuid, integer, integer, integer, integer, boolean, uuid)
to authenticated;
grant execute on function public.restock_product(uuid, uuid, integer, integer, boolean) to authenticated;
grant execute on function public.update_product(uuid, integer, text, integer, integer, integer, integer, boolean)
to authenticated;
