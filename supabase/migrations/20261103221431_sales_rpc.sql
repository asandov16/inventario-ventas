-- Sales, payments, voids and balances carried over from paper (CU-01, CU-02, CU-05, CU-06, D-12).
-- Each function is one transaction: it is saved completely or not at all.

-- Window for "possible duplicate" detection (RN-18).
create or replace function private.duplicate_window()
returns interval
language sql
immutable
set search_path = ''
as $$
    select interval '10 minutes';
$$;

create or replace function private.sale_json(p_sale_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
    select jsonb_build_object(
        'id', s.id,
        'folio', s.folio,
        'type', s.type,
        'source', s.source,
        'total', s.total,
        'months', s.months,
        'down_payment', s.down_payment,
        'customer_id', s.customer_id,
        'customer_name', c.name,
        'client_created_at', s.client_created_at,
        'voided_at', s.voided_at,
        'balance', a.balance,
        'status', a.status,
        'installments', coalesce((
            select jsonb_agg(
                jsonb_build_object('number', i.number, 'due_date', i.due_date, 'amount', i.amount)
                order by i.number
            )
            from public.installments as i
            where i.sale_id = s.id
        ), '[]'::jsonb)
    )
    from public.sales as s
    inner join public.customers as c on s.customer_id = c.id
    inner join public.v_sale_accounts as a on s.id = a.sale_id
    where s.id = p_sale_id;
$$;

create or replace function private.require_payment_method(p_business_id uuid, p_payment_method_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
    if p_payment_method_id is null or not exists (
        select 1 from public.payment_methods
        where id = p_payment_method_id and business_id = p_business_id and active
    ) then
        perform private.raise_business_error('payment_method_required');
    end if;
end;
$$;

-- Takes the next folio with a row lock: consecutive, never reused, no gaps (a rollback
-- also rolls the counter back) (RN-15).
create or replace function private.next_folio(p_business_id uuid)
returns integer
language sql
set search_path = ''
as $$
    update public.businesses set last_folio = last_folio + 1
    where id = p_business_id
    returning last_folio;
$$;

create or replace function private.require_customer(p_business_id uuid, p_customer_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
    if p_customer_id is null or not exists (
        select 1 from public.customers where id = p_customer_id and business_id = p_business_id
    ) then
        perform private.raise_business_error('customer_required');
    end if;
end;
$$;

-- CU-01 / CU-02. Steps follow roadmap F2-T03.
create or replace function public.register_sale(
    p_idempotency_key uuid,
    p_customer_id uuid,
    p_type text,
    p_items jsonb,
    p_payment_method_id uuid,
    p_expected_total integer,
    p_months integer default null,
    p_down_payment integer default 0,
    p_confirm_duplicate boolean default false,
    p_id uuid default null,
    p_client_created_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
    v_user_id uuid := auth.uid();
    v_sale_id uuid;
    v_existing_id uuid;
    v_items jsonb;
    v_line record;
    v_total integer;
    v_down integer := coalesce(p_down_payment, 0);
    v_folio integer;
    v_created_at timestamptz := coalesce(p_client_created_at, now());
    v_sale_date date;
    v_new_stock integer;
    v_item_id uuid;
begin
    -- 1. Permission.
    perform private.require_permission('sales.create');
    v_business_id := private.current_business_id();

    -- 2. Replay: the same key (or the same offline id) returns the sale already saved (RN-18).
    --    Concurrent retries with the same key wait here for the first one to finish.
    perform private.lock_key('sale:' || p_idempotency_key::text);
    if p_id is not null then
        perform private.lock_key('sale:' || p_id::text);
    end if;
    select s.id into v_existing_id
    from public.sales as s
    where s.business_id = v_business_id
      and (s.idempotency_key = p_idempotency_key or s.id = p_id);
    if v_existing_id is not null then
        return jsonb_build_object('status', 'replay', 'sale', private.sale_json(v_existing_id));
    end if;

    -- 3. Customer of this business is mandatory (RN-01).
    perform private.require_customer(v_business_id, p_customer_id);

    if p_type is null or p_type not in ('cash', 'installments') then
        perform private.raise_business_error('invalid_term', jsonb_build_object('type', p_type));
    end if;

    -- 4. Normalize items: merge repeated products, quantities must be positive integers.
    begin
        select jsonb_agg(jsonb_build_object('product_id', product_id, 'qty', qty) order by product_id)
        into v_items
        from (
            select (e ->> 'product_id')::uuid as product_id, sum((e ->> 'qty')::integer) as qty
            from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as e
            group by 1
        ) as merged;
    exception when others then
        perform private.raise_business_error('invalid_items');
    end;
    if v_items is null
        or exists (
            select 1 from jsonb_array_elements(v_items) as e
            where (e ->> 'qty')::integer <= 0 or e ->> 'product_id' is null
        ) then
        perform private.raise_business_error('invalid_items');
    end if;

    -- 5. Every product must belong to this business; then lock them in a fixed order
    --    (by id) to avoid deadlocks between concurrent sales, and validate them (RN-02).
    if (
        select count(*)
        from jsonb_array_elements(v_items) as e
        inner join public.products as p
            on p.id = (e ->> 'product_id')::uuid and p.business_id = v_business_id
    ) <> jsonb_array_length(v_items) then
        perform private.raise_business_error('invalid_items');
    end if;

    for v_line in
        select p.id, p.name, p.active, p.stock, (e ->> 'qty')::integer as qty
        from public.products as p
        inner join jsonb_array_elements(v_items) as e on p.id = (e ->> 'product_id')::uuid
        order by p.id
        for update of p
    loop
        if not v_line.active then
            perform private.raise_business_error(
                'inactive_product', jsonb_build_object('product_id', v_line.id, 'product_name', v_line.name)
            );
        elsif v_line.stock < v_line.qty then
            perform private.raise_business_error(
                'insufficient_stock',
                jsonb_build_object('product_id', v_line.id, 'product_name', v_line.name, 'available', v_line.stock)
            );
        end if;
    end loop;

    -- 6. Total from current database prices, never from the client.
    select sum(p.price * (e ->> 'qty')::integer)::integer into v_total
    from jsonb_array_elements(v_items) as e
    inner join public.products as p on p.id = (e ->> 'product_id')::uuid;
    if p_expected_total is distinct from v_total then
        perform private.raise_business_error('total_changed', jsonb_build_object('total', v_total));
    end if;

    -- 7. Type rules and installment plan (RN-03..RN-05).
    v_sale_date := (v_created_at at time zone (
        select b.timezone from public.businesses as b where b.id = v_business_id
    ))::date;
    if p_type = 'cash' then
        v_down := 0;
        perform private.require_payment_method(v_business_id, p_payment_method_id);
    else
        perform 1 from private.calc_installments(v_total, v_down, p_months, v_sale_date);
        if v_down > 0 then
            perform private.require_payment_method(v_business_id, p_payment_method_id);
        end if;
    end if;

    -- 8. Possible duplicate: same customer, total and items, not voided, last 10 minutes.
    if not coalesce(p_confirm_duplicate, false) then
        select s.id into v_existing_id
        from public.sales as s
        where s.business_id = v_business_id
          and s.customer_id = p_customer_id
          and s.total = v_total
          and s.voided_at is null
          and s.created_at > now() - private.duplicate_window()
          and (
              select jsonb_agg(jsonb_build_object('product_id', si.product_id, 'qty', si.qty) order by si.product_id)
              from public.sale_items as si where si.sale_id = s.id
          ) = v_items
        order by s.created_at desc
        limit 1;
        if v_existing_id is not null then
            return jsonb_build_object('status', 'possible_duplicate', 'existing', private.sale_json(v_existing_id));
        end if;
    end if;

    -- 9. Folio.
    v_folio := private.next_folio(v_business_id);

    -- 10. Sale, lines with the price and cost of the day (RN-16, D-11).
    insert into public.sales (
        id, business_id, folio, customer_id, seller_id, type, total, months, down_payment,
        payment_method_id, idempotency_key, client_created_at
    ) values (
        coalesce(p_id, gen_random_uuid()), v_business_id, v_folio, p_customer_id, v_user_id, p_type, v_total,
        case when p_type = 'installments' then p_months end, v_down,
        case when p_type = 'cash' or v_down > 0 then p_payment_method_id end,
        p_idempotency_key, v_created_at
    )
    returning id into v_sale_id;

    -- 11. Lines, costs and stock (double defense: WHERE stock >= qty).
    for v_line in
        select p.id, p.name, p.price, coalesce(pc.unit_cost, 0) as unit_cost, (e ->> 'qty')::integer as qty
        from jsonb_array_elements(v_items) as e
        inner join public.products as p on p.id = (e ->> 'product_id')::uuid
        left join public.product_costs as pc on p.id = pc.product_id
        order by p.id
    loop
        insert into public.sale_items (sale_id, product_id, product_name, qty, unit_price)
        values (v_sale_id, v_line.id, v_line.name, v_line.qty, v_line.price)
        returning id into v_item_id;

        insert into public.sale_item_costs (sale_item_id, unit_cost) values (v_item_id, v_line.unit_cost);

        update public.products set stock = stock - v_line.qty
        where id = v_line.id and stock >= v_line.qty
        returning stock into v_new_stock;
        if v_new_stock is null then
            perform private.raise_business_error(
                'insufficient_stock', jsonb_build_object('product_id', v_line.id, 'product_name', v_line.name)
            );
        end if;

        insert into public.inventory_movements (
            business_id, product_id, type, qty_delta, stock_after, sale_id, created_by
        ) values (v_business_id, v_line.id, 'sale', -v_line.qty, v_new_stock, v_sale_id, v_user_id);
        v_new_stock := null;
    end loop;

    -- 12. Plan and initial payment.
    if p_type = 'installments' then
        insert into public.installments (sale_id, number, due_date, amount)
        select v_sale_id, c.number, c.due_date, c.amount
        from private.calc_installments(v_total, v_down, p_months, v_sale_date) as c;
    end if;

    if p_type = 'cash' or v_down > 0 then
        insert into public.payments (
            business_id, sale_id, kind, amount, payment_method_id, received_by, client_created_at
        ) values (
            v_business_id, v_sale_id, case when p_type = 'cash' then 'cash' else 'down_payment' end,
            case when p_type = 'cash' then v_total else v_down end,
            p_payment_method_id, v_user_id, v_created_at
        );
    end if;

    return jsonb_build_object('status', 'ok', 'sale', private.sale_json(v_sale_id));
end;
$$;

-- CU-06. The payment is not tied to an installment: installments are covered in order (RN-06).
create or replace function public.register_payment(
    p_idempotency_key uuid,
    p_sale_id uuid,
    p_amount integer,
    p_payment_method_id uuid,
    p_confirm_duplicate boolean default false,
    p_id uuid default null,
    p_client_created_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
    v_sale public.sales%rowtype;
    v_existing public.payments%rowtype;
    v_paid integer;
    v_balance integer;
    v_payment_id uuid;
begin
    perform private.require_permission('payments.create');
    v_business_id := private.current_business_id();
    perform private.lock_key('payment:' || p_idempotency_key::text);

    select p.* into v_existing
    from public.payments as p
    where p.business_id = v_business_id and (p.idempotency_key = p_idempotency_key or p.id = p_id);
    if found then
        return jsonb_build_object(
            'status', 'replay',
            'payment', jsonb_build_object('id', v_existing.id, 'amount', v_existing.amount),
            'sale', private.sale_json(v_existing.sale_id)
        );
    end if;

    -- Serialize payments to the same account.
    select s.* into v_sale
    from public.sales as s
    where s.id = p_sale_id and s.business_id = v_business_id
    for update;
    if not found then
        perform private.raise_business_error('sale_not_found', jsonb_build_object('sale_id', p_sale_id));
    end if;
    if v_sale.voided_at is not null then
        perform private.raise_business_error('sale_voided', jsonb_build_object('folio', v_sale.folio));
    end if;

    if p_amount is null or p_amount <= 0 then
        perform private.raise_business_error('invalid_amount');
    end if;

    select coalesce(sum(p.amount), 0)::integer into v_paid from public.payments as p where p.sale_id = v_sale.id;
    v_balance := v_sale.total - v_paid;
    if p_amount > v_balance then
        perform private.raise_business_error('payment_exceeds_balance', jsonb_build_object('balance', v_balance));
    end if;

    perform private.require_payment_method(v_business_id, p_payment_method_id);

    -- Possible duplicate: same amount for the same sale in the last 10 minutes (RN-18).
    if not coalesce(p_confirm_duplicate, false) then
        select p.* into v_existing
        from public.payments as p
        where p.sale_id = v_sale.id and p.kind = 'payment' and p.amount = p_amount
          and p.created_at > now() - private.duplicate_window()
        order by p.created_at desc
        limit 1;
        if found then
            return jsonb_build_object(
                'status', 'possible_duplicate',
                'existing', jsonb_build_object(
                    'id', v_existing.id, 'amount', v_existing.amount, 'created_at', v_existing.created_at
                ),
                'sale', private.sale_json(v_sale.id)
            );
        end if;
    end if;

    insert into public.payments (
        id, business_id, sale_id, kind, amount, payment_method_id, received_by, idempotency_key, client_created_at
    ) values (
        coalesce(p_id, gen_random_uuid()), v_business_id, v_sale.id, 'payment', p_amount,
        p_payment_method_id, auth.uid(), p_idempotency_key, coalesce(p_client_created_at, now())
    )
    returning id into v_payment_id;

    return jsonb_build_object(
        'status', 'ok',
        'payment', jsonb_build_object('id', v_payment_id, 'amount', p_amount),
        'balance', v_balance - p_amount,
        'paid_off', v_balance - p_amount = 0,
        'sale', private.sale_json(v_sale.id)
    );
end;
$$;

-- CU-05. Only once; products return to stock; money already received is reported so the
-- refund can be handled with the customer (RN-09, RN-11).
create or replace function public.void_sale(p_sale_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
    v_sale public.sales%rowtype;
    v_line record;
    v_new_stock integer;
    v_units integer := 0;
begin
    perform private.require_permission('sales.void');
    v_business_id := private.current_business_id();

    if length(trim(coalesce(p_reason, ''))) = 0 then
        perform private.raise_business_error('void_reason_required');
    end if;

    update public.sales
    set voided_at = now(), voided_by = auth.uid(), void_reason = trim(p_reason)
    where id = p_sale_id and business_id = v_business_id and voided_at is null
    returning * into v_sale;

    if not found then
        select s.* into v_sale from public.sales as s where s.id = p_sale_id and s.business_id = v_business_id;
        if not found then
            perform private.raise_business_error('sale_not_found', jsonb_build_object('sale_id', p_sale_id));
        end if;
        perform private.raise_business_error(
            'already_voided',
            jsonb_build_object(
                'folio', v_sale.folio,
                'voided_at', v_sale.voided_at,
                'voided_by_name', (select p.full_name from public.profiles as p where p.id = v_sale.voided_by)
            )
        );
    end if;

    for v_line in
        select si.product_id, si.qty
        from public.sale_items as si
        where si.sale_id = v_sale.id
        order by si.product_id
    loop
        update public.products set stock = stock + v_line.qty
        where id = v_line.product_id
        returning stock into v_new_stock;

        insert into public.inventory_movements (
            business_id, product_id, type, qty_delta, stock_after, sale_id, reason, created_by
        ) values (
            v_business_id, v_line.product_id, 'void', v_line.qty, v_new_stock, v_sale.id,
            trim(p_reason), auth.uid()
        );
        v_units := v_units + v_line.qty;
    end loop;

    return jsonb_build_object(
        'status', 'ok',
        'sale', private.sale_json(v_sale.id),
        'returned_units', v_units,
        'received_amount', (select coalesce(sum(p.amount), 0) from public.payments as p where p.sale_id = v_sale.id)
    );
end;
$$;

-- D-12: debts written in the paper notebook. A sale with a text description, no products
-- and no stock movement; what was already paid is a 'legacy' payment; the remaining balance
-- is split into installments starting at the next due date (which may be in the past).
create or replace function public.register_legacy_balance(
    p_idempotency_key uuid,
    p_customer_id uuid,
    p_sale_date date,
    p_description text,
    p_total integer,
    p_paid integer,
    p_installments integer,
    p_first_due_date date,
    p_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
    v_sale_id uuid;
    v_paid integer := coalesce(p_paid, 0);
    v_timezone text;
begin
    perform private.require_permission('legacy_balances.import');
    v_business_id := private.current_business_id();
    perform private.lock_key('sale:' || p_idempotency_key::text);

    select s.id into v_sale_id
    from public.sales as s
    where s.business_id = v_business_id and (s.idempotency_key = p_idempotency_key or s.id = p_id);
    if v_sale_id is not null then
        return jsonb_build_object('status', 'replay', 'sale', private.sale_json(v_sale_id));
    end if;

    perform private.require_customer(v_business_id, p_customer_id);
    if length(trim(coalesce(p_description, ''))) = 0 then
        perform private.raise_business_error('description_required');
    end if;
    if p_sale_date is null or p_first_due_date is null then
        perform private.raise_business_error('invalid_term');
    end if;
    if p_total is null or p_total <= 0 then
        perform private.raise_business_error('invalid_amount');
    end if;
    if v_paid < 0 or v_paid >= p_total then
        perform private.raise_business_error(
            'invalid_down_payment', jsonb_build_object('total', p_total, 'paid', v_paid)
        );
    end if;

    -- Validates the plan before writing anything.
    perform 1 from private.calc_installments(p_total - v_paid, 0, p_installments, p_sale_date, p_first_due_date);

    select b.timezone into v_timezone from public.businesses as b where b.id = v_business_id;

    insert into public.sales (
        id, business_id, folio, customer_id, seller_id, type, total, months, down_payment,
        source, description, idempotency_key, client_created_at
    ) values (
        coalesce(p_id, gen_random_uuid()), v_business_id, private.next_folio(v_business_id), p_customer_id,
        auth.uid(), 'installments', p_total, p_installments, 0, 'legacy_import', trim(p_description),
        p_idempotency_key, (p_sale_date + time '12:00') at time zone v_timezone
    )
    returning id into v_sale_id;

    insert into public.installments (sale_id, number, due_date, amount)
    select v_sale_id, c.number, c.due_date, c.amount
    from private.calc_installments(p_total - v_paid, 0, p_installments, p_sale_date, p_first_due_date) as c;

    if v_paid > 0 then
        insert into public.payments (business_id, sale_id, kind, amount, received_by, client_created_at)
        values (
            v_business_id, v_sale_id, 'legacy', v_paid, auth.uid(),
            (p_sale_date + time '12:00') at time zone v_timezone
        );
    end if;

    return jsonb_build_object('status', 'ok', 'sale', private.sale_json(v_sale_id));
end;
$$;

revoke execute on function public.register_sale(
    uuid, uuid, text, jsonb, uuid, integer, integer, integer, boolean, uuid, timestamptz
) from public, anon;
revoke execute on function public.register_payment(uuid, uuid, integer, uuid, boolean, uuid, timestamptz)
from public, anon;
revoke execute on function public.void_sale(uuid, text) from public, anon;
revoke execute on function public.register_legacy_balance(uuid, uuid, date, text, integer, integer, integer, date, uuid)
from public, anon;

grant execute on function public.register_sale(
    uuid, uuid, text, jsonb, uuid, integer, integer, integer, boolean, uuid, timestamptz
) to authenticated;
grant execute on function public.register_payment(uuid, uuid, integer, uuid, boolean, uuid, timestamptz)
to authenticated;
grant execute on function public.void_sale(uuid, text) to authenticated;
grant execute on function public.register_legacy_balance(uuid, uuid, date, text, integer, integer, integer, date, uuid)
to authenticated;
