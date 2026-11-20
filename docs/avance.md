# Avance del proyecto

Bitácora de lo completado por etapa. Se actualiza al cerrar cada etapa, junto con la presentación de avance (privada, en claude.ai).

**Estado al 20 nov 2026:** etapas 0 a 3 completas; la app ya se instaló y se probó en un celular sobre staging. Siguiente: Etapa 4, Producción y beta (espera visto bueno del plan).

| Etapa                   | Fases        | Estado       | Cierre      | PRs            |
| ----------------------- | ------------ | ------------ | ----------- | -------------- |
| **0 Fundaciones**       | F0           | ✅ Completa  | 3 nov 2026  | #1, #3, #4, #5 |
| **1 Núcleo de datos**   | F1 + F2      | ✅ Completa  | 3 nov 2026  | #6, #7, #8, #9 |
| **2 App y Vender**      | F3 + F4      | ✅ Completa  | 20 nov 2026 | #11–#18        |
| **3 Operación diaria**  | F6 + F5 + F7 | ✅ Completa  | 20 nov 2026 | #24–#34        |
| **4 Producción y beta** | F8 + F9      | ⏭️ Siguiente | —           | —              |
| **5 Sin conexión**      | F10          | Pendiente    | —           | —              |

## Etapa 0 — Fundaciones (3 nov 2026)

**Resultado:** el repositorio, las herramientas, las cuentas y el CI quedaron listos para construir.

- Repositorio público en GitHub con la regla `protect-main`: PR obligatorio, check `ci` requerido, historial lineal, sin force-push. Escaneo de secretos, protección al subir y Dependabot activos.
- Repositorio privado `inventario-backups` para los respaldos (ADR-021).
- Entornos `staging` y `production` (este último con revisor). Proyectos de Supabase `inv-staging` y, para producción, `inv-main`. Cuenta de Cloudflare con token de CI. 11 secretos configurados.
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

## Etapa 2 — App y Vender (20 nov 2026; código completo el 7 nov)

**Resultado:** una app instalable con las 6 secciones, sesión y permisos, y la pantalla Vender de punta a punta: de contado y a pagos, siempre con cliente.

| Entrega                  | PR            | Contenido                                                                                                               |
| ------------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Esqueleto de la app (F3) | #11           | 6 secciones que se deslizan, barra de pestañas, hojas que se cierran con Atrás, dinero, teléfono, fechas y cuotas en TS |
| Staging y vista previa   | #12, #17, #18 | Vista previa por PR y staging en cada merge (Cloudflare `inv-web-326`); migraciones por el pooler IPv4                  |
| Sesión y respuestas (F3) | #13           | Entrar y salir, perfil, permisos, toasts y diálogos, `useRpcMutation` con llave de idempotencia, errores en español     |
| PWA y E2E (F3)           | #14           | Instalable, aviso de versión nueva, "Sin conexión", pista de deslizar, Playwright en cada PR                            |
| Catálogo y carrito (F4)  | #15           | Tarjetas con "Quedan N", búsqueda sin tildes, categorías, carrito que no pasa el stock                                  |
| Cobro y cliente (F4)     | #16           | Buscador y cliente nuevo, plan de cuotas en vivo, registrar venta, posible duplicado, detalle con folio                 |

- **Números:** 138 pruebas unitarias, 17 E2E, 215 pgTAP y 6 de concurrencia. JavaScript de 192 KB comprimido.
- **Decisiones nuevas:** ADR-037 a ADR-042.
- **Detalle:** [la revisión del DoD](planes/etapa-2-revision-dod.md).

**Cambios respecto al plan:**

- El proyecto de Cloudflare se creó en esta etapa, adelantado de la Etapa 4. Su subdominio es `inv-web-326` porque `inv-web` estaba tomado.
- El keep-alive (F8-T07) se adelantó porque Supabase avisó que pausaría producción (ADR-042).
- El proyecto de producción en Supabase se llama `inv-main`, no `inv-prod`.

## Etapa 3 — Operación diaria (20 nov 2026; código completo el 19 nov)

**Resultado:** las seis secciones funcionan con datos reales: inventario, historial con anulación, cobros con recordatorio por WhatsApp, Inicio en tiempo real entre celulares, Perfil con la configuración del negocio, respaldo en Excel y carga de las deudas del cuaderno.

| Entrega                       | PR       | Contenido                                                                                                        |
| ----------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| Lecturas nuevas               | #24      | Detalle de venta y de producto, últimos ingresos, actividad, usuarios y catálogos; el recordatorio entra al feed |
| Inventario (F6)               | #25, #26 | Lista, totales y detalle con movimientos; agregar stock, producto nuevo, editar, conteo físico, desactivar       |
| Historial y anulación (F5)    | #28      | Ventas por día, filtros, búsqueda sin tildes, carga por páginas, detalle de venta y anular con motivo            |
| Por cobrar (F5)               | #29      | Cuentas pendientes y liquidadas, abono con monto sugerido, recordatorio por WhatsApp con confirmación            |
| Inicio y tiempo real (F7)     | #30      | Saludo, cuatro números, actividad, estado, análisis 7/30 días, contadores rojos y Realtime por negocio           |
| Perfil (F7)                   | #32      | Mi cuenta (permisos en palabras, mis ventas, contraseña), Negocio (nombre, categorías, métodos), Usuarios        |
| Datos y corrida nocturna (F7) | #34      | Respaldo `.xlsx` de 7 hojas, Cargar saldo anterior, corrida nocturna en Chromium y WebKit, arreglo a 360 px      |

- **Números:** 202 pruebas unitarias, 44 E2E, 251 pgTAP en 18 archivos y 6 de concurrencia. JavaScript de 226 KB comprimido.
- **Decisiones nuevas:** ninguna; la etapa siguió los ADR existentes.
- **Detalle:** [la revisión del DoD](planes/etapa-3-revision-dod.md).

**Cambios respecto al plan:**

- Fueron 8 PRs de código, no 7: Perfil se partió en dos (#32 y #34).
- El respaldo tiene 7 hojas: se agregó **Cuotas**.
- Una migración extra para buscar ventas sin tildes (`customer_search`).
- La primera corrida nocturna falló una prueba en WebKit (CU-11); se corrigió en #35 y la corrida nocturna del 20 nov pasó en Chromium y WebKit.

**Cierre:** Prueba en el celular hecha el 20 nov 2026 por la persona dueña, sobre staging: instalación y todos los flujos (vender de contado y a pagos, abono, recordatorio, ingreso de stock, anulación, saldo anterior y respaldo). Cierra también la Etapa 2. Dejó dos detalles de interfaz, anotados abajo.

## Pendientes conocidos

| Pendiente                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Cuándo                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Cambiar OrbStack por Docker Desktop (vence la prueba)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Antes del 2 dic 2026                                                                                      |
| Alertas de Dependabot: `minimatch` (ESLint), `glob` y `deepmerge` (`workbox-build`); ninguna llega a la app                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Con versiones nuevas de esas herramientas                                                                 |
| **Editar un cliente desde la app.** Hoy, si se registra un cliente con un dato mal (lo común: un error en el teléfono), no hay forma de corregirlo: el cliente queda así y el recordatorio por WhatsApp va al número equivocado. La base ya tiene `update_customer` (F2-T04, permiso `customers.edit`, que también tiene el Vendedor) con aviso si el teléfono nuevo ya es de otro cliente; falta la pantalla. Por decidir: dónde se edita (sugerido: un botón **Editar cliente** en la hoja de la venta y en la cuenta de Por cobrar) y si queda registro del cambio en la actividad        | Por decidir; sugerido antes de la beta (F9), cuando entren clientes reales                                |
| **Campos que se salen de la pantalla en el celular.** En Inventario → Agregar stock, el campo **Costo unitario** (al lado de **Cantidad**) se sale por la derecha. Causa: las filas de dos columnas usan `grid-template-columns: 1fr 1fr`, y una columna no se encoge por debajo del ancho mínimo de un `<input>` (unos 20 caracteres). Arreglo: `repeat(2, minmax(0, 1fr))`. El mismo patrón está en Editar producto, los filtros de fecha de Historial, Por cobrar, Perfil, el detalle de la venta, el selector de cliente y los diálogos: revisarlos todos en un celular angosto (360 px) | ✅ Arreglado en la Etapa 3 (#34): siete hojas de estilo cambiadas y una prueba E2E a 360 px que lo vigila |
| **Montos rápidos del abono sin marca de elegido.** En Registrar abono (desde Historial o Por cobrar), los botones de monto rápido (**Cuota**, **Todo**) llenan el campo, pero no queda marcado cuál se tocó. Arreglo sugerido: el botón cuyo monto coincide con el del campo se ve elegido (`aria-pressed` y el estilo de chip activo); si se escribe otro monto, ninguno queda marcado                                                                                                                                                                                                      | Detalle menor; antes de la beta (F9)                                                                      |
| **Campo «Fecha de la compra» desalineado en el celular.** En Perfil → Datos → Cargar saldo anterior, el campo de fecha no se alinea con los demás en la versión móvil (visto en la prueba del 20 nov). Es un `<input type="date">`: el navegador del celular le da su propio alto, ancho y alineación. Arreglo sugerido: en `TextField.module.css`, igualar alto, ancho y alineación del texto para los campos de fecha (también el de «Primera cuota vence el») y revisarlo en Android y iPhone                                                                                             | Detalle menor; antes de la beta (F9)                                                                      |

## Cómo se actualiza

Al cerrar cada etapa, después de la revisión del DoD:

1. Actualizar el «Punto actual» al inicio de `docs/roadmap.md`. Agregar aquí la sección de la etapa: resultado, PRs, números y cambios respecto al plan. Actualizar la tabla de estado y los pendientes.
2. Actualizar la presentación de avance:
   - portada (fecha y etapas completas);
   - «Dónde estamos»;
   - la tarjeta de la etapa en «Hoja de ruta»;
   - una diapositiva nueva para la etapa;
   - «Pendientes y avisos»;
   - «Lo que sigue».
