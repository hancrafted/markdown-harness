# markdown-harness — Implementation Specification

This document is a frozen input. Everything you need is here and in the kit it names
(`fixtures/`, `tests/acceptance/`). Where the spec and the acceptance suite disagree, the suite
wins — record the disagreement in `RESULTS.md` (§8). Where the spec is silent, the choice is
yours; record choices you consider notable there too.

## 1. The product

`markdown-harness` (`mh`) checks the YAML frontmatter of markdown files against one repo-level
configuration file. Two parties meet in it:

- the **Operator** writes the config: which files are governed, and what their frontmatter must say;
- the **Contributor's agent** writes markdown and reads the reports. It never opens the config.

Governance is **opt-in**: a file no rule matches is _invisible_ — never read, never reported, never
counted. Invisibility is a correct answer, not an error.

You deliver a CLI named `mh`, and **you choose where its entry file lives**. Declare that choice in
`package.json` as `"bin": { "mh": "<your entry file>" }`: the acceptance suite resolves your entry
from there and spawns `node` on it, so the declaration is the one place the path is written down and
nothing else in the delivery depends on it. Node must be able to run that file directly — it runs
TypeScript by stripping types, and syntax it cannot strip (e.g. `enum`) crashes at runtime. Three
commands, every response as JSON on stdout.

**Done when `npm run verify` is green**: format check, typecheck, the provided acceptance suite,
and your own tests. Treat it as your feedback loop rather than a final gate — run it after every
slice of work (§7), not once at the end. You also deliver your own tests (§7) and a run report
(§8).

## 2. Command surface

```
usage: mh [--check] [--root <dir>] [--config <file>]
       mh  --query <path>          [--config <file>]
       mh  --audit  [--root <dir>] [--config <file>]

  --check   every governed file with a violation, and the counts. The default command.
            Exits 1 when the corpus is wrong.
  --query   what the config asks of one path, before anything exists there. Never exits 1.
  --audit   how every rule fared across the corpus, so a rule that governs nothing is visible.
            Never exits 1.
```

| flag              | default                        | meaning                                                                        |
| ----------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `--root <dir>`    | `.`                            | directory whose markdown files form the corpus                                 |
| `--config <file>` | `markdown-harness.config.yaml` | the config file, resolved from the current directory — **never** from `--root` |

Rules of the surface:

1. **At most one command flag per invocation.** No command flag means `--check`: bare `mh` checks
   the current directory against `markdown-harness.config.yaml`, the way `docker compose` finds
   its own file where you stand. Two or more command flags, or `--root` combined with `--query`
   (a query has no corpus), is a **usage error**: usage text on stderr, nothing on stdout, exit 2.
   An unknown flag is the same usage error. Conflicting input is refused rather than resolved by
   precedence; a _missing_ command is not conflicting input, which is why it has a default and
   they do not.

   The same refusal covers three shapes of malformed argv, all of them conflicting input: a flag
   **given twice** (`--root a --root b`), a flag written with **no value**, and a value that
   **begins `--`**. Last-one-wins on a repeated flag would silently discard what the caller asked
   for, and this tool answers about directories — discarding a `--root` quietly is how a check
   reports on the wrong corpus.

2. **One output channel.** The response is written to stdout as JSON (2-space indentation, trailing
   newline). stderr carries usage text only. No other rendering, no verbosity flags.
3. **Exit codes are a contract.** Code 2 has two flavours and they are told apart by the output
   channel, never by the number: a **usage error** puts usage text on stderr and nothing on
   stdout, while a **rejected config** puts a `CONFIG_REJECTED` response on stdout (§4.5) and
   nothing on stderr. A caller that reads only the exit code cannot distinguish them, and does
   not need to; a caller that reads stdout always can.

   | code | meaning                                                                                          |
   | ---- | ------------------------------------------------------------------------------------------------ |
   | 0    | ran, nothing wrong — including an `invisible` query answer and an `--audit` whatever it finds    |
   | 1    | ran, the **corpus** is wrong — only `--check` returns it, exactly when `invalidFiles > 0`        |
   | 2    | could not report at all: usage error, or the config is missing, unreadable, not YAML, or invalid |

   A rejected config exits 2 **whichever command was asked** — `--query` and `--audit` included.
   "Never exits 1" is a statement about the corpus, not a promise of 0: no command reports on a
   config it could not trust.

4. **The walker.** The corpus is every `**/*.md` under `--root`, sorted lexicographically.
   `**/node_modules/**` and `**/.git/**` are refused unconditionally — no config can opt back in.
   Dot-directories are not enumerated (`*` does not match a leading dot). `root` and `config`
   travel in the response **exactly as the caller wrote them**, never resolved, so a stored
   response compares equal on another machine.

   A `--root` that does not exist, or that cannot be read as a directory, is a **usage error**
   (exit 2) — not an empty corpus, and never an uncaught exception. `--check` over a mistyped
   root must not answer `invalidFiles: 0`: a tool that reports "nothing wrong" about a directory
   it never found has produced exactly the false negative §4.7 forbids elsewhere. Symlinked
   directories inside the corpus are **not** followed.

   Nothing here is a statement about the config: `--root` is part of the invocation, so a bad one
   fails as usage, while a bad `--config` fails through §3.5's catalog.

## 3. The config language

One file, at the repo root, no fallback filenames, no nesting of configs. The top level names
module sections; `frontmatter:` is the only one. An unrecognised top-level key is a config error.

```yaml
frontmatter:
  rules:
    - ruleId: reference # mandatory, unique across the list
      path: [docs/reference/**/*.md]
      intent: Reference pages are looked up by slug and say how far they can be trusted
      unknownKeys: forbidden
      fields:
        type:
          presence: required
          allowed:
            - { value: reference, intent: Lookup data an agent consults rather than reads through. }
        slug:
          pattern: ^[a-z0-9]+(-[a-z0-9]+)*$
          intent: Slugs are lowercase words joined by single hyphens # mandatory beside pattern
        draft:
          presence: forbidden
          intent: Reference material ships finished or not at all
```

### 3.1 Rules

`rules:` is an **ordered list**, and order is semantic: for any file, walk top-down; the **first
matching rule is the complete set of constraints that applies**. Nothing merges, nothing is
inherited. This resolution strategy is **first-match wins**, and it is the only one — every later
mention of "first-match" in this document means exactly this paragraph. Most specific rules first,
broadest last — reversed, a narrow rule silently wins for zero files.

Every rule = a **selector** + a **reason** + a **payload**:

- `ruleId` — mandatory, unique. Reports refer to rules by id, never by position.
- `intent` — mandatory, non-empty. The Operator's reason, quoted verbatim in every violation this
  rule reports (a field-level `intent` overrides it for that field). See §3.4.
- selector — **exactly one** of:
  - `path: [<glob>, …]` — globs matched against root-relative paths;
  - `fileName: "<name>"` — sugar, defined as `path: ["**/<name>"]`.
- `excludeFiles: [<glob>, …]` — optional, per-rule. Answers one yes/no question before the rule is
  considered; takes no part in ordering. Its only use under first-match: letting a file fall
  _through_ to a later, broader rule.
- payload — **exactly one** of:
  - `frontmatter: forbidden` — the rule declares its paths frontmatter-free. No other payload key
    may appear beside it.
  - a constraining payload: `fields`, `unknownKeys`, `exactlyOneOf`, `anyOf`, `allOf` (all
    optional; a rule with a selector and an intent and no payload is legal — "these files are
    governed" with nothing yet asserted).

### 3.2 Field addresses

`fields:` is keyed by **field address**, which reaches exactly one level into nested shapes:

```
description            a top-level key
generated.by           a key inside a mapping
sources[].resource     a key inside EVERY entry of a list
```

The list itself and its entries are different addresses and never share a shape:
`sources: { minItems: 1 }` constrains the list; `sources[].resource: { presence: required }`
constrains every entry.

### 3.3 Field constraints

Every key optional; a constraint object stating nothing is a config error. Keys are
shape-specific by construction — a shape-agnostic `min` that silently means "18 digits" is the
trap this vocabulary exists to avoid.

| key                       | applies to       | meaning                                                                                                                                                                                     |
| ------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `presence`                | any              | `required` \| `optional` \| `forbidden`. **`required` means present AND non-empty** — which is why `minLength: 1` appears nowhere                                                           |
| `minLength` / `maxLength` | strings only     | length bounds. A three-item list does not satisfy `minLength: 3`                                                                                                                            |
| `minItems` / `maxItems`   | lists only       | entry-count bounds                                                                                                                                                                          |
| `itemMaxLength`           | lists of strings | max length of each entry                                                                                                                                                                    |
| `format`                  | strings          | `datetime` (ISO 8601 with an explicit UTC offset) \| `uri` (a path or URI) \| `actor` (`<producer>/<version>` \| `human:<id>` \| `process:<id>`). Form only — nothing ever consults a clock |
| `pattern`                 | strings          | a regular expression the value must match. A sibling `intent` is **mandatory** — without it the raw regex is all a violation could report                                                   |
| `allowed`                 | any              | a closed set of records `{ value, intent? }`. Replaces wholesale, never appends. This is where a repo's `type` vocabulary lives — there is no other spelling                                |
| `intent`                  | —                | why _this_ constraint exists. Optional (mandatory beside `pattern`); wins over the rule's `intent`; present-but-empty is a config error                                                     |

The three `format` grammars in full, because "form only" is not a grammar and four independent
readings of the line above produced four different validators:

- **`datetime`** — a date, `T`, a time to full seconds, an optional fractional part, then an
  explicit offset of `Z` or `±hh:mm`. Lowercase `t`/`z` are accepted, the leniency RFC 3339
  grants. **Form only, and that means no calendar arithmetic**: `2026-02-30T00:00:00Z` passes,
  and `2026-13-45` fails for want of a time and an offset rather than for naming month 13. A
  validator that reaches for `Date` is checking something this constraint does not claim.
- **`uri`** — one non-empty token with no whitespace in it. "A path or URI" is the whole of it:
  no scheme list, no host rules, no percent-encoding check.
- **`actor`** — exactly one of `human:<id>`, `process:<id>`, or `<producer>/<version>` with
  exactly one slash. `human` and `process` are **reserved producers**: `human/hancrafted` is a
  mismatch, because the slash form is for tools and those two names belong to the colon form.
  That rule was previously discoverable only by reading a fixture, which is not where a rule
  belongs.

Cross-field constraints sit on the rule, naming a **set** of addresses: `exactlyOneOf`, `anyOf`,
`allOf`. An address in such a set counts as **satisfied when it is present and non-empty** — the
same emptiness `presence: required` uses and `EMPTY_REQUIRED_FIELD` reports, so `title: ''` cannot
satisfy `allOf: [title, description]`. One definition of "empty" in this document, not two.

`unknownKeys: allowed | forbidden` (default `allowed`) says whether top-level frontmatter
keys the rule does not name are permitted.

### 3.4 `intent`: the steering channel

`intent` is not documentation of the config. It is the payload this tool exists to deliver, and the
reason it is mandatory in three places rather than encouraged in one.

A violation code names which constraint failed. The `intent` names **what the Operator was trying
to achieve**, in the Operator's own words, and it is the sentence the agent about to edit the file
acts on. Reporting `PATTERN_MISMATCH` with a regex tells an agent to satisfy a regex; carrying
_"Slugs are lowercase words joined by single hyphens"_ beside it tells the agent what the repo
wants, which is the only thing that generalises to the next file it writes.

Three consequences, all of them load-bearing:

- **Mandatory on every rule** (`MISSING_RULE_INTENT`), and mandatory beside every `pattern`
  (`MISSING_PATTERN_INTENT`), because a constraint nobody can explain is a constraint an agent can
  only satisfy by coincidence.
- **Never storable empty** (`EMPTY_INTENT`): a written-and-blank intent is worse than an absent
  one, because it passes a presence check while steering nothing.
- **Quoted verbatim, never summarised**, wherever it travels — `ruleIntent` on a reported file,
  `intent` inside every `requirement` fragment, `intent` on the rule a query resolves to. The
  implementation never paraphrases the Operator (§4).

This is the line between a linter and a steering instrument: the check happens at the same moment
either way, but only one of them hands the agent the reason.

### 3.5 Config validation

A config that cannot be trusted **fails whole**: validation reports **every** fault it can find,
as result content (§4.5), never as a stack trace — and exits 2. The catalog (closed for v1):

| code                                        | fires when                                                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `CONFIG_NOT_FOUND`                          | nothing exists at the config path; `location` is the path as the caller gave it                             |
| `CONFIG_UNREADABLE`                         | something is there but cannot be read as a file (permissions, it is a directory)                            |
| `CONFIG_NOT_YAML`                           | the bytes are not valid YAML, or they parse to something other than a mapping                               |
| `CONFIG_UNRECOGNISED_KEY`                   | a key the vocabulary does not define, at any depth                                                          |
| `CONFIG_INVALID_VALUE`                      | a defined key holding a value outside its type (`presence: maybe`)                                          |
| `CONFIG_EMPTY_RULE_LIST`                    | no `frontmatter:` section, or `rules: []` — naming a module and governing nothing is a mistake, not a no-op |
| `CONFIG_DUPLICATE_RULE_ID`                  | two rules share a `ruleId`                                                                                  |
| `CONFIG_SELECTOR_MISSING`                   | a rule with neither `path` nor `fileName`                                                                   |
| `CONFIG_SELECTOR_AMBIGUOUS`                 | a rule with both                                                                                            |
| `CONFIG_MISSING_RULE_INTENT`                | a rule with no `intent`                                                                                     |
| `CONFIG_MISSING_PATTERN_INTENT`             | `pattern` with no sibling `intent`                                                                          |
| `CONFIG_EMPTY_INTENT`                       | any `intent` key written and empty                                                                          |
| `CONFIG_EMPTY_CONSTRAINT`                   | a constraint object stating nothing                                                                         |
| `CONFIG_FRONTMATTER_FORBIDDEN_WITH_PAYLOAD` | `frontmatter: forbidden` beside any payload key                                                             |

Fourteen codes. Every one carries the `CONFIG_` prefix: a `code` is read in logs and transcripts
far from the envelope that scoped it, and `INVALID_VALUE` sitting beside a frontmatter
`VALUE_NOT_ALLOWED` would leave the reader guessing which file to open. The first three name the
file, the rest name a key inside it — the same split HTTP draws between "no such thing", "cannot
serve it", "malformed", and "well-formed but wrong".

`location` uses the config's own notation — the shape the Operator would use to find the fault:
`frontmatter.rules`, `frontmatter.rules[3].intent`, `frontmatter.rules[3].fields.slug.pattern`.
Positional on purpose: identity is `ruleId`'s job in reports; a location in a file the Operator
has open is found by index.

The catalog is closed, so the structural mistakes it does not name individually still resolve to
one of the fourteen. These four are named because every independent reading of this section
reached for `CONFIG_INVALID_VALUE` and then recorded the guess as a spec gap:

| mistake                                                         | code                   | `location`                    |
| --------------------------------------------------------------- | ---------------------- | ----------------------------- |
| `ruleId` missing, or present and not a string                   | `CONFIG_INVALID_VALUE` | `frontmatter.rules[i].ruleId` |
| `rules` present but not a list (`rules: "oops"`)                | `CONFIG_INVALID_VALUE` | `frontmatter.rules`           |
| `path`/`fileName`/`excludeFiles`/a cross-field set, wrong shape | `CONFIG_INVALID_VALUE` | the key as written            |
| `pattern` holding a string that will not compile as a regex     | `CONFIG_INVALID_VALUE` | `…fields.<addr>.pattern`      |

`CONFIG_EMPTY_RULE_LIST` keeps its literal scope — no `frontmatter:` section, or `rules: []` —
and does not stretch to cover a `rules` that is present and the wrong type.

Two locations that a single position cannot make obvious, fixed here rather than left to taste:

- **`CONFIG_DUPLICATE_RULE_ID` points at the later occurrence** (`frontmatter.rules[j].ruleId`,
  the higher index). One position is available and the first occurrence is not the mistake.
- **`CONFIG_MISSING_RULE_INTENT` points at the rule object** (`frontmatter.rules[i]`), not at
  `frontmatter.rules[i].intent`. A key that was never written has no position of its own; this is
  the difference from `CONFIG_EMPTY_INTENT`, which points at the `.intent` the Operator did
  write.

## 4. Output contracts

One principle runs through every payload: **the data carries no prose of ours.** A violation code,
the value found, and the config fragment that failed are a complete basis for every sentence the
tool could say; a stored `message` would hold one fact twice, and two representations of one fact
drift. Author prose _does_ appear — every `intent` is the Operator's own words, quoted verbatim
(§3.4) — but no sentence the implementation wrote is stored anywhere.

Casing carries the same line: `CAPITAL_SNAKE_CASE` tokens are the tool's own (codes); everything
lowercase a report quotes is the Operator's or the command line's, verbatim.

Every declaration and every property below carries a doc comment in the delivered source, above
the member rather than trailing it, so a consumer hovering the type in an editor is told the same
thing this document says. The comments in these blocks are the contract's prose; keep them.

Three type names appear in these blocks without a block of their own, because the tables that
define them are the definition: `FieldConstraints` is §3.3's key table, `FieldViolationCode` is
§4.7's, and `ConfigFaultCode` is §3.5's. Declaring them is yours.

### 4.1 The response

```ts
export interface CheckResponse {
  command: 'check';
  /** The corpus directory, echoed exactly as the caller wrote it — never resolved. */
  root: string;
  /** The config path, echoed exactly as the caller wrote it — never resolved. */
  config: string;
  result: CheckResult | ConfigErrorResult;
}

export interface QueryResponse {
  command: 'query';
  /** The path asked about, echoed exactly as the caller wrote it. It need not exist. */
  path: string;
  /** The config path, echoed exactly as the caller wrote it — never resolved. */
  config: string;
  result: QueryResult | ConfigErrorResult;
}

export interface AuditResponse {
  command: 'audit';
  /** The corpus directory, echoed exactly as the caller wrote it — never resolved. */
  root: string;
  /** The config path, echoed exactly as the caller wrote it — never resolved. */
  config: string;
  result: AuditResult | ConfigErrorResult;
}

export type MarkdownHarnessResponse = CheckResponse | QueryResponse | AuditResponse;

/**
 * The failure variant announces itself; no sibling result declares `error`.
 * Narrow with this before reading any success field.
 */
export function isConfigError(result: object): result is ConfigErrorResult {
  return 'error' in result;
}
```

A discriminated union on `command`, not a generic `Response<T>`: what was asked travels with what
was answered, so two runs of the same corpus under different configs stay distinguishable. `root`
and `path` keep their own names — the two are not the same kind of thing (a directory to walk vs a
path that need not exist). No shared base interface for the one field all three have in common:
`config: string` written three times costs two lines and saves every reader a hop, and a base named
after what the three have in common ends up named after nothing.

### 4.2 `--check`

```ts
export interface CheckResult {
  summary: CheckSummary;
  /**
   * One entry per governed file that has at least one violation, in walker order.
   * Conforming files are absent; invisible files are absent for the stronger reason
   * that nothing ever read them.
   */
  files: readonly FileViolations[];
}

export interface CheckSummary {
  /** Files at least one rule governs — the only count not recoverable from `files`. */
  governedFiles: number;
  /** Governed files carrying at least one violation. Always `=== files.length`. */
  invalidFiles: number;
  /** Sum of `violations.length` across `files`. */
  totalViolations: number;
}

export interface FileViolations {
  /** Root-relative, `/`-separated, no leading `./` or `/`. */
  path: string;
  /** The rule that won this file under first-match (§3.1). */
  ruleId: string;
  /** That rule's `intent`, verbatim — the instruction every fix here is made against (§3.4). */
  ruleIntent: string;
  violations: readonly Violation[];
}
```

`invalidFiles` and `totalViolations` are arithmetic over `files` and are stored anyway, computed at
the point of return so the three cannot disagree: the consumer is an agent, and asking a language
model to sum an array to find out whether anything is wrong is asking the one thing it is least
reliable at. There is deliberately no `invisible` count — a field holding it would be the report
noticing files it promised never to notice. `ruleId`/`ruleIntent` sit on the file, not on each
violation: under first-match, every violation in a file comes from the same rule.

### 4.3 `--query`

`git check-attr` semantics: the entire input is a path string and the config. A path that does not
exist and one that does are answered identically — an agent about to author a file cannot be asked
to write it first and be told afterwards.

```ts
export type QueryResult = GovernedPath | InvisiblePath;

export interface GovernedPath {
  governance: 'governed';
  /** Normalised: `/`-separated, no leading `./` or `/`. */
  path: string;
  /** The rule that won under first-match, and its intent verbatim (§3.4). */
  rule: { ruleId: string; intent: string };
  requirements: Requirements;
}

/**
 * Nothing will ever be reported about this path, by any rule — a claim about the whole config,
 * not a null rule. Note what this is *not*: it does not mean a rule excluded the path. It means
 * no rule selected it in the first place (a rule's own `excludeFiles` can be one reason why).
 */
export interface InvisiblePath {
  governance: 'invisible';
  /** Normalised the same way, so the caller can key on what it gets back. */
  path: string;
}

export type Requirements = NoFrontmatterRequirements | ConstrainingRequirements;

export interface NoFrontmatterRequirements {
  /** The rule declares its paths frontmatter-free; there is nothing else to ask. */
  frontmatter: 'forbidden';
}

export interface ConstrainingRequirements {
  /** Absent by construction — this variant is the one that constrains fields. */
  frontmatter?: never;
  /** One entry per address the rule names, SORTED BY ADDRESS. Always present, `[]` when none. */
  fields: readonly FieldRequirement[];
  /** Present only if the Operator wrote it. Absent is not `'allowed'` spelled differently. */
  unknownKeys?: 'allowed' | 'forbidden';
  /** Present only if the rule carries at least one set constraint. */
  crossField?: {
    exactlyOneOf?: readonly string[];
    anyOf?: readonly string[];
    allOf?: readonly string[];
  };
}

/** One address and everything the rule asks of it — flat, the constraints spread beside `field`. */
export type FieldRequirement = { field: string } & FieldConstraints;
```

The requirements re-expose the config's own vocabulary **verbatim, down to which keys the Operator
did and did not write**. An absent `unknownKeys` stays absent — `allowed` is the language's word,
and an answer that writes it has put a word in the Operator's mouth. The Operator's `intent`
strings travel here in full (§3.4); what is deliberately absent is a rendered `steering:` sentence
of _our_ composing, because whether the config's own key names carry an agent on their own is a
question this payload exists to answer, and a prose fallback would settle it by fiat. `fields` is
the one computed exception (a list the tool builds, sorted), because YAML mapping key order is a
serialization detail nothing may depend on.

Two types rather than one with optional members, on purpose: `governed` guarantees `rule` and
`requirements` are there, and the guarantee is worth more as a type than as a sentence in this
document. Optional members would let an implementation return a governed answer with no
requirements and still typecheck. The JSON is identical either way.

### 4.4 `--audit`

The stated cost of first-match is that **every losing rule is silent** — a rule that wins no file
reports nothing, so an ordering mistake or a glob typo is invisible in exactly the direction a
trust tool cannot afford. `--audit` is the diagnostic: one row per rule, in config order, including
the rules that governed nothing. It is the Operator's instrument — which is why none of this rides
in `--check`, whose reader can act on none of it. Never exits 1: whether an inert rule breaks the
build is the Operator's policy, and a diagnostic that fails the build cannot be run for
information. `--audit` resolves rules against **paths** and never opens a file.

```ts
export interface AuditResult {
  /** One row per rule, in config order — including rules that governed nothing. */
  rules: readonly RuleAudit[];
}

export interface RuleAudit {
  rule: RuleRef;
  /** Files this rule selected, where no rule above it had already taken them. */
  won: number;
  /** Files this rule selected, but a rule above it had already won. */
  shadowed: number;
  /** The winning `ruleId`s, deduped, in config order. Always present, `[]` when none. */
  shadowedBy: readonly string[];
  /** Files this rule selected, but its own `excludeFiles` removed. */
  excluded: number;
}

/** Which rule — plus the only place a selector appears in any response. */
export interface RuleRef {
  ruleId: string;
  /** As written: the `fileName` sugar is reported as sugar, never expanded away. */
  selector: SelectorRef;
  /** The rule's `intent`, verbatim (§3.4). */
  intent: string;
}

export type SelectorRef = { path: readonly string[] } | { fileName: string };
```

### 4.5 Config rejection

```ts
export interface ConfigErrorResult {
  /** The one literal that marks the failure variant; `isConfigError` keys on its presence. */
  error: 'CONFIG_REJECTED';
  /** Every fault validation could find, not the first — a config fails whole (§3.5). */
  faults: readonly ConfigFault[];
}

export interface ConfigFault {
  /** From §3.5's catalog. */
  code: ConfigFaultCode;
  /** The config's own notation, e.g. `frontmatter.rules[3].intent`. */
  location: string;
}
```

A config fault is **result content, not a throw**. A program whose config errors arrive as stack
traces has two output formats, and only one of them is a contract. No `message` beside the fault:
code plus location is a complete basis for the sentence.

### 4.6 Violations

```ts
export type Violation =
  | FieldViolation
  | UnknownKeyViolation
  | FrontmatterForbiddenViolation
  | FrontmatterUnparseableViolation
  | CrossFieldViolation;

/** A constraint on one field failed. */
export interface FieldViolation {
  /** The field address that failed (§3.2). */
  field: string;
  /** ABSENT AS A KEY when the address named nothing at all — see below. */
  value?: FieldValue;
  violation: FieldViolationCode;
  /** The field's constraints, VERBATIM from the config, including any `intent`. */
  requirement: FieldConstraints;
}

/** A top-level key the rule does not name, under `unknownKeys: forbidden`. */
export interface UnknownKeyViolation {
  /** The offending top-level key. */
  field: string;
  value?: FieldValue;
  violation: 'UNKNOWN_KEY_FORBIDDEN';
  /**
   * The one non-verbatim requirement in any response: `allowedKeys` is derived — the top-level
   * segments of the rule's addresses, deduped, in config order — because a Contributor cannot be
   * required to open the config to learn what was permitted.
   */
  requirement: { unknownKeys: 'forbidden'; allowedKeys: readonly string[] };
}

/** The rule declares its paths frontmatter-free, and this file has frontmatter anyway. */
export interface FrontmatterForbiddenViolation {
  /** No single field: the fault is the block's existence. */
  field: null;
  /** The block's top-level keys, so the fix is legible without opening the file. */
  value?: FieldValue;
  violation: 'FRONTMATTER_FORBIDDEN';
  requirement: { frontmatter: 'forbidden' };
}

/**
 * The block exists and does not parse (§4.7). File-level, and outside the eighteen: no field
 * address is at fault and no config fragment failed, so neither `value` nor `requirement` is
 * present — the keys are unknowable and nothing in the config was disobeyed.
 */
export interface FrontmatterUnparseableViolation {
  field: null;
  violation: 'FRONTMATTER_UNPARSEABLE';
}

/** A set constraint failed. `satisfied` is the set, not a count. */
export interface CrossFieldViolationOf<Key extends string, Code extends string> {
  /** No single field: the constraint names a set of addresses. */
  field: null;
  /** Which of the named addresses were satisfied — the set, so the fix is a subtraction. */
  satisfied: readonly string[];
  violation: Code;
  /** The constraint as written: its key, and the addresses it names. */
  requirement: Record<Key, readonly string[]>;
}

export type CrossFieldViolation =
  | CrossFieldViolationOf<'exactlyOneOf', 'EXACTLY_ONE_OF_NONE_PRESENT' | 'EXACTLY_ONE_OF_MULTIPLE_PRESENT'>
  | CrossFieldViolationOf<'anyOf', 'ANY_OF_UNSATISFIED'>
  | CrossFieldViolationOf<'allOf', 'ALL_OF_UNSATISFIED'>;
```

`requirement` is the config fragment that failed, **verbatim** — it already contains the
constraint, its operand, and its `intent` where one was written, so it always shows the whole
picture rather than the one clause that fired (what stops an agent satisfying `presence` on this
run only to fail `pattern` on the next). No `severity`. No `line`/`column` — line attribution is a
property of one YAML library, and for `sources[1].resource` the address is the better locator.

Evidence values:

```ts
export type FieldValue =
  | string
  | number
  | boolean
  | null // the key was written with no value: `description:` then a newline
  | { items: number } // a list: how many entries, never which
  | { keys: readonly string[] }; // a mapping: which keys, never their values
```

**Absence is the key's omission, not `null`.** A violation whose address named nothing has no
`value` key at all, so `value: null` keeps its literal meaning. Containers contribute their size,
never their contents — `sources` is unbounded and violations repeat per file across a corpus.

**Order within one file's `violations` array**, since `--check` orders files by the walker and
`--query` orders fields by address, but neither says anything about what happens inside a single
file:

1. **field violations**, in the config's own `fields:` declaration order; per address, presence
   before shape before `allowed`;
2. **cross-field violations**, in the order `exactlyOneOf`, `anyOf`, `allOf`;
3. **unknown-key violations**, in the frontmatter's own key order.

Declared-field findings group together and the not-declared finding goes last. The choice is
arbitrary; being written down is not. Four independent implementations produced three different
orders and every one of them recorded the ordering as unspecified.

**An entry address over a value that is not a list** — `sources[].id` where the file says
`sources: "text"` — reports one `CONSTRAINT_SHAPE_MISMATCH` at the address as written, and no
per-entry violations. Not silence: the config asked a question the data cannot answer, and a
constraint that reports nothing when it meets the wrong shape is a false negative. Where the
named field is **absent** rather than wrongly shaped, per-entry constraints are vacuous and any
container-level constraint on `sources` itself is what reports.

### 4.7 Violation codes

Discriminated on the **outcome**, never the constraint alone: `presence` fails three
distinguishable ways, and a consumer holding `constraint: 'presence'` cannot tell whether to add
the field or delete it. One code per constraint, and more than one wherever a single constraint
fails in opposite directions.

| code                                                              | fires when                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MISSING_REQUIRED_FIELD`                                          | `presence: required`, address named nothing at all                                                                                                                                                                                                   |
| `EMPTY_REQUIRED_FIELD`                                            | `presence: required`, key written but empty (`''`, `[]`, `{}`, bare key) — the classic YAML trap, a different mistake with a different fix                                                                                                           |
| `FORBIDDEN_FIELD_PRESENT`                                         | `presence: forbidden`, field is there — the fix is deletion                                                                                                                                                                                          |
| `VALUE_NOT_ALLOWED`                                               | `allowed` — value outside the closed set                                                                                                                                                                                                             |
| `FORMAT_MISMATCH`                                                 | `format` — not the named shape; form only, no clock                                                                                                                                                                                                  |
| `PATTERN_MISMATCH`                                                | `pattern` — no match; the mandatory `intent` travels in `requirement`                                                                                                                                                                                |
| `VALUE_TOO_SHORT` / `VALUE_TOO_LONG`                              | `minLength` / `maxLength`, strings only                                                                                                                                                                                                              |
| `TOO_FEW_ITEMS` / `TOO_MANY_ITEMS`                                | `minItems` / `maxItems`, lists only                                                                                                                                                                                                                  |
| `ITEM_TOO_LONG`                                                   | `itemMaxLength` — the address carries the index                                                                                                                                                                                                      |
| `CONSTRAINT_SHAPE_MISMATCH`                                       | a shape-specific constraint met the wrong shape (`maxLength` on a list). **The one code addressed to the Operator** — no markdown edit can fix a misapplied config. Never report `VALUE_TOO_LONG` on a list: an agent would shorten it by characters |
| `UNKNOWN_KEY_FORBIDDEN`                                           | `unknownKeys: forbidden` — a top-level key the rule does not name                                                                                                                                                                                    |
| `FRONTMATTER_FORBIDDEN`                                           | `frontmatter: forbidden` — and the file has frontmatter                                                                                                                                                                                              |
| `EXACTLY_ONE_OF_NONE_PRESENT` / `EXACTLY_ONE_OF_MULTIPLE_PRESENT` | `exactlyOneOf`, failing in its two opposite directions                                                                                                                                                                                               |
| `ANY_OF_UNSATISFIED`                                              | `anyOf`, none satisfied                                                                                                                                                                                                                              |
| `ALL_OF_UNSATISFIED`                                              | `allOf`, at least one missing or empty (§3.3)                                                                                                                                                                                                        |

Eighteen codes. Ship them as a `const` object with a derived union type, not a TypeScript `enum` —
Node's type-stripping runtime rejects `enum` outright. These carry no `CONFIG_` prefix by design:
the audience is the Contributor's agent, and every one of them is fixable by editing markdown.

Two parsing edges the eighteen do not cover. Both are **`FRONTMATTER_UNPARSEABLE`** (§4.6), a
file-level fault of its own kind, and the count above stays at eighteen because this one is not
addressed to a field:

1. the block exists but the bytes between the fences are **not valid YAML** — including a fence
   that never closes;
2. the block parses to **something other than a mapping** — a bare scalar, or a YAML list.

They share one code because they share one fix and one danger: there is no top-level key to read
from either. A broken block that read as "absent" would make a `frontmatter: forbidden` rule
_pass_ on it, and a silent false negative is the one bug a trust tool cannot have.

Precedence, and the details a shape has to settle:

- Under a **constraining** rule, `FRONTMATTER_UNPARSEABLE` is reported **alone**: every field,
  `unknownKeys` and cross-field check is skipped, because none of them are answerable against
  data that never parsed.
- Under **`frontmatter: forbidden`**, the rule's complaint — that there is a block at all — is
  true whether or not the block is well-formed, so `FRONTMATTER_FORBIDDEN` is what fires, with
  its `value` key **omitted** (the block's keys cannot be extracted from bytes that did not
  parse). `FRONTMATTER_UNPARSEABLE` is not additionally reported: deletion is the fix either way.
- An **immediately-closed fence** (`---` then `---`) is not this case. It parses, to `{}`: the
  file has frontmatter for a `forbidden` rule, and an empty mapping for a constraining one — so
  `presence: required` reports `MISSING_REQUIRED_FIELD` rather than being skipped.
- A file with **no fence at all** is likewise not this case. It reads as `{}` under a
  constraining rule, which is what lets `presence: required` fire on a file that never opened a
  block. Only "exists and will not parse" is unparseable.

This was previously delegated ("shape: your choice"). It is settled here because a delegated
shape cannot be compared: four implementations produced `FRONTMATTER_MALFORMED`,
`FRONTMATTER_NOT_YAML` twice and `FRONTMATTER_UNPARSEABLE`, two of them disagreeing about the
`forbidden` precedence above, and the acceptance corpus exercises none of it — every fixture with
frontmatter parses. Nothing about §6's frozen verdict changes: the code is outside the eighteen
and no corpus file reaches it.

## 5. Example transcripts

`mh --check --root fixtures --config fixtures/valid-test-config.yaml` (excerpt):

```json
{
  "command": "check",
  "root": "fixtures",
  "config": "fixtures/valid-test-config.yaml",
  "result": {
    "summary": { "governedFiles": 24, "invalidFiles": 15, "totalViolations": 22 },
    "files": [
      {
        "path": "docs/workflows/terse.md",
        "ruleId": "workflows",
        "ruleIntent": "A workflow names itself and says when to reach for it",
        "violations": [
          {
            "field": "title",
            "value": "ci",
            "violation": "VALUE_TOO_SHORT",
            "requirement": { "minLength": 3, "maxLength": 80 }
          }
        ]
      }
    ]
  }
}
```

Exit 1. — `mh --query docs/reference/api-limits.md`:

```json
{
  "command": "query",
  "path": "docs/reference/api-limits.md",
  "config": "markdown-harness.config.yaml",
  "result": {
    "governance": "governed",
    "path": "docs/reference/api-limits.md",
    "rule": {
      "ruleId": "reference",
      "intent": "Reference pages are looked up by slug and say how far they can be trusted"
    },
    "requirements": {
      "fields": [
        { "field": "draft", "presence": "forbidden", "intent": "Reference material ships finished or not at all" },
        {
          "field": "slug",
          "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$",
          "intent": "Slugs are lowercase words joined by single hyphens"
        },
        {
          "field": "type",
          "presence": "required",
          "allowed": [{ "value": "reference", "intent": "Lookup data an agent consults rather than reads through." }]
        }
      ],
      "unknownKeys": "forbidden"
    }
  }
}
```

Exit 0. A path nothing governs answers `{ "governance": "invisible", "path": "…" }`, exit 0. —
A rejected config, any command:

```json
{
  "command": "check",
  "root": ".",
  "config": "markdown-harness.config.yaml",
  "result": {
    "error": "CONFIG_REJECTED",
    "faults": [{ "code": "CONFIG_EMPTY_RULE_LIST", "location": "frontmatter.rules" }]
  }
}
```

Exit 2.

## 6. Acceptance

The kit ships in the repo and is **not yours to edit**:

- `fixtures/docs/**` — a 25-file synthetic corpus. Every fixture file states its own expected
  verdict in its body text.
- `fixtures/valid-test-config.yaml` — reaches every key of the config vocabulary. Frozen verdict
  against the corpus: `governedFiles: 24`, `invalidFiles: 15`, `totalViolations: 22`, 9 governed
  files conforming, 1 file invisible, and **all 18 violation codes reached**.
- `fixtures/governs-everything-config.yaml` — makes the walker observable (the suite plants a
  corpus containing `node_modules/` for it).
- `fixtures/empty-rule-list-config.yaml` — must be rejected: one fault, `CONFIG_EMPTY_RULE_LIST` at
  `frontmatter.rules`, exit 2.
- `tests/acceptance/**` — the suite. It resolves your entry file from `package.json`'s `bin.mh`,
  spawns `node` on it, and asserts stdout JSON and exit codes, per config. An absent or
  unresolvable `bin.mh` fails the suite before any assertion runs, so declaring it is the first
  thing you do. It also covers: the bare `mh` default, usage rejections (two command flags,
  `--root` with `--query`, an unknown flag), a config path that does not exist
  (`CONFIG_NOT_FOUND`, exit 2), and the invisible-query answer.

`npm run verify` is this repository's gate. It runs the acceptance suite and your tests among
other checks — **read the script rather than assuming its contents**, because what else it runs
differs from repository to repository and the list is not this document's to state. Green means
done.

## 7. Testing

The acceptance suite (§6) is a gate, not your test plan. It spawns the CLI and compares JSON, so it can
tell you _that_ a verdict is wrong and never _where_ — and it is frozen, so it grows no case for
the bug you actually hit. **Unit tests and integration tests of your own are expected**, and their
absence is a defect in the delivery even when `npm run verify` is green.

Work test-first: red, green, refactor. Write the failing test, make it pass, then clean up — and
keep the tests that describe behaviour a caller depends on, not the ones that describe how today's
code happens to be arranged.

Work in vertical slices. Take one command end to end — read a config, resolve one path, emit one
response, exit with one code — before broadening to the next constraint kind.

Each slice ends green, but not on the whole gate from the first slice. The acceptance suite spawns
the CLI and asserts all three commands, so it stays red until the last of them exists: that is the
suite working, not your slice failing. So the per-slice bar is **your own tests, the typecheck, and
every part of `npm run verify` except the acceptance suite**; run the full gate from the first
slice that carries one command end to end, and keep it green from there. Run it often either way —
the alternative is discovering that the contract and the corpus disagree after everything is
written.

Where tests live, how they are named, how they split, and which runner assertions you reach for are
yours.

## 8. The run report

Deliver `RESULTS.md` at the repo root, alongside the code. It is what a reviewer reads before
opening a single source file, and it is the only place your reasoning survives — the diff shows
what you did and never what you decided against.

Four parts:

1. **Summary** — what you built and the shape you built it in, in a few sentences. A reader should
   be able to predict the file layout from this section before seeing it.
2. **Decisions and trade-offs** — the choices this spec left open, what you picked, and what you
   rejected. One or two lines each. This is the section with real value: `presence: required` was
   specified, but where the parsing lives, what the seams are, and which shapes got their own
   types were all yours.
3. **Where the spec ran out** — anything silent, ambiguous, or contradicted by the acceptance
   suite, and what you did about it. A spec gap you worked around silently is a spec gap nobody
   else can fix.
4. **Manual verification** — a short walkthrough a human can follow by hand: the commands to run,
   in order, and what each should print. Not a restatement of the automated suite — the two or
   three observations that would convince a sceptical reader the thing actually works, including
   at least one that ends in a non-zero exit code.

Write it as you go. A report assembled at the end is a report that reconstructs decisions from the
diff, which is exactly the information the diff already had.

## 9. Out of scope

Named so their absence reads as a choice: any long-running service or editor/agent integration
beyond the CLI; rules about markdown **body** content (frontmatter only); staleness or any
clock-consulting check; line/column attribution; severity tiers; config generation, migration, or
"did you mean" suggestions on rejected values; frontmatter syntaxes other than YAML between `---`
fences; performance targets.
