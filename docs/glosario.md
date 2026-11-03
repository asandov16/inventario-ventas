# Glosario: negocio ↔ código

La interfaz y los documentos usan el lenguaje del negocio, en español. El código usa inglés (ADR-027). Esta tabla es la única fuente de equivalencias: si un término nuevo aparece, se agrega aquí en el mismo PR.

## Conceptos

| Negocio (interfaz)     | Código                | Notas                                                   |
| ---------------------- | --------------------- | ------------------------------------------------------- |
| Venta                  | `sale`                | Tabla `sales`                                           |
| Línea de venta         | `sale item`           | Tabla `sale_items`                                      |
| Folio                  | `folio`               | Se conserva el término; consecutivo por negocio (RN-15) |
| De contado             | `cash`                | `sales.type = 'cash'`                                   |
| A pagos                | `installments`        | `sales.type = 'installments'`                           |
| Prima                  | `down payment`        | `sales.down_payment`                                    |
| Cuota                  | `installment`         | Tabla `installments`                                    |
| Plazo (meses)          | `months`              | 1 a 3 (D-07)                                            |
| Abono                  | `payment`             | Tabla `payments`, `kind = 'payment'`                    |
| Pago de contado        | `payment`             | `kind = 'cash'`                                         |
| Pago de prima          | `payment`             | `kind = 'down_payment'`                                 |
| Pago previo al sistema | `payment`             | `kind = 'legacy'` (D-12)                                |
| Saldo                  | `balance`             | Calculado en vistas, nunca guardado                     |
| Cuenta por cobrar      | `receivable`          | Carpeta `features/receivables`                          |
| Cuota vencida          | `overdue installment` | `status = 'overdue'`                                    |
| Liquidada / Pagada     | `paid`                | `status = 'paid'`                                       |
| Anular                 | `void`                | `voided_at`, `voided_by`, `void_reason`                 |
| Saldo anterior         | `legacy balance`      | `sales.source = 'legacy_import'`                        |
| Cliente                | `customer`            | Tabla `customers`                                       |
| Producto               | `product`             | Tabla `products`                                        |
| Código de producto     | `code`                | `PER-001`; se dice "código", nunca "SKU"                |
| Categoría              | `category`            | Tabla `categories`, con `prefix`                        |
| Stock / Quedan N       | `stock`               | `products.stock`                                        |
| Stock mínimo           | `min stock`           | `products.min_stock`                                    |
| Ingreso de stock       | `restock`             | `inventory_movements.type = 'restock'`                  |
| Ajuste de conteo       | `adjustment`          | `inventory_movements.type = 'adjustment'`               |
| Costo                  | `unit cost`           | `product_costs`, `sale_item_costs`                      |
| Método de pago         | `payment method`      | Tabla `payment_methods`                                 |
| Recordatorio           | `reminder`            | Tabla `reminders`                                       |
| Actividad              | `activity log`        | Tabla `activity_log`                                    |
| Negocio                | `business`            | Tabla `businesses`                                      |
| Perfil / usuario       | `profile`             | Tabla `profiles`                                        |
| Administrador          | `admin`               | Código de rol                                           |
| Vendedor               | `seller`              | Código de rol                                           |
| Inicio (tablero)       | `dashboard`           | Carpeta `features/dashboard`                            |
| Historial              | `history`             | Carpeta `features/history`                              |
| Inventario             | `inventory`           | Carpeta `features/inventory`                            |

## Funciones RPC

| Roadmap                                                          | Código                                                                      |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `calc_cuotas`                                                    | `private.calc_installments`                                                 |
| `registrar_venta`                                                | `register_sale`                                                             |
| `crear_cliente`, `actualizar_cliente`, `buscar_clientes`         | `create_customer`, `update_customer`, `search_customers`                    |
| `registrar_abono`                                                | `register_payment`                                                          |
| `anular_venta`                                                   | `void_sale`                                                                 |
| `crear_producto`, `ingresar_stock`, `actualizar_producto`        | `create_product`, `restock_product`, `update_product`                       |
| `registrar_recordatorio`                                         | `record_reminder`                                                           |
| `actualizar_negocio`, `guardar_categoria`, `guardar_metodo_pago` | `update_business`, `save_category`, `save_payment_method`                   |
| `mi_perfil`, `ping`                                              | `get_my_profile`, `ping`                                                    |
| `resumen_inicio`, `resumen_cobros`, `resumen_inventario`         | `get_dashboard_summary`, `get_receivables_summary`, `get_inventory_summary` |
| `contadores`, `analisis`, `exportar_datos`                       | `get_badge_counts`, `get_analytics`, `export_data`                          |
| `registrar_saldo_anterior`                                       | `register_legacy_balance`                                                   |
| `private.require_perm`, `private.has_perm`                       | `private.require_permission`, `private.has_permission`                      |

## Permisos

| Roadmap                | Código                   |
| ---------------------- | ------------------------ |
| `ventas.registrar`     | `sales.create`           |
| `ventas.ver`           | `sales.read`             |
| `ventas.anular`        | `sales.void`             |
| `clientes.editar`      | `customers.edit`         |
| `abonos.registrar`     | `payments.create`        |
| `recordatorios.enviar` | `reminders.send`         |
| `inventario.ver`       | `inventory.read`         |
| `inventario.ingresar`  | `inventory.restock`      |
| `productos.editar`     | `products.edit`          |
| `costos.ver`           | `costs.read`             |
| `tablero.ver`          | `dashboard.read`         |
| `analisis.ganancia`    | `analytics.profit`       |
| `usuarios.admin`       | `users.admin`            |
| `negocio.config`       | `business.configure`     |
| `datos.exportar`       | `data.export`            |
| `saldos.cargar`        | `legacy_balances.import` |

## Códigos de error

Los mensajes que ve la persona están en `web/src/shared/api/errors.ts` (sección 4.1 funcional).

| Roadmap              | Código                    |
| -------------------- | ------------------------- |
| `sin_cliente`        | `customer_required`       |
| `stock_insuficiente` | `insufficient_stock`      |
| `total_cambio`       | `total_changed`           |
| `prima_invalida`     | `invalid_down_payment`    |
| `plazo_invalido`     | `invalid_term`            |
| `plazo_muy_largo`    | `term_too_long`           |
| `abono_mayor_saldo`  | `payment_exceeds_balance` |
| `venta_anulada`      | `sale_voided`             |
| `ya_anulada`         | `already_voided`          |
| `cambio_concurrente` | `concurrent_update`       |
| `sin_permiso`        | `permission_denied`       |
| `telefono_invalido`  | `invalid_phone`           |
| `producto_inactivo`  | `inactive_product`        |

## Respuestas de RPC (`status`)

`ok`, `replay`, `possible_duplicate`, `similar`, `exists`. Sin traducción: no se muestran a la persona.

## Valores de estado

| Interfaz                                                   | Código                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| Pagada / Parcial / Pendiente / Vencida                     | `paid` / `partial` / `pending` / `overdue`             |
| Anulada                                                    | `voided`                                               |
| OK / Bajo / Agotado                                        | `ok` / `low` / `out`                                   |
| Urgente / Atención                                         | `urgent` / `attention`                                 |
| Movimiento: inicial / ingreso / venta / anulación / ajuste | `initial` / `restock` / `sale` / `void` / `adjustment` |

## Lo que se queda en español

Textos de interfaz (`messages.es.ts`), rutas visibles (`/vender`, `/historial`, `/por-cobrar`, `/inventario`, `/perfil`), parámetros de URL (`?venta=`, `?cliente=`, `?producto=`) y datos de catálogo ("Efectivo", "SINPE Móvil", "Perfumes").
