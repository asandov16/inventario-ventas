# Plan — Etapa 3: Operación diaria (F6 + F5 + F7)

## 1. Contexto

La Etapa 2 dejó la app instalable y la pantalla Vender completa. Las otras cuatro secciones son marcadores. La Etapa 3 las llena con lo que el negocio usa todos los días:

| Fase   | Contenido                                                                                                                                                                         |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F6** | Inventario: ver stock, ingresar mercadería, crear y editar productos (CU-08 a CU-11)                                                                                              |
| **F5** | Historial, anular ventas, cobrar abonos y recordar por WhatsApp (CU-04 a CU-07)                                                                                                   |
| **F7** | Inicio (resumen, actividad, alertas, análisis), tiempo real entre celulares, Perfil y configuración del negocio, respaldo en Excel y carga de saldos del cuaderno (CU-12 a CU-15) |

**Al terminar:** los 15 casos de uso funcionan de punta a punta, en Chromium y WebKit, y el Vendedor nunca recibe un costo en su navegador.

La base de la Etapa 1 ya tiene casi todo: RPC de escritura, vistas de lectura, permisos y Realtime. Hacen falta **pocas piezas de SQL nuevas**, solo de lectura (sección 4).

El plan se guarda como `docs/planes/etapa-3-operacion-diaria.md`.

## 2. Entregas: 7 PRs

En el orden del plan general: F6 → F5 → F7.

| PR  | Contenido                                                                                                                                                                                                                                                                                                                            | Tareas                            | Rama                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- | --------------------------------- |
| 1   | Lecturas nuevas en SQL (sección 4) con pgTAP, y tipos regenerados                                                                                                                                                                                                                                                                    | Base de F5–F7                     | `feat/stage-3-read-models`        |
| 2   | **Inventario:** lista, totales, chips (con Stock bajo), detalle con movimientos, "Vender" e "Ingresar stock"                                                                                                                                                                                                                         | F6-T01, T02                       | `feat/stage-3-inventory`          |
| 3   | **Agregar stock y editar producto:** existente o nuevo, `similar`, duplicado, últimos ingresos; editar con margen en vivo, precio menor que el costo, conteo físico, desactivar, `concurrent_update`; E2E CU-08 a CU-11                                                                                                              | F6-T03, T04, T05                  | `feat/stage-3-stock-and-products` |
| 4   | **Historial y anulación:** grupos por día, etiquetas, chips, búsqueda, carga infinita por cursor; detalle de venta con plan, pagos, otras compras y saldo del cliente; anular solo Admin; filtros de fecha y vendedor; E2E CU-04 y CU-05                                                                                             | F5-T01 a T04 y la parte de F5-T08 | `feat/stage-3-history`            |
| 5   | **Por cobrar:** tres números, Pendientes / Liquidadas; cuenta con monto sugerido, **Cuota** y **Todo**, abono, liquidada, "Registrar otro abono"; recordatorio por WhatsApp con "¿Enviaste el recordatorio?" y **Copiar mensaje**; E2E CU-06 y CU-07                                                                                 | F5-T05 a T08                      | `feat/stage-3-receivables`        |
| 6   | **Inicio y tiempo real:** saludo y cuatro números tocables; Actividad; Estado (Urgente / Atención); Análisis 7/30 días con los gráficos SVG del prototipo; contadores rojos; Realtime por negocio; E2E CU-12, CU-13 y el de dos navegadores                                                                                          | F7-T01 a T06 y la parte de F7-T11 | `feat/stage-3-home-realtime`      |
| 7   | **Perfil:** datos y permisos en palabras, mis ventas a 30 días, cambiar contraseña; Negocio (nombre, categorías, métodos de pago); Datos (respaldo `.xlsx` y **Cargar saldo anterior**); Usuarios (solo lectura) y runbook `crear-usuario.md`; E2E CU-14, CU-15 y saldo anterior; **corrida nocturna completa en Chromium y WebKit** | F7-T07 a T12                      | `feat/stage-3-profile`            |

Cada PR trae su vista previa para probar en el celular. Al final van la revisión del DoD y la actualización del avance y la presentación.

## 3. Arquitectura (sin cambios, ADR-028)

| Funcionalidad          | Contenido                                        |
| ---------------------- | ------------------------------------------------ |
| `features/inventory`   | Lista, detalle, agregar stock, editar            |
| `features/history`     | Lista, detalle de venta, anular                  |
| `features/receivables` | Lista, cuenta, abono, recordatorio               |
| `features/home`        | Resumen, actividad, estado, análisis             |
| `features/profile`     | Perfil, negocio, datos, usuarios, saldo anterior |

**Compartidos:**

- El **detalle de venta** vive en `features/sales` y se exporta en su `index.ts`. Lo usan Historial, Por cobrar e Inicio.
- La **cuenta** con su abono vive en `features/receivables` y se exporta igual.
- Las hojas siguen el patrón de ADR-037: `?venta=<id>`, `?cuenta=<id>`, `?producto=<id>`. Un enlace desde Inicio o una alerta abre la sección y la hoja correctas.

**Todas las escrituras** van por `useRpcMutation`, con llave de idempotencia y toasts que dicen el dato clave (RN-17). Las RPC son:

`register_payment`, `void_sale`, `restock_product`, `create_product`, `update_product`, `record_reminder`, `update_business`, `save_category`, `save_payment_method`, `register_legacy_balance`.

**Mensajes:** los textos de los toasts, diálogos y errores salen del prototipo v2 y del roadmap. Las diferencias se resuelven a favor del roadmap y de los requerimientos. Por ejemplo, "Recordatorio enviado hoy" en lugar de "Recordatorio anotado".

## 4. SQL nuevo: solo lecturas (PR 1)

Regla de la casa: las lecturas pasan por vistas o RPC de lectura. Hoy faltan tres lecturas compuestas, y en la Etapa 2 dos lecturas iban directo a tablas: el detalle tras vender y los métodos de pago. Se agregan, cada una con su pgTAP (un caso de quién sí y quién no):

| Pieza                              | Para qué                                                                                                                                                                                                   | Permiso          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `get_sale_detail(p_sale_id)`       | Cliente y teléfono, vendedor, líneas, plan con estados (`v_installment_status`), pagos con método y fecha, anulación (quién, cuándo, motivo), último recordatorio, otras compras y saldo total del cliente | `sales.read`     |
| `get_product_detail(p_product_id)` | Producto, unidades vendidas y últimos 20 movimientos con usuario y fecha. Costo de cada ingreso solo con `costs.read`                                                                                      | `inventory.read` |
| `v_recent_restocks`                | "Últimos ingresos" (sin costos)                                                                                                                                                                            | `inventory.read` |
| `v_activity`                       | `activity_log` con el nombre de quien lo hizo, para el feed                                                                                                                                                | `dashboard.read` |
| `v_catalogs` o `get_catalogs()`    | Categorías y métodos de pago activos, en orden. Reemplaza las lecturas directas de la Etapa 2                                                                                                              | Sesión           |
| `v_users`                          | Nombre, rol y estado de las personas del negocio (solo lectura)                                                                                                                                            | `users.admin`    |
| Trigger                            | `record_reminder` también anota en `activity_log`, para que el feed muestre 💬                                                                                                                             | —                |

**Además:**

- **Anular:** `void_sale` no tiene llave de idempotencia. Si la venta ya estaba anulada **por la misma persona**, la interfaz lo trata como éxito; si fue otra persona, muestra el mensaje con quién y cuándo. No se cambia la RPC.
- **Sin escrituras nuevas** salvo el trigger de actividad. `pnpm gen:types` y `pnpm db:test` en verde.

## 5. Decisiones de diseño

| Tema               | Decisión                                                                                                                                                                                                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Historial paginado | Cursor sobre `v_sales_list` por `(client_created_at desc, sale_id desc)`, de 30 en 30, con `useInfiniteQuery`. Filtros en el servidor: tipo, anuladas, texto, rango de fechas, vendedor                                                                                                                     |
| Costos             | Solo con `costs.read`: valor a costo, costo en filas, margen y costo de ingresos. E2E con dos verificaciones: el Vendedor no ve costos en pantalla, y **ninguna respuesta de red** que recibe trae `unit_cost` ni `value_at_cost` con valor (DoD F6)                                                        |
| Recordatorio       | Mensaje armado en `shared/domain/whatsapp.ts` con la plantilla del roadmap y el nombre del negocio de la base. `wa.me` abre en otra pestaña; al volver, "¿Enviaste el recordatorio?"; solo con **Sí** llama `record_reminder`                                                                               |
| Monto sugerido     | Lo vencido; si no hay, la próxima cuota; nunca más que el saldo. Lógica pura en `domain`, con pruebas                                                                                                                                                                                                       |
| Análisis           | Gráficos SVG propios portados del prototipo (barras por día, mezcla, top productos, por categoría), sin librería de gráficos. Ganancia y margen solo con `analytics.profit`                                                                                                                                 |
| Tiempo real        | Un canal por negocio con `postgres_changes` en `sales`, `payments`, `products`, `inventory_movements`, `customers` y `activity_log`. Cada evento invalida sus llaves de consulta, con espera de 300 ms. Se reconecta al volver la señal o la pestaña. Vive en `shared/api/realtime.ts` y lo enciende la app |
| Respaldo `.xlsx`   | `export_data` → libro con 6 hojas. La librería se carga solo al tocar el botón. Candidata: `write-excel-file`, liviana y sin las alertas de `xlsx`; versión exacta y justificada en su PR                                                                                                                   |
| Saldo anterior     | Formulario de ADR-012 con vista previa del plan (misma función TS de cuotas, con `firstDueDate`), "Cargar otro" y contador "Saldos cargados: N · ₡X"                                                                                                                                                        |
| Usuarios           | Solo lectura, como dice el roadmap (el prototipo traía alta y edición). Agregar personas sigue en el runbook con `private.link_user`                                                                                                                                                                        |
| Cambiar contraseña | `supabase.auth.updateUser` desde `shared/api/auth.ts`, con mínimo de 10 caracteres como en la configuración de Supabase                                                                                                                                                                                     |

## 6. Pruebas

| Tipo                       | Qué cubre                                                                                                                                                                                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pgTAP (PR 1)               | Cada lectura nueva: caso feliz, sin permiso, otro negocio; costos ocultos al Vendedor en `get_product_detail`                                                                                                                                                                                |
| Vitest                     | Monto sugerido, mensaje de WhatsApp, agrupación por día y totales, margen y precio menor que el costo, vista previa de saldo anterior, armado del `.xlsx` (hojas y columnas), invalidación de Realtime                                                                                       |
| Playwright smoke (cada PR) | Los casos de uso de cada PR en Chromium con viewport de celular, contra Supabase local con el seed                                                                                                                                                                                           |
| Corrida nocturna (PR 7)    | Workflow `nightly` a las 3:00 CR: los 15 casos en **Chromium y WebKit**, contra Supabase local en el runner (como ADR-039), y la prueba de dos navegadores para Realtime. El E2E contra staging con negocio dedicado (ADR-024) queda para la Etapa 4, junto con los despliegues a producción |

## 7. DoD de la Etapa 3

- **F6:**
  - cada cambio de stock aparece en movimientos con usuario y fecha;
  - ningún costo llega al navegador del Vendedor, verificado en la red con Playwright.
- **F5:**
  - los abonos actualizan saldo, estados y contadores sin recargar;
  - una venta anulada desaparece de Por cobrar y de los totales, y su stock vuelve.
- **F7:**
  - una venta en un navegador actualiza Inicio en otro en menos de 3 s;
  - los 15 casos de uso pasan en la corrida completa, en Chromium y WebKit.
- **Al cierre:**
  - revisión del DoD;
  - tu prueba en el celular: un día de trabajo simulado con venta, abono, recordatorio, ingreso de stock, anulación y carga de un saldo anterior;
  - casillas F5, F6 y F7 marcadas;
  - avance, «Punto actual» y presentación actualizados.

## 8. Riesgos

| Riesgo                                                        | Mitigación                                                                                                                                      |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Vistas de cuentas lentas con muchas ventas (recalculan pagos) | Paginación y filtros en el servidor; medir con datos del seed multiplicados. Si hace falta, índice o vista materializada en una migración nueva |
| WebKit se comporta distinto (scroll-snap, hojas, `wa.me`)     | Corrida nocturna en WebKit desde el PR 7; prueba real en iPhone al cierre                                                                       |
| Realtime se pierde al dormir el celular                       | Reconexión y refresco al volver la pestaña o la señal; los datos nunca dependen solo del evento                                                 |
| Excel pesado en el paquete                                    | Carga diferida solo al tocar el botón; se mide el JS inicial en cada PR (meta: menos de 250 KB)                                                 |
| Alcance grande (25 tareas)                                    | 7 PRs pequeños con vista previa; nada de F8 salvo lo ya adelantado                                                                              |

## 9. Verificación

- **Cada PR:** `pnpm check`, `pnpm build`, `pnpm db:reset && pnpm test:e2e`, y `pnpm db:test` si toca SQL. CI verde, y probar la vista previa en el celular.
- **Al final:**
  - corrida nocturna manual en verde (Chromium y WebKit);
  - dos navegadores: vender en uno y ver Inicio actualizarse en el otro;
  - Vendedor: inspección de red sin costos;
  - cargar un saldo anterior y verlo en Por cobrar con sus cuotas.
