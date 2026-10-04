---
type: design-adr
status: accepted
---

# A heading `pattern` is an ECMAScript regular expression with the `u` flag, searched and never implicitly anchored

A heading entry's `pattern` replaces round one's `title` and `prefix`, so it is the one place the
language says what a heading may say, and a reimplementation must match it exactly. The dialect is
**ECMAScript regular-expression syntax and semantics, with the `u` flag set and no other flag**: no
`i`, no `m`, no `s`, no `g`, no `y`. The pattern is **searched**, the way `RegExp.prototype.test` runs
it: it matches when it matches anywhere in the heading's content. **There is no implicit anchor**, so
an Operator who means a fixed title writes `^Findings$`, a prefix `^Source: `, a suffix ` Report$`,
and a substring `Decision`.

## What the pattern is tried against

The raw content of the heading as
[`0014-headings-are-top-level-block-headings-read-by-a-bought-parser.md`](./0014-headings-are-top-level-block-headings-read-by-a-bought-parser.md)
defines it: the text between the markers with the ATX closing sequence and surrounding whitespace
removed, inline markup and escapes intact, and for a multi-line setext heading its lines joined by one
line feed. So `## **Findings**` is tried as `**Findings**`, a trailing space is not part of it, and
the content `Source:` then `One` of a two-line heading is `Source:\nOne`. An empty heading's content
is the empty string, which `^$` matches and `.` does not.

## What each choice means, so a reimplementation can match it

1. **No `i` flag.** Matching is case-sensitive, as every other comparison in this product is
   (design-ADR 0007). An Operator who wants both cases writes a class, `^[Ff]indings$`.
2. **No `m` flag.** `^` and `$` anchor the whole content, not each of its lines, so a pattern cannot
   reach the second line of a two-line heading by anchoring on it. **No `s` flag.** `.` does not match
   a line terminator, so `^Source:.One$` does not match `Source:\nOne`, while `\n` in a pattern
   names the line feed explicitly.
3. **The `u` flag.** `.` and every counted repeat work in code points, not UTF-16 code units, so
   `^.{2,3}$` accepts a title of `a`, U+1F600 and `b`, which is three characters, where a non-`u`
   engine would count four units. A length is a pattern, and it counts what a person counts. The
   flag also makes an unnecessary escape a syntax error: `^Source\-` does not compile, which is how
   the config refuses it (0020).
4. **No other syntax is defined here.** ECMAScript's own grammar is the reference. The Conformance
   corpus uses only constructs that ECMAScript, RE2, Python's `re` and PCRE share, namely literals,
   `.`, classes written out (`[0-9]`, never `\d`), anchors, groups, alternation and counted repeats,
   so an implementation in another language can pass it. Lookaround, backreferences, named groups and
   the shorthand classes are legal in the dialect and appear in no case, because their meaning
   differs between engines.

## An anchored literal, defined

An enumeration may not pin fixed text, and 0020 refuses it, so the notion needs a definition a
program can apply. A pattern is an **anchored literal** when it begins with `^`, ends with an
unescaped `$`, and everything between the two is a run of literal characters: any character that
is not one of `\ ^ $ . | ? * + ( ) [ ] { }`, or a backslash followed by one of those characters.
`^Findings$`, `^C\+\+$` and `^$` are anchored literals. `^Source: `, `^Step [0-9]+$`,
`^(Pros|Cons)$` and `Findings` are not. This is a syntactic test and not a proof that a pattern
matches one string: a closed alternation of two titles is allowed, and describes a small known set,
which is a different question from a heading nobody can predict.

## Considered options

**The first Module's dialect, `new RegExp(pattern)` with no flags.** Rejected for this Module's
patterns: it makes a length depend on UTF-16 units, and the first Module's patterns match field
values, which are machine-written slugs. The two Modules now differ on one flag, which is tolerable
because neither Module reads the other's section (tenet 12) and `frontmatter-harness` is unchanged.
**A restricted subset such as RE2's.** Rejected: it would need its own grammar, parser and
specification, and ECMAScript already has one; the portability goal is met instead by what the
corpus uses. **Implicit anchoring**, so a pattern means the whole title. Rejected: a prefix and a
substring would then need their own spelling, and one language with one default beats two keys.
**A `title` key kept beside `pattern`.** Rejected by instruction: one way to say a fixed title.

## Consequences

1. A pattern is shown to the Contributor inside a violation's `requirement`. An entry that writes no
   `intent` shows its raw expression, which the first Module's mandatory `intent` beside a `pattern`
   exists to prevent. This is a known cost, accepted because the instruction keeps `intent` optional.
2. Compiling a pattern under `u` is the validity test, and an uncompilable one is a config fault. A
   reimplementation whose engine accepts a pattern ECMAScript refuses must still refuse it.
3. The dialect is part of the portable surface (tenet 4). Changing a flag is a contract change that
   moves cases.
