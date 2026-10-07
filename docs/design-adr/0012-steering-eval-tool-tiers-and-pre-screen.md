---
type: design-adr
status: proposed
---

# The steering eval runs a pinned `npx` tool in three tiers, and pre-screens word steering markers before use

The steering eval under `evals/` (issue #240, design A) needs four things recorded that no Archgate
ADR covers: where its eval tool sits against the dependency admission bar, how its checks split
between the gate and the runs that spend a model, what its exit code means, and how a steering
marker is shown unlikely to occur unprompted. This record states them. It is `proposed` until Han
adds his sentence on the first point; none of it changes an ADR.

**The eval tool sits outside the dependency admission bar, and that reading is stated here.** The
tool is promptfoo, pinned to one exact version in `evals/packages/wrapper` and run through `npx`.
It is in no `package.json`. ARCH-001 governs entries in `dependencies` and `devDependencies`, and
tenet 7 of the architecture vision governs dependencies the product takes on; the tool is neither,
since it never ships, is never imported by `src/`, and is not reachable from `npm run verify` or
`ci.yml`. Both texts are silent about an `npx` tool, so this record reads them as not applying
rather than as an exception to them. What the reading does not remove is tenet 7's step 4, the
transitive tree and install scripts. `npx` fetches a large tree and runs install scripts on the
Operator's machine each time the pin is first used. The mitigations are the exact pin, a child
environment built from an allow-list, the tool's state directory moved into the gitignored
`evals/runs/`, and telemetry, update checks and sharing switched off. The four signals of ARCH-001
Decision 1 were not screened for this tool here. A later reader who disagrees with the reading should amend this record, not work
around it.

**Checks split into three tiers by what they spend.** The gate (`npm run verify`, `ci.yml`) holds
only deterministic checks: the pure Packages against hand-written inputs, and the impure edges
against a stub Host harness. It touches no model, no key and no network, and a scanner reads the
gate and workflow text and fails when a live or self-test script name appears in them. The
self-test tier (`npm run evals:self-test`) runs the real pinned tool and the real wrapper against
the stub; it needs the network to fetch the tool and nothing else, and it is run by hand. The live
tier (`npm run evals:live`, `npm run evals:prescreen`) spends the subscription and is run by the
Operator. A guard that can only be shown red by a live run is not a gate guard; it belongs to the
self-test tier or is stated as unmeasured.

**The exit code is the wrapper's, and the tool's is ignored.** Zero means every expected session
ran and was graded, however badly. One means the instrument could not run, or ran short. Two means
misuse. The tool exits non-zero for a failed assertion, which says nothing about whether the
instrument worked, so the wrapper reads the results the provider wrote, compares their count with
the count the configuration implies and with the tool's own statistics, and derives the code. The
pre-screen follows the same contract: a candidate refused for a hit is a result and exits zero; a
session that failed to run exits one.

**A steering marker is pre-screened, and the pre-screen bounds nothing it cannot.** The committed
steering markers are codes drawn per run from a seed and screened by deterministic leak checks.
The word family, which reads more naturally in a carrier, has a prior no leak check can see, so a
word is admitted only after a pooled pre-screen (`evals/packages/prescreen`). Host harness sessions
with no tools and no hook answer the bare task, once alone and once with the first half of the
carrier. Twenty samples per model per prompt kind are scanned against every candidate in a pool at
once, since a candidate's prior does not depend on the others, and a candidate is admitted only
with zero hits in every cell and the full count. Twenty clean samples bound the unprompted rate
near fifteen percent: enough to refuse a leaky word, not to certify one. The intent-neutralised
arm bounds the rest in the full pipeline. A coined word is fragile without edit tolerance (R5), since a model may
"correct" it toward a real neighbour, so the screen's hit rule counts an answer as saying a candidate
when any word token in it is within one edit (Levenshtein distance one: a substitution, insertion or
deletion) of the candidate, or of the candidate plus a plural `s`, case ignored. Quotes and backticks
fall away because tokens are runs of letters, and a longer word that merely contains the candidate is
a different token and does not hit. A sample count below twenty is refused at the command line and
again in the admission rule. The stub flags (`--stub-say`, `--stub-mode`) are refused unless
`--host stub` is given, and `--candidates` stays on the live entry point so a word drawn earlier or
proposed by hand can be re-screened against the same sessions.

The pre-screen is built and driven against the stub in the self-test tier. It has not been run on a
model. Running it is Han's: `npm run evals:prescreen -- --models sonnet` is forty sessions, inside
the budget; the default three models are one hundred and twenty and need `--allow-over-budget`.

**The session interfaces were revisited for the pre-screen, and nothing was narrowed.** The arms,
session and grading interfaces keep every export they had, because the pre-screen is a second
caller that needs a subset of them and the wrapper still needs all of them. Two widenings were
needed. `session` gained a `host-invocation` root export (`buildClaudeArgv`, `buildChildEnvironment`),
because the pre-screen builds a Host harness argv and a child environment and the only other route
was a deep import into `session/lib`, which the entry-point boundary forbids. `arms` gained
`drawCoinedWord` beside `drawSteeringMarker`, because a coined word is a second marker family drawn
from the same seed and corpus rule, and its home is the generator that already redraws on a corpus
collision.

**Deferred and duplicated on purpose.** The decision 22 sentence (whether a key held by repository
tooling, and an endpoint provider, are within the boundary row about holding a key) is deliberately
not written here: it gates phase 5 (ARCH-007 3.1), and the pre-screen holds no key, reads no `.env`
and spawns its child from the environment allow-list. Three small pieces are duplicated between the
pre-screen and the wrapper rather than shared. The pre-screen's exit derivation (a count short of the
expectation, session failures, a refused candidate exiting zero) is not the wrapper's `deriveExit`,
which is private to the wrapper and reads tool result rows the pre-screen does not have; sharing it
would need a wrapper root export and an edge from one tool-invoked Package to the other's contract.
The tracked-corpus read in the pre-screen and in `adapters` is two copies of one skip list, differing
by `runs`; a shared home would need a root export on `adapters` or `session`, neither of which owns
corpus policy. Each copy carries a comment naming the other, so a change to one is seen from the other.
