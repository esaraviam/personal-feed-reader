import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.svg'],
      manifest: {
        name: 'Daily Brief',
        short_name: 'Daily Brief',
        description: 'Personal, bias-minimized RSS reader. High-signal news in ≤10 minutes.',
        theme_color: '#2563eb',
        background_color: '#f9fafb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // App shell: cache-first (JS/CSS/HTML + JSON data files like recommended-feeds)
        globPatterns: ['**/*.{js,css,html,svg,woff2,png,ico,json}'],
        runtimeCaching: [
          {
            // Self-hosted CF worker proxy: network-first, fall back to cache
            urlPattern: /^https:\/\/.*\.workers\.dev\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'rss-proxy-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
