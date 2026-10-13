/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// base './' permite publicar la app en cualquier carpeta (GitHub Pages, Netlify, etc.)
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-64.png', 'icono-180.png'],
      manifest: {
        name: 'AgroDecide',
        short_name: 'AgroDecide',
        description: 'Del dato a la decisión: costos y márgenes de tu campo.',
        lang: 'es-AR',
        theme_color: '#1C3A35',
        background_color: '#FBF8F1',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
