-- Inventory RPCs: CU-09, CU-10, CU-11, RF-INV-01, RF-INV-05, RN-12, RN-18.
begin;
select plan(24);

select
    (select id from public.categories where prefix = 'PER') as per_id,
    (select id from public.products where code = 'BIS-001') as earrings_id \gset

-- Sellers cannot change inventory (matrix 2.2).
select tests.authenticate_as('vendedor@test.local');
select throws_ok(
    format($$select public.create_product(gen_random_uuid(), 'Perfume Jazmín 50 ml', %L, 21000, 3, 12, 9000)$$,
        :'per_id'),
    'P0001', 'permission_denied', 'a seller cannot create products'
);
select throws_ok(
    format($$select public.restock_product(gen_random_uuid(), %L, 5)$$, :'earrings_id'),
    'P0001', 'permission_denied', 'a seller cannot restock'
);

select tests.clear_authentication();
select tests.authenticate_as('admin@test.local');

-- CU-10: create with an automatic code.
select public.create_product(
    '50000000-0000-4000-8000-000000000001', 'Perfume Jazmín 50 ml', :'per_id', 21000, 3, 12, 9000
) as created \gset
select is(:'created'::jsonb ->> 'status', 'ok', 'an admin creates a product');
select is(:'created'::jsonb -> 'product' ->> 'code', 'PER-006', 'the code continues the category sequence');
select is((:'created'::jsonb -> 'product' ->> 'stock')::int, 12, 'it starts with the initial quantity');
select is((:'created'::jsonb -> 'product' ->> 'unit_cost')::int, 9000, 'an admin sees the cost');
select is(
    (select type || ':' || qty_delta from public.inventory_movements
     where product_id = (:'created'::jsonb -> 'product' ->> 'id')::uuid),
    'initial:12', 'the initial quantity is in the stock ledger'
);
select is(
    public.create_product(
        '50000000-0000-4000-8000-000000000001', 'Perfume Jazmín 50 ml', :'per_id', 21000, 3, 12, 9000
    ) ->> 'status',
    'replay', 'retrying with the same key returns the product already created'
);
select is(
    public.create_product(gen_random_uuid(), 'perfume jazmin 50ml', :'per_id', 21000, 3, 1, 9000) ->> 'status',
    'similar', 'a very similar name offers the existing product (CU-10)'
);
select is(
    public.create_product(
        gen_random_uuid(), 'perfume jazmin 50ml', :'per_id', 21000, 3, 1, 9000, p_confirm_similar => true
    ) -> 'product' ->> 'code',
    'PER-007', 'a confirmed similar product is created with the next code'
);
select throws_ok(
    format($$select public.create_product(gen_random_uuid(), 'Gratis', %L, 0, 1, 1, 0)$$, :'per_id'),
    'P0001', 'invalid_price', 'a price of 0 is rejected'
);
select throws_ok(
    $$select public.create_product(gen_random_uuid(), 'Sin categoría', gen_random_uuid(), 1000, 1, 1, 0)$$,
    'P0001', 'category_required', 'an unknown category is rejected'
);

-- CU-09: restock.
select public.restock_product('50000000-0000-4000-8000-000000000002', :'earrings_id', 12, 2400) as restocked \gset
select is(
    (:'restocked'::jsonb ->> 'stock_before') || ' → ' || (:'restocked'::jsonb ->> 'stock_after'),
    '16 → 28', 'restocking reports the stock before and after'
);
select is(
    public.restock_product(gen_random_uuid(), :'earrings_id', 12) ->> 'status',
    'possible_duplicate', 'the same product and quantity within 10 minutes asks for confirmation (RN-18)'
);
select is(
    public.restock_product('50000000-0000-4000-8000-000000000002', :'earrings_id', 12, 2400) ->> 'status',
    'replay', 'retrying with the same key returns replay'
);
select is(
    (select unit_cost from public.product_costs where product_id = :'earrings_id'),
    2400, 'a restock with a cost updates the current cost'
);
select throws_ok(
    format($$select public.restock_product(gen_random_uuid(), %L, 0)$$, :'earrings_id'),
    'P0001', 'invalid_quantity', 'a quantity of 0 is rejected'
);

-- CU-11: edit with optimistic locking and count adjustment.
select version as v from public.products where id = :'earrings_id' \gset
select public.update_product(:'earrings_id', :v, 'Aretes argolla dorada', 6500, 6, 2400, 27) as updated \gset
select is(:'updated'::jsonb -> 'stock_adjusted' ->> 'to', '27', 'a physical count adjusts the stock');
select is(
    (select reason from public.inventory_movements where product_id = :'earrings_id' and type = 'adjustment'),
    'Ajuste de conteo: 28 → 27', 'the adjustment is recorded with before and after (RN-12)'
);
select throws_ok(
    format($$select public.update_product(%L, %s, 'Aretes argolla dorada', 6500, 6)$$, :'earrings_id', :v),
    'P0001', 'concurrent_update', 'saving with an old version is refused (someone else saved first)'
);
select is(
    public.update_product(:'earrings_id', :v + 1, 'Aretes argolla dorada', 2000, 6) ->> 'price_below_cost',
    'true', 'a price below cost is allowed with a warning (CU-11)'
);
select is(
    public.update_product(:'earrings_id', :v + 2, 'Aretes argolla dorada', 6500, 6, p_active => false)
        -> 'product' ->> 'active',
    'false', 'a product can be deactivated without deleting it (RF-INV-05)'
);

-- Sellers see products without costs.
select tests.clear_authentication();
select tests.authenticate_as('vendedor@test.local');
select is(
    (select count(*)::int from public.v_products_status where code like 'PER-00%'),
    7, 'the seller sees the new products'
);
select is(
    (select count(*)::int from public.inventory_movement_costs), 0, 'the seller never sees restock costs (ADR-036)'
);

select * from finish();
rollback;
