import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/bostan2048/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module'
      },
      manifest: {
        name: 'Photo 2048',
        short_name: 'Photo2048',
        description: 'A modern 2048 game',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#F2F2F7',
        theme_color: '#F2F2F7',
        orientation: 'portrait',
        icons: [
          {
            src: 'assets/classic/2048.jpg',
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'any maskable'
          },
          {
            src: 'assets/classic/2048.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
});
