-- Staging demo data (ADR-038). Run ONCE from the Supabase SQL editor of inv-staging, after
-- bootstrap/prod.sql and after linking the staging users (docs/runbooks/staging.md).
-- Never run it in production. Fictional products and customers only (phones +506 1230-00NN);
-- same catalog as the local seed, without users or sales: sales are made from the app.

do $$
begin
    if (select count(*) from public.businesses) <> 1 then
        raise exception 'Run bootstrap/prod.sql first: exactly one business is expected';
    end if;
    if exists (select 1 from public.products) then
        raise exception 'Demo data already loaded: products exist';
    end if;
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

-- Fictional customers (names changed from the prototype; phones in the 1230-00NN range).
insert into public.customers (business_id, name, phone_e164)
select
    b.id,
    c.name,
    c.phone
from public.businesses as b
cross join (
    values
    ('Tamara Odio', '+50612300001'),
    ('Ana Celia Barquero', '+50612300002'),
    ('Danae Zeledón', '+50612300003'),
    ('Josué Irigaray', '+50612300004'),
    ('Fiorella Cascante', '+50612300005'),
    ('Anabel Quirós', '+50612300006'),
    ('Rodolfo Esquivel', '+50612300007'),
    ('Marisol Ugalde', '+50612300008'),
    ('Ruth Alfaro', '+50612300009'),
    ('Selene Matarrita', '+50612300010'),
    ('Kenia Brizuela', '+50612300011'),
    ('Priscila Obando', '+50612300012'),
    ('Mireya Leitón', '+50612300013'),
    ('Leonor Villalta', '+50612300014'),
    ('Graciela Sibaja', '+50612300015')
) as c (name, phone);
