#!/usr/bin/env python3
"""
Sync Project Praxis markdown docs -> Outline.

Source of truth is the markdown on disk. Outline is a published, mobile-readable view.
Re-run any time; only changed documents are pushed. New files are created automatically.

Usage:
    export OUTLINE_KEY=ol_api_xxxxx
    python3 tools/sync-outline.py [--dry-run]

Config lives in tools/outline-manifest.json (committed; contains no secrets).
"""
import argparse, hashlib, json, os, posixpath, re, sys, urllib.error, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "tools", "outline-manifest.json")
def _load_dotenv():
    """Load a local .env if present. Never committed — see .env.example."""
    path = os.path.join(ROOT, ".env")
    if not os.path.exists(path):
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip("\"'"))


_load_dotenv()
URL = os.environ.get("OUTLINE_URL", "").rstrip("/")
KEY = os.environ.get("OUTLINE_KEY", "")


def api(endpoint, payload):
    req = urllib.request.Request(
        f"{URL}/api/{endpoint}",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"API error {e.code} on {endpoint}: {e.read().decode()[:400]}")
    except urllib.error.URLError as e:
        sys.exit(f"Cannot reach {URL} ({e.reason}).\n"
                 "Is Tailscale up and is dev-outline running?")


def body(path):
    """File contents minus the duplicate H1 (Outline renders the title itself)."""
    with open(path, encoding="utf-8") as f:
        return re.sub(r"\A#\s+.*?\n", "", f.read()).strip()


def relink(text, src_rel, docs):
    """Rewrite cross-document .md references into Outline URLs."""
    def resolve(target):
        target = target.split("#")[0].strip()
        if not target.endswith(".md"):
            return None
        cand = posixpath.normpath(posixpath.join(posixpath.dirname(src_rel), target))
        return docs.get(cand) or docs.get(target.lstrip("./"))

    def md_link(m):
        label, target = m.group(1), m.group(2)
        hit = resolve(target)
        if not hit:
            return m.group(0)
        if label.strip("`") == target or label.strip("`").endswith(".md"):
            label = hit["title"]
        return f"[{label}]({URL}{hit['url']})"

    def bare(m):
        hit = resolve(m.group(1))
        return f"[{hit['title']}]({URL}{hit['url']})" if hit else m.group(0)

    text = re.sub(r"\[([^\]]+)\]\(([^)]+\.md[^)]*)\)", md_link, text)
    return re.sub(r"`([A-Za-z0-9_./-]+\.md)`", bare, text)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="show what would change, push nothing")
    args = ap.parse_args()

    if not URL or not KEY:
        sys.exit("Set OUTLINE_URL and OUTLINE_KEY — source ~/.config/homelab/env "
                 "or create a .env from .env.example.")
    with open(MANIFEST) as f:
        man = json.load(f)

    docs = man["documents"]

    # Create any local file not yet in the manifest.
    known = set(docs)
    for rel in sorted(man["autodiscover"]):
        for fn in sorted(os.listdir(os.path.join(ROOT, rel) if rel else ROOT)):
            if not fn.endswith(".md"):
                continue
            key = posixpath.join(rel, fn) if rel else fn
            if key in known or not os.path.isfile(os.path.join(ROOT, key)):
                continue
            coll = man["collections"][rel or "."]
            title = fn[:-3].replace("-", " ").replace("_", " ").title()
            print(f"  + NEW  {key}  ->  {title}")
            if args.dry_run:
                continue
            d = api("documents.create", {"title": title, "text": body(os.path.join(ROOT, key)),
                                         "collectionId": coll, "publish": True})["data"]
            docs[key] = {"id": d["id"], "url": d["url"], "title": title, "hash": ""}

    changed = unchanged = 0
    for rel, meta in docs.items():
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            print(f"  ! GONE {rel} (still in Outline — delete there manually if intended)")
            continue
        text = relink(body(path), rel, docs)
        h = hashlib.sha256(text.encode()).hexdigest()[:16]
        if h == meta.get("hash"):
            unchanged += 1
            continue
        changed += 1
        print(f"  ~ SYNC {rel}")
        if not args.dry_run:
            api("documents.update", {"id": meta["id"], "text": text})
            meta["hash"] = h

    if not args.dry_run:
        with open(MANIFEST, "w") as f:
            json.dump(man, f, indent=2)

    verb = "would change" if args.dry_run else "synced"
    print(f"\n{changed} {verb}, {unchanged} unchanged.")
    print(f"{URL}{docs['README.md']['url']}")


if __name__ == "__main__":
    main()
