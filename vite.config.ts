import path from 'path'
import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import manifest from './manifest.json'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest })
  ],
  server: {
    strictPort: true,
    port: 5174,
    hmr: {
        clientPort: 5174
    }
  },
  build: {
    rollupOptions: {
      input: {
        welcome: 'bookmark.html',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
})
