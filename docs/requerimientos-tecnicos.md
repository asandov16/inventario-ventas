# Requerimientos Técnicos — Tech Stack (v1)

> **Copia de referencia** del documento fuente (2 nov 2026), sin datos que identifiquen al negocio.
> Ajustes vigentes: nombres de código en inglés (`docs/glosario.md`) y correcciones en `docs/decisiones/`.
> Donde este documento y un ADR difieran, manda el ADR.

## 1. Resumen

Recomendación: una PWA estática (React + TypeScript + Vite) hospedada en Cloudflare Pages, conectada a Supabase (PostgreSQL + Auth + Realtime + Edge Functions), con la lógica de negocio dentro de PostgreSQL y CI/CD en GitHub Actions. Todo cabe en planes gratuitos hoy, y cada pieza tiene un camino de salida estándar si el negocio crece.

La decisión de fondo es poner las reglas de negocio (RN-01 a RN-18) en funciones SQL y políticas de seguridad de Postgres, no en un servidor propio. Así no hay backend que mantener, la integridad no depende del celular de nadie, y la base de datos se puede mover a otro proveedor de Postgres sin reescribir la lógica.

| Capa                        | Elección                                                 | Por qué                                                                 | Costo hoy |
| --------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- | --------- |
| Interfaz                    | React + TypeScript + Vite, instalable como PWA           | Sitio estático; ecosistema y talento más amplios para crecer            | $0        |
| Estado y red en el cliente  | TanStack Query + Zod                                     | Caché, reintentos y mutaciones con llave de idempotencia (RN-17, RN-18) | $0        |
| Hospedaje del frontend      | Cloudflare Pages                                         | Solicitudes estáticas ilimitadas y CDN global                           | $0        |
| Base de datos               | Supabase PostgreSQL                                      | Postgres real, como se pidió; 500 MB en plan gratuito                   | $0        |
| API                         | PostgREST de Supabase + funciones SQL (RPC)              | Sin servidor propio; cada operación es una transacción                  | $0        |
| Inicio de sesión y roles    | Supabase Auth + Row Level Security + tabla rol × permiso | Cumple RF-ROL-01 a 03 dentro de la base                                 | $0        |
| Tiempo real                 | Supabase Realtime                                        | Todos ven lo mismo al mismo tiempo (RNF-04)                             | $0        |
| Tareas y webhooks           | Supabase Edge Functions + pg_cron                        | Recordatorios y WhatsApp a futuro                                       | $0        |
| Mantener activo y monitoreo | Cloudflare Worker con Cron Trigger                       | Evita la pausa por inactividad y vigila la salud                        | $0        |
| Respaldos                   | GitHub Actions: pg_dump cifrado cada noche               | El plan gratuito de Supabase no incluye respaldos                       | $0        |
| CI/CD y pruebas             | GitHub Actions; Vitest, pgTAP, Playwright                | Unit, integración y e2e por capas                                       | $0        |
| Migraciones                 | Supabase CLI (SQL versionado en el repositorio)          | Portables a cualquier Postgres                                          | $0        |

Riesgo principal: el plan gratuito de Supabase se pausa tras una semana sin actividad y no trae respaldos. Ambos se cubren con automatizaciones gratuitas (secciones 6 y 9). El primer gasto recomendado, cuando haya presupuesto, es Supabase Pro a $25 por mes.

## 2. Restricciones y principios

El stack se eligió contra siete restricciones del negocio y los requerimientos no funcionales (RNF) del documento funcional.

| Restricción                                                    | Origen        | Consecuencia técnica                                              |
| -------------------------------------------------------------- | ------------- | ----------------------------------------------------------------- |
| Presupuesto de infraestructura $0                              | Negocio       | Solo planes gratuitos permanentes, sin tarjeta cuando sea posible |
| Sitio estático + base de datos                                 | Negocio       | SPA sin servidor propio; la API la expone la base de datos        |
| PostgreSQL preferido                                           | Negocio       | Supabase o Neon; nada de bases NoSQL ni SQLite                    |
| Capacidad inicial: 10 usuarios, 2 000 productos, 50 000 ventas | RNF-10        | Volumen pequeño: el límite real es el plan gratuito, no Postgres  |
| Pantallas en menos de 2 s con 4G                               | RNF-02        | Archivos estáticos en CDN; una sola llamada por acción            |
| Respaldo diario, nada se pierde                                | RNF-07, RN-12 | Respaldo externo propio; registros que no se borran               |
| Bajo mantenimiento                                             | RNF-09        | Pocas piezas, todo como código, despliegue automático             |

Principios de diseño:

1. **La base de datos es la autoridad.** Cuotas, saldos, stock y permisos se validan en Postgres. El frontend solo muestra y pide.
2. **Una acción, una transacción.** Registrar una venta descuenta stock, crea el plan de cuotas y anota la actividad en una sola llamada que se guarda completa o no se guarda.
3. **Portabilidad sobre comodidad.** SQL estándar en migraciones versionadas; nada que solo funcione en un proveedor.
4. **Gratis con salida.** Cada servicio gratuito tiene un plan pago o un reemplazo identificado (sección 9).

## 3. Arquitectura

El navegador solo habla con Supabase; Cloudflare y GitHub Actions automatizan el despliegue, la salud y los respaldos, y WhatsApp se conecta después a través de Edge Functions.

_[Diagrama no exportado]_

La línea punteada marca lo que llega en fases futuras con costo por mensaje.

## 4. Capa de datos: PostgreSQL

El modelo tiene 17 tablas derivadas del prototipo v2 y de los casos de uso; todas llevan `business_id` desde el día uno para poder sumar sucursales o negocios sin migrar datos. Los montos se guardan como enteros en colones (RN-13) y nada se borra (RN-12): se marca, se anula o se ajusta.

| Tabla                                      | Qué guarda                                                                            | Reglas que protege en la base                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `businesses`                               | Nombre del negocio y configuración                                                    | Base para varias sucursales a futuro                           |
| `profiles`                                 | Usuario: nombre, teléfono, rol, activo (ligado a Supabase Auth)                       | Usuario desactivado no entra; al menos un administrador activo |
| `roles`, `permissions`, `role_permissions` | Matriz rol × función                                                                  | RF-ROL-03: rol nuevo sin programar                             |
| `customers`                                | Nombre, teléfono, correo, zona, notas, consentimiento de WhatsApp                     | RN-01; teléfono único por negocio                              |
| `categories`, `payment_methods`            | Catálogos configurables                                                               | RF-INV-02, RN-14                                               |
| `products`                                 | Código, nombre, categoría, precio, stock, mínimo, activo, versión                     | `CHECK (stock >= 0)`, RN-02, RN-10                             |
| `product_costs`                            | Costo vigente de cada producto                                                        | Separado para que el Vendedor no lo pueda leer                 |
| `inventory_movements`                      | Ingresos, ventas, anulaciones y ajustes de conteo                                     | Bitácora del stock, nunca se borra                             |
| `sales`                                    | Folio, cliente, vendedor, tipo, total, plazo, prima, anulación, llave de idempotencia | RN-01, RN-05, RN-09, RN-15, RN-18                              |
| `sale_items`                               | Producto, cantidad, precio y costo de ese día                                         | RN-16: precio al momento                                       |
| `installments`                             | Cuotas: número, vencimiento, monto                                                    | RN-03, RN-04                                                   |
| `payments`                                 | Prima y abonos: monto, método, quién cobró, llave de idempotencia                     | RN-06, RN-18                                                   |
| `reminders`                                | Recordatorios enviados: canal, quién, cuándo, estado                                  | CU-07, RF-COB-04                                               |
| `activity_log`                             | Quién hizo qué y cuándo, llenada por triggers                                         | RN-12, RNF-08, Inicio → Actividad                              |

Las operaciones que cambian datos son funciones SQL llamadas por RPC, nunca escrituras sueltas desde el navegador:

| Función                                              | Caso de uso   | Qué hace en una sola transacción                                                          |
| ---------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------- |
| `registrar_venta`                                    | CU-01, CU-02  | Valida cliente y stock, toma folio, descuenta stock, crea cuotas y prima, anota actividad |
| `registrar_abono`                                    | CU-06         | Valida saldo, aplica a la cuota más antigua, marca liquidada si llega a ₡0                |
| `anular_venta`                                       | CU-05         | Solo si no está anulada; devuelve stock; exige motivo                                     |
| `ingresar_stock`, `crear_producto`, `ajustar_conteo` | CU-09 a CU-11 | Mueven stock y dejan el movimiento en la bitácora                                         |
| `crear_usuario`, `cambiar_rol`                       | CU-15         | Edge Function con clave de servicio; protege al último administrador                      |

El cálculo de cuotas (RN-04) vive en SQL como fuente de verdad y en TypeScript solo para la vista previa; ambos se prueban con la misma tabla de casos (sección 8). Saldos, cuotas vencidas y alertas se calculan con vistas, no se guardan, para que nunca queden desalineados.

Volumen estimado (aproximado, a validar con datos reales): 50 000 ventas con sus líneas, pagos y actividad ocupan del orden de 100 a 200 MB con índices, dentro de los 500 MB del plan gratuito de Supabase.

## 5. Concurrencia y escalabilidad

Con 10 usuarios el riesgo no es la carga sino los choques: dos personas vendiendo la última unidad o registrando el mismo abono. Cada choque tiene una defensa dentro de la base de datos.

| Situación concurrente                          | Defensa                                                                                                                  | Regla |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----- |
| Dos ventas de la última unidad al mismo tiempo | `UPDATE products SET stock = stock - n WHERE id = ? AND stock >= n`; si no afecta filas, la venta se rechaza completa    | RN-02 |
| Doble toque o reintento por mala señal         | Llave de idempotencia (UUID generado en el celular) con restricción `UNIQUE`; el reintento devuelve la venta ya guardada | RN-18 |
| Posible duplicado en 10 minutos                | La función detecta y devuelve "posible duplicado"; el frontend pide confirmar                                            | RN-18 |
| Dos administradores anulan la misma venta      | `UPDATE … WHERE voided_at IS NULL`; el segundo recibe "ya fue anulada por …"                                             | CU-05 |
| Folio consecutivo sin repetir                  | Contador por negocio tomado con bloqueo de fila dentro de la transacción; sin huecos                                     | RN-15 |
| Edición simultánea de un producto              | Columna `version` (bloqueo optimista); el segundo ve "cambió mientras editabas"                                          | CU-11 |
| Mismo cliente creado en dos celulares          | `UNIQUE (business_id, phone)`; se ofrece el cliente existente                                                            | CU-03 |

Cómo escala cada capa:

- **Frontend:** archivos estáticos en la CDN de Cloudflare; no hay servidor que saturar.
- **API:** el navegador habla HTTP con PostgREST, que usa un pool de conexiones. Ningún cliente abre conexiones directas a Postgres.
- **Lecturas:** paginación por cursor, índices en `(business_id, created_at)`, `customer_id`, `phone` y cuotas por vencimiento. Cuando el análisis crezca, vistas materializadas refrescadas por pg_cron.
- **Tiempo real:** Realtime avisa cambios a los demás dispositivos para refrescar contadores y listas, sin recargar la página.
- **Crecimiento:** varias sucursales se agregan con `business_id` y políticas por negocio ya existentes. Funcionar sin internet (pregunta abierta del documento funcional) cabe después gracias a las llaves de idempotencia, que permiten encolar ventas y enviarlas al volver la señal.

El techo práctico lo ponen los planes gratuitos (500 MB de base de datos, 5 GB de transferencia al mes en Supabase), no Postgres. Al superarlos, el mismo diseño pasa a Supabase Pro sin cambios de código.

## 6. Resiliencia, respaldos y estabilidad

Objetivo con $0: perder como máximo un día de datos (RPO 24 h) y recuperar el servicio en menos de una hora (RTO 1 h). Supabase Pro suma respaldos diarios administrados; bajar el RPO a minutos requiere recuperación a un punto en el tiempo (PITR), un complemento pago aparte.

| Riesgo                                                        | Mitigación                                                                                                                                                                                                             | Costo |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Supabase pausa el proyecto tras una semana con poca actividad | El uso diario del negocio lo mantiene activo; además, un Cloudflare Worker con Cron Trigger hace una consulta real de salud cada pocas horas. Si un proyecto se pausa, se reactiva desde el panel y conserva los datos | $0    |
| El plan gratuito no incluye respaldos                         | GitHub Actions corre `pg_dump` cada noche, cifra el archivo con `age` y lo guarda 30 días en un repositorio privado; un correo avisa si falla                                                                          | $0    |
| Un respaldo que nunca se probó                                | Una vez por semana, CI restaura el último respaldo en un Postgres temporal y corre consultas de verificación                                                                                                           | $0    |
| Una migración rompe producción                                | Migraciones solo hacia adelante, probadas en CI y luego en el proyecto de staging antes de producción                                                                                                                  | $0    |
| Señal débil en el punto de venta                              | Reintento automático con la misma llave de idempotencia; el formulario conserva lo escrito y ofrece Reintentar (sección 4.1 funcional)                                                                                 | $0    |
| Cloudflare o Supabase caídos                                  | La PWA carga desde la caché y muestra el estado; no se puede vender hasta que vuelva la conexión (v1)                                                                                                                  | $0    |
| Se pierde un celular                                          | Nada vive solo en el dispositivo; se desactiva el usuario desde Perfil                                                                                                                                                 | $0    |
| Cambio de condiciones del proveedor                           | Todo es Postgres estándar: el respaldo nocturno se restaura en Neon u otro Postgres                                                                                                                                    | $0    |

El respaldo en Excel de CU-15 se mantiene como copia en manos del negocio, independiente de la técnica.

Para estabilidad del código: versiones de dependencias fijadas, actualizaciones semanales con Dependabot o Renovate que pasan por CI, y registro de errores del frontend (servicio con plan gratuito, a elegir).

## 7. Integración con WhatsApp

WhatsApp entra en tres fases; solo la primera es gratuita, porque desde el 1 de octubre de 2026 Meta cobra cada plantilla de utilidad (recordatorios, confirmaciones), incluso dentro de la ventana de 24 horas. Los mensajes de servicio (respuestas a un cliente que escribió) tienen 1 000 gratis al mes por número.

| Fase                          | Qué hace                                                | Cómo funciona                                                                                                                                 | Costo                                                                       |
| ----------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 0 — v1                        | Recordatorio de cobro y comprobante de venta            | Enlace `wa.me` con mensaje ya escrito; la persona lo envía desde su propio WhatsApp (ya está en el prototipo)                                 | $0                                                                          |
| 1 — Recordatorios automáticos | Aviso de cuota próxima o vencida                        | pg_cron arma la cola cada mañana; una Edge Function envía plantillas aprobadas por la WhatsApp Cloud API; un webhook recibe entregado y leído | Por mensaje; Costa Rica se cobra con la tarifa de "Resto de América Latina" |
| 2 — Pedidos por WhatsApp      | El cliente pide por chat; el negocio confirma en la app | Webhook → Edge Function → pedido "pendiente" → un usuario lo convierte en venta con un toque                                                  | Respuestas: 1 000 gratis al mes; plantillas aparte                          |

Lo que se deja listo desde la v1 para no rehacer nada después:

- Teléfonos guardados en formato internacional (`+50680000001`), además de mostrarlos como 8000-0001.
- Campo de consentimiento del cliente para recibir mensajes (Ley 8968, RNF-06).
- Tabla `notification_outbox` (canal, plantilla, destinatario, estado, intentos) desde el inicio. En la fase 0 registra el enlace abierto; en la fase 1 la consume la Edge Function. Cambiar de canal no toca las pantallas.
- `reminders` ya guarda canal y estado, así que CU-07 sigue igual cuando el envío pase a ser automático.
- El webhook valida la firma de Meta y usa el identificador del mensaje como llave de idempotencia, porque Meta puede reenviar el mismo evento.

## 8. CI/CD y pruebas

GitHub Actions corre tres capas de pruebas con costo creciente, y cada capa solo se ejecuta cuando hace falta, para caber en los 2 000 minutos mensuales de un repositorio privado del plan gratuito.

| Capa                         | Herramienta                                       | Qué prueba                                                                                                              | Cuándo corre                     | Tiempo estimado |
| ---------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------- |
| Estática                     | ESLint, `tsc`, sqlfluff                           | Tipos, estilo, SQL bien formado                                                                                         | Cada PR                          | ~1 min          |
| Unit                         | Vitest                                            | Cálculo de cuotas, estado de una cuenta, formatos de ₡ y teléfono, validaciones Zod                                     | Cada PR                          | ~1 min          |
| Integración de base de datos | Supabase CLI (Postgres local en Docker) + pgTAP   | Políticas por rol (el Vendedor no ve costos), funciones RPC, invariantes de stock, folio, idempotencia, anulación doble | PR que toca `supabase/**`        | ~4 min          |
| Concurrencia                 | Vitest contra el Postgres local                   | Dos ventas simultáneas de la última unidad; reintento con la misma llave                                                | PR que toca `supabase/**`        | ~1 min          |
| E2E humo                     | Playwright, solo Chromium con viewport de celular | CU-01, CU-02, CU-05, CU-06 de punta a punta                                                                             | Cada PR a `main`                 | ~3 min          |
| E2E completo                 | Playwright, Chromium y WebKit (iPhone)            | Los 15 casos de uso con datos sembrados                                                                                 | Cada noche y antes de producción | ~10 min         |
| Respaldo                     | `pg_dump` + `age`                                 | Respaldo nocturno; restauración de prueba semanal                                                                       | Programado                       | ~3 min          |

La tabla de casos de cuotas (RN-04) es un archivo JSON compartido: Vitest la corre contra la función TypeScript y pgTAP contra la función SQL, así la vista previa y el cálculo oficial nunca difieren.

Flujo de despliegue:

1. **Pull request:** estática, unit e integración según lo que cambió; Cloudflare Pages publica una vista previa del frontend.
2. **Merge a ****`main`****:** migraciones al proyecto de staging, e2e humo contra staging.
3. **Tag de versión (****`v1.2.0`****):** e2e completo, `supabase db push` a producción y despliegue del frontend con `wrangler`.
4. **Si algo falla en producción:** se vuelve a desplegar el tag anterior del frontend; la base se corrige con una migración nueva, nunca deshaciendo una.

Cómo se ahorran minutos: caché de `node_modules` y de navegadores de Playwright, filtros por ruta para no levantar Postgres si solo cambió el frontend, un solo navegador en PRs y cancelación de ejecuciones viejas cuando llega un commit nuevo. Estimado aproximado: 60 PRs al mes (~6 min) + 30 noches de e2e (~10 min) + 30 respaldos (~3 min) ≈ 750 minutos, bajo el límite de 2 000.

## 9. Límites de los planes gratuitos y ruta de crecimiento

El límite que primero se siente no es de capacidad sino de operación: la pausa por inactividad y la falta de respaldos de Supabase Free. Los números quedan holgados para el volumen inicial.

| Servicio                                                                                                   | Límite gratuito que importa                                                                                                     | Uso esperado v1                         | Señal para pagar                                          | Siguiente paso                                                   |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| [Supabase](https://supabase.com/docs/guides/platform/free-project-pausing)                                 | 500 MB de base, 5 GB de transferencia al mes, 50 000 usuarios activos, 2 proyectos, pausa tras 1 semana inactiva, sin respaldos | 100–200 MB, 10 usuarios                 | Base cerca de 400 MB, o el negocio ya no tolera una pausa | Pro: $25 al mes, 8 GB, respaldos diarios de 7 días, sin pausas   |
| [Cloudflare Pages](https://developers.cloudflare.com/pages/functions/pricing/)                             | Solicitudes estáticas ilimitadas                                                                                                | Toda la interfaz                        | No aplica mientras el sitio sea estático                  | Sin cambio                                                       |
| [Cloudflare Workers](https://developers.cloudflare.com/workers/platform/limits/)                           | 100 000 solicitudes al día, 10 ms de CPU, 5 Cron Triggers                                                                       | Mantener activo y salud: decenas al día | Mover lógica pesada al Worker                             | Workers Paid: $5 al mes                                          |
| GitHub Actions (repositorio privado)                                                                       | 2 000 minutos y 500 MB al mes                                                                                                   | ~750 minutos                            | Suite e2e muy grande o muchos PRs                         | Hacer público el repo de código (minutos ilimitados) o plan Team |
| [WhatsApp Cloud API](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing.md) | 1 000 mensajes de servicio al mes por número; plantillas de utilidad siempre se cobran                                          | Fase 0: ninguno                         | Querer recordatorios automáticos (fase 1)                 | Pago por mensaje con método de pago en Meta                      |
| [Neon](https://neon.com/docs/introduction/plans) (respaldo de salida)                                      | 1 GB por proyecto, 100 CU-horas al mes, se apaga tras 5 min sin uso                                                             | Solo como destino de restauración       | —                                                         | Launch: pago por uso                                             |

Ruta de crecimiento:

1. **Etapa 0, $0 al mes:** el stack de este documento.
2. **Etapa 1, ~$25 al mes:** Supabase Pro cuando el negocio dependa del sistema a diario. Quita la pausa y suma respaldos administrados; el respaldo nocturno propio se mantiene como segunda copia.
3. **Etapa 2, por uso:** recordatorios automáticos por WhatsApp, PITR si un día de datos perdidos deja de ser aceptable, y Workers Paid si aparece lógica en el borde.

Ninguna etapa obliga a reescribir: la interfaz, las migraciones y las pruebas son las mismas.

## 10. Alternativas y decisiones abiertas

Se evaluaron cinco alternativas; la más cercana es Neon + Cloudflare Workers, que evita la pausa pero obliga a construir y mantener autenticación, API y tiempo real propios.

| Alternativa                                                | A favor                                                                           | En contra                                                                                                | Veredicto                                                      |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Neon + Cloudflare Workers (Hono) + librería de auth        | Postgres sin pausa; se apaga solo y despierta en la primera consulta; 1 GB gratis | Backend propio: más código, más pruebas, sin tiempo real incluido; 100 000 solicitudes al día en Workers | Plan B si la pausa de Supabase se vuelve un problema           |
| Firebase                                                   | Muy maduro, tiempo real nativo                                                    | No es Postgres; reglas de negocio transaccionales más difíciles; dependencia fuerte del proveedor        | Descartada                                                     |
| Cloudflare D1 o Turso                                      | Gratis y rápidos                                                                  | SQLite, no Postgres                                                                                      | Descartada por requisito                                       |
| Servidor propio en una VM gratuita (PocketBase o Postgres) | Control total, sin pausas                                                         | Parches, seguridad y respaldos a cargo del negocio; contradice RNF-09                                    | Descartada                                                     |
| Framework con render en servidor (Next.js SSR)             | SEO y render inicial                                                              | No es un sitio estático; consume límites de funciones                                                    | Descartada; el sistema es una app interna sin necesidad de SEO |

Decisiones abiertas que conviene cerrar antes de construir:

- [x] **Framework de interfaz:** React (recomendado por ecosistema y facilidad de contratar) o Svelte (paquetes más livianos). El resto del stack no cambia.
- [x] **Inicio de sesión ****en la fase inicial (1–2 usuarios)****:** correo y contraseña de Supabase Auth tal como viene, sin SMS, sin PIN y sin bloqueo propio; basta con los límites de intentos que ya trae Supabase. Los usuarios se crean a mano desde el panel de Supabase, así que la pantalla para administrar usuarios (CU-15) puede esperar. Teléfono + PIN y el bloqueo tras 5 intentos (CU-14) se retoman cuando entren vendedores.
- [x] **Repositorio público o privado:** privado da reserva del código; público da minutos ilimitados de CI. Los respaldos van siempre a un repositorio privado y cifrados.
- [x] **Destino de respaldos:** repositorio privado de GitHub (sin tarjeta) o un bucket de objetos (puede pedir tarjeta).
- [x] **Número para la fase 1 de WhatsApp:** número nuevo dedicado a la API o el actual del negocio; verificar si Meta permite usarlo a la vez en la app de WhatsApp Business.
- **Funcionamiento sin internet:** si hay ferias o visitas sin señal (pregunta abierta del documento funcional), definir si la v1 necesita cola de ventas sin conexión.
- **Momento de pasar a Supabase Pro:** acordar la señal (por ejemplo, el primer mes con datos reales en producción).

## Fuentes

Límites y precios consultados el 2 de noviembre de 2026; cambian con frecuencia y conviene revisarlos antes de construir.

- Requerimientos Funcionales — Sistema de Inventario y Ventas y Prototipo v2
- [Supabase: pausa de proyectos del plan gratuito](https://supabase.com/docs/guides/platform/free-project-pausing.md)
- [Supabase: planes y precios (resumen de terceros, 2026)](https://makerkit.dev/blog/saas/supabase-pricing)
- [Neon: planes](https://neon.com/docs/introduction/plans)
- [Cloudflare Workers: límites](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare Pages Functions: precios](https://developers.cloudflare.com/pages/functions/pricing/)
- [Cloudflare Pages: límites del plan gratuito (resumen 2026)](https://temps.sh/blog/cloudflare-pages-free-tier-limits-2026)
- [Meta: precios de WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing.md)
- [GitHub Actions: precios 2026 (resumen)](https://cicdcost.com/github-actions-pricing)
