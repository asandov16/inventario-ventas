-- register_legacy_balance: D-12 and the cumulative-due fix of ADR-022.
begin;
select plan(12);

select (select id from public.customers where phone_e164 = '+50680000012') as customer_id \gset

select tests.authenticate_as('vendedor@test.local');
select throws_ok(
    format($$select public.register_legacy_balance(gen_random_uuid(), %L, current_date - 60,
        'Collar', 20000, 0, 2, current_date + 10)$$, :'customer_id'),
    'P0001', 'permission_denied', 'only an administrator can load paper balances'
);

select tests.clear_authentication();
select tests.authenticate_as('admin@test.local');

-- ADR-022 example: total 50 000, 30 000 already paid, 2 installments of 10 000.
select public.register_legacy_balance(
    '30000000-0000-4000-8000-000000000001', :'customer_id', current_date - 60,
    'Perfume + aretes (cuaderno)', 50000, 30000, 2, current_date + 10
) -> 'sale' ->> 'id' as sale_id \gset

select is(
    (select array_agg(amount order by number) from public.installments where sale_id = :'sale_id'),
    array[10000, 10000], 'the remaining balance is split into the installments left'
);
select is(
    (select balance from public.v_sale_accounts where sale_id = :'sale_id'), 20000,
    'the balance is total minus what was paid on paper'
);
select is(
    (select array_agg(status order by number) from public.v_installment_status where sale_id = :'sale_id'),
    array['pending', 'pending'],
    'installments are not marked paid by the payment made before the system (ADR-022)'
);
select is(
    (select source || ':' || description from public.sales where id = :'sale_id'),
    'legacy_import:Perfume + aretes (cuaderno)', 'it is marked as a carried-over balance with its description'
);
select is(
    (select count(*)::int from public.inventory_movements where sale_id = :'sale_id'),
    0, 'it does not move stock'
);
select is(
    (select kind || ':' || amount from public.payments where sale_id = :'sale_id'),
    'legacy:30000', 'what was paid before the system is a legacy payment'
);
select is(
    (select type from public.activity_log where entity_id = :'sale_id'),
    'legacy_balance', 'it appears in the activity log as a carried-over balance'
);

-- A first due date in the past makes the installment overdue, as in reality.
select public.register_legacy_balance(
    gen_random_uuid(), :'customer_id', current_date - 90, 'Pulsera', 12000, 2000, 2, current_date - 5
) -> 'sale' ->> 'id' as old_id \gset
select is(
    (select status from public.v_installment_status where sale_id = :'old_id' and number = 1),
    'overdue', 'a past first due date is overdue immediately'
);

select is(
    public.register_legacy_balance(
        '30000000-0000-4000-8000-000000000001', :'customer_id', current_date - 60,
        'Perfume + aretes (cuaderno)', 50000, 30000, 2, current_date + 10
    ) ->> 'status',
    'replay', 'loading the same entry twice with the same key is a replay'
);
select throws_ok(
    format($$select public.register_legacy_balance(gen_random_uuid(), %L, current_date, '  ',
        10000, 0, 1, current_date + 30)$$, :'customer_id'),
    'P0001', 'description_required', 'a description is required'
);
select throws_ok(
    format($$select public.register_legacy_balance(gen_random_uuid(), %L, current_date, 'Algo',
        10000, 10000, 1, current_date + 30)$$, :'customer_id'),
    'P0001', 'invalid_down_payment', 'a fully paid entry is not a balance'
);

select * from finish();
rollback;
