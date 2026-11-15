#!/usr/bin/env python3
"""Encode the illustrative ITE visual for the website (Pillow 11.3+)."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'design/sources/isolation-exterieure.png'
OUTPUT = ROOT / 'assets/img/illustrations'

OUTPUT.mkdir(parents=True, exist_ok=True)
with Image.open(SOURCE) as source:
    image = source.convert('RGB')
    for width in (480, 768, 1200):
        if width > image.width:
            continue
        height = round(image.height * width / image.width)
        resized = image.resize((width, height), Image.Resampling.LANCZOS)
        for extension in ('webp', 'avif'):
            output = OUTPUT / f'isolation-exterieure-{width}.{extension}'
            options = {'quality': 80, 'method': 6} if extension == 'webp' else {
                'quality': 60, 'speed': 5, 'subsampling': '4:2:0', 'max_threads': 2
            }
            resized.save(output, extension.upper(), **options)
            print(f'{output.relative_to(ROOT)}: {width}×{height}, {output.stat().st_size} bytes')
        if width == 1200:
            resized.save(OUTPUT / 'isolation-exterieure.jpg', 'JPEG', quality=85, optimize=True)
