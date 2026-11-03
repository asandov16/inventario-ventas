-- Operator-only helpers to bootstrap a business and link Auth users to profiles.
-- They live in `private`: no API role can execute them; only the database owner
-- (SQL editor, seed, bootstrap script) can.

create or replace function private.create_business(p_name text)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
    v_business_id uuid;
    v_admin_role_id uuid;
    v_seller_role_id uuid;
begin
    insert into public.businesses (name) values (p_name) returning id into v_business_id;

    insert into public.roles (business_id, code, name)
    values (v_business_id, 'admin', 'Administrador')
    returning id into v_admin_role_id;

    insert into public.roles (business_id, code, name)
    values (v_business_id, 'seller', 'Vendedor')
    returning id into v_seller_role_id;

    -- Permission matrix from section 2.2 of the functional requirements.
    insert into public.role_permissions (role_id, permission_code)
    select v_admin_role_id, p.code from public.permissions as p;

    insert into public.role_permissions (role_id, permission_code)
    select v_seller_role_id, code
    from unnest(array[
        'sales.create', 'sales.read', 'customers.edit', 'payments.create',
        'reminders.send', 'inventory.read', 'dashboard.read'
    ]) as code;

    -- Initial catalogs (RF-INV-02, RN-14); editable later from Perfil → Negocio.
    insert into public.categories (business_id, name, prefix, sort) values
        (v_business_id, 'Perfumes', 'PER', 1),
        (v_business_id, 'Bisutería', 'BIS', 2);

    insert into public.payment_methods (business_id, name, sort) values
        (v_business_id, 'Efectivo', 1),
        (v_business_id, 'SINPE Móvil', 2),
        (v_business_id, 'Tarjeta', 3);

    return v_business_id;
end;
$$;

comment on function private.create_business(text) is
'Creates a business with admin/seller roles, default categories and payment methods.';

-- Links an existing Auth user (created in the Supabase dashboard) to a profile.
-- Used by the seed and by the create-user runbook (F7-T10).
create or replace function private.link_user(
    p_email text,
    p_role_code text,
    p_full_name text,
    p_business_id uuid default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_business_id uuid := p_business_id;
    v_role_id uuid;
begin
    select u.id into v_user_id from auth.users as u where lower(u.email) = lower(p_email);
    if v_user_id is null then
        raise exception 'No Auth user with email %', p_email;
    end if;

    if v_business_id is null then
        if (select count(*) from public.businesses) <> 1 then
            raise exception 'p_business_id is required when there is not exactly one business';
        end if;
        select b.id into v_business_id from public.businesses as b;
    end if;

    select r.id into v_role_id
    from public.roles as r
    where r.business_id = v_business_id and r.code = p_role_code;
    if v_role_id is null then
        raise exception 'Unknown role % for business %', p_role_code, v_business_id;
    end if;

    insert into public.profiles (id, business_id, full_name, role_id)
    values (v_user_id, v_business_id, p_full_name, v_role_id);

    return v_user_id;
end;
$$;

comment on function private.link_user(text, text, text, uuid) is
'Creates the profile for an existing Auth user with the given role.';
