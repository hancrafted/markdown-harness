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

## Inside the rejected-config tier

A case here is a **directory**, not a document: config bytes under the adopter's own config
filename, `markdown-harness.config.yaml`, plus one `expected-rejection.json` freezing the whole
config-error response verbatim. The config filename is the adopter's rather than the case's
because several codes carry the config path in their location — a per-case filename would write
the case's own name into the contract it freezes.

**Fault order is a contract.** The fault list in every expectation is ordered, and deep equality
over the whole payload is what holds it. `fault-order/` exists for that alone: its six faults are
neither alphabetical by code nor grouped by rule, because ids are checked across the whole list
before any rule is walked.

**Locations are case-relative.** Only the three file-level codes carry a filesystem path at all,
and they spell it as the bare config filename; the runner substitutes the case directory in.
Everything else is the config's own notation, which names a key and already travels. That is what
keeps moving this tier a rename rather than a rewrite of every case.

**Every fault is reachable from committed bytes alone** — no permission change, no platform state,
no setup step. The three read-level codes are told apart by bytes: `config-not-found/` holds no
config file, `config-unreadable/` holds a directory where the file should be, and
`config-not-yaml/` holds bytes the parser refuses. The directory is not a trick; it follows from
where the line between absence and unreadability is drawn.

**Known gap: nothing reserves `not-a-module`.** `unrecognised-key/` and `fault-order/` key their
top-level unrecognised-key faults on `not-a-module`, chosen so that no plausible future Module
claims it — a case keyed on `headings` or `links` would turn red on the day a Module of that name
shipped, naming this fixture rather than the change that caused it. The same care picks
`not-a-section-key` one level down. Nothing mechanically reserves either name. It is a convention,
recorded here as a gap rather than claimed as held.

**The tier lands against today's catalog and today's selector grammar**, deliberately. Later
tickets retire one code and add another, and the coverage-and-closure loop proves itself by
surviving two real changes in opposite directions rather than being asserted against a catalog it
will never see move.
