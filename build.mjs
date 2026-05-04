import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'fs';

mkdirSync('./dist', { recursive: true });

await esbuild.build({
  entryPoints: ['./src/Code.ts'],
  bundle: true,
  outfile: './dist/Code.js',
  format: 'iife',
  globalName: 'GAS',
  platform: 'browser',
  target: 'es2019',
  footer: {
    js: 'function execute() { GAS.execute(); }',
  },
});

copyFileSync('./src/appsscript.json', './dist/appsscript.json');
