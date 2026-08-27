import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

const wailsConfigPath = fileURLToPath(new URL('../wails.json', import.meta.url))

// Single source of truth for the app version is wails.json -> info.productVersion.
// This also drives the exe/installer version metadata, so the sidebar matches.
let appVersion = pkg.version
try {
  const wailsConfig = JSON.parse(readFileSync(wailsConfigPath, 'utf8'))
  if (typeof wailsConfig?.info?.productVersion === 'string' && wailsConfig.info.productVersion) {
    appVersion = wailsConfig.info.productVersion
  }
} catch {
  // fall back to package.json version if wails.json is unavailable
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
})