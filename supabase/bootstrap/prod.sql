-- One-time production bootstrap (F1-T10, F9-T07). Run once from the Supabase SQL editor
-- after the migrations are applied. Creates the business with its admin/seller roles,
-- default categories and payment methods. No users and no brand: the real business name
-- is set later from Perfil → Negocio (D-19), and users are linked with private.link_user.

do $$
begin
    if exists (select 1 from public.businesses) then
        raise exception 'A business already exists; bootstrap must run only once';
    end if;

    perform private.create_business('Mi Negocio');
end;
$$;
