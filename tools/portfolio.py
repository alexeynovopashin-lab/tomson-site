#!/usr/bin/env python3
"""Add a folder of photos to the site as a portfolio series (Alexey's «папки на Mac»).

    python3 tools/portfolio.py <folder> <series-id> "<Title>" "<alt base>" [--replace]

<series-id> is latin snake/kebab (`lesha-katja`), the alt base reads as «Свадьба Лёши и Кати»
(each photo gets «…, фото N»). Photos are taken in name order, turned upright by EXIF, shrunk to
1600 px (full, lightbox) and 700 px (thumbnail, gallery grid), saved as JPEG q82 WITHOUT metadata
(camera EXIF can carry GPS — the repo is public). File names are content hashes, so a URL never
changes meaning and photos can be cached for a year.

Writes photos/p/<id>/<hash>.jpg, photos/p/<id>/t/<hash>.jpg and the series in content/portfolio.json.
Then: link the series from a service (content/services.json → series) or the landing
(content/fotograf.json → series), `node build.mjs`, and deploy with `python3 deploy.py`.
"""
import hashlib, io, json, os, sys
from math import gcd
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FULL, THUMB, Q = 1600, 700, 82
EXT = (".jpg", ".jpeg", ".png", ".webp", ".heic")


def shrink(img, side):
    im = img.copy()
    im.thumbnail((side, side), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=Q, optimize=True, progressive=True)  # no exif= → metadata dropped
    return buf.getvalue()


def ratio(w, h):
    g = gcd(w, h)
    w, h = w // g, h // g
    # keep CSS aspect-ratio short: snap near-standard shapes, else round to two decimals
    for a, b in ((2, 3), (3, 2), (4, 5), (5, 4), (3, 4), (4, 3), (1, 1), (16, 9), (9, 16)):
        if abs(w / h - a / b) < 0.01:
            return f"{a}/{b}"
    return f"{round(w / h, 3)}/1"


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 4:
        sys.exit(__doc__)
    folder, sid, title, alt = args
    if not sid.replace("-", "").replace("_", "").isalnum() or not sid.isascii():
        sys.exit("series-id: latin letters, digits, - or _")
    pf = os.path.join(ROOT, "content", "portfolio.json")
    data = json.load(open(pf, encoding="utf-8")) if os.path.exists(pf) else {}
    if sid in data and "--replace" not in sys.argv:
        sys.exit(f"series {sid} exists; add --replace to rebuild it")
    names = sorted(n for n in os.listdir(folder) if n.lower().endswith(EXT))
    if not names:
        sys.exit("no photos in " + folder)
    out = os.path.join(ROOT, "photos", "p", sid)
    os.makedirs(os.path.join(out, "t"), exist_ok=True)
    items = []
    for n in names:
        img = ImageOps.exif_transpose(Image.open(os.path.join(folder, n))).convert("RGB")
        full = shrink(img, FULL)
        h = hashlib.md5(full).hexdigest()[:10]
        open(os.path.join(out, h + ".jpg"), "wb").write(full)
        open(os.path.join(out, "t", h + ".jpg"), "wb").write(shrink(img, THUMB))
        items.append({"f": h, "r": ratio(*img.size)})
    data[sid] = {"title": title, "alt": alt, "photos": items}
    json.dump(data, open(pf, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    open(pf, "a").write("\n")
    kb = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(out) for f in fs) // 1024
    print(f"{sid}: {len(items)} photos, {kb} KB in photos/p/{sid}/")


if __name__ == "__main__":
    main()
