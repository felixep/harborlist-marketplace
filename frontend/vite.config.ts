/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@harborlist/shared-types': '/workspace/packages/shared-types/src/index.ts',
    },
  },
  optimizeDeps: {
    include: ['@harborlist/shared-types'],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    hmr: {
      host: 'local.harborlist.com',
      clientPort: 443,
      protocol: 'wss',
    },
    allowedHosts: [
      'local.harborlist.com',
      'localhost',
      '127.0.0.1',
    ],
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})