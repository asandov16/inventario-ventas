-- Integrity triggers (RN-12, RF-ROL-02), the activity log (RF-FB-07) and indexes.

-- updated_at bookkeeping.
create trigger trg_businesses_touch before update on public.businesses
for each row execute function private.touch_updated_at();
create trigger trg_profiles_touch before update on public.profiles
for each row execute function private.touch_updated_at();
create trigger trg_categories_touch before update on public.categories
for each row execute function private.touch_updated_at();
create trigger trg_payment_methods_touch before update on public.payment_methods
for each row execute function private.touch_updated_at();
create trigger trg_customers_touch before update on public.customers
for each row execute function private.touch_updated_at();
create trigger trg_products_touch before update on public.products
for each row execute function private.touch_updated_at();
create trigger trg_product_costs_touch before update on public.product_costs
for each row execute function private.touch_updated_at();
create trigger trg_notification_outbox_touch before update on public.notification_outbox
for each row execute function private.touch_updated_at();

-- RN-12: no table loses rows. role_permissions is the only exception, because
-- editing a role means unticking permissions (RF-ROL-03).
do $$
declare
    v_table text;
begin
    foreach v_table in array array[
        'businesses', 'permissions', 'roles', 'profiles', 'categories', 'payment_methods',
        'customers', 'products', 'product_costs', 'inventory_movements', 'inventory_movement_costs',
        'sales', 'sale_items', 'sale_item_costs', 'installments', 'payments',
        'notification_outbox', 'reminders', 'activity_log'
    ] loop
        execute format(
            'create trigger trg_%1$s_no_delete before delete on public.%1$I '
            'for each row execute function private.prevent_delete()',
            v_table
        );
        execute format(
            'create trigger trg_%1$s_no_truncate before truncate on public.%1$I '
            'for each statement execute function private.prevent_delete()',
            v_table
        );
    end loop;
end;
$$;

-- Append-only records.
do $$
declare
    v_table text;
begin
    foreach v_table in array array[
        'inventory_movements', 'inventory_movement_costs', 'sale_items', 'sale_item_costs',
        'installments', 'payments', 'reminders', 'activity_log'
    ] loop
        execute format(
            'create trigger trg_%1$s_no_update before update on public.%1$I '
            'for each row execute function private.prevent_update()',
            v_table
        );
    end loop;
end;
$$;

-- A sale only changes once: when it is voided (RN-09). Everything else is frozen.
create or replace function private.guard_sale_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    v_void_columns text[] := array['voided_at', 'voided_by', 'void_reason'];
begin
    if old.voided_at is not null then
        raise exception using
            errcode = 'P0001',
            message = 'already_voided',
            detail = jsonb_build_object('sale_id', old.id, 'voided_at', old.voided_at, 'voided_by', old.voided_by)::text;
    end if;

    if new.voided_at is null or (to_jsonb(new) - v_void_columns) <> (to_jsonb(old) - v_void_columns) then
        raise exception using
            errcode = 'P0001',
            message = 'immutable_record',
            detail = jsonb_build_object('table', 'sales')::text;
    end if;

    return new;
end;
$$;

create trigger trg_sales_guard_update before update on public.sales
for each row execute function private.guard_sale_update();

-- At least one active administrator must always remain (CU-15).
create or replace function private.guard_last_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    v_was_admin boolean;
    v_is_admin boolean;
begin
    if new.business_id <> old.business_id then
        raise exception using errcode = 'P0001', message = 'immutable_record',
            detail = jsonb_build_object('table', 'profiles', 'column', 'business_id')::text;
    end if;

    select r.code = 'admin' into v_was_admin from public.roles as r where r.id = old.role_id;
    select r.code = 'admin' into v_is_admin from public.roles as r where r.id = new.role_id;

    if old.active and v_was_admin and not (new.active and v_is_admin)
        and not exists (
            select 1
            from public.profiles as p
            inner join public.roles as r on r.id = p.role_id
            where p.business_id = old.business_id and p.id <> old.id and p.active and r.code = 'admin'
        ) then
        raise exception using
            errcode = 'P0001',
            message = 'last_admin_required',
            detail = jsonb_build_object('profile_id', old.id)::text;
    end if;

    return new;
end;
$$;

create trigger trg_profiles_guard_last_admin before update on public.profiles
for each row execute function private.guard_last_admin();

-- Activity log (RF-FB-07). Runs as owner because API roles cannot write tables.
create or replace function private.log_activity(
    p_business_id uuid,
    p_type text,
    p_entity text,
    p_entity_id uuid,
    p_amount integer,
    p_data jsonb,
    p_actor_id uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
    insert into public.activity_log (business_id, actor_id, type, entity, entity_id, amount, data)
    values (
        p_business_id,
        coalesce((select auth.uid()), p_actor_id),
        p_type, p_entity, p_entity_id, p_amount, coalesce(p_data, '{}'::jsonb)
    );
$$;

create or replace function private.log_sale_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_customer_name text;
begin
    select c.name into v_customer_name from public.customers as c where c.id = new.customer_id;

    if tg_op = 'INSERT' then
        perform private.log_activity(
            new.business_id,
            case when new.source = 'legacy_import' then 'legacy_balance' else 'sale' end,
            'sale', new.id, new.total,
            jsonb_build_object(
                'folio', new.folio, 'sale_type', new.type, 'months', new.months,
                'customer_id', new.customer_id, 'customer_name', v_customer_name
            ),
            new.seller_id
        );
    elsif old.voided_at is null and new.voided_at is not null then
        perform private.log_activity(
            new.business_id, 'void', 'sale', new.id, new.total,
            jsonb_build_object(
                'folio', new.folio, 'reason', new.void_reason,
                'customer_id', new.customer_id, 'customer_name', v_customer_name
            ),
            new.voided_by
        );
    end if;
    return null;
end;
$$;

create trigger trg_sales_log after insert or update on public.sales
for each row execute function private.log_sale_activity();

create or replace function private.log_payment_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    -- Cash, down payments and legacy amounts are part of the sale entry itself.
    if new.kind = 'payment' then
        perform private.log_activity(
            new.business_id, 'payment', 'sale', new.sale_id, new.amount,
            jsonb_build_object(
                'folio', s.folio, 'customer_id', s.customer_id, 'customer_name', c.name
            ),
            new.received_by
        )
        from public.sales as s
        inner join public.customers as c on c.id = s.customer_id
        where s.id = new.sale_id;
    end if;
    return null;
end;
$$;

create trigger trg_payments_log after insert on public.payments
for each row execute function private.log_payment_activity();

create or replace function private.log_movement_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.type in ('restock', 'adjustment') then
        perform private.log_activity(
            new.business_id, new.type, 'product', new.product_id, null,
            jsonb_build_object(
                'product_name', p.name, 'code', p.code, 'qty_delta', new.qty_delta,
                'stock_after', new.stock_after, 'reason', new.reason
            ),
            new.created_by
        )
        from public.products as p
        where p.id = new.product_id;
    end if;
    return null;
end;
$$;

create trigger trg_inventory_movements_log after insert on public.inventory_movements
for each row execute function private.log_movement_activity();

create or replace function private.log_catalog_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if tg_table_name = 'products' then
        perform private.log_activity(
            new.business_id, 'product_created', 'product', new.id, null,
            jsonb_build_object('product_name', new.name, 'code', new.code)
        );
    else
        perform private.log_activity(
            new.business_id, 'customer_created', 'customer', new.id, null,
            jsonb_build_object('customer_name', new.name),
            new.created_by
        );
    end if;
    return null;
end;
$$;

create trigger trg_products_log after insert on public.products
for each row execute function private.log_catalog_activity();
create trigger trg_customers_log after insert on public.customers
for each row execute function private.log_catalog_activity();

-- Indexes (roadmap F1-T09) plus foreign keys used by RLS and joins.
create index idx_profiles_business_id on public.profiles (business_id);
create index idx_profiles_role_id on public.profiles (role_id);
create index idx_categories_business_id on public.categories (business_id);
create index idx_customers_name_search on public.customers
using gin (private.search_text(name) extensions.gin_trgm_ops);
create index idx_products_name_search on public.products
using gin (private.search_text(name) extensions.gin_trgm_ops);
create index idx_products_business_category on public.products (business_id, category_id);
create index idx_inventory_movements_product_created on public.inventory_movements (product_id, created_at desc);
create index idx_inventory_movements_business_created on public.inventory_movements (business_id, created_at desc);
create index idx_inventory_movements_sale_id on public.inventory_movements (sale_id);
create index idx_sales_business_client_created on public.sales (business_id, client_created_at desc, id);
create index idx_sales_customer_id on public.sales (customer_id);
create index idx_sales_seller_id on public.sales (seller_id);
create index idx_sale_items_sale_id on public.sale_items (sale_id);
create index idx_sale_items_product_id on public.sale_items (product_id);
create index idx_installments_due_date on public.installments (due_date);
create index idx_payments_sale_client_created on public.payments (sale_id, client_created_at);
create index idx_payments_business_client_created on public.payments (business_id, client_created_at desc);
create index idx_reminders_sale_id on public.reminders (sale_id);
create index idx_activity_log_business_created on public.activity_log (business_id, created_at desc);
