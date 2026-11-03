-- void_sale: CU-05, RN-09, RN-11.
begin;
select plan(11);

select
    (select id from public.customers where phone_e164 = '+50680000011') as customer_id,
    (select id from public.products where code = 'BIS-004') as product_id,
    (select stock from public.products where code = 'BIS-004') as stock_before,
    (select id from public.payment_methods where name = 'Efectivo') as cash_id \gset

select tests.authenticate_as('vendedor@test.local');
select public.register_sale(
    gen_random_uuid(), :'customer_id', 'installments',
    jsonb_build_array(jsonb_build_object('product_id', :'product_id', 'qty', 2)),
    :'cash_id', 15800, p_months => 2, p_down_payment => 3000
) -> 'sale' ->> 'id' as sale_id \gset

-- Only an administrator can void (matrix 2.2).
select throws_ok(
    format($$select public.void_sale(%L, 'Devolución')$$, :'sale_id'),
    'P0001', 'permission_denied', 'a seller cannot void a sale'
);

select tests.clear_authentication();
select tests.authenticate_as('admin@test.local');

select throws_ok(
    format($$select public.void_sale(%L, '   ')$$, :'sale_id'),
    'P0001', 'void_reason_required', 'a reason is required'
);

select public.void_sale(:'sale_id', 'Devolución') as voided \gset
select is(:'voided'::jsonb ->> 'status', 'ok', 'an admin voids the sale');
select is((:'voided'::jsonb ->> 'returned_units')::int, 2, 'it reports the units returned');
select is((:'voided'::jsonb ->> 'received_amount')::int, 3000, 'it reports the money already received');

select tests.clear_authentication();
select is((select stock from public.products where code = 'BIS-004'), :stock_before, 'stock comes back (RN-11)');
select is(
    (select count(*)::int from public.inventory_movements where sale_id = :'sale_id' and type = 'void'),
    1, 'the return is in the stock ledger'
);
select is(
    (select status || ':' || balance from public.v_sale_accounts where sale_id = :'sale_id'),
    'voided:0', 'a voided sale owes nothing and leaves receivables (RN-09)'
);
select is(
    (select void_reason from public.sales where id = :'sale_id'), 'Devolución', 'the reason is kept'
);

select tests.authenticate_as('admin2@test.local');
select throws_ok(
    format($$select public.void_sale(%L, 'Otra vez')$$, :'sale_id'),
    'P0001', 'already_voided', 'voiding twice tells who voided it first'
);
select throws_ok(
    $$select public.void_sale(gen_random_uuid(), 'No existe')$$,
    'P0001', 'sale_not_found', 'an unknown sale is reported'
);

select * from finish();
rollback;
