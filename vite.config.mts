// Utilities
import { fileURLToPath, URL } from 'node:url';
import Vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import Components from 'unplugin-vue-components/vite';

// Plugins
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    Vue({
      template: { transformAssetUrls },
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    Vuetify({
      autoImport: true,
    }),
    Components({
      dts: true,
      resolvers: [
        // define in PascalCase version of the kebab-case that is used in template
        (name) => {
          if (name === 'WwtLoader') {
            return { from: '@/components/Loader.vue' };
          }
          if (name === 'WebglTest') {
            return { from: '@/components/WebGlTest.vue' };
          }
        },
      ],
    }),
  ],
  optimizeDeps: {
    exclude: [
      'vuetify',
    ],
    // a yarn-linked package is not pre-bundled by default, so its UMD entry would be served raw
    include: [
      '@wwtelescope/engine',
      '@wwtelescope/engine-pinia',
    ],
  },
  define: { 'process.env': {} },
  
  json: {
    stringify: true,
  },
  resolve: {
    // i don't know if this is standard. but toolkit package.json has the es modules on the "module" field
    // and at least for local development, vites needs to check module first. check here if it all 
    // blows up once we start using the vue-toolkit from npm
    mainFields: ['module', 'browser'],
    // https://vueschool.io/articles/vuejs-tutorials/import-aliases-in-vite/
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ],
  },
  server: {},
  css: {
    preprocessorOptions: {
      less: {
        math: 'always',
      },
    },
  },
});
