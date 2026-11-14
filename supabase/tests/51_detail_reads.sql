-- Stage 3 detail reads: sale and product detail, recent restocks, activity, users and catalogs.
-- Who can read each one, who cannot, and that a seller never receives a cost (F6 DoD).
begin;
select plan(28);

-- Fixtures, read as the owner before acting as anyone.
select sale_id as overdue_sale from public.v_sale_accounts where status = 'overdue' limit 1 \gset
select a.sale_id as partial_sale from public.v_sale_accounts as a
where a.status = 'pending' and a.type = 'installments' and a.paid > (
    select s.down_payment from public.sales as s where s.id = a.sale_id
) limit 1 \gset
select id as voided_sale from public.sales where voided_at is not null limit 1 \gset
select id as product_id from public.products where code = 'PER-001' \gset

-- A second business with its own admin: it must see nothing of the first one.
select private.create_business('Negocio Ajeno') as other_business \gset
select tests.create_user('ajeno@test.local', 'admin', :'other_business') as other_admin \gset

-- get_sale_detail (CU-04, CU-06).
select tests.clear_authentication();
select tests.authenticate_as('vendedor@test.local');
select public.get_sale_detail(:'overdue_sale') as overdue \gset

select is(:'overdue'::jsonb ->> 'status', 'ok', 'a seller reads the detail of a sale');
select is(
    jsonb_array_length(:'overdue'::jsonb -> 'sale' -> 'installments'), 3, 'it lists the installment plan'
);
select is(
    :'overdue'::jsonb -> 'sale' -> 'installments' -> 0 ->> 'status', 'overdue',
    'each installment carries its status'
);
select ok(
    (:'overdue'::jsonb -> 'sale' -> 'payments' -> 0 ->> 'payment_method_name') is not null,
    'payments show their method'
);
select ok(
    (:'overdue'::jsonb -> 'sale' ->> 'seller_name') is not null, 'it shows who sold'
);
select is(
    (:'overdue'::jsonb -> 'customer_summary' ->> 'balance')::int,
    (select balance from public.v_customer_balances
     where customer_id = (:'overdue'::jsonb -> 'sale' -> 'customer' ->> 'id')::uuid),
    'it carries what the customer owes in total'
);

select public.get_sale_detail(:'partial_sale') as partial \gset
select is(
    (select sum((i ->> 'paid')::int) from jsonb_array_elements(:'partial'::jsonb -> 'sale' -> 'installments') as i)::int
    + (:'partial'::jsonb -> 'sale' ->> 'down_payment')::int,
    (:'partial'::jsonb -> 'sale' ->> 'paid')::int,
    'payments fill the installments in order: covered amounts add up to what was paid'
);

select public.get_sale_detail(:'voided_sale') as voided \gset
select ok(
    (:'voided'::jsonb -> 'sale' ->> 'voided_by_name') is not null
    and (:'voided'::jsonb -> 'sale' ->> 'void_reason') is not null,
    'a voided sale says who voided it and why'
);

select tests.clear_authentication();
select tests.authenticate_as('ajeno@test.local');
select throws_ok(
    format('select public.get_sale_detail(%L)', :'overdue_sale'), 'P0001', 'sale_not_found',
    'another business cannot read the sale'
);

select tests.clear_authentication();
select tests.authenticate_as_anon();
select throws_ok(
    format('select public.get_sale_detail(%L)', :'overdue_sale'), '42501', null,
    'anon cannot call get_sale_detail'
);

-- get_product_detail (CU-08): costs only with costs.read.
select tests.clear_authentication();
select tests.authenticate_as('vendedor@test.local');
select public.get_product_detail(:'product_id') as seller_product \gset
select is(:'seller_product'::jsonb ->> 'status', 'ok', 'a seller reads a product detail');
select ok(
    jsonb_array_length(:'seller_product'::jsonb -> 'movements') >= 1, 'it lists the movements'
);
select ok(
    (select bool_and(m ->> 'created_at' is not null)
     from jsonb_array_elements(:'seller_product'::jsonb -> 'movements') as m),
    'every movement has its date'
);
select is(
    :'seller_product'::jsonb -> 'product' ->> 'unit_cost', null, 'a seller does not receive the product cost'
);
select is(
    (select count(*)::int from jsonb_array_elements(:'seller_product'::jsonb -> 'movements') as m
     where m ->> 'unit_cost' is not null),
    0, 'a seller does not receive any movement cost'
);

select tests.clear_authentication();
select tests.authenticate_as('admin@test.local');
select public.get_product_detail(:'product_id') as admin_product \gset
select ok(
    (:'admin_product'::jsonb -> 'product' ->> 'unit_cost') is not null, 'an admin receives the product cost'
);

select tests.clear_authentication();
select tests.authenticate_as('ajeno@test.local');
select throws_ok(
    format('select public.get_product_detail(%L)', :'product_id'), 'P0001', 'product_not_found',
    'another business cannot read the product'
);

-- v_recent_restocks (CU-09).
select tests.clear_authentication();
select tests.authenticate_as('vendedor@test.local');
select ok((select count(*) from public.v_recent_restocks) > 0, 'a seller sees the latest stock entries');
select hasnt_column('public', 'v_recent_restocks', 'unit_cost', 'recent restocks carry no cost');

-- v_activity (RF-FB-07) and reminders in the feed (CU-07).
select ok(
    exists (select 1 from public.v_activity where type = 'sale' and actor_name is not null),
    'the activity feed names who did each thing'
);

select tests.clear_authentication();
select tests.authenticate_as('admin@test.local');
select public.record_reminder(:'overdue_sale') as reminder \gset
select is(
    (select actor_name from public.v_activity where type = 'reminder' and entity_id = :'overdue_sale'),
    'Ximena Ledezma', 'a confirmed reminder appears in the feed with who sent it'
);
select ok(
    (public.get_sale_detail(:'overdue_sale') -> 'sale' -> 'last_reminder' ->> 'created_at') is not null,
    'the sale detail shows the last reminder'
);

select tests.clear_authentication();
select tests.authenticate_as('ajeno@test.local');
select is((select count(*)::int from public.v_activity), 0, 'another business sees no activity');

-- v_users (F7-T10): only with users.admin, only the own business.
select tests.clear_authentication();
select tests.authenticate_as('vendedor@test.local');
select is((select count(*)::int from public.v_users), 0, 'a seller cannot list the users');

select tests.clear_authentication();
select tests.authenticate_as('admin@test.local');
select is((select count(*)::int from public.v_users), 3, 'an admin lists the people of the business');
select ok(
    not exists (select 1 from public.v_users where full_name = 'Usuario de prueba'),
    'an admin never sees users of another business'
);

-- v_categories and v_payment_methods (RN-14).
select tests.clear_authentication();
select tests.authenticate_as('vendedor@test.local');
select is(
    (select array_agg(prefix order by sort) from public.v_categories), array['PER', 'BIS'],
    'a seller reads the categories in order'
);

select tests.clear_authentication();
select tests.authenticate_as('ajeno@test.local');
select is(
    (select count(*)::int from public.v_payment_methods
     where business_id <> :'other_business'),
    0, 'payment methods of another business are not visible'
);

select * from finish();
rollback;
