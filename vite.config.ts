import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For GitHub Pages: set VITE_BASE_PATH (e.g. "/cisco-device-matrix/")
// or rely on the default "/" for local dev and custom-domain deploys.
const basePath = process.env.VITE_BASE_PATH ?? '/'

export default defineConfig({
  base: basePath,
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
})
