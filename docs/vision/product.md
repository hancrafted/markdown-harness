# Product vision

Why `markdown-harness` exists, who it serves, and what it will never become.

**Not a decision record.** Decisions live in `.archgate/adrs/` (governance) and `docs/design-adr/`
(design). This holds the reasoning those decisions get derived _from_ — including decisions nobody
has discussed yet.

## Deriving a decision from this

A proposal earns its place only when all four answers hold. When one cannot be answered, that
absence **is** the finding: report it rather than picking the plausible answer.

1. **Which tier of the Guarantee does it serve?** A change serving none is a feature in search of a
   promise.
2. **Whose surface does it touch — the Operator's or the Contributor's?** A Contributor-facing change
   that requires reading the config has landed on the wrong person.
3. **Does it survive the boundaries?** Each boundary below states what the product does instead. If
   the proposal needs a boundary moved, that is a vision change and belongs in a conversation, not a
   commit.
4. **Which horizon is it for?** Work aimed past the current horizon competes with work aimed at it.

## The promise

**Trust.** Not comprehension — trust. The point is to rely on a body of knowledge you did not write,
cannot re-read, and have not personally checked in months.

Full trust is not on offer, and claiming it would be the first lie. A markdown corpus can always
hold a confident sentence that is simply wrong, and no amount of structure detects that. What _is_
available is narrower and still worth building:

> A document can tell you how much of itself to believe.

That is the whole product. Everything else is the machinery that keeps such a statement true.

## What went wrong before

The failure this exists to prevent is observed, not hypothetical. A knowledge base maintained by
agents degrades along a specific path:

- **Volume outruns review.** Documents accumulate faster than any human reads them, so the corpus
  stops being something you know and becomes something you hope about.
- **Confidence outlives correctness.** A document says "decided" in its body long after the decision
  moved. Prose carries no expiry, so age is invisible at the moment of reading.
- **Governance drifts while checks stay green.** This is the one that ends it. When the standard can
  be quietly relaxed, a passing check stops being evidence — and once you know that, you stop
  believing any of it.

The corpus then gets abandoned rather than repaired, because there is no way to tell which parts
were still good.

## The Guarantee

What the product actually promises, in four tiers. Only the first is guaranteed; the honesty about
the rest is the point.

| tier              | what holds                                                                           | strength                |
| ----------------- | ------------------------------------------------------------------------------------ | ----------------------- |
| **Conformance**   | Structure a config names is present and well-formed, or the run reports it           | Guaranteed              |
| **Signal**        | A document states its own provenance, verification and freshness, in the file itself | Guaranteed when adopted |
| **Detection**     | A loosening of the standard is visible in a diff a human reviews                     | Visible, not prevented  |
| **Reviewability** | The corpus stays shaped so a human or an agent can actually review it                | Striven for, never won  |

**Conformance** is the low tier and the least interesting. It is also real: a type drawn from a
declared vocabulary, a description within a length, a required field present. Necessary, and not
what anyone stays for.

**Signal** is the differentiator, and it is why OKF was chosen rather than invented. A document
carries its own trust state — what produced it, who verified it, when it expires — so an agent that
discovers it three months later is warned by the document itself, whatever the body claims. This is
the tier that answers "trust without understanding every part", because provenance is checkable
without comprehension.

**Detection** replaces a guarantee that was never available. Nobody can be prevented from relaxing a
rule; anyone can be prevented from doing it _silently_. Prevention would be the kind of promise that
quietly stops being true, which is the failure above.

**Reviewability** is a direction, not a deliverable. Structure, templates and repeatable review
procedures make a corpus easier to review; none of them make it reviewed. Naming it as striven-for
keeps it honest and keeps it on the roadmap.

## Who it serves

Two roles, distinct from day one, because they need different things and only one of them ever opens
the config.

**The Operator** installs it, writes the config, and decides what the corpus must guarantee. One
technical person, comfortable with a terminal and git. In a workshop, that is the person running the
workshop.

**The Contributor** writes documents and never sees the config. They are governed by it, steered by
it, and warned by it — through their own host harness, in their own words. Making this role work
without a terminal is what "non-technical" means here.

Priority for v1 is engineer-adjacent: the Operator's path is built first and built well, because a
Contributor with no working Operator has nothing.

## The primary use case

An **LLM-wiki**: a knowledge base whose primary reader is a model, not a person.

This inverts a habit worth naming. In an LLM-wiki, the precise, technical, unambiguous version of a
document is what the _model_ reads — and the _human_ is the one who needs it rendered into their own
mental model. Progressive disclosure, index files and frontmatter signals stop being hygiene and
become the interface.

The proof obligation that follows: this product runs against its author's own LLM-wiki continuously.
A governance tool whose author does not govern their own knowledge base with it has no standing in a
room full of people being asked to adopt it.

## Boundaries

Each row states what the product does **instead**. Moving a boundary is a vision change.

| the product does not           | it does this instead                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| Run a model or hold an API key | Delegates judgment to the host harness, on the user's own auth and bill               |
| Run as a service or phone home | Runs on the user's machine, against files the user can read                           |
| Index into a vector store      | Treats the markdown tree as the corpus; retrieval belongs to the host harness         |
| Act as a host harness          | Supplies governance and steering; the host harness supplies tools, permissions, model |
| Sit on the consumption path    | Puts the signal in the file, so a reader needs nothing installed                      |
| Rewrite prose                  | Supplies the metadata, structure and steering that make someone else's rewrite better |
| Implement a spec as behaviour  | Ships specs as Presets — deleting one changes only which Rules run                    |
| Ship a chat UI or a TUI        | Treats the host harness as the interface                                              |

**One exception, deliberate.** A small standalone web app for _authoring the config_ is on the
roadmap, because a config file is a fair thing to find daunting and the Operator role should not
require YAML fluency forever. It configures; it never runs the corpus and never renders a chat.

## Horizons

| when             | what success looks like                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **2026-09-15**   | A company presentation slot. `init`, `check`, `steer` demonstrable, and one document warning an agent that has never heard of `markdown-harness` |
| **Oct–Nov 2026** | Three to four workshops. Participants run it on their own files and produce feedback that changes the product                                    |
| **~2027-09**     | One knowledge base trusted continuously for a year without degrading                                                                             |

The twelve-month measure is deliberately not adoption. Adoption is a lagging indicator that can be
true while the thesis is false; a corpus you have relied on for a year cannot. Credibility for the
enablement work — and for its author — is the payoff, not the metric.
