---
description: The synthetic repo root for the indexes Conformance suite.
---

# The indexes Conformance suite

**PROTOTYPE.** Throwaway on day one. This directory answers one question — _does a
golden-region conformance suite give the indexes Module a real red/green loop?_ — and the
findings live in [`docs/workshop/prototype/index-generator/findings.md`](../../docs/workshop/prototype/index-generator/findings.md).

This directory **is** a synthetic repo root. Every path in `indexes-test-config.yaml` is
written relative to it, and nothing here governs `fixtures/conformance/` next door.

## The three parts

| part                       | what it is                                                                    |
| -------------------------- | ----------------------------------------------------------------------------- |
| `indexes-test-config.yaml` | the config under test — one `indexes:` section, fourteen declared directories |
| `docs/`                    | the corpus: the inputs, including every damaged marker state                  |
| `expected/`                | the goldens: the exact bytes the generator must write, one file per index     |

`expected/` mirrors the corpus tree. `expected/index.md` is the golden for the root index,
`expected/docs/index.md` for `docs/index.md`, and so on. `expected/outcomes.yaml` holds the
verdict for every declared directory, including the five that are refused and therefore have
no golden file at all.

## Running it

```bash
npx vitest run src/packages/indexes-harness
```

Nothing writes. The suite plans every index as a dry run and compares the planned bytes
against the goldens, so a run leaves the tree exactly as it found it.

To see what it planned, rather than only whether it agreed:

```bash
npm run indexes:plan
```

## This README is itself an entry

`./` is a declared directory and this file is the one markdown file at the root, so the
description in the frontmatter above is copied byte for byte into `expected/index.md`.
Editing that sentence turns the suite red — which is the point: an index is only as true as
the frontmatter it was copied from.
