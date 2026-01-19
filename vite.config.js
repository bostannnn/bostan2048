import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Photo 2048',
        short_name: 'Photo2048',
        description: 'A modern 2048 game',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'assets/classic/2048.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'assets/classic/2048.jpg',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      }
    })
  ]
});