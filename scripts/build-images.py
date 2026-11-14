#!/usr/bin/env python3
"""Build responsive WebP variants from the existing site photographs.

Install Pillow 11.3.0 in an isolated environment before running this script.
The static production build consumes committed files and does not require Python.
No cropping, generative editing, upscaling, or modification of originals occurs.
"""

from pathlib import Path
import argparse
import hashlib
import json

from PIL import Image, ImageOps, features


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets/img/realisations"
OUTPUT = ROOT / "assets/img/responsive"
WIDTHS = (480, 768, 1200)
QUALITY = 80
AVIF_QUALITY = 60
AVIF_SPEED = 5


def public_url(path):
    return "/" + path.relative_to(ROOT).as_posix()


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def describe(path, width, height, generated):
    return {
        "url": public_url(path),
        "width": width,
        "height": height,
        "bytes": path.stat().st_size,
        "generated": generated,
    }


def generate():
    if not features.check("webp"):
        raise RuntimeError("Pillow requires WebP encoding support")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    images = {}
    for webp in sorted(SOURCE.glob("*.webp")):
        with Image.open(webp) as existing:
            dimensions = existing.size
        jpeg = webp.with_suffix(".jpg")
        source = jpeg if jpeg.exists() else webp
        with Image.open(source) as file:
            image = ImageOps.exif_transpose(file).convert("RGB")
        if image.size != dimensions:
            # A pre-existing image may have been cropped separately. Preserve it.
            source = webp
            with Image.open(source) as file:
                image = ImageOps.exif_transpose(file).convert("RGB")
        width, height = image.size
        candidates = {}
        for candidate_width in WIDTHS:
            if candidate_width > width:
                continue
            candidate_height = round(height * candidate_width / width)
            variant = OUTPUT / f"{webp.stem}-{candidate_width}.webp"
            resized = image.resize(
                (candidate_width, candidate_height), Image.Resampling.LANCZOS
            )
            # Do not copy EXIF, camera metadata, thumbnails or location metadata.
            resized.save(variant, "WEBP", quality=QUALITY, method=6)
            if candidate_width == width and variant.stat().st_size >= webp.stat().st_size * 0.95:
                # At the native width, preserve the original if recompression
                # would not provide a meaningful reduction in transfer size.
                variant.unlink()
                candidates[width] = describe(webp, width, height, False)
            else:
                candidates[candidate_width] = describe(
                    variant, candidate_width, candidate_height, True
                )
        if width not in candidates and width <= 1600:
            candidates[width] = describe(webp, width, height, False)
        if not candidates:
            candidates[width] = describe(webp, width, height, False)
        variants = [candidates[w] for w in sorted(candidates)]
        images[public_url(webp)] = {
            "original": describe(webp, width, height, False),
            "source": public_url(source),
            "source_sha256": sha256(source),
            "original_sha256": sha256(webp),
            "variants": variants,
            "srcset": ", ".join(f"{v['url']} {v['width']}w" for v in variants),
            "small_source": width < min(WIDTHS),
        }
    manifest = {
        "version": 1,
        "generator": "scripts/build-images.py",
        "format": "image/webp",
        "quality": QUALITY,
        "resampling": "Lanczos",
        "target_widths": list(WIDTHS),
        "upscaling": False,
        "cropping": False,
        "images": images,
    }
    (OUTPUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    )
    verify()


def verify():
    manifest = json.loads((OUTPUT / "manifest.json").read_text())
    generated = 0
    total_bytes = 0
    for key, record in manifest["images"].items():
        original = ROOT / key.lstrip("/")
        if sha256(original) != record["original_sha256"]:
            raise AssertionError(f"Original changed: {key}")
        source = ROOT / record["source"].lstrip("/")
        if sha256(source) != record["source_sha256"]:
            raise AssertionError(f"Source changed: {source}")
        ow, oh = record["original"]["width"], record["original"]["height"]
        widths = []
        for variant in record["variants"]:
            path = ROOT / variant["url"].lstrip("/")
            with Image.open(path) as image:
                image.load()
                assert image.format == "WEBP", path
                assert image.size == (variant["width"], variant["height"]), path
                assert image.width <= ow, f"Upscaled: {path}"
                assert abs(image.height - oh * image.width / ow) <= 0.5, path
            assert path.stat().st_size == variant["bytes"], path
            widths.append(variant["width"])
            if variant["generated"]:
                generated += 1
                total_bytes += variant["bytes"]
        assert widths == sorted(set(widths)), key
    print(
        f"Verified {len(manifest['images'])} photographs, "
        f"{generated} generated WebP variants, {total_bytes:,} generated bytes."
    )


def generate_avif_hero():
    """Generate AVIF only for the primary bardage photograph; keep WebP intact."""
    if not features.check("avif"):
        raise RuntimeError("Pillow requires AVIF encoding support")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source = SOURCE / "bardage-bois-terrasse.jpg"
    fallback = source.with_suffix(".webp")
    with Image.open(source) as file:
        image = ImageOps.exif_transpose(file).convert("RGB")
    variants = []
    for width in WIDTHS:
        if width > image.width:
            continue
        height = round(image.height * width / image.width)
        variant = OUTPUT / f"{source.stem}-{width}.avif"
        resized = image.resize((width, height), Image.Resampling.LANCZOS)
        resized.save(
            variant,
            "AVIF",
            quality=AVIF_QUALITY,
            speed=AVIF_SPEED,
            subsampling="4:2:0",
            max_threads=2,
        )
        variants.append(describe(variant, width, height, True))
    manifest = {
        "version": 1,
        "generator": "scripts/build-images.py --avif-hero",
        "pillow_version": Image.__version__,
        "libavif_version": features.version("avif"),
        "format": "image/avif",
        "quality": AVIF_QUALITY,
        "speed": AVIF_SPEED,
        "subsampling": "4:2:0",
        "max_threads": 2,
        "resampling": "Lanczos",
        "upscaling": False,
        "cropping": False,
        "images": {
            public_url(fallback): {
                "source": public_url(source),
                "source_sha256": sha256(source),
                "width": image.width,
                "height": image.height,
                "fallback_webp": public_url(fallback),
                "variants": variants,
                "srcset": ", ".join(f"{v['url']} {v['width']}w" for v in variants),
            }
        },
    }
    (OUTPUT / "manifest-avif.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    )
    verify_avif_hero()


def verify_avif_hero():
    manifest = json.loads((OUTPUT / "manifest-avif.json").read_text())
    total = 0
    for record in manifest["images"].values():
        source = ROOT / record["source"].lstrip("/")
        assert sha256(source) == record["source_sha256"], source
        widths = []
        for variant in record["variants"]:
            path = ROOT / variant["url"].lstrip("/")
            with Image.open(path) as image:
                image.load()
                assert image.format == "AVIF", path
                assert image.size == (variant["width"], variant["height"]), path
                assert image.width <= record["width"], f"Upscaled: {path}"
                assert abs(image.height - record["height"] * image.width / record["width"]) <= 0.5, path
            assert path.stat().st_size == variant["bytes"], path
            total += variant["bytes"]
            widths.append(variant["width"])
        assert widths == sorted(set(widths))
    print(f"Verified hero AVIF variants: {total:,} bytes; WebP fallbacks unchanged.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true", help="Verify committed files only")
    parser.add_argument("--avif-hero", action="store_true", help="Build or verify only the primary hero AVIF variants")
    args = parser.parse_args()
    if args.avif_hero:
        verify_avif_hero() if args.verify else generate_avif_hero()
    else:
        verify() if args.verify else generate()
