-- Schemas, extensions and generic trigger helpers.
-- The `private` schema holds helpers that are never exposed through the Data API.

create schema if not exists private;
revoke all on schema private from public;

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- unaccent() is STABLE, so it cannot back an expression index. This wrapper pins
-- the dictionary, which makes the result deterministic and safe to mark IMMUTABLE.
create or replace function private.immutable_unaccent(p_text text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
    select extensions.unaccent('extensions.unaccent'::regdictionary, p_text);
$$;

-- Normalized text for accent- and case-insensitive search ("Jiménez" ~ "jimenez").
create or replace function private.search_text(p_text text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
    select lower(private.immutable_unaccent(p_text));
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

-- RN-12: nothing is ever deleted. Fires for every role, including postgres.
create or replace function private.prevent_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    raise exception using
        errcode = 'P0001',
        message = 'delete_not_allowed',
        detail = jsonb_build_object('table', tg_table_name)::text;
end;
$$;

-- Append-only records (payments, movements, activity...) can never change.
create or replace function private.prevent_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    raise exception using
        errcode = 'P0001',
        message = 'immutable_record',
        detail = jsonb_build_object('table', tg_table_name)::text;
end;
$$;
