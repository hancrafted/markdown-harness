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

Adding a dependency has been a silent act: one line in `package.json`, one `npm install`, no gate near either. Two different questions hide in that silence, needing two different remedies.

The first is judgment: is this candidate worth trusting with a place in the supply chain. Stars, contributor breadth, download volume and how recently anyone answered a maintenance question are real signals, but none lives inside the files under review — reading them means leaving the repository for a live service, exactly what a hermetic check path cannot do. A screen built from facts like these can never become an automated rule; humans must run it themselves, every time.

The second is shape: what the declared version range lets `npm update` move. That question is fully legible from `package.json` and its lockfile, already inside the repository — and a question answerable from files already in hand is exactly what a rules file exists to enforce.

Rejected alternative: one mechanism for both. Folding a network-dependent judgment call into the same gate as a syntactic range check either drags the syntactic check down to a skippable warning, or dresses the judgment call up as a promise no tool can keep. Splitting them keeps the syntactic half enforced on every commit and names the judgment half, plainly, as a duty no future tooling will absorb.

The tooling that runs this very check is itself a `package.json` entry, bound by the same two gates it defines.

## Decision

### 1. Scope

1. `package.json` is governed: every entry under `dependencies` and every entry under `devDependencies` answers to both gates below.
2. `.npmrc` stays ungoverned — the version-range gate already catches any caret it might cause `npm install` to write, so scoping `.npmrc` too would widen coverage without adding anything new to catch.

### 2. The admission bar — four signals, screening candidates out

1. Before a human approves a new dependency, it is screened against four signals: GitHub stars at or above one thousand; three or more contributors, or a named maintaining organisation; npm weekly downloads at or above one hundred thousand; and a release, or a maintainer reply on an open issue, within the trailing twelve months.
2. The fourth signal tests recency, not activity. A commit-based signal such as "activity within six months" mistakes stillness for abandonment — a finished library can go a year without a commit and need none, while a maintainer would still answer within a day of a CVE landing. Asking whether anyone recently shipped or replied asks whether a person still stands behind the project, without penalising code that is simply done.
3. A human-versus-AI authorship split is deliberately refused as a fifth signal: no platform publishes it. GitHub attaches no such label to a contributor, npm carries no such field on a package, and a co-author trailer in a commit is voluntary and unverified. A signal nobody can measure is a signal nobody can apply consistently.
4. The bar screens candidates **out**; clearing all four signals is necessary attention, never sufficient approval. A human always decides, and may still decline a candidate that clears every one of them.

### 3. The bar is a soft screen, not a hard gate

1. A candidate missing a signal is not refused outright. Whoever adds it records, in the body of the commit that introduces the dependency, which signal it missed and why it is admitted anyway.
2. This needs no ledger: the commit gate already in force requires every commit to carry a body, so the exception rides on infrastructure that already exists.
3. A hard refusal breaks on its first legitimate exception, and a rule broken once is trusted less on every check after. A soft screen with a recorded reason stays credible indefinitely.

### 4. The bar is permanently a review duty

1. Every signal in §2 is a fact that changes on a remote service — a star count, a contributor list, a download counter, a timestamp — and none of it exists inside a file a hermetic check path may open.
2. This is not a gap awaiting a future rule. A check that cannot leave the repository can never observe a remote fact, so the bar in §2 stays a human duty for as long as the check path stays hermetic — permanently, not provisionally.

### 5. The version-range rule — mechanical, two allowed forms

1. Every entry in `dependencies` and every entry in `devDependencies` MUST be written as either a tilde range, `~x.y.z`, or an exact pin, `x.y.z`.
2. The tilde range is the default: a patch release moves without a commit, a minor release requires someone to widen the declared range on purpose. The exact pin is for the rarer case where even a patch must not move unannounced.
3. Everything else is refused: a caret range, a bare wildcard, the `latest` tag or any other dist-tag, a bare comparison range such as a lone `>=`, a git or GitHub URL dependency, a `file:` link, and a `link:` link.
4. The range is mechanically meaningful, not stylistic: with a committed lockfile and `npm ci`, the declared range does nothing at install time, since installs already reproduce the lockfile exactly. What it controls is how far `npm update` may move a dependency without a human first editing `package.json` — under a caret range, a minor release of a devDependency such as a linter or a type checker can arrive unchosen; under a tilde range, it cannot. (📜 Rule: `dependency-range-form`)

### 6. Side work that keeps the standard workflow from violating the rule

1. `.npmrc` carries `save-prefix=~`, so the ordinary `npm install <package>` writes a tilde range by default instead of a caret. Without it, the standard install command breaks the rule on its very first use, and a rule the standard command violates is a rule people route around.
2. Every existing devDependency range moved from a caret to a tilde in this same change — a pure operator swap: every locked version already equals its declared base version, so tightening the written range moves nothing already installed.
3. A dependency already declared at a `0.x` version with a caret sees no behavioural change from this move: npm already treats a caret and a tilde identically below the first stable major version, so only the written character changes for that category.

## Do's and Don'ts

### Do's

1. **DO** run the four-signal admission bar — stars, contributors or organisation, downloads, recency — before approving any new dependency. (Decision 2)
2. **DO** record, in the body of the commit that adds a dependency, which signal it missed and why it is admitted anyway, whenever the bar is not fully cleared. (Decision 3)
3. **DO** treat the admission bar as a review duty every time, never as a check waiting on future automation. (Decision 4)
4. **DO** write every `dependencies` and `devDependencies` entry as either `~x.y.z` or an exact `x.y.z`. (Decision 5, 📜 Rule: `dependency-range-form`)
5. **DO** keep `.npmrc`'s `save-prefix=~` in place so `npm install` does not reintroduce caret ranges. (Decision 6)

### Don'ts

1. **DON'T** hard-refuse a candidate for missing a signal — the bar screens out, a human still decides. (Decision 3)
2. **DON'T** wait for a future rules file to check the four signals; none will ever be legible to a hermetic check. (Decision 4)
3. **DON'T** write a caret range, a wildcard, `latest` or another dist-tag, a bare comparison range, a git or GitHub URL, a `file:` link, or a `link:` link for any dependency. (Decision 5)
4. **DON'T** add a human-versus-AI authorship split to the admission bar; no platform publishes a signal that measures it. (Decision 2)
5. **DON'T** name a specific package or a specific version verdict in this record — that judgment belongs in the tracker, not at this altitude.

## Consequences

**Positive:**

1. **Judgment and shape are each enforced by the mechanism suited to it:** the network-dependent bar stays a human duty that scales with attention, and the syntactic range check runs on every commit without needing anyone to remember it.
2. **The standard workflow can't drift the rule:** `.npmrc`'s `save-prefix=~` means the everyday `npm install` already produces a compliant range.
3. **Exceptions stay legible:** a soft-admitted dependency's rationale lives in the commit body that added it — visible in `git log` forever, with no separate ledger to fall out of sync.
4. **A minor upgrade is always a decision:** under a tilde range, nobody discovers a new minor version by surprise; someone chose to widen the range on purpose.

**Negative:**

1. **The admission bar has no enforcement teeth:** nothing blocks a merge that skipped it, and nothing verifies that a recorded exception's stated reason is actually true.
2. **Recency is still an imperfect proxy:** a project can satisfy the twelve-month signal with one trivial release and still have an unresponsive maintainer behind it.
3. **Tightening every declared range front-loads review load:** a dependency already on a refused form needs a deliberate range edit before its next commit touches `package.json`, rather than being grandfathered in silently.

**Risks:**

1. **A soft screen decays into a rubber stamp if nobody reads the recorded reasons.** Mitigation: the reason lives in the commit body the review already reads before merging, not in a separate document a reviewer must remember to open.
2. **The four thresholds may prove wrong for this project's actual risk tolerance** — too strict for a narrow utility, too loose for something with write access to user data. Mitigation: the thresholds are numbers in this text, not in the rules file, so revising them is a documentation edit, not a code change.

## Compliance and Enforcement

**Enforcer per Discipline:** `ARCH-001-dependency-admission-bar.rules.ts` holds the version-range Discipline (§5) at the error tier, scoped by `files` to `package.json` — one rule, `dependency-range-form`, checking every entry under `dependencies` and `devDependencies` against the two allowed forms. The four-signal admission bar (§2–§4) is **not mechanically enforced — review duty**, permanently rather than provisionally: every signal it reads is a live fact on a remote service, and the check path this record's rule runs inside is hermetic by design, so no rules file running inside it will ever query a star count, a contributor list, a download figure or a release timestamp. Closing that gap would mean the check path itself stops being hermetic — a different decision than this one.

**Manual review duties** (never linted): the four-signal bar of §2 is actually applied by the human approving the change, every time; a soft-admitted dependency's commit body actually names the missed signal and the reason (§3.1); the admission bar is never deferred as pending automation (§4.2).

**Exceptions:** raise a separate ADR; human approval required.

## References

- [npm docs — `package.json` dependencies](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#dependencies) — the range syntax `~x.y.z` and exact pins are drawn from, alongside every refused form.
- [npm docs — `.npmrc`](https://docs.npmjs.com/cli/v10/configuring-npm/npmrc) — `save-prefix`, the setting that keeps `npm install` from writing a caret.
- [npm registry — download counts](https://github.com/npm/registry/blob/master/docs/download-counts.md) — the weekly download figure the third signal reads.
