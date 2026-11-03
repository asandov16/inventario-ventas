-- Sales, their lines, installment plans and payments (RN-01, RN-03..RN-09, RN-15, RN-16, RN-18).

create table public.sales (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses (id),
    folio integer not null check (folio > 0),
    customer_id uuid not null references public.customers (id),
    seller_id uuid not null references public.profiles (id),
    type text not null check (type in ('cash', 'installments')),
    total integer not null check (total > 0),
    months smallint,
    down_payment integer not null default 0,
    payment_method_id uuid references public.payment_methods (id),
    source text not null default 'app' check (source in ('app', 'legacy_import')),
    -- Description of what was sold, for balances copied from the paper notebook (D-12).
    description text,
    idempotency_key uuid not null unique,
    -- When the sale really happened, which can differ from created_at when offline (D-05).
    client_created_at timestamptz not null default now(),
    voided_at timestamptz,
    voided_by uuid references public.profiles (id),
    void_reason text,
    created_at timestamptz not null default now(),
    unique (business_id, folio),
    check (source = 'app' or description is not null),
    check (
        (type = 'cash' and months is null and down_payment = 0)
        or (type = 'installments' and months between 1 and 3 and down_payment >= 0 and down_payment < total)
    ),
    check ((voided_at is null) = (void_reason is null) and (voided_at is null) = (voided_by is null))
);

alter table public.inventory_movements
add constraint inventory_movements_sale_id_fkey foreign key (sale_id) references public.sales (id);

create table public.sale_items (
    id uuid primary key default gen_random_uuid(),
    sale_id uuid not null references public.sales (id),
    product_id uuid not null references public.products (id),
    -- Copies taken at sale time: later edits never change past sales (RN-16).
    product_name text not null,
    qty integer not null check (qty > 0),
    unit_price integer not null check (unit_price > 0),
    created_at timestamptz not null default now(),
    unique (sale_id, product_id)
);

create table public.sale_item_costs (
    sale_item_id uuid primary key references public.sale_items (id),
    unit_cost integer not null check (unit_cost >= 0)
);

create table public.installments (
    id uuid primary key default gen_random_uuid(),
    sale_id uuid not null references public.sales (id),
    number smallint not null check (number between 1 and 3),
    due_date date not null,
    amount integer not null check (amount > 0),
    unique (sale_id, number)
);

create table public.payments (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses (id),
    sale_id uuid not null references public.sales (id),
    -- cash: full payment of a cash sale; down_payment: prima; payment: abono;
    -- legacy: already paid before the system existed (D-12).
    kind text not null check (kind in ('cash', 'down_payment', 'payment', 'legacy')),
    amount integer not null check (amount > 0),
    payment_method_id uuid references public.payment_methods (id),
    received_by uuid not null references public.profiles (id),
    client_created_at timestamptz not null default now(),
    idempotency_key uuid unique,
    created_at timestamptz not null default now(),
    check (kind = 'legacy' or payment_method_id is not null)
);
