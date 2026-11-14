-- Stage 3 read models (plan etapa-3 §4): the detail sheets of a sale and a product, the lists
-- the screens need, and reminders in the activity feed. Reads only, plus one logging trigger.
-- Definer RPCs filter by business themselves; views are security_invoker so the caller's RLS applies.

-- Historial / Por cobrar / Inicio → sale detail sheet (CU-04, CU-05, CU-06, CU-07).
create or replace function public.get_sale_detail(p_sale_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
    v_customer_id uuid;
begin
    perform private.require_permission('sales.read');
    v_business_id := private.current_business_id();

    select s.customer_id into v_customer_id
    from public.sales as s
    where s.id = p_sale_id and s.business_id = v_business_id;
    if not found then
        perform private.raise_business_error('sale_not_found');
    end if;

    return (
        select jsonb_build_object(
            'status', 'ok',
            'sale', jsonb_build_object(
                'id', s.id,
                'folio', s.folio,
                'type', s.type,
                'source', s.source,
                'description', s.description,
                'total', s.total,
                'months', s.months,
                'down_payment', s.down_payment,
                'client_created_at', s.client_created_at,
                'seller_name', sp.full_name,
                'payment_method_name', pm.name,
                'voided_at', s.voided_at,
                'voided_by_name', vp.full_name,
                'void_reason', s.void_reason,
                'status', a.status,
                'paid', a.paid,
                'balance', a.balance,
                'progress_pct', a.progress_pct,
                'next_due_date', a.next_due_date,
                'next_due_amount', a.next_due_amount,
                'overdue_amount', a.overdue_amount,
                'customer', jsonb_build_object(
                    'id', c.id,
                    'name', c.name,
                    'phone_e164', c.phone_e164,
                    'whatsapp_opt_in', c.whatsapp_opt_in
                ),
                'items', coalesce((
                    select jsonb_agg(
                        jsonb_build_object(
                            'product_id', si.product_id,
                            'product_name', si.product_name,
                            'qty', si.qty,
                            'unit_price', si.unit_price,
                            'subtotal', si.qty * si.unit_price
                        )
                        order by si.product_name
                    )
                    from public.sale_items as si
                    where si.sale_id = s.id
                ), '[]'::jsonb),
                -- How much of each installment is covered: payments fill them in order.
                'installments', coalesce((
                    select jsonb_agg(
                        jsonb_build_object(
                            'number', st.number,
                            'due_date', st.due_date,
                            'amount', st.amount,
                            'paid', greatest(least(st.paid_total - (st.cum_due - st.amount), st.amount), 0),
                            'status', st.status
                        )
                        order by st.number
                    )
                    from public.v_installment_status as st
                    where st.sale_id = s.id
                ), '[]'::jsonb),
                'payments', coalesce((
                    select jsonb_agg(
                        jsonb_build_object(
                            'id', p.id,
                            'kind', p.kind,
                            'amount', p.amount,
                            'payment_method_name', ppm.name,
                            'received_by_name', rp.full_name,
                            'client_created_at', p.client_created_at
                        )
                        order by p.client_created_at, p.id
                    )
                    from public.payments as p
                    left join public.payment_methods as ppm on p.payment_method_id = ppm.id
                    left join public.profiles as rp on p.received_by = rp.id
                    where p.sale_id = s.id
                ), '[]'::jsonb),
                'last_reminder', (
                    select jsonb_build_object('created_at', r.created_at, 'sent_by_name', rsp.full_name)
                    from public.reminders as r
                    left join public.profiles as rsp on r.sent_by = rsp.id
                    where r.sale_id = s.id
                    order by r.created_at desc
                    limit 1
                )
            ),
            'customer_summary', jsonb_build_object(
                'balance', cb.balance,
                'overdue_amount', cb.overdue_amount,
                'open_sales', cb.open_sales,
                'other_sales', coalesce((
                    select jsonb_agg(os.sale order by os.client_created_at desc)
                    from (
                        select
                            oa.client_created_at,
                            jsonb_build_object(
                                'id', oa.sale_id,
                                'folio', oa.folio,
                                'type', oa.type,
                                'total', oa.total,
                                'balance', oa.balance,
                                'status', oa.status,
                                'client_created_at', oa.client_created_at
                            ) as sale
                        from public.v_sale_accounts as oa
                        where oa.customer_id = v_customer_id and oa.sale_id <> s.id
                        order by oa.client_created_at desc
                        limit 5
                    ) as os
                ), '[]'::jsonb)
            )
        )
        from public.sales as s
        inner join public.customers as c on s.customer_id = c.id
        inner join public.profiles as sp on s.seller_id = sp.id
        inner join public.v_sale_accounts as a on s.id = a.sale_id
        inner join public.v_customer_balances as cb on s.customer_id = cb.customer_id
        left join public.payment_methods as pm on s.payment_method_id = pm.id
        left join public.profiles as vp on s.voided_by = vp.id
        where s.id = p_sale_id
    );
end;
$$;

-- Inventario → product detail with its movements (CU-08, F6 DoD). Costs only with costs.read.
create or replace function public.get_product_detail(p_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
    v_can_cost boolean;
begin
    perform private.require_permission('inventory.read');
    v_business_id := private.current_business_id();
    v_can_cost := private.has_permission('costs.read');

    if not exists (
        select 1 from public.products as p
        where p.id = p_product_id and p.business_id = v_business_id
    ) then
        perform private.raise_business_error('product_not_found');
    end if;

    return (
        select jsonb_build_object(
            'status', 'ok',
            'product', jsonb_build_object(
                'id', ps.product_id,
                'code', ps.code,
                'name', ps.name,
                'category_id', ps.category_id,
                'category_name', ps.category_name,
                'price', ps.price,
                'stock', ps.stock,
                'min_stock', ps.min_stock,
                'active', ps.active,
                'version', ps.version,
                'units_sold', ps.units_sold,
                'stock_status', ps.stock_status,
                'unit_cost', case when v_can_cost then pc.unit_cost end
            ),
            'movements', coalesce((
                select jsonb_agg(mv.movement order by mv.created_at desc, mv.id desc)
                from (
                    select
                        m.id,
                        m.created_at,
                        jsonb_build_object(
                            'id', m.id,
                            'type', m.type,
                            'qty_delta', m.qty_delta,
                            'stock_after', m.stock_after,
                            'reason', m.reason,
                            'sale_id', m.sale_id,
                            'folio', ms.folio,
                            'created_by_name', mp.full_name,
                            'created_at', m.created_at,
                            'unit_cost', case when v_can_cost then mc.unit_cost end
                        ) as movement
                    from public.inventory_movements as m
                    left join public.sales as ms on m.sale_id = ms.id
                    left join public.profiles as mp on m.created_by = mp.id
                    left join public.inventory_movement_costs as mc on m.id = mc.movement_id
                    where m.product_id = ps.product_id
                    order by m.created_at desc, m.id desc
                    limit 20
                ) as mv
            ), '[]'::jsonb)
        )
        from public.v_products_status as ps
        left join public.product_costs as pc on ps.product_id = pc.product_id
        where ps.product_id = p_product_id
    );
end;
$$;

revoke execute on function public.get_sale_detail(uuid) from public, anon;
revoke execute on function public.get_product_detail(uuid) from public, anon;
grant execute on function public.get_sale_detail(uuid) to authenticated;
grant execute on function public.get_product_detail(uuid) to authenticated;

-- Agregar stock → "Últimos ingresos" (CU-09). No costs here.
create view public.v_recent_restocks
with (security_invoker = true) as
select
    m.id as movement_id,
    m.business_id,
    m.product_id,
    p.code,
    p.name as product_name,
    m.type,
    m.qty_delta as qty,
    m.stock_after,
    pr.full_name as created_by_name,
    m.created_at
from public.inventory_movements as m
inner join public.products as p on m.product_id = p.id
left join public.profiles as pr on m.created_by = pr.id
where m.type in ('initial', 'restock');

-- Inicio → Actividad (RF-FB-07): the log with who did it; the screen writes the sentence.
create view public.v_activity
with (security_invoker = true) as
select
    a.id,
    a.business_id,
    a.type,
    a.entity,
    a.entity_id,
    a.amount,
    a.data,
    a.actor_id,
    pr.full_name as actor_name,
    a.created_at
from public.activity_log as a
left join public.profiles as pr on a.actor_id = pr.id;

-- Perfil → Usuarios (read-only list, F7-T10).
create view public.v_users
with (security_invoker = true) as
select
    p.id as user_id,
    p.business_id,
    p.full_name,
    p.phone_e164,
    r.code as role_code,
    r.name as role_name,
    p.active,
    p.created_at
from public.profiles as p
inner join public.roles as r on p.role_id = r.id
where (select private.has_permission('users.admin'));

-- Catalogs for pickers and Perfil → Negocio (RN-14), so screens never read the tables.
create view public.v_categories
with (security_invoker = true) as
select
    c.id,
    c.business_id,
    c.name,
    c.prefix,
    c.active,
    c.sort
from public.categories as c;

create view public.v_payment_methods
with (security_invoker = true) as
select
    pm.id,
    pm.business_id,
    pm.name,
    pm.active,
    pm.sort
from public.payment_methods as pm;

grant select on public.v_recent_restocks, public.v_activity, public.v_users, public.v_categories,
public.v_payment_methods to authenticated;

-- A confirmed reminder shows in the activity feed (💬, CU-07).
alter table public.activity_log drop constraint activity_log_type_check;
alter table public.activity_log add constraint activity_log_type_check check (
    type in (
        'sale', 'legacy_balance', 'payment', 'void', 'restock', 'adjustment',
        'product_created', 'customer_created', 'reminder'
    )
);

create or replace function private.log_reminder_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    perform private.log_activity(
        new.business_id, 'reminder', 'sale', new.sale_id, a.balance,
        jsonb_build_object(
            'folio', a.folio, 'channel', new.channel,
            'customer_id', new.customer_id, 'customer_name', c.name
        ),
        new.sent_by
    )
    from public.v_sale_accounts as a
    inner join public.customers as c on c.id = new.customer_id
    where a.sale_id = new.sale_id;
    return null;
end;
$$;

create trigger trg_reminders_log after insert on public.reminders
for each row execute function private.log_reminder_activity();
