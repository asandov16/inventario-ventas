# Agregar, cambiar o desactivar a una persona

La app no crea usuarios: en Perfil → Usuarios solo se ve la lista (F7-T10). Quien da soporte agrega personas desde Supabase con este procedimiento. Toma unos 5 minutos.

> Nunca escribas correos ni contraseñas en el repositorio, en un PR o en un chat. Se escriben solo en el panel de Supabase y la contraseña se le entrega a la persona en privado.

Usa el proyecto correcto: `inv-main` es producción; `inv-staging` es el de pruebas.

## Agregar a una persona

### 1. Crear su acceso

Supabase → proyecto → Authentication → Users → **Add user** → **Create new user**:

- **Email:** el correo de la persona.
- **Password:** una contraseña temporal de al menos 10 caracteres. Ella la cambia después en Perfil → Mi cuenta → Cambiar contraseña.
- Marca **Auto Confirm User**.

### 2. Darle su rol en el negocio

SQL Editor → nueva consulta:

```sql
select private.link_user('<correo de la persona>', '<rol>', '<nombre como se verá en la app>');
```

| Rol           | Código   | Puede                                                                                        |
| ------------- | -------- | -------------------------------------------------------------------------------------------- |
| Administrador | `admin`  | Todo: costos, ganancias, anular ventas, ingresar stock, configurar el negocio y ver usuarios |
| Vendedor      | `seller` | Vender, registrar clientes y abonos, enviar recordatorios y ver el inventario, sin costos    |

Ejemplo: `select private.link_user('<correo>', 'seller', 'María Solano');`

### 3. Probar

La persona entra en la app con su correo y la contraseña temporal, ve su nombre en Perfil y cambia la contraseña. Quien administra la ve en Perfil → Usuarios.

## Cambiar el rol

```sql
update public.profiles
set role_id = (
    select r.id from public.roles as r
    where r.code = '<admin o seller>' and r.business_id = public.profiles.business_id
)
where id = (select u.id from auth.users as u where lower(u.email) = lower('<correo>'));
```

## Desactivar a una persona

Nada se borra (RN-12): se desactiva. Deja de poder usar la app y sus ventas y abonos se conservan con su nombre.

```sql
update public.profiles
set active = false
where id = (select u.id from auth.users as u where lower(u.email) = lower('<correo>'));
```

Para volver a activarla, el mismo comando con `active = true`.

## Si algo falla

| Mensaje                                             | Qué hacer                                                                               |
| --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| "No Auth user with email"                           | El correo no coincide con el del paso 1; revísalo en Authentication → Users             |
| "Unknown role"                                      | El rol se escribe `admin` o `seller`, en minúsculas                                     |
| "duplicate key value violates unique constraint"    | La persona ya está vinculada; para cambiarle el rol usa "Cambiar el rol"                |
| "last_admin_required"                               | No se puede desactivar ni pasar a Vendedor al último Administrador; primero agrega otro |
| La persona entra y ve "Tu usuario está desactivado" | Su perfil está desactivado; actívalo con el comando de arriba                           |
