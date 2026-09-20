# The Conformance corpus, by tier

This directory is not a corpus. It holds **tiers**, one directory each, and a tier is what a
runner points at. The runner Package is `src/packages/conformance/`, and `ARCH-002` is the
governing record.

| tier               | holds                                                        | runner                               |
| ------------------ | ------------------------------------------------------------ | ------------------------------------ |
| `frontmatter/`     | the `frontmatter` Module's config plus its Conformance cases | `tests/frontmatter-tier.test.ts`     |
| `rejected-config/` | config bytes a load must refuse, and no markdown at all      | `tests/rejected-config-tier.test.ts` |

One tier per Module, plus one for config the loader refuses. The two sets — the directories here
and the `*-tier.test.ts` files there — are derived from the tree and asserted equal by
`tests/tier-enrolment.test.ts`, so a tier added without a runner fails rather than sitting
unnoticed.

**The integrated tier is absent.** A corpus two Modules govern at once cannot be written while one
Module exists, so it arrives with the second. Its absence is derived from the same two sets rather
than recorded as a gap: it is missing from both sides today, and the enrolment check is what refuses
to let it arrive on only one.

**A tier root is a synthetic repo root.** The `frontmatter` tier holds its own
`valid-test-config.yaml`, whose selectors are written relative to that tier directory — which is
why the tier moved as a unit and every selector in it is byte-identical to what it was under the
old layout.

**This file is markdown and is not a Conformance case.** It carries no `expect:` marker and none is
wanted: the enforcement rule's case glob reaches `<tier>/docs/**/*.md` and stops there. It is also
the reason a runner pointed at this directory instead of at its tier enumerates one file too many
and fails its declared case count.
