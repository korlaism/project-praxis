#!/usr/bin/env python3
"""
Documentation consistency checks.

Run before syncing to Outline. Catches the drift that is easy to introduce and
invisible in review: an ADR whose status no longer matches the decision table in
README.md, or a status string that is not one the template permits.

Usage:
    python3 tools/check-docs.py
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VALID = ("Proposed", "Accepted", "Open")
FAIL = []


def fail(msg):
    FAIL.append(msg)


def adr_statuses():
    """Map ADR number -> (status, filename), skipping the template."""
    out = {}
    d = os.path.join(ROOT, "decisions")
    for fn in sorted(os.listdir(d)):
        if not fn.endswith(".md") or "template" in fn:
            continue
        num = fn.split("-")[0]
        text = open(os.path.join(d, fn), encoding="utf-8").read()
        m = re.search(r"\*\*Status:\*\*\s*([^\n*]+?)\s*(?:\*\*|$)", text, re.M)
        if not m:
            fail(f"decisions/{fn}: no '**Status:**' line")
            continue
        status = m.group(1).strip()
        if not (status in VALID or status.startswith("Superseded by ")):
            fail(f"decisions/{fn}: status {status!r} is not one the template permits "
                 f"({', '.join(VALID)}, or 'Superseded by NNNN')")
        out[num] = (status, fn)
    return out


def readme_statuses():
    """Map ADR number -> status, read from the decision table in README.md."""
    out = {}
    for line in open(os.path.join(ROOT, "README.md"), encoding="utf-8"):
        m = re.match(r"\|\s*\[(\d{4})\]\([^)]+\)\s*\|[^|]*\|\s*([^|]+?)\s*\|", line)
        if m:
            out[m.group(1)] = m.group(2).strip()
    return out


def main():
    adrs, readme = adr_statuses(), readme_statuses()

    if not adrs:
        fail("no ADRs found in decisions/")
    if not readme:
        fail("README.md: no decision table rows matched — has the table changed shape?")

    for num, (status, fn) in sorted(adrs.items()):
        if num not in readme:
            fail(f"decisions/{fn}: ADR {num} is missing from the README decision table")
        elif readme[num] != status:
            fail(f"ADR {num}: decisions/{fn} says {status!r}, "
                 f"README decision table says {readme[num]!r}")

    for num in sorted(set(readme) - set(adrs)):
        fail(f"README decision table lists ADR {num}, which has no file in decisions/")

    if FAIL:
        print(f"{len(FAIL)} problem(s):\n")
        for f in FAIL:
            print(f"  ✗ {f}")
        sys.exit(1)
    print(f"{len(adrs)} ADRs consistent with the README decision table.")


if __name__ == "__main__":
    main()
