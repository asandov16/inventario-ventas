# Inventario y Ventas

App web instalable (PWA) para que un negocio familiar registre ventas de contado y a pagos, cobre cuotas y controle su inventario desde el celular o la computadora.

| Pieza                  | Tecnología                                     |
| ---------------------- | ---------------------------------------------- |
| Interfaz               | React + TypeScript + Vite, en Cloudflare Pages |
| Datos, reglas y sesión | Supabase: PostgreSQL, Auth, Realtime           |
| CI/CD                  | GitHub Actions                                 |

## Documentación

| Documento                                                        | Para qué                                        |
| ---------------------------------------------------------------- | ----------------------------------------------- |
| [Plan de implementación](docs/plan-implementacion.md)            | Etapas, arquitectura, convenciones              |
| [Roadmap](docs/roadmap.md)                                       | Tareas por fase, con su avance                  |
| [Requerimientos funcionales](docs/requerimientos-funcionales.md) | Qué hace el sistema                             |
| [Requerimientos técnicos](docs/requerimientos-tecnicos.md)       | Cómo se construye                               |
| [Decisiones (ADR)](docs/decisiones/README.md)                    | Por qué se eligió cada cosa                     |
| [Glosario](docs/glosario.md)                                     | Términos del negocio y sus nombres en el código |
| [Configurar cuentas](docs/runbooks/configurar-cuentas.md)        | GitHub, Supabase y Cloudflare                   |

## Cómo levantar el proyecto

Requisitos: [nvm](https://github.com/nvm-sh/nvm), Git, `gitleaks` y, para la base local, Docker (OrbStack o Docker Desktop).

```bash
nvm install && corepack enable   # Node 24 y pnpm
pnpm install                     # dependencias y hooks de git
cp .env.example web/.env.local   # valores locales, nunca se suben
pnpm dev                         # Supabase local + http://localhost:5173 (requiere Docker)
pnpm dev:web                     # solo la interfaz, sin base de datos
```

Antes de cada commit: `pnpm check`.

## Seguridad

Este repositorio es público: nunca contiene secretos ni datos reales. Ver [SECURITY.md](SECURITY.md).
