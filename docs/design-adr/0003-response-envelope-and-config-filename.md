---
type: design-adr
status: accepted
---

# The response envelope is a union on `command`, and the config is one file at the repo root

`docs/vision/architecture.md` listed the report format and the config filename as deliberately open.
Building `--query` — the first command end to end — closed both, and neither closure was a fresh
design choice: `docs/evals/ablation/implementation-spec.md` §2 and §4 already fixed them, and the
open list was recording this repo's own uncertainty rather than the specification's. What follows is
therefore a record of what the specification already said plus the two things implementing it
settled that the specification did not.

The report format is `src/packages/response-contract/`. Every command returns an envelope carrying
what was asked alongside what was answered, discriminated on `command`. The config is
`markdown-harness.config.yaml`: exactly one file, at the repo root, resolved from the current
directory and never from `--root`.

## Considered options

**A generic `Response<T>`.** Rejected because the command would stop travelling with the answer. Two
runs of the same corpus under different configs must stay distinguishable once stored, and a payload
that has forgotten which question produced it cannot be compared with one that has not. The union
also lets `root` and `path` keep their own names: a directory to walk and a path that need not exist
are not the same kind of thing, and a shared `target` would have to be documented into two meanings.

**A shared base interface for the field all three envelopes have in common.** Rejected because
`config: string` written three times costs two lines and saves every reader a hop, while a base named
after what the three share ends up named after nothing — `ResponseBase`, `CommonResponse`, and every
other candidate names the mechanism rather than a subject, which `ARCH-004` §4.2 bans for files and
which reads no better on a type.

**`report-contract` as the Package name.** Rejected because the frozen type names in §4 all say
`Response` — `CheckResponse`, `QueryResponse`, `AuditResponse`, `MarkdownHarnessResponse`. Naming the
Package after a word the payload never uses would put a translation step between the specification and
the source. `architecture.md`'s own phrase is "the report format", so `CONTEXT.md` binds that phrase
to this Package rather than renaming either side.

**A stored `message` beside each violation and each fault.** Rejected because it holds one fact twice.
A code, the value found, and the config fragment that failed are a complete basis for every sentence
the tool could say, and two representations of one fact drift. The exception proves the rule: every
`intent` is stored verbatim, because those are the Operator's words rather than ours, and quoting
them is the thing the product exists to do.

**A fallback chain of config filenames** (`.mhrc`, `mh.config.yaml`, a `package.json` key). Rejected
because it needs a precedence rule _between_ files, and a second precedence dimension is exactly what
the one-dimensional first-match design exists to avoid. One file also means a config error names a
file the Operator can open, rather than naming whichever of four candidates happened to win.

**Discovering the config by walking up from `--root`.** Rejected because it makes the config a
property of the corpus rather than of the invocation. `--root` already names the corpus; letting it
also select the rules would mean pointing the tool at a subdirectory silently changes what is being
checked. Spec §2's flag table states the same conclusion as a rule: the config is resolved from the
current directory, **never** `--root`. Bare `mh` therefore reads the config where you stand, the way
`docker compose` finds its own file.

## Consequences

1. **`response-contract` is not types-only, and the map was wrong to say it would be.** Issue #29
   describes it as "the response format, types only". Spec §4.1 mandates
   `export function isConfigError`, and `ARCH-005` §2.2 forbids a `types` file from exporting any
   runtime value. The guard therefore lives in `lib/config-error.pure.ts` and is re-exported from the
   entry point. This is the one place where reading the two records together is not enough — the
   conflict only appears when you try to write the file.
2. **The failure variant announces itself, and the guard keys on presence rather than value.** No
   sibling result declares `error`, so `'error' in result` is sufficient and stays correct if a
   rejection ever arrives with no faults listed. Keying on the `CONFIG_REJECTED` literal instead
   would make the guard disagree with its own doc comment in that case.
3. **Exit code 2 has two flavours and the envelope is what tells them apart.** A usage error puts
   text on stderr and nothing on stdout; a rejected config puts a response on stdout and nothing on
   stderr. A caller reading only the exit code cannot distinguish them and does not need to; a caller
   reading stdout always can. This is why one function decides both channels rather than each write
   site deciding its own.
4. **`path` and `config` travel exactly as the caller wrote them.** A stored response must compare
   equal on another machine, so nothing is resolved to an absolute path anywhere in the envelope.
   The normalised spelling still appears, but inside the result (`GovernedPath.path`) rather than on
   the envelope — the two answer different questions, and a query that echoed only the normalised
   form would lose what was actually typed.
5. **Only `--query`'s result shapes are declared so far.** `CheckResult` and `AuditResult` arrive with
   the phases that implement them. Declaring them now would put unused exports in the entry point,
   which `knip` reports and which would be speculative in the precise sense `ARCH-004` warns about:
   the shape of `CheckSummary.governedFiles` is itself listed as not-yet-specified once a
   body-governing Module exists.

Both items are struck from `architecture.md`'s Deliberately-open list in the same change that records
this, so the list and this file cannot disagree about what is still open.
