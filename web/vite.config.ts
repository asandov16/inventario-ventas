import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// Generic installed-app name (D-19). Overridable per environment through VITE_APP_NAME.
const DEFAULT_APP_NAME = 'Inventario y Ventas';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, 'VITE_');
  process.env.VITE_APP_NAME = env.VITE_APP_NAME ?? DEFAULT_APP_NAME;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      sourcemap: true,
    },
  };
});
