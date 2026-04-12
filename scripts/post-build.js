const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

// 1. vercel.json
fs.writeFileSync(path.join(distDir, 'vercel.json'), JSON.stringify({
  buildCommand: null,
  outputDirectory: '.',
  routes: [
    { handle: 'filesystem' },
    { src: '/(.*)', dest: '/index.html' },
  ],
}, null, 2));

// 2. manifest.json (PWA)
fs.writeFileSync(path.join(distDir, 'manifest.json'), JSON.stringify({
  name: 'StockPilot',
  short_name: 'StockPilot',
  description: 'Gestion de stock en temps réel',
  start_url: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#0F172A',
  theme_color: '#FFCA28',
  lang: 'fr',
  icons: [
    { src: '/icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any maskable' },
  ],
}, null, 2));

// 3. Patch index.html — ajouter les balises PWA
const indexPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes('manifest.json')) {
  html = html.replace(
    '<link rel="icon" href="/favicon.ico" /></head>',
    `<link rel="icon" href="/favicon.ico" />
<link rel="manifest" href="/manifest.json" />
<link rel="apple-touch-icon" href="/icon.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="StockPilot" /></head>`
  );
  fs.writeFileSync(indexPath, html);
}

console.log('✓ post-build : vercel.json, manifest.json, index.html patchés');
