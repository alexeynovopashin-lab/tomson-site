#!/usr/bin/env python3
"""Add a folder of photos to the site as a portfolio series (Alexey's «папки на Mac»).

    python3 tools/portfolio.py <folder> <series-id> "<Title>" "<alt base>" [--place=<p>,<p>] [--replace]

<series-id> is latin snake/kebab (`lesha-katja`), the alt base reads as «Свадьба Лёши и Кати»
(each photo gets «…, фото N»). Photos are taken in name order, turned upright by EXIF, shrunk to
1600 px (full, lightbox) and 700 px (thumbnail, gallery grid), saved as JPEG q82 WITHOUT metadata
(camera EXIF can carry GPS — the repo is public). File names are content hashes, so a URL never
changes meaning and photos can be cached for a year.

Places: `fotograf` (the landing) and/or service slugs from content/services.json, e.g.
--place=fotograf,semejnyj-portret. Alexey can change places later in the admin tab «Портфолио».
Writes photos/p/<id>/alexey_novopashin-<hash>.jpg (+ t/ thumbnail) and the series in content/portfolio.json
(an admin-owned file: run `python3 deploy.py --pull-only` BEFORE this, commit, then deploy).
"""
import hashlib, io, json, os, re, sys
from math import gcd
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FULL, THUMB, Q = 1600, 700, 82
PREFIX = "alexey_novopashin-"
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
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,58}[a-z0-9]", sid):  # same rule as the admin (seriesIdOk)
        sys.exit("series-id: small latin letters, digits and -, e.g. semja-ivanovyh")
    places = [p for a in sys.argv if a.startswith("--place=") for p in a[8:].split(",") if p]
    known = {"fotograf"} | {k["slug"] for k in json.load(open(os.path.join(ROOT, "content", "services.json"), encoding="utf-8"))["list"]}
    if set(places) - known:
        sys.exit(f"unknown place: {sorted(set(places) - known)}; known: {sorted(known)}")
    pf = os.path.join(ROOT, "content", "portfolio.json")
    data = json.load(open(pf, encoding="utf-8")) if os.path.exists(pf) else []
    old = next((x for x in data if x["id"] == sid), None)
    if old and "--replace" not in sys.argv:
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
        n = PREFIX + h  # same name rule as render.mjs → PHOTO_PREFIX
        open(os.path.join(out, n + ".jpg"), "wb").write(full)
        open(os.path.join(out, "t", n + ".jpg"), "wb").write(shrink(img, THUMB))
        items.append({"f": h, "n": n, "r": ratio(*img.size)})
    series = {"id": sid, "title": title, "alt": alt, "places": places or (old["places"] if old else []), "photos": items}
    data = [series if x is old else x for x in data] if old else data + [series]
    json.dump(data, open(pf, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    open(pf, "a").write("\n")
    kb = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(out) for f in fs) // 1024
    print(f"{sid}: {len(items)} photos, {kb} KB in photos/p/{sid}/")


if __name__ == "__main__":
    main()
