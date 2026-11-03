-- Customers (RN-01, CU-03, RF-CLI-01): create, update and search.

-- Accepts 8811-2233, 88112233 or +506 8811 2233 and returns +50688112233.
create or replace function private.normalize_phone(p_phone text)
returns text
language plpgsql
set search_path = ''
as $$
declare
    v_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
    if length(v_digits) = 11 and left(v_digits, 3) = '506' then
        v_digits := right(v_digits, 8);
    end if;
    if v_digits !~ '^[0-9]{8}$' then
        perform private.raise_business_error('invalid_phone', jsonb_build_object('phone', p_phone));
    end if;
    return '+506' || v_digits;
end;
$$;

create or replace function private.customer_json(p_customer_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
    select jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'phone_e164', c.phone_e164,
        'email', c.email,
        'zone', c.zone,
        'notes', c.notes,
        'whatsapp_opt_in', c.whatsapp_opt_in,
        'balance', coalesce(b.balance, 0),
        'overdue_amount', coalesce(b.overdue_amount, 0)
    )
    from public.customers as c
    left join public.v_customer_balances as b on c.id = b.customer_id
    where c.id = p_customer_id;
$$;

create or replace function private.validate_customer_name(p_name text)
returns text
language plpgsql
set search_path = ''
as $$
begin
    if length(trim(coalesce(p_name, ''))) < 2 then
        perform private.raise_business_error('invalid_name');
    end if;
    return trim(p_name);
end;
$$;

-- p_id lets a phone create the customer offline and reference it from an offline sale (D-05).
create or replace function public.create_customer(
    p_name text,
    p_phone text,
    p_email text default null,
    p_zone text default null,
    p_notes text default null,
    p_whatsapp_opt_in boolean default false,
    p_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
    v_phone text;
    v_name text;
    v_existing_id uuid;
begin
    perform private.require_permission('customers.edit');
    v_business_id := private.current_business_id();
    if p_id is not null then
        perform private.lock_key('customer:' || p_id::text);
    end if;

    if p_id is not null
        and exists (select 1 from public.customers where id = p_id and business_id = v_business_id) then
        return jsonb_build_object('status', 'replay', 'customer', private.customer_json(p_id));
    end if;

    v_name := private.validate_customer_name(p_name);
    v_phone := private.normalize_phone(p_phone);

    -- Two phones creating the same customer at once: the second waits and gets "exists".
    perform private.lock_key('customer:' || v_business_id::text || ':' || v_phone);

    -- One phone, one customer: offer the existing one instead of a duplicate (RN-01).
    select c.id into v_existing_id
    from public.customers as c
    where c.business_id = v_business_id and c.phone_e164 = v_phone;
    if v_existing_id is not null then
        return jsonb_build_object('status', 'exists', 'customer', private.customer_json(v_existing_id));
    end if;

    insert into public.customers (
        id, business_id, name, phone_e164, email, zone, notes,
        whatsapp_opt_in, whatsapp_opt_in_at, created_by
    ) values (
        coalesce(p_id, gen_random_uuid()), v_business_id, v_name, v_phone,
        nullif(trim(p_email), ''), nullif(trim(p_zone), ''), nullif(trim(p_notes), ''),
        coalesce(p_whatsapp_opt_in, false),
        case when coalesce(p_whatsapp_opt_in, false) then now() end,
        auth.uid()
    )
    returning id into v_existing_id;

    return jsonb_build_object('status', 'ok', 'customer', private.customer_json(v_existing_id));
end;
$$;

create or replace function public.update_customer(
    p_id uuid,
    p_name text,
    p_phone text,
    p_email text default null,
    p_zone text default null,
    p_notes text default null,
    p_whatsapp_opt_in boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
    v_phone text;
    v_name text;
    v_other_id uuid;
begin
    perform private.require_permission('customers.edit');
    v_business_id := private.current_business_id();

    if not exists (select 1 from public.customers where id = p_id and business_id = v_business_id) then
        perform private.raise_business_error('customer_required', jsonb_build_object('customer_id', p_id));
    end if;

    v_name := private.validate_customer_name(p_name);
    v_phone := private.normalize_phone(p_phone);

    select c.id into v_other_id
    from public.customers as c
    where c.business_id = v_business_id and c.phone_e164 = v_phone and c.id <> p_id;
    if v_other_id is not null then
        return jsonb_build_object('status', 'exists', 'customer', private.customer_json(v_other_id));
    end if;

    update public.customers
    set
        name = v_name,
        phone_e164 = v_phone,
        email = nullif(trim(p_email), ''),
        zone = nullif(trim(p_zone), ''),
        notes = nullif(trim(p_notes), ''),
        whatsapp_opt_in = coalesce(p_whatsapp_opt_in, false),
        whatsapp_opt_in_at = case
            when not coalesce(p_whatsapp_opt_in, false) then null
            else coalesce(whatsapp_opt_in_at, now())
        end
    where id = p_id;

    return jsonb_build_object('status', 'ok', 'customer', private.customer_json(p_id));
end;
$$;

-- Matches by phone digits or by name without accents (CU-03 step 2).
create or replace function public.search_customers(p_query text, p_limit integer default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
    v_text text := private.search_text(trim(coalesce(p_query, '')));
    v_digits text := regexp_replace(coalesce(p_query, ''), '\D', '', 'g');
begin
    perform private.require_permission('sales.read');
    v_business_id := private.current_business_id();

    if length(v_text) < 2 and length(v_digits) < 3 then
        return jsonb_build_object('status', 'ok', 'customers', '[]'::jsonb);
    end if;

    return jsonb_build_object(
        'status', 'ok',
        'customers', coalesce((
            select jsonb_agg(private.customer_json(m.id) order by m.rank desc, m.name)
            from (
                select
                    c.id,
                    c.name,
                    case
                        when length(v_digits) >= 3 and c.phone_e164 like '%' || v_digits || '%' then 1.0
                        else extensions.similarity(private.search_text(c.name), v_text)
                    end as rank
                from public.customers as c
                where
                    c.business_id = v_business_id
                    and (
                        (length(v_digits) >= 3 and c.phone_e164 like '%' || v_digits || '%')
                        or (length(v_text) >= 2 and private.search_text(c.name) like '%' || v_text || '%')
                        or (length(v_text) >= 3 and extensions.similarity(private.search_text(c.name), v_text) > 0.3)
                    )
                order by rank desc, c.name
                limit greatest(1, least(coalesce(p_limit, 8), 50))
            ) as m
        ), '[]'::jsonb)
    );
end;
$$;

revoke execute on function public.create_customer(text, text, text, text, text, boolean, uuid) from public, anon;
revoke execute on function public.update_customer(uuid, text, text, text, text, text, boolean) from public, anon;
revoke execute on function public.search_customers(text, integer) from public, anon;
grant execute on function public.create_customer(text, text, text, text, text, boolean, uuid) to authenticated;
grant execute on function public.update_customer(uuid, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.search_customers(text, integer) to authenticated;
