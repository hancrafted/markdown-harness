# File Naming as a Context Router: What Tools Actually Enforce

Research question: this repo governs its own source with Archgate ADRs. Each ADR declares a
`paths:` glob, and Claude Code loads that ADR's **full body** into agent context whenever a
matching file is Read, via a `.claude/rules/` symlink (`GEN-001-adr.md` §4). So `paths:` is a
**context router**, not documentation. The owner wants many small atomic ADRs whose globs target
precisely — which requires filenames that carry enough signal for a glob to select on. He uses
`.model.ts`, learned from Angular, and asks whether an **industry best practice** exists.

Probed 2026-08-27. Every claim is quoted from official docs, spec text, shipped source, a
schema file, a changelog, or a maintainer's own words in an issue thread. Behavioural claims
marked **[executed]** were reproduced against a real binary; the version is given. Every finding
is tagged **normative** (the doc states it as a requirement, or a tool breaks without it) or
**conventional** (habit, example code, or a configurable default), because the two license very
different things.

---

## Direct answers

**Q1 — Is there an industry best practice for naming files so globs can select them?** No — not
as a _style_ rule. There is something better and narrower: a large, consistent body of cases
where **a filename or suffix is the contract a tool reads**, and those cases share one design
that is worth copying. The strongest are compiler-level: Go's `_test.go` and its `_$GOOS.go`
build constraints, Rust's `src/lib.rs`/`src/main.rs` target auto-discovery, TypeScript's `.d.ts`.
Next.js's `page`/`layout`/`route` are framework-level and absolute — no `page` file, no route.
Remix/React Router's `.server.ts`/`.client.ts` and SvelteKit's `*.server.js` are bundler-level:
the suffix decides which bundle the module is erased from. **The weakest — and this matters,
because it is the group most people cite as "the convention" — are `.test.ts`, `.spec.ts` and
`.stories.tsx`, which are only _default glob values in a config file_ you can change.** No
official style guide anywhere in this survey recommends a type suffix _so that globs can select
on it_. §1.4 states the shape the real cases share.

**Q2 — Does Angular prescribe `<name>.<type>.ts`?** It **did, and reversed it in v20.0.0
(2025-05-28)**. The reversal is the team's own word. The current official guide at
angular.dev/style-guide contains **zero** occurrences of `suffix`, `.component`, `.service`, or
`.model`; it does not forbid suffixes, it deletes the concept, keeping only `.spec`. `ng g c foo`
now emits `foo.ts`. Angular internally names the two conventions **"2016"** and **"2025"** and
ships `ng new --file-name-style-guide 2016|2025` with `2025` as the default (§2.3). And the
specific claim the owner is carrying is **false**: `.model.ts` was **never** in the official
Angular list, in either guide — the official list was exactly `.service`, `.component`, `.pipe`,
`.module`, `.directive`. `hero.model.ts` was Tour-of-Heroes sample code (§2.4). **The inversion:
`.model.ts` _is_ normative — in NestJS**, where the GraphQL CLI plugin's docs say filenames
"**must have**" one of `['.input.ts', '.args.ts', '.entity.ts', '.model.ts']` (§2.5).

**Q3 — Folder or suffix, for glob selection? Suffix — but not for the reason the brief gives.**
The stated premise ("`src/**/*.model.ts` selects regardless of depth, whereas `src/**/model/**`
requires the folder at a predictable position") is **wrong as stated about `**`**: `**` matches
_zero_ or more directories, so an explicit `src/**/model/**` is depth-independent too — measured
in four implementations (§0.1, §3.5). It is **right in a deeper way that two specifications state
normatively**: in gitignore and EditorConfig, _a filename-only pattern is depth-independent by
default while any pattern naming a folder is anchored by default_, so the folder form pays a
`**/`-prefix tax that is silent when forgotten. The asymmetry that actually holds: **the suffix
puts the selector in the segment the file owns.** Membership survives relocation; nothing is
captured by inheritance (`src/**/model/**` matches `model/README.md`); each match has exactly one
derivation (Python's `glob` returns `src/a/model/b/model/c.ts` **twice**); and no "this folder
doesn't count" escape hatch is needed — Rails, Next.js and Cargo each had to invent one. The
suffix's one real cost is **suffix stacking**: `**/*.model.ts` does not match
`user.model.test.ts`, silently. Three independent tools have paid for that. **The most useful
finding in §3 is a hard null** — nobody compares the two on glob-selectability grounds; and
**FSD, the brief's exemplar, does the opposite of what was assumed**: it uses
`model/<domain>.ts`, has no filename suffix convention at all, argues purely from human
navigation, and needed a **bespoke tree-walking linter** (Steiger, five rules dedicated to
folder-name ambiguity) because its convention **is not expressible in a glob mechanism**.

**Q4 — A plugin or core-rule config, not a custom rule? Yes, both requirements, and the
type/import ones cost zero dependencies.** `no-restricted-syntax` with `TSInterfaceDeclaration` /
`TSTypeAliasDeclaration` / `TSEnumDeclaration` under a `files:`+`ignores:` override, and
`no-restricted-imports` with `paths:` under a `files:` override, both work on stock ESLint —
**verified by execution** on eslint v10.9.1 (§4.5), including that the bare selector catches
exported _and_ local declarations and `declare` (a boolean flag, not a node type), and that
`no-restricted-imports` misses `require()` and dynamic `import()`. For the naming rule itself:
`eslint-plugin-check-file` (3.3.2, 8 transitive deps) does it via `filename-naming-convention`'s
glob-key → pattern-value map — **but its value pattern is matched against the basename with the
final extension stripped, which is documented nowhere**; write `*.model`, not `*.model.ts`
(proved by a failed run). Two corrections to the brief: **`eslint-plugin-boundaries` v7 deprecated
`element-types`, `no-unknown`, `mode`, `entry-point`, `external` and `no-private`** — only
`no-unknown-files` survives, and it is the one unique capability here (flagging files that match
**no** pattern, which `check-file` cannot do). And `eslint-plugin-filenames` is **dead**: last
publish 2018-06-13, README says "no longer actively maintained", npm `deprecated` flag unset, still
549,500 downloads/week.

**Q5 — Prior art for routing docs into context by path glob?** **Yes, and it is now an
industry-wide pattern with at least seven independent implementations** — Claude Code
`.claude/rules/` (`paths:`), Cursor `.mdc` (`globs:`), GitHub Copilot
`.github/instructions/*.instructions.md` (`applyTo:`), Windsurf/Devin `.devin/rules/`
(`trigger: glob` + `globs:`), AWS Kiro `.kiro/steering/` (`inclusion: fileMatch` +
`fileMatchPattern`), Continue `.continue/rules` (`globs:`), and Claude Code _skills_ (`paths:`).
Three facts across all of them are worth having: **(a) every one unions the matching set; not
one computes glob specificity or ranks matches** — the same conclusion the repo already reached
for `.gitignore`/CODEOWNERS/EditorConfig (`pathrule-precedence.md`). **(b) There is an explicit,
quantified size budget in five of them**, and they disagree by a factor of five (200 → 1,000
lines) — §5.4. **(c) A second, competing design exists**: derive the scope from _where the file
sits_ rather than from a declared glob. Windsurf desugars a subdirectory `AGENTS.md` into "a
**glob** rule with an auto-generated pattern of `<directory>/**`", and Gemini CLI and Claude Code
both load nested instruction files just-in-time (§5.5). Placement-derived scoping is strictly
weaker: it can only ever express "this subtree".

**Hard nulls, up front.** **(1)** No source anywhere gives _glob selectability_ as the rationale
for a filename convention — except one withdrawn clause in Angular's 2016 guide (§2.4). **(2)** No
published source compares folder against suffix organisation on selectability grounds (§3.6).
**(3)** Neither Cockburn nor Robert Martin names a single folder — `domain/application/
infrastructure` is folklore (§3.3). **(4)** No agent-rules system states which glob dialect it
implements, and at least three incompatible `**` semantics are in play (§5.2). **(5)** On sizing
governance docs for glob-triggered loading: **five vendors publish a budget and they disagree
fivefold** (200 → 1,000 lines), none with evidence, and the one published proposal for glob-routed
ADRs sources its number from Anthropic's guidance about a _different_ document type. There is no
independent literature (§5.4, §5.7). Full list in §6.

---

## 0. The floor: what a glob can and cannot select

Everything below rests on `**` semantics, and the single most consequential fact is
counter-intuitive: **`**` matches _zero_ or more directories.**

**git, `gitignore(5)`** — <https://git-scm.com/docs/gitignore>, "PATTERN FORMAT". The most
precisely specified `**` in common use, three normative cases:

> A leading `**` followed by a slash means match in all directories. For example, `**/foo`
> matches file or directory `foo` anywhere, the same as pattern `foo`.
>
> A trailing `/**` matches everything inside. For example, `abc/**` matches all files inside
> directory `abc`, relative to the location of the `.gitignore` file, with infinite depth.
>
> A slash followed by two consecutive asterisks then a slash matches zero or more directories.
> For example, `a/**/b` matches `a/b`, `a/x/b`, `a/x/y/b` and so on.

And the rule that forces the leading `**/` on any suffix pattern:

> An asterisk `*` matches anything except a slash.

**Bash, `globstar`** — <https://www.gnu.org/software/bash/manual/bash.html>, "The Shopt
Builtin":

> If set, the pattern `**` used in a filename expansion context will match all files and zero or
> more directories and subdirectories. If the pattern is followed by a `/`, only directories and
> subdirectories match.

**EditorConfig Specification** — <https://spec.editorconfig.org/>, "Glob Expressions":

> `*` — Matches any string of characters, except path separators (`/`)
>
> `**` — Matches any string of characters

Note EditorConfig's `**` is the loose kind — it _does_ cross separators — which is a different
dialect from git's segment-anchored `**`. Dialects differ; this matters (§5.2).

**POSIX does not define `**` at all.** Pattern Matching Notation
(<https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html#tag_18_13>) defines
only `*`, `?` and bracket expressions, and for pathname expansion states that a `*` does not
match a `/`. There is no `**` in the standard. So every `**` in this document is an
implementation extension, and the implementations disagree.

### 0.1 Measured, against the matcher this repo would use

**[executed]** Node v26.5.0, `path.matchesGlob`. This is the matcher issue #1 already identified
as a zero-dependency option, and it is segment-aware. Each row is `result / pattern / path`:

| result      | pattern                       | path                                  |
| ----------- | ----------------------------- | ------------------------------------- |
| `true`      | `src/**/*.model.ts`           | `src/user.model.ts`                   |
| `true`      | `src/**/*.model.ts`           | `src/a/b/c/user.model.ts`             |
| `true`      | `src/*.model.ts`              | `src/user.model.ts`                   |
| **`false`** | `src/*.model.ts`              | `src/a/user.model.ts`                 |
| **`false`** | `src/*.ts`                    | `src/a/user.ts`                       |
| `true`      | `src/*/*.ts`                  | `src/a/user.ts`                       |
| `true`      | `src/**/model/**`             | `src/model/index.ts`                  |
| `true`      | `src/**/model/**`             | `src/user/model/index.ts`             |
| `true`      | `src/**/model/**`             | `src/a/b/model/deep/x/y.ts`           |
| **`false`** | `src/*/model/**`              | `src/model/index.ts`                  |
| **`false`** | `src/**/model/**`             | `src/models/index.ts`                 |
| **`false`** | `docs/log/**`                 | `docs/logging/x.md`                   |
| **`false`** | `src/**/*.model.ts`           | `src/user.model.test.ts`              |
| `true`      | `src/**/*.test.ts`            | `src/user.model.test.ts`              |
| `true`      | `src/**/*.model.*`            | `src/user.model.test.ts`              |
| `true`      | `src/**/*.model.{ts,tsx}`     | `src/user.model.tsx`                  |
| `true`      | `src/**/model/**`             | `src/a/model/b/model/c.ts`            |
| `true`      | `**/*.model.ts`               | `x.model.ts`                          |
| **`false`** | `src/**/*.model.ts`           | `x.model.ts`                          |
| `true`      | `.archgate/adrs/**/*.{md,ts}` | `.archgate/adrs/GEN-001-adr.rules.ts` |

Six facts fall out, and they are the technical spine of §3:

1. **`src/**/*.model.ts` is depth-independent.** It matches at depth 0 and depth 3. `**` matching
   zero directories is what buys this.
2. **`src/**/model/**` is _also_ depth-independent**, for the same reason. The brief's premise
   that a folder convention "requires the folder at a predictable position" is false — it
   requires the `**/`, exactly as the suffix pattern does. `src/*/model/**` is the version that
   pins position, and it misses `src/model/index.ts`.
3. **`*` never crosses `/`.** A suffix pattern without a leading `**/` is a depth-1 pattern.
   `src/*.model.ts` misses `src/a/user.model.ts`; `**/*.model.ts` catches root-level files that
   `src/**/*.model.ts` misses.
4. **Matching is segment-aware.** `src/**/model/**` does not match `src/models/`, and
   `docs/log/**` does not match `docs/logging/x.md` — the defect issue #1 recorded from Jekyll.
5. **A second suffix drops the file out.** `src/**/*.model.ts` misses `src/user.model.test.ts`.
   The file is still "a model", the glob no longer thinks so. This is the suffix convention's
   one genuine fragility, and it is silent.
6. **A folder pattern over-captures downward.** `src/**/model/**` matches
   `src/a/model/b/model/c.ts` — a path with a _duplicated_ `model` segment, which no rule intended.
   Everything below a selected directory is selected, forever, including things added later by
   someone who never read the glob. §3.5 measures the same pattern matching a `README.md`, in four
   independent implementations.

Caveat, stated honestly: Claude Code's own matcher is not `path.matchesGlob`. Its documented
behaviour agrees on segment-awareness, brace expansion and bracket expressions (§5.2), but the
dialect is not specified anywhere, and EditorConfig's looser `**` shows dialects genuinely
diverge. The table above is the semantics of _a_ segment-aware matcher, verified; it is not a
proof about Claude Code.

---

## 1. Where a filename is a contract a tool reads

The survey found no style guide that recommends type suffixes _for glob selectability_. It found
something more useful: a large body of cases where the filename **is** the interface, and those
cases sort cleanly into three tiers by how the contract is enforced. The tier a case sits in is
the thing worth transferring, not the specific suffix.

### 1.1 Tier 1 — the toolchain's own model, non-configurable, silent on violation

**Go, `_test.go`.** The strongest case in the survey, because it is not a glob anywhere. From
`go help test` (<https://pkg.go.dev/cmd/go#hdr-Test_packages>):

> 'Go test' recompiles each package along with any files with names matching
> the file pattern "*_test.go".
> [...]
> Files whose names begin with "_" (including "_test.go") or "." are ignored.
>
> Test files that declare a package with the suffix "_test" will be compiled as a
> separate package, and then linked and run with the main test binary.
>
> The go tool will ignore a directory named "testdata", making it available
> to hold ancillary data needed by the tests.

Note the edge case inside that quote: a file named _literally_ `_test.go` is **ignored**, because
the leading-underscore rule fires first. The suffix determines which of four internal file lists
a source file lands in — `go/build`'s `Package` struct comments make the model explicit:

```go
GoFiles           []string // .go source files (excluding CgoFiles, TestGoFiles, XTestGoFiles)
IgnoredGoFiles    []string // .go source files ignored for this build (including ignored _test.go files)
TestGoFiles  []string // _test.go files in package
XTestGoFiles []string // _test.go files outside package
```

**Normative, and there is no flag to change it.** What breaks: name a test `test_foo.go` and it
compiles into the **production package** — `testing` gets linked into the shipping binary and the
tests never run.

**Go, implicit build constraints from the suffix.** This is the case that shows how sharp a
filename contract can get (<https://pkg.go.dev/cmd/go#hdr-Build_constraints>):

> If a file's name, after stripping the extension and a possible _test suffix,
> matches any of the following patterns:
> *_GOOS
> *_GOARCH
> *_GOOS_GOARCH
> (example: source_windows_amd64.go) where GOOS and GOARCH represent
> any known operating system and architecture values respectively, then
> the file is considered to have an implicit build constraint requiring
> those terms (in addition to any explicit constraints in the file).

> Naming a file dns_windows.go will cause it to be included only when
> building the package for Windows; similarly, math_386.s will be included
> only when building the package for 32-bit x86.

What breaks: a file innocently named `handler_windows.go` for "the Windows-specific handler"
**silently vanishes** from every non-Windows build. And the exclusion of `_`/`.`-prefixed files is
deliberately unreported — `src/go/build/build.go` carries the comment
`// not due to build constraints - don't report`. **Silence by design.**

Correction to the brief: the detailed suffix rules are **no longer** at
`pkg.go.dev/go/build#hdr-Build_Constraints`, which is now a pointer. Cite `cmd/go`. The anchor
casing differs between the two pages (`#hdr-Build_constraints` vs `#hdr-Build_Constraints`).

**TypeScript, `.d.ts`.** Handbook v2, "Type Declarations"
(<https://www.typescriptlang.org/docs/handbook/2/type-declarations.html>):

> `.ts` files are _implementation_ files that contain types and executable code.
> These are the files that produce `.js` outputs, and are where you'd normally write your code.
>
> `.d.ts` files are _declaration_ files that contain _only_ type information.
> These files don't produce `.js` outputs; they are only used for typechecking.

And a reserved _prefix_ convention on top of it, in the same page:

> TypeScript names these declaration files with the pattern `lib.[something].d.ts`.
> If you navigate into a file with that name, you can know that you're dealing with some built-in
> part of the platform, not user code.

**Normative and not configurable at all** — `.d.ts` is a compiler-recognised file _kind_, not a
glob default. This is the closest Tier-1 analogue to `.model.ts`: a double-dotted suffix on an
ordinary extension that changes what the compiler does with the file.

**Vite, `*.module.css`.** The sharpest small case, because the suffix changes compilation
semantics on an otherwise ordinary file type
(<https://vite.dev/guide/features#css-modules>):

> Any CSS file ending with `.module.css` is considered a [CSS modules
> file](https://github.com/css-modules/css-modules). Importing such a file will return the
> corresponding module object

> CSS modules behavior can be configured via the [`css.modules` option](/config/shared-options.md#css-modules).

Note the split: the _behaviour_ is configurable; **the filename trigger is not**. What breaks:
rename `Button.module.css` → `Button.css` and class names stop being scoped (they leak globally)
_and_ the default import becomes `undefined`, so `classes.red` throws.

**Vite, `.env.[mode]`** — a filename that encodes two independent axes, activation _and_
git-ignorability (<https://vite.dev/guide/env-and-mode#env-files>):

```
.env                # loaded in all cases
.env.local          # loaded in all cases, ignored by git
.env.[mode]         # only loaded in specified mode
.env.[mode].local   # only loaded in specified mode, ignored by git
```

> An env file for a specific mode (e.g. `.env.production`) will take higher priority than a
> generic one (e.g. `.env`).

**Precedence derived from the filename** — worth flagging, because §5.3 finds that no
agent-rules system does this.

**Exact-basename contracts.** `.gitignore` (<https://git-scm.com/docs/gitignore>), pytest's
`conftest.py`, GitHub Actions' directory, and kustomize's three accepted names. pytest
(<https://docs.pytest.org/en/stable/reference/fixtures.html#conftest-py>):

> The `conftest.py` file serves as a means of providing fixtures for an entire
> directory. Fixtures defined in a `conftest.py` can be used by any test
> in that package without needing to import them (pytest will automatically
> discover them).

> Tests are allowed to search upward (stepping outside a circle) for fixtures, but
> can never go down (stepping inside a circle) to continue their search.

GitHub Actions (<https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#about-yaml-syntax-for-workflows>)
states it twice in requirement language:

> Workflow files use YAML syntax, and must have either a `.yml` or `.yaml` file extension.

> You must store workflow files in the `.github/workflows` directory of your repository.

kustomize's accepted set, from its own source (`api/konfig/general.go`), with a constraint worth
noticing:

```go
// RecognizedKustomizationFileNames is a list of file names
// that kustomize recognizes.
// To avoid ambiguity, a kustomization directory may not
// contain more than one match to this list.
func RecognizedKustomizationFileNames() []string {
	return []string{"kustomization.yaml", "kustomization.yml", "Kustomization"}
}
```

**"May not contain more than one match"** — a fixed name set _plus_ an ambiguity ban. That is the
shape a router needs and §4.6 says only two plugins can express.

**pytest's `__init__.py`** deserves a line of its own, as the extreme case: the presence or
absence of a **zero-byte file** changes a test module's import name and mutates `sys.path`
(<https://docs.pytest.org/en/stable/explanation/goodpractices.html#conventions-for-python-test-discovery>):

> - determine `basedir`: this is the first "upward" (towards the root)
>   directory not containing an `__init__.py`.

### 1.2 Tier 2 — framework-normative, with one documented escape hatch

**Next.js App Router — the basenames are fixed; only the extensions are configurable.**
`page` (<https://nextjs.org/docs/app/api-reference/file-conventions/page>, docs `version: 16.3.3`):

> - The `.js`, `.jsx`, or `.tsx` file extensions can be used for `page`.
> - A `page` is always the **leaf** of the route subtree.
> - A `page` file is required to make a route segment **publicly accessible**.

The same rule stated as the safety property that makes colocation possible
(<https://nextjs.org/docs/app/getting-started/project-structure#colocation>) — and this is the
most directly transferable idea in §1:

> However, even though route structure is defined through folders, a route is **not publicly
> accessible** until a `page.js` or `route.js` file is added to a route segment.

> This means that **project files** can be **safely colocated** inside route segments in the `app`
> directory without accidentally being routable.

**Arbitrary files in a routed directory are inert precisely because only reserved basenames are
load-bearing.** A folder-based router would have had to treat everything in the directory as a
route; a filename-based one does not.

`layout` (<https://nextjs.org/docs/app/api-reference/file-conventions/layout>):

> The `app` directory **must** include a **root layout** [...]
>
> - The root layout **must** define `<html>` and `<body>` tags.

The extension set is **per-basename**, not global: `layout`/`page`/`loading`/`error`/`template`/
`default`/`not-found` take `.js .jsx .tsx`; `route` takes `.js .ts`. Bare `.ts` is not valid for
`page`.

`pageExtensions` (<https://nextjs.org/docs/app/api-reference/config/next-config-js/pageExtensions>):

> By default, Next.js accepts files with the following extensions: `.tsx`, `.ts`, `.jsx`, `.js`.
> This can be modified to allow other extensions like markdown (`.md`, `.mdx`).

**NOT FOUND:** any option anywhere in the Next.js config reference to rename the _basenames_.
Half the contract is configurable, half is not — deliberately.

Next.js also makes **directory punctuation** load-bearing, which is the folder-side analogue:

> Private folders can be created by prefixing a folder with an underscore: `_folderName`
>
> This indicates the folder is a private implementation detail and should not be considered by the
> routing system, thereby **opting the folder and all its subfolders** out of routing.

> Route groups can be created by wrapping a folder in parenthesis: `(folderName)`
>
> This indicates the folder is for organizational purposes and should **not be included** in the
> route's URL path.

…with `%5F` documented as the escape hatch for a literal leading underscore — an escape hatch that
exists _only because_ the character is load-bearing. And note the docs' own reason for using
`_folder` at all, which is a naming-collision argument, not a routing one: _"Avoiding potential
naming conflicts with future Next.js file conventions."_

**Remix / React Router, `.server` and `.client` — build-enforced erasure.** React Router v7/v8
(<https://reactrouter.com/api/framework-conventions/server-modules>):

> `.server` modules are a good way to explicitly mark entire modules as server-only. The build
> will fail if any code in a `.server` file or `.server` directory accidentally ends up in the
> client module graph.

> Route modules should not be marked as `.server` or `.client` as they have special handling and
> need to be referenced in both server and client module graphs. Attempting to do so will cause
> build errors.

So the suffix is simultaneously a **requirement in one place and a prohibition in another** —
a detail worth carrying, because a naming convention that is mandatory everywhere is easier to
lint than one whose validity depends on the file's role.

`.client` (<https://reactrouter.com/api/framework-conventions/client-modules>) changes the
_value_ of an import rather than failing:

> Note that values exported from this module will all be `undefined` on the server

Remix v2's docs (<https://v2.remix.run/docs/file-conventions/-server>) record two _different
enforcement qualities for the same convention_, which is the most instructive fact in §1.2:

> `.server` directories are only supported when using Remix Vite. The Classic Remix Compiler
> only supports `.server` files.

> When using the Classic Remix Compiler, `.server` modules are replaced with empty modules and
> will not result in a compilation error. Note that this can result in runtime errors.

**Same filename convention, two enforcers, one loud and one silent.** The convention did not
change; the guarantee did.

**Correction to the brief: `.server`/`.client` is not a Vite convention.** Grepping Vite's own
`main`-branch docs (`guide/features.md`, `guide/ssr.md`, `guide/backend-integration.md`,
`guide/api-environment.md`) gives **0 matches** for `.server.ts`/`.client.ts` in each. Both Remix
and React Router instead point at a third-party plugin (`vite-env-only`) for finer control. It is
a framework convention built on Vite.

**SvelteKit — the loudest enforcement found, and it is transitive**
(<https://svelte.dev/docs/kit/server-only-modules>):

> You can make your own modules server-only in two ways:
>
> - adding `.server` to the filename, e.g. `secrets.server.js`
> - placing them in `$lib/server`, e.g. `$lib/server/secrets.js`

Note SvelteKit offers **both** mechanisms for the same guarantee — suffix _or_ folder — which is
the cleanest available statement that the two are interchangeable _as declarations_ (§3). The
error names the whole import chain:

```
Cannot import $lib/server/secrets.ts into code that runs in the browser, as this could leak sensitive information.

 src/routes/+page.svelte imports
  src/routes/utils.js imports
   $lib/server/secrets.ts
```

> This feature also works with dynamic imports, even interpolated ones like ``await import(`./${foo}.js`)``.

> Unit testing frameworks like Vitest do not distinguish between server-only and public-facing
> code. For this reason, illegal import detection is disabled when running tests, as determined by
> `process.env.TEST === 'true'`.

That last note is the documented hole: the filename contract is **not enforced under test**.

**Rust / Cargo — convention-over-configuration with an explicit off switch.**
<https://doc.rust-lang.org/cargo/reference/cargo-targets.html#target-auto-discovery>:

> By default, Cargo automatically determines the targets to build based on the
> [layout of the files][package layout] on the filesystem.

> The automatic target discovery can be disabled so that only manually
> configured targets will be built. Setting the keys `autolib`, `autobins`, `autoexamples`,
> `autotests`, or `autobenches` to `false` in the `[package]` section will
> disable auto-discovery of the corresponding target type.

> Disabling automatic discovery should only be needed for specialized
> situations. For example, if you have a library where you want a _module_ named
> `bin`, this would present a problem because Cargo would usually attempt to
> compile anything in the `bin` directory as an executable.

That worked example is the folder-convention hazard in one paragraph: **a directory named `bin`
changes what the files inside it _are_.** Individual targets:

> The library target [...] filename defaults to `src/lib.rs` [...] A package can have only one library.

> A binary's source can be `src/main.rs` and/or stored in the [`src/bin/` directory][package layout].

**Rust modules — and `mod.rs` is now the legacy form.** The Reference
(<https://doc.rust-lang.org/reference/items/modules.html>):

> Ancestor module path components are directories, and the module's contents are in a file with
> the name of the module plus the `.rs` extension.

> Module filenames may also be the name of the module as a directory with the contents in a file
> named `mod.rs` within that directory. [...] It is not allowed to have both `util.rs` and
> `util/mod.rs`.

> Prior to `rustc` 1.30, using `mod.rs` files was the way to load a module with nested children.
> It is encouraged to use the new naming convention as it is more consistent, and avoids having
> many files named `mod.rs` within a project.

Note the migration's _stated reason_: **too many files with the same name.** Rust moved _away_
from a fixed-basename-in-a-folder convention toward a distinct-filename one, for legibility. That
is a data point in the opposite direction from Angular's, on the same question.

Also: whether a file is named `mod.rs` changes how `#[path]` inside it resolves — the Reference
splits files into "mod-rs" and "non-mod-rs" kinds. And **the "both forms present" case is a hard
error** — the same ambiguity ban kustomize states.

**Terraform `override.tf` / `_override.tf` — the case where the filename _inverts_ the
semantics.** <https://developer.hashicorp.com/terraform/language/files/override> (docs v1.16.x):

> Terraform normally loads all of the .tf and .tf.json files within a
> directory and expects each one to define a distinct set of configuration
> objects. If two files attempt to define the same object, Terraform returns
> an error.

> For these rare situations, Terraform has special handling of any configuration
> file whose name ends in _override.tf or _override.tf.json. This special
> handling also applies to a file named literally override.tf or
> override.tf.json.

> Use override files only in special circumstances. Over-use of override files
> hurts readability, since a reader looking only at the original files cannot
> easily see that some portions of those files have been overridden without
> consulting all of the override files that are present.

Two byte-identical files, one named `main.tf` and one `override.tf`, produce **opposite**
outcomes: duplicate-definition error versus silent merge. And a second filename dependency:

> Overrides are processed in order first by filename (in lexicographical order)
> and then by position in each file.

Renaming `a_override.tf` → `z_override.tf` changes the resulting infrastructure. **This is the
one case in the survey where a vendor documents the _readability cost_ of putting semantics in a
filename** — worth quoting verbatim in any ADR that adopts a suffix convention, because it is the
counter-argument stated by someone who shipped the feature anyway.

**`Dockerfile`, `Makefile`, `CODEOWNERS`** — default lookup plus an override flag or an ordered
search list. GNU Make (<https://www.gnu.org/software/make/manual/html_node/Makefile-Names.html>)
is the interesting one, because the filename carries a **compatibility claim**:

> By default, when make looks for the makefile, it tries the
> following names, in order: GNUmakefile, makefile
> and Makefile.
> [...] You should
> use this name if you have a makefile that is specific to GNU
> make, and will not be understood by other versions of
> make. Other make programs look for makefile and
> Makefile, but not GNUmakefile.

CODEOWNERS
(<https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners#codeowners-file-location>)
adds a _branch_ dimension on top of the filename:

> To use a CODEOWNERS file, create a new file called `CODEOWNERS` in the `.github/`, root, or
> `docs/` directory of the repository, in the branch where you'd like to add the code owners. If
> `CODEOWNERS` files exist in more than one of those locations, GitHub will search for them in
> that order and use the first one it finds.

### 1.3 Tier 3 — a configurable default glob, which is what most people mean by "the convention"

This tier matters because it is where `.test.ts`, `.spec.ts` and `.stories.tsx` actually live —
and it is **much** weaker than the reputation suggests.

Vitest `include` (<https://vitest.dev/config/include>) — note the URL correction: the brief's
`vitest.dev/config/#include` no longer holds the content, since Vitest split config into
per-option pages:

> - **Type:** `string[]`
> - **Default:** `['**/*.{test,spec}.?(c|m)[jt]s?(x)']`

> Vitest provides reasonable defaults, so normally you wouldn't override them.

> This option will override Vitest defaults. If you just want to extend them, use
> `configDefaults` from `vitest/config`

Jest `testMatch` (<https://jestjs.io/docs/configuration#testmatch-arraystring>):

> (default: `[ "**/__tests__/**/*.?([mc])[jt]s?(x)", "**/?(*.)+(spec|test).?([mc])[jt]s?(x)" ]`)
>
> The glob patterns Jest uses to detect test files. By default it looks for `.js`, `.jsx`, `.ts`
> and `.tsx` files inside of `__tests__` folders, as well as any files with a suffix of `.test` or
> `.spec` [...]
>
> See also `testRegex`, but note that you cannot specify both options.

Node's built-in runner (<https://nodejs.org/api/test.html>) accepts a **wider** set, and
crucially **not** `.spec.*`:

> By default, Node.js will run all files matching these patterns:
>
> - `**/*.test.{cjs,mjs,js}`
> - `**/*-test.{cjs,mjs,js}`
> - `**/*_test.{cjs,mjs,js}`
> - `**/test-*.{cjs,mjs,js}`
> - `**/test.{cjs,mjs,js}`
> - `**/test/**/*.{cjs,mjs,js}`

So `foo.spec.js` under plain `node --test` is **not** collected, though Jest and Vitest both take
it. **Cross-runner filename assumptions do not transfer** — which is exactly the risk of treating
a Tier-3 default as a convention.

Storybook (<https://storybook.js.org/docs/api/main-config/main-config-stories>) is the honest
split verdict: the `stories` **field is `(Required)`**, its glob default is
`'**/*.@(mdx|stories.@(js|jsx|mjs|ts|tsx))'`, and:

> If you want to use a different naming convention, you can alter the glob using the syntax
> supported by [picomatch](https://github.com/micromatch/picomatch#globbing-features).
>
> Keep in mind that some addons may assume Storybook's default naming convention.

**The convention is load-bearing for the _ecosystem_ even where it is configurable for the _core
tool_.** That is the real reason Tier-3 conventions calcify.

### 1.4 What the real cases share — the shape worth copying

Six properties recur across Tier 1 and Tier 2, and none of them is "the suffix names the kind of
thing in the file":

1. **The name selects a _behaviour_, not a category.** `_test.go` picks a compilation unit;
   `.server.ts` picks a bundle; `.module.css` picks a transform; `override.tf` picks a merge
   strategy; `page.tsx` picks public reachability. In every case the tool _does something
   different_. `.model.ts` in NestJS qualifies (the GraphQL plugin analyses it); `.model.ts` in
   Angular never did.
2. **The name set is closed and enumerated.** Next.js has ~14 basenames; kustomize has three;
   Go has `_test` plus the GOOS/GOARCH vocabulary; NestJS ships the list as a config default
   (`typeFileNameSuffix`). Nobody says "invent suffixes as needed" — which is precisely what
   Angular's 02-02 _did_ say ("Invent additional type names if you must"), and it is the clause
   the 2025 guide dropped.
3. **Ambiguity is banned, explicitly.** kustomize: "may not contain more than one match to this
   list". Rust: "not allowed to have both `util.rs` and `util/mod.rs`". Jest: "you cannot specify
   both options". A router that can match a file two ways needs this rule or a precedence rule;
   these tools chose the ban.
4. **There is exactly one documented escape hatch, and it is coarse.** `pageExtensions`,
   `auto* = false`, `#[path]`, `-f`, `%5F`, `typeFileNameSuffix`. Never a per-file opt-out; always
   a project-level switch.
5. **Extension and basename are governed separately.** Next.js configures extensions and freezes
   basenames. Go's `go help filetype` makes the extension select the _compiler_. This matters
   directly: `.archgate/adrs/**/*.{md,ts}` in GEN-001 is doing both jobs in one pattern.
6. **Violation is silent.** A route 404s, a test never runs, a story never appears, a
   platform-specific file vanishes, a secret ships to the browser. The two loud exceptions are
   SvelteKit (prints the offending import chain) and Rust (`error[E0583]: file not found for
module`). **For a context router this is the governing risk**: a file that matches no `paths:`
   glob silently loads no governance, and nothing anywhere reports it — which is why §4.6 rates
   `no-unknown-files`-style exhaustiveness as the load-bearing lint, not the naming rule itself.

**NOT FOUND, and worth stating:** no source in this tier survey gives _glob selectability_ as the
rationale for its filename convention. The rationales given are compilation model (Go, Rust, TS),
safety (SvelteKit, Remix), routing (Next.js), and merge semantics (Terraform). The single
published sentence that gives the glob rationale is Angular's withdrawn Style 02-02 (§2.4).

---

## 2. Angular, the owner's mental model — and the reversal

This is the section the owner most needs, because the belief he is acting on was true and is
now false.

### 2.1 The current official guide has no suffix rule at all

Source: <https://angular.dev/style-guide>, docs source
<https://github.com/angular/angular/blob/main/adev/src/content/best-practices/style-guide.md>.
Page version stamp: `Built by Angular at v22.1.4+sha-8983809`. The **complete** "Naming" section:

> ## Naming
>
> ### Separate words in file names with hyphens
>
> Separate words within a file name with hyphens (`-`). For example, a component named
> `UserProfile` has a file name `user-profile.ts`.
>
> ### Use the same name for a file's tests with `.spec` at the end
>
> For unit tests, end file names with `.spec.ts`. For example, the unit test file for the
> `UserProfile` component has the file name `user-profile.spec.ts`.
>
> ### Match file names to the TypeScript identifier within
>
> File names should generally describe the contents of the code in the file. When the file
> contains a TypeScript class, the file name should reflect that class name. For example, a file
> containing a component named `UserProfile` has the name `user-profile.ts`.
>
> If the file contains more than one primary namable identifier, choose a name that describes
> the common theme to the code within. If the code in a file does not fit within a common theme
> or feature area, consider breaking the code up into different files. Avoid overly generic file
> names like `helpers.ts`, `utils.ts`, or `common.ts`.
>
> ### Use the same file name for a component's TypeScript, template, and styles

The nuance matters: the guide **does not say "don't use suffixes"**. It omits the concept.
A machine-verified negative over the full 326-line docs source and the rendered page: zero
matches for `suffix`, `.component`, `.service`, `.model`, `.pipe`, `.directive`, or `dots`. The
only surviving suffix in the whole guide is `.spec`. Verified identical across
<https://v20.angular.dev/style-guide>, <https://v21.angular.dev/style-guide> and
<https://angular.dev/style-guide> (v22).

The guide grades its own force, and this is the tag for everything in §2.1–2.4:

> These recommendations are not required for Angular to work, but instead establish a set of
> coding practices that promote consistency across the Angular ecosystem.

**Conventional**, explicitly. No Angular runtime, compiler, or build step ever read a type
suffix. Angular's suffixes were _always_ cosmetic — which is exactly why they could be dropped.

### 2.2 The RFC, in the team's own words

Source: <https://github.com/angular/angular/discussions/58412> — "[Complete] RFC: An updated
style guide for the year 2024", author `jelbourn` (Angular team lead), created 2024-10-29.
Implemented by PR <https://github.com/angular/angular/pull/60809> (`docs: replace style guide
with 2025 revision`), merged 2025-04-09.

The operative section, quoted in full because the reasoning is the transferable part:

> ### Stop recommending suffixing most file names and class names with the type of construct
>
> The current style guide recommends suffixing file names and class names with the type of
> Angular construct. For example:
>
> - `user-profile.component.ts` and `UserProfileComponent`
> - `campaign-data.service.ts` and `CampaignDataService`
>
> Over time, we've observed that this naming convention can make the framework feel cumbersome
> and boilerplate-y, especially for new developers unaccustomed to this practice.
>
> For class naming, we believe it's better for a class name to reflect the class's behavior and
> responsibilities, not _how it's used_. The term "service", in particular, does not add any
> meaningful information to explain what a class does. Thus, this naming convention can sometimes
> lead to _less_ helpful names for classes. [...] As a result of our observations, we're
> **reversing** this guidance.
>
> There are two exceptions to this change: Pipes and NgModules.

Three things to notice, because they bear directly on whether this repo should follow Angular.

**(a) The argument is about _class_ names, and file names followed along.** The named harm is
"cumbersome and boilerplate-y" and "less helpful names for classes" — a _human-authorship_
argument. It says nothing about machine selection, because nothing in Angular selected on the
suffix.

**(b) The justification is observational, not measured.** "we've observed", "we believe". No
data is offered. This is exactly the pattern the repo's own memory note warns about — a
constraint kept or dropped on assertion. Angular dropped a suffix that nothing consumed; that is
a different decision from dropping a suffix a router consumes.

**(c) The retained exceptions kept the type and changed the _separator_.** NgModules and Pipes
became `profile-module.ts` and `date-pipe.ts` — dash, not dot. This is the one place the RFC
touches glob-selectability, and it makes it _worse_: `**/*-pipe.ts` is a suffix-of-the-basename
match, not a dot-delimited segment, so it collides with any file whose name simply ends in
"-pipe". Angular traded machine-selectability for reading flow, deliberately.

### 2.3 The CLI shipped it, and named the two conventions

The most airtight artifacts are shipped schema files, not prose.

**The default was deleted.** Component schematic, v17.3.x
(<https://github.com/angular/angular-cli/blob/17.3.x/packages/schematics/angular/component/schema.json>):

```json
"type": {
  "type": "string",
  "description": "Adds a developer-defined type to the filename, in the format \"name.type.ts\".",
  "default": "Component"
}
```

Same property on `main`
(<https://github.com/angular/angular-cli/blob/main/packages/schematics/angular/component/schema.json>):

```json
"type": {
  "type": "string",
  "description": "Append a custom type to the component's filename. For example, if you set the type to `container`, the file will be named `my-component.container.ts`."
}
```

`"default": "Component"` is gone. **[executed]** — reading the shipped source rather than the
docs, `packages/schematics/angular/utility/generate-from-files.ts` confirms the mechanism:

```ts
// Schematic templates require a defined type value
options.type ??= '';
```

…and when `type` is empty a `forEach` collapses `..` to `.` in the rendered path. The service
template filename is literally
`__name@dasherize__.__type@dasherize__.ts.template` (verified via the GitHub contents API), so
with `type = ''` it renders `my-service..ts` → `my-service.ts`. In v17.3.x the same template was
`__name@dasherize__.service.ts.template` — the literal `.service.` became an interpolation with
no default.

**Angular now names the two conventions.** `ng-new/schema.json` on `main`:

```json
"fileNameStyleGuide": {
  "type": "string",
  "enum": ["2016", "2025"],
  "default": "2025",
  "description": "The file naming convention to use for generated files. The '2025' style guide (default) uses a concise format (e.g., `app.ts` for the root component), while the '2016' style guide includes the type in the file name (e.g., `app.component.ts`)."
}
```

Shipped in Angular CLI **21.0.0 (2025-11-19)**, changelog entry `feat | support different file
name style guides in `ng new``, commit `4e6c94f21`. The commit message states the intent:

> This allows users to create new workspaces that adhere to the 2016 style guide conventions, as
> an alternative to the default 2025 style guide. [...] This addresses community feedback
> requesting a way to maintain the previous file naming structure for consistency in existing
> projects and workflows.

**And the opt-back-in mechanism is worth copying.** `application/index.ts` on `main` writes the
old convention into `angular.json` as schematic defaults:

```ts
if (options.fileNameStyleGuide === '2016') {
  const schematicsWithTypeSymbols = ['component', 'directive', 'service'];
  schematicsWithTypeSymbols.forEach((type) => {
    const schematicDefaults = (schematics[`@schematics/angular:${type}`] ??= {}) as JsonObject;
    schematicDefaults.type = type;
    schematicDefaults.addTypeToClassName = false;
  });

  const schematicsWithTypeSeparator = ['guard', 'interceptor', 'module', 'pipe', 'resolver'];
  schematicsWithTypeSeparator.forEach((type) => {
    ((schematics[`@schematics/angular:${type}`] ??= {}) as JsonObject).typeSeparator = '.';
  });
}
```

So the type suffix survives as a **per-project, generator-level configuration** — a first-class
supported choice, not a deprecated one. That is the precedent for this repo: a naming convention
can be a local, declared, tool-read decision without being anybody's global best practice.

**The behaviour change shipped in v20.0.0 (2025-05-28)**, and the changelog classifies it as
`fix`, not `feat`, and does not list it under `## Breaking Changes`:

> | 23fc8e1e1 | fix | generate components without a `.component` extension/type |
> | 8d715fa94 | fix | generate directives without a .directive extension/type |
> | bc0f07b48 | fix | generate services without a .service extension/type |
> | 5fc595144 | fix | generate guards with a dash type separator |
> | e6083b57b | fix | generate pipes with a dash type separator |

Commit `23fc8e1e1` spells out the migration story:

> To align with the updated style guide, Angular v20 will generate components without a
> `.component` file extension type for all component related files by default. Projects will
> automatically use this naming convention. Projects can however opt-out by setting the `type`
> option to `Component` for the component schematic.

Confirmed empirically by a user who filed it as a bug — issue
<https://github.com/angular/angular-cli/issues/30566>, CLI 20.0.3:

> ```
> > ng g c login
> CREATE src/app/login/login.spec.ts (544 bytes)
> CREATE src/app/login/login.ts (193 bytes)
> ```

…closed by `alan-agius4` (Angular team, `authorAssociation: COLLABORATOR`), 2025-06-19:

> This is expected as per changes to the style guide that were introduced in version 20.

**Normative for generated output; conventional for hand-written files.** The CLI's `name`
descriptions for `service`, `directive`, `pipe`, `guard` and `interface` are **stale** — they
still read "e.g. `my-service.service.ts`" while the `type` option on the same schema has no
default. Cite the schema and the template filename, not those sentences.

### 2.4 `.model.ts` was never official Angular

The old guide is still live at <https://v17.angular.io/guide/styleguide> (and
`angular.io/guide/styleguide` redirects there); verbatim source
<https://github.com/angular/angular/blob/17.3.x/aio/content/guide/styleguide.md>, 2306 lines.
**Style 02-02 "Separate file names with dots and dashes"**, complete:

> **Do** use dashes to separate words in the descriptive name.
>
> **Do** use dots to separate the descriptive name from the type.
>
> **Do** use consistent type names for all components following a pattern that describes the
> component's feature then its type. A recommended pattern is `feature.type.ts`.
>
> **Do** use conventional type names including `.service`, `.component`, `.pipe`, `.module`, and
> `.directive`. Invent additional type names if you must but take care not to create too many.
>
> **Why**? Type names provide a consistent way to quickly identify what is in the file.
>
> **Why**? Type names make it easy to find a specific file type using an editor or IDE's fuzzy
> search techniques.
>
> **Why**? Unabbreviated type names such as `.service` are descriptive and unambiguous.
> Abbreviations such as `.srv`, `.svc`, and `.serv` can be confusing.
>
> **Why**? Type names provide pattern matching for any automated tasks.

That last "Why" is the closest any official style guide in this entire survey comes to the
owner's actual rationale — _"Type names provide pattern matching for any automated tasks."_
**It is one clause, in a guide Angular has since replaced.** If there is an industry best
practice for naming-so-globs-work, this sentence is the whole of the published evidence for it,
and its author withdrew the rule.

**The official list is exactly five entries, and `model` is not one of them.** An exhaustive
search for `model` across all 2306 lines returns four hits, none inside an `s-rule` block (the
guide's markup for actual Do/Consider/Avoid rules): prose describing an anti-pattern (L103), a
`<code-pane header="app/heroes/shared/hero.model.ts">` sample tab label (L117), an illustrative
file tree for Style 04-06 (L1057), and "before binding the model in templates" — a different
sense of the word (L1552).

**Style 02-03 "Symbols and file names"** is the rule the 2025 guide replaced:

> **Do** match the name of the symbol to the name of the file.
>
> **Do** append the symbol name with the conventional suffix (such as `Component`, `Directive`,
> `Module`, `Pipe`, or `Service`) for a thing of that type.
>
> **Do** give the filename the conventional suffix (such as `.component.ts`, `.directive.ts`,
> `.module.ts`, `.pipe.ts`, or `.service.ts`) for a file of that type.

Five types again. No `model`. Compare against the 2025 guide's _"Match file names to the
TypeScript identifier within"_ — same slot in the document, opposite instruction.

**NOT FOUND:** the "use custom file suffixes sparingly" wording. Exhaustive grep for
`sparingly` and `custom file` across the v17 guide returns zero matches. The only hedge on
inventing suffixes is 02-02's _"Invent additional type names if you must but take care not to
create too many."_ And there is no `model` schematic in the Angular CLI collection at all — the
directory listing is `class, component, config, directive, enum, environments, guard,
interceptor, interface, library, module, ng-new, pipe, resolver, service, ...` (GitHub contents
API, `packages/schematics/angular`). `.model.ts` is not an Angular artefact in any sense.

**Verdict: `.model.ts` is community habit, most plausibly propagated from the Tour of Heroes
sample file `hero.model.ts`.** Anyone citing "the Angular convention" for `.model.ts` is citing
a tutorial artefact — and citing a guide that has since reversed the rule the artefact
illustrated.

### 2.5 NestJS went the other way — and `.model.ts` is normative _there_

NestJS is the more useful precedent for this repo, because it is the case where a type suffix
**is** load-bearing.

**No official style-guide statement exists.** Exhaustive search of the full docs source
(<https://github.com/nestjs/docs.nestjs.com>, 142 markdown files under `content/`): `.module.ts`
26 occurrences, `.service.ts` 17, `.controller.ts` 14, `.entity.ts` 7, `.dto.ts` 5 — **every one
inside a code block, a `@@filename(...)` label directive, or a `<div class="file-tree">`.**
Grep for `must be named`, `should be named`, `naming convention`, `file name`, `filename` returns
no statement mandating the suffixes. There is no style-guide page in the NestJS docs.
**NOT FOUND: NestJS has no official file-naming style guide statement.**

**But the CLI hardcodes them with no escape hatch.** The suffix is baked into the template
filename (<https://github.com/nestjs/schematics/tree/master/src/lib>):

```
src/lib/controller/files/ts/__name__.controller.ts
src/lib/service/files/ts/__name__.service.ts
src/lib/module/files/ts/__name__.module.ts
src/lib/resource/files/ts/dto/create-__name@singular__.dto.ts
```

`controller/schema.json`'s complete option list is `["name", "path", "language", "sourceRoot",
"skipImport", "module", "flat", "spec", "specFileSuffix", "format"]` — **no `type`, no
`suffix`.** Where Angular added a knob and flipped its default, NestJS never had one.

**And three places in NestJS genuinely read the filename.** Swagger CLI plugin,
<https://docs.nestjs.com/openapi/cli-plugin>:

> Please, note that your filenames **must have** one of the following suffixes:
> `['.dto.ts', '.entity.ts']` (e.g., `create-user.dto.ts`) in order to be analysed by the plugin.
>
> If you are using a different suffix, you can adjust the plugin's behavior by specifying the
> `dtoFileNameSuffix` option (see below).

GraphQL CLI plugin, <https://docs.nestjs.com/graphql/cli-plugin> — **this is where `.model.ts`
lives**:

> Please, note that your filenames **must have** one of the following suffixes in order to be
> analyzed by the plugin: `['.input.ts', '.args.ts', '.entity.ts', '.model.ts']` (e.g.,
> `author.entity.ts`). If you are using a different suffix, you can adjust the plugin's behavior
> by specifying the `typeFileNameSuffix` option (see below).

And the default Jest config generated into every new Nest project
(<https://github.com/nestjs/typescript-starter/blob/master/package.json>) sets
`"testRegex": ".*\\.spec\\.ts$"`, with `test/jest-e2e.json` setting
`"testRegex": "\\.e2e-spec\\.ts$"`. Plus the only prose hint in the docs
(<https://docs.nestjs.com/fundamentals/testing>):

> **Hint** Keep your test files located near the classes they test. Testing files should have a
> `.spec` or `.test` suffix.

| Suffix                      | Normative?                                  | Read by                     | Escape hatch         |
| --------------------------- | ------------------------------------------- | --------------------------- | -------------------- |
| `.dto.ts`                   | **normative**                               | Swagger CLI plugin (opt-in) | `dtoFileNameSuffix`  |
| `.entity.ts`                | **normative**                               | Swagger + GraphQL plugins   | both options         |
| `.model.ts`                 | **normative**                               | GraphQL CLI plugin          | `typeFileNameSuffix` |
| `.input.ts`, `.args.ts`     | **normative**                               | GraphQL CLI plugin          | `typeFileNameSuffix` |
| `.spec.ts`, `.e2e-spec.ts`  | **normative**                               | Jest `testRegex`            | edit `testRegex`     |
| `main.ts`                   | **normative**                               | `nest start`                | `entryFile`          |
| `.controller.ts`            | conventional in docs; normative for Swagger | `controllerFileNameSuffix`  | option               |
| `.service.ts`, `.module.ts` | **conventional**                            | CLI template only           | none in CLI          |

**Two things this licenses.** First, the pattern the owner wants — _a declared list of
load-bearing filename suffixes, with a configuration key that lets a project change the list_ —
is shipped, documented, and defaulted by a major framework. `dtoFileNameSuffix`,
`typeFileNameSuffix` and `controllerFileNameSuffix` are precisely "the glob is configuration, the
suffix is the contract". Second, a caution: **"type suffix" is not one uniform category.**
`.service.ts` in a Nest project is decoration; `.model.ts` in the same project is a contract with
the GraphQL compiler plugin. Reasoning about them together will produce a wrong answer.

---

## 3. Folder convention or suffix convention, as a glob selector

### 3.1 Feature-Sliced Design does the opposite of what the brief assumed

FSD's segments are real and normatively named
(<https://feature-sliced.design/docs/reference/slices-segments>):

> Segments are the third and final level in the organizational hierarchy, and their purpose is to
> group code by its technical nature.

> There a few standardized segment names:
>
> - `ui` — everything related to UI display: UI components, date formatters, styles, etc.
> - `api` — backend interactions: request functions, data types, mappers, etc.
> - `model` — the data model: schemas, interfaces, stores, and business logic.
> - `lib` — library code that other modules on this slice need.
> - `config` — configuration files and feature flags.

_(the missing "are" is verbatim in the source.)_ **Recommendation, not requirement** — the word is
"standardized", and custom segments are explicitly allowed: _"You can also create custom
segments."_ The only "must" statements on the page are about public API, not names. And the
docs' naming page (<https://feature-sliced.design/docs/about/understanding/naming>) is about
**layer and segment names only** — it says nothing about file names.

**A glob cannot enumerate the segment set, because the set is not five.** The Shared layer adds
`routes` and `i18n`; the App layer adds `routes`, `store`, `styles`, `entrypoint`
(<https://feature-sliced.design/docs/reference/layers>). At least ten names in the official docs,
plus permitted custom ones.

**The decisive finding: FSD has no filename suffix convention, and where it does speak about
filenames it says the opposite.** A grep of the complete FSD corpus
(<https://feature-sliced.design/llms-full.txt>, 8,528 lines, retrieved 2026-08-27) for
`file name|filename|naming convention|camelCase|kebab-case|PascalCase` returns **exactly two
hits, both on one page** (<https://feature-sliced.design/docs/guides/issues/desegmented>):

> Avoid generic folder names such as `types`, `components`, `utils`, as well as generic file names
> like `types.ts`, `utils.ts`, or `helpers.ts`. Instead, use names that directly reflect the domain
> they represent.

The layout FSD actually shows is `model/<domain>.ts` — `entities/song/model/song.ts`,
`entities/artist/model/artist.ts`, `entities/song/api/dto.ts`, `pages/delivery/model/delivery.ts`.
**The folder carries the technical category; the filename carries the domain.** That is the exact
inverse of a suffix convention, and there is no `.model.ts`, `.api.ts` or `.ui.ts` anywhere in the
corpus. FSD is explicit that a `types` _segment_ is forbidden:

> Resist the temptation to create a `shared/types` folder, or to add a `types` segment to your
> slices. The category "types" is similar to the category "components" or "hooks" in that it
> describes what the contents are, not what they are for.

**And FSD's rationale is entirely human-facing.** From the tutorial:

> segment names should describe **purpose (the why), not essence (the what)**. Names like
> "components", "hooks", "modals" _should not_ be used because they describe what these files are,
> but don't help to navigate the code inside. This requires people on the team to dig through every
> file in such folders and also keeps unrelated code close, which leads to broad areas of code
> being affected by refactoring and thus makes code review and testing harder.

**NOT FOUND: any glob, wildcard, selector, or tool-selectability argument in the entire FSD
corpus.** Grepping for `glob|wildcard|selector|suffix|\*\*/` returns zero relevant hits.

### 3.2 FSD's own linter is the strongest evidence in this section

**NOT FOUND:** `feature-sliced.design/docs/guides/tech/with-eslint` — **HTTP 404**; the sitemap
lists no ESLint guide. `@feature-sliced/eslint-config` is mentioned **nowhere** in the FSD docs (0
occurrences), and on npm its latest is **0.1.1, published 2024-04-30** — no release in ~2 years 4
months, never reached 1.0. `eslint-plugin-boundaries` is also mentioned **nowhere** (0
occurrences). What FSD actually recommends
(<https://feature-sliced.design/docs/get-started/faq>):

> Yes! We have a linter called Steiger to check your project's architecture and folder generators
> through a CLI or IDEs.

`steiger` 0.6.0, published 2026-07-14. **Of its 21 rules, five exist solely to police ambiguities
that arise because the selector is a folder name.** `fsd/no-reserved-folder-names`
(<https://github.com/feature-sliced/steiger/blob/master/packages/steiger-plugin-fsd/src/no-reserved-folder-names/README.md>):

> Forbid subfolders in segments that have the same name as other conventional segments. For
> example, `shared/ui/lib` is a folder inside `shared/ui` that has a name of a conventional segment
> `lib`, which might cause confusion about the segment structure.

> While segment names aren't strictly regulated by Feature-Sliced Design, there is a number of
> conventional segment names that are widely recognized from project to project. **Seeing these
> folder names might lead people to believe that they are looking at a slice, while in reality,
> they are looking at a subfolder of a slice.** To maintain predictable project structure, we
> disallow naming internal folders with conventional segment names.

**That is FSD's own linter stating that a folder name does not tell you what a thing is — you must
know its position in the ancestor chain.** `fsd/ambiguous-slice-names` bans slice names colliding
with Shared-layer segment names. `fsd/typo-in-layer-name` exists because a misspelled folder does
not error, it silently becomes a different thing — its failing example is
`📂 shraed / 📂 fietures / 📂 wigdets / 📂 page` — and its rationale names the second-order cost:

> Enforcing these naming conventions is important for other developers, **as well as for other
> rules of the linter to work correctly.**

`fsd/segments-by-purpose` blocklists **62 folder names**.

**And Steiger is not glob-driven.** It is a bespoke tree-walker; globs appear in its config only
for `ignores`. **FSD's folder convention required a purpose-built tool because it is not
expressible in the glob-based `files`/`overrides` mechanism of a generic linter.** That is the
single most load-bearing fact in §3 for this repo, whose router _is_ a glob mechanism.

### 3.3 The hexagonal folder names have no primary source at all

This is a clean hard null and worth stating in one line: **neither canonical source names a single
folder.**

Cockburn, "Hexagonal architecture the original 2005 article"
(<https://alistair.cockburn.us/hexagonal-architecture/>) — exhaustive word counts over the full
page: `folder` **0**, `directory` **0**, `package` **0**, `domain` **0**, `infrastructure` **0**.
(`application` 75, `adapter` 24, `port` 18.) The Structure section is purely diagrammatic; the
Sample Code section is a three-line discount function.

Robert C. Martin, "The Clean Architecture"
(<https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html>) — `folder` **0**,
`directory` **0**, `package` **0**, `infrastructure` **0**, `domain` **1**. The four circles are
**Entities / Use Cases / Interface Adapters / Frameworks and Drivers** — not
`domain/application/infrastructure` — and:

> No, the circles are schematic. You may find that you need more than just these four. There's no
> rule that says you must always have just these four. However, The Dependency Rule always applies.

The one normative rule is about **dependency direction, not location**:

> The overriding rule that makes this architecture work is The Dependency Rule. This rule says that
> source code dependencies can only point inwards.

**`domain/ application/ infrastructure/` appears in neither primary source. It is a community
materialisation of an abstract diagram, and the two canonical sources use non-matching
vocabularies.** Any ADR that globs on those folder names is globbing on folklore.

### 3.4 The frameworks that _do_ mandate a layout — and they split the axes the other way

**Rails / Zeitwerk is the strongest folder-and-filename contract in the survey, and it is enforced
at load time** (<https://guides.rubyonrails.org/autoloading_and_reloading_constants.html>):

> **In a Rails application file names have to match the constants they define, with directories
> acting as namespaces.**

> **Within an autoload path, file names must match the constants they define as documented here.**

But note the twist, and it is directly relevant:

> We refer to the list of application directories whose contents are to be autoloaded [...] as
> autoload paths. For example, app/models. **Such directories represent the root namespace:
> Object.**

So `app/models/user.rb` defines `User`, **not** `Models::User`. Rails runs _two kinds of folder at
once_: **category folders whose names the contract deliberately erases** (`app/models`,
`app/controllers`) and **namespace folders whose names are load-bearing** (everything nested
below). And when you want a folder that is purely a grouping marker, you need an explicit escape
hatch:

> Store the files that define the hierarchy in a dedicated directory, which makes sense also
> conceptually. **The directory is not meant to represent a namespace, its sole purpose is to group
> the STI:**
>
> ```
> shapes = "#{Rails.root}/app/models/shapes"
> Rails.autoloaders.main.collapse(shapes) # Not a namespace.
> ```

**Every framework that makes folder names load-bearing has had to invent syntax meaning "this
folder is only for grouping — don't count it."** Rails: `collapse()`. Next.js: `_folder` and
`(folder)`. Cargo: `auto* = false`. Three independent instances of the same escape hatch. **A
suffix convention needs no such escape hatch, because a file that lacks the suffix simply isn't
selected.**

**Spring Boot recommends the exact inverse of FSD**
(<https://docs.spring.io/spring-boot/reference/using/structuring-your-code.html>) — note it opens
by disclaiming normativity:

> **Spring Boot does not require any specific code layout to work.** However, there are some best
> practices that help.

```
com/example/myapplication/
    +- customer/
    |   +- Customer.java
    |   +- CustomerController.java
    |   +- CustomerService.java
    |   +- CustomerRepository.java
    +- order/
        +- Order.java
        +- OrderController.java
```

**Folder = domain; filename suffix = technical role.** FSD: folder = technical role; filename =
domain. Two primary sources, the same two axes, opposite assignments. **There is no industry
consensus on which axis goes where** — which means neither choice can be defended by appeal to
practice, only by appeal to what the selector has to do.

Next.js splits them the Spring Boot way (folder = route, exact basename = role: `page`, `layout`,
`route`). Laravel disclaims the question entirely
(<https://laravel.com/docs/structure>):

> **you are free to organize your application however you like. Laravel imposes almost no
> restrictions on where any given class is located - as long as Composer can autoload the class.**

And Angular's current guide bans type folders as well as type suffixes
(<https://angular.dev/style-guide>, "Project structure"):

> **Avoid creating subdirectories based on the type of code that lives in those directories. For
> example, avoid creating directories like `components`, `directives`, and `services`.**

with **no stated rationale**, and no tooling argument.

### 3.5 The asymmetry, established from specs and measured against four implementations

The brief's premise — "`src/**/*.model.ts` selects across all modules regardless of depth, whereas
`src/**/model/**` requires the folder at a predictable position" — is **wrong as stated about
`**`, and right in a deeper way that two specifications state normatively.** Both halves matter.

**Where the premise is wrong.** `**` matches _zero_ or more directories, so an explicit
`src/**/model/**` is depth-independent too. §0.1 measured it; git's spec says it
(_"matches zero or more directories"_); so do bash (_"zero or more directories and
subdirectories"_), VS Code (_"any number of path segments, **including none**"_) and minimatch's
own optimiser notes (_"because `**` matches against an empty path portion"_). Confirmed
independently in `git 2.50.1` (`git check-ignore`), Python 3.9.6 `glob(recursive=True)`,
`minimatch 10.2.6` and `picomatch 4.0.7` — **all four agree on every case.**

**Where the premise is right, and it is normative in two specs.** In the two most precisely
specified path-keyed config formats, **a filename-only pattern is depth-independent by default
while any pattern naming a folder is anchored by default.**

gitignore (<https://git-scm.com/docs/gitignore>):

> If there is a separator at the beginning or middle (or both) of the pattern, then the pattern is
> relative to the directory level of the particular .gitignore file itself. **Otherwise the pattern
> may also match at any level below the .gitignore level.**

EditorConfig (<https://spec.editorconfig.org/>) states the identical rule:

> If the glob contains a path separator (a / not inside square brackets), then the glob is relative
> to the directory level of the particular .editorconfig file itself. **Otherwise the pattern may
> also match at any level below the .editorconfig level.** For example, \*.c matches any file that
> ends with .c in the directory of .editorconfig or any other directory below one that stores this
> .editorconfig. **However, the glob subdir/\*.c only matches files that end with .c in the subdir
> directory**

Measured: `*.model.ts` (no slash) matches `src/a.model.ts` **and** `src/x/y/z/deep.model.ts`;
`src/model/**` matches only the top-level `model/`, **not** `src/a/model/`. **A folder pattern pays
an explicit `**/`-prefix tax that a suffix pattern does not** — and forgetting it is silent.
DeepSource documents a quantified real-world instance (vendor blog, secondary):
FOSSASIA's `*/tests/**` instead of `tests/**` silently misclassified roughly 200 files.

**And `**` is not portable.** POSIX defines only `?`, `*`, `[` — `**` is "one or more asterisk
characters", semantically identical to `*`, so under POSIX **`**` does not cross `/` at all**
(<https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html#tag_18_13> §2.13.1;
grepping the whole chapter for `globstar` returns zero hits). minimatch and picomatch make `**`
special **only as a whole path segment**:

> `**` only has special significance if it is the only thing in a path part. That is, `a/**/b` will
> match `a/x/y/b`, but `a/**b` will not.

> Note that `**` will only match path separators (`/`) when they are the only characters in a path
> segment. Thus, `foo**/bar` is equivalent to `foo*/bar`

EditorConfig's `**` is the _loose_ kind — plainly "any string of characters", so `a**b` is
meaningful there and inert everywhere else. **`**` therefore has at least three distinct
semantics across the path-keyed formats in this document**, and §5.2 records that no agent-rules
system says which one it implements. Bash's `globstar` is also **off by default** and absent
entirely from bash 3.2, which is still macOS's system shell.

**Now the asymmetry that actually holds, in five parts.**

**(1) The suffix selects the file itself; the folder selects an ancestor.** Under a suffix, the
discriminator lives in the last path segment — it travels with the file. `user.model.ts` matches
`**/*.model.ts` wherever it moves. Under a folder, moving `src/model/user.ts` to `src/user.ts`
silently drops it out of `src/**/model/**`. **Glob membership under a folder convention is a
property of location; under a suffix it is a property of the file.** For a _governance_ router this
is decisive: a refactor that relocates a file must not silently change which ADRs govern it.

**(2) The folder over-captures downward, unavoidably.** Measured: `src/**/model/**` matches
`src/model/README.md`. Everything beneath a selected directory is selected, forever, including
files added later by someone who never read the glob. A suffix captures exactly what carries the
suffix.

**(3) The folder pattern is genuinely ambiguous, and one mainstream implementation says so out
loud.** `src/a/model/b/model/c.ts` matches `src/**/model/**` in all four implementations, with no
warning — and **Python's `glob` returns the path twice**, because `**` can derive it by two routes
(`**`→`a`, `model`, `**`→`b/model/c.ts`, or `**`→`a/model/b`, `model`, `**`→`c.ts`). A suffix
pattern has exactly one derivation per path. This is the machine-facing form of the defect
`fsd/no-reserved-folder-names` exists to prevent.

**(4) The suffix's real weakness is suffix stacking, and it is symmetrical in severity.** Measured
in all four implementations: `src/a/b/c/foo.model.test.ts` does **not** match `**/*.model.ts`. It
matches `**/*.model.*` and `**/*.model.test.ts`. So a file _can_ carry two category suffixes —
which is a capability a single parent chain cannot offer — but a naive single-suffix glob then
misses it, silently. Three independent tools have paid for this:
`eslint-plugin-check-file` ships `ignoreMiddleExtensions` for exactly this case (_"you want to lint
the base name of the config and test/spec files—e.g., `babel.config.js` and `date.test.js`"_), and
`check-file` itself strips the final extension before matching (§4.1). ESLint documents the
dotfile edge: _"In the case of .gitignore, the extension is gitignore, so the file matches the
pattern `"**/.gitignore"` but not `"**/*.gitignore"`."_

**(5) Nobody in production picks one. Jest ships both, and the suffix pattern costs extra
syntax.** From the default `testMatch`:

> `[ "**/__tests__/**/*.?([mc])[jt]s?(x)", "**/?(*.)+(spec|test).?([mc])[jt]s?(x)" ]`

The folder half is plain. The suffix half needs the `?(*.)` extglob, precisely so it catches both
`test.js` and `Component.test.js`. **Direct primary evidence that the two conventions require
structurally different globs, that a widely-used tool ships both because the ecosystem uses both,
and that the multi-dot case costs the suffix pattern extra machinery.** Jest also documents the
ordering hazard folder patterns invite: _"`["!**/__fixtures__/**", "**/__tests__/**/*.js"]` will
not exclude `__fixtures__` because the negation is overwritten with the second pattern."_

**And ESLint's own config language is biased toward suffixes.** It _forbids_ folder-shaped
patterns for extension selection — _"Any pattern will work except if it is `*` or if it ends with
`/*` or `/**`"_ — and combining a folder constraint with a suffix constraint needs a dedicated
AND-array form, because one glob string cannot express it cleanly:

> The pattern `["src/*", "**/*.js"]` matches when a file is both inside of the src directory and
> also ends with .js. This approach can be helpful when you're dynamically calculating the value of
> the files array and want to avoid potential errors by trying to combine multiple glob patterns
> into a single string.

Every glob in ESLint's own docs is a suffix pattern. And VS Code notes a folder selector is
**case-fragile across platforms**: _"Windows and macOS: Glob patterns are case-insensitive by
default [...] Linux: Glob patterns are case-sensitive."_

### 3.6 Verdict

**For selecting files with a glob, the suffix convention is more robust — but for one specific
reason, and with one specific cost.**

The reason is _not_ depth-independence; `**` gives both conventions that. It is that **the suffix
puts the selector in the segment the file owns.** Consequences, each evidenced above: membership
survives relocation (§3.5-1), nothing is captured by inheritance (§3.5-2), each match has exactly
one derivation (§3.5-3), no "this folder doesn't count" escape hatch is needed (§3.4), and in
gitignore/EditorConfig semantics the depth-independent form is the _default_ spelling rather than
one requiring a `**/` prefix nobody forgets until they do (3.5).

The cost is **suffix stacking** (§3.5-4): a second dot-suffix silently removes a file from a
single-suffix glob. It is silent, it is the same class of failure as a forgotten `**/`, and it is
the one thing an ADR adopting `.model.ts` must handle explicitly — either by writing
`**/*.model.*`, or by banning stacked suffixes, or by adopting `check-file`'s
`ignoreMiddleExtensions`.

**What the survey does not support** is the claim that this is settled practice. Spring Boot and
FSD assign the two axes in opposite directions; Angular's current guide rejects _both_ type folders
and type suffixes; Rails erases its own category folder names in the constant it derives.

**HARD NULL, and it is the most useful finding in §3: no primary or authoritative source compares
folder-based against suffix-based organisation on glob-selectability grounds.** FSD argues
navigation and refactor blast radius. Next.js lists benefits for `_folder` — none of them
selectability. Angular gives no rationale. Spring Boot and Laravel disclaim normativity. The
argument exists only as _tool behaviour_, in four places, never as prose: Jest ships both patterns
because neither covers the ecosystem; ESLint forbids folder-shaped extension patterns and needed an
AND-array; gitignore and EditorConfig both normatively bias toward depth-independent filename
patterns; and Steiger exists at all, because FSD's folder convention is not expressible in a
glob-based mechanism. **The evidence is abundant and unambiguous; the synthesis is unpublished.**

---

## 4. Enforcing it without authoring a rule

Constraint: an existing plugin or a core-rule _configuration_ is acceptable; a custom ESLint rule
is not. All npm figures below were taken **2026-08-27**; download windows are
`api.npmjs.org/downloads/point/last-week`, i.e. 2026-08-19 → 2026-08-25. Transitive counts are
**production `dependencies` only**, computed by walking registry metadata — counting
`node_modules` entries is invalid here because npm auto-installs the `eslint` peer and inflates
every count to 63–98.

| Package                           | Latest | Published      | Weekly DL | Direct deps | Transitive prod deps | Peer `eslint`     |
| --------------------------------- | ------ | -------------- | --------- | ----------- | -------------------- | ----------------- |
| `eslint-plugin-check-file`        | 3.3.2  | 2026-07-18     | 1,117,955 | 2           | **8**                | `>=9.0.0`         |
| `eslint-plugin-boundaries`        | 7.2.0  | 2026-08-09     | 1,637,811 | 6           | 25                   | `>=6.0.0`         |
| `eslint-plugin-unicorn`           | 73.0.0 | 2026-08-04     | 7,343,184 | 20          | 42                   | `>=10.4`          |
| `eslint-plugin-filenames`         | 1.3.2  | **2018-06-13** | 549,500   | 4           | 4                    | `*`               |
| `eslint-plugin-filenames-simple`  | 0.9.0  | 2023-11-22     | 52,753    | 1           | —                    | `>=7.0.0 <9.0.0`  |
| `eslint-plugin-project-structure` | 3.14.3 | 2026-03-26     | 90,777    | 5           | 30                   | **none declared** |

`check-file`'s whole closure is `braces, fill-range, is-extglob, is-glob, is-number, micromatch,
picomatch, to-regex-range` — the same `picomatch` family issue #1 already priced. `unicorn`
pulls `core-js-compat`, `caniuse-lite` and `electron-to-chromium`; `boundaries` pulls
`handlebars`, and through it `uglify-js` and `source-map`.

### 4.1 `eslint-plugin-check-file` — the direct hit, with one undocumented trap

Rule list, verbatim from the README
(<https://github.com/dukeluo/eslint-plugin-check-file>):

> - [check-file/no-index](docs/rules/no-index.md): A file cannot be named "index"
> - [check-file/filename-blocklist](docs/rules/filename-blocklist.md): Blocklist filenames by pattern
> - [check-file/folder-match-with-fex](docs/rules/folder-match-with-fex.md): Enforce a consistent naming pattern for folder names for specified files
> - [check-file/filename-naming-convention](docs/rules/filename-naming-convention.md): Enforce a consistent naming pattern for filenames for specified files
> - [check-file/folder-naming-convention](docs/rules/folder-naming-convention.md): Enforce a consistent naming pattern for folder names for specified folders

> ## Version Compatibility
>
> Version 3.x and above only support ESLint's flat configuration.

**`filename-naming-convention` is exactly the shape needed: a glob-key → pattern-value map.**
Docs (<https://github.com/dukeluo/eslint-plugin-check-file/blob/main/docs/rules/filename-naming-convention.md>):

> This rule uses the glob match syntax to match target files and declare the naming pattern for
> the filename.
>
> #### naming pattern object
>
> The key is used to select target files, while the value is used to declare the naming pattern
> for the filename. You can specify a different naming pattern for different files. **The plugin
> will only check files you explicitly selected**

> There are six basic naming conventions built into this rule, including `CAMEL_CASE`,
> `PASCAL_CASE`, `SNAKE_CASE`, `KEBAB_CASE`, `SCREAMING_SNAKE_CASE` and `FLAT_CASE`.

> In addition to the built-in naming conventions, you can also set custom naming patterns using
> glob match syntax.

So custom patterns are **micromatch/extglob, not JS regex** — the "Further Reading" links all
point at micromatch.

**The trap, found in the shipped source and then reproduced: the value pattern is matched
against the basename with the final extension stripped.** This is documented nowhere.
`dist/index.js` (v3.3.2) truncates at the last unbracketed `.` (or the first, under
`ignoreMiddleExtensions`) before matching, so for `user.model.ts` the string compared is
**`user.model`**. **[executed]** the "obvious" pattern fails even though micromatch itself
accepts the pair:

```
src/models/user.model.ts
  1:1  error  The filename "user.model.ts" does not match the "+([a-z])*([a-z0-9-]).model.ts" pattern
```

**[executed]** the working config — eslint **v10.9.1**, `eslint-plugin-check-file` **3.3.2**:

```js
import checkFile from 'eslint-plugin-check-file';

export default [
  {
    files: ['src/**/*.ts'],
    plugins: { 'check-file': checkFile },
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        {
          // glob KEY selects folder+ext; VALUE is matched against basename MINUS final extension
          'src/models/**/*.ts': '+([a-z])*([a-z0-9-]).model',
          'src/other/**/*.ts': 'KEBAB_CASE',
        },
      ],
    },
  },
];
```

```
/…/src/models/user.ts
  1:1  error  The filename "user.ts" does not match the "+([a-z])*([a-z0-9-]).model" pattern  check-file/filename-naming-convention
/…/src/models/userProfile.model.ts
  1:1  error  The filename "userProfile.model.ts" does not match the "+([a-z])*([a-z0-9-]).model" pattern  check-file/filename-naming-convention
/…/src/other/BAD_Name.ts
  1:1  error  The filename "BAD_Name.ts" does not match the "KEBAB_CASE" pattern  check-file/filename-naming-convention

✖ 3 problems (3 errors, 0 warnings)
```

`user.model.ts` and `user-profile.model.ts` pass; `user.ts` fails for the missing suffix;
`userProfile.model.ts` fails for the camelCase base — **so a literal suffix and a case style
combine in one pattern**. And `src/unlisted/WHATEVER_weird.name.ts` produced no error at all.

**Limitation, confirmed twice: there is no "error on files matching no rule" option.** The
rule's JSON schema in `dist/index.js` admits exactly two option keys —
`ignoreMiddleExtensions` and `errorMessage`. A catch-all key does **not** act as a fallback: the
rule iterates _every_ matching entry (`for (const [l, c] of Object.entries(o))`), so a broad key
applies _in addition_ to a narrow one rather than being overridden by it.

`ignoreMiddleExtensions` is the plugin's own acknowledgement of the multi-suffix problem §0.1
measured:

> If `true`, the rule will ignore the middle extensions of the filename.
>
> In some cases, you may want to ignore the middle extensions of the filename. For example, you
> want to lint the base name of the config and test/spec files—e.g., `babel.config.js` and
> `date.test.js` … the rule will only validate its base name, in this case the base name will be
> `babel` and `date`.

**`filename-blocklist` operates on the full filename** (unlike the rule above), and its own
docs example is — precisely — the owner's suffix:

> The key is used to declare the blocklisted filename pattern, while the value is used to hint at
> the correct filename that should be used instead. Both the key and value in the blocklist
> pattern object are glob expressions.

```js
'check-file/filename-blocklist': [
  'error',
  { '**/*.model.ts': '*.models.ts', '**/*.util.ts': '*.utils.ts' },
],
```

`folder-naming-convention` takes the same map shape over directories
(`{ 'src/**/': 'CAMEL_CASE', 'mocks/*/': 'KEBAB_CASE' }`) plus an `ignoreWords` array, and
`folder-match-with-fex` inverts it — glob-selects _files_ and constrains their _folder_
(`{ '*.test.{js,jsx,ts,tsx}': '**/__tests__/' }`). **Docs bug:** one example on the
`folder-naming-convention` page wraps the map in an array, contradicting the schema and every
other example on the page. Do not copy that one.

### 4.2 `eslint-plugin-boundaries` — v7 deprecated the rules the brief names

Repo alive (`pushed_at 2026-08-26`), default branch `master`, docs under
`packages/website/docs/`. But **`element-types` and `no-unknown` are no longer the rule names**
(<https://github.com/javierbrea/eslint-plugin-boundaries/blob/master/packages/website/docs/rules/rules.md>):

> `boundaries/element-types` is a deprecated alias for [`boundaries/dependencies`](./dependencies.md).
> It has identical behavior and options. It keeps working without changes; you will see a
> deprecation warning in your console.

> :::note[Renamed rule]
> This rule was previously named `boundaries/no-unknown`. The old name still works but is
> **deprecated** and prints a one-time warning. Update your configuration to
> `boundaries/no-unknown-dependencies`.

Active rules are `dependencies`, `no-unknown-files`, `no-unknown-dependencies`,
`no-ignored-dependencies`. `entry-point`, `external` and `no-private` are all deprecated too.

**`mode: "file" | "folder" | "full"` exists but is deprecated**
(`packages/website/docs/classification/elements/legacy.md`):

> :::warning[Deprecated]
> `mode` is kept for backward compatibility but is deprecated and will be removed in a future
> major version. Element descriptors now always use folder-like matching, and file
> classification use cases are covered by **[file descriptors](../files.md)**.
> :::
>
> - **`folder`** (default): the element is a folder. The pattern is expanded internally
>   (effectively adding `/**/*`), so any file under the matched folder belongs to the element.
> - **`file`**: the element is the file itself, matched right-to-left without the folder
>   expansion.

And the plugin now states the folder/file split as policy
(`classification/elements.md`) — which is, independently, the §3 finding:

> :::tip
> Element patterns should match **folders**, not individual files. Do not include file extensions
> in element patterns. To classify individual files by kind, use [file descriptors](./files.md).
> :::

File descriptors do take a filename glob (`classification/files.md`):

> File descriptors classify each file **on its own**, independently of the architectural element
> it belongs to. They answer the question "what kind of file is this?"

```js
settings: {
  "boundaries/files": [
    { pattern: "**/*.spec.js", category: "test" },
    { pattern: "**/*.css", category: "style" }
  ]
}
```

> A [micromatch pattern](https://github.com/micromatch/micromatch) matched against the file path.
> An array means OR

But note what that buys and what it does not: a file descriptor **assigns a category label**. It
cannot say "files in this folder must be _named_ `*.model.ts`". Naming enforcement is out of
scope for `boundaries`.

**`no-unknown-files` is the one capability nothing else here has**
(`packages/website/docs/rules/no-unknown-files.md`):

> Prevent creating files not recognized by any **element** or **file descriptor** pattern.
>
> This rule reports files that your architecture does not recognize at all. A file is reported as
> an error only when it matches **no file descriptor pattern** and belongs to **no known
> element**. If either check recognizes the file, it is not reported.
>
> This rule has no options.

Default message: `File does not match any file pattern and does not belong to any known element`.
**This is the rule that makes a naming convention exhaustive rather than opt-in** — the exact gap
`check-file` leaves open, and the exact property a _context router_ needs, because a file that
matches no glob loads no governance.

### 4.3 `unicorn/filename-case` — case only. And `eslint-plugin-filenames` is dead.

<https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/filename-case.md>:

> Enforces filenames and directory names of linted files to use a certain case style and
> lowercase file extension. The default is `kebabCase`.

Options are exactly `case`, `cases`, `ignore`, `checkDirectories`, `multipleFileExtensions`.
**Confirmed: there is no suffix option**, and `ignore` is subtractive — it exempts paths, it
never requires anything. Two adoption facts: peer `eslint: ">=10.4"` and `engines.node: ">=22"`.
And a behaviour that would defeat the purpose here — `multipleFileExtensions` defaults to `true`:

> Note that the parts of the filename treated as the extension will not have the filename case
> enforced.

so under the default, `FooBar.testUtils.js` passes `pascalCase`. **Verdict: cannot express
`*.model.ts`. Wrong tool.**

`eslint-plugin-filenames`: **dead.** Its own README
(<https://github.com/selaux/eslint-plugin-filenames>) says so —

> **This project is no longer actively maintained**

Last publish **2018-06-13** (registry `time["1.3.2"]`), over eight years ago. The npm
`deprecated` flag is **not set**, so `npm install` warns you about nothing, and it still pulls
**549,500 downloads/week** on pure inertia. GitHub API: `archived: false`. No declared flat-config
or ESLint 9+ support; its rules predate the ESLint 9 rule-API cleanup. Its rules were
`match-regex`, `match-exported`, `no-index`. The fork `eslint-plugin-filenames-simple` is also a
dead end — peer `eslint: ">=7.0.0 <9.0.0"`, i.e. it **explicitly excludes ESLint 9**.

### 4.4 `eslint-plugin-project-structure` — covers both requirements, with two risks

Not in the brief, and it is the strongest single match. README:

> - Prohibit the use of given selectors in a given file. For example, `**/*.consts.ts` files can
>   only contain variables, `**/*.types.ts` files can only contain interfaces and types.

> - Validation of folder structure. Any files/folders outside the structure will be considered an
>   error.

`file-composition` selectors (wiki):

> Available selectors:
>
> - `class` · `function` · `arrowFunction` · `type` · `interface` · `enum` · `variable` ·
>   `variableExpression` · `propertyDefinition`

> With `allowOnlySpecifiedSelectors`, you can prohibit the use of selectors that you haven't
> explicitly specified for the file.

> ### `filePattern: string | (string | string[])[]`
>
> The outer array checks if any pattern meets the requirements. The inner array checks if all
> patterns meet the requirements. You can use all micromatch functionalities.

**[executed]** eslint **v9.39.5**, plugin **3.14.3**, `typescript-eslint` 8.68.0. A
`src/user.model.ts` holding an interface, a type alias, a const, a function, an enum and a class:

```
/…/src/user.model.ts
  3:14  error  🔥 Exporting 'variable' is prohibited in this file. 🔥  project-structure/file-composition
  4:8   error  🔥 Exporting 'function' is prohibited in this file. 🔥  project-structure/file-composition
  5:8   error  🔥 Exporting 'enum' is prohibited in this file. 🔥      project-structure/file-composition
  6:8   error  🔥 Exporting 'class' is prohibited in this file. 🔥     project-structure/file-composition
```

`clean.model.ts` (interface + type only) clean; `service.ts` outside `filePattern` clean. Gotcha
found on the first run: omitting `format` applies a **default `{camelCase}` name format** to the
allowed selectors, producing surprise naming errors on top of composition errors. Set `format`
explicitly.

`folder-structure`'s `name` is **real regex** with `.` auto-escaped:

> The name is treated as a `regex`. The following improvements are automatically added:
> The name is wrapped in `^$`. All `.` characters … will be converted to `\\.`. All `*`
> characters will be converted to `(([^/]*)+)`.
>
> When used with children this will be the name of `folder`. When used without children this will
> be the name of `file`.

so `{folderName}.types.ts` and `{kebab-case}.model.ts` mean what they look like, and
`{folderName}` inherits the parent directory name. And it is **exhaustive by default** — the
`no-unknown-files` property, without the second plugin.

**Two risks, both from metadata rather than docs.** `peerDependencies` is **`null`** — the
package declares no `eslint` peer at all, so npm can never warn about a version mismatch. And its
last release is **2026-03-26**, five months old: the option with the best coverage is the
stalest of the maintained ones. It also needs its own config block with its own parser
(`files: ["**"]`, `languageOptions: { parser: projectStructureParser }`) and writes a
`projectStructure.cache.json` you must gitignore.

**`eslint-plugin-import` / `-import-x` have no filename rule.** Confirmed by enumerating rule
docs, not from memory: 46 and 47 rules respectively, none of which inspects the linted file's own
name. `no-restricted-paths` restricts import paths between folders; `no-internal-modules`
restricts reaching into module internals. **NOT FOUND** for both.

### 4.5 Core rules, as configuration only — both requirements work

**All of §4.5 is [executed]**, eslint **v10.9.1**, `typescript-eslint` 8.68.0, typescript 6.0.3.

**(a) "No `interface` or `type` alias outside `*.model.ts`".** The docs license it
(<https://eslint.org/docs/latest/rules/no-restricted-syntax>):

> You can also specify [AST selectors](../extend/selectors) to restrict, allowing much more
> precise control over syntax patterns.

> Note: This rule can be used with any language you lint using ESLint. To see what type of nodes
> your code in another language consists of, you can use: [typescript-eslint
> Playground](https://typescript-eslint.io/play) if you're using ESLint with `typescript-eslint`.

That last line is the documented confirmation that core `no-restricted-syntax` is _intended_ to
work against the typescript-eslint AST. **No documented caveat found against it.**

Selectors match any node in the tree regardless of ancestry
(<https://eslint.org/docs/latest/extend/selectors>):

> The simplest selector is just a node type. A node type selector will match all nodes with the
> given type.

with `[attr="foo"]`, `[attr=/foo.*/]`, descendant (`A B`) and child (`A > B`) combinators
available for narrowing.

Node names verified against the ast-spec source, not memory
(<https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/ast-spec/src/declaration/TSInterfaceDeclaration/spec.ts>):

```ts
export interface TSInterfaceDeclaration extends BaseNode {
  type: AST_NODE_TYPES.TSInterfaceDeclaration;
  /** Whether the interface was `declare`d */
  declare: boolean;
```

**`declare` is a boolean flag on the node, not a separate node type** — so the selector is
`TSInterfaceDeclaration[declare=true]`. Enums are `TSEnumDeclaration`; `declare module` is
`TSModuleDeclaration`.

Minimal working flat config:

```js
import tseslint from 'typescript-eslint';

export default [
  { files: ['**/*.ts'], languageOptions: { parser: tseslint.parser } },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.model.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'TSInterfaceDeclaration', message: 'Interfaces may only be declared in *.model.ts' },
        { selector: 'TSTypeAliasDeclaration', message: 'Type aliases may only be declared in *.model.ts' },
        { selector: 'TSEnumDeclaration', message: 'Enums may only be declared in *.model.ts' },
      ],
    },
  },
];
```

Against a fixture holding, in order, `export interface` / `interface` / `export type` / `type` /
`export enum` / `declare interface` / `export const`:

```
/…/src/thing.ts
  1:8  error  Interfaces may only be declared in *.model.ts    no-restricted-syntax
  2:1  error  Interfaces may only be declared in *.model.ts    no-restricted-syntax
  3:8  error  Type aliases may only be declared in *.model.ts  no-restricted-syntax
  4:1  error  Type aliases may only be declared in *.model.ts  no-restricted-syntax
  5:8  error  Enums may only be declared in *.model.ts         no-restricted-syntax
  6:1  error  Interfaces may only be declared in *.model.ts    no-restricted-syntax
```

Read the columns: **col 8 = exported** (the selector matched the inner node past `export `),
**col 1 = local**. **Both are caught by the bare selector**, and `declare interface` (line 6) is
caught too. `src/thing.model.ts` with the same contents produced zero errors — `ignores:`
scoping works. Narrowing verified separately: swapping in
`ExportNamedDeclaration > TSInterfaceDeclaration` matched only line 1, and
`TSInterfaceDeclaration[declare=true]` matched only line 6.

**Answers to the brief's specific questions:** yes, the bare selector catches exported _and_
local; yes, it catches `declare`, via a flag not a node type; enums need their own selector
(`TSEnumDeclaration`) — the interface/type-alias selectors do not imply them. The one thing the
core rule cannot express that `file-composition` can is "at most one of these" / allow-list
semantics: you must enumerate one selector per banned node type, which means a node type you
forget is silently permitted.

**(b) "Files in this folder may not import `node:fs`/`node:child_process`".**
<https://eslint.org/docs/latest/rules/no-restricted-imports> — the scope statement first, in the
docs' own bold:

> This rule allows you to specify imports that you don't want to use in your application.
>
> **It applies to static imports only, not dynamic ones.**

> ### paths
>
> This is an object option whose value is an array containing the names of the modules you want
> to restrict.

> ### patterns
>
> This option allows you to specify multiple modules to restrict using `gitignore`-style patterns
> or regular expressions.
>
> Where `paths` option takes exact import paths, `patterns` option can be used to specify the
> import paths with more flexibility

> Either of the `group` or `regex` properties is required when using the `patterns` option.

`export … from` is explicitly in scope:

> String options also restrict the module from being exported, as in this example:
>
> ```js
> /*eslint no-restricted-imports: ["error", "fs"]*/
> export { fs } from 'fs';
> ```

Minimal working flat config:

```js
import tseslint from 'typescript-eslint';

export default [
  { files: ['**/*.ts'], languageOptions: { parser: tseslint.parser } },
  {
    files: ['src/infra/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'node:fs', message: 'Use the injected FileSystem port instead.' },
            { name: 'node:child_process', message: 'Shelling out is not allowed here.' },
          ],
        },
      ],
    },
  },
];
```

**[executed]** against five forms in one file:

| form                                         | caught? |
| -------------------------------------------- | ------- |
| `import fs from "node:fs"`                   | **yes** |
| `import { spawn } from "node:child_process"` | **yes** |
| `export { readFile } from "node:fs"`         | **yes** |
| `require("node:child_process")`              | **no**  |
| dynamic `import("node:fs")`                  | **no**  |

`src/other/ok.ts` importing `node:fs` produced zero errors — `files:` scoping works.

**Two real gaps, and one countdown.** `require()` and dynamic `import()` are both uncaught. The
CommonJS counterpart `no-restricted-modules` **has not been removed** — it is present in
`builtinRules` in both eslint 9.39.5 and 10.9.1 — but its metadata, read from the running binary
via `eslint/use-at-your-own-risk`, sets a hard expiry:

```json
"deprecated": {
  "message": "Node.js rules were moved out of ESLint core.",
  "deprecatedSince": "7.0.0",
  "availableUntil": "11.0.0",
  "replacedBy": [{ "plugin": { "name": "eslint-plugin-n" },
                   "rule": { "name": "no-restricted-require" } }]
}
```

**Do not build on `no-restricted-modules`.** Also documented, for a TS codebase: `import =
require()` can be restricted wholesale but not by import name.

**Flat-config `files:` semantics, verbatim**
(<https://eslint.org/docs/latest/use/configure/configuration-files>) — and note the glob engine
is **minimatch**, a third dialect alongside git's and EditorConfig's:

> Patterns specified in `files` and `ignores` use [`minimatch`](https://www.npmjs.com/package/minimatch)
> syntax and are evaluated relative to the location of the `eslint.config.js` file.

> #### Cascading Configuration Objects
>
> When more than one configuration object matches a given filename, the configuration objects are
> merged with later objects overriding previous objects when there is a conflict.

> Configuration objects without `files` or `ignores` are automatically applied to any file that is
> matched by any other configuration object.

And a trap if the repo lints anything other than JS:

> By default, ESLint lints files that match the patterns `**/*.js`, `**/*.cjs`, and `**/*.mjs`.
> […] If your configuration object includes other patterns, the rules in configuration objects
> without a `files` key will also apply to these patterns.
>
> Therefore, when using ESLint for non-JS files as well, it is more appropriate to create a
> configuration object that includes `files: ["**/*.js", "**/*.cjs", "**/*.mjs"]` and place the
> relevant rules there.

### 4.6 Verdict

| Requirement                           | `check-file`                | `boundaries`                 | `unicorn`    | `project-structure`          | core rules                        |
| ------------------------------------- | --------------------------- | ---------------------------- | ------------ | ---------------------------- | --------------------------------- |
| Filenames in folder X match pattern P | **yes** (glob)              | no                           | case only    | **yes** (regex)              | no                                |
| Require literal suffix `*.model.ts`   | **yes** (value = `*.model`) | no                           | **no**       | **yes**                      | no                                |
| Different pattern per folder          | **yes**                     | n/a                          | via `files:` | **yes**                      | n/a                               |
| Error on files matching **no** rule   | **no**                      | **yes** (`no-unknown-files`) | no           | **yes** (default)            | no                                |
| Only interfaces/types in `*.model.ts` | no                          | no                           | no           | **yes** (`file-composition`) | **yes** (`no-restricted-syntax`)  |
| Restrict imports per folder           | no                          | yes (`dependencies`)         | no           | yes (`independent-modules`)  | **yes** (`no-restricted-imports`) |
| Transitive prod deps                  | **8**                       | 25                           | 42           | 30                           | **0**                             |

Both requirements the brief names are satisfiable **with zero added dependencies**, using
`no-restricted-syntax` and `no-restricted-imports` under `files:`/`ignores:` overrides —
configuration, not a custom rule, verified by execution. The naming convention itself needs one
plugin: `check-file` at 8 transitive deps if opt-in coverage is acceptable, or
`boundaries`/`project-structure` if the convention must be **exhaustive** — which, for a context
router, it arguably must be, since a file matching no glob loads no governance.

The three load-bearing surprises: **(1)** `check-file/filename-naming-convention` strips the
final extension before matching, undocumented — write `*.model`, not `*.model.ts`. **(2)**
`eslint-plugin-boundaries` v7 deprecated _every_ rule and setting the brief names — only
`no-unknown-files` survives unchanged, and it is the one unique capability. **(3)**
`eslint-plugin-project-structure` declares **no `eslint` peer dependency at all** and last
shipped five months ago, despite being the only plugin covering both requirements.

---

## 5. Prior art: routing documentation into context with path globs

This is the closest analogue to what this repo is doing, and the answer is not "nobody" — it is
"seven independent implementations, converging fast, and they already made most of the design
choices you are about to make". The `.gitignore`/CODEOWNERS/GitLab/`.gitattributes`/EditorConfig
precedence layer is already covered in this repo's `pathrule-precedence.md` §2.1–2.5 and is not
repeated here; §5.3 only records how the _agent-rules_ systems compare against that finding.

### 5.1 The census

| System                | Where                                           | Scope key                                   | Trigger, per its own docs                                                                     |
| --------------------- | ----------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Claude Code rules     | `.claude/rules/*.md`                            | `paths:` (list or braces)                   | "trigger when Claude **reads** files matching the pattern, not on every tool use"             |
| Claude Code skills    | `.claude/skills/*/SKILL.md`                     | `paths:`                                    | "loads the skill automatically only when working with files matching the patterns"            |
| Claude Code CLAUDE.md | any subdirectory                                | _placement_                                 | "included when Claude reads files in those subdirectories"                                    |
| Cursor rules          | `.cursor/rules/*.mdc`                           | `globs:`                                    | "Auto-attached when a matching file is in context."                                           |
| GitHub Copilot        | `.github/instructions/*.instructions.md`        | `applyTo:`                                  | "Glob pattern that defines which files the instructions apply to **automatically**"           |
| Windsurf / Devin      | `.devin/rules/*.md` (legacy `.windsurf/rules/`) | `trigger: glob` + `globs:`                  | "applied when Cascade **reads or edits** a file matching the `globs` pattern"                 |
| AWS Kiro              | `.kiro/steering/*.md`                           | `inclusion: fileMatch` + `fileMatchPattern` | "automatically included only when **working with files** that match the specified pattern"    |
| Continue              | `.continue/rules/*.md`                          | `globs:` (+ `regex:`)                       | "When files are provided as context that match this glob pattern, the rule will be included"  |
| Windsurf AGENTS.md    | any subdirectory                                | _placement, desugared to a glob_            | "Treated as a **glob** rule with an auto-generated pattern of `<directory>/**`"               |
| Gemini CLI            | `GEMINI.md`, any subdirectory                   | _placement, just-in-time_                   | "When a tool accesses a file or directory, the CLI automatically scans for `GEMINI.md` files" |
| AGENTS.md spec        | any subdirectory                                | _placement_                                 | "Agents automatically read the nearest file in the directory tree"                            |
| Agent Skills spec     | `SKILL.md`                                      | **none** — `description` matching           | "When a task matches a skill's description, the agent reads the full `SKILL.md`"              |

**Claude Code, the mechanism this repo actually uses**
(<https://code.claude.com/docs/en/memory>, "Path-specific rules"):

> Rules can be scoped to specific files using YAML frontmatter with the `paths` field. These
> conditional rules only apply when Claude is working with files matching the specified patterns.

> Rules without a `paths` field are loaded unconditionally and apply to all files. Path-scoped
> rules trigger when Claude reads files matching the pattern, not on every tool use.

> Rules without [`paths` frontmatter](#path-specific-rules) are loaded at launch with the same
> priority as `.claude/CLAUDE.md`.

And the sentence that frames the entire design, from the same page:

> Rules can also be [scoped to specific file paths](#path-specific-rules), so they only load into
> context when Claude works with matching files, **reducing noise and saving context space**.

**Windsurf is the only system that publishes a context-cost model per trigger type**, and it is
worth reproducing because it is the clearest available statement of what a glob buys
(<https://docs.devin.ai/desktop/cascade/memories>, "Activation Modes"):

> Each workspace rule declares an activation mode in its frontmatter via the `trigger` field.
> This controls **when** the rule's content is given to Cascade and **how much context window it
> consumes**

| Mode           | `trigger:` value | Context cost                               |
| -------------- | ---------------- | ------------------------------------------ |
| Always On      | `always_on`      | Every message                              |
| Model Decision | `model_decision` | Description always; full content on demand |
| **Glob**       | `glob`           | **Only when matching files are touched**   |
| Manual         | `manual`         | Only when @mentioned                       |

with the glob row's mechanism stated as: _"Rule is applied when Cascade reads or edits a file
matching the `globs` pattern (e.g. `*.js`, `src/**/*.ts`)."_

**Kiro** (<https://kiro.dev/docs/steering/>) is the same design under different key names:

> Files are automatically included only when working with files that match the specified pattern.

with documented `fileMatchPattern` values including `"*.tsx"`, `"app/api/**/*"`,
`"**/*.test.*"`, `"src/components/**/*"`, and array form `["**/*.ts", "**/*.tsx"]`.

**Copilot** (<https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions>):

> Create one or more `NAME.instructions.md` files, where `NAME` indicates the purpose of the
> instructions. The file name must end with `.instructions.md`.

> At the start of the file, create a frontmatter block containing the `applyTo` keyword. Use glob
> syntax to specify what files or directories the instructions apply to.

> You can specify multiple patterns by separating them with commas.

> Instructions are automatically added to requests that you submit to Copilot.

**Note that Copilot's own rule-file convention is itself a filename suffix contract** —
`*.instructions.md` — which makes it a Tier-2 case in §1's taxonomy. So is
`SKILL.md`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `conftest.py`. **The tools that route by
filename are themselves routed by filename.**

**One finding worth flagging on its own: VS Code's Copilot now reads Claude's rules directory.**
<https://code.visualstudio.com/docs/copilot/customization/custom-instructions>, default
locations table:

> Scope | Default file location
> Workspace | `.github/instructions` folder
> **Workspace (Claude format) | `.claude/rules` folder**
> User profile | `~/.copilot/instructions` or `~/.claude/rules`

configurable via `chat.instructionsFilesLocations`. So a `.claude/rules/` symlink written for
Claude Code is, as of these docs, **also read by VS Code Copilot** — which raises the stakes on
`paths:` vs `applyTo:` dialect differences (§5.2) rather than lowering them.

### 5.2 Glob syntax, and whether matching is segment-aware

**Claude Code** documents the pattern table and, unusually, the _expansion budget_
(<https://code.claude.com/docs/en/memory>):

> | Pattern | Matches |
> | `**/*.ts` | All TypeScript files in any directory |
> | `src/**/*` | All files under `src/` directory |
> | `*.md` | Markdown files in the project root |
> | `src/components/*.tsx` | React components in a specific directory |

> Each brace group multiplies the number of expanded patterns: `src/*.{ts,tsx}` expands to two
> patterns, and `{a,b}/{c,d}/*.{ts,tsx}` to eight. To keep expansion bounded, a rule's whole
> `paths` list shares one budget of 1,000 expanded patterns and 4 MiB, and patterns without braces
> don't count against it.

> Claude Code uses any pattern that would exceed the budget unexpanded, and its literal braces
> match no files.

> Glob syntax treats `[` as the start of a bracket expression such as `[abc]`. A pattern with a
> `[` that can't be read as a bracket expression, such as `photos [2024/**`, is invalid: it matches
> nothing, and the rule's other patterns keep working.

**Both failure modes are silent by design**: an over-budget brace pattern and an invalid bracket
pattern each match _nothing_, and the rule keeps working with its remaining patterns. That is the
§1.4 property 6 hazard, in this repo's own router. Two prior versions were worse — "Before
v2.1.217, a `paths` value with many brace groups stalled or crashed the CLI at startup", and
"Before v2.1.207, one invalid pattern made the Read tool fail for every file the rule was
evaluated against".

**Cursor** publishes the only explicit segment-awareness statement found
(<https://cursor.com/docs/context/rules>):

> | `*` | Any single file name segment |
> | `**` | Any number of directories (recursive) |
> | `*.ts` | All `.ts` files in the root |
> | `**/*.ts` | All `.ts` files in any directory |
> | `src/**` | All files anywhere under `src/` |

Multiple patterns are **comma-separated** (`docs/**/*.md, docs/**/*.mdx`), which is also
Copilot's form (`applyTo: "**/*.ts,**/*.tsx"`) and one of Claude Code's two accepted forms
(skills' `paths` "Accepts a comma-separated string or a YAML list"). Claude Code _rules_ take a
YAML list.

**Copilot** gives examples rather than a table — `"app/models/**/*.rb"`,
`"src/components/**/*.{tsx,jsx}"`, `"**/*.{js,ts}"` — plus:

> `**` or `**/*` - will all match all files in all directories.

and, from VS Code:

> Glob pattern that defines which files the instructions apply to automatically, **relative to the
> workspace root**.

**Hard null on dialects.** **NOT FOUND:** any of these systems names the glob library it uses or
specifies its `**` semantics normatively. Compare against what §0 established: git anchors `**`
to whole segments, EditorConfig's `**` crosses separators, ESLint flat config documents
**minimatch**, and POSIX has no `**` at all. Four dialects are in play in this document alone and
**not one agent-rules system states which it implements**. For a repo whose ADR globs must be
stable across harnesses — and whose `.claude/rules/` directory is now also read by VS Code
Copilot — this is the single largest unresolved risk in §5, and it is not resolvable from
published sources.

### 5.3 Precedence: everybody unions, nobody ranks

Asked "what happens when several rule files match one file", every system answers the same way,
and it is the answer this repo's `pathrule-precedence.md` §3 already argued was the only
well-defined one.

**Nothing computes glob specificity.** No system ranks a narrow pattern over a broad one. What
exists instead is _scope_-tier ordering, applied to the whole set:

- **Claude Code**: "User-level rules are loaded before project rules, giving project rules higher
  priority." Rules without `paths` load "with the same priority as `.claude/CLAUDE.md`". Nested
  `CLAUDE.md` files are concatenated, not overridden: "All discovered files are concatenated into
  context rather than overriding each other. Across the directory tree, content is ordered from
  the filesystem root down to your working directory." **No statement anywhere about two matching
  path-scoped rules** — they union.
- **VS Code / Copilot**: "When multiple types of custom instructions exist, **they are all provided
  to the AI**. Higher-priority instructions take precedence when conflicts occur: 1. Personal
  instructions (user-level, highest priority) 2. Repository instructions 3. Organization
  instructions (lowest priority)". Union plus a three-tier conflict order. GitHub's own repo-level
  page documents **no** combining rule at all — **NOT FOUND**.
- **Cursor**: "Rules are applied in this order: **Team Rules → Project Rules → User Rules**."
- **Windsurf**: "System-level rules are merged with workspace and global rules, providing
  additional context to Cascade **without overriding** user-defined rules."
- **Junie**: "Project-level guidelines always take precedence over global ones when they conflict"
  — plus a deduplication rule that is unique in the survey: "If the global and project guidelines
  have identical content, Junie automatically deduplicates and uses the content only once."
- **Kiro**: **NOT FOUND** — no documented precedence.
- **Continue**: only "Rules files are loaded in lexicographical order, so you can prefix them with
  numbers to control the order" — the one system where **filename order is the precedence
  mechanism**, matching Terraform's `_override.tf` (§1.2) rather than any of its peers.

**The consequence for many small atomic ADRs is favourable and worth stating plainly.** Because
every implementation unions, splitting one ADR into three does not create a precedence problem —
all three load, in scope order, concatenated. The cost of atomising is purely additive tokens, not
resolution ambiguity. The risk is the opposite one: **overlapping globs silently multiply the
loaded set**, and no system reports that it happened.

### 5.4 The documented size budgets — five vendors, and they disagree fivefold

This is the direct answer to the "hard null" question the brief asked, and it is **not** a null.
Five independent sources publish an explicit budget, and one is a specification.

| Source                         | Budget, verbatim                                                                                                                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent Skills spec**          | "**Instructions** (< 5000 tokens recommended): The full `SKILL.md` body is loaded when the skill is activated" · "Keep your main `SKILL.md` under 500 lines."                                                 |
| **Claude Code**                | "**Size**: target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence." · "Claude Code loads a CLAUDE.md file of up to 4 MiB in full and skips a larger file."         |
| **Cursor**                     | "Keep rules under 500 lines" · "Split large rules into multiple, composable rules"                                                                                                                            |
| **GitHub (repo instructions)** | "Instructions must be no longer than 2 pages."                                                                                                                                                                |
| **GitHub (tutorial)**          | "Limit any single instruction file to a maximum of about 1,000 lines. Beyond this, the quality of responses may deteriorate." · "Shorter instruction files are more likely to be fully processed by Copilot." |
| **Windsurf**                   | "Workspace rule files are limited to **12,000 characters** each. The global rules file is limited to **6,000 characters**."                                                                                   |
| **Kiro**                       | "**Keep Files Focused** - One domain per file - API design, testing, or deployment procedures."                                                                                                               |

Three things to draw from that table.

**(a) The spread is real: 200 to 1,000 lines, a factor of five.** Nobody is measuring the same
thing, and none of these numbers is presented with evidence. Claude Code's and GitHub's are stated
as adherence claims ("reduce adherence", "quality of responses may deteriorate") with no data.
Windsurf's are the only _hard_ limits — an actual cap, not advice.

**(b) The Agent Skills spec's 5,000-token figure is the one that lands on this repo's number.**
GEN-001-adr.md **[measured]** is 19,763 bytes / 2,922 words / 151 lines — ≈4,940 tokens by
chars÷4, ≈3,890 by words×1.33. So the repo's ~5K-per-ADR figure is right, and it sits **exactly at
the ceiling a specification recommends for a unit loaded on demand**. It is simultaneously _under_
Claude Code's 200-line target (151 lines) and _over_ Windsurf's 12,000-character cap (19,763) and
over GitHub's "2 pages". A single ADR at this size is portable to Claude Code and Cursor and
**would be rejected outright by Windsurf**.

**(c) Every vendor names the same remedy, and it is the one the owner already wants.** Claude Code:
"If your instructions are growing large, use path-scoped rules so instructions load only when
Claude works with matching files." Cursor: "Split large rules into multiple, composable rules"
and — the sharpest line in the survey — "Reference files instead of copying their contents—this
keeps rules short and prevents them from becoming stale as code changes". Copilot: "For task or
language-specific instructions, use multiple `*.instructions.md` files per topic and apply them
selectively by using the `applyTo` property." Kiro: "One domain per file."

**Many small path-scoped documents is the documented recommendation of four independent vendors.**
That is the strongest available support for the owner's instinct, and it is support for the
_granularity_, not for any particular filename scheme.

Two more numbers, both from Claude Code, both relevant to a governance corpus:

> The [`/doctor`](/docs/en/commands#all-commands) checkup proposes trims for a checked-in
> CLAUDE.md: it cuts content Claude can derive from the codebase, such as directory layouts,
> dependency lists, and architecture overviews, and keeps pitfalls, rationale, and conventions
> that differ from tool defaults.

> Splitting into [`@path` imports](#import-additional-files) helps organization but doesn't reduce
> context, since imported files load at launch.

That second one is a trap this repo can walk into: **`@`-imports are organisation, not routing.**
Only `paths:` reduces cost.

### 5.5 Two designs: glob-declared scope versus placement-derived scope

The survey found a genuine architectural fork, and one vendor documents the bridge between the two
halves.

**Windsurf desugars placement into a glob** (<https://docs.devin.ai/desktop/cascade/agents-md>):

> When you create an `AGENTS.md` file (or `agents.md`), Devin Desktop automatically discovers it
> and feeds it into the same [Rules](/desktop/cascade/memories#rules) engine that powers
> `.devin/rules/` — just with the activation mode inferred from the file's location instead of
> frontmatter:
>
> - **Root directory**: Treated as an **always-on** rule
> - **Subdirectories**: Treated as a **glob** rule with an auto-generated pattern of
>   `<directory>/**` — the content is applied only when Cascade reads or edits files inside that
>   directory.

**That is the exact statement §3 needs**: a folder convention is a glob convention whose pattern
is fixed to `<directory>/**`. It is not a different mechanism; it is a _strictly less expressive
parameterisation_ of the same mechanism. It can say "this subtree" and nothing else — it cannot
say "every `*.model.ts` wherever it lives".

**Gemini CLI reached the same lazy-loading design without any frontmatter at all**
(<https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/gemini-md.md>):

> 3. **Just-in-time (JIT) context files:** **Location:** When a tool accesses a file or directory,
>    the CLI automatically scans for `GEMINI.md` files in that directory and its ancestors up to a
>    trusted root.

**NOT FOUND** in Gemini CLI: any glob or frontmatter scoping. Same for the **AGENTS.md
specification** (<https://agents.md/>), which is placement-only:

> Place another AGENTS.md inside each package. Agents automatically read the nearest file in the
> directory tree, so the closest one takes precedence and every subproject can ship tailored
> instructions.

And for **JetBrains Junie** (<https://junie.jetbrains.com/docs/guidelines-and-memory.html>):
`.junie/AGENTS.md`, `.junie/playbook.md`, `.junie/rules/*.md`, legacy `.junie/guidelines.md` —
**NOT FOUND: no frontmatter scoping fields of any kind are documented, for any of them.** Junie is
the one major agent in this census with _neither_ glob scoping nor documented per-directory
scoping.

**Claude Code documents the trade-off between the two designs directly**, which is the single most
directly applicable paragraph found (<https://code.claude.com/docs/en/large-codebases>,
"Choose between per-directory CLAUDE.md and path-scoped rules"):

> | Approach | File location | Loads when | Use when |
> | Per-directory `CLAUDE.md` | Inside the directory, alongside its code | At launch when started from that directory, or on demand when Claude reads a file there | Directory owners maintain their own conventions; instructions are versioned with the code |
> | Path-scoped rule in `.claude/rules/` | Central `.claude/` at the repo root | When Claude works with a file matching the rule's `paths:` glob | You want all conventions in one place, or **the same rule applies to many scattered paths** |

"The same rule applies to many scattered paths" is the capability a folder convention cannot
provide, stated by the vendor. It is also exactly the ADR case: one architectural decision
governing files that do not share a parent.

**The third design in the census is neither.** The **Agent Skills specification**
(<https://agentskills.io/specification>) has no path key at all — the complete frontmatter is
`name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`. Activation is by
_description matching_:

> 1. **Metadata** (~100 tokens): The `name` and `description` fields are loaded at startup for all skills
> 2. **Instructions** (< 5000 tokens recommended): The full `SKILL.md` body is loaded when the skill is activated
> 3. **Resources** (as needed)

> When a task matches a skill's description, the agent reads the full `SKILL.md` instructions into
> context.

Claude Code adds `paths` **on top of** the spec, and flags it as an extension — its docs note that
"Restricting frontmatter to the spec's six fields avoids the unexpected-key error", and the `paths`
row reads: "Glob patterns that limit when this skill is activated [...] Uses the same format as
path-specific rules." So the deterministic, path-keyed route is a **vendor extension to a
semantic-matching specification**, not the standardised path. Worth knowing before betting the
governance corpus on it.

### 5.6 Measuring the loaded set — this is documented, and the repo should use it

The brief asked whether anyone gives guidance on keeping the loaded set small. Beyond the size
budgets, two documented _measurement_ affordances exist, and they are what turn "keep it small"
into something checkable.

**The `InstructionsLoaded` hook**, from <https://code.claude.com/docs/en/hooks> — note the matcher
vocabulary, which is the exact signal a router needs:

> `InstructionsLoaded` | When a CLAUDE.md or `.claude/rules/*.md` file is loaded into context.
> Fires at session start and when files are lazily loaded during a session

> `InstructionsLoaded` | load reason | `session_start`, `nested_traversal`, **`path_glob_match`**,
> `include`, `compact`

and the memory page's own pointer to it:

> Use the [`InstructionsLoaded` hook](/docs/en/hooks#instructionsloaded) to log exactly which
> instruction files are loaded, when they load, and why. This is useful for debugging path-specific
> rules or lazy-loaded files in subdirectories.

**A `path_glob_match` load reason means the cost of an over-broad `paths:` is directly
measurable** — per session, per rule, per triggering read. Caveat: the hook's full input schema
was **NOT FOUND** on the fetched page (the event sections were truncated), so whether it reports
the _matched path_ alongside the rule path is unverified.

The second affordance is `/context`, cited repeatedly: "To confirm which files actually loaded
into the current session, run `/context`" and "check the list under **Memory files**".

For the analogous skills problem Claude Code documents a telemetry path that generalises:

> To find which skills go unused, enable the OpenTelemetry [logs exporter](/docs/en/monitoring-usage)
> and set `OTEL_LOG_TOOL_DETAILS=1` so skill names are recorded verbatim instead of redacted.

And the failure mode at scale, named:

> - **From the repository root**: root skills, plus skills from every subdirectory Claude touches
>   during the session, which can accumulate into the hundreds

**Windsurf is the only vendor with a hard cap rather than advice** (12,000 / 6,000 characters).
**Correction to a widely-repeated claim:** secondary sources state a _combined_ 12,000-character
budget across all rules with global-first prioritisation on overflow. The current primary doc
states **per-file limits only** — three occurrences, all per-file. **UNVERIFIED / not in the
current docs**; treat the combined-total claim as folklore or as describing an older version.

### 5.7 The one published proposal for glob-routed ADRs — and what it rests on

There is exactly one piece of published prior art proposing precisely this design, and it is a
vendor blog post, not a specification: John Kennedy, "ADRs for Coding Agents: Architectural
Context, Optimized", <https://www.actual.ai/blog/agent-optimized-adrs>, 2026-06-23. Marked here as
**opinion/vendor**, not primary.

> Attach an `applies_to` glob and each ADR activates for the files it governs and nothing else.

> An agent editing a stylesheet has no use for the ADR that governs your database schema, so
> loading it only burns context.

The framing of _why_ classical ADRs need rethinking for agents is the useful part:

> The classic ADR was written for a person who reads a few of them, occasionally. An agent reads
> all of them, every session, under a token budget, and acts on them literally.

**But note what its size guidance rests on.** Its recommendation is:

> keep each context file under about 200 lines, because "longer files consume more context and
> reduce adherence."

That quoted clause is **Anthropic's CLAUDE.md guidance**, cited by the article. So the only
published sizing guidance for glob-routed governance documents traces back to a harness vendor's
guidance about a _different_ document type (an always-loaded CLAUDE.md, not an on-demand rule).
**There is no independent literature on sizing governance documents for glob-triggered loading.**

Archgate's own docs (<https://cli.archgate.dev/concepts/adrs/>) document `files` but not `paths`:

> `files` | string array | No | Glob patterns that scope which files the rules check

> The `files` field is optional. When present, it restricts rule execution to only the files
> matching the given globs.

**NOT FOUND in Archgate's docs:** the `.claude/rules` symlink mechanism, any mention of `paths`,
and any guidance on ADR size, count, or granularity. The closest statement is "With the Claude
Code or Cursor plugin, your AI agent reads the applicable ADRs automatically before every coding
task" — which describes plugin behaviour, not the symlink route GEN-001 §4 actually specifies. The
symlink design is this repo's own invention, and the size question is this repo's own to answer.

---

## 6. Hard nulls — what was searched for and not found

Stated plainly, because each absence is load-bearing.

**On the brief's central question.**

- **No style guide, framework doc, or specification gives glob selectability as the rationale for
  a filename convention.** The rationales given across §1 are compilation model (Go, Rust, TS),
  safety (SvelteKit, Remix), routing (Next.js), and merge semantics (Terraform). The single
  published sentence that gives the glob rationale is Angular's Style 02-02 — _"Type names provide
  pattern matching for any automated tasks"_ — in a guide Angular replaced (§2.4). **There is no
  industry best practice for naming files so glob routing works. There is a well-attested practice
  of making filenames load-bearing for a tool, which is a different and narrower thing.**
- **No published source compares folder-based against suffix-based organisation on
  glob-selectability grounds** (§3.6). Searched: FSD's full 8,528-line corpus, Next.js project
  structure, Angular's current and legacy style guides, Spring Boot, Laravel, Rails. All argue
  human navigation, or disclaim normativity, or give no rationale at all.
- **`domain/ application/ infrastructure/` has no primary source.** Cockburn's page contains zero
  occurrences of `folder`, `directory`, `package`, `domain`, or `infrastructure`; Martin's contains
  zero of the first four and says "the circles are schematic" (§3.3).

**On glob semantics.**

- **No agent-rules system names the glob library it uses or specifies its `**` semantics
  normatively** — not Claude Code, Cursor, Copilot, Windsurf, Kiro, or Continue (§5.2). Meanwhile
  four incompatible dialects are cited in this document: POSIX (no `**` at all), git and
  minimatch/picomatch (`**` special only as a whole segment), EditorConfig (`**` crosses
  separators freely), ESLint (documented as minimatch). **This is the largest unresolved risk in
  the document**, and it is not resolvable from published sources — only by probing.
- **Claude Code's `InstructionsLoaded` hook input schema** was not retrievable from the fetched
  hooks page (event sections truncated). Whether it reports the _matched path_ alongside the rule
  path is **unverified** (§5.6).

**On sizing and scoping documentation for glob-triggered loading.**

This is the question the brief flagged as the likeliest null, and the honest answer is more
interesting than a null. **Guidance exists — five vendors publish an explicit budget — but there
is no independent literature, no evidence behind any of the numbers, and they disagree by a factor
of five** (§5.4). The Agent Skills specification's "< 5000 tokens recommended" is the only figure
from a _specification_ rather than a product doc, and it is the one this repo's ~5K-token ADR sits
exactly on. The single published proposal for glob-routed ADRs (§5.7) sources its own 200-line
recommendation from Anthropic's guidance about _always-loaded_ CLAUDE.md files, not about
on-demand rules — so even the one piece of prior art is citing a number derived for a different
mechanism. **Nobody has written about how large a governance document should be when a glob loads
it. That question is open.**

**On tooling.**

- **`feature-sliced.design/docs/guides/tech/with-eslint`: HTTP 404.** No ESLint guide exists in
  the FSD docs. `@feature-sliced/eslint-config` and `eslint-plugin-boundaries` are each mentioned
  **zero** times in the FSD corpus (§3.2).
- **No "error on files matching no rule" option in `eslint-plugin-check-file`** — confirmed from
  the rule's shipped JSON schema, not just the docs (§4.1).
- **`eslint-plugin-import` and `eslint-plugin-import-x` have no filename rule** — confirmed by
  enumerating all 46 and 47 rule docs (§4.4).
- **NestJS has no official file-naming style-guide statement** — confirmed by exhaustive search of
  all 142 markdown files in `nestjs/docs.nestjs.com` (§2.5).
- **No `model` schematic exists in the Angular CLI collection** (§2.4).
- **Junie documents no glob or frontmatter scoping of any kind**, for any of its four guideline
  file forms (§5.5).
- **Kiro documents no precedence rule** for multiple matching steering files (§5.3).
- **GitHub's repo-instructions page documents no combining or precedence rule** for multiple
  matching `.instructions.md` files; only VS Code's page does (§5.3).
- **NOT FOUND: any statement that Next.js `route.js` and `page.js` conflict in the same segment.**
  Widely repeated; not on the `route` page. Do not assert it.
- **`.server`/`.client` is not a Vite convention** — zero matches across Vite's `features`, `ssr`,
  `backend-integration` and `api-environment` docs (§1.2).
- **Windsurf's "combined 12,000-character total with global-first prioritisation"** is not in the
  current primary doc, which states per-file limits only in all three places it mentions them.
  **UNVERIFIED / folklore or stale** (§5.6).
- **Archgate's own docs** document `files` but never `paths`, never the `.claude/rules` symlink,
  and give no guidance on ADR size, count, or granularity (§5.7).

**Stale URLs and doc bugs found, so nobody re-derives them.**

| what                                                                                    | correction                                                                                                                                     |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `vitest.dev/config/#include`                                                            | Content moved; cite `vitest.dev/config/include`                                                                                                |
| `pkg.go.dev/go/build#hdr-Build_Constraints`                                             | Now a pointer; rules live at `pkg.go.dev/cmd/go#hdr-Build_constraints`. Anchor casing differs between the pages                                |
| `remix.run/docs/en/main/discussion/server-vs-client`                                    | 302s cross-host to `v2.remix.run/...`; v2 doc sources are on branch `main-prev`                                                                |
| `angular.io/guide/styleguide`                                                           | Redirects to `v17.angular.io/guide/styleguide`; the bare URL now serves a JS shell                                                             |
| Angular CLI `service`/`directive`/`pipe`/`guard`/`interface` schema `name` descriptions | **Stale** — still say `my-service.service.ts` while `type` has no default. Cite the schema's `type` property and the template filename instead |
| `eslint-plugin-check-file` `folder-naming-convention` docs                              | One example wraps the map in an array, contradicting the schema and every other example. Do not copy it                                        |
| `eslint-plugin-boundaries` docs                                                         | Moved to `packages/website/docs/`; default branch is `master`, not `main`                                                                      |
| Next.js `pageExtensions` page                                                           | Frontmatter description says "Pages Router" though the page lives under `/docs/app/`                                                           |

---

## 7. What this licenses, and what it does not

### Licensed — this is adoption, not invention

**A closed, enumerated list of load-bearing filename suffixes, declared in configuration.** NestJS
ships exactly this: `dtoFileNameSuffix`, `typeFileNameSuffix`, `controllerFileNameSuffix`, each
with a documented default list and bolded **must have** language (§2.5). Angular ships the same
shape one level up, as `fileNameStyleGuide: "2016" | "2025"` writing `type` and `typeSeparator`
defaults into `angular.json` (§2.3). **A project-local, tool-read naming convention is precedented
and routine — it does not need to be anybody's global best practice.**

**Suffix over folder, as the primary selector.** §3.6 states the reason: the selector lives in the
segment the file owns. Three frameworks needed a "this folder doesn't count" escape hatch; a suffix
convention needs none.

**Many small path-scoped documents.** Four independent vendors name this as the remedy for context
cost, in their own words (§5.4): Claude Code ("use path-scoped rules so instructions load only
when Claude works with matching files"), Cursor ("Split large rules into multiple, composable
rules"), Copilot ("use multiple `*.instructions.md` files per topic and apply them selectively"),
Kiro ("One domain per file"). **And atomising is safe from a precedence standpoint**: every
implementation surveyed **unions** the matching set, and not one computes glob specificity (§5.3).

**Exhaustiveness as the load-bearing lint, not the naming rule.** §1.4 property 6: violating a
filename contract is almost always **silent**. For a context router the specific silence is that a
file matching no `paths:` glob loads no governance and nothing reports it — a failure mode already
observed in the wild in Claude Code itself (issue #16299: _"28 rules load at session start when
only ~5 should be global"_). The rule that catches it is `boundaries/no-unknown-files` or
`project-structure/folder-structure`'s default exhaustiveness, **not**
`check-file/filename-naming-convention`, which by design "will only check files you explicitly
selected" (§4.1, §4.6).

**Zero-dependency enforcement of the two constraints named.** `no-restricted-syntax` and
`no-restricted-imports` under `files:` overrides, verified by execution (§4.5).

**Measuring the loaded set rather than guessing.** `InstructionsLoaded` with matcher
`path_glob_match` is documented and exists for exactly this (§5.6). This repo has an
adherence-to-its-own-tenets reason to use it: the size budgets in §5.4 are all
evidence-free assertions, and the repo's own memory note says to measure before keeping a
performance-motivated constraint.

**Banning ambiguity outright rather than resolving it.** kustomize ("may not contain more than one
match to this list"), Rust ("not allowed to have both `util.rs` and `util/mod.rs`"), Jest ("you
cannot specify both options"). Three tools chose a ban over a precedence rule — consistent with
this repo's existing `pathrule-precedence.md` conclusion that glob specificity is not
well-defined.

### Not licensed

**Citing Angular for `.model.ts`.** It was never in either official list, and the guide that
listed suffixes at all was reversed in v20 (§2.4). Cite **NestJS's GraphQL CLI plugin** instead —
there `.model.ts` is a documented, defaulted **must have** (§2.5).

**Citing FSD for a suffix convention.** FSD uses `model/<domain>.ts`, has no filename suffix
convention, and its own linter is a bespoke tree-walker precisely because its convention is not
glob-expressible (§3.1–3.2).

**Asserting that a naming convention exists "because globs need it".** Nobody published that
argument. It is a sound argument — §3.5 assembles the primary evidence for it — but assembling it
is this repo's contribution, and an ADR should say so rather than appeal to a consensus that
does not exist.

**Assuming one glob dialect.** `**` has at least three semantics across the formats cited here,
Claude Code's matcher is unspecified, and `.claude/rules/` is now also read by VS Code Copilot
under a different key (`applyTo:`) with its own unspecified dialect (§5.1, §5.2). Any `paths:`
value this repo commits to should be pinned by a fixture corpus, per tenet 4 — not reasoned about.

**Treating a suffix as safe against stacking.** `**/*.model.ts` does not match
`user.model.test.ts`, in all four implementations tested (§3.5-4). An ADR adopting `.model.ts`
must decide explicitly: write `**/*.model.*`, ban stacked suffixes, or configure
`ignoreMiddleExtensions`.

**Using `@`-imports to reduce cost.** Claude Code is explicit: _"Splitting into `@path` imports
helps organization but doesn't reduce context, since imported files load at launch."_ Only
`paths:` routes (§5.4).

### The one number worth carrying forward

**[measured]** `GEN-001-adr.md` is 19,763 bytes / 2,922 words / **151 lines** — ≈4,940 tokens at
chars÷4, ≈3,890 at words×1.33. The requester's ~5K-per-ADR figure is confirmed. Against the
published budgets (§5.4) it is: **under** Claude Code's 200-line target, **at** the Agent Skills
spec's 5,000-token recommendation for an on-demand-loaded body, **under** Cursor's 500-line
ceiling, **over** GitHub's "2 pages", and **over** Windsurf's 12,000-character hard cap by 65%.

So a single ADR at this size is portable to Claude Code and Cursor and **would be rejected
outright by Windsurf**. If cross-harness portability is a goal, **12,000 characters is the binding
constraint**, not any of the line counts — and it is the only _hard_ limit anyone publishes.

---

## Sources and versions probed

Probed 2026-08-27. npm figures from `registry.npmjs.org` and
`api.npmjs.org/downloads/point/last-week` (window 2026-08-19 → 2026-08-25).

**Executed against real binaries:** Node **v26.5.0** (`path.matchesGlob`, §0.1) · ESLint
**v10.9.1** with `typescript-eslint` **8.68.0** and typescript **6.0.3** (§4.5, §4.1) · ESLint
**v9.39.5** with `eslint-plugin-project-structure` **3.14.3** (§4.4) ·
`eslint-plugin-check-file` **3.3.2** (§4.1) · `git` **2.50.1** (`check-ignore`), Python **3.9.6**
`glob(recursive=True)`, `minimatch` **10.2.6**, `picomatch` **4.0.7** (§3.5) · bash **3.2.57**
(macOS system shell, no `globstar`).

**Specifications:** POSIX Shell & Utilities §2.13 Pattern Matching Notation · `gitignore(5)` ·
EditorConfig Specification · Agent Skills Specification (agentskills.io) · AGENTS.md (agents.md).

**Docs versions where stamped:** Angular style guide `Built by Angular at v22.1.4+sha-8983809`
(also verified at v20 and v21) · Angular CLI `main` plus tag `17.3.x` for the diff · Next.js docs
`version: 16.3.3` · Terraform docs v1.16.x · Vitest / Jest / Storybook / Vite / SvelteKit /
React Router / Cargo / Rust Reference / Go `cmd/go` all from current `main`/`master` doc sources ·
Claude Code docs at code.claude.com (behaviour notes reference v2.1.198 through v2.1.234) ·
Windsurf/Devin docs at docs.devin.ai (docs.windsurf.com 308s there).

**Primary sources by section.** §0/§3.5 glob semantics: opengroup.org, git-scm.com,
gnu.org/software/bash, spec.editorconfig.org, github.com/isaacs/minimatch,
github.com/micromatch/picomatch, eslint.org, code.visualstudio.com. §1: nextjs.org,
reactrouter.com, v2.remix.run, svelte.dev, typescriptlang.org, vitest.dev, jestjs.io, nodejs.org,
storybook.js.org, pkg.go.dev, doc.rust-lang.org, developer.hashicorp.com, docs.pytest.org,
docs.docker.com, gnu.org/software/make, docs.github.com, kubectl.docs.kubernetes.io, vite.dev.
§2: angular.dev, v17.angular.io, github.com/angular/angular (discussion #58412, PR #60809),
github.com/angular/angular-cli (schema JSON, CHANGELOG, commits `23fc8e1e1` `bc0f07b48`
`4e6c94f21`, issue #30566), docs.nestjs.com, github.com/nestjs/schematics,
github.com/nestjs/typescript-starter, google.github.io/styleguide/tsguide.html,
github.com/airbnb/javascript. §3: feature-sliced.design (incl. `llms-full.txt`),
github.com/feature-sliced/steiger, alistair.cockburn.us, blog.cleancoder.com,
guides.rubyonrails.org, docs.spring.io, laravel.com/docs. §4: github.com/dukeluo,
github.com/javierbrea, github.com/sindresorhus/eslint-plugin-unicorn,
github.com/selaux/eslint-plugin-filenames, github.com/Igorkowalski94, eslint.org,
typescript-eslint.io, github.com/typescript-eslint (ast-spec). §5: code.claude.com,
cursor.com/docs, docs.github.com/copilot, code.visualstudio.com, docs.devin.ai,
kiro.dev/docs/steering, docs.continue.dev, junie.jetbrains.com,
github.com/google-gemini/gemini-cli, agents.md, agentskills.io, cli.archgate.dev,
github.com/anthropics/claude-code issues #16299 and #21858.

**Secondary / opinion sources, flagged as such where cited:**
actual.ai/blog/agent-optimized-adrs (vendor blog, §5.7); deepsource.com/blog/glob-file-patterns
(vendor blog, §3.5).

**Cross-references inside this repo:** `docs/research/pathrule-precedence.md` §2.1–2.5 (gitignore,
CODEOWNERS, GitLab, gitattributes, EditorConfig precedence — not duplicated here) and §3 (glob
specificity is not well-defined); `docs/research/frontmatter-key-order.md` (frontmatter key
order); issue #1 §G (`path.matchesGlob` is segment-aware, measured; dependency budgets);
`.archgate/adrs/GEN-001-adr.md` §4 (the symlink loading contract).
