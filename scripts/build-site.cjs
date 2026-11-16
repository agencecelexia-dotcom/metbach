// Export only public files. Vercel discovers the existing /api functions
// separately from this static output directory.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output);

// Pages load /assets/css/site.css only. The css/ sources and the two build
// inputs below are bundled into it and are not published on their own.
const unpublished = new Set(['assets/css/tailwind.css', 'assets/css/fonts.css']);
const directories = ['assets', 'js', 'services', 'villes', 'contact', 'realisations', 'merci'];
for (const dir of directories) {
  fs.cpSync(path.join(root, dir), path.join(output, dir), {
    recursive: true,
    filter: source => !unpublished.has(path.relative(root, source).split(path.sep).join('/')),
  });
}

// Root files: pages, crawler files, the browser's default /favicon.ico and the
// IndexNow ownership key (<32 hex characters>.txt containing that same key).
const rootFiles = ['robots.txt', 'sitemap.xml', 'llms.txt', 'favicon.ico'];
const isIndexNowKey = file => /^[a-f0-9]{32}\.txt$/.test(file)
  && fs.readFileSync(path.join(root, file), 'utf8').trim() === file.slice(0, -4);
for (const file of fs.readdirSync(root)) {
  if (file.endsWith('.html') || rootFiles.includes(file) || isIndexNowKey(file)) {
    fs.copyFileSync(path.join(root, file), path.join(output, file));
  }
}
console.log('Static output: dist/ (public pages and assets only).');
