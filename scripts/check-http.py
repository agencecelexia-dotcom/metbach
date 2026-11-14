#!/usr/bin/env python3
"""Read-only HTTP check of canonical URLs. Run after deployment too."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
import argparse
import json
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--base', default='https://www.renovationmetbach.fr')
args=parser.parse_args(); base=args.base.rstrip('/')
urls=[e.text for e in ET.parse(ROOT/'sitemap.xml').getroot().iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]

def fetch(url):
    try:
        with urlopen(Request(url,headers={'User-Agent':'Metbach-SEO-Check/1.0'}),timeout=20) as response:
            return response.status,response.url,response.read().decode('utf-8','replace')
    except HTTPError as e: return e.code,e.url,''
    except (URLError,TimeoutError) as e: return 0,url,str(e)

def inspect(canonical):
    path=urlsplit(canonical).path; requested=base+path
    code,final,body=fetch(requested); errors=[]
    if code!=200:errors.append(f'HTTP {code}')
    if final!=requested:errors.append(f'redirected to {final}')
    if f'<link rel="canonical" href="{canonical}"' not in body:errors.append('canonical missing or unexpected')
    if 'noindex' in body:errors.append('unexpected noindex')
    return {'path':path,'status':code,'errors':errors}

with ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(inspect,urls))
code,_,_=fetch(base+'/metbach-seo-page-inexistante')
results.append({'path':'/metbach-seo-page-inexistante','status':code,'errors':[] if code==404 else ['expected HTTP 404']})
code,_,body=fetch(base+'/merci')
results.append({'path':'/merci','status':code,'errors':[] if code==200 and 'noindex' in body else ['expected noindex thank-you page']})
result={'base':base,'checked':len(results),'errors':[r for r in results if r['errors']]}
print(json.dumps(result,ensure_ascii=False,indent=2))
raise SystemExit(bool(result['errors']))
