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
const directories = ['assets', 'js', 'services', 'villes', 'conseils', 'contact', 'realisations', 'merci'];
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
// French typography on the published pages only (sources stay readable):
// - a narrow no-break space before : ; ? ! and inside « », so punctuation
//   never starts a line;
// - no-break spaces inside phone numbers, SIRET and "74500 Publier";
// - in headings, links and the footer address, hyphenated names
//   (Haute-Savoie, Thonon-les-Bains, Parlons-en) wrapped in .nowrap.
// Only text between tags is touched: never attributes, scripts, styles,
// <title>, <option> or <textarea>.
const NNBSP = ' ';
const NBSP = ' ';
const RAW = new Set(['script', 'style', 'title', 'option', 'textarea', 'pre', 'code']);
const NOWRAP_CONTEXT = new Set(['h1', 'h2', 'h3', 'h4', 'a', 'button']);
const compound = /(^|[\s(>«  ])((?:[A-Za-zÀ-ÖØ-öø-ÿ’']+-)+[A-Za-zÀ-ÖØ-öø-ÿ’']+[.?!]?)(?=$|[\s),.;:?!»  ])/g;
function typeset(text, nowrap) {
  let t = text
    .replace(/(\S) ([:;?!])(?=\s|$|<|&)/g, `$1${NNBSP}$2`)
    .replace(/^ ([:;?!])(?=\s|$)/, `${NNBSP}$1`)
    .replace(/« /g, `«${NNBSP}`)
    .replace(/ »/g, `${NNBSP}»`)
    .replace(/\b0\d(?: \d\d){4}\b/g, m => m.replace(/ /g, NBSP))
    .replace(/\+\d{2}(?: \d{1,3}){4}\b/g, m => m.replace(/ /g, NBSP))
    .replace(/\b\d{3} \d{3} \d{3} \d{5}\b/g, m => m.replace(/ /g, NBSP))
    .replace(/\b(\d{5}) (Publier|Thonon|Évian|Annemasse|Douvaine|Saint-Julien|Talence)/g, `$1${NBSP}$2`);
  if (nowrap) {
    // Long names (Saint-Julien-en-Genevois) would overflow a phone screen at
    // heading size: they stay together from tablet width only.
    t = t.replace(compound, (m, lead, word) => `${lead}<span class="${word.length > 18 ? 'nowrap-md' : 'nowrap'}">${word}</span>`);
  }
  return t;
}
function typesetHtml(html) {
  const out = [];
  const stack = [];
  let footerAddressDepth = -1;
  const parts = html.split(/(<!--[\s\S]*?-->|<[^>]+>)/);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('<')) {
      const m = part.match(/^<(\/?)([a-zA-Z][\w-]*)/);
      if (m && !part.startsWith('<!')) {
        const name = m[2].toLowerCase();
        const voidTag = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/.test(name) || part.endsWith('/>');
        if (m[1]) {
          const i = stack.lastIndexOf(name);
          if (i !== -1) stack.length = i;
          if (footerAddressDepth > stack.length) footerAddressDepth = -1;
        } else if (!voidTag) {
          if (name === 'p' && /class="[^"]*\bfooter-address\b/.test(part)) footerAddressDepth = stack.length + 1;
          stack.push(name);
        }
      }
      out.push(part);
      continue;
    }
    if (stack.some(tag => RAW.has(tag))) { out.push(part); continue; }
    const nowrap = footerAddressDepth !== -1 || stack.some(tag => NOWRAP_CONTEXT.has(tag));
    out.push(typeset(part, nowrap));
  }
  return out.join('');
}
const htmlFiles = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) htmlFiles.push(full);
  }
})(output);
// Google Tag Manager on every published page, behind Google Consent Mode v2:
// storage is denied by default and analytics_storage is granted only after the
// visitor accepts in the banner (js/script.js, key "metbach-consent", 6 months).
// Advertising signals stay denied: the site runs no ads.
// The container itself (≈75 KiB of script) is fetched only after the page has
// loaded, or at the visitor's first interaction if that comes sooner, so it
// never competes with the first render (mobile LCP). Events pushed to the
// dataLayer before that (tel_click, consent_*) are processed once it loads.
const GTM_ID = 'GTM-KCB7W56H';
const gtmHead = `
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent', 'default', {ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500});
    try { var c = JSON.parse(localStorage.getItem('metbach-consent') || 'null'); if (c && c.analytics === true && typeof c.at === 'number' && Number.isFinite(c.at) && Date.now() - c.at >= 0 && Date.now() - c.at < 15552000000) gtag('consent', 'update', {analytics_storage: 'granted'}); } catch (e) {}
    (function(w,d,s,l,i){var done=false,ev=['pointerdown','keydown','touchstart','scroll'];function go(){if(done)return;done=true;ev.forEach(function(e){w.removeEventListener(e,go,true);});w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);}ev.forEach(function(e){w.addEventListener(e,go,{capture:true,passive:true});});if(d.readyState==='complete')setTimeout(go,1500);else w.addEventListener('load',function(){setTimeout(go,1500);});})(window,document,'script','dataLayer','${GTM_ID}');
  </script>`;
const gtmBody = `\n  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript>`;
function addGtm(html) {
  if (html.includes('googletagmanager.com/gtm.js')) return html;
  const viewport = html.match(/<meta name="viewport"[^>]*>/);
  html = viewport ? html.replace(viewport[0], viewport[0] + gtmHead) : html.replace(/<head>/, '<head>' + gtmHead);
  return html.replace(/<body[^>]*>/, m => m + gtmBody);
}
for (const file of htmlFiles) {
  fs.writeFileSync(file, addGtm(typesetHtml(fs.readFileSync(file, 'utf8'))));
}

// Responsive image folder: publish only files a page, stylesheet or script
// references. The manifests and AVIF files that lost to their WebP twin stay
// in the repository for the image scripts but are not deployed.
const responsiveDir = path.join(output, 'assets/img/responsive');
if (fs.existsSync(responsiveDir)) {
  const referencing = [...htmlFiles];
  for (const dir of ['assets/css', 'js']) {
    const full = path.join(output, dir);
    if (fs.existsSync(full)) for (const f of fs.readdirSync(full)) if (/\.(css|js)$/.test(f)) referencing.push(path.join(full, f));
  }
  const corpus = referencing.map(f => fs.readFileSync(f, 'utf8')).join('\n');
  let pruned = 0;
  for (const f of fs.readdirSync(responsiveDir)) {
    if (!corpus.includes(`/assets/img/responsive/${f}`)) { fs.rmSync(path.join(responsiveDir, f)); pruned += 1; }
  }
  console.log(`Responsive images: ${pruned} unreferenced file(s) left out of dist/.`);
}
console.log('Static output: dist/ (public pages and assets only).');
