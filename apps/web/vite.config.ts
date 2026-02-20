import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    devtools(),
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart(),
    nitro(),
    viteReact(),
  ],
  server: {
    port: 3000,
  },
  nitro: {},
})
