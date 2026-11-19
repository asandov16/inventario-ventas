-- Por cobrar (CU-06, F5-T05): one row per installment account with what the list shows,
-- including when the customer was last reminded (💬 in the row, RF-COB-04).
-- security_invoker: the caller's RLS applies (sales need sales.read).
create view public.v_receivables
with (security_invoker = true) as
select
    a.sale_id,
    a.business_id,
    a.folio,
    a.customer_id,
    c.name as customer_name,
    c.phone_e164 as customer_phone_e164,
    a.source,
    a.total,
    a.paid,
    a.balance,
    a.status,
    a.progress_pct,
    a.next_due_date,
    a.next_due_amount,
    a.overdue_amount,
    a.client_created_at,
    (
        select max(r.created_at) from public.reminders as r
        where r.sale_id = a.sale_id
    ) as last_reminder_at
from public.v_sale_accounts as a
inner join public.customers as c on a.customer_id = c.id
where a.type = 'installments' and a.status <> 'voided';

grant select on public.v_receivables to authenticated;
