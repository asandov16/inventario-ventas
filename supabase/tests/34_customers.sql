-- Customers: CU-03, RN-01, RF-CLI-01.
begin;
select plan(13);

select tests.authenticate_as('vendedor@test.local');

select public.create_customer('  Nidia Rojas  ', '8000-0099') as created \gset
select is(:'created'::jsonb ->> 'status', 'ok', 'a seller can create a customer');
select is(:'created'::jsonb -> 'customer' ->> 'phone_e164', '+50680000099', 'the phone is stored as E.164');
select is(:'created'::jsonb -> 'customer' ->> 'name', 'Nidia Rojas', 'the name is trimmed');

select is(
    public.create_customer('Otra Persona', '+506 8000 0099') ->> 'status',
    'exists', 'a phone already registered offers the existing customer (RN-01)'
);
select is(
    public.create_customer('Otra Persona', '506-80000099') -> 'customer' ->> 'name',
    'Nidia Rojas', 'exists returns the customer that owns the phone'
);
select throws_ok(
    $$select public.create_customer('Sin Teléfono', '1234')$$,
    'P0001', 'invalid_phone', 'a phone without 8 digits is rejected'
);
select throws_ok(
    $$select public.create_customer(' ', '80000098')$$,
    'P0001', 'invalid_name', 'an empty name is rejected'
);

-- Offline-created customers keep the id generated on the phone (D-05).
select is(
    public.create_customer('Desde Celular', '80000097', p_id => '40000000-0000-4000-8000-000000000001')
        -> 'customer' ->> 'id',
    '40000000-0000-4000-8000-000000000001', 'the id generated on the phone is kept'
);
select is(
    public.create_customer('Desde Celular', '80000097', p_id => '40000000-0000-4000-8000-000000000001') ->> 'status',
    'replay', 'sending the same offline customer again is a replay'
);

-- Search without accents or by phone digits (CU-03).
select is(
    public.search_customers('zeledon') -> 'customers' -> 0 ->> 'name',
    'Danae Zeledón', 'search ignores accents and case'
);
select is(
    public.search_customers('0003') -> 'customers' -> 0 ->> 'name',
    'Danae Zeledón', 'search matches phone digits'
);
select ok(
    (public.search_customers('zeledon') -> 'customers' -> 0 ->> 'overdue_amount')::int > 0,
    'search results include the overdue amount (D-06 warning)'
);

select is(
    public.update_customer(
        (:'created'::jsonb -> 'customer' ->> 'id')::uuid, 'Nidia Rojas', '80000001'
    ) ->> 'status',
    'exists', 'changing to a phone of another customer is refused with that customer'
);

select * from finish();
rollback;
