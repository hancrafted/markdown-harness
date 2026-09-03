#!/usr/bin/env python3
"""Derive a run repo's enforcer configs from this repository's live ones.

The enforcers must reach every run that gets them, identically, carrying no trace
of the records. Two things are removed: the commentary, which explains the rules
in the vocabulary of the records that motivated them, and the config entries that
point at paths a run repo does not have.

This runs at mint time against the live config, so there is no stored derivative
to fall out of date. Every removal is anchored, and a missed anchor is fatal:
a silently-skipped edit ships the leak.
"""

import re
import sys

# Rewritten in place. The rule still fires and still says what to do; it stops
# naming why. Anchored, so a reword upstream fails the mint instead of leaking.
MESSAGES = [
    (
        "stop: this file sits outside src/packages/<package>/ and no ADR governs it. "
        "Move it into a package, or open a needs-triage issue.",
        "stop: this file sits outside src/packages/<package>/. Move it into a package.",
    ),
]

# Config entries pointing at paths no run repo has.
DROP_LINES = [
    "'.archgate/**/*.rules.ts',",
    "'.archgate/rules.d.ts',",
    "'.agents/skills/prepare-ablation-run/assets/**',",
]

# Whole config blocks, matched from `{ files: [<glob>` to its closing `},`.
DROP_BLOCKS = [
    ".archgate/**/*.rules.test.ts",
    "docs/evals/ablation/kit/tests/**/*.ts",
    "docs/evals/ablation/kit/tests/**/*.acceptance.ts",
]


def strip_comments(text: str) -> str:
    """Remove full-line // comments and /** */ blocks.

    Deliberately leaves trailing comments alone: `//` occurs inside string
    literals here (the AAA marker messages read `// ARRANGE`), and a pass that
    understood those would need a JS parser. The sweep at the end is what proves
    nothing governance-bearing survives in one.
    """
    out, in_block = [], False
    for line in text.split("\n"):
        s = line.strip()
        if in_block:
            if "*/" in s:
                in_block = False
            continue
        if s.startswith("/*"):
            if "*/" not in s:
                in_block = True
            continue
        if s.startswith("//"):
            continue
        out.append(line)
    # Collapse the blank runs the removals leave behind.
    return re.sub(r"\n{3,}", "\n\n", "\n".join(out))


def drop_block(text: str, glob: str) -> str:
    """Remove one `{ files: [...glob...], ... },` object by brace matching."""
    needle = f"'{glob}'"
    i = text.find(needle)
    if i == -1:
        raise SystemExit(f"strip-governance: no block for {glob}")
    start = text.rfind("{", 0, i)
    depth, j = 0, start
    while j < len(text):
        if text[j] == "{":
            depth += 1
        elif text[j] == "}":
            depth -= 1
            if depth == 0:
                break
        j += 1
    end = j + 1
    if text[end : end + 1] == ",":
        end += 1
    return text[:start] + text[end:]


# The governance layer is stamped scaffold, not run output, so a governed run
# excludes it from its own lint gate exactly as this repository does. Dropping the
# entries below without adding this one leaves a governed run opening on 38 errors
# in files it never authored -- a forced violation, which is a fixture defect.
GOVERNED_IGNORE = "      '.archgate/**',\n"
GOVERNED_ANCHOR = "      '.worktrees/**',\n"


def add_governed_ignore(text: str) -> str:
    if GOVERNED_ANCHOR not in text:
        raise SystemExit("strip-governance: no ignores anchor for the governed overlay")
    return text.replace(GOVERNED_ANCHOR, GOVERNED_ANCHOR + GOVERNED_IGNORE, 1)


def main() -> None:
    src, dst, kind = sys.argv[1], sys.argv[2], sys.argv[3]
    variant = sys.argv[4] if len(sys.argv) > 4 else ""
    text = open(src, encoding="utf-8").read()

    if kind == "eslint":
        for glob in DROP_BLOCKS:
            text = drop_block(text, glob)
        for line in DROP_LINES:
            if line not in text:
                raise SystemExit(f"strip-governance: no entry {line}")
            text = text.replace(line + "\n", "", 1)
        for old, new in MESSAGES:
            if old not in text:
                raise SystemExit(f"strip-governance: message anchor missed:\n  {old}")
            text = text.replace(old, new)
        if variant == "governed":
            text = add_governed_ignore(text)

    text = strip_comments(text)
    open(dst, "w", encoding="utf-8").write(text)
    print(f"derived {dst}")


if __name__ == "__main__":
    main()
