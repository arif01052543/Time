import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // เปลี่ยนจาก . เป็น /
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Time Track',
        short_name: 'TimeTrack',
        description: 'ระบบลงเวลาเข้า-ออกงานพนักงาน',
        theme_color: '#15803d',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});