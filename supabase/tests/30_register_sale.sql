-- register_sale: CU-01, CU-02, RN-01, RN-02, RN-04, RN-05, RN-11, RN-15, RN-16, RN-18.
begin;
select plan(30);

select
    (select id from public.customers where phone_e164 = '+50680000009') as customer_id,
    (select id from public.products where code = 'PER-004') as perfume_id,
    (select id from public.products where code = 'BIS-004') as rings_id,
    (select id from public.products where code = 'BIS-003') as out_of_stock_id,
    (select id from public.payment_methods where name = 'Efectivo') as cash_id,
    (select last_folio from public.businesses) as last_folio \gset

select tests.authenticate_as('vendedor@test.local');

-- Cash sale (CU-01): 31 000 + 2 x 7 900 = 46 800.
select public.register_sale(
    '10000000-0000-4000-8000-000000000001', :'customer_id', 'cash',
    jsonb_build_array(
        jsonb_build_object('product_id', :'perfume_id', 'qty', 1),
        jsonb_build_object('product_id', :'rings_id', 'qty', 2)
    ),
    :'cash_id', 46800
) as cash_sale \gset

select is(:'cash_sale'::jsonb ->> 'status', 'ok', 'a seller can register a cash sale');
select is((:'cash_sale'::jsonb -> 'sale' ->> 'folio')::int, :last_folio + 1, 'the sale takes the next folio (RN-15)');
select is((:'cash_sale'::jsonb -> 'sale' ->> 'total')::int, 46800, 'the total comes from database prices');
select is((:'cash_sale'::jsonb -> 'sale' ->> 'status'), 'cash', 'a cash sale has status cash');

select tests.clear_authentication();
select is((select stock from public.products where code = 'PER-004'), 3, 'stock decreases immediately (RN-11)');
select is((select stock from public.products where code = 'BIS-004'), 9, 'stock decreases by the quantity sold');
select is(
    (select count(*)::int from public.inventory_movements
     where sale_id = (:'cash_sale'::jsonb -> 'sale' ->> 'id')::uuid and type = 'sale'),
    2, 'one sale movement per product'
);
select is(
    (select kind || ':' || amount from public.payments where sale_id = (:'cash_sale'::jsonb -> 'sale' ->> 'id')::uuid),
    'cash:46800', 'a cash sale records the full payment'
);
select is(
    (select sic.unit_cost from public.sale_item_costs as sic
     inner join public.sale_items as si on si.id = sic.sale_item_id
     where si.sale_id = (:'cash_sale'::jsonb -> 'sale' ->> 'id')::uuid and si.product_id = :'perfume_id'),
    15000, 'the cost of the day is copied to the line (RN-16)'
);

-- RN-16: changing a price later never changes past sales.
update public.products set price = 99000 where code = 'PER-004';
select is(
    (select unit_price from public.sale_items
     where sale_id = (:'cash_sale'::jsonb -> 'sale' ->> 'id')::uuid and product_id = :'perfume_id'),
    31000, 'the line keeps the price of the day after a price change'
);
update public.products set price = 31000 where code = 'PER-004';

select tests.authenticate_as('vendedor@test.local');

-- Replay with the same key returns the same sale and writes nothing (RN-18).
select is(
    public.register_sale(
        '10000000-0000-4000-8000-000000000001', :'customer_id', 'cash',
        jsonb_build_array(jsonb_build_object('product_id', :'perfume_id', 'qty', 1)), :'cash_id', 31000
    ) ->> 'status',
    'replay', 'retrying with the same idempotency key returns replay'
);

-- Possible duplicate within 10 minutes (RN-18).
select is(
    public.register_sale(
        gen_random_uuid(), :'customer_id', 'cash',
        jsonb_build_array(
            jsonb_build_object('product_id', :'rings_id', 'qty', 2),
            jsonb_build_object('product_id', :'perfume_id', 'qty', 1)
        ),
        :'cash_id', 46800
    ) ->> 'status',
    'possible_duplicate', 'same customer and items within 10 minutes asks for confirmation'
);
select is(
    public.register_sale(
        gen_random_uuid(), :'customer_id', 'cash',
        jsonb_build_array(
            jsonb_build_object('product_id', :'rings_id', 'qty', 2),
            jsonb_build_object('product_id', :'perfume_id', 'qty', 1)
        ),
        :'cash_id', 46800, p_confirm_duplicate => true
    ) ->> 'status',
    'ok', 'a confirmed duplicate is saved'
);

-- Repeated product lines are merged.
select public.register_sale(
    gen_random_uuid(), :'customer_id', 'cash',
    jsonb_build_array(
        jsonb_build_object('product_id', :'rings_id', 'qty', 1),
        jsonb_build_object('product_id', :'rings_id', 'qty', 1)
    ),
    :'cash_id', 15800
) as merged_sale \gset
select is(
    (select string_agg(qty::text, ',') from public.sale_items
     where sale_id = (:'merged_sale'::jsonb -> 'sale' ->> 'id')::uuid),
    '2', 'repeated lines of the same product are merged into one line of 2'
);

-- Installment sale (CU-02): 31 000 with 5 000 down over 2 months -> 13 000 x 2.
select public.register_sale(
    gen_random_uuid(), :'customer_id', 'installments',
    jsonb_build_array(jsonb_build_object('product_id', :'perfume_id', 'qty', 1)),
    :'cash_id', 31000, p_months => 2, p_down_payment => 5000
) as credit_sale \gset

select is(:'credit_sale'::jsonb ->> 'status', 'ok', 'an installment sale is registered');
select is(
    (select array_agg(amount order by number) from public.installments
     where sale_id = (:'credit_sale'::jsonb -> 'sale' ->> 'id')::uuid),
    array[13000, 13000], 'the plan splits total minus down payment (RN-04)'
);
select is((:'credit_sale'::jsonb -> 'sale' ->> 'balance')::int, 26000, 'the down payment counts as paid');
select is(:'credit_sale'::jsonb -> 'sale' ->> 'status', 'pending', 'a new installment sale is pending');

-- Rejections.
select throws_ok(
    format($$select public.register_sale(gen_random_uuid(), null, 'cash',
        '[{"product_id": "%s", "qty": 1}]', %L, 31000)$$, :'perfume_id', :'cash_id'),
    'P0001', 'customer_required', 'a sale without customer is rejected (RN-01)'
);
select throws_ok(
    format($$select public.register_sale(gen_random_uuid(), %L, 'cash',
        '[{"product_id": "%s", "qty": 1}]', %L, 4800)$$, :'customer_id', :'out_of_stock_id', :'cash_id'),
    'P0001', 'insufficient_stock', 'an out-of-stock product cannot be sold (RN-02)'
);
select throws_ok(
    format($$select public.register_sale(gen_random_uuid(), %L, 'cash',
        '[{"product_id": "%s", "qty": 50}]', %L, 395000)$$, :'customer_id', :'rings_id', :'cash_id'),
    'P0001', 'insufficient_stock', 'more units than available are rejected (RN-02)'
);
select throws_ok(
    format($$select public.register_sale(gen_random_uuid(), %L, 'cash',
        '[{"product_id": "%s", "qty": 1}]', %L, 1)$$, :'customer_id', :'perfume_id', :'cash_id'),
    'P0001', 'total_changed', 'a stale total from the client is rejected'
);
select throws_ok(
    format($$select public.register_sale(gen_random_uuid(), %L, 'installments',
        '[{"product_id": "%s", "qty": 1}]', %L, 31000, 4)$$, :'customer_id', :'perfume_id', :'cash_id'),
    'P0001', 'invalid_term', 'a term over 3 months is rejected (RN-03)'
);
select throws_ok(
    format($$select public.register_sale(gen_random_uuid(), %L, 'installments',
        '[{"product_id": "%s", "qty": 1}]', %L, 31000, 2, 31000)$$, :'customer_id', :'perfume_id', :'cash_id'),
    'P0001', 'invalid_down_payment', 'a down payment equal to the total is rejected (RN-05)'
);
select throws_ok(
    format($$select public.register_sale(gen_random_uuid(), %L, 'cash',
        '[{"product_id": "%s", "qty": 1}]', null, 31000)$$, :'customer_id', :'perfume_id'),
    'P0001', 'payment_method_required', 'a cash sale needs a payment method'
);
select throws_ok(
    format($$select public.register_sale(gen_random_uuid(), %L, 'cash', '[]', %L, 0)$$,
        :'customer_id', :'cash_id'),
    'P0001', 'invalid_items', 'an empty cart is rejected'
);
select throws_ok(
    format($$select public.register_sale(gen_random_uuid(), %L, 'cash',
        '[{"product_id": "%s", "qty": 0}]', %L, 0)$$, :'customer_id', :'perfume_id', :'cash_id'),
    'P0001', 'invalid_items', 'a zero quantity is rejected'
);

-- Inactive products cannot be sold.
select tests.clear_authentication();
update public.products set active = false where code = 'BIS-005';
select tests.authenticate_as('vendedor@test.local');
select throws_ok(
    format($$select public.register_sale(gen_random_uuid(), %L, 'cash',
        '[{"product_id": "%s", "qty": 1}]', %L, 12000)$$,
        :'customer_id', (select id from public.products where code = 'BIS-005'), :'cash_id'),
    'P0001', 'inactive_product', 'an inactive product cannot be sold'
);

-- A user without sales.create (another business admin cannot see our customer).
select tests.clear_authentication();
select private.create_business('Otro') as other_id \gset
select tests.create_user('otro2@test.local', 'admin', :'other_id');
select tests.authenticate_as('otro2@test.local');
select throws_ok(
    format($$select public.register_sale(gen_random_uuid(), %L, 'cash',
        '[{"product_id": "%s", "qty": 1}]', %L, 31000)$$, :'customer_id', :'perfume_id', :'cash_id'),
    'P0001', 'customer_required', 'a customer from another business is rejected'
);

-- Deactivated users lose every permission.
select tests.clear_authentication();
update public.profiles set active = false where id = (select id from auth.users where email = 'vendedor@test.local');
select tests.authenticate_as('vendedor@test.local');
select throws_ok(
    format($$select public.register_sale(gen_random_uuid(), %L, 'cash',
        '[{"product_id": "%s", "qty": 1}]', %L, 31000)$$, :'customer_id', :'perfume_id', :'cash_id'),
    'P0001', 'permission_denied', 'an inactive user cannot sell'
);

select * from finish();
rollback;
