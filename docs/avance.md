# Avance del proyecto

Bitácora de lo completado por etapa. Se actualiza al cerrar cada etapa, junto con la presentación de avance (privada, en claude.ai).

**Estado al 3 nov 2026:** 2 de 6 etapas completas. Siguiente: Etapa 2, App y Vender (espera visto bueno del plan).

| Etapa                   | Fases        | Estado       | Cierre     | PRs            |
| ----------------------- | ------------ | ------------ | ---------- | -------------- |
| **0 Fundaciones**       | F0           | ✅ Completa  | 3 nov 2026 | #1, #3, #4, #5 |
| **1 Núcleo de datos**   | F1 + F2      | ✅ Completa  | 3 nov 2026 | #6, #7, #8, #9 |
| **2 App y Vender**      | F3 + F4      | ⏭️ Siguiente | —          | —              |
| **3 Operación diaria**  | F6 + F5 + F7 | Pendiente    | —          | —              |
| **4 Producción y beta** | F8 + F9      | Pendiente    | —          | —              |
| **5 Sin conexión**      | F10          | Pendiente    | —          | —              |

## Etapa 0 — Fundaciones (3 nov 2026)

**Resultado:** el repositorio, las herramientas, las cuentas y el CI quedaron listos para construir.

- Repositorio público en GitHub con la regla `protect-main`: PR obligatorio, check `ci` requerido, historial lineal, sin force-push. Escaneo de secretos, protección al subir y Dependabot activos.
- Repositorio privado `inventario-backups` para los respaldos (ADR-021).
- Entornos `staging` y `production` (este último con revisor). Proyectos de Supabase `inv-staging` e `inv-prod`. Cuenta de Cloudflare con token de CI. 11 secretos configurados.
- Herramientas: pnpm con Node 24 fijado, ESLint con fronteras por capa, Prettier, sqlfluff, gitleaks y hooks de lefthook.
- `CLAUDE.md`, plan de implementación, glosario, runbook de cuentas y ADR-001 a ADR-030.
- Revisión del DoD aprobada; su corrección fue el PR #5 (`pnpm dev` levanta también Supabase local).

**Cambios respecto al plan:** el proyecto `inv-web` de Cloudflare se pospuso a la Etapa 4. Pages ahora es parte de Workers, y `wrangler` no lo crea desde la raíz del workspace. Necesitará un ADR en esa etapa.

## Etapa 1 — Núcleo de datos (3 nov 2026)

**Resultado:** el negocio se puede operar solo con llamadas a la base: vender de contado y a pagos, cobrar, anular, ingresar mercadería y cargar saldos anteriores.

| Entrega                 | PR  | Contenido                                                                                                       |
| ----------------------- | --- | --------------------------------------------------------------------------------------------------------------- |
| Modelo y seguridad (F1) | #6  | 20 tablas, roles y 16 permisos, RLS en todas, nada se borra, seed local y bootstrap de producción               |
| Ventas y cobros (F2)    | #7  | Cálculo de cuotas, clientes, `register_sale`, `register_payment`, `void_sale`, `register_legacy_balance`        |
| Inventario y lecturas   | #8  | Productos e ingresos, configuración, recordatorios, vistas de inicio, cobros y análisis, Realtime, concurrencia |
| Revisión del DoD        | #9  | Prueba de RN-13 y `pnpm db:test` independiente del orden                                                        |

- **Números:** 15 migraciones, 215 pruebas pgTAP en 16 archivos y 6 pruebas de concurrencia.
- **Reglas:** RN-01 a RN-18 cubiertas en la base con un caso feliz y uno de rechazo, salvo RN-17, que es de interfaz y pasa a la Etapa 2. Detalle en [la revisión del DoD](planes/etapa-1-revision-dod.md).
- **Decisiones nuevas:** ADR-031 a ADR-036.
- **Demo:** `pnpm db:demo`, un recorrido narrado de las reglas.

**Cambios respecto al plan:**

- Hay 20 tablas, no 19: los costos de cada ingreso van en una tabla aparte (`inventory_movement_costs`, ADR-036), para que el Vendedor no los vea.
- Dos solicitudes simultáneas con la misma llave fallaban en el índice único. Ahora se serializan con un bloqueo por llave (`private.lock_key`), y RN-18 queda cubierta también en paralelo.

## Pendientes conocidos

| Pendiente                                             | Cuándo                |
| ----------------------------------------------------- | --------------------- |
| Crear el proyecto `inv-web` en Cloudflare, con su ADR | Etapa 4               |
| Cambiar OrbStack por Docker Desktop (vence la prueba) | Antes del 2 dic 2026  |
| Alerta de Dependabot en `minimatch` (solo desarrollo) | Con la próxima ESLint |

## Cómo se actualiza

Al cerrar cada etapa, después de la revisión del DoD:

1. Agregar aquí la sección de la etapa: resultado, PRs, números y cambios respecto al plan. Actualizar la tabla de estado y los pendientes.
2. Actualizar la presentación de avance:
   - portada (fecha y etapas completas);
   - «Dónde estamos»;
   - la tarjeta de la etapa en «Hoja de ruta»;
   - una diapositiva nueva para la etapa;
   - «Pendientes y avisos»;
   - «Lo que sigue».
