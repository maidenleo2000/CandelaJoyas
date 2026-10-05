import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { pwaPlugin } from './build/pwaPlugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), pwaPlugin()],
})
