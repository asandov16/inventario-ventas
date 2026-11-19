-- Por cobrar list (CU-06, F5-T05): v_receivables. The seed has an overdue account
-- (Danae Zeledón), a partly paid one, a paid one, a notebook balance and a voided cash sale.
begin;
select plan(7);

select private.create_business('Negocio Ajeno') as other_business \gset
select tests.create_user('ajeno-cobros@test.local', 'admin', :'other_business') as other_admin \gset

-- The seed's overdue account, read as the owner before acting as anyone.
select a.sale_id as overdue_sale
from public.v_sale_accounts as a
where a.status = 'overdue'
order by a.folio
limit 1 \gset

select tests.authenticate_as('vendedor@test.local');

select ok(
    (select count(*) from public.v_receivables) >= 4,
    'a seller lists the installment accounts, notebook balances included'
);
select is(
    (select status from public.v_receivables where sale_id = :'overdue_sale'), 'overdue',
    'an overdue account says so'
);
select ok(
    (select overdue_amount > 0 and next_due_date is not null and customer_name is not null
     from public.v_receivables where sale_id = :'overdue_sale'),
    'it carries the customer, what is overdue and the next due date'
);
select ok(
    exists (select 1 from public.v_receivables where status = 'paid' and balance = 0),
    'paid accounts stay listed (Liquidadas)'
);
select is(
    (select last_reminder_at from public.v_receivables where sale_id = :'overdue_sale'), null,
    'no reminder yet'
);

select tests.clear_authentication();
select tests.authenticate_as('admin@test.local');
select public.record_reminder(:'overdue_sale') as reminder \gset
select ok(
    (select last_reminder_at from public.v_receivables where sale_id = :'overdue_sale') is not null,
    'a confirmed reminder shows on the account'
);

select tests.clear_authentication();
select tests.authenticate_as('ajeno-cobros@test.local');
select is((select count(*)::int from public.v_receivables), 0, 'another business sees no accounts');

select * from finish();
rollback;
