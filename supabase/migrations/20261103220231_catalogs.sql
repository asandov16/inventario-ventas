-- Configurable catalogs (RF-INV-02, RN-14) and customers (RN-01, CU-03).

create table public.categories (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses (id),
    name text not null check (length(trim(name)) between 2 and 40),
    -- Product codes are <prefix>-<seq>, e.g. PER-007 (RF-INV-01).
    prefix text not null check (prefix ~ '^[A-Z]{2,5}$'),
    last_seq integer not null default 0 check (last_seq >= 0),
    active boolean not null default true,
    sort integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (business_id, prefix)
);

-- Case-insensitive uniqueness needs an expression index (ADR-025).
create unique index categories_business_name_key
on public.categories (business_id, lower(name));

create table public.payment_methods (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses (id),
    name text not null check (length(trim(name)) between 2 and 40),
    active boolean not null default true,
    sort integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index payment_methods_business_name_key
on public.payment_methods (business_id, lower(name));

create table public.customers (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses (id),
    name text not null check (length(trim(name)) between 2 and 80),
    -- Stored as E.164 for WhatsApp; shown as 8811-2233 in the UI.
    phone_e164 text not null check (phone_e164 ~ '^\+506[0-9]{8}$'),
    email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    zone text,
    notes text,
    -- Ley 8968 consent to receive WhatsApp messages (RNF-06).
    whatsapp_opt_in boolean not null default false,
    whatsapp_opt_in_at timestamptz,
    created_by uuid references public.profiles (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- One phone identifies one customer (RN-01).
    unique (business_id, phone_e164),
    check (whatsapp_opt_in = (whatsapp_opt_in_at is not null))
);
