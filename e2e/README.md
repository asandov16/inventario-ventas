# Pruebas de punta a punta (Playwright)

| Carpeta  | Cuándo corre                                       | Contra qué                                                                                                   |
| -------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `smoke/` | En cada PR (job `e2e`)                             | La versión de producción de la app, con Supabase local y el seed (ADR-039). Chromium con viewport de celular |
| `full/`  | Cada noche y antes de producción, desde la Etapa 3 | Los 15 casos de uso en Chromium y WebKit, contra staging (ADR-024)                                           |

## Correrlas en la Mac

```bash
pnpm db:reset    # base local con el seed, desde un estado conocido
pnpm test:e2e    # construye la app y corre smoke/ con el Chrome instalado
```

Si una prueba falla, Playwright guarda una traza en `e2e/test-results/`. Se abre con:

```bash
pnpm --filter e2e exec playwright show-trace <ruta del trace.zip>
```
