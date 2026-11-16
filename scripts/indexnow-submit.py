#!/usr/bin/env python3
"""Submit every sitemap URL to IndexNow (Bing, Yandex, Naver, Seznam...).

Run only after a deployment that serves the key file at
https://www.renovationmetbach.fr/<key>.txt. The key is read from the single
root file named <32 hex characters>.txt whose content is that same key.

    python3 scripts/indexnow-submit.py            # submit
    python3 scripts/indexnow-submit.py --dry-run  # print the payload only

Standard library only; no dependency.
"""
from pathlib import Path
import json
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
HOST = 'www.renovationmetbach.fr'
ORIGIN = f'https://{HOST}'
ENDPOINT = 'https://api.indexnow.org/indexnow'
NS = '{http://www.sitemaps.org/schemas/sitemap/0.9}'


def find_key():
    keys = [p for p in ROOT.glob('*.txt')
            if re.fullmatch(r'[a-f0-9]{32}\.txt', p.name) and p.read_text().strip() == p.stem]
    if len(keys) != 1:
        raise SystemExit(f'Expected exactly one IndexNow key file at the repository root, found {len(keys)}.')
    return keys[0].stem


def sitemap_urls():
    root = ET.parse(ROOT / 'sitemap.xml').getroot()
    urls = [(u.findtext(f'{NS}loc') or '').strip() for u in root.findall(f'{NS}url')]
    urls = [u for u in urls if u]
    foreign = [u for u in urls if not u.startswith(ORIGIN + '/')]
    if foreign:
        raise SystemExit(f'Sitemap URLs outside {ORIGIN}: {foreign}')
    if not urls:
        raise SystemExit('No URL found in sitemap.xml.')
    return urls


def main():
    key = find_key()
    payload = {
        'host': HOST,
        'key': key,
        'keyLocation': f'{ORIGIN}/{key}.txt',
        'urlList': sitemap_urls(),
    }
    if '--dry-run' in sys.argv:
        print(json.dumps(payload, indent=2))
        return 0
    request = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json; charset=utf-8', 'User-Agent': 'indexnow-submit/1.0'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            status = response.status
    except urllib.error.HTTPError as error:
        # 400 bad request, 403 key not valid/not found, 422 URLs not on host, 429 too many requests.
        print(f'IndexNow rejected the submission: HTTP {error.code} {error.reason}', file=sys.stderr)
        return 1
    except urllib.error.URLError as error:
        print(f'IndexNow unreachable: {error.reason}', file=sys.stderr)
        return 1
    # 200 = received; 202 = accepted, key validation pending.
    print(f'IndexNow: HTTP {status}, {len(payload["urlList"])} URLs submitted.')
    return 0 if status in (200, 202) else 1


if __name__ == '__main__':
    sys.exit(main())
