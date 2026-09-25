#!/usr/bin/env python3
"""
Documentation consistency checks.

Run before syncing to Outline. Catches the drift that is easy to introduce and
invisible in review: an ADR whose status no longer matches the decision table in
README.md, a status string that is not one the template permits, or an ADR
accepted while it still rests on a claim the run has not yet settled.

Usage:
    python3 tools/check-docs.py
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VALID = ("Proposed", "Accepted", "Open")
FAIL = []


def fail(msg):
    FAIL.append(msg)


# Falsifiable claims from spec/02-requirements.md section 1. An ADR that rests on
# one of these is wrong if the claim is false, so it cannot be Accepted until the
# run settles it. Nothing is settled while Phase 0 is still ahead of us.
#
# R-035 is Exploratory: not merely unsettled but untestable by this phase, so it
# never leaves this tuple. tools/claims.test.mjs keeps this list and the spec in
# step — they are written by hand in two files and nothing else connects them.
UNSETTLED = ("R-001", "R-002", "R-003", "R-004", "R-005", "R-035")


def relative_links():
    """Every relative markdown link, and whether it resolves.

    Writing the product documentation turned up two links in ADR 0016 pointing
    at decisions/0005-park-the-pilot.md, which has never existed — the file is
    0005-channel-first.md. Nothing caught it: this checker compared ADR
    statuses against the README and never followed a link. A decision record
    whose cross-references rot is a decision record nobody can follow back.
    """
    import glob
    broken = []
    for path in ["README.md"] + sorted(
        glob.glob(os.path.join(ROOT, "decisions", "*.md"))
        + glob.glob(os.path.join(ROOT, "spec", "*.md"))
        + glob.glob(os.path.join(ROOT, "research", "*.md"))
        + glob.glob(os.path.join(ROOT, "lab", "**", "*.md"), recursive=True)
    ):
        full = path if os.path.isabs(path) else os.path.join(ROOT, path)
        rel = os.path.relpath(full, ROOT)
        text = open(full, encoding="utf-8").read()
        for m in re.finditer(r"\[[^\]]*\]\(([^)\s#]+)(?:#[^)]*)?\)", text):
            target = m.group(1)
            if target.startswith(("http://", "https://", "mailto:")):
                continue
            resolved = os.path.normpath(os.path.join(os.path.dirname(full), target))
            if not os.path.exists(resolved):
                broken.append(f"{rel}: link to {target!r} does not resolve")
    for b in broken:
        fail(b)


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

        r = re.search(r"\*\*Rests on:\*\*\s*([^\n*]+?)\s*(?:\*\*|$)", text, re.M)
        if not r:
            fail(f"decisions/{fn}: no '**Rests on:**' field — say 'judgment' for a design "
                 f"stance, or name the requirement ids the decision depends on")
        elif status == "Accepted":
            depends = [c for c in UNSETTLED if c in r.group(1)]
            if depends:
                fail(f"decisions/{fn}: Accepted while resting on {', '.join(depends)} — "
                     f"unproven until the run settles them. Either narrow the decision to "
                     f"the part that stands on judgment, or leave it Proposed")
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


relative_links()

if __name__ == "__main__":
    main()
