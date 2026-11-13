const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const SKIP = ['automate.js', 'build.js', 'offline-shim.js', 'bundle.js', 'package-lock.json'];

// ---------- 0) esbuild ----------
if (!fs.existsSync(path.join(ROOT, 'node_modules', 'esbuild'))) {
  console.log('[automate] Instalando esbuild...');
  execSync('npm init -y', { stdio: 'inherit' });
  execSync('npm install --save-dev esbuild', { stdio: 'inherit' });
}

// ---------- 1) i18n/en.js ----------
const i18nDir = path.join(ROOT, 'i18n');
if (!fs.existsSync(i18nDir)) fs.mkdirSync(i18nDir, { recursive: true });
const enFile = path.join(i18nDir, 'en.js');
if (!fs.existsSync(enFile)) {
  fs.writeFileSync(enFile, 'export const EN = {};\n');
  console.log('[automate] i18n/en.js (stub) criado');
}

// ---------- 2) Branding  -> Arena (SEM tocar em "arena-") ----------
console.log('[automate] Removendo branding ...');
const exts = ['.js', '.html', '.htm', '.css', '.json', '.md', '.txt', '.svg'];
let branded = 0;
(function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
    if (e.name === 'node_modules' || e.name === '.git' || SKIP.includes(e.name)) return;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    if (exts.indexOf(path.extname(e.name).toLowerCase()) === -1) return;
    let src = fs.readFileSync(full, 'utf8');
    const orig = src;
    src = src.replace(//gi, 'Arena');   // <-- só isso, nada mais
    if (src !== orig) { fs.writeFileSync(full, src); branded++; }
  });
})(ROOT);
console.log('[automate] Arquivos com branding alterado: ' + branded);

// ---------- 3) Corrige imports sem './' ----------
console.log('[automate] Corrigindo imports relativos...');
let fix = 0;
fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && !SKIP.includes(f)).forEach(f => {
  const p = path.join(ROOT, f);
  let src = fs.readFileSync(p, 'utf8');
  const orig = src;
  src = src.replace(/from\s*["'](?!\.\/|\.\.\/|https?:|\/)([^"']+\.js)["']/g, 'from"./$1"');
  src = src.replace(/import\(\s*["'](?!\.\/|\.\.\/|https?:|\/)([^"']+\.js)["']\s*\)/g, 'import("./$1")');
  if (src !== orig) { fs.writeFileSync(p, src); fix++; }
});
console.log('[automate] Imports corrigidos: ' + fix);

// ---------- 4) Resolve imports pendentes (renomeia ou cria stub) ----------
console.log('[automate] Verificando imports pendentes...');
const jsFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && !SKIP.includes(f));
const importsNeeded = {};    // relPath -> Set(exports)
const dynNeeded = new Set(); // relPath de import dinâmico

for (const f of jsFiles) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  let m;
  // import { X, Y as Z } from "./a.js"
  const staticRe = /import\s*(?:\*\s*as\s*\w+\s*from\s*)?\{([^}]+)\}\s*from\s*["'](\.[^"']+)["']/g;
  while ((m = staticRe.exec(src))) {
    const names = m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    const rel = path.relative(ROOT, path.resolve(ROOT, path.dirname(f), m[2])).replace(/\\/g, '/');
    if (!importsNeeded[rel]) importsNeeded[rel] = new Set();
    names.forEach(n => importsNeeded[rel].add(n));
  }
  // import * as X from "./a.js"
  const starRe = /import\s*\*\s*as\s*\w+\s*from\s*["'](\.[^"']+)["']/g;
  while ((m = starRe.exec(src))) {
    const rel = path.relative(ROOT, path.resolve(ROOT, path.dirname(f), m[1])).replace(/\\/g, '/');
    if (!importsNeeded[rel]) importsNeeded[rel] = new Set();
  }
  // import "./a.js"
  const sideRe = /import\s*["'](\.[^"']+)["']/g;
  while ((m = sideRe.exec(src))) {
    const rel = path.relative(ROOT, path.resolve(ROOT, path.dirname(f), m[1])).replace(/\\/g, '/');
    if (!importsNeeded[rel]) importsNeeded[rel] = new Set();
  }
  // import("./a.js")
  const dynRe = /import\(\s*["'](\.[^"']+)["']\s*\)/g;
  while ((m = dynRe.exec(src))) {
    const rel = path.relative(ROOT, path.resolve(ROOT, path.dirname(f), m[1])).replace(/\\/g, '/');
    dynNeeded.add(rel);
  }
}

for (const [rel, exportsSet] of Object.entries(importsNeeded)) {
  const full = path.join(ROOT, rel);
  if (fs.existsSync(full)) continue;

  const dir = path.dirname(full);
  const basename = path.basename(full);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Tenta achar arquivo correspondente (case-insensitive, ignorando prefixo arena-/-)
  let found = null;
  if (fs.existsSync(dir)) {
    const lb = basename.toLowerCase().replace(/^(arena[-_]|[-_])/i, '');
    for (const c of fs.readdirSync(dir)) {
      if (!c.endsWith('.js') || c === basename) continue;
      const lc = c.toLowerCase();
      const lcStrip = lc.replace(/^(arena[-_]|[-_])/i, '');
      if (lc === basename.toLowerCase() || lcStrip === lb || lcStrip === basename.toLowerCase() || lc === lb) {
        found = c;
        break;
      }
    }
  }

  if (found) {
    fs.renameSync(path.join(dir, found), full);
    console.log(`[automate] Renomeado: ${found} -> ${basename}`);
  } else {
    const body = Array.from(exportsSet).map(e => `export const ${e} = undefined;`).join('\n') + '\n';
    fs.writeFileSync(full, body || '// stub\n');
    console.log(`[automate] Stub criado: ${rel} (${Array.from(exportsSet).join(', ') || 'vazio'})`);
  }
}

for (const rel of dynNeeded) {
  const full = path.join(ROOT, rel);
  if (fs.existsSync(full)) continue;
  const dir = path.dirname(full);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(full, 'export default {};\n');
  console.log(`[automate] Stub dinâmico: ${rel}`);
}

// ---------- 5) HTML ----------
console.log('[automate] Ajustando HTML...');
let htmls = 0;
fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).forEach(h => {
  const p = path.join(ROOT, h);
  let src = fs.readFileSync(p, 'utf8');
  src = src.replace(/<script[^>]*src=["'][^"']*(jogo|bundle|offline-shim)\.js["'][^>]*>\s*<\/script>\s*/gi, '');
  if (/<\/body>/i.test(src)) {
    src = src.replace(/<\/body>/i, '  <script src="offline-shim.js"></script>\n  <script type="module" src="bundle.js"></script>\n</body>');
  } else {
    src += '\n<script src="offline-shim.js"></script>\n<script type="module" src="bundle.js"></script>\n';
  }
  fs.writeFileSync(p, src);
  htmls++;
});
console.log('[automate] HTMLs ajustados: ' + htmls);

// ---------- 6) Build ----------
console.log('[automate] Compilando bundle...');
execSync('node build.js', { stdio: 'inherit' });
console.log('[automate] TUDO PRONTO. Rode: npx serve . -l 8080');