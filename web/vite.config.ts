import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Generic installed-app name (D-19). Overridable per environment through VITE_APP_NAME.
const DEFAULT_APP_NAME = 'Inventario y Ventas';
const BRAND_COLOR = '#5b2a5e';
const BACKGROUND_COLOR = '#f7f3ee';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, 'VITE_');
  const appName = env.VITE_APP_NAME ?? DEFAULT_APP_NAME;
  process.env.VITE_APP_NAME = appName;

  return {
    plugins: [
      react(),
      // Installable app (F3-T09, RF-UX-11/12): manifest, provisional icons and a
      // cached shell. The new-version prompt lives in app/UpdatePrompt.tsx.
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['icons/apple-touch-icon.png'],
        manifest: {
          name: appName,
          short_name: appName.length > 12 ? (appName.split(' ')[0] ?? appName) : appName,
          lang: 'es',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: BRAND_COLOR,
          background_color: BACKGROUND_COLOR,
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // Only the app shell is cached; data always comes from the database (ADR-005).
          globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
          navigateFallback: '/index.html',
          cleanupOutdatedCaches: true,
        },
      }),
    ],
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
