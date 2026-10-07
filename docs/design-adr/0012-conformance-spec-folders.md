---
type: design-adr
status: accepted
---

# Conformance tiers split into spec folders a human can run one at a time

A Module tier used to be one synthetic repo root: one shared config, one tier-wide frozen findings
file, and dozens of folders under `docs/` whose names said nothing about what they tested. The
`body-structure` tier reached 45 Rules and 295 cases that way. Every case was correct and governed,
but a human could not check one behaviour without reading the whole config to learn which Rule won
which path, and could not run one folder alone, because its selectors were written relative to the
tier root (#231).

A Module tier is now split into **spec folders**. Each directory directly under the tier's `docs/`
is a synthetic repo root of its own. It holds `markdown-harness.config.yaml`, the adopter's file
name, so `mh` finds it with no flag. It holds `expected-check.json`, exactly what `mh` prints when
run inside the folder. It holds `expected-audit.json` where Rules compete for a file, and
`expected-query.json` where paths were asked. And it holds its cases. Line 1 of the config is
`# Spec: <sentence>`. A human verifies a folder with
`cd <folder> && npx mh | diff - expected-check.json`, or with `npm run conformance -- --path <folder>`. With no path the script runs every
tier, and `npm run verify` and CI run it that way.
The tier runner and the script both go through one comparison function, so the two cannot drift.

**Naming.** A folder is named `<key>__<behaviour>`. The key is spelled as the config writes it, or
as a dotted path when two parents share a leaf. The behaviour is kebab-case. A family term replaces
the key only when no single key carries the test and `CONTEXT.md` already defines the term, which
is why the two folders whose cases test how every selector axis combines are named `selector__…`.
A former folder splits wherever its cases test different keys. The verdict lives only in each
case's marker, never in a folder name, except for the one verbatim case, whose bytes cannot carry a
marker.

**Where Rules compete.** A first-match folder copies every competing Rule into its own config, in
declared order, byte for byte. Its cases keep their tier-relative paths in subfolders, because the
selector reach is what they test. A folder whose cases do not depend on selection holds them at its
root and rewrites its one Rule's folder token to `./`. `mh` gained no include or extends key: a
repeated Rule is cheaper than a config mechanism adopters would then rely on, and the runner holds
every copy of a Rule equal, folder tokens aside.

**Every folder holds a governed PASSES case.** Five folders lacked one and gained a minimal
`passes.md` partner. There is no exemption for UNGOVERNED cases, because a folder that only shows
failure says nothing about what the Rule accepts.

**The tier-wide tables were cut, not dropped.** The old runner froze a 45-row `audit` table and 20
`query` answers. These exist only while every Rule shares one config. Each row and answer moved into
the spec folder that holds the competing Rules, as `expected-audit.json` and `expected-query.json`.
A Rule with no competitor lost only a trivial row: it won every file it selected, and shadowed
nothing.

**Migration proof.** The rename is provable rather than asserted:

- A throwaway ledger asked every case alone, before and after, and joined the two through the
  rename map. All 296 moved cases answered the same verdict, Rule and violations, and the only
  additions were the five named partners.
- Every frozen file was produced by running `mh` and then checked against the old frozen findings
  and tables, so an output that disagreed would have meant a drifted config, fixed in the config.
- `git diff -M` shows every moved case as a 100% rename.
- `caseCount` moved by exactly the five partners, and the verbatim case, now a `.md` file the walk
  reaches.
- Coverage and closure are read over the union of every folder config.
- Each new guard was broken once and seen red.

**Considered and rejected.** One spec folder per case was rejected because it repeats a config 296
times and hides which cases form one argument. Keeping the shared config and adding only per-folder
frozen slices was rejected because a folder still would not run alone. A `.yml` lookup or an include
key was rejected because both change the adopter's config contract to suit a test layout.

**The `integrated` tier keeps its paths.** Its 30 cases became ten spec folders, split by the key
each case tests. There, every Rule is copied byte for byte with its folder token unchanged, and
every case keeps its former tier-relative path under the folder's own `docs/`. Each Module's
selector is exactly what that tier composes, whether by folder alone, by `type` as well, or with an
exclusion, so rewriting a token to `./` would change the claim. Each folder writes both Module
sections, `body-structure:` first, because the response nests blocks in declared Module order
whatever order the config uses. Three folders gained a PASSES partner. The tier held no audit
table, and its seven frozen `query` answers moved into the six folders whose Rules they name. The
same ledger showed all 30 moved cases answering the same verdict, winning Rules and violations.

**The `rejected-config` tier keeps its case directories.** A rejected config produces no document,
so a case there is already a synthetic repo root holding the adopter's config file name, and needs
no spec folder around it. Its 85 directories were renamed `<module>__<behaviour>`, after the Module
section the faulty key belongs to, or `file__<behaviour>` for a fault no Module section holds: the
file is missing, unreadable or not YAML, or its top level carries a key no Module claims. A case
whose faults span the top level and one section is named for the section, so `fault-order` became
`frontmatter__fault-order`. Every config and `expected-rejection.json` moved byte for byte. The one
`expected-check-response.json` could not: it froze the old case path, and it now freezes what `mh`
prints inside the case — root `.` and the bare config name — with the payload unchanged. The tier
runner and `npm run conformance -- rejected-config/<case>` run the same comparison, `mh` inside the
case directory, against every frozen file. ARCH-002's `rejected-case-name` rule holds the names.

The `frontmatter` tier stays as it is, because its
selector-translation guard is two-sided over the tier root.
