#!/usr/bin/env python3
"""
Tests for sync-outline.py, run against a fake Outline API.

Ported from Project Kaithi's `K-13` by `P-24`. The failure there was real: a
sync stopped partway, after creating a document but before writing the
manifest, which left the document orphaned in Outline and would have made a
duplicate on the next run. Praxis carried the same unfixed copy.

Usage:
    python3 tools/test-sync-outline.py
"""
import importlib.util, json, os, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
FAIL = []


def load(root):
    """Load sync-outline.py with ROOT and MANIFEST pointed at a temp project."""
    spec = importlib.util.spec_from_file_location("sync", os.path.join(HERE, "sync-outline.py"))
    mod = importlib.util.module_from_spec(spec)
    os.environ["OUTLINE_URL"], os.environ["OUTLINE_KEY"] = "http://fake", "k"
    spec.loader.exec_module(mod)
    mod.ROOT = root
    mod.MANIFEST = os.path.join(root, "tools", "outline-manifest.json")
    mod.URL, mod.KEY = "http://fake", "k"
    return mod


def project(files, manifest):
    root = tempfile.mkdtemp()
    os.makedirs(os.path.join(root, "tools"))
    for rel, text in files.items():
        path = os.path.join(root, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            f.write(text)
    with open(os.path.join(root, "tools", "outline-manifest.json"), "w") as f:
        json.dump(manifest, f)
    return root


def check(name, cond, detail=""):
    print(("  ok   " if cond else "  FAIL ") + name + ("" if cond else f"\n         {detail}"))
    if not cond:
        FAIL.append(name)


MANIFEST = {"collections": {".": "coll-1"}, "autodiscover": [""], "documents": {}}


def run(mod, *argv):
    """Call main() with argv, catching SystemExit so a test can inspect the fallout."""
    old = sys.argv
    sys.argv = ["sync-outline.py", *argv]
    try:
        mod.main()
        return None
    except BaseException as err:                     # noqa: BLE001 — the point is what it raised
        return err
    finally:
        sys.argv = old


def test_dry_run_on_a_fresh_manifest_does_not_crash():
    """P-24's own complaint: nothing is created, so docs['README.md'] is absent."""
    root = project({"README.md": "# Readme\n\nhello\n"}, dict(MANIFEST))
    mod = load(root)
    mod.api = lambda *a, **k: (_ for _ in ()).throw(AssertionError("dry run must not call the API"))
    err = run(mod, "--dry-run")
    check("a dry run on a fresh manifest finishes", err is None, f"raised {err!r}")


def test_manifest_survives_a_failed_create():
    """The document that was created must be in the manifest before the next call."""
    root = project({"README.md": "# Readme\n", "two.md": "# Two\n"}, dict(MANIFEST))
    mod = load(root)
    made = []

    def api(method, payload):
        if method == "documents.list":
            return {"data": []}
        if method == "documents.create":
            if made:                                  # blow up on the SECOND create
                raise RuntimeError("network died")
            made.append(payload["title"])
            return {"data": {"id": "d1", "url": "/doc/one"}}
        return {"data": {}}

    mod.api = api
    err = run(mod)
    saved = json.load(open(os.path.join(root, "tools", "outline-manifest.json")))["documents"]
    check("a failed run keeps the document it already created",
          len(saved) == 1, f"manifest holds {list(saved)} after {err!r}")


def test_an_orphaned_document_is_adopted_not_duplicated():
    """The failure Kaithi actually hit: a document in Outline, absent from the manifest."""
    root = project({"README.md": "# Readme\n"}, dict(MANIFEST))
    mod = load(root)
    created = []

    def api(method, payload):
        if method == "documents.list":
            return {"data": [{"title": "Readme", "id": "d-old", "url": "/doc/old"}]}
        if method == "documents.create":
            created.append(payload["title"])
            return {"data": {"id": "d-new", "url": "/doc/new"}}
        return {"data": {}}

    mod.api = api
    run(mod)
    saved = json.load(open(os.path.join(root, "tools", "outline-manifest.json")))["documents"]
    check("an existing document is adopted rather than duplicated", not created,
          f"created {created}")
    check("the adopted document keeps its original id",
          saved.get("README.md", {}).get("id") == "d-old", f"manifest says {saved}")


def test_long_titles_are_truncated():
    name = "a-" * 70 + "end.md"                       # ~143 characters once titled
    root = project({name: "# Long\n"}, dict(MANIFEST))
    mod = load(root)
    seen = []

    def api(method, payload):
        if method == "documents.list":
            return {"data": []}
        if method == "documents.create":
            seen.append(payload["title"])
            return {"data": {"id": "d", "url": "/doc/d"}}
        return {"data": {}}

    mod.api = api
    run(mod)
    check("a long title is cut to Outline's limit",
          seen and len(seen[0]) <= mod.TITLE_MAX, f"title was {len(seen[0]) if seen else 0} chars")


for t in [v for k, v in sorted(globals().items()) if k.startswith("test_")]:
    print(t.__name__)
    t()

print(f"\n{len(FAIL)} failed." if FAIL else "\nall passed.")
sys.exit(1 if FAIL else 0)
