const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const fileMap = {};
fs.readdirSync(ROOT, { withFileTypes: true }).forEach(e => {
  if (e.isFile()) fileMap[e.name.toLowerCase()] = e.name;
});
const cssFiles = Object.values(fileMap).filter(n => n.toLowerCase().endsWith('.css'));
const hasBundle = !!fileMap['bundle.js'];
const hasShim   = !!fileMap['offline-shim.js'];

console.log('=== ARQUIVOS NA PASTA ===');
console.log('CSS:  ' + (cssFiles.length ? cssFiles.join(', ') : '(nenhum)'));
console.log('bundle.js:        ' + (hasBundle ? 'OK' : 'AUSENTE'));
console.log('offline-shim.js:  ' + (hasShim ? 'OK' : 'AUSENTE'));
console.log('');

function resolveRef(ref) {
  if (!ref) return { type: 'empty' };
  if (/^(https?:|data:|mailto:|#|\/\/)/i.test(ref)) return { type: 'external', ref };
  let clean = ref.split('?')[0].split('#')[0].trim();
  const rel = clean.replace(/^\.?\//, '');
  const key = rel.toLowerCase();
  if (fileMap[key]) return { type: 'ok', ref, real: fileMap[key] };
  const stripped = key.replace(/^(arena[-_]|[-_])/i, '');
  for (const [k, v] of Object.entries(fileMap)) {
    const ks = k.replace(/^(arena[-_]|[-_])/i, '');
    if (ks === stripped || ks === key || k === stripped) {
      return { type: 'case', ref, real: v };
    }
  }
  return { type: 'missing', ref };
}

function processHtml(file) {
  const p = path.join(ROOT, file);
  let src = fs.readFileSync(p, 'utf8');
  const original = src;
  const report = { file, fixed: [], removed: [], injected: [] };

  src = src.replace(/<link\b[^>]*>/gi, (tag) => {
    const m = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!m) return tag;
    const r = resolveRef(m[1]);
    if (r.type === 'ok' || r.type === 'external') return tag;
    if (r.type === 'case') {
      report.fixed.push(m[1] + ' -> ' + r.real);
      return tag.replace(m[1], r.real);
    }
    if (r.type === 'missing') {
      if (/rel\s*=\s*["'][^"']*stylesheet/i.test(tag) || /\.css(\?|"|'|$)/i.test(tag)) {
        report.removed.push(m[1]);
        return '';
      }
    }
    return tag;
  });

  src = src.replace(/<script\b[^>]*\bsrc\s*=\s*["'][^"']+["'][^>]*>[\s\S]*?<\/script>/gi, (tag) => {
    const m = tag.match(/src\s*=\s*["']([^"']+)["']/i);
    if (!m) return tag;
    const r = resolveRef(m[1]);
    if (r.type === 'ok' || r.type === 'external') return tag;
    if (r.type === 'case') {
      report.fixed.push(m[1] + ' -> ' + r.real);
      return tag.replace(m[1], r.real);
    }
    if (r.type === 'missing') {
      if (!/bundle\.js|offline-shim\.js/i.test(m[1])) {
        report.removed.push(m[1]);
        return '';
      }
    }
    return tag;
  });

  let injectHead = '';
  cssFiles.forEach(css => {
    const esc = css.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const hasLink = new RegExp('href\\s*=\\s*["\'][^"\']*' + esc + '["\']', 'i').test(src);
    if (!hasLink) {
      injectHead += '  <link rel="stylesheet" href="' + css + '">\n';
      report.injected.push('CSS: ' + css);
    }
  });
  if (injectHead) {
    if (/<\/head>/i.test(src)) src = src.replace(/<\/head>/i, injectHead + '</head>');
    else src = injectHead + src;
  }

  const hasBundleRef = /src\s*=\s*["'][^"']*bundle\.js["']/i.test(src);
  const hasShimRef   = /src\s*=\s*["'][^"']*offline-shim\.js["']/i.test(src);
  let injectBody = '';
  if (hasShim && !hasShimRef)   { injectBody += '  <script src="offline-shim.js"></script>\n'; report.injected.push('offline-shim.js'); }
  if (hasBundle && !hasBundleRef) { injectBody += '  <script type="module" src="bundle.js"></script>\n'; report.injected.push('bundle.js'); }
  if (injectBody) {
    if (/<\/body>/i.test(src)) src = src.replace(/<\/body>/i, injectBody + '</body>');
    else src += '\n' + injectBody;
  }

  if (src !== original) {
    fs.writeFileSync(p + '.bak', original);
    fs.writeFileSync(p, src);
  }
  return report;
}

const htmls = fs.readdirSync(ROOT).filter(f => f.toLowerCase().endsWith('.html') && !f.endsWith('.bak'));
if (!htmls.length) { console.error('Nenhum .html nesta pasta.'); process.exit(1); }

let tF = 0, tR = 0, tI = 0, tC = 0;
htmls.forEach(h => {
  const r = processHtml(h);
  const changed = r.fixed.length + r.removed.length + r.injected.length;
  if (changed) tC++;
  tF += r.fixed.length; tR += r.removed.length; tI += r.injected.length;
  console.log('\n=== ' + h + ' ===');
  if (r.fixed.length)    console.log('  Corrigidos: ' + r.fixed.join(', '));
  if (r.removed.length)  console.log('  Removidos (ausentes): ' + r.removed.join(', '));
  if (r.injected.length) console.log('  Injetados: ' + r.injected.join(', '));
  if (!changed)          console.log('  Nada a mudar.');
});

console.log('\n=== RESUMO ===');
console.log('HTMLs analisados: ' + htmls.length);
console.log('HTMLs alterados:  ' + tC);
console.log('Refs corrigidas:  ' + tF);
console.log('Refs removidas:   ' + tR);
console.log('Tags injetadas:   ' + tI);
console.log('Backups .bak criados para HTMLs alterados.');