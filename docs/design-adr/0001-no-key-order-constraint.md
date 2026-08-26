---
type: design-adr
status: accepted
---

# The config language does not constrain frontmatter key order

A scanner that classifies documents by `type` can read a bounded prefix of each file instead
of parsing its YAML, and pinning `type` to the first key would make that prefix a single line
— so the config language was a candidate for a key-order constraint. It does not get one:
measured, the guarantee is worth about 10 ms per 10,000 files, and YAML 1.2.2 says the ordering
of mapping keys is a serialization detail that should not be relied on in the first place.

## Considered options

**Pin `type` to the first key, harness-wide.** Rejected on four grounds.

_It is not measurably faster._ Over 2000 realistic files (avg 5 KB, OKF-shaped frontmatter),
21 interleaved iterations:

| scan strategy                        | mean         | classifies a trailing `type`? |
| ------------------------------------ | ------------ | ----------------------------- |
| 64 B read, `type` required on line 1 | 20.4 ms ±0.8 | **0 / 2000**                  |
| 512 B read, `type` anywhere          | 20.4 ms ±1.2 | **0 / 2000**                  |
| 4 KB read, `type` anywhere           | 22.3 ms ±1.6 | 2000 / 2000                   |
| full read, `type` anywhere           | 23.7 ms ±0.8 | 2000 / 2000                   |

The position guarantee buys 1.9 ms — 1.5 standard deviations, and it falls inside noise on a
corpus where `type` is last. A 32-way concurrent variant reproduces the same ~2 ms gap. For
scale, the full YAML parse that constraint-checking needs anyway cost 272 ms on the same
corpus: 13× the entire scan. The saving is 8% of the cheapest operation in the pipeline.

_What position actually buys is boundedness, not speed_ — a fixed-size read is only correct if
the key sits at a fixed offset, which is why the 64 B and 512 B rows classify nothing when
`type` is last (the frontmatter block measured 615 bytes). But a 4 KB window buys the same
guarantee for any realistic frontmatter at a cost of ~2 ms. Boundedness is a window size the
harness picks once, internally, and can change; key order is a constraint every adopter
maintains forever.

_The format says not to rely on it._ YAML 1.2.2 §3.2.2.1: mapping keys "do not have an order",
that order is "a **serialization detail**" that "**should not be used**" when composing the
representation graph, and "in every case where node order is significant, a sequence must be
used." Quoted with the surrounding JSON and JSON Schema evidence in
`docs/research/frontmatter-key-order.md` §0.

_Precedent is against it._ That survey's hard nulls include every static-site generator
checked, Prettier, JSON Schema, markdownlint, and `remark-lint-frontmatter-schema` — the
closest existing tool to this one. No frontmatter tool in it enforces key order, and the
widely-cited Kubernetes example is refuted three ways (§3.1). Terraform is the cautionary case
and matches this proposal's exact shape: an order documented normatively by the vendor, which
the vendor's own formatter declines to enforce and the official linter removed on principle
(§3.4). §4 states the cost finding directly — "the expensive mistake is not _changing_ an
order, it is enforcing a position you cannot justify", which is what got reverted in every
case surveyed.

**Constrain the whole key order.** Rejected outright. OKF §4.1 leaves producers free to add
any additional keys, so a fixed tail contradicts the vocabulary being implemented. The only
spec-level precedent, the JAR manifest, mandates one leading key and states that the order of
everything else "is not significant" (§2.1).

**Add `position: first` as a per-rule opt-in.** Deferred, not rejected. It fits the post-Floor
model — an opt-in constraint like any other, paid for only by the repos that declare it — but
no consumer needs it yet. The case that would justify it is a non-Node scanner in a pipeline
that genuinely cannot afford a 4 KB read per file. Adding it before that consumer exists would
be speculative.

## Consequences

1. **The fast-classify path is position-free.** It reads a 4 KB window and finds `type`
   anywhere in the frontmatter block, so it is correct under any key order and needs no
   cooperation from the files it scans.
2. **`type` leading stays a convention, never a check.** Its justification is recognisability —
   a human or a cheap scanner identifies the document kind from the first line, which is the
   JAR manifest's own documented rationale and what `GEN-001` §2.2 already adopted. The OKF
   preset may recommend it in prose. Nothing enforces it.
3. **A repo cannot rely on line-1 position**, because nothing establishes it. A guarantee that
   was never declared is not a guarantee, and code that assumes one will meet the 0 / 2000 row
   above.
4. **Nothing was removed to implement this.** The config contract never had an ordering key, so
   this records a decision rather than a change — which is precisely why it is worth recording:
   the absence is deliberate, and the performance argument for filling it is the obvious thing
   for a future reader to try.
5. **`docs/research/frontmatter-key-order.md` is retained as the citation for this decision**,
   not as an open question. Its own research question — whether `files` joins `GEN-001`'s
   enforced prefix — was answered upstream and shipped; its value here is §0, §1, §3.4 and §4.

This records reasoning only. The governing decision belongs in `ARCH-002-config-language`, and
`archgate:adr-author` should fold points 1–3 into it.
