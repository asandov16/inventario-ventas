# Prototipo v2

`v2.html` es la referencia visual y de comportamiento de la app: tokens de color, pantallas, cálculo de cuotas (`buildPlan`), estado de cuenta (`acct`) y mensajes de confirmación y error. Se abre directo en el navegador y guarda sus datos en `localStorage`.

Esta copia no identifica al negocio: el nombre se cambió por "Mi Negocio" y los teléfonos por números ficticios (8000-00NN). Los nombres de personas son datos de ejemplo.

Diferencias conocidas con lo que se construye (mandan los documentos y los ADR):

- Las cuotas se desbordan de mes (31 ene → 3 mar); se corrige en ADR-009.
- Los datos viven en el navegador; en la app viven en Postgres.
- El cambio de usuario es de prueba; en la app hay inicio de sesión real.
