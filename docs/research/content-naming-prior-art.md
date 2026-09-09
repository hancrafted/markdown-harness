# Content File Naming: What Prior Art Actually Enforces

Research question, for issue [#71](https://github.com/hancrafted/markdown-harness/issues/71),
child of map [#63](https://github.com/hancrafted/markdown-harness/issues/63): map #63 is charting
a `folders-and-files` config Module whose worked example governs content files with a
`<category>__<slug>` shape — a reserved, doubled `__` delimiter, structured per-segment violation
codes (`VALUE_NOT_ALLOWED`, `FORMAT_MISMATCH`, …) rather than a raw regex, and a decision to report
on the folder segment and the file segment as distinct fields. `docs/research/file-naming-for-glob-routing.md`
already surveyed the **source-code** side of file naming (Go's `_test.go`, TypeScript's `.d.ts`,
Next.js's `page`/`layout`, Angular's 2025 reversal) and concluded there is no style-level best
practice there — only cases where a filename is a contract a tool reads. This is the **content**
counterpart: documentation systems, static-site generators, PKM/note-taking tools, and one
scientific data-naming spec, asked the same question a config-language decision needs answered
before it is written down.

Probed 2026-09-09. Every claim is quoted or closely paraphrased from an official doc, a spec, a
shipped source/type file, an issue thread, or a maintainer's own words, with a link. Every finding
is tagged **normative** (the doc states it as a requirement, or the tool breaks/rejects on
violation) or **conventional** (habit, worked example, or a configurable/overridable default) —
mandatory in this repo because the two license very different things for a config Module that is
about to decide what "the top-level one key per Module" spends its normative weight on. Where a
sub-question has no evidence either way, this file says so explicitly rather than guessing —
**that is itself a valid finding in this repo.**

---

## Direct answers

**Q1 — Johnny.Decimal, the closest named system to `<category>__<slug>`: does it specify file
naming, forbid anything, or get enforced by a tool?** **No, no, and no.** Johnny.Decimal's own
docs give **AC.ID** notation (`11.21`) and state its digit/period shape only through unlabelled
examples — never a normative sentence with a delimiter rule. The system's ID vocabulary governs
**folders** ("IDs are the manila folders we just talked about" — [11.03
IDs](https://johnnydecimal.com/10-19-concepts/11-core/11.03-ids/)); the one page addressing files
inside an ID folder, [Naming files and
subfolders](https://forum.johnnydecimal.com/t/the-recomended-structure-for-filenames-in-jd/1376),
gives exactly one hard rule — a date format — and states everything else as taste: "whatever
filename format you decide on, stick with it. Ruthlessly." The creator, in his own forum thread,
states there is no official filename spec at all: _"end of day, doesn't really matter what you
pick. Pick what works for you… **BUT. BE. CONSISTENT.**"_ **No tool anywhere validates or enforces
Johnny.Decimal naming** — the forum thread on file naming has zero validator or linter mentioned;
the only tooling discussed is a text-expansion snippet for inserting today's date. Johnny.Decimal
is a filing _philosophy_ enforced by nothing but the human who chose it.

**Q2 — Diátaxis: does it prescribe file naming, or only document kinds?** **Only document kinds.**
The [Diátaxis home page](https://diataxis.fr/) contains zero occurrences of "file", "filename", or
"naming." It states explicitly: _"It doesn't impose implementation constraints."_ It "proposes that
documentation should itself be organised around" four needs — tutorials, how-to guides, reference,
explanation — a taxonomy of **content type**, not a naming grammar. Diátaxis has no reference
implementation and ships no tool of any kind.

**Q3 — Docs-as-code stacks: enforce a name shape, or merely derive a URL from whatever is
there?** **Every stack surveyed derives; none of the surveyed publishing tools reject a
malformed content filename outright.** Antora computes a page's resource ID and URL directly from
wherever the `.adoc` file sits inside a `pages` family directory — the file's _word_ shape
(kebab-case, spaces, casing) is only ever a **recommendation** ("aren't recommended," never
"must") ([Partials](https://docs.antora.org/antora/latest/page/partials/)), while a **dot-prefixed**
filename is normatively excluded from the catalog entirely and an **underscore-prefixed** one is
normatively excluded from publishing (both overridable per-file) — the two reserved single-character
prefixes are the actual enforcement surface, not word shape
([Standard File and Directory Set](https://docs.antora.org/antora/latest/standard-directories/)).
Sphinx's "docname" is _defined as_ the source path minus extension — there is no separate concept
of a valid vs invalid docname to violate
([`sphinx-doc.org` quickstart/usage docs](https://github.com/sphinx-doc/sphinx/blob/master/doc/usage/quickstart.rst)).
Docusaurus's `numberPrefixParser` is the closest thing to a shape rule — it strips a leading
`NN-`/`NN.`/`N-` token to compute doc order — and it is optional, disableable
(`numberPrefixParser: false`), and **fails open**: a filename that doesn't match the parser's
pattern is simply left with no prefix extracted, no error
([`facebook/docusaurus` PR #4655](https://github.com/facebook/docusaurus/pull/4655),
[issue #4640](https://github.com/facebook/docusaurus/issues/4640)). MkDocs doesn't even sort by
shape unless you ask — filenames are explicit strings inside `nav:`, or (if `nav:` is omitted)
sorted alphanumerically ([Writing Your Docs](https://mkdocs.readthedocs.io/en/0.13.3/user-guide/writing-your-docs/)).
Starlight/Astro content collections generate a page `id`/slug from the filename by default but
let a `slug:` frontmatter field or a custom `generateId()` loader option override it per-entry or
project-wide ([Content collections — Astro Docs](https://docs.astro.build/en/guides/content-collections/)).
**Not one of these publishing tools makes a build fail because a content filename's word-shape is
wrong** — the one place any of them draws a hard line is reserved single-character prefixes
(Antora's `.` and `_`), not delimiter grammar inside the slug.

**Q4 — Where is a delimiter reserved, what character, why — and is there prior art for a doubled
delimiter?** Every delimiter found in this survey is a **single** character, chosen for one of two
stated reasons: **legibility inside a value that must also sort** (Johnny.Decimal's ISO-8601 `-` in
dates: _"Any other date format won't sort by date"_), or **collision avoidance between a
structural token and content that also uses common punctuation** (BIDS reserves `-` for
key-value pairing and `_` for entity separation, and states the exclusion as an allow-list — labels
"MUST consist only of allowed characters," alphanumeric plus `+` — rather than a denylist; see Q5).
**No content-naming system surveyed uses a doubled delimiter (`__`, `--`, `::`) as a reserved
token — this is a hard null.** The nearest precedent for _the design logic_ of doubling — not
content naming, but the same collision-avoidance reasoning — is one level down, in language
identifier grammars: the C++ standard reserves _"each name that contains a double underscore … for
any use"_ (a namespace-collision rule, precisely because a single underscore was already too
common in ordinary identifiers to serve as a boundary marker), and Python's dunder convention
exists so _"language system names … won't conflict with user-defined names."_ Both are quoted in
detail in §6. **Practical near-miss, at the folder level, one step short of doubling:** Grav CMS's
`NN.slug` folder convention (`01.home`) reserves a **single** `.` immediately after a numeric
prefix, and it fails open exactly like Docusaurus's: _"Grav understands that any integer value
followed by a period will be solely for ordering, and is removed internally"_ — a folder without
the prefix is simply treated as unordered/invisible, not rejected
([Grav Pages docs](https://learn.getgrav.org/17/content/content-pages)). **If this repo adopts
`__` as reserved, it would be the first in this survey to do so for a _content_ filename** — the
closest analogue (BIDS) chose `-` inside pairs and plain `_` between them, precisely because BIDS's
allow-list already excludes both characters from appearing inside a value, so no doubling was ever
needed to disambiguate.

**Q5 — Does any tool report a structured naming failure — naming the offending segment — rather
than printing a regex?** **Yes, with real primary-source evidence, but from outside the ticket's
named list: the BIDS Validator, not any docs-as-code tool.** BIDS (Brain Imaging Data Structure) is
a real specification with an official validator, and its **shipped TypeScript source** defines a
structured `Issue` type whose fields are exactly the shape a segment-aware reporter needs:
`code` (required), plus optional `subCode`, `severity`, `location` (dataset-relative path),
`rule` (a schema rule path, e.g. `rules.files.raw.anat.T1w`), `line`, `character`, `issueMessage`,
`suggestion`, and `affects`
([`bids-standard/bids-validator`, `src/types/issues.ts`](https://github.com/bids-standard/bids-validator);
interface confirmed independently via the [published JSR type docs](https://jsr.io/@bids/validator/doc)).
Real validator output already names the offending entity in prose, not just a regex: _"Sub label
contain[s] an Illegal Character[.] Please edit the filename as per BIDS spec"_ — for
`sub-001_task_ER_run-01_bold.nii.gz`, where an underscore that should have been a hyphen inside
`task-ER` gets absorbed into the `sub` label
([Neurostars](https://neurostars.org/t/error-from-bids-validator/20252)). This is meaningfully
closer to "structured, not a raw regex" than anything found among the docs-as-code stacks: **every
other naming-adjacent failure mode surveyed is either silent (Docusaurus's parser, Jekyll's post
matcher, Antora's dot/underscore exclusion) or a single generic string** — Decap CMS's `pattern`
validator is user-supplied `[regex, message]`, i.e. exactly the raw-regex shape the ticket is
weighing against, and Statamic surfaces filename-length failures as a bare Laravel _"The given data
was invalid"_ with no field-level detail
([GitHub discussion #5083](https://github.com/statamic/cms/discussions/5083)). **Caveat, stated
honestly:** BIDS's `rule`/`location` fields identify _which schema rule and which file_ failed, not
literally "character 4 of the `category` segment" — it is evidence for the shape of a good
answer (a `code` + `location` + `rule` object, not a message string), not proof that any tool
names an exact character offset inside a content filename's category/slug split.

**Hard nulls, stated explicitly (all valid findings in this repo).** **(1)** No docs-as-code
publishing tool in this survey rejects a content file for its word-shape; every one derives a URL
or an order from whatever name is present, or ignores/excludes the file wholesale via a reserved
_prefix character_, never a full regex grammar. **(2)** No content-naming system uses a doubled
delimiter; nothing in this survey explains why one _would_, beyond the collision-avoidance logic
borrowed from identifier grammars one layer down. **(3)** Diátaxis makes zero naming claims of any
kind — it is a content taxonomy, not a filing system. **(4)** Johnny.Decimal is enforced by no
software at all; its own creator states the only rule is human "CONSISTENCY." **(5)** No tool
surveyed reports a naming failure with true segment/offset granularity inside a content filename —
BIDS's `rule`+`location`+`code` object is the closest primary-sourced approximation, and it lives
outside the ticket's named list entirely.

---

## 1. Johnny.Decimal — a filing philosophy, not a spec

### 1.1 AC.ID notation is descriptive, not a grammar

[AC.ID notation](https://johnnydecimal.com/documentation/acid-notation/) states the notation
purely as shorthand for talking about a system, never as a rule a file must satisfy:

> I often use AC.ID notation as shorthand to refer to any generic Johnny.Decimal system.

The letters are explicitly placeholders — _"`A`, `C`, and `ID` serve as variables"_ — and digit
counts (one digit for area/category, two for ID) are never stated as a rule; they are only ever
shown in examples like `11.21 Health records & registrations`. No page states a required digit
count, and no page states what happens if it is violated, because nothing reads the notation
programmatically. **Conventional**, and unenforced by anything but the author's own habit.

### 1.2 IDs name folders; files inside them get a separate, weaker rule

[11.03 IDs](https://johnnydecimal.com/10-19-concepts/11-core/11.03-ids/) is explicit that the ID
vocabulary is a folder concept: _"IDs are the manila folders we just talked about."_ The dedicated
page on file naming inside an ID folder gives exactly one **normative** rule, about dates, and
otherwise defers to taste:

> ISO 8601 is the only date format you should ever use: `yyyy-mm-dd`. […] don't use day-month-year!
> […] Any other date format won't sort by date.
>
> Version numbers should be consistent and help you sort the files. […] whatever filename format
> you decide on, stick with it. Ruthlessly. […] as soon as you get lazy the sort breaks.

(Source: the same content is described on the JD documentation site under "Naming files and
subfolders"; verified via the community-linked forum thread
[The recommended structure for filenames in JD](https://forum.johnnydecimal.com/t/the-recomended-structure-for-filenames-in-jd/1376),
which quotes it and is where the creator, `johnny` (Johnny Noble, the system's author), personally
responds.) Putting the numeric ID _into_ a file name at all is explicitly optional, contextual
guidance — _"It depends"_ — with two suggested cases: emailing a file externally, or wanting it
to sort well in a "recently opened" list.

### 1.3 The creator's own words: no spec, one soft rule

From the forum thread, Johnny Noble (`authorAssociation`-equivalent: the system's creator) states
the entire philosophy in one line, capitalised for emphasis in the original:

> End of day, it doesn't _really_ matter what you pick. Pick what works for you.
>
> **BUT. BE. CONSISTENT.**

He is explicit that even his own date-format preference is not a rule others must follow: _"I'm
not saying it's wrong… If it's been working for you for ages, that's great."_ Community members in
the same thread propose their own, mutually incompatible schemes
(`YYYY-MM-DD_DocumentTitle_Subtitle_Version_Metadata.FileExtension`; `File Type - File
Description`) with no official arbiter. **Conventional, end to end** — there is no normative
filename grammar anywhere in Johnny.Decimal, and the one normative-sounding statement in the whole
system (the ISO-8601 date rule) governs a substring of a filename, not its overall shape, and is
about content going _into_ an ID folder rather than the ID itself.

### 1.4 No tool enforces it

Searching the file-naming thread turns up no validator, linter, or CLI of any kind — only
text-expansion snippets (Alfred, TextExpander) for typing today's date faster, and explicit
reluctance to _automate_ a rename: when one participant asks for a script to normalize
`yyyymmdd` to `yyyy-mm-dd`, the reply is a warning, not a tool — _"the problem is, how confident are
you in the script?"_ and _"don't just running that! Do like a hundred backups, etc."_
**NOT FOUND: any software artifact — official or community — that validates Johnny.Decimal file or
folder names.** This is the sharpest possible contrast with this repo's `folders-and-files` Module,
which exists precisely to be that software artifact for its own `<category>__<slug>` shape.

---

## 2. Diátaxis — a content taxonomy, silent on files

The [Diátaxis](https://diataxis.fr/) home page is unambiguous about scope. Searching the full page
text for "file", "filename", and "naming" returns **zero matches**. Its own framing statement:

> It doesn't impose implementation constraints.

And its stated subject is need-to-form mapping, not storage:

> [Diátaxis] identifies four distinct needs, and four corresponding forms of documentation —
> _tutorials_, _how-to guides_, _technical reference_ and _explanation_. It proposes that
> documentation should itself be organised around these needs.

"Architecture," in Diátaxis's own three-part vocabulary (_content_, _style_, _architecture_), means
how documentation is organised **conceptually** into the four kinds and their relationships to
each other — not directory layout, not URL structure, not filenames. Diátaxis ships **no
software, no reference implementation, and no linter** of any kind; it is a framework document,
full stop. Concrete choices like `tutorials/getting-started.md` vs. `docs/tutorial-1.rst` are left
entirely to whoever implements it. **NOT FOUND: any naming guidance whatsoever, normative or
conventional.** This is a clean, complete negative result — valuable precisely because it rules
out one of the ticket's named systems entirely rather than requiring a caveat.

---

## 3. Docs-as-code stacks: derive first, exclude by prefix, recommend shape

This section works through each stack the ticket names, on one question: **does the tool refuse to
build/publish a badly-shaped content file, or does it just compute something (a URL, an order,
an ID) from whatever name is there?**

### 3.1 Antora — reserved single-character prefixes are enforced; word shape is not

Antora computes a page's [resource ID](https://docs.antora.org/antora/latest/page/resource-id/)
directly from where the `.adoc` file sits inside a `pages` family directory — the general pattern
is `version@component:module:family$relative/path-to/resource.ext`, and the resource ID is
explicitly **not** coupled to a published URL:

> Resource IDs aren't coupled to a published URL because they're a source-to-source reference.

**What actually gets excluded — normatively, with no override for one case and an override for
the other** — comes from [Standard File and Directory
Set](https://docs.antora.org/antora/latest/standard-directories/):

> A file beginning with a dot counts as hidden […] Hidden files do **not** get added to Antora's
> content catalog. […] For intrinsically unpublished files […] there is currently no way to
> override this behavior.

> A private file is also an unpublished file, even if it's in a publishable family […] with the
> private property set to `false` on an underscore file in a publishable family, that file will be
> published.

So: a **leading dot** is an unconditional, unoverridable exclusion (normative); a **leading
underscore** is a conditional exclusion with an explicit escape hatch (normative, overridable) —
structurally the same "one documented escape hatch, coarse and project-level" pattern the sibling
source-code survey found for `.d.ts`/`page.tsx`/`pageExtensions`. **Word shape inside the name is
only ever advisory.** [Partials](https://docs.antora.org/antora/latest/page/partials/) states:

> Uppercase letters and spaces aren't recommended in partial file names since some file systems
> aren't case sensitive and file name conflicts could occur when using git

"Aren't recommended," never "must not" — and the [Pages Directory and
Files](https://docs.antora.org/antora/latest/pages-directory/) page uses "should," not "must," for
the one page-level extension rule: _"Only AsciiDoc source files with the file extension `.adoc`
should be stored in the `pages` directory."_ **Conventional**, and — tellingly — a downstream
Antora-based project had to bolt its own enforcement on top: the Bonita documentation site's
contributor guide states the team plans to _"progressively enforce"_ kebab-case naming across
repos themselves, because Antora does not
([`bonita-documentation-site/CONTRIBUTING.adoc`](https://github.com/bonitasoft/bonita-documentation-site/blob/master/docs/content/CONTRIBUTING.adoc)).
That is direct evidence that "derive, don't enforce" is a real gap practitioners feel and patch
locally, not a theoretical one.

### 3.2 Sphinx — the "docname" is the path; there is no separate valid/invalid axis

A Sphinx **docname** is defined as the source path relative to the source directory, with the
extension stripped — `index.rst` → docname `index`; `guide/tutorial.rst` → docname `guide/tutorial`.
This is not a rule a filename can violate; it is what the term _means_. The one place Sphinx
treats a filename as special is the master/root document, and even that is configurable — the
`sphinx-quickstart` prompt is literally _"Name of your master document (without suffix)
[index]"_ — normally `index`, but a project can name it anything
([sphinx-doc/sphinx, `doc/usage/quickstart.rst`](https://github.com/sphinx-doc/sphinx/blob/master/doc/usage/quickstart.rst)).
Source suffix mapping (`.rst`, or `.md` via a registered parser) is a config option
(`source_suffix`), not a naming grammar. **NOT FOUND: any concept in Sphinx of a malformed
docname** — every string that survives the filesystem is a valid docname by construction.

### 3.3 Docusaurus — the one real "shape rule" in this survey, and it fails open

Docusaurus's [autogenerated sidebar](https://docusaurus.io/docs/sidebar/autogenerated) numbering
is the closest thing found to a docs-as-code tool with an actual filename **shape**:

> A simple way to order an autogenerated sidebar is to prefix your docs and folders with number
> prefixes […] By default, Docusaurus will remove the number prefix from the doc id, title, label,
> and URL paths.

The parsing behavior is pluggable and optional — `numberPrefixParser` is a boolean-or-function
option defaulting to `true`, and can be turned off entirely
(`numberPrefixParser: false`) — added specifically because the original always-on logic broke
real projects whose filenames happened to start with digits for unrelated reasons: a site with
files named `yyyy-mm-dd.md` found every file's leading token misread as an order prefix
([`facebook/docusaurus` issue
#4640](https://github.com/facebook/docusaurus/issues/4640), [PR
#4655](https://github.com/facebook/docusaurus/pull/4655)). Two facts matter most for this repo's
decision: **(a)** even Docusaurus's own maintainers concluded a single global regex for a numeric
prefix could not be trusted not to misfire on legitimate content, and shipped an escape hatch
rather than tightening the regex; **(b)** a filename that does not match the parser's expected
shape is not rejected — it is simply left alone, prefix un-stripped, and used as-is. There is no
error path. **Conventional**, with the maintainers' own recommendation pointing _away_ from
number-prefixed filenames and toward `sidebar_position` frontmatter instead: _"Prefer using
additional metadata"_ ([Autogenerated
sidebars](https://docusaurus.io/docs/sidebar/autogenerated)) — i.e., Docusaurus's own guidance is
to move the ordering signal **out of the filename** once the project matures.

### 3.4 MkDocs — nav is an explicit map; auto-nav sorts, it doesn't validate

MkDocs places no constraint on source filenames beyond their being valid paths under `docs_dir`.
[Writing Your Docs](https://mkdocs.readthedocs.io/en/0.13.3/user-guide/writing-your-docs/) states
that with an explicit `nav:`, source files can be named however you like — the `nav:` list is the
single source of truth for both structure and (implicitly) valid membership. Only when `nav:` is
**omitted** does file naming affect anything, and even then it is sort order, not validity: _"the
navigation configuration will be automatically created by discovering all the Markdown files […]
and that auto-created navigation is always sorted alphanumerically by file name."_ Third-party
plugins (`mkdocs-gen-nav-plugin`, `mkdocs-literate-nav`) layer numeric-prefix-stripping or
folder-mirroring behavior on top, exactly the "downstream project bolts on what core lacks"
pattern seen with Antora/Bonita. **NOT FOUND: any built-in MkDocs mechanism that rejects a
malformed filename** — there is no such concept; a name is either "sorts where you want" or
"doesn't," never "invalid."

### 3.5 Starlight / Astro content collections — filename generates a slug, frontmatter overrides it per-entry

Astro's content-collections `glob()` loader auto-generates each entry's `id` "in a URL-friendly
format based on the content filename," and Starlight's `docsLoader()` uses exactly this for pages
under `src/content/docs/`
([Content collections — Astro Docs](https://docs.astro.build/en/guides/content-collections/)).
Two independent, **normative-strength but locally-scoped** override mechanisms exist:
a per-file `slug:` frontmatter field ("Override the slug of the page" — [Starlight Frontmatter
Reference](https://starlight.astro.build/reference/frontmatter/)), and a project-wide custom
`generateId()` loader option that replaces the default sluggifier entirely — the docs' own worked
example shows overriding it specifically to **preserve** characters the default sluggifier would
otherwise strip (`Example.File.md` served at `/Example.File` instead of the default `/examplefile`).
The direction of travel is the same as every other tool in §3: **the filename is a _default input_
to a derivation, and the system is built to make that default overridable, not to make the input
itself a validated grammar.**

### 3.6 What §3 establishes, taken together

Across five independent, actively-maintained docs-as-code stacks, the pattern is consistent
enough to state as a finding, not an impression: **no docs-as-code publishing tool surveyed
enforces a content filename's word-shape as a build-breaking requirement.** The only enforced
exclusions found anywhere in §3 are Antora's two reserved **single-character prefixes** (`.` and
`_`) — which is a different mechanism from a delimiter-and-segment grammar like `<category>__<slug>`,
closer to Next.js's `_folder`/`(group)` punctuation from the sibling source-code survey than to a
Johnny.Decimal-style ID shape. Every other naming signal found — Docusaurus's number prefix,
MkDocs's alphanumeric sort, Starlight's slug generation — **derives** something and **fails open**
when the input doesn't match expectations, exactly the shape the ticket's Q3 asked about
distinguishing.

---

## 4. Note-taking / PKM systems — free filenames, IDs live elsewhere

### 4.1 Obsidian — filenames are titles; restrictions are filesystem-safety, not scheme

Obsidian imposes character restrictions on note filenames for cross-platform filesystem safety,
not for any naming scheme of its own. Per a community-compiled, version-pinned list (v1.8.10) of
the characters the app's own UI rejects at creation time with a visible tooltip: on all supported
OSes, `[ ] # ^ |` are forbidden and a filename may not start with a dot; macOS/iOS/iPadOS/Linux add
`\ / :`; Windows adds `* " \ / : | ?`; Android adds `\ / : * ? "`
([Obsidian Forum: List of all forbidden filename
characters](https://forum.obsidian.md/t/list-of-all-forbidden-filename-characters/103977)).
Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`9`, `LPT1`–`9`) are also
rejected, inherited from the underlying OS, not an Obsidian-specific rule. This survey found **no
authoritative statement on `help.obsidian.md` itself** stating this list — the canonical reference
found is community-maintained, which is itself worth recording: Obsidian's own naming constraints
are not centrally documented in one normative spec page, only discoverable empirically via the
app's own input validation. **Normative** (the app refuses the character at input time) but **not
a naming scheme** — it is a filesystem-portability floor, orthogonal to any category/slug grammar a
vault owner might choose to layer on top by convention (which Obsidian neither requires, checks,
nor reports on).

### 4.2 Zettelkasten / UID schemes — Luhmann's original ID, and its digital afterlife

**Luhmann's own scheme (paper, no software) governs a card ID, not a "filename."** IDs branch by
alternating numeric and alphabetic segments — a digit-terminal parent (`1.1`) appends a letter for
its first child (`1.1a`); a letter-terminal parent appends digits (`1.1a1`) — producing IDs such as
`9/8`, `9/8a`, `9/8b1` in the actual archive. Luhmann used **two different, mutually
incompatible notations** across his two card boxes — `1/1a2b…` in the first, `1,1a2b…` in the
second — a direct primary-source data point that even the originator of numeric-ID note-linking
did not converge on one delimiter grammar over a 30-year practice (per the [Niklas Luhmann
Archive](https://forum.zettelkasten.de/discussion/1310/luhmanns-note-numbering-system) and the
Zettelkasten community's own analysis threads). **The scheme has a documented, acknowledged
limitation directly relevant to any fixed-shape ID grammar:** _"You cannot insert between adjacent
IDs. There is no ID between 1 and 1a"_ — the only fix is a link, not a rename.

**Modern digital implementations decouple the ID from the filename entirely — the single most
useful data point for this ticket.** org-roam (Emacs) defines a "node" purely by the presence of
an `ID` **org-mode property inside the file**, not by any filename shape:

> Headlines without IDs will not [be] considered Org-roam nodes.

The ID lives in a property drawer (`:PROPERTIES: :ID: foo :END:`), and the manual is explicit that
filenames are template output, not identity: the _default_ capture template happens to produce
`%<%Y%m%d%H%M%S>-${slug}.org`, but this is swappable per-project — the same manual shows swapping
it for `${slug}.org.gpg` for encrypted notes
([orgroam.com/manual.html](https://www.orgroam.com/manual.html)). One direct consequence stated in
the manual: because links are ID-based, not filename-based, **notes can be freely renamed or moved
without breaking references** — the opposite design choice from a system where the filename
segment _is_ the addressable key. A community `folgezett.el` package for org-roam generates
Luhmann-style branching IDs and stores them in a `FOLGEZETTEL_ID` **property**, again independent
of the filename ([`landerwells/folgezett.el`](https://github.com/landerwells/folgezett.el)).

**Dendron (VS Code) is the one tool in this survey that does the opposite — it makes the filename
itself the hierarchy, and its own engine depends on parsing it.** Notes are _"`.` (dot) delimited
Markdown files"_ — `project1.tasks.task1.md` instead of nested folders — specifically so that
_"each file [can be] also a folder"_ and re-parenting becomes _"a simple rename operation"_
([Dendron wiki: Hierarchies](https://wiki.dendron.so/notes/f3a41725-c5e5-4851-a6ed-5f541054d409/)).
This is genuinely **normative to the tool's own lookup and refactoring engine** — the dots are not
decorative, the engine's fuzzy-lookup and rename-propagation features are built by parsing them —
but the primary source (the Dendron wiki itself) documents **no validation or rejection behavior**
for a badly-formed name, and no structured error for a hierarchy/schema mismatch; a
known-and-reported friction point is the opposite failure — bulk **importing** dot-named files
sometimes has Dendron treat the dots as literal filename characters and mangle them to dashes
rather than reading them as hierarchy
([`dendronhq/dendron` issue #2884](https://github.com/dendronhq/dendron/issues/2884)). **NOT
FOUND: structured naming-failure reporting in Dendron.** Dendron's own schema feature (optional
YAML files describing expected hierarchies, e.g. `cli.*.cmd`) is described in the wiki as letting
Dendron "autocomplete and enforce your organization," but the primary source available for this
survey stops at the worked YAML example and does not show or describe the error/diagnostic surface
when a note violates a schema — this is a gap in what could be verified, not a claim that no such
surface exists.

### 4.3 What §4 establishes

The PKM/note-taking world splits cleanly into two designs, and both are directly load-bearing for
this ticket's underlying decision (is the ID the filename, or is the filename free and the ID
elsewhere): **org-roam's answer is "ID is a property, filename is free, and this buys
free-renaming"; Dendron's answer is "ID is _encoded in_ the filename, and this buys hierarchy from
flat files."** Neither tool reports a structured, segment-level naming failure in anything
verifiable from primary sources in this survey.

---

## 5. Two more content-specific normative cases, found beyond the ticket's list

The ticket's enumerated list (Johnny.Decimal, Diátaxis, Antora, Sphinx, Docusaurus, MkDocs,
Starlight, Obsidian, Zettelkasten/UID) turned up no tool that both enforces a content filename
shape _and_ rejects on violation. Two static-site generators outside that list do exactly that, and
belong in the record because they directly answer "does prior art enforce, or only derive":

**Jekyll's `_posts` collection is genuinely normative, and enforcement is silent exclusion, not a
build error.** Per Jekyll's own docs, a post filename **must** match
`YEAR-MONTH-DAY-title.MARKUP` — four-digit year, two-digit month, two-digit day
([jekyllrb.com/docs/posts](https://jekyllrb.com/docs/posts/)). This is load-bearing for the engine,
not cosmetic: Jekyll derives the post's title and date **from the filename itself**, without either
needing to be in frontmatter. **The enforcement mechanism is exactly the "silent, not loud" pattern
the sibling source-code survey found for Go's `_test.go` and build-constraint suffixes**: a file
that doesn't match the pattern is not rejected with an error — it is simply not recognized as a
post at all, which the project's own issue tracker records as a real beginner failure mode:
_"beginners often don't understand why they can't see their page… because they didn't put a date
in the filename or formatted it wrong"_ ([`jekyll/jekyll` issue
#6104](https://github.com/jekyll/jekyll/issues/6104)). A front-matter `date:` key can _override_
the date used for sorting, but does **not** remove the filename-date requirement — the two are
independent, both must be well-formed for a post to render and sort as intended.

**Hugo's leaf/branch bundle distinction reserves a single-underscore-prefixed basename, not a
delimiter inside the slug.** A directory containing `index.md` is a _leaf bundle_ (a terminal
page); the same directory containing `_index.md` instead is a _branch bundle_ (a section with
children) — _"If a directory `foo` has an `index.md` … that file will be the content file for that
`foo` Regular Page. If a directory `foo` has an `_index.md` … that file will be the content file
for that `foo` Section Page"_ ([gohugo.io/content-management/page-bundles](https://gohugo.io/content-management/page-bundles/)).
This is the same shape as Antora's underscore rule and Next.js's `_folder` — a single reserved
punctuation character on an otherwise-fixed basename, never a delimiter splitting an arbitrary
slug into parts.

---

## 6. The doubled-delimiter question, and its nearest analogue

**No content-naming system in this survey reserves a doubled delimiter character.** Every
delimiter found — Johnny.Decimal's `.`, BIDS's `-` and `_`, Grav's `.`, Dendron's `.`, Jekyll's `-`
— is single. The two rationales given anywhere for _why_ a particular single character was chosen:

1. **Sortability inside a value that is also read by a human** — Johnny.Decimal's ISO-8601 `-`:
   _"Any other date format won't sort by date."_
2. **Collision avoidance between a structural token and free-text content** — BIDS's allow-list
   design: rather than reserving `-`/`_` and then banning them everywhere else, BIDS instead
   restricts every _label_ to "alphanumeric (and possibly including `+`)" characters, which makes
   the reserved delimiters unambiguous by construction — there is nothing inside a label that could
   be mistaken for the separator
   ([BIDS specification, Common
   principles](https://bids-specification.readthedocs.io/en/stable/common-principles.html)).

**The nearest primary-sourced precedent for doubling a delimiter specifically to reserve it is one
layer down, in language identifier grammars, not file naming.** The C++ standard states the rule
in exactly the collision-avoidance terms this repo's `corpus-entry.pure.ts` uses for `__`:

> Each name that contains a double underscore … or begins with an underscore followed by an
> uppercase letter is reserved to the implementation for any use.

The stated historical reason is namespace collision with compiler-internal names and name-mangling
schemes — a single underscore was already too common in ordinary user identifiers to serve as an
unambiguous boundary marker, so the convention escalated to two. Python's dunder convention
documents the identical logic for a different mechanism (name mangling): the double leading
underscore exists specifically "to avoid name clashes with names defined by subclasses." **Neither
of these is a content- or even source-file-naming convention — both govern identifiers inside a
language** — but the _design logic_ transfers directly: **a single delimiter that might already
appear inside legitimate content cannot be trusted as an unambiguous boundary; doubling (or,
BIDS's alternative, restricting the value's own alphabet) is the known fix.** This survey found no
prior art that chose doubling _for a filename_; it found two independent traditions that chose
the two different fixes for the same underlying problem, at the identifier level (double the
delimiter) and at the data-format level (restrict the value's alphabet instead).

---

## 7. Structured naming-failure reporting — the ticket's key differentiator

Restating the finding from the Direct Answers with the full evidence:

**Everywhere in §§1–5, a naming mismatch is either silent or a single unstructured string.**
Tabulated:

| Tool                     | What happens on a shape mismatch                                                          | Structured?                          |
| ------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------ |
| Johnny.Decimal           | Nothing — no software reads it                                                            | n/a, no tool exists                  |
| Antora (word shape)      | Nothing — filename becomes URL regardless                                                 | No — no check at all                 |
| Antora (`.`/`_` prefix)  | Excluded from catalog/publish, no message                                                 | No — binary, no report               |
| Sphinx                   | Nothing — every string is a valid docname                                                 | n/a, no invalid state                |
| Docusaurus number prefix | Prefix left unstripped, no message                                                        | No — silent no-op                    |
| Jekyll `_posts` date     | File not recognized as a post, no message                                                 | No — silent exclusion                |
| Dendron hierarchy        | Not documented in primary sources found                                                   | Not found either way                 |
| Decap CMS `pattern`      | User-authored `[regex, message]` string                                                   | No — this **is** the raw-regex shape |
| Statamic slug length     | Generic Laravel `"data was invalid"`                                                      | No — no field named                  |
| **BIDS Validator**       | **Structured `Issue` object: `code`, `subCode`, `location`, `rule`, `line`, `character`** | **Yes**                              |

BIDS is the one primary-sourced counter-example, and it is worth being precise about how far the
evidence goes. The shipped `Issue` type
([`bids-standard/bids-validator`](https://github.com/bids-standard/bids-validator);
fields confirmed via [published API docs](https://jsr.io/@bids/validator/doc)) has these fields —
`code: string` (required); `subCode?`, `severity?`, `location?` (dataset-relative path),
`rule?` (schema rule path — the docs' own example is `rules.files.raw.anat.T1w`), `line?`,
`character?`, `issueMessage?`, `suggestion?`, `affects?` — all optional except `code`. Real
validator output pairs a `code` with the specific filename and cause in prose: _"Sub label
contain[s] an Illegal Character"_ for a malformed `sub-` entity, and a cross-check error names the
mismatch between a directory's `ses-` label and a filename's `ses-` label explicitly
([Neurostars](https://neurostars.org/t/error-from-bids-validator/20252)). **This is real evidence
that a `code` + `location` + `rule` object — not a raw regex, not a generic string — is a shipped,
production design for reporting a content-naming violation.** It is not, however, evidence that any
tool reports failure at the _exact character-offset-inside-one-segment_ granularity a
`FieldConstraints`-style per-part report would want — BIDS's `line`/`character` fields exist for
file _contents_ (e.g., malformed JSON), and the filename-specific errors found in practice are
prose sentences naming an entity ("Sub label"), not a machine-readable segment index. **Net: found,
with a caveat on precision — and found outside the ticket's named list, which is itself a finding
worth recording:** none of Johnny.Decimal, Diátaxis, Antora, Sphinx, Docusaurus, MkDocs,
Starlight, Obsidian, or the Zettelkasten tooling surveyed reports naming failures this way; the one
system that does is a scientific dataset spec with its own dedicated validator project, not a
docs-as-code stack.

---

## 8. Full list of hard nulls

1. **No docs-as-code publishing tool enforces content-filename word shape as a build-breaking
   requirement.** (§3.6)
2. **No content-naming system surveyed uses a doubled delimiter character.** (§6)
3. **Diátaxis makes no naming claim of any kind, normative or conventional.** (§2)
4. **Johnny.Decimal is validated by no software, official or community.** (§1.4)
5. **No `help.obsidian.md` page states Obsidian's own forbidden-character list** — the only
   authoritative source found is empirical (the app's own input validation), documented by the
   community rather than centrally. (§4.1)
6. **Dendron's schema-violation error/diagnostic surface could not be verified from primary
   sources available in this survey** — the wiki claims schemas "enforce," but does not show the
   error shape. This is a gap in available evidence, not a claim that no such surface exists. (§4.2)
7. **No tool surveyed reports a naming failure at exact segment/character-offset granularity
   inside a content filename.** BIDS's `rule`+`location` object is the closest verified
   approximation and is coarser than that. (§7)

---

## Sources and versions probed

Probed 2026-09-09. Primary sources only; every quoted claim above links to the official doc, spec,
shipped source, issue thread, or maintainer statement it came from. Versions/pages where dated:

- Johnny.Decimal: `johnnydecimal.com` (undated, evergreen doc site) + creator/community forum
  thread [`forum.johnnydecimal.com/t/the-recomended-structure-for-filenames-in-jd/1376`](https://forum.johnnydecimal.com/t/the-recomended-structure-for-filenames-in-jd/1376).
- Diátaxis: `diataxis.fr` home page, current at probe date.
- Antora: `docs.antora.org/antora/latest/` (resource-id, pages-directory, standard-directories,
  page/partials pages).
- Sphinx: `sphinx-doc.org` / `sphinx-doc/sphinx` GitHub source, `doc/usage/quickstart.rst`,
  `master` branch.
- Docusaurus: `docusaurus.io/docs/sidebar/autogenerated` (current docs), plus
  `facebook/docusaurus` PR #4655 and issue #4640 for the `numberPrefixParser` design history.
- MkDocs: `mkdocs.readthedocs.io/en/0.13.3/user-guide/writing-your-docs/`.
- Starlight/Astro: `starlight.astro.build/reference/frontmatter/`,
  `docs.astro.build/en/guides/content-collections/`.
- Obsidian: community-compiled forum list for v1.8.10
  (`forum.obsidian.md/t/list-of-all-forbidden-filename-characters/103977`) — flagged in §4.1 and
  §8 as not independently confirmed against an official `help.obsidian.md` page.
- Zettelkasten/Luhmann: `forum.zettelkasten.de/discussion/1310/luhmanns-note-numbering-system` and
  related threads referencing the Niklas Luhmann Archive.
- org-roam: `orgroam.com/manual.html`; `landerwells/folgezett.el` on GitHub.
- Dendron: `wiki.dendron.so` (Hierarchies, Concepts, Finding Notes, Taking Notes pages);
  `dendronhq/dendron` issue #2884.
- Jekyll: `jekyllrb.com/docs/posts/`; `jekyll/jekyll` issue #6104.
- Hugo: `gohugo.io/content-management/page-bundles/`.
- Grav CMS: `learn.getgrav.org/17/content/content-pages`.
- BIDS: `bids-specification.readthedocs.io/en/stable/common-principles.html`;
  `bids-standard/bids-validator` GitHub repo and `src/types/issues.ts`; type shape cross-checked
  against `jsr.io/@bids/validator/doc`; failure examples from `neurostars.org` threads.
- Decap CMS / Statamic: `decapcms.org/docs/configuration-options/`;
  `github.com/statamic/cms/discussions/5083`.
- C++/Python doubled-delimiter analogue: C++ standard §17.4.3.1.2 (reserved names, quoted via
  secondary compilation of the standard's text — the clause number should be re-verified against
  the current ISO C++ working draft before being cited in an ADR); Python dunder convention per
  community documentation of `PEP 8`-adjacent naming practice (not independently re-verified
  against PEP 8's own text in this pass — flagged for follow-up if this citation becomes
  load-bearing).

**One methodological caveat, stated plainly:** several findings above were retrieved via `WebFetch`
summarization or `WebSearch` result synthesis rather than a direct byte-for-byte read of primary
HTML/source in every case. Every quoted sentence was cross-checked for plausibility against its
cited source and, where a tool result flagged something as unconfirmed or approximate, that
uncertainty is carried into the finding above rather than smoothed over (see §8 items 5 and 6, and
the C++/Python citation note immediately above). Anyone re-verifying this file for an ADR should
re-pull the C++ standard clause and the Dendron schema-error behavior directly before treating
either as load-bearing.
