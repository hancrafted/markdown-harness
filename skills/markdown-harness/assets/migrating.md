# Migrating to the word commands and the current config

Reference for the `Migrate an existing setup` row of `SKILL.md`.

Two things changed under repositories that already use the tool. The commands became words:
`mh --check` is `mh check`, and the same holds for `query`, `audit` and `assess`. The flag forms were
removed, not aliased, so every gate still carrying one exits 2. The config grammar moved too, and the
current CLI refuses the old keys. A migration lands both changes together with the dependency bump.
Done in parts, the gate breaks in between, and it either fails or reports on nothing.

A script does the mechanical part, and this file covers the parts that need judgement.

## 1. Take the report before touching anything

```sh
node .agents/skills/markdown-harness/scripts/migrate.mjs
```

It writes nothing without `--write`, and it reports JSON:

| Field         | What it holds                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `cli.form`    | `words` or `flags`, read off the installed CLI's own `--help`; `missing` when nothing is in `node_modules`       |
| `baseline`    | what `check` reports today through that CLI: exit code, `governedFiles`, `totalViolations`, or the config faults |
| `invocations` | each retired invocation in `package.json` scripts and `.github/workflows/*.yml`, with its rewrite                |
| `elsewhere`   | the same match in every other tracked file: a husky hook, a `Makefile`, a README. Reported, never rewritten      |
| `config`      | lines carrying a key the current CLI refuses: `glob-selector`, `wildcard-in-selector`, `retired-vocabulary`      |

Keep `baseline`, because step 5 compares against it. It records what the gate covered before anything
moved, and the bump in step 2 can take that away: a config on the glob grammar is still accepted by
the CLI installed today and is refused by the current one.

_Done when_ you hold the report and have told the user its counts in one line: how many invocations,
how many hits elsewhere, how many config lines, and the baseline's `governedFiles`.

## 2. Bump the dependency

```sh
npm install --save-dev @hancrafted/markdown-harness@latest
```

Then re-run the script and read `cli.form`. **`words` is the only state that lets the migration
proceed.** If it still reads `flags`, the latest release predates the word commands. Stop and tell the
user. Every rewrite after this step depends on the new CLI, and `--write` refuses with
`CLI_PREDATES_WORDS` rather than leave a gate that exits 2.

The freshness hook moves with the dependency. `assess-hook.mjs` calls `assess` as a word, so an updated
skill paired with an old dependency leaves a hook that runs and logs `no-answer` on every read.

_Done when_ `cli.form` reads `words`.

## 3. Rewrite the invocations

```sh
node .agents/skills/markdown-harness/scripts/migrate.mjs --write
```

It rewrites `package.json` and the workflow files in place. A retired `--verb` moves to just after the
binary, so `mh --config c.yaml --query p` becomes `mh query --config c.yaml p`, and the other flags
stay as they were. It is safe to re-run: a second pass finds nothing.

Then read `elsewhere`. Every hit there needs a decision, so the script leaves each one alone. A
husky hook or a `Makefile` invokes the CLI, and it gets the same rewrite by hand. A README or a
changelog entry may be describing the old form on purpose, so ask before changing prose.

**Leave the gate unscoped.** `mh check` runs every Module the config declares. `mh frontmatter check`
runs one, and a gate scoped to one Module stays green while the other goes unchecked. Split a CI step
by Module only when the user asks for it, and then give every Module its own step. The `modules`
field in each response names the Modules that ran.

_Done when_ the script's re-run reports no `invocations`, and every `elsewhere` hit is either
rewritten or kept with the user's say-so.

## 4. Translate the config

The current CLI is the authority now. Run `mh check` and read its `faults`: each one names the key to
fix by `location`. The script's `config` lines show the same keys by line number.

- **`glob-selector` or `wildcard-in-selector`**, a `path:`, a `fileName:` or a `*` in a selector, is a
  `frontmatter:` rule on the glob grammar. [`migrating-a-config.md`](migrating-a-config.md) translates
  it rule by rule, and an exclusion translates differently from a selector.
- **`retired-vocabulary`**, a rule-level `vocabulary:` under `body-structure:`, admitted fixed titles
  at a level wherever they appeared. That form is gone. Each title set now belongs in the nested
  `headings:` list of the entry whose section holds those headings, as `allowed` titles. Steps 4 and 5
  of [`authoring-body-structure.md`](authoring-body-structure.md) give the grammar, and the Keep a
  Changelog rule there is the usual translation. Nesting is stricter than the vocabulary was: a
  title written outside its parent's section, which the vocabulary admitted, is now
  `HEADING_UNDEFINED` under `forbid`. Name that change to the user.

A repository with no `body-structure:` section has nothing to migrate there. Adopting one is new
authoring. Offer it after the migration, as its own option.

_Done when_ `mh check` exits 0 or 1. Exit 2 means some fault is still unread.

## 5. Prove the gate on the new form

Run the gate script CI runs, the one step 3 rewrote, and compare it with `baseline`.
`governedFiles` and `totalViolations` should match. Where they do not, the summary names the reason,
for example a rule that lost recursion or an exclusion that now reaches fewer files.

Then break one governed file the way a rule forbids, run the gate, watch it exit 1, and put the file
back. A gate rewritten to `mh check` has not yet been seen to fail, and a misspelled script name
passes just as quietly as a working one.

If the hook is wired, read one governed file and check the fresh row in
`docs/markdown-harness/activity.csv`. A Module state is evidence the hook reached the new CLI.
`no-answer` or `config-rejected` means step 2 or step 4 is not finished.

_Done when_ the gate went red on the broken file and green once it was restored, the counts match
`baseline` or the summary says why not, and the summary lists every file changed.
