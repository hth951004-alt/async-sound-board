import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/async-sound-board/',
  plugins: [react()],
})
