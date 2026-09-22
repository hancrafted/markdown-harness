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

**Unreadable Assessment is a response-contract change, not a Conformance case.** A case must be a
document carrying its own marker, while an unreadable path is deliberately not a readable document.
The `unreadable` state is therefore frozen at the `assessPath` and `mh --assess` seams with a
directory named `*.md`; this keeps it distinct from `unassessable`, which is a readable document
whose frontmatter makes no freshness claim.

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

**Locations are case-relative.** Only the four file-level codes carry a filesystem path at all,
and they spell it as the bare config filename; the runner substitutes the case directory in.
Everything else is the config's own notation, which names a key and already travels. That is what
keeps moving this tier a rename rather than a rewrite of every case.

**Every fault is reachable from committed bytes alone** — no permission change, no platform state,
no setup step. The three read-level codes are told apart by bytes: `config-not-found/` holds no
config file, `config-unreadable/` holds a directory where the file should be, and
`config-not-yaml/` holds bytes the parser refuses. The directory is not a trick; it follows from
where the line between absence and unreadability is drawn.

**A config no declared Module is named in is a file-level fault.** `no-module-section/` writes
`frontmater:` — the Module's key one letter wrong — and freezes two faults for it: the misspelling
is a key no declared Module claims, and what is left governs nothing. Both, because a config fails
whole. The recognised top-level key set is computed from the Module set the tool ships, so this is
the case that proves a mistyped section name is rejected by name rather than ignored in silence.

**Known gap: nothing reserves `not-a-module`.** `unrecognised-key/` and `fault-order/` key their
top-level unrecognised-key faults on `not-a-module`, chosen so that no plausible future Module
claims it — a case keyed on `headings` or `links` would turn red on the day a Module of that name
shipped, naming this fixture rather than the change that caused it. The same care picks
`not-a-section-key` one level down. Nothing mechanically reserves either name. It is a convention,
recorded here as a gap rather than claimed as held.

**The coverage-and-closure loop has now survived a change in each direction**, which is what it
was landed to be proven by rather than asserted about. `CONFIG_SELECTOR_AMBIGUOUS` retired with the
selector grammar that made it reachable, and its case directory went in the same change.
`CONFIG_NO_MODULE_SECTION` arrived with `no-module-section/` beside it. Halves that land apart leave
the suite red: a code with no case fails coverage, and a case with no code fails closure. Measured
both ways — removing the code from `DECLARED_CODES` fails `tsc` at the pin in
`config-fault-catalog.ts`, and removing the case directory fails the coverage assertion and the
declared case count.
