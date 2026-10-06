#!/usr/bin/env python3
"""Publish the site to the Yandex Object Storage bucket `tomson` (S3 API, SigV4, stdlib only).

The site is the main copy of prices and photos: Alexey changes them in the admin (/admin/) and
the cloud function writes them straight into the bucket. So every run goes in three steps:
  1. pull — take admin-owned content (prices.json, videos.json: manifest → adminFiles) and
     replaced photos from the bucket into content/ and photos/
     (stops if the same file was also changed here and not committed: someone's edit would be lost);
  2. build — node build.mjs;
  3. push — upload changed files of dist/ (compared by MD5 = ETag). Nothing is deleted.
After a pull, commit what came from the admin (the script prints the list).

Keys: ~/.config/tomson/s3.env (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY), created by Alexey,
never stored in a repo.
Usage: python3 deploy.py [--dry-run] [--force] [--pull-only]
  --force re-uploads even unchanged files, e.g. to refresh headers
"""
import datetime, hashlib, hmac, json, mimetypes, os, subprocess, sys, urllib.error, urllib.parse, urllib.request

BUCKET, HOST, REGION = "tomson", "storage.yandexcloud.net", "ru-central1"
PROJECT = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(PROJECT, "dist")
TYPES = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
         ".mjs": "text/javascript; charset=utf-8",
         ".json": "application/json", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml",
         ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8"}


def load_keys():
    p = os.path.expanduser("~/.config/tomson/s3.env")
    env = {}
    for line in open(p):
        if "=" in line:
            k, v = line.strip().split("=", 1)
            env[k] = v
    return env["AWS_ACCESS_KEY_ID"], env["AWS_SECRET_ACCESS_KEY"]


def sign(key, msg):
    return hmac.new(key, msg.encode(), hashlib.sha256).digest()


def request(method, path, keys, body=b"", extra=None):
    ak, sk = keys
    now = datetime.datetime.now(datetime.timezone.utc)
    amz, day = now.strftime("%Y%m%dT%H%M%SZ"), now.strftime("%Y%m%d")
    uri = "/" + BUCKET + "/" + urllib.parse.quote(path, safe="/-_.~")
    payload = hashlib.sha256(body).hexdigest()
    headers = {"host": HOST, "x-amz-content-sha256": payload, "x-amz-date": amz}
    signed = ";".join(sorted(headers))
    canon = "\n".join([method, uri, "", "".join(f"{k}:{headers[k]}\n" for k in sorted(headers)), signed, payload])
    scope = f"{day}/{REGION}/s3/aws4_request"
    sts = "\n".join(["AWS4-HMAC-SHA256", amz, scope, hashlib.sha256(canon.encode()).hexdigest()])
    k = sign(sign(sign(sign(("AWS4" + sk).encode(), day), REGION), "s3"), "aws4_request")
    sig = hmac.new(k, sts.encode(), hashlib.sha256).hexdigest()
    h = {k: v for k, v in headers.items() if k != "host"}
    h["Authorization"] = f"AWS4-HMAC-SHA256 Credential={ak}/{scope}, SignedHeaders={signed}, Signature={sig}"
    h.update(extra or {})
    req = urllib.request.Request(f"https://{HOST}{uri}", data=body if method == "PUT" else None, headers=h, method=method)
    return urllib.request.urlopen(req, timeout=60)


def remote_etag(path, keys):
    try:
        return request("HEAD", path, keys).headers.get("ETag", "").strip('"')
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def remote_get(path, keys):
    try:
        return request("GET", path, keys).read()
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def known_versions(rel):
    """Git blob ids of every committed version of a file. A copy on the site that matches one of
    them is an old publish, not an admin edit: taking it would roll back newer work here."""
    shas = subprocess.run(["git", "log", "--format=%H", "--", rel], cwd=PROJECT, capture_output=True, text=True).stdout.split()
    blobs = set()
    for c in shas:
        r = subprocess.run(["git", "rev-parse", f"{c}:{rel}"], cwd=PROJECT, capture_output=True, text=True)
        if r.returncode == 0:
            blobs.add(r.stdout.strip())
    return blobs


def blob_id(body):
    return hashlib.sha1(b"blob %d\0" % len(body) + body).hexdigest()


def uncommitted(rel):
    return subprocess.run(["git", "diff", "--quiet", "HEAD", "--", rel], cwd=PROJECT).returncode != 0


def pull(keys, dry):
    """Bring what Alexey changed in the admin into the working copy. Returns the pulled paths."""
    pulled, conflicts, plan = [], [], []
    raw = remote_get("_src/manifest.json", keys)
    if raw is None:
        return []  # the site was never published with the admin: nothing to take
    manifest = json.loads(raw)
    for name in manifest.get("adminFiles", ["prices.json"]):
        body = remote_get(f"_src/content/{name}", keys)
        local = os.path.join(PROJECT, "content", name)
        rel = f"content/{name}"
        if body is None or (os.path.exists(local) and open(local, "rb").read() == body):
            continue
        if blob_id(body) in known_versions(rel):
            continue  # the site has an older publish of this file: the local copy is newer
        plan.append((rel, body))
    for slot, v in manifest["versions"].items():
        rel = f"photos/{slot}.jpg"
        path = os.path.join(PROJECT, rel)
        if os.path.exists(path) and hashlib.md5(open(path, "rb").read()).hexdigest()[:8] == v:
            continue
        body = remote_get(rel, keys)
        if body is None or hashlib.md5(body).hexdigest()[:8] != v:
            sys.exit(f"stop: {rel} on the site does not match its version {v}; run again in a minute")
        if blob_id(body) in known_versions(rel):
            continue  # an older publish of this photo: the local one is newer (or was removed on purpose)
        plan.append((rel, body))
    for rel, body in plan:
        if uncommitted(rel):
            conflicts.append(rel)
    if conflicts:
        sys.exit("stop: changed both in the admin and here (uncommitted): " + ", ".join(conflicts)
                 + "\nCommit or drop the local change first, then run again.")
    for rel, body in plan:
        print(("would take " if dry else "take ") + rel + " from the admin")
        if not dry:
            with open(os.path.join(PROJECT, rel), "wb") as f:
                f.write(body)
        pulled.append(rel)
    return pulled


def main():
    dry = "--dry-run" in sys.argv
    force = "--force" in sys.argv
    keys = load_keys()
    pulled = pull(keys, dry)
    if "--pull-only" in sys.argv:
        print(f"pulled={len(pulled)}")
        return
    r = subprocess.run(["node", "build.mjs"], cwd=PROJECT)
    if r.returncode:
        sys.exit("stop: build failed, nothing uploaded")
    files = []
    for d, _, names in os.walk(ROOT):
        for n in names:
            if n.startswith("."):
                continue
            full = os.path.join(d, n)
            files.append((os.path.relpath(full, ROOT).replace(os.sep, "/"), full))
    files.sort()
    up = same = 0
    for key, full in files:
        body = open(full, "rb").read()
        if not force and remote_etag(key, keys) == hashlib.md5(body).hexdigest():
            same += 1
            continue
        ext = os.path.splitext(key)[1].lower()
        ctype = TYPES.get(ext) or mimetypes.guess_type(key)[0] or "application/octet-stream"
        if ext == ".woff2":
            cache = "public, max-age=31536000, immutable"
        elif ext in (".html", ".json", ".mjs", ".txt", ".xml"):
            cache = "no-cache"  # prices change from the admin: always ask the site if the page is still current
        elif key.startswith("photos/"):
            cache = "public, max-age=31536000"  # pages link photos with ?v=<hash>, a new photo gets a new address
        else:
            cache = "public, max-age=300"
        print(("would upload " if dry else "upload ") + f"{key} ({len(body)//1024} KB, {ctype})")
        if not dry:
            request("PUT", key, keys, body, {"Content-Type": ctype, "Cache-Control": cache})
        up += 1
    print(f"{'planned' if dry else 'uploaded'}={up} unchanged={same}")
    for name in ("prices.json", "videos.json"):
        local = open(os.path.join(PROJECT, "content", name), "rb").read()
        if not dry and remote_get(f"_src/content/{name}", keys) != local:
            print(f"WARNING: {name} was changed in the admin during this upload; run deploy.py again")
    if pulled:
        print("from the admin, commit these: " + " ".join(pulled))


if __name__ == "__main__":
    main()
