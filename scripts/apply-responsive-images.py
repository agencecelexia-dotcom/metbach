#!/usr/bin/env python3
"""Use the checked image manifest in public HTML; preserves originals and ratios."""
from pathlib import Path
import re,json
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'assets/img/responsive/manifest.json').read_text())['images']
avif_path=ROOT/'assets/img/responsive/manifest-avif.json'
avif_manifest=json.loads(avif_path.read_text()).get('images',{}) if avif_path.exists() else {}
files=list(ROOT.glob('*.html'))
for directory in ['services','villes','contact','realisations','merci']:
 files+=list((ROOT/directory).glob('*.html'))
changes=0
for path in files:
 source=path.read_text()
 def replace_picture(match):
  block=match.group()
  wm=re.search(r'<source[^>]*srcset="([^"]*\.webp(?: [^\"]*)?)"',block)
  if not wm:return block
  # Find original by a current srcset candidate or by the JPG fallback name.
  fallback=re.search(r'<img[^>]*src="([^"]+)"',block)
  key=re.sub(r'\.(jpe?g|png)$','.webp',fallback[1]) if fallback else wm[1].split()[0]
  if key not in manifest:return block
  info=manifest[key];original=info['original']
  context=source[max(0,match.start()-450):match.start()]
  sizes='(max-width: 1023px) calc(100vw - 48px), (max-width: 1408px) calc((100vw - 96px) / 2), 640px'
  if path==ROOT/'index.html':
   if 'hero-visual' in context:sizes='(max-width: 767px) calc(100vw - 40px), (max-width: 1200px) calc((100vw - 104px) / 2), 640px'
   elif 'expertise-image' in context:sizes='(max-width: 767px) calc(100vw - 40px), (max-width: 1408px) calc((100vw - 146px) / 3), 427px'
   else:sizes='(max-width: 767px) calc(100vw - 40px), (max-width: 1408px) calc((100vw - 126px) / 2), 655px'
  elif path.parent.name=='realisations':sizes='(max-width: 767px) calc(100vw - 32px), (max-width: 1023px) calc((100vw - 64px) / 2), 427px'
  new_source=f'<source srcset="{info["srcset"]}" sizes="{sizes}" type="image/webp" />'
  block=re.sub(r'<source\b[^>]*type="image/avif"[^>]*>', '', block)
  if key in avif_manifest:
   new_source=f'<source srcset="{avif_manifest[key]["srcset"]}" sizes="{sizes}" type="image/avif" />'+new_source
  block=re.sub(r'<source\b[^>]*type="image/webp"[^>]*>',lambda _:new_source,block,count=1)
  def img(im):
   tag=im.group()
   tag=re.sub(r'\s(?:width|height|sizes)="[^"]*"','',tag)
   # A legacy JPG fallback uses the original's exact ratio too.
   tag=tag.rstrip('>').rstrip('/').rstrip()+f' width="{original["width"]}" height="{original["height"]}" />'
   return tag
  return re.sub(r'<img\b[^>]*>',img,block,count=1)
 updated=re.sub(r'<picture\b[\s\S]*?</picture>',replace_picture,source)
 if updated!=source:path.write_text(updated);changes+=1
print(f'Responsive pictures checked across {len(files)} public pages; {changes} updated.')
