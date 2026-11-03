-- Schema shape and the "closed by default" privilege model (ADR-032).
begin;
select plan(10);

select tables_are('public', array[
    'businesses', 'permissions', 'roles', 'role_permissions', 'profiles',
    'categories', 'payment_methods', 'customers',
    'products', 'product_costs', 'inventory_movements', 'inventory_movement_costs',
    'sales', 'sale_items', 'sale_item_costs', 'installments', 'payments',
    'notification_outbox', 'reminders', 'activity_log'
], 'public schema has exactly the 20 application tables');

select is(
    (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
    0,
    'RLS is enabled on every public table'
);

select is(
    (select count(*)::int from information_schema.role_table_grants
     where table_schema = 'public' and grantee = 'authenticated' and privilege_type <> 'SELECT'),
    0,
    'authenticated has no INSERT/UPDATE/DELETE privilege on any table'
);

select is(
    (select count(*)::int from information_schema.role_table_grants
     where table_schema = 'public' and grantee = 'anon'),
    0,
    'anon has no privilege on any table'
);

select is(
    (select count(*)::int from pg_policies where schemaname = 'public' and cmd <> 'SELECT'),
    0,
    'there are no write policies: writes only happen through RPC'
);

select is((select count(*)::int from public.permissions), 16, 'permission catalog has 16 codes');

-- RN-13: money is whole colones. No decimal, float or money columns anywhere.
select is(
    (select count(*)::int from information_schema.columns
     where table_schema = 'public' and data_type in ('numeric', 'real', 'double precision', 'money')),
    0,
    'no column stores decimal amounts (RN-13: integer colones)'
);

select has_function('private', 'require_permission', array['text'], 'require_permission exists');
select has_function('private', 'business_today', array['uuid'], 'business_today exists');

select is(
    private.search_text('Jiménez ÁMBAR'),
    'jimenez ambar',
    'search_text removes accents and lowercases'
);

select * from finish();
rollback;
