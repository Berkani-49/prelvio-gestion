const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const vercelDir = path.join(root, '.vercel');
const outputDir = path.join(vercelDir, 'output');
const staticDir = path.join(outputDir, 'static');

// 1. Copier project.json de dist/.vercel/ vers .vercel/ (racine)
const distProjectJson = JSON.parse(
  fs.readFileSync(path.join(distDir, '.vercel', 'project.json'), 'utf8')
);
fs.mkdirSync(vercelDir, { recursive: true });
fs.writeFileSync(
  path.join(vercelDir, 'project.json'),
  JSON.stringify(distProjectJson, null, 2)
);

// 2. Créer .vercel/output/config.json (Build Output API v3)
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, 'config.json'),
  JSON.stringify({
    version: 3,
    routes: [
      { handle: 'filesystem' },
      { src: '/(.*)', dest: '/index.html' },
    ],
  }, null, 2)
);

// 3. Copier dist/ -> .vercel/output/static/ (sans .vercel/ ni vercel.json)
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (path.basename(src) === '.vercel') return;
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    const relPath = path.relative(distDir, src);
    if (relPath === 'vercel.json' || relPath === '.gitignore') return;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

if (fs.existsSync(staticDir)) {
  fs.rmSync(staticDir, { recursive: true });
}
copyRecursive(distDir, staticDir);

console.log('✓ .vercel/output/ prêt pour --prebuilt');
