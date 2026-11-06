# ADR-041 — DoD de la PWA sin la auditoría PWA de Lighthouse

- **Estado:** Aceptada
- **Fecha:** 2026-11-05
- **Origen:** Plan de la Etapa 2 (F3-T09, DoD F3)

## Contexto

El DoD de F3 pide "Lighthouse PWA sin errores". Lighthouse eliminó la categoría PWA en su versión 12, así que ese criterio ya no se puede medir.

## Decisión

El DoD de la PWA se cumple con tres comprobaciones:

1. **Playwright (`e2e/smoke/pwa.spec.ts`), en cada PR:**
   - el manifest tiene nombre, nombre corto, `start_url`, `display: standalone` e íconos de 192 y 512 px, uno de ellos _maskable_;
   - los íconos responden como PNG;
   - un service worker queda activo desde la pantalla de entrada.
2. **Instalación real en Android y en iPhone** desde la vista previa de staging, en la revisión de cierre de la etapa.
3. **Las métricas de rendimiento de Lighthouse** quedan para F9-T04: rendimiento móvil de al menos 90 y menos de 250 KB de JavaScript inicial.

## Consecuencias

- La instalabilidad se prueba en cada cambio, no solo a mano.
- El tamaño del JavaScript se anota en cada PR. Hoy: 181 KB comprimidos.
