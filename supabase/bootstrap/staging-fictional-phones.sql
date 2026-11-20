-- Staging only: moves every phone in inv-staging to the fictional range +506 1230-NNNN,
-- so testing can never message a real person (no Costa Rican line starts with 1).
-- Run ONCE from the Supabase SQL editor of inv-staging (docs/runbooks/staging.md).
-- Never run it in production: it refuses unless the fictional demo catalog is present.
--
-- - Demo customers keep their last four digits: 8000-0003 becomes 1230-0003.
-- - Any other customer phone (typed while testing) becomes 1239-NNNN.
-- - Staff phones in profiles, if any, become 1238-NNNN.
-- - The reminder log (notification_outbox) follows its customer's new number;
--   anything left becomes 1237-NNNN.
-- Everything runs in one block: it all applies, or nothing does.

do $$
declare
    v_demo_customers integer;
    v_other_customers integer;
    v_profiles integer;
    v_outbox integer;
    v_left integer;
begin
    if (select count(*) from public.businesses) <> 1 then
        raise exception 'Expected exactly one business (staging)';
    end if;
    if not exists (
        select 1 from public.products
        where code = 'PER-001' and name = 'Rosa Imperial EDP 100 ml'
    ) then
        raise exception 'The fictional demo catalog is missing: this does not look like inv-staging';
    end if;

    -- Remember the old number of each customer to fix the reminder log afterwards.
    create temporary table phone_moves (old_e164 text primary key, new_e164 text not null)
    on commit drop;

    insert into phone_moves (old_e164, new_e164)
    select c.phone_e164, '+5061230' || right(c.phone_e164, 4)
    from public.customers as c
    where c.phone_e164 ~ '^\+5068000[0-9]{4}$';
    get diagnostics v_demo_customers = row_count;

    insert into phone_moves (old_e164, new_e164)
    select
        c.phone_e164,
        '+5061239' || lpad((row_number() over (order by c.created_at, c.id))::text, 4, '0')
    from public.customers as c
    where c.phone_e164 !~ '^\+506(1230|8000)[0-9]{4}$';
    get diagnostics v_other_customers = row_count;

    update public.customers as c
    set phone_e164 = m.new_e164
    from phone_moves as m
    where c.phone_e164 = m.old_e164;

    update public.notification_outbox as o
    set recipient_e164 = m.new_e164
    from phone_moves as m
    where o.recipient_e164 = m.old_e164;
    get diagnostics v_outbox = row_count;

    with numbered as (
        select
            o.id,
            '+5061237' || lpad((row_number() over (order by o.created_at, o.id))::text, 4, '0') as new_e164
        from public.notification_outbox as o
        where o.recipient_e164 !~ '^\+5061[0-9]{7}$'
    )
    update public.notification_outbox as o
    set recipient_e164 = n.new_e164
    from numbered as n
    where o.id = n.id;

    with numbered as (
        select
            p.id,
            '+5061238' || lpad((row_number() over (order by p.id))::text, 4, '0') as new_e164
        from public.profiles as p
        where p.phone_e164 is not null and p.phone_e164 !~ '^\+5061[0-9]{7}$'
    )
    update public.profiles as p
    set phone_e164 = n.new_e164
    from numbered as n
    where p.id = n.id;
    get diagnostics v_profiles = row_count;

    select
        (select count(*) from public.customers where phone_e164 !~ '^\+5061[0-9]{7}$')
        + (select count(*) from public.profiles where phone_e164 !~ '^\+5061[0-9]{7}$')
        + (select count(*) from public.notification_outbox where recipient_e164 !~ '^\+5061[0-9]{7}$')
    into v_left;
    if v_left <> 0 then
        raise exception 'Some phones are still outside the fictional range: %', v_left;
    end if;

    raise notice 'Demo customers moved: %, other customers: %, staff phones: %, reminder log rows: %',
        v_demo_customers, v_other_customers, v_profiles, v_outbox;
end;
$$;

-- Check: every phone now starts with +506 1.
select
    (select count(*) from public.customers) as customers,
    (
        select count(*) from public.customers
        where phone_e164 like '+5061%'
    ) as customers_fictional,
    (select count(*) from public.notification_outbox) as reminders,
    (
        select count(*) from public.notification_outbox
        where recipient_e164 like '+5061%'
    ) as reminders_fictional;
