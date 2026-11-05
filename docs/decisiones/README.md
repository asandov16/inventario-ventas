# Decisiones de arquitectura (ADR)

Cada decisión tiene un registro corto. ADR-001 a ADR-019 corresponden a D-01 a D-19 del roadmap; ADR-020 en adelante salen del plan de implementación. Una decisión nueva se registra copiando el formato del último ADR.

| ADR                                                                               | Decisión                                                        | Estado                  | Origen       |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------- | ------------ |
| [ADR-001](ADR-001-framework-de-interfaz-react-typescript-vite.md)                 | Framework de interfaz: React + TypeScript + Vite                | Aceptada                | D-01         |
| [ADR-002](ADR-002-inicio-de-sesion-con-correo-y.md)                               | Inicio de sesión con correo y contraseña                        | Aceptada                | D-02         |
| [ADR-003](ADR-003-repositorio-de-codigo-privado.md)                               | Repositorio de código privado                                   | Reemplazada por ADR-020 | D-03         |
| [ADR-004](ADR-004-destino-de-respaldos-repositorio-privado-con.md)                | Destino de respaldos: repositorio privado con archivos cifrados | Aceptada                | D-04         |
| [ADR-005](ADR-005-preparacion-para-trabajar-sin-conexion-desde.md)                | Preparación para trabajar sin conexión desde el modelo          | Aceptada                | D-05         |
| [ADR-006](ADR-006-venta-a-pagos-a-cliente-con.md)                                 | Venta a pagos a cliente con cuotas vencidas                     | Asumida                 | D-06         |
| [ADR-007](ADR-007-frecuencia-de-cuotas.md)                                        | Frecuencia de cuotas                                            | Asumida                 | D-07         |
| [ADR-008](ADR-008-descuentos-devoluciones-parciales-y-facturacion-electronica.md) | Descuentos, devoluciones parciales y facturación electrónica    | Asumida                 | D-08         |
| [ADR-009](ADR-009-fecha-de-vencimiento-de-cuotas.md)                              | Fecha de vencimiento de cuotas                                  | Aceptada                | D-09         |
| [ADR-010](ADR-010-cuota-minima.md)                                                | Cuota mínima                                                    | Aceptada                | D-10         |
| [ADR-011](ADR-011-costo-de-cada-linea-de-venta.md)                                | Costo de cada línea de venta en tabla aparte                    | Aceptada                | D-11         |
| [ADR-012](ADR-012-carga-de-saldos-anteriores-al-sistema.md)                       | Carga de saldos anteriores al sistema                           | Aceptada                | D-12         |
| [ADR-013](ADR-013-estilos-con-css-modules-y-variables.md)                         | Estilos con CSS Modules y variables                             | Aceptada                | D-13         |
| [ADR-014](ADR-014-registro-de-errores-del-frontend-con.md)                        | Registro de errores del frontend con Sentry                     | Aceptada                | D-14         |
| [ADR-015](ADR-015-gestor-de-paquetes-y-runtime-pnpm.md)                           | Gestor de paquetes y runtime: pnpm + Node 22                    | Reemplazada por ADR-026 | D-15         |
| [ADR-016](ADR-016-region-de-supabase.md)                                          | Región de Supabase                                              | Aceptada                | D-16         |
| [ADR-017](ADR-017-momento-de-pasar-a-supabase-pro.md)                             | Momento de pasar a Supabase Pro                                 | Asumida                 | D-17         |
| [ADR-018](ADR-018-usuarios-de-la-beta.md)                                         | Usuarios de la beta                                             | Aceptada                | D-18         |
| [ADR-019](ADR-019-nombre-del-negocio-e-icono-configurables.md)                    | Nombre del negocio e ícono configurables                        | Aceptada                | D-19         |
| [ADR-020](ADR-020-repositorio-publico-con-controles-de-exposicion.md)             | Repositorio público con controles de exposición                 | Aceptada                | Plan §4 y §8 |
| [ADR-021](ADR-021-workflows-de-respaldo-solo-en-el.md)                            | Workflows de respaldo solo en el repositorio privado            | Aceptada                | Plan §8      |
| [ADR-022](ADR-022-cuotas-cubiertas-en-ventas-con-saldo.md)                        | Cuotas cubiertas en ventas con saldo anterior                   | Aceptada                | Plan §8      |
| [ADR-023](ADR-023-excepciones-a-la-prueba-de-permisos.md)                         | Excepciones a la prueba de permisos de RPC                      | Aceptada                | Plan §8      |
| [ADR-024](ADR-024-datos-de-pruebas-e2e-en-staging.md)                             | Datos de pruebas E2E en staging                                 | Aceptada                | Plan §8      |
| [ADR-025](ADR-025-unicidad-sin-distinguir-mayusculas-mediante-indices.md)         | Unicidad sin distinguir mayúsculas mediante índices             | Aceptada                | Plan §8      |
| [ADR-026](ADR-026-node-24-lts-y-typescript-6.md)                                  | Node 24 LTS y TypeScript 6.0                                    | Aceptada                | Plan §8      |
| [ADR-027](ADR-027-idioma-codigo-en-ingles-interfaz-y.md)                          | Idioma: código en inglés, interfaz y documentos en español      | Aceptada                | Plan §6.1    |
| [ADR-028](ADR-028-arquitectura-en-capas-por-funcionalidad.md)                     | Arquitectura en capas por funcionalidad                         | Aceptada                | Plan §5.2    |
| [ADR-029](ADR-029-nombres-de-migraciones-con-timestamp.md)                        | Nombres de migraciones con timestamp                            | Aceptada                | Plan §8      |
| [ADR-030](ADR-030-entrega-en-5-etapas-mas-una.md)                                 | Entrega en 5 etapas más una posterior                           | Aceptada                | Plan §2      |
| [ADR-031](ADR-031-valores-de-estado-en-ingles.md)                                 | Valores de estado y tipos en inglés                             | Aceptada                | Etapa 1      |
| [ADR-032](ADR-032-permisos-cerrados-por-defecto.md)                               | Permisos cerrados por defecto                                   | Aceptada                | Etapa 1      |
| [ADR-033](ADR-033-usuarios-de-prueba-solo-en-seed-local.md)                       | Usuarios de prueba solo en el seed local                        | Aceptada                | Etapa 1      |
| [ADR-034](ADR-034-casos-de-cuotas-generan-pruebas-sql.md)                         | Los casos de cuotas generan las pruebas SQL                     | Aceptada                | Etapa 1      |
| [ADR-035](ADR-035-ayudantes-de-pgtap-fuera-de-migraciones.md)                     | Ayudantes de pgTAP fuera de las migraciones                     | Aceptada                | Etapa 1      |
| [ADR-036](ADR-036-costos-de-ingresos-en-tabla-aparte.md)                          | Costos de ingresos de stock en tabla aparte                     | Aceptada                | Etapa 1      |
| [ADR-037](ADR-037-rutas-y-hojas-por-parametro-de-url.md)                          | Rutas por sección y hojas por parámetro de URL                  | Aceptada                | Etapa 2      |
| [ADR-040](ADR-040-fechas-con-intl-sin-date-fns.md)                                | Fechas con `Intl`, sin `date-fns`                               | Aceptada                | Etapa 2      |
