-- Test helpers (ADR-035). This file is NOT wrapped in a transaction on purpose:
-- the helpers must persist for the other test files. They only ever exist in the
-- local/CI test database, never in a migration.

create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

-- Act as a signed-in user, exactly as PostgREST does for a request with that JWT.
create or replace function tests.authenticate_as(p_email text)
returns void
language plpgsql
as $$
declare
    v_user_id uuid;
begin
    select id into v_user_id from auth.users where email = p_email;
    if v_user_id is null then
        raise exception 'tests.authenticate_as: no user %', p_email;
    end if;
    perform set_config('request.jwt.claims',
        jsonb_build_object('sub', v_user_id, 'role', 'authenticated', 'email', p_email)::text, true);
    perform set_config('request.jwt.claim.sub', v_user_id::text, true);
    execute 'set local role authenticated';
end;
$$;

-- Act as an anonymous request (no session).
create or replace function tests.authenticate_as_anon()
returns void
language plpgsql
as $$
begin
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    perform set_config('request.jwt.claim.sub', '', true);
    execute 'set local role anon';
end;
$$;

create or replace function tests.clear_authentication()
returns void
language plpgsql
as $$
begin
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
    execute 'reset role';
end;
$$;

-- Creates an Auth user and links it to a business with the given role. Returns the user id.
create or replace function tests.create_user(p_email text, p_role_code text, p_business_id uuid)
returns uuid
language plpgsql
as $$
declare
    v_user_id uuid := gen_random_uuid();
begin
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
        p_email, '', now(), '{}', '{}', now(), now());
    perform private.link_user(p_email, p_role_code, 'Usuario de prueba', p_business_id);
    return v_user_id;
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;

select plan(1);
select pass('test helpers installed');
select * from finish();
