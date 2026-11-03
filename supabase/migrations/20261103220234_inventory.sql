-- Products, their costs (admin-only) and the stock ledger (RN-02, RN-10, RN-11).

create table public.products (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses (id),
    code text not null,
    name text not null check (length(trim(name)) between 2 and 80),
    category_id uuid not null references public.categories (id),
    price integer not null check (price > 0),
    stock integer not null default 0 check (stock >= 0),
    min_stock integer not null default 0 check (min_stock >= 0),
    active boolean not null default true,
    -- Optimistic locking for concurrent edits (CU-11).
    version integer not null default 1 check (version >= 1),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (business_id, code)
);

-- Kept apart from products so that a seller can never read costs (D-11).
create table public.product_costs (
    product_id uuid primary key references public.products (id),
    unit_cost integer not null check (unit_cost >= 0),
    updated_by uuid references public.profiles (id),
    updated_at timestamptz not null default now()
);

-- Stock ledger: every change of stock has exactly one movement. Never deleted.
create table public.inventory_movements (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses (id),
    product_id uuid not null references public.products (id),
    type text not null check (type in ('initial', 'restock', 'sale', 'void', 'adjustment')),
    qty_delta integer not null check (qty_delta <> 0),
    stock_after integer not null check (stock_after >= 0),
    -- sale_id foreign key is added in the sales migration.
    sale_id uuid,
    reason text,
    idempotency_key uuid unique,
    created_by uuid references public.profiles (id),
    created_at timestamptz not null default now(),
    check ((type in ('sale', 'void')) = (sale_id is not null))
);

-- Unit cost paid in a restock, separated from the ledger so sellers never see it (ADR-036).
create table public.inventory_movement_costs (
    movement_id uuid primary key references public.inventory_movements (id),
    unit_cost integer not null check (unit_cost >= 0)
);
