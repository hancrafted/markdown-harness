---
type: design-adr
status: superseded
---

# A Module declares in a closed six-variant claim vocabulary, over a recursive extent

> **Superseded 2026-09-21 by [`0009-retiring-the-whole-config-type.md`](./0009-retiring-the-whole-config-type.md)
> and #161.** The claim vocabulary is cut. `ModuleDescriptor` carries one member, `validateSection`,
> and `claimsFor` does not exist: a second member taking a section as an argument puts the section
> type in a parameter position, which forces method syntax for assignability and opens the variance
> hole this record's own last paragraph names — a descriptor widened into a heterogeneous set
> accepting a section of the wrong type. With the type in return position only, the descriptor widens
> soundly and the hole closes rather than ships. Core therefore compares nothing: it hands each
> Module its own validated section through the descriptor that earned it, and a cross-Module
> comparison waits for the Module that needs one.
>
> Nothing here is retracted as WRONG, and that is why it is superseded rather than deleted. Every
> measurement below still stands and none of it is reproduced anywhere else: the thirteen-row
> contradiction table exact against a brute-force oracle twice over, `field-closure.named` sourced
> from `allowedKeysFor`, `file-exists` universal over a mandatory name axis, the extent reaching
> depth three on the shipped starter config, the three-way unsatisfiable set no pairwise table can
> find, and — the finding that outlived the vocabulary — that a heterogeneous Module set cannot be
> iterated with its element types intact, so a guard on who is handed which section is a call site
> and its tests rather than a signature. That last one is what #161 built on: it is the reason the
> port carries one member, and the reason the surviving guard is
> `foundation/lib/config/module-sections.pure.ts` plus `foundation/tests/load-config.test.ts`.
>
> Where the cut work is preserved: this file, in full, plus commit
> `1359efd089fa07932a7888813913a000990c9024` on the remote branch `test-implement-one-shot`
> (https://github.com/hancrafted/markdown-harness/commit/1359efd089fa07932a7888813913a000990c9024).
> Claim, stance, and extent in this record are the superseded projection, not the glossary. No new
> name is coined; the name is chosen when the projection returns. A Module ships its own section
> type and its own codes today; whoever revives a cross-Module comparison starts from the
> measurements here, not from a blank page.

Core has to decide whether two Modules' declarations contradict each other without either Module
knowing the other exists, so a Module projects its validated section into `readonly Claim[]` — a
closed six-variant discriminated union (`frontmatter-block`, `field`, `field-closure`,
`field-cardinality`, `file-exists`, `name-shape`) over three stances (`requires`, `reads`,
`forbids`), each claim carrying its config site, an optional `label` and one `ClaimExtent`. The
extent is **recursive** — one [`Selector`](./0007-selector-is-two-literal-axes.md) minus a list of
extents — rather than a flat list of selectors, because first-match subtracts what an earlier site
_won_ and a file that site excluded falls through; measured, the flat shape under-approximates and
the check goes quiet exactly where it should speak. Claims are projected **after** a Module's own
resolution, never from raw selectors. The types live in `config-contract` and are imported
type-only; the comparison lives in `foundation`.

Four things the prototype settled, none of which the design could have asserted on paper. The
contradiction table is **thirteen rows, not nine** — three new arithmetic families around
`field-cardinality`, plus a `name-shape` × `field` dead-read row that tests **containment** rather
than overlap — exact against a brute-force oracle twice over: 17 of 17 on the original 45-pair
sweep and 35 of 35 on a wider 153-pair cast written after the repair, with zero false positives on
both. `field-closure.named` holds **top-level keys**, sourced from the shipped `allowedKeysFor` so
the widening that `anyOf`, `allOf` and `exactlyOneOf` perform is not re-derived a second time; it
reported two false conflicts on legal config before that repair and zero after. `file-exists` is
**universal over a mandatory, non-empty name axis** — the existential reading of an absent axis is
now unrepresentable (`TS2322`) rather than undecided, because "every possible name must exist" is a
sentence no Module can mean. And the extent reaches **depth three** on the shipped starter config,
not two, with the union-flattening that keeps it there exact rather than approximate: 101 quotient
points, zero disagreements.

Two guarantees that read as one are not. **`claimsFor`'s type does not stop a Module being handed
another Module's section — the call graph does:** a heterogeneous Module set cannot be iterated with
its element types intact, because TypeScript demands an intersection of the section types at the
union call site (`TS2345`), so `foundation` must widen and widening opens the hole; the guard is one
call site plus two loader unit tests, not a signature. Separately, what forbids a **corpus-derived**
claim is `claimsFor`'s **signature** — it is handed a validated config section and nothing else —
never the claim type, which would typecheck a hand-written binding claim perfectly. Two holes stay
named rather than closed: a three-way unsatisfiable set is expressible and no pairwise table can
find it (measured — all three pairs have models, the triple has none), and `drift-detection`
projecting nothing is an accident of its section's shape today, held out by `claimsFor`'s signature
rather than by the vocabulary.
