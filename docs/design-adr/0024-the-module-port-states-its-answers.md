---
type: design-adr
status: accepted
---

# The Module port states its answers: one `Unreadable`, `query` always a list, answers pinned in `cli`

Amends design-ADR 0015 (the Module's `query` is a list of claims; the lists were not written down as the one shape) and
[`0011`](./0011-claim-is-what-a-module-asks-of-a-path.md) (a claim may come back alone). Builds on
[`0023`](./0023-core-reads-each-document-once.md), whose `Unreadable` this adopts. The `ModuleDescriptor` stays at
six members.

## What was measured

After 0023, `{ kind: 'unreadable'; path }` was still restated six times in `cli`:
`audit-report.pure.ts` (twice), `corpus-verdict.pure.ts` (twice) and `termination.types.ts` (twice).
`checkVerdict` ended in `throw new Error('unreadable Module result escaped its guard')`, and
`pathGovernance` took `ModuleClaim | ModuleClaim[] | undefined` and cast. The pair "descriptor key plus its
answer" was redeclared as `ModuleAnswer` in three composers, and `invocation-run.impure.ts` repeated
`MODULE_SET.map((m) => ({ module: m.key, … }))` per verb.

## Decision

1. **One refusal type.** `cli` imports `Unreadable` from `foundation/read-corpus.ts`; nothing restates it.
2. **`query` is always a list.** `frontmatter-harness`'s descriptor wraps its single claim (or none) in a list.
   `queryPath` keeps its single-claim answer, because the Conformance runners read it directly and are frozen.
3. **Answers are pinned in `cli`, not in `config-contract`.** `config-contract` is type-only and may name
   neither `foundation` nor `response-contract` (ARCH-008 §1.3), so the port stays generic.
   `cli/lib/run/module-answers.types.ts` names `QueryAnswer`, `AuditAnswer`, `AssessAnswer` and `CheckAnswer`,
   and `cli/module-set.ts` holds `MODULE_SET` to them with `satisfies`.
4. **One gather, one settle.** `cli/lib/run/module-answers.pure.ts` publishes `gatherAnswers` (the key-and-answer
   pairing, once) and `settledAnswers` (first refusal in declared order, else every answer with the refusal
   type removed). The composers take `ModuleAnswer<T>[]` with no cast, guard or `throw`.
5. **`--assess` keeps its own pair.** `pathAssessment` is composed by the Conformance runner with
   `{ module, assessment }`, so it is left as it was and `--assess` does not go through `gatherAnswers`.

## Behaviour

Unchanged. Exit code 2 on an unreadable file, stdout and fault order are byte-identical, and no Conformance
file is touched.
