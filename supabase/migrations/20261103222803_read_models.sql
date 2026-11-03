-- Read models for the screens (F2-T10, F2-T11) and Realtime (F2-T13).
-- Views are security_invoker, so RLS of the caller applies (sellers never see costs).

-- RN-10: low when stock <= minimum, out when 0.
create view public.v_products_status
with (security_invoker = true) as
select
    p.id as product_id,
    p.business_id,
    p.code,
    p.name,
    p.category_id,
    c.name as category_name,
    p.price,
    p.stock,
    p.min_stock,
    p.active,
    p.version,
    coalesce((
        select sum(si.qty)
        from public.sale_items as si
        inner join public.sales as s on si.sale_id = s.id
        where si.product_id = p.id and s.voided_at is null
    ), 0)::integer as units_sold,
    case
        when p.stock = 0 then 'out'
        when p.stock <= p.min_stock then 'low'
        else 'ok'
    end as stock_status
from public.products as p
inner join public.categories as c on p.category_id = c.id;

-- Inicio → Estado (CU-12): urgent first, then attention.
create view public.v_alerts
with (security_invoker = true) as
select
    a.business_id,
    'overdue_installment' as kind,
    'urgent' as severity,
    'sale' as entity,
    a.sale_id as entity_id,
    c.name as title,
    a.folio,
    a.overdue_amount as amount,
    (
        select min(st.due_date) from public.v_installment_status as st
        where st.sale_id = a.sale_id and st.status = 'overdue'
    ) as due_date
from public.v_sale_accounts as a
inner join public.customers as c on a.customer_id = c.id
where a.status = 'overdue'
union all
select
    a.business_id,
    'upcoming_installment' as kind,
    'attention' as severity,
    'sale' as entity,
    a.sale_id as entity_id,
    c.name as title,
    a.folio,
    a.next_due_amount as amount,
    a.next_due_date as due_date
from public.v_sale_accounts as a
inner join public.customers as c on a.customer_id = c.id
where
    a.status = 'pending'
    and a.next_due_date between private.business_today(a.business_id)
    and private.business_today(a.business_id) + 7
union all
select
    p.business_id,
    case when p.stock_status = 'out' then 'out_of_stock' else 'low_stock' end as kind,
    case when p.stock_status = 'out' then 'urgent' else 'attention' end as severity,
    'product' as entity,
    p.product_id as entity_id,
    p.name as title,
    null::integer as folio,
    p.stock as amount,
    null::date as due_date
from public.v_products_status as p
where p.active and p.stock_status in ('out', 'low');

-- Historial (CU-04): one row per sale; paginate by (client_created_at desc, sale_id desc).
create view public.v_sales_list
with (security_invoker = true) as
select
    s.id as sale_id,
    s.business_id,
    s.folio,
    s.client_created_at,
    s.customer_id,
    c.name as customer_name,
    c.phone_e164 as customer_phone_e164,
    s.seller_id,
    pr.full_name as seller_name,
    s.type,
    s.source,
    s.description,
    s.total,
    a.balance,
    a.status,
    s.voided_at,
    coalesce((
        select sum(si.qty) from public.sale_items as si
        where si.sale_id = s.id
    ), 0)::integer as items_count
from public.sales as s
inner join public.customers as c on s.customer_id = c.id
inner join public.profiles as pr on s.seller_id = pr.id
inner join public.v_sale_accounts as a on s.id = a.sale_id;

grant select on public.v_products_status, public.v_alerts, public.v_sales_list to authenticated;

-- Business-local date of a timestamp.
create or replace function private.local_date(p_business_id uuid, p_at timestamptz)
returns date
language sql
stable
set search_path = ''
as $$
    select (p_at at time zone b.timezone)::date from public.businesses as b where b.id = p_business_id;
$$;

-- Inicio: the four numbers (RF-DSH-01).
create or replace function public.get_dashboard_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
    v_today date;
begin
    perform private.require_permission('dashboard.read');
    v_business_id := private.current_business_id();
    v_today := private.business_today(v_business_id);

    return jsonb_build_object(
        'status', 'ok',
        'sales_today', (
            select coalesce(sum(s.total), 0) from public.sales as s
            where s.business_id = v_business_id and s.voided_at is null and s.source = 'app'
              and private.local_date(v_business_id, s.client_created_at) = v_today
        ),
        'sales_30_days', (
            select coalesce(sum(s.total), 0) from public.sales as s
            where s.business_id = v_business_id and s.voided_at is null and s.source = 'app'
              and private.local_date(v_business_id, s.client_created_at) > v_today - 30
        ),
        'receivable_total', (
            select coalesce(sum(a.balance), 0) from public.v_sale_accounts as a
            where a.business_id = v_business_id and a.type = 'installments'
        ),
        'low_stock_count', (
            select count(*) from public.v_products_status as p
            where p.business_id = v_business_id and p.active and p.stock_status in ('low', 'out')
        )
    );
end;
$$;

-- Por cobrar: the three numbers (RF-COB-01).
create or replace function public.get_receivables_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
    v_today date;
begin
    perform private.require_permission('sales.read');
    v_business_id := private.current_business_id();
    v_today := private.business_today(v_business_id);

    return jsonb_build_object(
        'status', 'ok',
        'receivable_total', (
            select coalesce(sum(a.balance), 0) from public.v_sale_accounts as a
            where a.business_id = v_business_id and a.type = 'installments'
        ),
        'overdue_total', (
            select coalesce(sum(a.overdue_amount), 0) from public.v_sale_accounts as a
            where a.business_id = v_business_id
        ),
        -- What is still uncovered of the installments due in the next 7 days.
        'due_next_7_days', (
            select coalesce(sum(least(st.amount, st.cum_due - st.paid_total)), 0)
            from public.v_installment_status as st
            where st.business_id = v_business_id and st.status in ('pending', 'partial')
              and st.due_date between v_today and v_today + 7
        )
    );
end;
$$;

-- Inventario: units and value; value at cost only with costs.read (CU-08).
create or replace function public.get_inventory_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
begin
    perform private.require_permission('inventory.read');
    v_business_id := private.current_business_id();

    return jsonb_build_object(
        'status', 'ok',
        'units', (
            select coalesce(sum(p.stock), 0) from public.products as p
            where p.business_id = v_business_id and p.active
        ),
        'value_at_price', (
            select coalesce(sum(p.stock::bigint * p.price), 0) from public.products as p
            where p.business_id = v_business_id and p.active
        ),
        'value_at_cost', case when private.has_permission('costs.read') then (
            select coalesce(sum(p.stock::bigint * coalesce(pc.unit_cost, 0)), 0)
            from public.products as p
            left join public.product_costs as pc on p.id = pc.product_id
            where p.business_id = v_business_id and p.active
        ) end
    );
end;
$$;

-- Red counters in the tab bar (RF-UX-04).
create or replace function public.get_badge_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
begin
    perform private.require_permission('dashboard.read');
    v_business_id := private.current_business_id();

    return jsonb_build_object(
        'status', 'ok',
        'overdue_accounts', (
            select count(*) from public.v_sale_accounts as a
            where a.business_id = v_business_id and a.status = 'overdue'
        ),
        'stock_alerts', (
            select count(*) from public.v_products_status as p
            where p.business_id = v_business_id and p.active and p.stock_status in ('low', 'out')
        )
    );
end;
$$;

-- Inicio → Análisis (CU-13). Profit and margin only with analytics.profit.
create or replace function public.get_analytics(p_days integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
    v_today date;
    v_from date;
    v_can_profit boolean;
begin
    perform private.require_permission('dashboard.read');
    if p_days is null or p_days not in (7, 30) then
        perform private.raise_business_error('invalid_period', jsonb_build_object('days', p_days));
    end if;
    v_business_id := private.current_business_id();
    v_today := private.business_today(v_business_id);
    v_from := v_today - (p_days - 1);
    v_can_profit := private.has_permission('analytics.profit');

    return (
        -- Period sales: app sales only (carried-over balances are not sales of the period).
        with period_sales as (
            select
                s.id,
                s.type,
                s.total,
                private.local_date(v_business_id, s.client_created_at) as sale_date
            from public.sales as s
            where
                s.business_id = v_business_id and s.voided_at is null and s.source = 'app'
                and private.local_date(v_business_id, s.client_created_at) between v_from and v_today
        ),

        lines as (
            select
                si.product_id,
                si.product_name,
                si.qty,
                si.unit_price,
                sic.unit_cost
            from period_sales as ps
            inner join public.sale_items as si on ps.id = si.sale_id
            left join public.sale_item_costs as sic on si.id = sic.sale_item_id
        ),

        totals as (
            select
                coalesce(sum(ps.total), 0)::bigint as sold,
                count(*)::integer as sales_count
            from period_sales as ps
        ),

        profit as (
            select coalesce(sum(l.qty::bigint * (l.unit_price - coalesce(l.unit_cost, 0))), 0) as amount
            from lines as l
        )

        select jsonb_build_object(
            'status', 'ok',
            'days', p_days,
            'sold', t.sold,
            'sales_count', t.sales_count,
            'average_sale', case when t.sales_count > 0 then t.sold / t.sales_count else 0 end,
            -- Money really received in the period; carried-over payments excluded.
            'collected', (
                select coalesce(sum(p.amount), 0)
                from public.payments as p
                inner join public.sales as s on p.sale_id = s.id
                where
                    p.business_id = v_business_id and s.voided_at is null and p.kind <> 'legacy'
                    and private.local_date(v_business_id, p.client_created_at) between v_from and v_today
            ),
            'gross_profit', case when v_can_profit then pr.amount end,
            'margin_pct', case when v_can_profit and t.sold > 0 then round(pr.amount * 100.0 / t.sold, 1) end,
            'daily', (
                select jsonb_agg(
                    jsonb_build_object(
                        'date', d.day::date,
                        'cash', coalesce((
                            select sum(ps.total) from period_sales as ps
                            where ps.sale_date = d.day::date and ps.type = 'cash'
                        ), 0),
                        'installments', coalesce((
                            select sum(ps.total) from period_sales as ps
                            where ps.sale_date = d.day::date and ps.type = 'installments'
                        ), 0)
                    )
                    order by d.day
                )
                from generate_series(v_from, v_today, interval '1 day') as d (day)
            ),
            'mix', jsonb_build_object(
                'cash', (select coalesce(sum(ps.total), 0) from period_sales as ps where ps.type = 'cash'),
                'installments', (
                    select coalesce(sum(ps.total), 0) from period_sales as ps where ps.type = 'installments'
                )
            ),
            'top_products', coalesce((
                select jsonb_agg(tp order by tp.qty desc, tp.name)
                from (
                    select
                        l.product_id,
                        l.product_name as name,
                        sum(l.qty)::integer as qty,
                        sum(l.qty * l.unit_price)::integer as amount
                    from lines as l
                    group by l.product_id, l.product_name
                    order by qty desc, name
                    limit 5
                ) as tp
            ), '[]'::jsonb),
            'by_category', coalesce((
                select jsonb_agg(bc order by bc.amount desc)
                from (
                    select
                        c.name as category,
                        sum(l.qty * l.unit_price)::integer as amount
                    from lines as l
                    inner join public.products as p on l.product_id = p.id
                    inner join public.categories as c on p.category_id = c.id
                    group by c.name
                ) as bc
            ), '[]'::jsonb)
        )
        from totals as t
        cross join profit as pr
    );
end;
$$;


-- Perfil → Datos (CU-15): everything the business needs for its own backup file.
create or replace function public.export_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
begin
    perform private.require_permission('data.export');
    v_business_id := private.current_business_id();

    return jsonb_build_object(
        'status', 'ok',
        'generated_at', now(),
        'business', (select jsonb_build_object('name', b.name, 'timezone', b.timezone)
                     from public.businesses as b where b.id = v_business_id),
        'customers', coalesce((
            select jsonb_agg(to_jsonb(c) - 'business_id' order by c.name)
            from public.customers as c where c.business_id = v_business_id
        ), '[]'::jsonb),
        'products', coalesce((
            select jsonb_agg((to_jsonb(p) - 'business_id' - 'idempotency_key')
                || jsonb_build_object('unit_cost', pc.unit_cost) order by p.code)
            from public.products as p
            left join public.product_costs as pc on p.id = pc.product_id
            where p.business_id = v_business_id
        ), '[]'::jsonb),
        'sales', coalesce((
            select jsonb_agg(to_jsonb(s) - 'business_id' - 'idempotency_key' order by s.folio)
            from public.sales as s where s.business_id = v_business_id
        ), '[]'::jsonb),
        'sale_items', coalesce((
            select jsonb_agg(to_jsonb(si) || jsonb_build_object('unit_cost', sic.unit_cost) order by si.sale_id)
            from public.sale_items as si
            inner join public.sales as s on si.sale_id = s.id
            left join public.sale_item_costs as sic on si.id = sic.sale_item_id
            where s.business_id = v_business_id
        ), '[]'::jsonb),
        'installments', coalesce((
            select jsonb_agg(to_jsonb(i) order by i.sale_id, i.number)
            from public.installments as i
            inner join public.sales as s on i.sale_id = s.id
            where s.business_id = v_business_id
        ), '[]'::jsonb),
        'payments', coalesce((
            select jsonb_agg(to_jsonb(p) - 'business_id' - 'idempotency_key' order by p.client_created_at)
            from public.payments as p where p.business_id = v_business_id
        ), '[]'::jsonb),
        'inventory_movements', coalesce((
            select jsonb_agg((to_jsonb(m) - 'business_id' - 'idempotency_key')
                || jsonb_build_object('unit_cost', mc.unit_cost) order by m.created_at)
            from public.inventory_movements as m
            left join public.inventory_movement_costs as mc on m.id = mc.movement_id
            where m.business_id = v_business_id
        ), '[]'::jsonb)
    );
end;
$$;

revoke execute on function public.get_dashboard_summary() from public, anon;
revoke execute on function public.get_receivables_summary() from public, anon;
revoke execute on function public.get_inventory_summary() from public, anon;
revoke execute on function public.get_badge_counts() from public, anon;
revoke execute on function public.get_analytics(integer) from public, anon;
revoke execute on function public.export_data() from public, anon;

grant execute on function public.get_dashboard_summary() to authenticated;
grant execute on function public.get_receivables_summary() to authenticated;
grant execute on function public.get_inventory_summary() to authenticated;
grant execute on function public.get_badge_counts() to authenticated;
grant execute on function public.get_analytics(integer) to authenticated;
grant execute on function public.export_data() to authenticated;

-- Realtime (F2-T13): other devices refresh counters and lists when these tables change.
-- Postgres Changes respects RLS, so cost tables are deliberately not published.
alter publication supabase_realtime add table
public.sales,
public.payments,
public.products,
public.inventory_movements,
public.customers,
public.activity_log;
