# Runbook — Cambiar el nombre y el ícono de la app

La app usa un nombre genérico y un ícono provisional: la inicial sobre el color de la marca. El nombre real del negocio vive en la base y nunca en el repositorio (D-19, ADR-019).

## Nombre del negocio en la app

Se cambia desde **Perfil → Negocio** (llega en la Etapa 3). El encabezado de la app lo lee de la base.

## Nombre de la app instalada

Es el que muestra el celular bajo el ícono. Sale de la variable `VITE_APP_NAME` al construir la app:

| Entorno    | Dónde se define                                     |
| ---------- | --------------------------------------------------- |
| Local      | `web/.env.local`                                    |
| Staging    | Workflow `staging`: "Inventario y Ventas · Pruebas" |
| Producción | Entorno `production` de GitHub, en la Etapa 4       |

Si el nombre pasa de 12 caracteres, el nombre corto usa solo la primera palabra.

## Íconos

Los archivos están en `web/public/icons/`:

| Archivo                | Tamaño    | Uso                                     |
| ---------------------- | --------- | --------------------------------------- |
| `icon-192.png`         | 192 × 192 | Android, pestaña del navegador          |
| `icon-512.png`         | 512 × 512 | Android; también es el ícono _maskable_ |
| `apple-touch-icon.png` | 180 × 180 | iPhone                                  |

Para cambiarlos:

1. Prepara una imagen cuadrada de 512 × 512 con el fondo de color hasta los bordes. Deja el dibujo dentro del 80 % central, porque Android recorta las esquinas del ícono _maskable_.
2. En la Mac, crea los otros tamaños:

   ```bash
   sips -z 192 192 icon-512.png --out icon-192.png
   sips -z 180 180 icon-512.png --out apple-touch-icon.png
   ```

3. Reemplaza los tres archivos y abre un PR. `pwa.spec.ts` verifica que respondan como PNG.
4. En los celulares ya instalados, el ícono cambia cuando la app se actualiza. A veces hay que quitarla y volver a instalarla.

Si el ícono lleva el logo real del negocio, **no lo subas a este repositorio público**. Pide a Claude Code un plan para servirlo desde la configuración del negocio.
