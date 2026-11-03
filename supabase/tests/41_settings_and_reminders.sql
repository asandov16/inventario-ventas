-- Reminders (CU-07, RF-COB-04) and business settings (CU-15, RN-14, RF-INV-02, D-19).
begin;
select plan(13);

select
    (select sale_id from public.v_sale_accounts where status = 'overdue' limit 1) as overdue_sale_id,
    (select sale_id from public.v_sale_accounts where status = 'paid' limit 1) as paid_sale_id \gset

select tests.authenticate_as('vendedor@test.local');

select public.record_reminder(:'overdue_sale_id') as reminder \gset
select is(:'reminder'::jsonb ->> 'status', 'ok', 'a seller records a reminder sent by WhatsApp');
select is(
    (select o.status || ':' || o.template from public.notification_outbox as o
     inner join public.reminders as r on r.outbox_id = o.id
     where r.id = (:'reminder'::jsonb -> 'reminder' ->> 'id')::uuid),
    'open:payment_reminder', 'the wa.me link is recorded in the outbox as open (phase 0)'
);
select throws_ok(
    format($$select public.record_reminder(%L)$$, :'paid_sale_id'),
    'P0001', 'no_balance', 'no reminder for an account without balance'
);

-- Settings are admin-only.
select throws_ok(
    $$select public.update_business('Otro nombre')$$,
    'P0001', 'permission_denied', 'a seller cannot change the business name'
);

select tests.clear_authentication();
select tests.authenticate_as('admin@test.local');

select is(
    public.update_business('  Perfumería La Esquina  ') -> 'business' ->> 'name',
    'Perfumería La Esquina', 'the business name is editable (D-19)'
);
select is(
    public.get_my_profile() -> 'business' ->> 'name',
    'Perfumería La Esquina', 'the new name is returned with the profile'
);

select public.save_category('Relojes', 'rel') as category \gset
select is(:'category'::jsonb -> 'category' ->> 'prefix', 'REL', 'a new category gets an uppercase prefix');
select throws_ok(
    $$select public.save_category('relojes', 'RLJ')$$, 'P0001', 'name_taken', 'category names are unique'
);
select throws_ok(
    $$select public.save_category('Billeteras', 'PER')$$, 'P0001', 'prefix_taken', 'prefixes are unique'
);
select is(
    public.save_category(
        'Relojes de pared', p_id => (:'category'::jsonb -> 'category' ->> 'id')::uuid, p_prefix => 'XYZ'
    ) -> 'category' ->> 'prefix',
    'REL', 'renaming keeps the prefix so existing codes never change'
);

select is(
    public.save_payment_method('Transferencia') -> 'payment_method' ->> 'name',
    'Transferencia', 'an admin adds a payment method (RN-14)'
);
select throws_ok(
    $$select public.save_payment_method('efectivo')$$, 'P0001', 'name_taken', 'payment method names are unique'
);
select is(
    public.save_payment_method(
        'Tarjeta', p_active => false, p_id => (select id from public.payment_methods where name = 'Tarjeta')
    ) -> 'payment_method' ->> 'active',
    'false', 'a payment method can be deactivated'
);

select * from finish();
rollback;
