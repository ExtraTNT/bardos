import { build, context } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const isDev = process.argv.includes('--dev');

const esbuildOptions = {
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'iife',
  outfile: 'dist/index.js',
  minify: !isDev,
  sourcemap: isDev,
  target: ['es2020'],
  logLevel: 'info',
};

const prepareDistDir = () => {
  mkdirSync('dist', { recursive: true });

  // Copy index.html, rewriting the module script tag to a plain deferred one
  const html = readFileSync('src/index.html', 'utf8')
    .replace(
      /<script type="module" src="\.\/index\.js"><\/script>/,
      '<script src="index.js" defer></script>'
    );
  writeFileSync('dist/index.html', html);

  // Copy style.css if it exists
  if (existsSync('src/style.css')) {
    copyFileSync('src/style.css', 'dist/style.css');
  }
};

prepareDistDir();

if (isDev) {
  const ctx = await context(esbuildOptions);
  const { host, port } = await ctx.serve({ servedir: 'dist', port: 3000 });
  console.log(`  Dev server -> http://localhost:${port}`);
} else {
  await Promise.all([
    build(esbuildOptions),
    build({ ...esbuildOptions, outfile: 'dist/index-full.js', minify: false }),
  ]);
}
