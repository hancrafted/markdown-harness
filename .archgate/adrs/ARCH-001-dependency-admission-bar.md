---
type: adr
id: ARCH-001
title: 'Dependency Admission Bar'
domain: architecture
rules: true
files: ['package.json']
paths: ['package.json']
description: 'The four-signal admission bar a candidate dependency clears before a human approves it, and the two-form version-range shape package.json must declare — one a permanent review duty, the other a mechanical rule.'
---

# Dependency Admission Bar

## Context

This ADR serves to define an admission bar for dependencies.

## Decision

### 1. The admission bar — four signals

1. Before approving a new dependency, a human screens it against four signals: GitHub stars ≥1,000; ≥3 contributors or a named maintaining organisation; npm weekly downloads ≥100,000; and a release or maintainer reply within the trailing 12 months.
2. The bar is a soft screen: if a candidate misses a signal, the author records in the commit body which signal was missed and why it is admitted anyway.

### 2. The version-range rule — mechanical, two allowed forms

1. Every entry in `dependencies` and `devDependencies` MUST be written as either a tilde range, `~x.y.z`, or an exact pin, `x.y.z`; all other forms are refused: carets, wildcards, dist-tags, comparison ranges, URLs, and file/link protocols. (📜 Rule: `dependency-range-form`)

### 3. Side work that keeps the standard workflow from violating the rule

1. `.npmrc` carries `save-prefix=~`, so the ordinary `npm install <package>` writes a tilde range by default instead of a caret.

## Do's and Don'ts

### Do's

1. **DO** run the four-signal admission bar — stars, contributors or organisation, downloads, recency — before approving any new dependency. (Decision 1)
2. **DO** record, in the body of the commit that adds a dependency, which signal it missed and why it is admitted anyway, whenever the bar is not fully cleared. (Decision 1)
3. **DO** write every `dependencies` and `devDependencies` entry as either `~x.y.z` or an exact `x.y.z`. (Decision 2, 📜 Rule: `dependency-range-form`)
4. **DO** keep `.npmrc`'s `save-prefix=~` in place so `npm install` does not reintroduce caret ranges. (Decision 3)

### Don'ts

1. **DON'T** hard-refuse a candidate for missing a signal — the bar screens out, a human still decides. (Decision 1)
2. **DON'T** wait for a future rules file to check the four signals; none will ever be legible to a hermetic check. (Decision 1)
3. **DON'T** write a caret range, a wildcard, `latest` or another dist-tag, a bare comparison range, a git or GitHub URL, a `file:` link, or a `link:` link for any dependency. (Decision 2)
4. **DON'T** name a specific package or a specific version verdict in this record — that judgment belongs in the tracker, not at this altitude.

## Consequences

**Positive:**

1. **Enforcement matches the mechanism:** The network-dependent admission bar stays a human review duty, while the syntactic range check runs mechanically on every commit.
2. **Controlled updates and legible exceptions:** Tilde ranges ensure minor upgrades are always deliberate decisions, and soft-admission rationales remain documented in git history.

**Negative:**

1. **No automated teeth for the admission bar:** Nothing mechanically blocks merging a dependency that skipped the bar, nor verifies the truth of recorded exception rationales.
2. **Recency is an imperfect proxy:** A dependency can satisfy the twelve-month signal with a trivial release while lacking active maintainer responsiveness.

**Risks:**

1. **Soft screen decays into a rubber stamp:** Reviewers might approve missed signals without scrutiny. Mitigation: Rationales are recorded in the commit body, visible directly in review and git history.
2. **Thresholds misalign with project risk:** Fixed thresholds may be too strict for small utilities or too loose for sensitive packages. Mitigation: Thresholds live in ADR prose rather than rule code, easily adjusted if risk tolerance evolves.

## Compliance and Enforcement

**Enforcer per Discipline:** `ARCH-001-dependency-admission-bar.rules.ts` holds the version-range Discipline (§2) at the error tier, scoped by `files` to `package.json` — one rule, `dependency-range-form`, checking every entry under `dependencies` and `devDependencies` against the two allowed forms. The four-signal admission bar (§1) is **not mechanically enforced — review duty**, permanently rather than provisionally: every signal it reads is a live fact on a remote service, and the check path this record's rule runs inside is hermetic by design, so no rules file running inside it will ever query a star count, a contributor list, a download figure or a release timestamp. Closing that gap would mean the check path itself stops being hermetic — a different decision than this one.

**Manual review duties** (never linted): the four-signal bar of §1.1 is actually applied by the human approving the change, every time; a soft-admitted dependency's commit body actually names the missed signal and the reason (§1.2); the admission bar is never deferred as pending automation.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [npm docs — `package.json` dependencies](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#dependencies) — the range syntax `~x.y.z` and exact pins are drawn from, alongside every refused form.
- [npm docs — `.npmrc`](https://docs.npmjs.com/cli/v10/configuring-npm/npmrc) — `save-prefix`, the setting that keeps `npm install` from writing a caret.
- [npm registry — download counts](https://github.com/npm/registry/blob/master/docs/download-counts.md) — the weekly download figure the third signal reads.
