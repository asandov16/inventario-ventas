-- register_payment and account status: CU-06, RN-06, RN-07, RN-08, RN-18.
begin;
select plan(17);

select
    (select id from public.customers where phone_e164 = '+50680000010') as customer_id,
    (select id from public.products where code = 'PER-003') as product_id,
    (select id from public.payment_methods where name = 'SINPE Móvil') as sinpe_id \gset

select tests.authenticate_as('vendedor@test.local');

-- 22 000 over 2 months, no down payment -> 11 000 x 2.
select public.register_sale(
    gen_random_uuid(), :'customer_id', 'installments',
    jsonb_build_array(jsonb_build_object('product_id', :'product_id', 'qty', 1)),
    null, 22000, p_months => 2
) -> 'sale' ->> 'id' as sale_id \gset

select public.register_payment('20000000-0000-4000-8000-000000000001', :'sale_id', 6000, :'sinpe_id') as p1 \gset
select is(:'p1'::jsonb ->> 'status', 'ok', 'a seller can register a partial payment');
select is((:'p1'::jsonb ->> 'balance')::int, 16000, 'the balance goes down by the payment');
select is(:'p1'::jsonb ->> 'paid_off', 'false', 'a partial payment does not pay off the account');
select is(
    (select status from public.v_installment_status where sale_id = :'sale_id' and number = 1),
    'partial', 'the oldest installment becomes partial (RN-06)'
);
select is(
    (select next_due_amount from public.v_sale_accounts where sale_id = :'sale_id'),
    5000, 'the next amount due is what is left of the oldest installment'
);

-- RN-18: same key is a replay; same amount within 10 minutes asks for confirmation.
select is(
    public.register_payment('20000000-0000-4000-8000-000000000001', :'sale_id', 6000, :'sinpe_id') ->> 'status',
    'replay', 'retrying with the same key returns replay'
);
select is(
    public.register_payment(gen_random_uuid(), :'sale_id', 6000, :'sinpe_id') ->> 'status',
    'possible_duplicate', 'the same amount within 10 minutes asks for confirmation'
);
select is(
    (select count(*)::int from public.payments where sale_id = :'sale_id'),
    1, 'neither the replay nor the possible duplicate wrote a payment'
);

-- RN-06: never more than the balance.
select throws_ok(
    format($$select public.register_payment(gen_random_uuid(), %L, 16001, %L)$$, :'sale_id', :'sinpe_id'),
    'P0001', 'payment_exceeds_balance', 'a payment larger than the balance is rejected'
);
select throws_ok(
    format($$select public.register_payment(gen_random_uuid(), %L, 0, %L)$$, :'sale_id', :'sinpe_id'),
    'P0001', 'invalid_amount', 'a zero payment is rejected'
);
select throws_ok(
    format($$select public.register_payment(gen_random_uuid(), %L, 1000, null)$$, :'sale_id'),
    'P0001', 'payment_method_required', 'a payment needs a method'
);

-- RN-08: paying the rest pays the account off.
select public.register_payment(gen_random_uuid(), :'sale_id', 16000, :'sinpe_id') as p2 \gset
select is(:'p2'::jsonb ->> 'paid_off', 'true', 'paying the whole balance pays off the account');
select is(
    (select status from public.v_sale_accounts where sale_id = :'sale_id'),
    'paid', 'a paid-off account has status paid and leaves receivables (RN-08)'
);
select throws_ok(
    format($$select public.register_payment(gen_random_uuid(), %L, 1, %L)$$, :'sale_id', :'sinpe_id'),
    'P0001', 'payment_exceeds_balance', 'a paid-off account accepts no more payments'
);

-- RN-07: an installment whose date passed and is not covered is overdue.
select public.register_sale(
    gen_random_uuid(), :'customer_id', 'installments',
    jsonb_build_array(jsonb_build_object('product_id', :'product_id', 'qty', 1)),
    null, 22000, p_months => 2, p_client_created_at => now() - interval '45 days',
    -- Same customer, product and total as the sale above: confirm it is not a duplicate.
    p_confirm_duplicate => true
) -> 'sale' ->> 'id' as old_sale_id \gset
select is(
    (select status from public.v_installment_status where sale_id = :'old_sale_id' and number = 1),
    'overdue', 'an uncovered installment past its date is overdue (RN-07)'
);
select is(
    (select overdue_amount from public.v_sale_accounts where sale_id = :'old_sale_id'),
    11000, 'the overdue amount is what is owed up to the overdue installment'
);
select is(
    (select overdue_amount from public.v_customer_balances where customer_id = :'customer_id'),
    11000, 'customer balances add up overdue amounts'
);

select * from finish();
rollback;
