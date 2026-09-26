import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Configuración de Vite para WAMI.
// PWA: genera manifest + service worker automáticamente (vite-plugin-pwa)
// para poder instalar la app en la pantalla de inicio del celular.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'WAMI',
        short_name: 'WAMI',
        description: 'Administra pedidos, ventas, gastos y finanzas de WAMI',
        theme_color: '#26231F',
        background_color: '#FBF8F3',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // No cacheamos llamadas a Supabase: los datos del negocio siempre
        // deben venir en vivo, nunca de una copia vieja en caché.
        navigateFallbackDenylist: [/^\/supabase\//]
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  },
  preview: {
    host: true,
    port: 4173
  }
})
