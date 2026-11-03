-- Read models: CU-04, CU-08, CU-12, CU-13, RF-DSH-01, RF-COB-01, RF-UX-04, RN-10, F2-T13.
-- The seed has: 2 cash sales (13 000 today, 9 500 yesterday), an overdue installment sale,
-- a partially paid one, a paid one, a carried-over balance and a voided sale; BIS-003 is out of stock.
begin;
select plan(24);

select tests.authenticate_as('vendedor@test.local');

-- RN-10 product status.
select is(
    (select stock_status from public.v_products_status where code = 'BIS-003'), 'out', 'stock 0 is out'
);
select is(
    (select stock_status from public.v_products_status where code = 'PER-002'), 'low',
    'stock at or below the minimum is low'
);
select is(
    (select stock_status from public.v_products_status where code = 'BIS-004'), 'ok', 'otherwise ok'
);

-- CU-12 alerts.
select ok(
    exists (select 1 from public.v_alerts where kind = 'overdue_installment' and severity = 'urgent'),
    'an overdue installment is an urgent alert'
);
select ok(
    exists (select 1 from public.v_alerts where kind = 'out_of_stock' and title = 'Pulsera tejida con dije'),
    'an out-of-stock product is an urgent alert'
);
select ok(
    exists (select 1 from public.v_alerts where kind = 'low_stock' and severity = 'attention'),
    'a low-stock product needs attention'
);
select ok(
    not exists (select 1 from public.v_alerts as a
                inner join public.v_sale_accounts as s on s.sale_id = a.entity_id
                where s.status in ('paid', 'voided')),
    'paid and voided sales never raise alerts'
);

-- CU-04 sales list.
select is(
    (select count(*)::int from public.v_sales_list), 7, 'the history lists every sale, voided included'
);
select is(
    (select status from public.v_sales_list where voided_at is not null), 'voided', 'a voided sale shows as voided'
);
select is(
    (select seller_name from public.v_sales_list order by folio limit 1), 'Ximena Ledezma', 'it shows who sold'
);

-- RF-DSH-01.
select public.get_dashboard_summary() as dash \gset
select is((:'dash'::jsonb ->> 'sales_today')::int, 13000, 'sales today exclude voided and carried-over sales');
select is((:'dash'::jsonb ->> 'receivable_total')::int, 69000, 'receivable total adds open balances');
select ok((:'dash'::jsonb ->> 'low_stock_count')::int >= 2, 'low stock count includes low and out');

-- RF-COB-01.
select public.get_receivables_summary() as rec \gset
select is((:'rec'::jsonb ->> 'overdue_total')::int, 10000, 'overdue total');
select is((:'rec'::jsonb ->> 'receivable_total')::int, 69000, 'receivable total matches the dashboard');

-- RF-UX-04.
select is((public.get_badge_counts() ->> 'overdue_accounts')::int, 1, 'one overdue account for the red badge');

-- CU-08 inventory summary: value at cost only with costs.read.
select ok(
    public.get_inventory_summary() -> 'value_at_cost' = 'null'::jsonb,
    'a seller does not get the inventory value at cost'
);

-- CU-13 analytics.
select public.get_analytics(7) as an \gset
select is((:'an'::jsonb ->> 'sold')::int, 22500 + 38500, 'sold in 7 days: two cash sales and one installment sale');
select ok(:'an'::jsonb -> 'gross_profit' = 'null'::jsonb, 'a seller does not see gross profit');
select is(jsonb_array_length(:'an'::jsonb -> 'daily'), 7, 'one point per day');
select throws_ok(
    $$select public.get_analytics(15)$$, 'P0001', 'invalid_period', 'only 7 or 30 days'
);
select throws_ok(
    $$select public.export_data()$$, 'P0001', 'permission_denied', 'a seller cannot export data'
);

select tests.clear_authentication();
select tests.authenticate_as('admin@test.local');
select ok(
    (public.get_analytics(30) ->> 'gross_profit')::int > 0, 'an admin sees gross profit'
);

-- F2-T13 Realtime publication: business tables yes, cost tables never.
select tests.clear_authentication();
select is(
    (select array_agg(tablename::text order by tablename) from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public'),
    array['activity_log', 'customers', 'inventory_movements', 'payments', 'products', 'sales'],
    'Realtime publishes the business tables and none of the cost tables'
);

select * from finish();
rollback;
