-- Tenancy, roles and permissions (RF-ROL-01..03).
-- Every business table carries business_id from day one so more branches or
-- businesses can be added without migrating data.

create table public.businesses (
    id uuid primary key default gen_random_uuid(),
    name text not null check (length(trim(name)) between 1 and 80),
    timezone text not null default 'America/Costa_Rica',
    -- RN-15: consecutive folio counter, taken with a row lock inside register_sale.
    last_folio integer not null default 1000 check (last_folio >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.businesses is 'A business (tenant). The name is editable and never hard-coded (D-19).';

-- Global catalog of permission codes; roles get permissions by ticking codes (RF-ROL-03).
create table public.permissions (
    code text primary key check (code ~ '^[a-z_]+\.[a-z_]+$'),
    description text not null
);

create table public.roles (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses (id),
    code text not null check (code ~ '^[a-z_]+$'),
    name text not null,
    created_at timestamptz not null default now(),
    unique (business_id, code)
);

create table public.role_permissions (
    role_id uuid not null references public.roles (id),
    permission_code text not null references public.permissions (code),
    primary key (role_id, permission_code)
);

create table public.profiles (
    id uuid primary key references auth.users (id),
    business_id uuid not null references public.businesses (id),
    full_name text not null check (length(trim(full_name)) >= 2),
    phone_e164 text check (phone_e164 ~ '^\+506[0-9]{8}$'),
    role_id uuid not null references public.roles (id),
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.profiles is
'Application user linked 1:1 to auth.users. Inactive users see nothing (RF-ROL-02).';

insert into public.permissions (code, description) values
('sales.create', 'Registrar ventas de contado y a pagos'),
('sales.read', 'Ver historial y detalle de ventas'),
('sales.void', 'Anular ventas'),
('customers.edit', 'Registrar y editar clientes'),
('payments.create', 'Registrar abonos'),
('reminders.send', 'Enviar recordatorios de cobro'),
('inventory.read', 'Ver inventario y movimientos'),
('inventory.restock', 'Ingresar stock y crear productos'),
('products.edit', 'Editar precios, costos, mínimos y conteo'),
('costs.read', 'Ver costos'),
('dashboard.read', 'Ver tablero: actividad y alertas'),
('analytics.profit', 'Ver ganancia y margen'),
('users.admin', 'Administrar usuarios y roles'),
('business.configure', 'Configurar datos del negocio'),
('data.export', 'Exportar respaldo de datos'),
('legacy_balances.import', 'Cargar saldos anteriores al sistema');
