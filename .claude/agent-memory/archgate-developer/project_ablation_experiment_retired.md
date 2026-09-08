---
name: ablation-experiment-retired
description: main deleted docs/evals wholesale at a425162, so any ticket criterion citing the kit verdict (24/15/22) or a run scaffold is void, not failing
metadata:
  type: project
---

The adr-ablation experiment was retired from `main` by `a425162`
("chore(evals): retire the adr-ablation experiment and remove its resources",
63 files, −3317 lines). `docs/evals/` no longer exists — not the kit, not the
runs directory, not `scaffold-design.md`.

**Why:** Han retired the experiment once it had served its purpose; the same
commit also pulled `eslint.config.mjs`, trimmed `tsconfig.build.json`, and cut
85 lines from `src/packages/cli/tests/cli.test.ts`.

**How to apply:** Tickets written before 2026-09-07 still cite the apparatus.
Issue #40's acceptance criterion 5 — "the frozen kit verdict still reproduces:
24 governed / 15 invalid / 22 violations" — is **unsatisfiable, not failing**;
say so and move on rather than hunting for the kit or reconstructing it.
Expect the same in the other #29 frontier tickets (#41, #43, #44, #45), which
were authored in the same sitting. The live corpus is now
`fixtures/conformance/` alone, and its verdict is 36 governed / 24 invalid /
28 violations as of the #40 fix.

The "18 of 18 codes reached" half of that criterion is separately
unverifiable: `FieldViolationCode` is a TypeScript type union in
`src/packages/response-contract/lib/violation.types.ts`, erased at runtime, so
nothing can enumerate it. That is precisely what issue #44 exists to fix —
see [[evaluate-arrays-never-grep-them]] and [[enforcer-can-read-the-source]]
for the same shape of problem.

Ablation-era memories still hold as _lessons_ but their file paths are gone:
[[variant-in-run-id-is-deliberate]], [[docs-workshop-not-for-instruments]],
[[session-log-token-accounting]], [[spec-holds-behaviour-not-setup]],
[[fixture-never-models-the-treatment]].

Also stale for the same reason: **[Map: mh-cli](https://github.com/hancrafted/markdown-harness/issues/29)'s
Destination names `docs/evals/ablation/implementation-spec.md` as its requirements source**, and cites
"spec §9" for several Out-of-scope rulings. That path is gone, so those rulings can no longer be
checked against their source. Argue them from `architecture.md`'s tenets instead — the reasoning
survived the deletion even though the document did not.
