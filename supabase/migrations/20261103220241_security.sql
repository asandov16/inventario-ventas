-- Security model (ADR-032): closed by default, read through RLS, write only through RPC.

-- 1. Remove the broad privileges Supabase grants to API roles by default.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from anon,
authenticated,
public;
alter default privileges for role postgres in schema private revoke execute on functions from public;
revoke all on all functions in schema private from public;

-- 2. Signed-in users may only SELECT; RLS decides which rows. No INSERT/UPDATE/DELETE anywhere.
grant select on all tables in schema public to authenticated;

-- 3. Identity and permission helpers.
create or replace function private.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
    -- Inactive users get NULL, so every policy hides every row from them (RF-ROL-02).
    select p.business_id
    from public.profiles as p
    where p.id = (select auth.uid()) and p.active;
$$;

create or replace function private.has_permission(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.profiles as p
        inner join public.role_permissions as rp on rp.role_id = p.role_id
        where p.id = (select auth.uid()) and p.active and rp.permission_code = p_code
    );
$$;

create or replace function private.require_permission(p_code text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    if not private.has_permission(p_code) then
        raise exception using
            errcode = 'P0001',
            message = 'permission_denied',
            detail = jsonb_build_object('permission', p_code)::text;
    end if;
end;
$$;

-- "Today" in the business time zone, never the server's (risk: late-night sales).
create or replace function private.business_today(p_business_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
    select (now() at time zone b.timezone)::date
    from public.businesses as b
    where b.id = p_business_id;
$$;

grant usage on schema private to authenticated;
grant execute on function private.current_business_id() to authenticated;
grant execute on function private.has_permission(text) to authenticated;

-- 4. Row Level Security: one SELECT policy per table, no write policies.
alter table public.businesses enable row level security;
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.product_costs enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.inventory_movement_costs enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_item_costs enable row level security;
alter table public.installments enable row level security;
alter table public.payments enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.reminders enable row level security;
alter table public.activity_log enable row level security;

create policy businesses_select on public.businesses
for select to authenticated
using (id = (select private.current_business_id()));

create policy permissions_select on public.permissions
for select to authenticated
using ((select private.current_business_id()) is not null);

create policy roles_select on public.roles
for select to authenticated
using (business_id = (select private.current_business_id()));

create policy role_permissions_select on public.role_permissions
for select to authenticated
using (exists (
    select 1 from public.roles as r
    where r.id = role_id and r.business_id = (select private.current_business_id())
));

create policy profiles_select on public.profiles
for select to authenticated
using (business_id = (select private.current_business_id()));

create policy categories_select on public.categories
for select to authenticated
using (business_id = (select private.current_business_id()));

create policy payment_methods_select on public.payment_methods
for select to authenticated
using (business_id = (select private.current_business_id()));

create policy customers_select on public.customers
for select to authenticated
using (business_id = (select private.current_business_id()));

create policy products_select on public.products
for select to authenticated
using (business_id = (select private.current_business_id()));

-- Costs: same business AND costs.read (sellers never see costs, D-11).
create policy product_costs_select on public.product_costs
for select to authenticated
using (
    (select private.has_permission('costs.read'))
    and exists (
        select 1 from public.products as pr
        where pr.id = product_id and pr.business_id = (select private.current_business_id())
    )
);

create policy inventory_movements_select on public.inventory_movements
for select to authenticated
using (
    business_id = (select private.current_business_id())
    and (select private.has_permission('inventory.read'))
);

create policy inventory_movement_costs_select on public.inventory_movement_costs
for select to authenticated
using (
    (select private.has_permission('costs.read'))
    and exists (
        select 1 from public.inventory_movements as m
        where m.id = movement_id and m.business_id = (select private.current_business_id())
    )
);

create policy sales_select on public.sales
for select to authenticated
using (
    business_id = (select private.current_business_id())
    and (select private.has_permission('sales.read'))
);

create policy sale_items_select on public.sale_items
for select to authenticated
using (exists (
    select 1 from public.sales as s
    where s.id = sale_id and s.business_id = (select private.current_business_id())
));

create policy sale_item_costs_select on public.sale_item_costs
for select to authenticated
using (
    (select private.has_permission('costs.read'))
    and exists (
        select 1
        from public.sale_items as si
        inner join public.sales as s on si.sale_id = s.id
        where si.id = sale_item_id and s.business_id = (select private.current_business_id())
    )
);

create policy installments_select on public.installments
for select to authenticated
using (exists (
    select 1 from public.sales as s
    where s.id = sale_id and s.business_id = (select private.current_business_id())
));

create policy payments_select on public.payments
for select to authenticated
using (business_id = (select private.current_business_id()));

create policy notification_outbox_select on public.notification_outbox
for select to authenticated
using (business_id = (select private.current_business_id()));

create policy reminders_select on public.reminders
for select to authenticated
using (business_id = (select private.current_business_id()));

create policy activity_log_select on public.activity_log
for select to authenticated
using (
    business_id = (select private.current_business_id())
    and (select private.has_permission('dashboard.read'))
);

-- 5. RPCs exempt from require_permission (ADR-023).

-- Health check for the keep-alive worker: touches no business data.
create or replace function public.ping()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
    select jsonb_build_object('status', 'ok', 'at', now());
$$;

revoke execute on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;

-- The signed-in user's own profile, business and permissions (F3-T05).
create or replace function public.get_my_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_profile public.profiles%rowtype;
begin
    select * into v_profile from public.profiles where id = (select auth.uid());

    if not found then
        return jsonb_build_object('status', 'no_profile');
    end if;
    if not v_profile.active then
        return jsonb_build_object('status', 'inactive');
    end if;

    return (
        select jsonb_build_object(
            'status', 'ok',
            'profile', jsonb_build_object(
                'id', v_profile.id,
                'full_name', v_profile.full_name,
                'role_code', r.code,
                'role_name', r.name
            ),
            'business', jsonb_build_object('id', b.id, 'name', b.name, 'timezone', b.timezone),
            'permissions', coalesce(
                (
                    select jsonb_agg(rp.permission_code order by rp.permission_code)
                    from public.role_permissions as rp
                    where rp.role_id = r.id
                ),
                '[]'::jsonb
            )
        )
        from public.roles as r
        cross join public.businesses as b
        where r.id = v_profile.role_id and b.id = v_profile.business_id
    );
end;
$$;

revoke execute on function public.get_my_profile() from public;
grant execute on function public.get_my_profile() to authenticated;
