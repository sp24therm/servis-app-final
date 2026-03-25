import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { writeFileSync, readFileSync } from 'fs';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'sw-version',
        buildStart() {
          const version = Date.now();
          const swPath = 'public/sw.js';
          try {
            let sw = readFileSync(swPath, 'utf-8');
            sw = sw.replace(
              /const CACHE_NAME = ['"]sptherm-.*['"]/,
              `const CACHE_NAME = 'sptherm-${version}'`
            );
            writeFileSync(swPath, sw);
          } catch (err) {
            console.error('Failed to update Service Worker version:', err);
          }
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
