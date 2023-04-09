import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { NgmiPolyfill } from "vite-plugin-ngmi-polyfill";

// https://vitejs.dev/config/

const config = {

  base: "/reveal/", // https://hrishikeshpathak.com/blog/svelte-gh-pages/
  plugins: [svelte(), NgmiPolyfill()],

  optimizeDeps: {
      esbuildOptions: {
          define: {
              global: 'globalThis',
          },
      },
  }
};

export default config;