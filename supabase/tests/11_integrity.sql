-- Nothing is deleted, history is immutable, and CHECKs guard the model (RN-03, RN-05, RN-09, RN-12).
begin;
select plan(14);

select throws_ok(
    $$delete from public.products$$, 'P0001', 'delete_not_allowed',
    'DELETE on products fails even as postgres'
);
select throws_ok(
    $$delete from public.customers$$, 'P0001', 'delete_not_allowed',
    'DELETE on customers fails even as postgres'
);
select throws_ok(
    $$truncate public.activity_log$$, 'P0001', 'delete_not_allowed',
    'TRUNCATE on activity_log fails'
);
select throws_ok(
    $$update public.inventory_movements set reason = 'changed'$$, 'P0001', 'immutable_record',
    'stock movements cannot be edited'
);
select throws_ok(
    $$update public.products set stock = -1 where code = 'PER-001'$$, '23514', null,
    'stock can never be negative (RN-02)'
);

-- A valid cash sale inserted directly (as the owner) to exercise sales constraints.
select c.id as customer_id, p.id as seller_id, m.id as method_id, b.id as business_id
from public.customers as c, public.profiles as p, public.payment_methods as m, public.businesses as b
where c.phone_e164 = '+50680000001' and p.full_name = 'Bruno Arrieta' and m.name = 'Efectivo'
limit 1 \gset

select throws_ok(
    format($$insert into public.sales (business_id, folio, customer_id, seller_id, type, total, months,
        down_payment, payment_method_id, idempotency_key)
        values (%L, 9001, %L, %L, 'installments', 10000, 2, 10000, %L, gen_random_uuid())$$,
        :'business_id', :'customer_id', :'seller_id', :'method_id'),
    '23514', null, 'down payment equal to the total is rejected (RN-05)'
);
select throws_ok(
    format($$insert into public.sales (business_id, folio, customer_id, seller_id, type, total, months,
        payment_method_id, idempotency_key)
        values (%L, 9002, %L, %L, 'installments', 10000, 4, %L, gen_random_uuid())$$,
        :'business_id', :'customer_id', :'seller_id', :'method_id'),
    '23514', null, 'a term over 3 months is rejected (RN-03)'
);
select throws_ok(
    format($$insert into public.sales (business_id, folio, customer_id, seller_id, type, total,
        payment_method_id, idempotency_key)
        values (%L, 9003, null, %L, 'cash', 10000, %L, gen_random_uuid())$$,
        :'business_id', :'seller_id', :'method_id'),
    '23502', null, 'a sale without customer is rejected (RN-01)'
);

insert into public.sales (id, business_id, folio, customer_id, seller_id, type, total,
    payment_method_id, idempotency_key)
values ('00000000-0000-4000-8000-0000000000aa', :'business_id', 9010, :'customer_id', :'seller_id',
    'cash', 10000, :'method_id', gen_random_uuid());

select is(
    (select type from public.activity_log where entity_id = '00000000-0000-4000-8000-0000000000aa'),
    'sale', 'a new sale is written to the activity log'
);
select throws_ok(
    $$update public.sales set total = 1 where folio = 9010$$, 'P0001', 'immutable_record',
    'a sale cannot be edited'
);
select lives_ok(
    format($$update public.sales set voided_at = now(), voided_by = %L, void_reason = 'Error de registro'
        where folio = 9010$$, :'seller_id'),
    'a sale can be voided once'
);
select throws_ok(
    $$update public.sales set voided_at = now() where folio = 9010$$, 'P0001', 'already_voided',
    'a voided sale cannot be voided again'
);
select is(
    (select count(*)::int from public.activity_log
     where entity_id = '00000000-0000-4000-8000-0000000000aa' and type = 'void'),
    1, 'voiding is written to the activity log'
);
select throws_ok(
    $$delete from public.sales where folio = 9010$$, 'P0001', 'delete_not_allowed',
    'a voided sale is still never deleted'
);

select * from finish();
rollback;
