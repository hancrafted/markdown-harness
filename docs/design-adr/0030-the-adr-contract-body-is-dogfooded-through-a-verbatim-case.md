---
type: design-adr
status: accepted
---

# The ADR Contract's body is dogfooded through a verbatim case: a document the corpus holds unmarked, outside `docs/` and outside `.md`

Serves [#227](https://github.com/hancrafted/markdown-harness/issues/227), the spec for
[`0027`](./0027-a-heading-vocabulary-is-a-rule-level-list-of-exact-titles-per-level.md),
[`0028`](./0028-a-section-holds-an-allowed-set-of-block-kinds.md) and
[`0029`](./0029-vocabulary-and-block-kind-config-validation.md). It amends no record. It decides how one real file, `GEN-001`, the
ADR Contract, becomes a Conformance case without being altered, and which clauses of that file the new keys can and cannot say.

The product vision's proof obligation is that this product runs against its author's own knowledge base, and a Rule that
expresses a document kind this repository really has is the cheapest form of it. A Rule written against a hand-trimmed lookalike
proves the lookalike. So the passing case for the `adr-contract` Rule is **`.archgate/adrs/GEN-001-adr.md` itself, copied
byte for byte**, and the failing cases are condensed documents of the same shape, each with one defect.

## What was measured

1. **The Rule passes the real file.** The `adr-contract` Rule of the spec, run through a copy of the Module patched to 0027 and
   0028, reports nothing on the 7,813 bytes of `GEN-001-adr.md` as of `9dce1f8`, the last commit that touched it, and reports the one expected finding when
   a numbered list is added to its context, a paragraph to its second anchor, or the bullets of its references are numbered.
2. **A byte-identical copy cannot carry the `expect` marker.** ARCH-002 §2.1 says every case carries exactly one
   `<!-- expect: VERDICT -->` marker, §2.2 says it is an HTML comment in the body, and the marker's reasoning paragraph sits
   under it. Any marker added to a copy is a change to the bytes the copy exists to preserve, and it sits after the frontmatter,
   before `# ADR Contract`. The `expect-marker` rule reads `fixtures/conformance/*/docs/**/*.md`, so the file is a case, and
   unmarked it fails, if it sits under `docs/` as an `.md` file.
3. **The runner reads more than that glob.** `casesIn` is every markdown file under the tier root, `verdictOf` throws on a case
   with no marker, and the tier's hand-stated `caseCount` counts them, so an unmarked `.md` file anywhere in the tier breaks the
   runner as well as the rule.
4. **The two sides of the conflict are both contracts.** The marker convention is Archgate-governed (ARCH-002) and an ADR is
   edited only by `archgate:adr-author` with human approval, so the convention is not bent here. The byte-identity requirement
   is the point of the case. Neither can give way, so the file is held in a form neither side reads as a case.

## Decisions

1. **A verbatim case is a document the corpus holds unchanged and unmarked.** It is not a Conformance case, and the glossary
   says so in the places that already say it of a rejected-config case and a witness case. It lives **outside `docs/`**, so
   ARCH-002's glob does not reach it, and **outside `.md`**, so the tier's walk does not enumerate it and the tier's counts do
   not move. The stored file is `fixtures/conformance/body-structure/verbatim/GEN-001-adr.md.verbatim`.
2. **Its expectation is a golden beside the config.** `fixtures/conformance/body-structure/verbatim-cases.json` maps the path
   the file is judged at to the stored file, the file it was copied from, its length and its SHA-256, and the verdict and
   finding the spec states. The path is `docs/adr/GEN-001-adr.md`, the folder the `adr-contract` Rule owns, so the Rule's
   `folders` selector reaches it exactly as it reaches the condensed cases.
3. **The runner copies it in.** For each entry it checks the stored bytes against the pinned length and SHA-256, copies them to
   the entry's path in a root of its own, and asks `--check` and `--audit` there with the tier's config, as every one-file case
   is asked, and compares the verdict, the winning Rule and the violations with the golden. It adds one block to
   `body-structure-tier.test.ts` and changes none of the existing ones.
4. **Byte identity is checked twice, and the second check is a pin.** At creation the Conformance agent copies the file with `cp`
   and runs `cmp .archgate/adrs/GEN-001-adr.md <stored>`, which must print nothing, and `shasum -a 256` of both, which must
   equal the pinned `c3ec6336346d783d6cd8843079dd81230cf30e606d036280253c3290d5854aae`. If the live file's hash differs from
   that, it is not the file this spec measured and the agent stops and reports. Thereafter the runner's pin is what holds: an
   edit to the stored copy, to make the Rule pass, changes the hash and fails.
5. **The runner does not compare the stored file with the live ADR.** The corpus is the portable specification (architecture
   tenet 4) and adopters and reimplementations never receive `.archgate/`, so a test that read it would make the corpus depend
   on a file the contract does not include. It would also tie an Archgate amendment, which needs human approval and has its own
   review, to a Conformance contract it knows nothing of. The cost is that GEN-001 can drift from the copy unseen, and the case
   then states what the Rule did to the file as it was, which is what a frozen specification states. A drift check is a review
   duty, listed in the spec, and the orchestrator can run the `cmp` at merge.
6. **The Rule expresses the body's shape and not its items.** In `adr-contract`, with one limit that is a fact of the document and
   not a clause of the contract: `## Decision` and `## Do's and Don'ts` hold only subsections in GEN-001, and a Rule cannot say
   a section holds nothing, so a stray paragraph there passes (0028 decision 8):

   | GEN-001 clause                                              | the Rule                                                             |
   | ----------------------------------------------------------- | -------------------------------------------------------------------- |
   | six canonical `##` sections, §3                             | six entries in order, required                                       |
   | no other section                                            | `undefinedHeadings: forbid`                                          |
   | `## Context` is prose                                       | `mayHold: [prose]`                                                   |
   | each `### N.` under `## Decision` holds an ordered list     | an enumeration at level 3, `mayHold: [ordered-list]`                 |
   | `### Do's` then `### Don'ts`, each an ordered list          | two entries in order, `mayHold: [ordered-list]` each                 |
   | consequences are captioned lists                            | `mayHold: [prose, ordered-list]`, a bold caption being a paragraph   |
   | references are links                                        | `mayHold: [unordered-list]`                                          |
   | sequential `### N.` numbers from 1                          | **not expressed**: a pattern cannot count, and a case freezes it     |
   | bold `**DO**` and `**DON'T**` opening each item             | **not expressed**: item shape is out of scope, and a case freezes it |
   | `📜 Rule:` markers, the size budget, the frontmatter bundle | not a body-structure fact; the existing enforcer keeps them          |

   The Rule is also **stricter than the contract** in one way: it requires the six sections in the order the contract lists them,
   which `adr-required-sections` does not.

7. **`GEN-001`'s migration to this Rule is deferred.** Replacing its hand-written enforcer with a Rule would split the contract's
   enforcement across two tools for no gain, because three clauses above are not expressible, so the `.rules.ts` stays whatever
   the Rule says. The `mh --check` gate does not govern `.archgate/` either, and an ADR's rules are changed only through
   `archgate:adr-author` with human approval. The migration is reconsidered when item shape is designed, since the bold prefix
   is the largest clause left out.
8. **A silent type miss stays ungoverned.** A document of GEN-001's shape whose `type` is `adrr` selects no Rule and is reported
   by none, which design-ADR 0021 freezes. One case holds it on this shape.

## Consequences

1. **No Archgate ADR is edited.** If verbatim cases prove durable, ARCH-002's text, which says a Module tier holds cases under
   `docs/` and every case carries a marker, may want a sentence naming them. That is `archgate:adr-author`'s to propose and a
   human's to approve, and it is not done here.
2. **The tier's counts do not move for the verbatim case**, and the tier record's `caseCount` counts markdown cases only. A
   verbatim case is held by its runner block, and by nothing else: no archgate rule reaches it.
3. **A second verbatim case is cheap** and uses the same golden, the same folder and the same block.
4. **The stored name is a convention nobody lints.** A file renamed to `.md` would be enumerated as a case and fail loudly
   at the marker check, so the failure is loud and not silent.

## Considered options

**A marker prepended to the copy.** Rejected: the bytes are the point. **Placing the copy under `docs/` and exempting it from
ARCH-002 by name.** Rejected: it edits an Archgate ADR's rule. **A frontmatter key for the verdict.** Refused by ARCH-002 §2.2.
**Comparing the stored copy with the live ADR in the runner.** Rejected under decision 5. **A new corpus tier for the
dogfood.** Rejected: a tier needs a runner, a record and an enrolment of its own for one file, and the Rule's config belongs with
the other `body-structure` Rules. **Reading `.archgate/adrs/GEN-001-adr.md` live and storing nothing.** Rejected under decision
5, and because the case would then change whenever an ADR amendment lands. **Condensed passing documents only**, as round three
did. Rejected: that is the lookalike this record exists to avoid.
