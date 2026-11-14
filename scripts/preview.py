#!/usr/bin/env python3
"""Local static preview with production-style clean URLs; no contact API."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote
import argparse
import json
import gzip
import io

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'dist'

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

    def send_head(self):
        raw = unquote(urlsplit(self.path).path)
        if any(part in ('.', '..') or part.startswith('.') for part in raw.split('/') if part):
            self.send_error(404); return None
        canonical = raw
        if canonical.endswith('.html'): canonical = canonical[:-5]
        if canonical.endswith('/index'): canonical = canonical[:-6] or '/'
        if canonical != '/': canonical = canonical.rstrip('/')
        if canonical != raw:
            self.send_response(308)
            self.send_header('Location', canonical)
            self.send_header('Content-Length','0')
            self.end_headers(); return None
        name = PUBLIC / raw.lstrip('/')
        if name.is_dir(): name = name / 'index.html'
        if not name.is_file() and not name.suffix: name = name.with_suffix('.html')
        if not name.is_file() or PUBLIC not in name.resolve().parents:
            name = PUBLIC / '404.html'; status = 404
        else: status = 200
        content_type = self.guess_type(str(name))
        data = name.read_bytes()
        compressed = 'gzip' in self.headers.get('Accept-Encoding', '') and (
            content_type.startswith('text/') or content_type in (
                'application/javascript', 'application/json', 'image/svg+xml'
            )
        )
        if compressed:
            data = gzip.compress(data, mtime=0)
        stream = io.BytesIO(data)
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Vary', 'Accept-Encoding')
        if compressed: self.send_header('Content-Encoding', 'gzip')
        self.send_header('Cache-Control', 'no-store')
        if status == 404 or raw in ('/merci','/404'): self.send_header('X-Robots-Tag', 'noindex, follow')
        # Match the production policy during layout checks.
        config=json.loads((ROOT/'vercel.json').read_text())
        for row in config['headers']:
            if row['source']=='/(.*)':
                for h in row['headers']:
                    if h['key']!='Strict-Transport-Security':self.send_header(h['key'],h['value'])
        self.end_headers()
        return stream

if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8000);args=parser.parse_args()
    if not (PUBLIC/'index.html').is_file():raise SystemExit('Run npm run build first.')
    print(f'Preview http://127.0.0.1:{args.port} — static only, no contact API',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
