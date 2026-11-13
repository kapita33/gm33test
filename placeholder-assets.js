// placeholder-assets.js - gera PNG/JPG 1x1 transparente para cada asset 404
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

// PNG 1x1 transparente
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
// JPG 1x1 cinza-escuro
const JPG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB/8AAEQgAAQABAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A/v4ooooA/9k=', 'base64');

const IMAGES = {
  'assets/img/cenario/': [
    'pinheiro-0','pinheiro-1','pinheiro-2','pinheiro-3',
    'arvoreRedonda-0','arvoreRedonda-1','arvoreRedonda-2','arvoreRedonda-3',
    'arbustoN-0','arbustoN-1','arbustoN-2','arbustoN-3',
    'pedrasN-0','pedrasN-1','pedrasN-2','pedrasN-3',
    'casa-0','casa-1','poco-0','carroca-0','feno-0','toco-0','tronco-0',
    'arvoreSelva-0','arvoreSelva-1','arvoreSelva-2','arvoreSelva-3',
    'caverna-0','cranio-0','ruinaPilar-0','ruinaPilar-1','tendaN-0','tendaN-1'
  ],
  'assets/img/skins/': ['0','3','15'],
  'assets/img/itens/': ['6631','3053','6610'],
  'assets/img/inimigos/': ['riftherald','dragon_infernal','baron'],
  'assets/img/habilidades/': ['Q','R','M'],
  'assets/img/site/': ['arte-antes','arte-agora'],
  'assets/img/': ['logo']
};

let created = 0;
Object.entries(IMAGES).forEach(([dir, names]) => {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) fs.mkdirSync(fullDir, { recursive: true });
  const isJpg = dir.indexOf('skins') !== -1 || names.some(n => /^\d+$/.test(n));
  names.forEach(n => {
    const ext = isJpg ? '.jpg' : '.png';
    const file = path.join(fullDir, n + ext);
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, isJpg ? JPG : PNG);
      created++;
    }
  });
});
console.log('Placeholders criados: ' + created);