# Requerimientos Funcionales — Sistema de Inventario y Ventas

> **Copia de referencia** del documento fuente (2 nov 2026), sin datos que identifiquen al negocio.
> Ajustes vigentes: nombres de código en inglés (`docs/glosario.md`) y correcciones en `docs/decisiones/`.
> Donde este documento y un ADR difieran, manda el ADR.

## 1. Introducción

El sistema permite a un negocio familiar registrar ventas de contado y a pagos, cobrar cuotas y controlar su inventario desde el celular o la computadora. Debe ser tan fácil de usar como Instagram: se cambia de sección deslizando el dedo.

Este documento describe **qué** debe hacer el sistema, organizado por casos de uso. **Cómo** se construye (tecnología, hospedaje, costos) se define después, en el documento de requerimientos técnicos. La base es el prototipo funcional del 2 de noviembre de 2026.

### 1.1 Alcance de la primera versión

- Venta de productos (inicialmente perfumes y bisutería), de contado o a pagos de hasta 3 meses.
- Registro obligatorio del cliente en toda venta.
- Cobro de cuotas y seguimiento de saldos.
- Inventario: existencias, ingresos de mercadería y alertas de stock bajo.
- Tablero de inicio con actividad, alertas y un análisis básico.
- Usuarios con roles (Administrador y Vendedor), preparado para crecer.

### 1.2 Principios del producto

1. **Simple primero.** Cada pantalla tiene un solo propósito. Si una función confunde, se quita o se esconde.
2. **Pocos toques.** Las tareas diarias (vender, cobrar, revisar stock) se completan sin escribir más de lo necesario.
3. **Lenguaje de la casa.** Nada de términos técnicos: "Cobrar", "Abono", "Quedan 3", no "transacción" ni "SKU".
4. **El sistema hace las cuentas.** Totales, cuotas, saldos y alertas se calculan solos; la persona solo confirma.
5. **Nada se pierde.** Ningún registro se borra; las correcciones quedan anotadas con quién y cuándo.
6. **Errores difíciles de cometer.** Acciones que no se pueden deshacer piden confirmación clara.

### 1.3 Glosario

| Término           | Significado en este sistema                                                             |
| ----------------- | --------------------------------------------------------------------------------------- |
| Venta de contado  | El cliente paga el total el mismo día.                                                  |
| Venta a pagos     | El cliente paga una parte hoy (opcional) y el resto en cuotas mensuales, hasta 3 meses. |
| Prima             | Pago inicial de una venta a pagos. Puede ser ₡0.                                        |
| Cuota             | Cada pago mensual programado de una venta a pagos.                                      |
| Abono             | Dinero que el cliente entrega para pagar su saldo.                                      |
| Saldo             | Lo que el cliente todavía debe de una venta.                                            |
| Cuenta por cobrar | Venta a pagos que aún tiene saldo.                                                      |
| Cuota vencida     | Cuota cuya fecha ya pasó y no se ha pagado completa.                                    |
| Stock             | Unidades disponibles de un producto.                                                    |
| Stock mínimo      | Cantidad a partir de la cual el sistema avisa que hay que reponer.                      |
| Folio             | Número consecutivo que identifica cada venta (ej. #1016).                               |
| Anular            | Cancelar una venta. No se borra: queda marcada y el producto regresa al inventario.     |

### 1.4 Cómo leer este documento

- **RN** = regla de negocio, se cumple siempre y en todo el sistema.
- **CU** = caso de uso, una tarea que una persona realiza de principio a fin.
- **RF** = requerimiento funcional, algo concreto que el sistema debe hacer.
- **Prioridad:** _Debe_ (indispensable en la primera versión), _Debería_ (importante, puede esperar poco), _Podría_ (deseable a futuro).

## 2. Actores y roles

La primera versión tiene dos roles: **Administrador** y **Vendedor**. Los permisos se asignan por rol, no por persona, para poder agregar roles nuevos sin cambiar el sistema.

### 2.1 Actores

| Actor         | Quién es                                    | Qué hace                                                                        |
| ------------- | ------------------------------------------- | ------------------------------------------------------------------------------- |
| Administrador | Dueño(a) o encargado(a) del negocio         | Todo: vende, cobra, maneja inventario, precios, costos, usuarios y anulaciones. |
| Vendedor      | Familiar o colaborador que atiende clientes | Vende, cobra abonos y consulta inventario.                                      |
| Cliente       | Persona que compra (no usa el sistema)      | Sus datos se registran en cada venta; recibe recordatorios de cobro.            |
| Sistema       | Procesos automáticos                        | Calcula cuotas, saldos, vencimientos y alertas; registra quién hizo cada cosa.  |

### 2.2 Matriz de permisos

| Función                               | Administrador  | Vendedor           |
| ------------------------------------- | -------------- | ------------------ |
| Registrar venta (contado y a pagos)   | Sí             | Sí                 |
| Registrar y editar datos de clientes  | Sí             | Sí                 |
| Ver historial de ventas               | Todas          | Todas (sin costos) |
| Anular venta                          | Sí             | No                 |
| Registrar abonos                      | Sí             | Sí                 |
| Enviar recordatorio de cobro          | Sí             | Sí                 |
| Ver inventario                        | Sí, con costos | Sí, sin costos     |
| Ingresar stock y crear productos      | Sí             | No                 |
| Editar precios, costos y stock mínimo | Sí             | No                 |
| Ver tablero: actividad y alertas      | Sí             | Sí                 |
| Ver análisis: ganancia y margen       | Sí             | No                 |
| Administrar usuarios y roles          | Sí             | No                 |
| Configurar datos del negocio          | Sí             | No                 |
| Exportar respaldo de datos            | Sí             | No                 |

### 2.3 Roles futuros (no incluidos en la primera versión)

- **Cobrador:** solo ve cuentas por cobrar y registra abonos.
- **Bodega:** solo maneja inventario.
- **Consulta / contador:** ve reportes sin poder modificar nada.

**RF-ROL-01 (Debe):** Cada persona entra con su propio usuario; el sistema muestra solo las funciones que su rol permite.

**RF-ROL-02 (Debe):** El Administrador puede crear, desactivar y cambiar el rol de usuarios. Un usuario desactivado no puede entrar, pero sus ventas se conservan.

**RF-ROL-03 (Debería):** Los permisos se definen en una tabla de rol × función, de modo que un rol nuevo se crea marcando permisos, sin programar.

## 3. Reglas de negocio

Estas reglas se cumplen siempre, en cualquier pantalla y para cualquier rol. La regla RN-01 es obligatoria y no tiene excepciones.

### 3.1 Regla obligatoria: toda venta tiene cliente

**RN-01 — Captura del cliente en toda venta.** Ninguna venta se puede guardar sin un cliente identificado, sin importar si es de contado o a pagos.

- Datos mínimos obligatorios: **nombre** y **teléfono** (8 dígitos, Costa Rica).
- Datos opcionales: correo, dirección o zona, notas.
- No existe "Cliente de mostrador" ni "Cliente genérico". El botón para registrar la venta permanece desactivado hasta que haya un cliente seleccionado.
- Si el cliente ya existe, se busca por nombre o teléfono y se elige con un toque. Si no existe, se crea en ese mismo momento, sin salir de la venta.
- Un teléfono identifica a un solo cliente: si se escribe uno ya registrado, el sistema ofrece usar ese cliente en lugar de crear un duplicado.

_Por qué:_ permite cobrar, dar seguimiento, enviar recordatorios y conocer a los clientes frecuentes. Es la base de cualquier análisis futuro.

_Cambio respecto al prototipo:_ en el prototipo el cliente era opcional en ventas de contado. Esto debe corregirse.

### 3.2 Demás reglas

| ID    | Regla                         | Detalle                                                                                                                                                                   |
| ----- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RN-02 | No se vende lo que no hay     | La cantidad vendida de un producto no puede superar su stock. Un producto agotado no se puede agregar a una venta.                                                        |
| RN-03 | Plazos de pago                | Una venta a pagos tiene plazo de 1, 2 o 3 meses, con cuotas mensuales. La primera cuota vence un mes después de la fecha de venta.                                        |
| RN-04 | Cálculo de cuotas             | Saldo a financiar = total − prima. Se divide en partes iguales redondeadas a ₡100; la diferencia del redondeo va en la última cuota. Sin intereses en la primera versión. |
| RN-05 | Prima                         | La prima es opcional (puede ser ₡0) y debe ser menor que el total. Si cubre el total, la venta es de contado.                                                             |
| RN-06 | Abonos                        | Un abono no puede ser mayor que el saldo. Se aplica primero a la cuota pendiente más antigua. Se permiten abonos parciales.                                               |
| RN-07 | Cuota vencida                 | Una cuota está vencida si su fecha ya pasó y lo pagado no la cubre por completo.                                                                                          |
| RN-08 | Cuenta liquidada              | Cuando el saldo llega a ₡0, la venta pasa a "Pagada" y sale de cuentas por cobrar.                                                                                        |
| RN-09 | Anulación                     | Solo el Administrador anula, indicando un motivo. La venta no se borra: queda marcada "Anulada", sus productos regresan al stock y no cuenta en totales.                  |
| RN-10 | Stock bajo                    | Un producto tiene stock bajo cuando sus unidades son iguales o menores que su stock mínimo; agotado cuando llega a 0.                                                     |
| RN-11 | Descuento automático de stock | Al guardar una venta, el stock baja de inmediato. Al anularla, se devuelve.                                                                                               |
| RN-12 | Nada se borra                 | Ventas, abonos y movimientos de inventario no se eliminan. Toda corrección queda registrada con usuario, fecha y hora.                                                    |
| RN-13 | Moneda                        | Todo se maneja en colones (₡), sin decimales.                                                                                                                             |
| RN-14 | Métodos de pago               | Efectivo, SINPE Móvil y Tarjeta. El Administrador puede agregar otros.                                                                                                    |
| RN-15 | Folio                         | Cada venta recibe un número consecutivo único que no se reutiliza, ni siquiera si se anula.                                                                               |
| RN-16 | Precio al momento             | La venta guarda el precio y el costo vigentes ese día. Cambiar un precio después no altera ventas pasadas.                                                                |

**RN-17 — Toda acción tiene respuesta visible.** Cada acción que guarda, cambia o anula información termina siempre con una confirmación o un mensaje de error, y el cambio se ve en pantalla en ese momento. Ninguna acción termina en silencio. El detalle está en la sección 4.1.

**RN-18 — Protección contra registros duplicados.** Un mismo toque o un reintento por mala conexión nunca guarda dos veces. Además, el sistema pide confirmar antes de guardar si detecta un posible duplicado en los últimos 10 minutos:

- un abono del mismo monto para la misma venta;
- una venta al mismo cliente con los mismos productos;
- un ingreso de stock del mismo producto y la misma cantidad.

## 4. Navegación y experiencia de uso

La aplicación tiene seis secciones fijas, en este orden, y se pasa de una a otra deslizando el dedo a la izquierda o a la derecha:

1. **Inicio** — tablero con actividad, alertas y análisis.
2. **Vender** — nueva venta.
3. **Historial** — ventas registradas.
4. **Por cobrar** — ventas a pagos con saldo.
5. **Inventario** — existencias e ingreso de mercadería.
6. **Perfil** — cuenta, usuarios y configuración.

| ID       | Requerimiento                                                                                                                                | Prioridad |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| RF-UX-01 | En el celular, una barra inferior con ícono y nombre de cada sección; la sección activa se resalta.                                          | Debe      |
| RF-UX-02 | Deslizar a la izquierda o derecha cambia de sección; tocar un ícono lleva directo a esa sección.                                             | Debe      |
| RF-UX-03 | En computadora, la barra va arriba y se puede navegar con las flechas del teclado.                                                           | Debe      |
| RF-UX-04 | La barra muestra un contador rojo cuando hay algo urgente (cuotas vencidas en Por cobrar, productos con stock bajo en Inventario).           | Debe      |
| RF-UX-05 | Los detalles (una venta, un cliente, un producto) se abren en un panel que sube desde abajo, sin perder la sección de fondo.                 | Debe      |
| RF-UX-06 | Botones grandes y fáciles de tocar con el pulgar (mínimo 44 × 44 px), texto de al menos 15 px.                                               | Debe      |
| RF-UX-07 | Todo texto en español sencillo, sin tecnicismos; montos con formato ₡38 000 y fechas como "2 nov".                                           | Debe      |
| RF-UX-08 | Después de cada acción se muestra una confirmación o un error, según el estándar de la sección 4.1 (RN-17).                                  | Debe      |
| RF-UX-09 | Las acciones que no se pueden deshacer (anular, desactivar usuario) piden confirmación con lenguaje claro.                                   | Debe      |
| RF-UX-10 | Los errores dicen qué hacer, no qué falló ("Escribe el teléfono del cliente", no "Campo requerido").                                         | Debe      |
| RF-UX-11 | Las listas largas tienen buscador y filtros de un toque (chips).                                                                             | Debe      |
| RF-UX-12 | Funciona en el navegador del celular y de la computadora, sin instalar nada; se puede agregar a la pantalla de inicio como si fuera una app. | Debe      |
| RF-UX-13 | La primera vez, una pista breve enseña que se puede deslizar entre secciones.                                                                | Debería   |
| RF-UX-14 | Los campos de montos y teléfonos abren el teclado numérico.                                                                                  | Debe      |

### 4.1 Respuesta a cada acción: confirmaciones y errores

Toda acción que guarda información pasa por uno de estos estados, y la persona siempre sabe si se guardó o no. Este estándar aplica a todos los casos de uso; cada uno detalla sus mensajes en la línea **Confirmación y errores**.

| Situación           | Qué ve la persona                                                                                                                                                                               | Ejemplo                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Guardando           | El botón cambia de texto y se desactiva; no se puede tocar dos veces.                                                                                                                           | "Guardando abono…"                                                                     |
| Éxito               | Mensaje verde con ícono de check, visible al menos 4 segundos. El cambio se ve en pantalla (saldo, stock, etiqueta) y el registro nuevo aparece resaltado. El formulario se cierra o se limpia. | "Abono de ₡16 600 guardado · Saldo: ₡33 400"                                           |
| Error en los datos  | Mensaje rojo junto al campo con el problema, diciendo qué hacer. No se guarda nada y lo escrito se conserva.                                                                                    | "Escribe un monto mayor a ₡0"                                                          |
| Error de conexión   | Mensaje con botón **Reintentar**. No se guarda nada a medias y lo escrito se conserva.                                                                                                          | "No se pudo guardar. Revisa tu internet y toca Reintentar."                            |
| Posible duplicado   | Aviso que pide confirmar antes de guardar (RN-18).                                                                                                                                              | "Ya se registró un abono de ₡16 600 para Laura Brenes hace 1 minuto. ¿Registrar otro?" |
| Acción irreversible | Confirmación previa que explica qué va a pasar.                                                                                                                                                 | "¿Anular la venta #1016? Los productos regresarán al inventario."                      |

| ID       | Requerimiento                                                                                                                                                                  | Prioridad |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| RF-FB-01 | Ninguna acción de guardado termina sin mostrar éxito o error.                                                                                                                  | Debe      |
| RF-FB-02 | El mensaje de éxito dice qué se guardó y su dato clave: monto, folio, cantidad o nombre.                                                                                       | Debe      |
| RF-FB-03 | Además del mensaje, el cambio se ve de inmediato en la pantalla donde está la persona.                                                                                         | Debe      |
| RF-FB-04 | Mientras guarda, el botón se desactiva y dice qué está haciendo.                                                                                                               | Debe      |
| RF-FB-05 | Después de guardar, el formulario se cierra o se limpia: no queda listo para volver a enviar lo mismo. Para repetir la acción hay un botón explícito ("Registrar otro abono"). | Debe      |
| RF-FB-06 | Los mensajes de error se quedan visibles hasta que se corrige el problema; los de éxito se van solos y no tapan botones.                                                       | Debe      |
| RF-FB-07 | Todo registro nuevo aparece también en **Inicio → Actividad**, como segunda forma de verificar qué se guardó.                                                                  | Debe      |
| RF-FB-08 | Si la persona cierra un formulario con cambios sin guardar, se le pregunta "¿Descartar cambios?".                                                                              | Debería   |

## 5. Casos de uso

Hay 15 casos de uso, agrupados por sección de la aplicación. Cada uno indica quién lo hace, qué debe existir antes, los pasos normales, qué pasa si algo cambia y el resultado esperado.

| CU    | Nombre                                  | Sección    | Actor                   | Prioridad |
| ----- | --------------------------------------- | ---------- | ----------------------- | --------- |
| CU-01 | Registrar venta de contado              | Vender     | Vendedor, Administrador | Debe      |
| CU-02 | Registrar venta a pagos                 | Vender     | Vendedor, Administrador | Debe      |
| CU-03 | Seleccionar o registrar cliente         | Vender     | Vendedor, Administrador | Debe      |
| CU-04 | Consultar historial y detalle de venta  | Historial  | Vendedor, Administrador | Debe      |
| CU-05 | Anular una venta                        | Historial  | Administrador           | Debe      |
| CU-06 | Registrar un abono                      | Por cobrar | Vendedor, Administrador | Debe      |
| CU-07 | Enviar recordatorio de cobro            | Por cobrar | Vendedor, Administrador | Debería   |
| CU-08 | Consultar inventario                    | Inventario | Vendedor, Administrador | Debe      |
| CU-09 | Ingresar stock de un producto existente | Inventario | Administrador           | Debe      |
| CU-10 | Crear un producto nuevo                 | Inventario | Administrador           | Debe      |
| CU-11 | Editar producto o ajustar conteo        | Inventario | Administrador           | Debe      |
| CU-12 | Revisar actividad y alertas             | Inicio     | Vendedor, Administrador | Debe      |
| CU-13 | Consultar análisis básico               | Inicio     | Vendedor, Administrador | Debería   |
| CU-14 | Iniciar sesión y gestionar perfil       | Perfil     | Todos                   | Debe      |
| CU-15 | Administrar usuarios y negocio          | Perfil     | Administrador           | Debe      |

### 5.1 Vender

&#91;embedded content: flujo de una venta · contado o a pagos\]

Los dos tipos de venta comparten el inicio y el cliente; solo cambia cómo se paga.

#### CU-01 — Registrar venta de contado

**Actor:** Vendedor o Administrador. **Objetivo:** cobrar el total de una compra en el momento.

**Antes:** la persona inició sesión y hay productos con stock.

**Pasos:**

1. Abre **Vender**. Ve los productos en tarjetas con nombre, precio y unidades disponibles.
2. Busca por nombre o filtra por categoría, y toca cada producto para agregarlo. Cada toque suma una unidad.
3. Abajo aparece una barra con la cantidad de artículos y el total. Toca **Cobrar**.
4. Revisa el resumen y ajusta cantidades con − / +.
5. Elige **De contado**.
6. Selecciona o registra al cliente (CU-03). Obligatorio, regla RN-01.
7. Elige el método de pago: Efectivo, SINPE Móvil o Tarjeta.
8. Toca **Registrar venta**.

**Si algo cambia:**

- Quiere más unidades de las que hay: el sistema no lo permite y avisa "No hay más unidades" (RN-02).
- Falta el cliente: el botón Registrar venta no se activa y se indica "Elige o registra al cliente".
- Quiere vaciar todo: toca "vaciar" en la barra inferior.

**Resultado:** se crea la venta con folio, fecha, vendedor, cliente, productos, precios y método; el stock baja (RN-11); aparece en Historial y en la actividad de Inicio; se muestra el detalle con un mensaje de confirmación.

**Confirmación y errores:**

- Al agregar un producto, su tarjeta muestra el contador de unidades y el total de la barra cambia al instante.
- Mientras guarda, el botón dice "Registrando…" y no se puede tocar de nuevo.
- Éxito: "Venta #1016 registrada · ₡60 000". Se cierra el resumen, se vacía el carrito y se abre el detalle de la venta.
- Errores: sin cliente ("Elige o registra al cliente"); sin método de pago; el stock cambió mientras se vendía ("Solo quedan 2 de Rosa Imperial; ajusta la cantidad"); sin conexión (Reintentar, el carrito se conserva).
- Posible duplicado: misma venta al mismo cliente en menos de 10 minutos pide confirmar (RN-18).

#### CU-02 — Registrar venta a pagos

**Actor:** Vendedor o Administrador. **Objetivo:** vender permitiendo pagar en cuotas mensuales.

**Antes:** igual que CU-01.

**Pasos:**

1. Pasos 1 a 4 de CU-01.
2. Elige **A pagos**.
3. Selecciona o registra al cliente (CU-03).
4. Elige el plazo: 1, 2 o 3 meses.
5. Escribe la prima, si la hay (puede ser ₡0), y su método de pago.
6. El sistema muestra al instante el saldo a financiar y el plan: cada cuota con su fecha y monto (RN-03, RN-04).
7. Toca **Registrar venta**.

**Si algo cambia:**

- La prima es igual o mayor que el total: el sistema sugiere registrarla como venta de contado (RN-05).
- Cambia el plazo o la prima: el plan se recalcula en pantalla.

**Resultado:** se crea la venta con su plan de cuotas; la prima queda como primer pago; la venta aparece en **Por cobrar** con su saldo y próxima cuota.

**Confirmación y errores:**

- Lo mismo que CU-01, y el mensaje de éxito incluye el plan: "Venta #1017 a 3 meses registrada · primera cuota ₡16 600 el 2 dic".
- Errores: plazo sin elegir; prima igual o mayor que el total; prima con método de pago sin elegir.

#### CU-03 — Seleccionar o registrar cliente

**Actor:** Vendedor o Administrador, siempre dentro de CU-01 o CU-02. **Objetivo:** que toda venta quede ligada a un cliente identificado (RN-01).

**Pasos:**

1. En el campo **Cliente**, escribe parte del nombre o del teléfono.
2. El sistema muestra coincidencias con nombre, teléfono y, si tiene, su saldo pendiente.
3. Toca el cliente correcto.

**Si algo cambia:**

- No existe: toca **+ Nuevo cliente**, escribe nombre y teléfono (y opcionales) y guarda. Queda seleccionado sin salir de la venta.
- El teléfono ya pertenece a otro cliente: el sistema muestra ese cliente y pregunta si es la misma persona.
- El cliente tiene cuotas vencidas: se muestra un aviso visible antes de confirmar una nueva venta a pagos.

**Resultado:** la venta queda asociada al cliente; su historial de compras y saldos se puede consultar.

**Confirmación y errores:**

- Cliente elegido: su nombre y teléfono quedan fijos en el campo, con un check y la opción "Cambiar".
- Cliente nuevo guardado: "Cliente Laura Brenes guardado", y queda seleccionado en la venta.
- Errores: nombre vacío ("Escribe el nombre del cliente"); teléfono vacío o sin 8 números ("El teléfono debe tener 8 números"); teléfono ya registrado (muestra ese cliente y pregunta si es la misma persona).

**RF-CLI-01 (Debe):** el sistema guarda una lista de clientes reutilizable. **RF-CLI-02 (Debería):** desde el detalle de una venta se puede ver el resto de compras y el saldo total del mismo cliente.

### 5.2 Historial

#### CU-04 — Consultar historial y detalle de venta

**Actor:** Vendedor o Administrador. **Objetivo:** encontrar una venta y ver todo lo que pasó con ella.

**Pasos:**

1. Abre **Historial**. Ve las ventas agrupadas por día (Hoy, Ayer, fechas), con el total vendido de cada día.
2. Cada venta muestra cliente, folio, cantidad de artículos, hora, total y una etiqueta: Contado, A pagos, Pagada, Vencida o Anulada.
3. Filtra con un toque (Todas, De contado, A pagos, Anuladas) o busca por cliente o folio.
4. Toca una venta para ver su detalle: cliente y teléfono, quién vendió, productos, total y, si es a pagos, el plan de cuotas con su estado y los pagos recibidos.

**Resultado:** la persona encuentra cualquier venta en segundos, sin ayuda.

**Confirmación y errores:** es una consulta, no guarda nada. Si la búsqueda no encuentra resultados: "No hay ventas que coincidan", con un botón para limpiar filtros. Si no carga: "No se pudo cargar el historial", con Reintentar.

**RF-HIS-01 (Debería):** filtrar por rango de fechas y por vendedor. **RF-HIS-02 (Podría):** compartir el comprobante de una venta por WhatsApp.

#### CU-05 — Anular una venta

**Actor:** Administrador. **Objetivo:** cancelar una venta registrada por error o devuelta.

**Antes:** la venta existe y no está anulada.

**Pasos:**

1. Desde el detalle de la venta, toca **Anular venta**.
2. Elige o escribe el motivo (error de registro, devolución, otro).
3. Confirma en el mensaje: "Los productos regresarán al inventario".

**Si algo cambia:** la venta a pagos ya tiene abonos: el sistema avisa cuánto dinero se recibió, para que se resuelva la devolución con el cliente fuera del sistema.

**Resultado:** la venta queda marcada "Anulada" con motivo, usuario y fecha (RN-09); el stock se devuelve; deja de contar en totales, análisis y cuentas por cobrar.

**Confirmación y errores:**

- Antes: confirmación obligatoria que explica qué pasará.
- Éxito: "Venta #1016 anulada · 2 productos regresaron al inventario". La etiqueta cambia a Anulada en ese momento y el botón Anular desaparece.
- Errores: sin motivo ("Indica el motivo de la anulación"); la venta ya fue anulada por otra persona ("Esta venta ya fue anulada por María Rojas").

### 5.3 Por cobrar

**RF-COB-01 (Debe):** la sección muestra arriba tres números: total por cobrar, total vencido y lo que vence en los próximos 7 días.

**RF-COB-02 (Debe):** la lista muestra cada cuenta con cliente, folio, saldo, total original, una barra de avance de pago y la próxima fecha. Las vencidas van primero y en rojo.

**RF-COB-03 (Debe):** dos pestañas: Pendientes y Liquidadas.

#### CU-06 — Registrar un abono

**Actor:** Vendedor o Administrador. **Objetivo:** anotar un pago del cliente y actualizar su saldo.

**Antes:** existe una venta a pagos con saldo.

**Pasos:**

1. En **Por cobrar** (o desde el detalle de la venta), toca la cuenta del cliente.
2. Ve el plan de cuotas con su estado: Pagada, Parcial, Pendiente o Vencida.
3. El monto viene sugerido: lo vencido, o la próxima cuota. También hay botones rápidos: "Cuota" y "Todo".
4. Ajusta el monto si hace falta y elige el método de pago.
5. Toca **Guardar abono**.

**Si algo cambia:**

- El monto supera el saldo: no se permite y se muestra el saldo (RN-06).
- El abono liquida la cuenta: mensaje "Cuenta liquidada" y pasa a Liquidadas (RN-08).

**Resultado:** el pago queda registrado con fecha, monto, método y usuario; saldo, cuotas y alertas se actualizan; aparece en la actividad de Inicio.

**Confirmación y errores:**

- Mientras guarda, el botón dice "Guardando abono…" y se desactiva.
- Éxito: "Abono de ₡16 600 guardado · Saldo: ₡33 400". En la misma pantalla, el pago aparece resaltado en "Pagos recibidos", la cuota cambia de estado y el saldo y la barra de avance se actualizan.
- Después de guardar, el formulario de abono se cierra. Para registrar otro, hay que tocar **Registrar otro abono** (RF-FB-05).
- Si el abono liquida la cuenta: "Cuenta liquidada · Laura Brenes ya no tiene saldo".
- Errores: monto vacío o ₡0 ("Escribe un monto mayor a ₡0"); monto mayor que el saldo ("El saldo es ₡33 400"); método sin elegir; sin conexión (Reintentar).
- Posible duplicado: mismo monto para la misma venta en menos de 10 minutos pide confirmar (RN-18).

#### CU-07 — Enviar recordatorio de cobro

**Actor:** Vendedor o Administrador. **Objetivo:** recordar amablemente al cliente su cuota.

**Pasos:**

1. En la cuenta del cliente, toca **Enviar recordatorio por WhatsApp**.
2. Se abre WhatsApp con un mensaje ya escrito: saludo, nombre del negocio, monto y fecha de la cuota y saldo pendiente.
3. La persona revisa el mensaje y lo envía desde su propio WhatsApp.

**Resultado:** el cliente recibe el recordatorio. **RF-COB-04 (Podría):** registrar la fecha del último recordatorio enviado. **RF-COB-05 (Podría):** recordatorios automáticos programados.

**Confirmación y errores:**

- El sistema no puede saber si el mensaje se envió desde WhatsApp. Por eso, al volver pregunta "¿Enviaste el recordatorio?" (Sí / No). Si la respuesta es Sí, la cuenta muestra "Recordatorio enviado hoy".
- Errores: cliente sin teléfono válido ("Agrega un teléfono al cliente para enviarle recordatorios"); WhatsApp no se pudo abrir (ofrece **Copiar mensaje**, con confirmación "Mensaje copiado").

### 5.4 Inventario

**RF-INV-01 (Debe):** cada producto tiene código (generado automáticamente), nombre, categoría, precio de venta, costo, stock y stock mínimo. **RF-INV-02 (Debe):** las categorías iniciales son Perfumes y Bisutería; el Administrador puede agregar más sin ayuda técnica.

#### CU-08 — Consultar inventario

**Actor:** Vendedor o Administrador. **Objetivo:** saber qué hay y qué falta.

**Pasos:**

1. Abre **Inventario**, pestaña **Inventario actual**.
2. Arriba ve el total de unidades y el valor del inventario a precio de venta (el Administrador también ve el valor a costo).
3. Ve la lista con nombre, código, precio, unidades y una etiqueta: OK, Bajo o Agotado (RN-10).
4. Busca por nombre o código, filtra por categoría o toca **Stock bajo** para ver solo lo que hay que reponer.
5. Toca un producto para ver su detalle y cuántas unidades se han vendido.

**Resultado:** la persona sabe al instante qué reponer. Desde el detalle puede ir directo a vender ese producto o a ingresar stock.

**Confirmación y errores:** es una consulta, no guarda nada. Sin resultados: "No hay productos que coincidan", con un botón para limpiar filtros.

#### CU-09 — Ingresar stock de un producto existente

**Actor:** Administrador. **Objetivo:** sumar mercadería que llegó.

**Pasos:**

1. En **Inventario**, pestaña **Agregar stock**, elige **Producto existente**.
2. Selecciona el producto (muestra cuántas unidades hay hoy).
3. Escribe la cantidad con − / + o el teclado, y el costo unitario si cambió.
4. Toca **Guardar ingreso**.

**Resultado:** el stock aumenta; el ingreso queda registrado con usuario y fecha y aparece en "Últimos ingresos" y en la actividad de Inicio.

**Confirmación y errores:**

- Mientras guarda, el botón dice "Guardando ingreso…" y se desactiva.
- Éxito: "Ingreso guardado · Aretes argolla dorada: 18 → 30 unidades". El formulario se limpia, el ingreso aparece resaltado arriba en "Últimos ingresos" y, si ya no aplica, desaparece la alerta de stock bajo.
- Errores: producto sin elegir; cantidad vacía o 0; costo con letras o símbolos.
- Posible duplicado: mismo producto y misma cantidad en menos de 10 minutos pide confirmar (RN-18).

**RF-INV-03 (Podría):** registrar proveedor y número de factura del ingreso.

#### CU-10 — Crear un producto nuevo

**Actor:** Administrador. **Objetivo:** agregar un artículo que no estaba en el catálogo.

**Pasos:**

1. En **Agregar stock**, elige **Producto nuevo**.
2. Escribe nombre, elige categoría, precio de venta, stock mínimo, cantidad inicial y costo.
3. Toca **Guardar ingreso**.

**Si algo cambia:** ya existe un producto con nombre igual o muy parecido: el sistema lo muestra y pregunta si se quiere sumar stock a ese.

**Resultado:** el producto queda disponible para vender con su código nuevo.

**Confirmación y errores:**

- Éxito: "Producto creado · Perfume Jazmín 50 ml (PER-006), 12 unidades", con las opciones **Ver producto** y **Agregar otro**.
- Errores: nombre vacío; categoría sin elegir; precio vacío o ₡0; cantidad vacía; nombre igual o muy parecido a uno existente (aviso con opción de sumar stock a ese).

**RF-INV-04 (Podría):** agregar una foto al producto desde el celular.

#### CU-11 — Editar producto o ajustar conteo

**Actor:** Administrador. **Objetivo:** corregir datos o igualar el stock al conteo físico.

**Pasos:**

1. Toca el producto en la lista.
2. Cambia nombre, precio, costo, stock mínimo o el stock (conteo físico). El sistema muestra el margen por unidad.
3. Toca **Guardar cambios**.

**Resultado:** los datos se actualizan. Un cambio de stock queda registrado como "Ajuste de conteo: 5 → 4" con usuario y fecha (RN-12). Las ventas pasadas no cambian (RN-16).

**Confirmación y errores:**

- Si no se cambió nada, el botón Guardar cambios está desactivado.
- Éxito: "Cambios guardados · Collar perla cultivada"; si cambió el stock: "Stock ajustado: 5 → 4". La lista muestra los valores nuevos de inmediato.
- Errores: precio vacío o ₡0; stock negativo; stock mínimo vacío.
- Aviso (no bloquea): precio menor que el costo ("El precio es menor que el costo. ¿Guardar de todos modos?").
- Al cerrar con cambios sin guardar: "¿Descartar cambios?" (RF-FB-08).

**RF-INV-05 (Debería):** desactivar un producto que ya no se vende, sin borrarlo.

### 5.5 Inicio (tablero)

**RF-DSH-01 (Debe):** al abrir la app se ve un saludo y cuatro números que se pueden tocar: ventas de hoy, ventas de los últimos 30 días, total por cobrar y cantidad de productos con stock bajo. Cada uno lleva a la sección correspondiente.

#### CU-12 — Revisar actividad y alertas

**Actor:** Vendedor o Administrador. **Objetivo:** saber qué pasó y qué requiere atención hoy.

**Pasos:**

1. En **Inicio**, pestaña **Actividad**: lista de lo más reciente (ventas, abonos, ingresos de stock, productos nuevos, anulaciones), con hace cuánto pasó y el monto.
2. Pestaña **Estado**: alertas ordenadas por urgencia.
   - _Urgente:_ cuotas vencidas, productos agotados.
   - _Atención:_ cuotas que vencen en los próximos 7 días, productos con stock bajo.
3. Toca una alerta para ir directo a la cuenta o al producto.

**Si algo cambia:** no hay alertas: se muestra "Todo en orden".

**Resultado:** la persona sabe a quién cobrar y qué reponer sin revisar cada sección.

**Confirmación y errores:** cuando se resuelve una alerta en otra sección (por ejemplo, un abono que cubre la cuota vencida), la alerta desaparece de Estado y el contador rojo de la barra se actualiza en ese momento. Si no carga: "No se pudo cargar la actividad", con Reintentar.

#### CU-13 — Consultar análisis básico

**Actor:** Vendedor o Administrador. **Objetivo:** ver cómo van las ventas.

**Pasos:**

1. En **Inicio**, pestaña **Análisis**, elige el periodo: 7 o 30 días.
2. Ve cuatro números: vendido, cobrado (dinero realmente recibido), venta promedio y, solo el Administrador, ganancia bruta y margen.
3. Ve un gráfico de ventas por día (contado y a pagos), la proporción contado vs. a pagos, los productos más vendidos y las ventas por categoría.

**Resultado:** una lectura rápida del negocio. Este módulo es deliberadamente básico en la primera versión y crecerá con el uso (ver sección 6.2).

**Confirmación y errores:** es una consulta, no guarda nada. Periodo sin ventas: "No hay ventas en este periodo", en lugar de gráficos vacíos.

### 5.6 Perfil

#### CU-14 — Iniciar sesión y gestionar perfil

**Actor:** cualquier usuario. **Objetivo:** entrar de forma segura y ver su propia información.

**Pasos:**

1. Abre la app y entra con su usuario (teléfono o correo) y una clave o PIN.
2. En **Perfil** ve su nombre, rol, lo que su rol le permite y sus ventas de los últimos 30 días.
3. Puede cambiar su clave y cerrar sesión.

**Si algo cambia:** olvidó la clave: el Administrador la restablece (en la primera versión no hace falta recuperación automática).

**Resultado:** cada acción queda a nombre de quien la hizo.

**Confirmación y errores:**

- Inicio de sesión con error: "Usuario o clave incorrectos", sin decir cuál de los dos. Después de 5 intentos fallidos, la entrada se bloquea 15 minutos con un mensaje que lo explica.
- Usuario desactivado: "Tu usuario está desactivado. Habla con el administrador".
- Cambio de clave: "Clave actualizada". Error si la clave actual es incorrecta o la nueva no cumple el mínimo.
- Cerrar sesión: pide confirmación y vuelve a la pantalla de entrada.

**RF-PER-01 (Debería):** la sesión se mantiene abierta en el celular de confianza para no pedir la clave en cada venta.

#### CU-15 — Administrar usuarios y negocio

**Actor:** Administrador. **Objetivo:** controlar quién usa el sistema y los datos generales.

**Pasos:**

1. En **Perfil → Usuarios**, agrega una persona (nombre, teléfono o correo, rol) o cambia su rol, o la desactiva.
2. En **Perfil → Negocio**, cambia nombre del negocio, categorías y métodos de pago.
3. En **Perfil → Datos**, descarga un respaldo completo (ventas, clientes, inventario) en un archivo que se abre en Excel o Google Sheets.

**Resultado:** el negocio controla sus accesos y tiene una copia de su información cuando quiera.

**Confirmación y errores:**

- Usuario creado: "Luis Mora agregado como Vendedor". Cambio de rol: "Luis Mora ahora es Administrador".
- Desactivar usuario: confirmación previa y luego "Luis Mora desactivado".
- Datos del negocio, categorías o métodos de pago: "Cambios guardados".
- Respaldo: "Respaldo descargado: ventas-2026-11-02.xlsx", o "No se pudo generar el respaldo. Intenta de nuevo".
- Errores: teléfono o correo ya usado por otro usuario; no se permite desactivar ni quitar el rol al único Administrador ("Debe quedar al menos un administrador").

## 6. Requerimientos no funcionales y evolución

Estas son las cualidades que el sistema debe tener, sin entrar en tecnología. Servirán de punto de partida para los requerimientos técnicos.

### 6.1 Cualidades del sistema

| ID     | Cualidad           | Requerimiento                                                                                                                                          |
| ------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RNF-01 | Facilidad de uso   | Una persona sin experiencia registra su primera venta en menos de 5 minutos, sin manual.                                                               |
| RNF-02 | Rapidez            | Cada pantalla responde en menos de 2 segundos con datos móviles 4G.                                                                                    |
| RNF-03 | Dispositivos       | Funciona en celulares Android y iPhone de los últimos 5 años y en computadoras con Chrome, Edge o Safari.                                              |
| RNF-04 | Datos compartidos  | Todos los usuarios ven la misma información al mismo tiempo, desde cualquier dispositivo.                                                              |
| RNF-05 | Seguridad          | Acceso solo con usuario y clave; cada persona ve únicamente lo que su rol permite; conexión cifrada.                                                   |
| RNF-06 | Privacidad         | Los datos de clientes se usan solo para ventas y cobros, conforme a la Ley 8968 de protección de datos personales de Costa Rica.                       |
| RNF-07 | Respaldo           | Copia automática de toda la información al menos una vez al día; nada se pierde si se pierde un celular.                                               |
| RNF-08 | Trazabilidad       | Toda creación o cambio guarda usuario, fecha y hora (RN-12).                                                                                           |
| RNF-09 | Bajo mantenimiento | El negocio no necesita a un técnico para el uso diario; costos mensuales bajos y predecibles.                                                          |
| RNF-10 | Crecimiento        | Se pueden agregar usuarios, roles, categorías y productos sin reconstruir el sistema. Capacidad inicial: 10 usuarios, 2 000 productos y 50 000 ventas. |
| RNF-11 | Disponibilidad     | Disponible en horario de atención todos los días; mantenimientos fuera de ese horario.                                                                 |

### 6.2 Evolución futura (fuera de la primera versión)

El análisis, las tendencias y las proyecciones no se definen todavía: madurarán con el uso y con los datos que se vayan acumulando. La primera versión solo debe guardar la información completa (cliente, vendedor, producto, precio, costo, fecha) para que esos análisis sean posibles después.

Ideas registradas para revisar más adelante:

- Tendencias de venta por producto, categoría, temporada y vendedor.
- Proyección de stock: cuándo se acabará un producto según su ritmo de venta.
- Clientes frecuentes, clientes inactivos y comportamiento de pago.
- Comisiones por vendedor.
- Intereses o recargos por atraso en ventas a pagos.
- Varias sucursales o puntos de venta.
- Facturación electrónica.
- Funcionamiento sin internet con sincronización posterior.
- Catálogo para clientes y pedidos por WhatsApp.

## 7. Trazabilidad, preguntas abiertas y próximos pasos

### 7.1 Relación con el prototipo

| Caso de uso               | En el prototipo                       | Qué falta o cambia                                                                                      |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| CU-01 Venta de contado    | Sí                                    | Cliente obligatorio (RN-01); quitar "Cliente de mostrador".                                             |
| CU-02 Venta a pagos       | Sí                                    | Pedir teléfono obligatorio; usar la lista de clientes.                                                  |
| CU-03 Cliente             | Parcial (texto libre)                 | Lista de clientes con búsqueda, alta rápida y control de duplicados.                                    |
| CU-04 Historial           | Sí                                    | Filtros por fecha y vendedor (Debería).                                                                 |
| CU-05 Anular              | Sí                                    | Pedir motivo; avisar si ya hubo abonos.                                                                 |
| CU-06 Abono               | Sí                                    | Sin cambios.                                                                                            |
| CU-07 Recordatorio        | Sí                                    | Sin cambios.                                                                                            |
| CU-08 a CU-11 Inventario  | Sí                                    | Categorías configurables; aviso de producto duplicado; desactivar productos.                            |
| CU-12 Actividad y alertas | Sí                                    | Sin cambios.                                                                                            |
| CU-13 Análisis            | Sí (básico)                           | Se mantiene básico; evoluciona después.                                                                 |
| CU-14 Sesión y perfil     | Parcial (cambio de usuario de prueba) | Inicio de sesión real con clave o PIN.                                                                  |
| CU-15 Usuarios y negocio  | Parcial                               | Alta y desactivación de usuarios; categorías y métodos de pago; respaldo en archivo de hoja de cálculo. |

_Cambio que aplica a todo el prototipo:_ la versión 1 no mostraba confirmación visible en algunas acciones, como los abonos y los ingresos de stock. La versión 2 del prototipo (2 nov 2026) ya aplica el estándar de la sección 4.1, la regla RN-18 y el cliente obligatorio de RN-01.

### 7.2 Preguntas abiertas

- [ ] ¿Se le puede vender a pagos a un cliente que tiene cuotas vencidas, o solo se le avisa?
- [ ] ¿Las cuotas son siempre mensuales, o también quincenales?
- [ ] ¿Se cobrarán intereses o recargos por atraso en el futuro?
- [ ] ¿Se necesitan descuentos en una venta (por monto o porcentaje)?
- [ ] ¿Cómo se manejan las devoluciones o cambios de producto, aparte de anular la venta completa?
- [ ] ¿Se requiere facturación electrónica desde la primera versión?
- [ ] ¿Hay momentos sin internet en el punto de venta (ferias, visitas a domicilio)?
- [ ] ¿Cuántas personas usarán el sistema el primer año?

### 7.3 Próximos pasos

1. Revisar y aprobar este documento con la familia; responder las preguntas abiertas.
2. Ajustar el prototipo con los cambios de la tabla 7.1, empezando por RN-01.
3. Levantar los requerimientos técnicos: presupuesto mensual, hospedaje, base de datos, inicio de sesión, respaldos y tecnología (tech stack).
4. Definir el plan de construcción por etapas.
