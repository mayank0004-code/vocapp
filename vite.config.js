import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Vocapp',
        short_name: 'Vocapp',
        description: 'Apple-inspired vocabulary builder with spaced repetition.',
        theme_color: '#fbfbfd',
        background_color: '#fbfbfd',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'icon-512.jpg',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      }
    })
  ],
})
