import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  // GitHub Pages needs the repo base; local/dev should stay at root.
  base: command === 'build' ? '/async-sound-board/' : '/',
  plugins: [react()],
}))
