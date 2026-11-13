const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

let entry = 'jogo.js';
if (!fs.existsSync(entry)) {
  const skip = ['automate.js', 'build.js', 'offline-shim.js', 'bundle.js'];
  const cands = fs.readdirSync('.').filter(f => f.endsWith('.js') && skip.indexOf(f) === -1);
  cands.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
  entry = cands[0];
}
console.log('[build] entry: ' + entry);

esbuild.build({
  entryPoints: [entry],
  bundle: true,
  outfile: 'bundle.js',
  format: 'esm',       // <-- ESM permite top-level await
  platform: 'browser',
  target: ['esnext'],  // <-- sintaxe moderna
  sourcemap: false,
  minify: false,
  resolveExtensions: ['.js'],
  plugins: [{
    name: 'add-dot-slash',
    setup(b) {
      b.onResolve({ filter: /^[a-zA-Z0-9_-]+\.js$/ }, (args) => {
        const c = path.join(args.resolveDir, args.path);
        if (fs.existsSync(c)) return { path: c };
        return null;
      });
    }
  }]
}).then(() => console.log('OK bundle.js gerado (ESM)'))
  .catch((e) => { console.error(e); process.exit(1); });