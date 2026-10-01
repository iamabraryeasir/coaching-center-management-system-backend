import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  dts: false,
  outExtension() {
    return {
      js: '.js',
    };
  },
  // biome-ignore lint/suspicious/useAwait: tsup onSuccess type requires a Promise-returning function
  onSuccess: async () => {
    const srcTemplates = path.resolve('src/templates');
    const distTemplates = path.resolve('dist/templates');

    if (fs.existsSync(srcTemplates)) {
      fs.cpSync(srcTemplates, distTemplates, { recursive: true });
    }
  },
});
