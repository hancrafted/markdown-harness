---
type: design-adr
status: accepted
---

# The published artefact is a compiled entry point, bounded to what runs, and refuses an unsupported Node

`markdown-harness` publishes to npm as `@hancrafted/markdown-harness`. The `bin` field declares two
names — the product's full name and the short alias `mh` — both pointing at one compiled entry under
`dist/`. A `files` allowlist limits the tarball to that tree. The package is **bin-only**: no export
map, no `types` entry, nothing importable. And because the entry's answers depend on the host's glob
matcher, the manifest declares a supported Node range and the command refuses outside it.

The compilation is not a preference. Node runs TypeScript directly, but it refuses to for a file
under `node_modules`, and no flag lifts the refusal. Measured 2026-09-07 on Node 26.5.0, the same
two-line file in two places:

```text
$ node outside.ts                                   → ran 1
$ node node_modules/probe/entry.ts                  → ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING
$ node --experimental-strip-types  …/entry.ts       → ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING
$ node --experimental-transform-types …/entry.ts    → node: bad option
```

So an installed adopter can only run compiled JavaScript, and every alternative below is an argument
about _how_ to compile rather than _whether_ to. This is written down because a reader who knows
Node runs TypeScript will ask why the build step exists, and the honest answer is one error code
they cannot see from the source.

## Considered options

**Publish the source and let Node strip types.** Not rejected — unavailable. The error above is
raised before the module is read, keys on the path rather than on the content, and has no override.
It is the reason this record exists.

**A bundler.** Rejected. The sibling repository `hancrafted/typescript-ai-harness` bundles, but for a
motive absent here: it inlines a devDependency in order to ship zero runtime dependencies. This
product declares `yaml` as a real runtime dependency, so bundling would buy nothing and cost the one
thing worth keeping — one emitted file per source file means a stack trace still names the Package
that failed. It would also engage `ARCH-001`'s four-signal Admission bar for a tool this needs no
tool for: `tsc` is already a devDependency, so **no new dependency is admitted**.

**One bin name.** Rejected. `CONTEXT.md` writes the product's name out in full every time, and an
Operator reading the documentation should be able to type what they read; an Operator typing it
repeatedly in a session should not have to. Adding an alias later is free, removing one is a breaking
change, so both ship in the first release. The alias is also what keeps the existing usage text
(`usage: mh …`) and the process-boundary suite true without a rewrite.

**An unscoped name, `markdown-harness`.** Rejected on 2026-09-08, reversing what this record first
decided — the reversal is written here rather than left to the commit log, because the paragraph
below is the reasoning it overturns. Two facts had decided for unscoped: unscoped packages are
always public, whereas a scoped package publishes restricted unless access is set explicitly; and
the registry's full unpublish window is 72 hours, so a first publish is effectively permanent and an
unclaimed name is worth claiming. Neither fact turned out to be false; what they were weighed
against was missing. The product has a sibling, `@hancrafted/typescript-ai-harness`, in an
organisation this account already owns, and one namespace covering both is worth more than one
shorter coordinate. The restricted-by-default consequence is real and is paid explicitly rather than
avoided: `--access public` on every publish, in `publish.yml` and in the bootstrap step, without
which the publish fails on visibility rather than on anything about the artefact. The scope is a
registry namespace and nothing else — `bin` still installs `markdown-harness` and `mh`, the config
file is still `markdown-harness.config.yaml`, and `npm pack` reports the same 59 files at the same
38.5 kB, only the tarball's filename gaining a prefix. The unscoped name remains unclaimed. npm has
no rename, so claiming it later would be an additional package with a deprecation pointer on it —
which remains possible and is not a breaking change.

**An export map and a `types` entry, so the config contract is importable.** Deferred. Every argument
for exporting it is an argument about reimplementation in another language, which a TypeScript export
map does not serve — a port reads the type declarations and the Conformance suite out of git, which
is what tenet 4 means by the contract being the portable artifact. The day a real second consumer
exists, an export map is an addition rather than a break. Until then it would be surface with no
reader, and `knip` would be the only thing looking at it.

**`engines` alone, with no runtime check.** Rejected. `engines` is advisory unless an adopter opted
into strictness, so on its own it is a note in a file nobody reads at the moment it matters. What is
at stake is tenet 3 — _the same tree in gives the same result out_ — because path matching delegates
to the host's glob matcher and the declared range names the releases whose matcher carries the
segment-aware behaviour the specification is written against. A silently different corpus verdict is
worse than no verdict, so the command refuses and names the range.

**Deriving the range in code from one source of truth.** Rejected as cleverness. `engines.node` and
the refusal's text are two spellings of one decision, in two files, and the honest guard is a test
rather than a derivation: the process-boundary suite reads `engines.node` off the manifest and
asserts the refusal carries it verbatim, so the two cannot drift apart in silence and a reader can
still see both strings written out.

## Consequences

1. **Two compiler invocations, two jobs.** `tsconfig.json` keeps `noEmit`, because relative imports
   here carry explicit `.ts` extensions and only a type-check pass can leave them alone;
   `tsconfig.build.json` turns `rewriteRelativeImportExtensions` on instead, so every emitted import
   resolves to the `.js` beside it. The type-check pass covers the tests and the ablation kit's suite
   that the build excludes. Measured 2026-09-07: 56 files emitted, zero errors, shebang preserved.
2. **`rootDir` silently disables automatic `@types` inclusion.** Measured, and worth the two lines it
   costs to write down: with `rootDir` set and nothing else changed, every `node:` import fails with
   eleven `TS2591 Cannot find name 'node:fs'` errors, which read as a missing devDependency rather
   than as a resolution change. `types: ["node"]` restores it and narrows the build to the one
   ambient package `src/` uses — nothing that ships may depend on a test runner's globals.
3. **The tarball falls from 417 files to 59.** Measured 2026-09-07: without an allowlist `npm pack`
   ships the governance records, the research corpus, the ablation kit and 143 vendored skill files.
   With `files: ["dist"]` it carries the 56 emitted files plus the three npm always includes —
   `package.json`, `README.md`, `LICENSE`. The allowlist ships the tree rather than a manifest of it,
   and `tsc` never removes an output whose source is gone, so `build` clears `dist/` before emitting:
   measured, a planted orphan survived a rebuild at 57 files and would have shipped.
4. **The manifest still declares a `prepare` script, and npm names it on an adopter's install.**
   `prepare: husky` exists for this repo's own contributors. Measured 2026-09-07 against a git
   repository with a tarball install: `core.hooksPath` stayed unset and no `.husky/` appeared, which
   matches npm's documented rule that `prepare` runs for a directory or git dependency and not for a
   tarball. npm 11.17 additionally gates it and prints one warning naming it. Nothing is written to
   an adopter's tree, and tenet 8 holds — but the warning is the one rough edge of a first install.
5. **A forgotten build fails loudly instead of misleadingly.** With `bin.mh` naming a build artefact,
   an absent `dist/` failed the process-boundary suite 24 times out of 26 — 15 value mismatches and 9
   `SyntaxError: Unexpected end of JSON input` — and named a build in none of them. The suite
   therefore refuses to start, in one sentence that does. `npm run verify` builds before it tests, so
   the ordinary path never meets the guard; it is for the direct and watch-mode runs that bypass the
   chain.
6. **`npm pack --pack-destination` does not create its directory.** Measured on npm 11.17: it exits
   `ENOENT` naming the tarball it was about to write, which reads as a packing failure. `smoke.yml`
   makes the directory first, and names the tarball rather than globbing it, because an unmatched
   glob is passed to npm verbatim and produces that same `ENOENT` for a different cause.
7. **`knip` stays quiet, and is not merely blind.** The open question in the specification. Measured
   2026-09-07 with the build configuration and `dist/` both present: `knip` reports nothing, and a
   deliberately unused export added to the new `lib/runtime/` file was reported at its line and
   removed again — so the silence is a verdict rather than an absence of looking.
