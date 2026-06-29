// Standalone Vite build for the Electron main, preload, and renderer bundles.
// Replaces `electron-forge package`, which infinite-loops with Vite 8 on this setup.
// Produces the same output layout Forge would (.vite/build + .vite/renderer/main_window)
// so electron-builder can package it. See electron-builder.json + package.json "dist".
import { build } from 'vite';
import { builtinModules } from 'node:module';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const nodeExternals = [
  'electron',
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
];

async function buildMain() {
  await build({
    configFile: false,
    define: {
      // In production there is no dev server; the renderer is loaded from disk.
      MAIN_WINDOW_VITE_DEV_SERVER_URL: 'undefined',
      MAIN_WINDOW_VITE_NAME: JSON.stringify('main_window'),
    },
    // Build for the Node/Electron-main environment so Vite uses node resolution
    // (no browser fields, no `window`). `noExternal: true` bundles npm deps;
    // only electron + node builtins stay external.
    ssr: { noExternal: true },
    resolve: { conditions: ['node'] },
    build: {
      outDir: '.vite/build',
      emptyOutDir: true,
      minify: false,
      ssr: true,
      rollupOptions: {
        input: 'src/main.ts',
        external: nodeExternals,
        output: {
          format: 'cjs',
          entryFileNames: 'main.js',
          inlineDynamicImports: true,
        },
      },
    },
  });
}

async function buildPreload() {
  await build({
    configFile: false,
    ssr: { noExternal: true },
    resolve: { conditions: ['node'] },
    build: {
      outDir: '.vite/build',
      emptyOutDir: false, // keep main.js
      minify: false,
      ssr: true,
      rollupOptions: {
        input: 'src/preload.ts',
        external: nodeExternals,
        output: {
          format: 'cjs',
          entryFileNames: 'preload.js',
          inlineDynamicImports: true,
        },
      },
    },
  });
}

async function buildRenderer() {
  await build({
    configFile: false,
    base: './', // relative asset paths so loadFile() works from the asar
    plugins: [react(), tailwindcss()],
    build: {
      outDir: '.vite/renderer/main_window',
      emptyOutDir: true,
      rollupOptions: { input: 'index.html' },
    },
  });
}

async function run() {
  console.log('Building main process...');
  await buildMain();
  console.log('Building preload...');
  await buildPreload();
  console.log('Building renderer...');
  await buildRenderer();
  console.log('Vite build complete: .vite/build + .vite/renderer/main_window');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
