-- private.create_business (used by bootstrap/prod.sql and the seed) builds a complete business.
begin;
select plan(6);

select private.create_business('Negocio Nuevo') as business_id \gset

select is(
    (select array_agg(code order by code) from public.roles where business_id = :'business_id'),
    array['admin', 'seller'], 'creates the admin and seller roles'
);
select is(
    (select count(*)::int from public.role_permissions as rp
     inner join public.roles as r on r.id = rp.role_id
     where r.business_id = :'business_id' and r.code = 'admin'),
    16, 'admin gets every permission'
);
select is(
    (select array_agg(rp.permission_code order by rp.permission_code) from public.role_permissions as rp
     inner join public.roles as r on r.id = rp.role_id
     where r.business_id = :'business_id' and r.code = 'seller'),
    array['customers.edit', 'dashboard.read', 'inventory.read', 'payments.create',
          'reminders.send', 'sales.create', 'sales.read'],
    'seller gets exactly the functional permission matrix (no costs, voids or settings)'
);
select is(
    (select array_agg(prefix order by sort) from public.categories where business_id = :'business_id'),
    array['PER', 'BIS'], 'creates Perfumes and Bisutería'
);
select is(
    (select array_agg(name order by sort) from public.payment_methods where business_id = :'business_id'),
    array['Efectivo', 'SINPE Móvil', 'Tarjeta'], 'creates the three payment methods (RN-14)'
);
select is(
    (select last_folio from public.businesses where id = :'business_id'),
    1000, 'folios start after 1000'
);

select * from finish();
rollback;
