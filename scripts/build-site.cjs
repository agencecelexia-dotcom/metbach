// Export only public files. Vercel discovers the existing /api functions
// separately from this static output directory.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output);
const directories = ['assets', 'css', 'js', 'services', 'villes', 'contact', 'realisations', 'merci'];
for (const dir of directories) fs.cpSync(path.join(root, dir), path.join(output, dir), { recursive: true });
for (const file of fs.readdirSync(root)) {
  if (file.endsWith('.html') || ['robots.txt', 'sitemap.xml', 'llms.txt'].includes(file)) {
    fs.copyFileSync(path.join(root, file), path.join(output, file));
  }
}
console.log('Static output: dist/ (public pages and assets only).');
