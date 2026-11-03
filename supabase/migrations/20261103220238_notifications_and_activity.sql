-- Collection reminders, the notification outbox (WhatsApp phases 0-2) and the activity log.

create table public.notification_outbox (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses (id),
    channel text not null check (channel in ('whatsapp_link', 'whatsapp_api')),
    template text not null,
    recipient_e164 text not null check (recipient_e164 ~ '^\+506[0-9]{8}$'),
    payload jsonb not null default '{}'::jsonb,
    -- open: wa.me link opened by a person (phase 0); pending/sent/failed: API delivery (phase 1).
    status text not null check (status in ('open', 'pending', 'sent', 'failed')),
    attempts integer not null default 0 check (attempts >= 0),
    last_error text,
    sent_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.reminders (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses (id),
    sale_id uuid not null references public.sales (id),
    customer_id uuid not null references public.customers (id),
    channel text not null check (channel in ('whatsapp_link', 'whatsapp_api')),
    status text not null default 'sent' check (status in ('sent', 'failed')),
    sent_by uuid references public.profiles (id),
    outbox_id uuid references public.notification_outbox (id),
    created_at timestamptz not null default now()
);

-- Who did what and when (RN-12, RNF-08). Filled by triggers; the UI builds the
-- Spanish sentence from `type` and `data`, so no user-facing text is stored here.
create table public.activity_log (
    id bigint generated always as identity primary key,
    business_id uuid not null references public.businesses (id),
    actor_id uuid references public.profiles (id),
    type text not null check (
        type in (
            'sale', 'legacy_balance', 'payment', 'void', 'restock', 'adjustment',
            'product_created', 'customer_created'
        )
    ),
    entity text not null check (entity in ('sale', 'product', 'customer')),
    entity_id uuid not null,
    amount integer,
    data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);
