#!/usr/bin/env python3
"""Check the static site's canonical URLs, crawl graph, metadata and structured data.
No network/dependency required. Exit nonzero on a regression.
"""
from collections import Counter, deque
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
import json
from datetime import date
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://www.renovationmetbach.fr'


def route(path):
    value = '/' + path.relative_to(ROOT).as_posix()
    if value.endswith('/index.html'):
        return value[:-11] or '/'
    return value.removesuffix('.html')


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.ids = []
        self.titles = []
        self.headings = []
        self.jsonld = []
        self.text = []
        self._title = None
        self._heading = None
        self._json = None
        self._hidden = 0
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self.tags.append((tag, a))
        if 'id' in a:
            self.ids.append(a['id'])
        if tag == 'title': self._title = []
        if tag == 'h1': self._heading = []
        if tag in ('script', 'style'): self._hidden += 1
        if tag == 'script' and a.get('type') == 'application/ld+json': self._json = []

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_data(self, value):
        if self._title is not None: self._title.append(value)
        if self._heading is not None: self._heading.append(value)
        if self._json is not None: self._json.append(value)
        if not self._hidden: self.text.append(value)

    def handle_endtag(self, tag):
        if tag == 'title' and self._title is not None:
            self.titles.append(' '.join(''.join(self._title).split())); self._title = None
        if tag == 'h1' and self._heading is not None:
            self.headings.append(' '.join(''.join(self._heading).split())); self._heading = None
        if tag == 'script' and self._json is not None:
            self.jsonld.append(''.join(self._json)); self._json = None
        if tag in ('script', 'style'): self._hidden = max(0, self._hidden - 1)

    def attrs(self, tag):
        return [a for t, a in self.tags if t == tag]

    def meta(self, name):
        return [a.get('content', '') for a in self.attrs('meta') if a.get('name', a.get('property')) == name]

    def canonical(self):
        return [a.get('href') for a in self.attrs('link') if a.get('rel') == 'canonical']


def walk(value):
    if isinstance(value, dict):
        yield value
        for v in value.values(): yield from walk(v)
    elif isinstance(value, list):
        for v in value: yield from walk(v)


def main():
    files = sorted(p for p in ROOT.rglob('*.html') if not any(x in ('node_modules', 'dist', '.git') or x.startswith('.') for x in p.relative_to(ROOT).parts))
    pages = {route(p): Page(p.read_text()) for p in files}
    errors, warnings = [], []
    def fail(url, message): errors.append(f'{url}: {message}')
    graph = {r: set() for r in pages}
    indexed = set()
    schema_ids, schema_refs = set(), set()
    all_titles, all_descriptions = [], []
    for path in files:
        r = route(path); page = pages[r]
        for tag in ('head','body','main'):
            if len(page.attrs(tag)) != 1: fail(r, f'expected exactly one {tag}')
        noindex = any('noindex' in value for value in page.meta('robots'))
        if not noindex: indexed.add(r)
        if len(page.titles) != 1 or not page.titles[0]: fail(r, 'expected one nonempty title')
        else:
            all_titles.append(page.titles[0])
            if len(page.titles[0]) > 70: warnings.append(f'{r}: long title ({len(page.titles[0])} characters)')
        desc = page.meta('description')
        if len(desc) != 1 or not desc[0]: fail(r, 'expected one nonempty description')
        else: all_descriptions.append(desc[0])
        if len(page.headings) != 1: fail(r, 'expected exactly one H1')
        if not any(a.get('lang') == 'fr' for a in page.attrs('html')): fail(r, 'French document language missing')
        if page.canonical() != [ORIGIN + r]: fail(r, f'wrong canonical {page.canonical()}')
        if page.meta('og:url') != [ORIGIN + r]: fail(r, 'og:url must match canonical')
        if len(page.meta('robots')) != 1: fail(r, 'expected one robots meta tag')
        if r in ('/merci', '/404') and not noindex: fail(r, 'utility page must be noindex')
        for name, n in Counter(page.ids).items():
            if n > 1: fail(r, f'duplicate id {name}')
        for a in page.attrs('img'):
            if 'alt' not in a: fail(r, 'image lacks alt')
            if not a.get('width') or not a.get('height'): fail(r, f'image lacks dimensions: {a.get("src")}')
        if 'cdn.tailwindcss.com' in path.read_text(): fail(r, 'runtime Tailwind CDN remains')
        for a in page.attrs('a'):
            href = a.get('href', '')
            if not href or urlsplit(href).scheme in ('tel', 'mailto', 'javascript'): continue
            dest = urlsplit(urljoin(ORIGIN + r, href))
            if dest.netloc != urlsplit(ORIGIN).netloc: continue
            target = unquote(dest.path) or '/'
            if target.endswith('.html') or (target != '/' and target.endswith('/')):
                fail(r, f'page link uses a redirecting URL {href}')
            if target not in pages:
                if not (ROOT / target.lstrip('/')).is_file(): fail(r, f'broken link {href}')
                continue
            graph[r].add(target)
            if dest.fragment and unquote(dest.fragment) not in pages[target].ids: fail(r, f'broken anchor {href}')
            if not href.startswith(('/', '#')): fail(r, f'noncanonical relative page link {href}')
        for tag, a in page.tags:
            sources = []
            if tag in ('script','img','source'): sources.extend([a.get('src','')])
            if tag == 'link' and a.get('rel') in ('stylesheet','icon','apple-touch-icon','preload'): sources.append(a.get('href',''))
            if tag == 'source': sources.extend(x.strip().split()[0] for x in a.get('srcset','').split(',') if x.strip())
            for src in filter(None, sources):
                url = urlsplit(urljoin(ORIGIN+r,src))
                if url.netloc == urlsplit(ORIGIN).netloc and not (ROOT / unquote(url.path).lstrip('/')).is_file(): fail(r, f'missing asset {src}')
        if not page.jsonld and not noindex: fail(r, 'missing structured data')
        for raw in page.jsonld:
            try: data = json.loads(raw)
            except ValueError as e: fail(r, f'invalid JSON-LD: {e}'); continue
            for node in walk(data):
                if '@id' in node:
                    (schema_ids if '@type' in node else schema_refs).add(node['@id'])
                if node.get('@type') in ('Question','Answer'):
                    visible=' '.join(' '.join(page.text).split())
                    value=node.get('name') if node.get('@type')=='Question' else node.get('text')
                    if value and ' '.join(value.split()) not in visible: fail(r, 'FAQ schema differs from visible text')
                if 'aggregateRating' in node: fail(r, 'self-serving rating schema')
                if node.get('@type') in ('HowTo','Article'): fail(r, 'inapplicable tutorial/article schema')
                if node.get('@type') == 'GeneralContractor' and node.get('@id') != ORIGIN+'/#business': fail(r, 'duplicate business entity')
                for key in ('url','item','contentUrl','image','logo'):
                    value=node.get(key)
                    if not isinstance(value,str) or not value.startswith(ORIGIN): continue
                    dest=urlsplit(value)
                    if dest.path not in pages and not (ROOT / unquote(dest.path).lstrip('/')).is_file(): fail(r, f'broken structured URL {value}')
    for ref in schema_refs - schema_ids:
        if ref.startswith(ORIGIN): fail('schema', f'undefined entity {ref}')
    for values, name in ((all_titles,'titles'),(all_descriptions,'descriptions')):
        for value, n in Counter(values).items():
            if n > 1: fail('metadata', f'duplicate {name}: {value}')
    try:
        root = ET.parse(ROOT/'sitemap.xml').getroot()
        entries = root.findall('{http://www.sitemaps.org/schemas/sitemap/0.9}url')
        urls = [x.findtext('{http://www.sitemaps.org/schemas/sitemap/0.9}loc') for x in entries]
        expected={ORIGIN+r for r in indexed}
        if len(urls)!=len(set(urls)): fail('sitemap','duplicate URLs')
        if set(urls)!=expected: fail('sitemap', f'missing {sorted(expected-set(urls))}; extra {sorted(set(urls)-expected)}')
        for entry in entries:
            lastmod=entry.findtext('{http://www.sitemaps.org/schemas/sitemap/0.9}lastmod')
            if lastmod:
                try:
                    if date.fromisoformat(lastmod) > date.today(): fail('sitemap', 'future lastmod')
                except ValueError: fail('sitemap','invalid lastmod')
    except (ET.ParseError, FileNotFoundError) as e: fail('sitemap', str(e))
    robots=(ROOT/'robots.txt').read_text()
    if f'Sitemap: {ORIGIN}/sitemap.xml' not in robots: fail('robots','canonical sitemap declaration missing')
    if re.search(r'^Disallow:\s*/\s*$',robots,re.M): fail('robots','sitewide crawler block')
    depth={'/':0}; queue=deque(['/'])
    while queue:
        for dest in graph[queue.popleft()]:
            if dest not in depth:
                depth[dest]=min(depth[s]+1 for s in graph if dest in graph[s] and s in depth)
                queue.append(dest)
    for r in indexed:
        if r not in depth: fail(r, 'orphan page')
        elif depth[r] > 3: warnings.append(f'{r}: crawl depth {depth[r]}')
    result={'pages':len(pages),'indexable_pages':len(indexed),'max_crawl_depth':max((depth.get(r,99) for r in indexed),default=0),'errors':errors,'warnings':warnings}
    if '--json' in sys.argv: print(json.dumps(result,ensure_ascii=False,indent=2))
    else:
        print(f"SEO: {len(pages)} pages, {len(indexed)} indexable, {len(errors)} errors, {len(warnings)} warnings.")
        for item in errors: print('ERROR',item)
        for item in warnings: print('WARN',item)
    return bool(errors)

if __name__ == '__main__': sys.exit(main())
