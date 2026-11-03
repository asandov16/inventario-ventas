-- Local and CI seed ONLY (ADR-033). `supabase db push` never runs this file, so these
-- test users and fictional data never reach staging or production.
--
-- Test users (local password: devpassword-local — public by design, local only):
--   admin@test.local      Administrador
--   admin2@test.local     Administrador
--   vendedor@test.local   Vendedor
-- Phones use the fictional range +506 8000-00NN.

do $$
declare
    v_business_id uuid;
    v_user record;
begin
    v_business_id := private.create_business('Mi Negocio');

    for v_user in
        select * from (values
            ('00000000-0000-4000-8000-000000000001'::uuid, 'admin@test.local', 'admin', 'Ximena Ledezma'),
            ('00000000-0000-4000-8000-000000000002'::uuid, 'admin2@test.local', 'admin', 'Hernán Cubillo'),
            ('00000000-0000-4000-8000-000000000003'::uuid, 'vendedor@test.local', 'seller', 'Bruno Arrieta')
        ) as u (id, email, role_code, full_name)
    loop
        insert into auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
            confirmation_token, recovery_token, email_change_token_new, email_change
        ) values (
            '00000000-0000-0000-0000-000000000000', v_user.id, 'authenticated', 'authenticated',
            v_user.email, extensions.crypt('devpassword-local', extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
        );

        insert into auth.identities (
            id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) values (
            gen_random_uuid(), v_user.id, v_user.id::text,
            jsonb_build_object('sub', v_user.id::text, 'email', v_user.email, 'email_verified', true),
            'email', now(), now(), now()
        );

        perform private.link_user(v_user.email, v_user.role_code, v_user.full_name, v_business_id);
    end loop;
end;
$$;

-- Products from prototype v2: code, name, category prefix, price, unit cost, stock, minimum.
with data (code, name, prefix, price, unit_cost, stock, min_stock) as (
    values
    ('PER-001', 'Rosa Imperial EDP 100 ml', 'PER', 38000, 19000, 6, 3),
    ('PER-002', 'Ámbar Nocturno EDP 50 ml', 'PER', 26500, 12500, 2, 3),
    ('PER-003', 'Citrus Brisa EDT 100 ml', 'PER', 22000, 10000, 9, 3),
    ('PER-004', 'Vainilla & Sándalo 75 ml', 'PER', 31000, 15000, 4, 2),
    ('PER-005', 'Splash Coco Fresh 250 ml', 'PER', 9500, 4200, 14, 5),
    ('BIS-001', 'Aretes argolla dorada', 'BIS', 6500, 2200, 18, 6),
    ('BIS-002', 'Collar perla cultivada', 'BIS', 14500, 6000, 5, 3),
    ('BIS-003', 'Pulsera tejida con dije', 'BIS', 4800, 1500, 0, 5),
    ('BIS-004', 'Set anillos minimalistas (3)', 'BIS', 7900, 2800, 11, 4),
    ('BIS-005', 'Tobillera plata 925', 'BIS', 12000, 5200, 3, 3)
),

inserted as (
    insert into public.products (business_id, code, name, category_id, price, stock, min_stock)
    select
        c.business_id,
        d.code,
        d.name,
        c.id,
        d.price,
        d.stock,
        d.min_stock
    from data as d
    inner join public.categories as c on d.prefix = c.prefix
    returning id, business_id, code, stock
),

costs as (
    insert into public.product_costs (product_id, unit_cost)
    select
        i.id,
        d.unit_cost
    from inserted as i inner join data as d on i.code = d.code
)

insert into public.inventory_movements (business_id, product_id, type, qty_delta, stock_after, reason)
select
    i.business_id,
    i.id as product_id,
    'initial' as type,
    i.stock as qty_delta,
    i.stock as stock_after,
    'Inventario inicial' as reason
from inserted as i
where i.stock > 0;

update public.categories set last_seq = 5;

-- Fictional customers (names changed from the prototype; phones in the 8000-00NN range).
insert into public.customers (business_id, name, phone_e164)
select
    b.id,
    c.name,
    c.phone
from public.businesses as b
cross join (
    values
    ('Tamara Odio', '+50680000001'),
    ('Ana Celia Barquero', '+50680000002'),
    ('Danae Zeledón', '+50680000003'),
    ('Josué Irigaray', '+50680000004'),
    ('Fiorella Cascante', '+50680000005'),
    ('Anabel Quirós', '+50680000006'),
    ('Rodolfo Esquivel', '+50680000007'),
    ('Marisol Ugalde', '+50680000008'),
    ('Ruth Alfaro', '+50680000009'),
    ('Selene Matarrita', '+50680000010'),
    ('Kenia Brizuela', '+50680000011'),
    ('Priscila Obando', '+50680000012'),
    ('Mireya Leitón', '+50680000013'),
    ('Leonor Villalta', '+50680000014'),
    ('Graciela Sibaja', '+50680000015')
) as c (name, phone);
