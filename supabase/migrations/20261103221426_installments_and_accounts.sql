-- Installment plans (RN-03, RN-04, D-09, D-10) and account status views (RN-06..RN-08, ADR-022).

-- Shared error helper: every business error has the same shape for the frontend (errors.ts).
-- Callers stay VOLATILE (the default) because raising is a side effect for the planner.
create or replace function private.raise_business_error(p_code text, p_detail jsonb default '{}'::jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
    raise exception using errcode = 'P0001', message = p_code, detail = coalesce(p_detail, '{}'::jsonb)::text;
end;
$$;

-- Serializes concurrent requests that share a key (idempotency key, offline id, phone) for the
-- rest of the transaction. Without it, two identical requests arriving at the same time could
-- both pass the "already saved?" check and the second would fail on a unique index instead of
-- returning the saved record (RN-18).
create or replace function private.lock_key(p_key text)
returns void
language sql
set search_path = ''
as $$
    select pg_advisory_xact_lock(hashtextextended(p_key, 0));
$$;

-- Source of truth for installment plans. The TypeScript preview mirrors it and both are
-- tested with shared/fixtures/installments.cases.json.
--   financed  = total - down payment
--   each      = floor(financed / months / 100) * 100; the last one takes the remainder
--   due date  = sale date + i months (Postgres clamps to the month end: Jan 31 -> Feb 28),
--               or first_due + (i - 1) months for balances carried over from paper (D-12).
create or replace function private.calc_installments(
    p_total integer,
    p_down_payment integer,
    p_months integer,
    p_sale_date date,
    p_first_due_date date default null
)
returns table (number smallint, due_date date, amount integer)
language plpgsql
set search_path = ''
as $$
declare
    v_financed integer;
    v_each integer;
begin
    if p_months is null or p_months not between 1 and 3 then
        perform private.raise_business_error('invalid_term', jsonb_build_object('months', p_months));
    end if;
    if p_total is null or p_total <= 0 or p_down_payment is null or p_down_payment < 0
        or p_down_payment >= p_total then
        perform private.raise_business_error(
            'invalid_down_payment', jsonb_build_object('total', p_total, 'down_payment', p_down_payment)
        );
    end if;

    v_financed := p_total - p_down_payment;
    v_each := (v_financed / p_months / 100) * 100;
    if v_each = 0 then
        perform private.raise_business_error('term_too_long', jsonb_build_object('financed', v_financed));
    end if;

    return query
    select
        i::smallint as number,
        case
            when p_first_due_date is null then (p_sale_date + make_interval(months => i))::date
            else (p_first_due_date + make_interval(months => i - 1))::date
        end as due_date,
        case when i = p_months then v_financed - v_each * (p_months - 1) else v_each end as amount
    from generate_series(1, p_months) as i;
end;
$$;

grant execute on function private.business_today(uuid) to authenticated;

-- Status of every installment. A payment is not assigned to an installment: installments are
-- covered in order by the cumulative amount paid (RN-06, "the oldest first").
-- The base is total - Σ installments (what was not financed), not down_payment, so balances
-- carried over from paper with a prior payment are counted correctly (ADR-022).
create view public.v_installment_status
with (security_invoker = true) as
with paid as (
    select
        p.sale_id,
        sum(p.amount)::integer as paid_total
    from public.payments as p
    group by p.sale_id
),

plan as (
    select
        i.id,
        i.sale_id,
        i.number,
        i.due_date,
        i.amount,
        s.business_id,
        s.voided_at,
        s.total
        - sum(i.amount) over (partition by i.sale_id)
        + sum(i.amount) over (partition by i.sale_id order by i.number) as cum_due
    from public.installments as i
    inner join public.sales as s on i.sale_id = s.id
)

select
    pl.id,
    pl.sale_id,
    pl.business_id,
    pl.number,
    pl.due_date,
    pl.amount,
    pl.cum_due::integer as cum_due,
    coalesce(pd.paid_total, 0) as paid_total,
    case
        when pl.voided_at is not null then 'voided'
        when coalesce(pd.paid_total, 0) >= pl.cum_due then 'paid'
        when pl.due_date < private.business_today(pl.business_id) then 'overdue'
        when coalesce(pd.paid_total, 0) > pl.cum_due - pl.amount then 'partial'
        else 'pending'
    end as status
from plan as pl
left join paid as pd on pl.sale_id = pd.sale_id;

-- One row per sale with what was paid, what is owed and what is next.
create view public.v_sale_accounts
with (security_invoker = true) as
with paid as (
    select
        p.sale_id,
        sum(p.amount)::integer as paid
    from public.payments as p
    group by p.sale_id
),

inst as (
    select
        st.sale_id,
        bool_or(st.status = 'overdue') as has_overdue,
        max(st.cum_due) filter (where st.status = 'overdue') as overdue_cum_due,
        min(st.number) filter (where st.status in ('pending', 'partial', 'overdue')) as next_number
    from public.v_installment_status as st
    group by st.sale_id
)

select
    s.id as sale_id,
    s.business_id,
    s.folio,
    s.customer_id,
    s.type,
    s.source,
    s.total,
    s.client_created_at,
    nxt.due_date as next_due_date,
    (least(coalesce(pd.paid, 0), s.total) * 100 / s.total)::integer as progress_pct,
    coalesce(pd.paid, 0) as paid,
    case when s.voided_at is null then greatest(s.total - coalesce(pd.paid, 0), 0) else 0 end as balance,
    case
        when s.voided_at is not null then 'voided'
        when s.type = 'cash' then 'cash'
        when coalesce(pd.paid, 0) >= s.total then 'paid'
        when coalesce(ins.has_overdue, false) then 'overdue'
        else 'pending'
    end as status,
    least(nxt.amount, nxt.cum_due - coalesce(pd.paid, 0)) as next_due_amount,
    case
        when s.voided_at is null then greatest(coalesce(ins.overdue_cum_due, 0) - coalesce(pd.paid, 0), 0)
        else 0
    end as overdue_amount
from public.sales as s
left join paid as pd on s.id = pd.sale_id
left join inst as ins on s.id = ins.sale_id
left join public.v_installment_status as nxt
    on s.id = nxt.sale_id and ins.next_number = nxt.number and s.voided_at is null;

-- What each customer owes across their open installment sales (RF-CLI-02, CU-03).
create view public.v_customer_balances
with (security_invoker = true) as
select
    c.id as customer_id,
    c.business_id,
    coalesce(sum(a.balance), 0)::integer as balance,
    coalesce(sum(a.overdue_amount), 0)::integer as overdue_amount,
    count(a.sale_id) filter (where a.balance > 0)::integer as open_sales
from public.customers as c
left join public.v_sale_accounts as a on c.id = a.customer_id and a.type = 'installments'
group by c.id, c.business_id;

grant select on public.v_installment_status, public.v_sale_accounts, public.v_customer_balances
to authenticated;
