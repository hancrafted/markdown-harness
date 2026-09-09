# Does an Internal `__` in a Filename Survive the Consumption Path?

Research question, for ticket #72 (part of map #63): the config language reserves `__` as a
non-configurable delimiter inside file and folder names — `<category>__<slug>.md`, e.g.
`aikb__llm-wiki.md`. Tenet 2 keeps the harness off the consumption path: the signal has to
survive in the raw filename, read by whatever a human or another tool points at the repo, with
nothing installed. Four sub-questions, all primary-source:

1. Static site generators exclude `_`-prefixed files/directories from routing. Does an
   **internal** `__` trigger the same exclusion? Astro/Starlight is the concrete case —
   `docs/research/starlight-and-stack.md` names it directly.
2. If the filename becomes a URL slug, what happens to `__`? Normalisation, collapsing,
   encoding?
3. Obsidian, VS Code, and GitHub's own markdown rendering and file search — any special
   treatment of a doubled underscore in a **filename**? (`__text__` is bold in markdown **body**
   text; does any tool apply that rule to a filename inside a link or heading?)
4. Any filesystem-tooling limit that makes `__` worse than `-` or `.`?

Probed 2026-09-09. Every claim is quoted or read from an official doc, spec text, or shipped
source, with the file/line or section cited. Every finding is tagged **normative** (the spec or
shipped code enforces it) or **conventional** (a UX default, a habit, or a configurable setting).
Claims marked **[executed]** were reproduced against a real binary/library on this machine; the
version is given alongside the command.

---

## Direct answers

**Q1 — No. Every exclusion rule found is anchored to the first character of a path segment, and
none of the four generators contain a substring/"contains `_`" check anywhere.** Astro has two
independent underscore checks — one for the pages router, one for content collections (the
mechanism Starlight's docs sit on) — and both read `part.startsWith('_')` per path segment
(`isPublicRoute`, `packages/astro/src/core/util.ts`; `hasUnderscoreBelowContentDirectoryPath`,
`packages/astro/src/content/utils.ts`). Jekyll's is `SPECIAL_LEADING_CHAR_REGEX = %r!\A#{Regexp.union([".", "_", "#", "~"])}!o`
(`lib/jekyll/entry_filter.rb`) — the `\A` anchor is "start of string." Docusaurus's
`GlobExcludeDefault` (`packages/docusaurus-utils/src/globUtils.ts`) is
`['**/_*.{js,jsx,ts,tsx,md,mdx}', '**/_*/**', '**/*.test.{js,jsx,ts,tsx}', '**/__tests__/**']` —
every underscore-related glob requires the `_` to sit immediately after the last `/`. MkDocs
ships **no** underscore rule at all by default; its only implicit `exclude_docs` entries are
`.*` and `/templates/`. `aikb__llm-wiki.md` starts with `a`, so none of the four fire. **Tag:
normative** (each is the actual enforcement code/regex, read from the shipped source — not
independently executed against a running site build). See §1.

**Q2 — For the concrete case (Astro/Starlight), the underscore survives verbatim through the
exact library Astro uses to build the default slug — verified by running it.** When frontmatter
doesn't set `slug`, `getContentEntryIdAndSlug` (`packages/astro/src/content/utils.ts`) maps each
path segment through `github-slugger`'s `slug()` function. **[executed]**, `github-slugger@2.0.0`:
`slug('aikb__llm-wiki')` → `'aikb__llm-wiki'` — untouched. Its strip-regex has a one-character
gap at `_` (0x5F) between the ranges it removes on either side; only lowercasing and
space-to-hyphen replacement happen otherwise. MkDocs and Docusaurus don't run any transform on
the filename stem at all by default (MkDocs: "the stem preserved as-is" per its own docs;
Docusaurus: default doc id is the literal filename minus extension and an optional numeric
prefix). At the URI-syntax level, RFC 3986 §2.3 classifies `_` as **unreserved**
(`unreserved = ALPHA / DIGIT / "-" / "." / "_" / "~"`), so a doubled unreserved character is
still just two unreserved characters — nothing here percent-encodes or collapses it. **Tag:
normative** (RFC + shipped-source facts), **[executed]** for the github-slugger reproduction.
See §2.

**Q3 — No special treatment found anywhere, and CommonMark's own emphasis rules make the
"looks like bold" worry structurally impossible for this exact naming shape.** A `__` run that
is flanked by an alphanumeric character on *both* sides — exactly what `<category>__<slug>`
always produces, since category and slug are non-empty kebab-case tokens — fails CommonMark
Rules 6 and 8 (`spec.commonmark.org/0.31.2/#emphasis-and-strong-emphasis`): it can neither open
nor close strong emphasis. **[executed]** against `commonmark@0.31.2` (the JS reference
implementation): `aikb__llm-wiki.md` in a bare paragraph, in an ATX heading, repeated twice in
one paragraph, inside a link destination, and inside a code span all render with **zero**
`<strong>`/`<em>` tags. GFM's own spec (v0.29, `github/cmark-gfm:test/spec.txt`) carries the
identical rules 5–8 wording — this is GitHub's actual rendering engine, not an inference from
"GFM resembles CommonMark." The one real trap is a *leading* dunder like `__init__.py`
(underscore run flanked by whitespace, not a letter, on the outer side) — **[executed]**: that
one *does* render as `<strong>init</strong>.py` — but the harness's convention never produces
that shape, because the delimiter always sits strictly inside a longer name. Obsidian's official
docs (`obsidianmd/obsidian-help`) list exactly seven invalid link characters/sequences — `#`,
`|`, `^`, `:`, `%%`, `[[`, `]]` — `_` is not among them, and note titles render as plain UI text,
not markdown, so emphasis parsing doesn't apply there at all (**normative**, doc-sourced, not
executed against the app). VS Code's Quick Open fuzzy scorer (`scoreSeparatorAtPos`,
`src/vs/base/common/fuzzyScorer.ts`) gives `_` and `-` the identical match-bonus weight (both 4,
one tier below `/`/`\`) — underscore is not treated worse than hyphen there (**conventional** —
UX ranking, not correctness). GitHub's file-tree browser never runs a filename through the
markdown renderer at all — the GFM spec scopes itself to "the main documents (issues, PRs,
comments)" — and GitHub's code-search "ignored/wildcard" character list
(`. , : ; / \ \` ' " = * ! ? # $ & + ^ | ~ < > ( ) { } [ ] @`) does not include `_`, so a doubled
underscore stays literal and searchable in a query (**normative** for the ignored-character
list; **conventional** for the additional claim, from a GitHub engineering blog post rather than
current product docs, that identifiers also get indexed split on snake_case boundaries). See §3.

**Q4 — Nothing found makes `__` worse than `-` or `.`; if anything, it is provably safer than a
leading `-`.** POSIX's Portable Filename Character Set (`pubs.opengroup.org` Base Definitions
§3.282) is exactly 65 characters: `A–Z a–z 0–9 . _ -`. Underscore carries **zero** positional
restriction anywhere in the standard. Hyphen carries exactly **one** — a portable filename
"shall not begin with a hyphen-minus" (§3.281/§4.7, because a leading `-` reads as a CLI option).
So `__`, which never appears first in `<category>__<slug>`, is on POSIX's own terms at least as
portable as `-` or `.` used anywhere but first, and strictly more portable than a leading hyphen
would be. No filesystem (ext4, APFS, NTFS) reserves the two-character sequence `__`; the only
"doubled small punctuation is dangerous" case in common tooling is `..` as an entire path
**component** (parent-directory), which doesn't apply — `__` sits inside a longer name, never as
the whole component. **This is a genuine "nothing breaks," stated as a measurement** (the
character-set table plus the absence of any exclusion regex across four SSGs' source), not an
assumption. **Tag: normative.** See §4.

---

## §1. Static-site-generator routing exclusions are prefix-anchored, not substring-anchored

### 1.1 Astro / Starlight — two independent underscore checks, both per-segment `startsWith`

Astro's official routing guide states the convention in prose:

> "by prefixing names underscore (`_`). Files [with a] `_` prefix [won't be] recognized [by
> the] router and won't [be] placed into `dist/`"
> — <https://docs.astro.build/en/guides/routing/> ("Excluding pages")

That's the doc. The enforcement is two separate code paths, and both are relevant because
Starlight's docs live in a **content collection**, not the classic pages router.

**Pages router** — `isPublicRoute()`:

```ts
function isPublicRoute(file: URL, config: AstroConfig): boolean {
	// ...normalize to the path under pagesDir/rootDir...
	const parts = normalizedDir.replace(pagesDir.toString(), '').split('/').slice(1);
	for (const part of parts) {
		if (part.startsWith('_')) return false;
	}
	return true;
}
```

— `packages/astro/src/core/util.ts` (`withastro/astro@main`)

**Content collections** (what Starlight's `src/content/docs/` sits on) — `getEntryType()` calls
`hasUnderscoreBelowContentDirectoryPath()`:

```ts
function hasUnderscoreBelowContentDirectoryPath(
	fileUrl: URL,
	contentDir: ContentPaths['contentDir'],
): boolean {
	const parts = fileUrl.pathname.replace(contentDir.pathname, '').split('/');
	for (const part of parts) {
		if (part.startsWith('_')) return true;
	}
	return false;
}
```

— `packages/astro/src/content/utils.ts` (`withastro/astro@main`)

Both split the path into segments and test only `part.startsWith('_')` — the first character of
each segment. Neither ever inspects a character after position 0. A third, unrelated check
exists at the **collection** level — `['_', '.'].includes(collectionName.at(0) ?? '')`
(`content/utils.ts`) — which excludes a top-level collection folder (e.g. `src/content/_drafts/`)
by the same first-character rule; it has nothing to say about files inside a collection.

`aikb__llm-wiki.md` as a path segment is the string `"aikb__llm-wiki.md"`. Its first character
is `a`. None of these three checks fire. I did not spin up an Astro/Starlight build to confirm
the routing output directly (out of scope for the time budget); this is read from the exact
functions that decide the outcome, not inferred from behavior elsewhere.

Starlight's own page-authoring doc (`starlight.astro.build/guides/pages/`) does not restate the
underscore-exclusion rule at all — it inherits it silently from the Astro content-collection
loader above.

### 1.2 Jekyll — anchored regex, applies to full path and basename

```ruby
SPECIAL_LEADING_CHAR_REGEX = %r!\A#{Regexp.union([".", "_", "#", "~"])}!o.freeze
```

— `lib/jekyll/entry_filter.rb` (`jekyll/jekyll@master`)

`\A` in Ruby regex is "absolute start of string" (not multiline-aware `^`). The `special?`
method applies this to both the full relative path and the entry's basename, so a **path
segment** beginning with `.`, `_`, `#`, or `~` is what flags an entry as special/excluded — never
a character appearing later in a segment. Jekyll's structure doc confirms the same rule in
prose: "Every file or directory beginning with the following characters: `.`, `_`, `#` or `~` in
the `source` directory... will not be included in the `destination` folder" —
<https://jekyllrb.com/docs/structure/>. **Tag: normative**, doc + source agree.

### 1.3 Docusaurus — the default exclude globs require `_` right after a `/`

```ts
export const GlobExcludeDefault = [
  '**/_*.{js,jsx,ts,tsx,md,mdx}',
  '**/_*/**',
  '**/*.test.{js,jsx,ts,tsx}',
  '**/__tests__/**',
];
```

— `packages/docusaurus-utils/src/globUtils.ts` (`facebook/docusaurus@main`)

`**/_*.md` matches only when the `_` is the first character after the final `/` — i.e., the
basename's first character. `**/_*/**` is the directory equivalent. `**/__tests__/**` matches a
literal directory named exactly `__tests__` (a whole-segment match against a fixed string, not
"any segment containing `__`"). None of these four patterns match a file whose basename simply
*contains* `__` partway through. **Tag: normative** — this is the actual array the docs/blog/
pages plugins compose their `exclude` option from (`docusaurus-plugin-content-docs/src/options.ts`
references `GlobExcludeDefault`).

### 1.4 MkDocs — no underscore rule exists by default

> "the following are always implicitly prepended [to `exclude_docs`] to exclude dot-files (and
> directories) as well as the top-level `templates` directory":
> ```
> exclude_docs: |
>   .*
>   /templates/
> ```
> — <https://www.mkdocs.org/user-guide/configuration/#exclude_docs>

There is no leading-underscore default anywhere in MkDocs. A project would have to add `_*`
itself. **Tag: normative** (absence of a rule, stated from the doc that would otherwise state
one).

---

## §2. URL slug: verified against the actual library Astro/Starlight call

### 2.1 Astro/Starlight default slug — `github-slugger`, verified not to touch `_`

```ts
export function getContentEntryIdAndSlug({ entry, contentDir, collection }): { id: string; slug: string } {
	const relativePath = getRelativeEntryPath(entry, collection, contentDir);
	const withoutFileExt = relativePath.replace(new RegExp(path.extname(relativePath) + '$'), '');
	const rawSlugSegments = withoutFileExt.split(path.sep);
	const slug = rawSlugSegments
		.map((segment) => githubSlug(segment)) // import { slug as githubSlug } from 'github-slugger'
		.join('/')
		.replace(/\/index$/, '');
	return { id: normalizePath(relativePath), slug };
}
```

— `packages/astro/src/content/utils.ts` (`withastro/astro@main`)

This only runs when frontmatter doesn't set an explicit `slug` (Starlight's own docs:
`slug` "is automatically set based on the custom page's URL" only for the `<StarlightPage />`
component; regular Markdown pages fall through to the function above).

**[executed]**, Node v26.5.0, `github-slugger@2.0.0`:

```
$ node -e "const {slug}=require('github-slugger');
  console.log(slug('aikb__llm-wiki'))"
aikb__llm-wiki
```

Six variants tested (plain, with extension left on, repeated `__`, mixed case, three-way split)
all preserved the double underscore verbatim; only case-folding and space→hyphen replacement
happened. Reading the library's own source explains why: its strip-regex
(`github-slugger/regex.js`) removes long runs of ASCII/Unicode punctuation but has a deliberate
one-character gap at `_` (0x5F), between the range it strips ending at `^` (0x5E) and the range
starting at `` ` `` (0x60). Underscore is the one ASCII punctuation character never in the strip
set, singly or doubled.

### 2.2 MkDocs and Docusaurus — no slugify step on the filename stem at all

MkDocs: "`about.md`" → "`/about/`", "the stem [is] preserved as-is" —
<https://www.mkdocs.org/user-guide/writing-your-docs/#file-layout>. The only slugification MkDocs
documents is for **header** anchors (lowercase, whitespace/disallowed-chars → dash), not
filenames.

Docusaurus: the default doc `id` is the file path relative to the docs folder, with the
extension removed and — only if a numeric prefix like `02-` is present — that prefix parsed off
(`numberPrefixParser`, default on); the `slug` defaults to the `id`. Nothing in this chain
touches non-numeric-prefix characters, so `aikb__llm-wiki.md` → id `aikb__llm-wiki` → URL
`/docs/aikb__llm-wiki` — literal.
(<https://docusaurus.io/docs/create-doc>; `packages/docusaurus-plugin-content-docs/src/sidebars/slug.ts`.)

### 2.3 The URI standard treats `_` as unreserved

> `unreserved  = ALPHA / DIGIT / "-" / "." / "_" / "~"`
> — RFC 3986 §2.3, <https://www.rfc-editor.org/rfc/rfc3986#section-2.3>

Unreserved characters need no percent-encoding, and normalizers are told to decode any
percent-encoded unreserved character back to its plain form. Two unreserved characters in a row
are just two unreserved characters; there is nothing in the URI syntax itself that collapses or
re-encodes a repeated one. **Tag: normative.**

---

## §3. Markdown rendering and file search: the flanking rule, not luck, is what saves this

### 3.1 CommonMark's own rules make an intraword `__` inert for strong emphasis

The spec's introduction states the design goal directly:

> "Many implementations have also restricted intraword emphasis to the `*` forms, to avoid
> unwanted emphasis in words containing internal underscores." (worked example: "no emphasis:
> `foo_bar_baz`")
> — <https://spec.commonmark.org/0.31.2/#emphasis-and-strong-emphasis>

The mechanism is delimiter-run flanking. Rule 6 (opening `__`) and Rule 8 (closing `__`):

> "6. A double `__` can open strong emphasis iff it is part of a left-flanking delimiter run and
> either (a) not part of a right-flanking delimiter run, or (b) part of a right-flanking
> delimiter run preceded by a Unicode punctuation character."
>
> "8. A double `__` can close strong emphasis iff it is part of a right-flanking delimiter run
> and either (a) not part of a left-flanking delimiter run, or (b) part of a left-flanking
> delimiter run followed by a Unicode punctuation character."
> — same section, rules 6 and 8

For `<category>__<slug>` (e.g. `aikb__llm-wiki`), the `__` run is preceded by a letter and
followed by a letter — so it is **simultaneously** left-flanking and right-flanking (the
technical definition of "intraword"). Rule 6's (a) fails (it *is* right-flanking) and (b) fails
(preceded by a letter, not punctuation) — so it cannot open. Rule 8 fails symmetrically — so it
cannot close either. This holds regardless of how many other `__` occurrences sit elsewhere in
the same document; each delimiter run is judged only by its own immediate neighbors.

**[executed]**, `commonmark@0.31.2` (the JS reference implementation cited by the spec's own
test tooling), Node v26.5.0:

| input | rendered HTML | bold/em produced |
|---|---|---|
| `The file aikb__llm-wiki.md holds the content.` | unchanged, literal | no |
| `Compare aikb__llm-wiki.md against help__setup.md for reference.` (two separate `__`) | unchanged, literal | no |
| `# aikb__llm-wiki` (ATX heading) | `<h1>aikb__llm-wiki</h1>` | no |
| `` `aikb__llm-wiki.md` `` (code span) | `<code>aikb__llm-wiki.md</code>` | no |
| `[the wiki page](aikb__llm-wiki.md)` (link destination) | `<a href="aikb__llm-wiki.md">the wiki page</a>` | no |
| `aikb_llm_wiki.md` (single underscore, spec's own `foo_bar_baz` shape) | unchanged, literal | no |
| `See __init__.py for the entry point.` (**leading** dunder — the different shape) | `See <strong>init</strong>.py for the entry point.` | **yes** |

The last row is the real trap, and it is instructive by contrast: `__init__` has its opening `__`
preceded by a **space**, not a letter, so it's left-flanking-only and Rule 6(a) is satisfied —
it opens. This is why people are taught to wrap `__init__.py`-shaped names in backticks. The
harness's `<category>__<slug>` convention never produces that shape, because the delimiter is
defined to sit strictly between two non-empty tokens — it is always doubly flanked, never singly.

### 3.2 GFM inherits the identical rule — this is GitHub's actual renderer, not an analogy

> "5. A double `**` can open strong emphasis... 6. A double `__` can open strong emphasis iff...
> preceded by punctuation." (identical wording to CommonMark, rules 5–8)
> — `github/cmark-gfm:test/spec.txt` (GFM spec v0.29, dated 2019-04-06), the source behind
> <https://github.github.com/gfm/#emphasis-and-strong-emphasis>

GFM's table of contents marks genuine extensions explicitly (tables, strikethrough, task lists,
autolinks); "Emphasis and strong emphasis" carries no such marker — it is inherited unchanged
from CommonMark, and the rule text confirms it word-for-word rather than by inference from the
table of contents alone. `cmark-gfm` is the C library GitHub compiles into its actual markdown
rendering path, so §3.1's conclusion transfers directly to GitHub-rendered issues, PRs, and
READMEs. **Tag: normative.**

### 3.3 Obsidian — no underscore rule; titles aren't markdown-parsed at all

> A link target may not work if it contains: `#`, `|`, `^`, `:`, `%%`, `[[`, `]]`.
> — <https://obsidian.md/help/How+to/Internal+link> (obsidianmd/obsidian-help)

`_` is not on that list, singly or doubled. There is no other Obsidian doc found stating any
underscore-specific filename behavior. Note titles and the file explorer render the filename as
plain UI text — they are not passed through Obsidian's markdown pipeline — so the emphasis
question in §3.1 doesn't even arise for a note's *own* title; it would only apply if the
filename were typed as bare inline text inside another note's body, where §3.1's conclusion
already covers it. **Tag: normative** for the invalid-character list (doc-sourced); not executed
against the Obsidian app itself (unavailable in this environment).

### 3.4 VS Code — underscore and hyphen score identically in fuzzy filename matching

```ts
function scoreSeparatorAtPos(charCode: number): number {
	switch (charCode) {
		case CharCode.Slash:
		case CharCode.Backslash:
			return 5; // prefer path separators...
		case CharCode.Underline:
		case CharCode.Dash:
		case CharCode.Period:
		case CharCode.Space:
		case CharCode.SingleQuote:
		case CharCode.DoubleQuote:
		case CharCode.Colon:
			return 4; // ...over other separators
		default:
			return 0;
	}
}
```

— `src/vs/base/common/fuzzyScorer.ts` (`microsoft/vscode@main`)

This is Quick Open's ("Go to File") match-bonus scorer. `CharCode.Underline` (`_`) and
`CharCode.Dash` (`-`) sit in the exact same tier — underscore is not penalized relative to
hyphen anywhere in this function. **Tag: conventional** — a ranking heuristic that affects fuzzy
match ordering, not a correctness or visibility rule; nothing here excludes or mis-renders a
file.

### 3.5 GitHub — file-tree browsing and code search both treat `_` as ordinary

GitHub's repository file-tree view lists filenames as plain UI text; the GFM spec scopes its own
applicability to "the main documents (issues, PRs, comments)" — tree-view filenames are outside
that scope, consistent with §3.1–3.2's mechanism never being invoked there. (Read from the GFM
spec's stated scope; not independently executed against github.com's rendering pipeline.)

For code/file search, the current official docs state the search's own restriction directly:

> Characters ignored by the search: `` . , : ; / \ ` ' " = * ! ? # $ & + ^ | ~ < > ( ) { } [ ] @ ``
> — <https://docs.github.com/en/search-github/searching-on-github/searching-code>

`_` is absent from that list — a doubled underscore survives as a literal, matchable character
in a `filename:`/`path:` query. **Tag: normative** for the ignored-character list. Separately, a
GitHub engineering blog post on the code-search indexer describes splitting identifiers on
camelCase/snake_case boundaries into additional sub-tokens alongside the whole identifier (e.g.
`pthread_getname_np` indexes as `pthread_getname_np`, `pthread`, `getname`, `np`) — if that
still holds for the current backend, `aikb__llm-wiki` would be searchable both whole and by its
parts. **Tag: conventional** — sourced from an engineering blog post about indexing internals,
not the current product's documented contract, so treated as a plausible-but-unconfirmed
implementation detail rather than a guarantee.

---

## §4. Filesystem and standards-level limits: `__` has no restriction `-` doesn't already carry more of

> "[The] portable filename character set... consist[s] of the following characters... [26
> uppercase] [26 lowercase] [10 digits] and the `<period>`, `<underscore>`, and `<hyphen-minus>`
> characters."
> — IEEE Std 1003.1 / The Open Group Base Specifications, §3.282 "Portable Filename Character
> Set", <https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap03.html>

That is the entire set: 65 characters, no repetition rule, no adjacency rule. The **one**
positional restriction anywhere in this area of the standard is about the hyphen, not the
underscore:

> A portable filename should not begin with a `<hyphen-minus>` character, since this may cause
> problems when filenames are passed as command-line arguments (§3.281 note; restated
> normatively in §4.7 "Filename Portability").

`<category>__<slug>` never places `__` first — `<category>` is a non-empty token — so this
restriction is structurally inapplicable to begin with, and underscore wouldn't be subject to it
even if it could occur first. On POSIX's own terms, `__` used mid-name is therefore **exactly as
portable** as `.` or `-` used anywhere but first, and **more** portable than a leading `-` would
be. No mainstream filesystem (ext4, APFS, NTFS/Windows) reserves the two-character sequence
`__`; Windows' reserved-name list (`CON`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`) is a small closed
set of whole basenames, unrelated to underscore repetition. The only "doubled small punctuation
is dangerous" case found anywhere in this survey is `..` as an entire path **component**
(parent-directory reference) — which is a whole-component match, not a substring match, and so
doesn't apply to `__` sitting inside a longer name either. **Tag: normative** — this is measured
directly off the standard's character-set table plus the specific normative hyphen restriction,
not reasoned from general impression.

---

## Scope notes

- No Astro or Starlight site was actually built during this research; §1.1 and §2.1's
  conclusions are read from the exact functions that decide the outcome (shipped source), and
  §2.1's slug claim is additionally verified by executing the actual library those functions
  call. Building a full Starlight site to observe the final route table was judged unnecessary
  given the source is unambiguous and directly cited.
- Obsidian and GitHub's web rendering pipeline were not independently executable in this
  environment; those findings are doc-sourced (§3.3) or inferred from the GFM spec's own stated
  scope (§3.5), and are flagged as such rather than presented as executed.
- Jekyll and MkDocs were read from source/docs only, not built; both citations are to the exact
  regex or exclude-list source, which is the load-bearing artifact either way.
