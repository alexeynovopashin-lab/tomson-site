#!/usr/bin/env python3
"""Upload dist/ to the Yandex Object Storage bucket `tomson` (S3 API, SigV4, stdlib only).

Keys: ~/.config/tomson/s3.env (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY), created by Alexey,
never stored in a repo. Only changed files are uploaded (compared by MD5 = ETag). Nothing is deleted.
Usage: node build.mjs && python3 deploy.py [--dry-run] [--force]  (--force re-uploads even unchanged files, e.g. to refresh headers)
"""
import datetime, hashlib, hmac, mimetypes, os, sys, urllib.error, urllib.parse, urllib.request

BUCKET, HOST, REGION = "tomson", "storage.yandexcloud.net", "ru-central1"
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
TYPES = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
         ".json": "application/json", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml"}


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


def main():
    dry = "--dry-run" in sys.argv
    force = "--force" in sys.argv
    files = []
    for d, _, names in os.walk(ROOT):
        for n in names:
            if n.startswith("."):
                continue
            full = os.path.join(d, n)
            files.append((os.path.relpath(full, ROOT).replace(os.sep, "/"), full))
    files.sort()
    keys = None if dry else load_keys()
    up = same = 0
    for key, full in files:
        body = open(full, "rb").read()
        if not dry and not force and remote_etag(key, keys) == hashlib.md5(body).hexdigest():
            same += 1
            continue
        ext = os.path.splitext(key)[1].lower()
        ctype = TYPES.get(ext) or mimetypes.guess_type(key)[0] or "application/octet-stream"
        cache = "public, max-age=31536000, immutable" if ext == ".woff2" else "public, max-age=300"
        print(("would upload " if dry else "upload ") + f"{key} ({len(body)//1024} KB, {ctype})")
        if not dry:
            request("PUT", key, keys, body, {"Content-Type": ctype, "Cache-Control": cache})
        up += 1
    print(f"{'planned' if dry else 'uploaded'}={up} unchanged={same}")


if __name__ == "__main__":
    main()
