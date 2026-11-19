-- Historial search without accents (CU-04): people type "zeledon" for "Zeledón".
-- v_sales_list gains customer_search, the same normalization the customer search uses.

-- Pure text functions: no data access, safe for the API roles to run inside views.
grant execute on function private.immutable_unaccent(text) to authenticated;
grant execute on function private.search_text(text) to authenticated;

create or replace view public.v_sales_list
with (security_invoker = true) as
select
    s.id as sale_id,
    s.business_id,
    s.folio,
    s.client_created_at,
    s.customer_id,
    c.name as customer_name,
    c.phone_e164 as customer_phone_e164,
    s.seller_id,
    pr.full_name as seller_name,
    s.type,
    s.source,
    s.description,
    s.total,
    a.balance,
    a.status,
    s.voided_at,
    coalesce((
        select sum(si.qty) from public.sale_items as si
        where si.sale_id = s.id
    ), 0)::integer as items_count,
    private.search_text(c.name) as customer_search
from public.sales as s
inner join public.customers as c on s.customer_id = c.id
inner join public.profiles as pr on s.seller_id = pr.id
inner join public.v_sale_accounts as a on s.id = a.sale_id;
