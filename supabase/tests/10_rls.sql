-- Who can read what (RF-ROL-01, RF-ROL-02, D-11, RNF-05).
begin;
select plan(19);

-- A second business with its own admin, to prove tenant isolation.
select private.create_business('Otro Negocio') as other_business_id \gset
select tests.create_user('otro@test.local', 'admin', :'other_business_id');

-- Seller: sees the catalog, never costs.
select tests.authenticate_as('vendedor@test.local');
select is((select count(*)::int from public.products), 10, 'seller sees the 10 products');
select is((select count(*)::int from public.customers), 15, 'seller sees the 15 customers');
select is((select count(*)::int from public.product_costs), 0, 'seller cannot read product_costs');
select is((select count(*)::int from public.inventory_movement_costs), 0, 'seller cannot read restock costs');
select is((select count(*)::int from public.sale_item_costs), 0, 'seller cannot read sale line costs');
select ok((select count(*) from public.inventory_movements) > 0, 'seller can read the stock ledger');
select ok(
    not (public.get_my_profile()->'permissions' ? 'costs.read'),
    'seller profile does not include costs.read'
);
select is(
    jsonb_array_length(public.get_my_profile()->'permissions'), 7,
    'seller has the 7 permissions of the matrix'
);

-- Nobody writes tables directly, not even an admin.
select throws_ok(
    $$insert into public.customers (business_id, name, phone_e164)
      select id, 'Directo', '+50680000099' from public.businesses$$,
    '42501', null, 'seller cannot insert rows directly'
);

select tests.clear_authentication();
select tests.authenticate_as('admin@test.local');
select is((select count(*)::int from public.product_costs), 10, 'admin reads product costs');
select throws_ok(
    $$update public.products set price = 1$$,
    '42501', null, 'admin cannot update tables directly either'
);
select ok(public.get_my_profile()->'permissions' ? 'costs.read', 'admin profile includes costs.read');

-- Tenant isolation.
select tests.clear_authentication();
select tests.authenticate_as('otro@test.local');
select is((select count(*)::int from public.products), 0, 'another business sees none of our products');
select is((select count(*)::int from public.customers), 0, 'another business sees none of our customers');
select is((select count(*)::int from public.businesses), 1, 'another business only sees itself');

-- Deactivated users see nothing (RF-ROL-02).
select tests.clear_authentication();
update public.profiles set active = false
where id = (select id from auth.users where email = 'vendedor@test.local');
select tests.authenticate_as('vendedor@test.local');
select is((select count(*)::int from public.products), 0, 'inactive user sees no products');
select is(public.get_my_profile()->>'status', 'inactive', 'inactive user gets status inactive');

-- Anonymous requests.
select tests.clear_authentication();
select tests.authenticate_as_anon();
select throws_ok($$select count(*) from public.products$$, '42501', null, 'anon cannot read tables');
select is(public.ping()->>'status', 'ok', 'anon can call ping() for the keep-alive');

select * from finish();
rollback;
