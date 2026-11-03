# Seguridad

## Reportar una vulnerabilidad

No abras un issue público. Usa **Security → Report a vulnerability** en este repositorio (reporte privado de GitHub). Respondemos en un máximo de 7 días.

## Qué protege este repositorio

- El código es público; la seguridad depende de las políticas RLS de PostgreSQL y de los secretos, que nunca se versionan.
- La clave pública de Supabase que usa el navegador es pública por diseño: solo permite lo que RLS y las funciones con permiso autorizan.
- `gitleaks` revisa cada commit y cada PR; GitHub _push protection_ bloquea secretos conocidos.
- Los respaldos de la base viven cifrados en un repositorio privado aparte.

## Si se publica un secreto

1. Rotarlo de inmediato en el servicio de origen (Supabase, Cloudflare, GitHub).
2. Revisar los registros de acceso del servicio.
3. Recién después, limpiar el historial si hace falta. Borrar el commit no basta: el secreto ya se considera comprometido.
