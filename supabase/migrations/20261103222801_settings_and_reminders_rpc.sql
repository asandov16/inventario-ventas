-- Collection reminders (CU-07, RF-COB-04) and business settings (CU-15: Perfil → Negocio).

-- Records a reminder the person confirmed they sent through the wa.me link (WhatsApp phase 0).
-- The outbox row is what the automatic API sender will consume in phase 1.
create or replace function public.record_reminder(p_sale_id uuid, p_channel text default 'whatsapp_link')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
    v_account public.v_sale_accounts%rowtype;
    v_customer public.customers%rowtype;
    v_outbox_id uuid;
    v_reminder_id uuid;
begin
    perform private.require_permission('reminders.send');
    v_business_id := private.current_business_id();

    if p_channel is null or p_channel not in ('whatsapp_link', 'whatsapp_api') then
        perform private.raise_business_error('invalid_channel');
    end if;

    select a.* into v_account
    from public.v_sale_accounts as a
    where a.sale_id = p_sale_id and a.business_id = v_business_id;
    if not found then
        perform private.raise_business_error('sale_not_found');
    end if;
    if v_account.status = 'voided' then
        perform private.raise_business_error('sale_voided', jsonb_build_object('folio', v_account.folio));
    end if;
    if v_account.balance = 0 then
        perform private.raise_business_error('no_balance', jsonb_build_object('folio', v_account.folio));
    end if;

    select c.* into v_customer from public.customers as c where c.id = v_account.customer_id;

    insert into public.notification_outbox (business_id, channel, template, recipient_e164, payload, status, sent_at)
    values (
        v_business_id, p_channel, 'payment_reminder', v_customer.phone_e164,
        jsonb_build_object(
            'sale_id', v_account.sale_id, 'folio', v_account.folio, 'customer_name', v_customer.name,
            'balance', v_account.balance, 'next_due_date', v_account.next_due_date,
            'next_due_amount', v_account.next_due_amount
        ),
        case when p_channel = 'whatsapp_link' then 'open' else 'pending' end,
        case when p_channel = 'whatsapp_link' then now() end
    )
    returning id into v_outbox_id;

    insert into public.reminders (business_id, sale_id, customer_id, channel, status, sent_by, outbox_id)
    values (v_business_id, v_account.sale_id, v_customer.id, p_channel, 'sent', auth.uid(), v_outbox_id)
    returning id into v_reminder_id;

    return jsonb_build_object(
        'status', 'ok',
        'reminder', jsonb_build_object('id', v_reminder_id, 'sale_id', v_account.sale_id, 'created_at', now())
    );
end;
$$;

-- Business name shown in the header, WhatsApp messages and exports (D-19).
create or replace function public.update_business(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
begin
    perform private.require_permission('business.configure');
    v_business_id := private.current_business_id();

    if length(trim(coalesce(p_name, ''))) not between 1 and 80 then
        perform private.raise_business_error('invalid_name');
    end if;

    update public.businesses set name = trim(p_name) where id = v_business_id;

    return jsonb_build_object(
        'status', 'ok',
        'business', (select jsonb_build_object('id', b.id, 'name', b.name) from public.businesses as b
                     where b.id = v_business_id)
    );
end;
$$;

-- Creates (p_id null) or edits a category. The prefix is set on creation only, so existing
-- product codes never change.
create or replace function public.save_category(
    p_name text,
    p_prefix text default null,
    p_active boolean default true,
    p_sort integer default null,
    p_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
    v_id uuid := p_id;
    v_prefix text := upper(trim(coalesce(p_prefix, '')));
begin
    perform private.require_permission('business.configure');
    v_business_id := private.current_business_id();

    if length(trim(coalesce(p_name, ''))) not between 2 and 40 then
        perform private.raise_business_error('invalid_name');
    end if;
    if exists (
        select 1 from public.categories
        where business_id = v_business_id and lower(name) = lower(trim(p_name)) and id is distinct from p_id
    ) then
        perform private.raise_business_error('name_taken');
    end if;

    if p_id is null then
        if v_prefix !~ '^[A-Z]{2,5}$' then
            perform private.raise_business_error('invalid_prefix');
        end if;
        if exists (select 1 from public.categories where business_id = v_business_id and prefix = v_prefix) then
            perform private.raise_business_error('prefix_taken');
        end if;
        insert into public.categories (business_id, name, prefix, active, sort)
        values (
            v_business_id, trim(p_name), v_prefix, coalesce(p_active, true),
            coalesce(p_sort, (select coalesce(max(sort), 0) + 1 from public.categories where business_id = v_business_id))
        )
        returning id into v_id;
    else
        update public.categories
        set name = trim(p_name), active = coalesce(p_active, active), sort = coalesce(p_sort, sort)
        where id = p_id and business_id = v_business_id;
        if not found then
            perform private.raise_business_error('category_required');
        end if;
    end if;

    return jsonb_build_object(
        'status', 'ok',
        'category', (select to_jsonb(c) - 'business_id' from public.categories as c where c.id = v_id)
    );
end;
$$;

create or replace function public.save_payment_method(
    p_name text,
    p_active boolean default true,
    p_sort integer default null,
    p_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_business_id uuid;
    v_id uuid := p_id;
begin
    perform private.require_permission('business.configure');
    v_business_id := private.current_business_id();

    if length(trim(coalesce(p_name, ''))) not between 2 and 40 then
        perform private.raise_business_error('invalid_name');
    end if;
    if exists (
        select 1 from public.payment_methods
        where business_id = v_business_id and lower(name) = lower(trim(p_name)) and id is distinct from p_id
    ) then
        perform private.raise_business_error('name_taken');
    end if;

    if p_id is null then
        insert into public.payment_methods (business_id, name, active, sort)
        values (
            v_business_id, trim(p_name), coalesce(p_active, true),
            coalesce(
                p_sort,
                (select coalesce(max(sort), 0) + 1 from public.payment_methods where business_id = v_business_id)
            )
        )
        returning id into v_id;
    else
        update public.payment_methods
        set name = trim(p_name), active = coalesce(p_active, active), sort = coalesce(p_sort, sort)
        where id = p_id and business_id = v_business_id;
        if not found then
            perform private.raise_business_error('payment_method_required');
        end if;
    end if;

    return jsonb_build_object(
        'status', 'ok',
        'payment_method', (select to_jsonb(m) - 'business_id' from public.payment_methods as m where m.id = v_id)
    );
end;
$$;

revoke execute on function public.record_reminder(uuid, text) from public, anon;
revoke execute on function public.update_business(text) from public, anon;
revoke execute on function public.save_category(text, text, boolean, integer, uuid) from public, anon;
revoke execute on function public.save_payment_method(text, boolean, integer, uuid) from public, anon;

grant execute on function public.record_reminder(uuid, text) to authenticated;
grant execute on function public.update_business(text) to authenticated;
grant execute on function public.save_category(text, text, boolean, integer, uuid) to authenticated;
grant execute on function public.save_payment_method(text, boolean, integer, uuid) to authenticated;
