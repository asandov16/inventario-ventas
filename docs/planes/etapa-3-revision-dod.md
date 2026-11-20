# Revisión del DoD — Etapa 3: Operación diaria

**Resultado: cumplido.** Prueba en el celular hecha el 20 nov 2026 por la persona dueña, sobre staging: instalación y todos los flujos. La corrida nocturna del 20 nov pasó en Chromium y WebKit.

Revisión del 19 nov 2026 sobre `main` (`6d5e876`, PRs #24 a #34), con instalación limpia y base reiniciada. La primera corrida nocturna en Chromium y WebKit encontró una prueba inestable en WebKit, que se corrige en este PR (ver «Hallazgos»).

## Criterios del plan

| Criterio                                                                             | Resultado                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F6:** cada cambio de stock aparece en movimientos con usuario y fecha              | ✅ E2E CU-09 y CU-11: el ingreso y el ajuste de conteo salen en el detalle con "por Ximena Ledezma"; la base lo exige con un trigger (Etapa 1)                                                                                    |
| **F6:** ningún costo llega al navegador del Vendedor                                 | ✅ E2E `inventory.spec.ts`: revisa **todas** las respuestas de red que recibe el Vendedor y ninguna trae `unit_cost` ni `value_at_cost` con valor; además, el Vendedor ve 0 filas de `product_costs` con su propio JWT            |
| **F5:** los abonos actualizan saldo, estados y contadores sin recargar               | ✅ E2E CU-06: abono parcial, saldo nuevo y cuenta liquidada que pasa a "Liquidadas" sin recargar. Los contadores rojos se refrescan con la misma invalidación; ninguna prueba E2E mira el número del contador después de un abono |
| **F5:** una venta anulada desaparece de Por cobrar y de los totales; su stock vuelve | ✅ E2E CU-05: el stock vuelve; pgTAP `32_void_sale` y `52_receivables`: la venta anulada no debe nada y sale de Por cobrar y de los resúmenes (RN-09)                                                                             |
| **F7:** una venta en un navegador actualiza Inicio en otro en menos de 3 s           | ✅ E2E `home.spec.ts`: el Vendedor registra una venta con `register_sale` desde otra conexión y el Inicio del Admin la muestra en menos de 3 s (RNF-04), en cada PR y en la corrida nocturna                                      |
| **F7:** los 15 casos de uso pasan en la corrida completa, en Chromium y WebKit       | ✅ 44/44 en los dos navegadores en la corrida nocturna del 20 nov, después de la corrección de #35 (la primera corrida falló CU-11 en WebKit)                                                                                     |
| Prueba en el celular: un día de trabajo simulado                                     | ✅ 20 nov 2026, sobre staging: venta, abono, recordatorio, ingreso de stock, anulación, saldo anterior y respaldo. Dejó dos detalles de interfaz, anotados en `docs/avance.md`                                                    |
| Casillas F5, F6 y F7 del roadmap                                                     | ✅ 8/8, 5/5 y 12/12                                                                                                                                                                                                               |

## Casos de uso cubiertos por E2E

| Caso      | Prueba                                                                                    |
| --------- | ----------------------------------------------------------------------------------------- |
| CU-01–03  | `sell-register.spec.ts` (Etapa 2)                                                         |
| CU-04     | `history.spec.ts`: días, etiquetas, filtros, búsqueda, fecha, detalle                     |
| CU-05     | `history.spec.ts`: anular con motivo; el stock vuelve                                     |
| CU-06     | `receivables.spec.ts`: monto mayor al saldo, abono parcial, repetido pregunta, liquidada  |
| CU-07     | `receivables.spec.ts`: enlace de WhatsApp, Copiar mensaje y la confirmación               |
| CU-08     | `inventory.spec.ts`: lista, filtros, detalle con movimientos, sin costos para el Vendedor |
| CU-09–11  | `inventory-writes.spec.ts`: ingreso, producto nuevo, `similar`, edición, conteo, versión  |
| CU-12, 13 | `home.spec.ts`: saludo, números, actividad, estado, contadores, análisis 7/30 días        |
| CU-14, 15 | `profile.spec.ts` y `profile-data.spec.ts`: cuenta, contraseña, negocio, usuarios, datos  |

## Otras verificaciones

| Verificación                                 | Resultado                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `pnpm check` (lint, tipos, unitarias)        | ✅ 202 pruebas unitarias                                                                                |
| `pnpm db:test` (pgTAP desde base reiniciada) | ✅ 251 pruebas en 18 archivos                                                                           |
| `pnpm test:db` (concurrencia)                | ✅ 6/6                                                                                                  |
| `lint:sql` y `supabase db lint`              | ✅                                                                                                      |
| Tipos generados al día                       | ✅ Sin diferencias con el esquema                                                                       |
| Tamaño del JavaScript                        | ✅ 226 KB comprimido (meta: menos de 250 KB). La librería de Excel va aparte (20 KB) y carga al tocarla |
| Secretos en el historial                     | ✅ gitleaks, 73 commits, sin hallazgos                                                                  |
| Staging y vista previa por PR                | ✅ Cada merge publica staging; cada PR recibe su enlace                                                 |

## Cambios respecto al plan

| Cambio                                                                                                | Motivo                                                                                |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 8 PRs de código en lugar de 7: Perfil se partió en Mi cuenta / Negocio / Usuarios (#32) y Datos (#34) | PRs más pequeños; Datos trajo una dependencia nueva y el workflow nocturno            |
| Respaldo con 7 hojas, no 6: se agregó **Cuotas**                                                      | Sin las cuotas no se puede reconstruir el plan de cada venta a pagos                  |
| Migración extra `customer_search` en `v_sales_list` (#28)                                             | `ilike` en el servidor no ignora tildes; buscar "Zeledon" no encontraba "Zeledón"     |
| `get_sale_detail` y `get_product_detail` no son `STABLE`                                              | Llaman a `raise_business_error`, que es volátil; `supabase db lint` lo marcó          |
| Realtime se encendió en el job `e2e` de CI (#30)                                                      | El job lo excluía, y la prueba de dos navegadores lo necesita                         |
| La comprobación del portapapeles (CU-07) no corre en WebKit                                           | Playwright no puede dar permiso de portapapeles en WebKit; el resto de CU-07 sí corre |
| E2E contra staging con negocio dedicado (ADR-024) queda para la Etapa 4, como decía el plan           | Sin cambio; se anota para no perderlo                                                 |

## Hallazgos durante la etapa

| Hallazgo                                                                                                                                                                                    | Corrección                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| El secreto de la URL de staging traía `/rest/v1/` y la app daba 404                                                                                                                         | Se corrigió el secreto; `vite.config.ts` y el keep-alive ahora rechazan una URL que no sea la base (#24)                          |
| `gen:types` con la base apagada escribió el error dentro de `database.types.ts`                                                                                                             | Se restauró el archivo; el script local solo reemplaza los tipos si el resultado es válido                                        |
| Campos de dos columnas se salían de la pantalla a 360 px (Costo unitario en Agregar stock y 6 lugares más)                                                                                  | `repeat(2, minmax(0, 1fr))` en 7 hojas de estilo y una prueba E2E a 360 px (#34)                                                  |
| Pruebas E2E que dependían del estado que dejaba otra (abonos, contraseña, métodos de pago)                                                                                                  | Cada prueba usa datos propios o devuelve lo que cambia; se documentó en cada archivo                                              |
| **Corrida nocturna, WebKit:** CU-11 se quedó 30 s esperando una consulta directa a la base (`pg` espera sin límite) y el reintento chocó con el ajuste que había guardado el primer intento | Este PR: las consultas de prueba tienen 10 s de límite y CU-11 tolera su propio reintento. Si vuelve a pasar, la falla dirá dónde |

## Pendientes conocidos (no bloquean)

- ~~**Prueba en el celular**~~: hecha el 20 nov 2026.
- ~~**Corrida nocturna en WebKit en verde**~~: confirmada el 20 nov 2026.
- **Editar un cliente desde la app:** la RPC existe; falta la pantalla. Por decidir antes de la beta.
- **Contador rojo después de un abono:** funciona por la invalidación de consultas, pero no tiene prueba E2E propia.
- **Docker:** cambiar OrbStack por Docker Desktop antes del 2 dic 2026.
