---
type: design-adr
status: accepted
---

# Glob matching is case-insensitive on a case-insensitive host, but only in a segment carrying a wildcard

Path matching delegates to `node:path`'s `matchesGlob`, and that builtin configures its matcher with
case-insensitivity keyed to the **host operating system** — read from the real machine, not from the
path flavour being called — and applies it only to pattern segments that contain a wildcard. So on
macOS an uppercase filename matches a lowercase wildcard pattern and does not match the equivalent
literal pattern, and on Linux neither matches. Measured 2026-09-07 on macOS, Node 26.5.0:

| path                             | pattern                   | host    | `posix.` | `win32.` |
| -------------------------------- | ------------------------- | ------- | -------- | -------- |
| `docs/README.MD`                 | `**/*.md`                 | `true`  | `true`   | `true`   |
| `docs/README.MD`                 | `docs/*.md`               | `true`  | `true`   | `true`   |
| `docs/README.MD`                 | `docs/readme.md`          | `false` | `false`  | `false`  |
| `DOCS/readme.md`                 | `docs/**/*.md`            | `false` | `false`  | `false`  |
| `docs/skills/anonymous/SKILL.md` | `docs/skills/**/SKILL.md` | `true`  | `true`   | `true`   |
| `docs/skills/anonymous/skill.md` | `docs/skills/**/SKILL.md` | `false` | `false`  | `false`  |

This contradicts tenet 3 in its own words — _the same tree in gives the same result out_ — and it is
internally inconsistent on a single machine: on one host, one pattern is case-sensitive and its
wildcard equivalent is not. It is recorded here and fixed under its own ticket,
[#51](https://github.com/hancrafted/markdown-harness/issues/51), because the fix is a change to what
a config means and this change is a packaging change.

`docs/vision/architecture.md` already lists _"Glob semantics are written into the specification"_
among the decisions cheap now and expensive later, and says that delegating to a runtime builtin is
fine while inheriting undocumented semantics from one is not, _"because a future port has nothing to
hit"_. This is that decision coming due: the behaviour above is exactly the undocumented half.

**The current corpus is not exposed.** The only uppercase paths in either corpus are three
`docs/skills/**/SKILL.md` files, and that selector's final segment carries no wildcard — so it stays
case-sensitive on every host, and the last row of the table is what makes that concrete. The frozen
Conformance and acceptance verdicts are therefore platform-stable today, which is what makes
recording this cheaper than fixing it in the same change.

## Considered options

**Normalise case globally**, lowercasing both path and pattern before matching. Rejected, and it is
the option worth naming because it looks like the simple fix. It silently changes what an uppercase
filename means: `README.md` and `readme.md` become the same document to every rule on every host,
including the rules that today deliberately name `SKILL.md` in full. A fix that quietly widens every
selector in every adopter's config is worse than the divergence it removes.

**Pass the path flavour explicitly**, calling `posix.matchesGlob` so behaviour stops depending on the
host. Rejected on measurement: it does not work. Every row above answers identically under the host
function, `posix.matchesGlob` and `win32.matchesGlob`, because the case-insensitivity flag is read
from `process.platform` inside the matcher rather than being a property of the flavour. There is no
flavour argument that turns it off.

**Write our own matcher, or admit a glob library.** Rejected. Tenet 7's procedure prefers the
standard library, and `ARCH-001`'s Admission bar would be engaged for a defect that is loud rather
than silent — a matcher that answers wrongly fails the Conformance suite. Owning a glob
implementation is a large, permanent surface next to a divergence that no current selector reaches.

**Refuse a selector whose wildcard-bearing segments carry uppercase.** Deferred to
[#51](https://github.com/hancrafted/markdown-harness/issues/51), and the option this record expects
to become the fix. It leaves matching exactly as it is and makes
the divergent case unreachable rather than reinterpreted, which is the only shape of fix that cannot
change what an existing sound config means. It is deferred rather than taken here because it changes
what a config may say, and reviewing that alongside a publishing pipeline would put two unrelated
verdicts in one pull request.

## Consequences

1. **The specification owes a sentence it does not yet have.** Under tenet 4 the config language is
   public, so path matching is public behaviour, and "case sensitivity follows the host" is currently
   inherited rather than declared. Until the follow-up lands, this record is the declaration, and a
   reimplementation reading it has something to hit.
2. **Windows is unmeasured, and the smoke matrix is the only instrument.** Case-insensitivity keys on
   the host, so no macOS or Linux run can establish what a Windows host answers — calling
   `win32.matchesGlob` from macOS measures macOS, as the table shows. That is the reason
   `smoke.yml` runs a three-platform matrix rather than a reasoned argument about paths, and it is
   the one thing in this repository that cannot be settled from a developer's machine.
3. **The declared Node range is a separate matter with the same cause.** Which releases carry the
   segment-aware behaviour at all is a question about the matcher library each Node bundles, and it
   is answered by `engines` and the runtime refusal recorded in
   `docs/design-adr/0004-compiled-entry-and-bounded-tarball.md`. Both come from delegating to the
   host; neither fixes the other.
4. **A corpus that adds an uppercase wildcard-matched path becomes platform-dependent silently.**
   Nothing fails, nothing warns, and the two hosts disagree about how many files are governed. Until
   the follow-up refusal exists, that is a review duty on any new fixture path and on any adopter
   config this repository ships as a Preset.
