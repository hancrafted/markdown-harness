# Putting `mh --check` in the gate

Reference for the "Put `mh --check` in the gate on its own" row of `SKILL.md`.

`mh --check` reports every governed file's violations and sets its exit code from the result. Putting
it in the command CI already runs is what turns "the build is green" into a claim about the corpus
rather than only about the code.

## 1. Find the real gate

Whichever script CI actually runs, which is not reliably the one named `verify`. Look in
`.github/workflows/*.yml` (or the equivalent) for the command it invokes, and read `package.json`
scripts to see what that command chains together. A repository whose CI runs `npm test` and has no
`verify` script gets `mh --check` in `test`; one with a `Makefile` gate gets it there.

Appending to a script nobody runs is the failure mode this step exists to prevent, and it looks
exactly like success.

_Done when_ you can name the script CI runs, having read it rather than assumed it.

## 2. Append the command

```json
{ "scripts": { "verify": "... && mh --check" } }
```

Last in the chain is usually right: the fast, cheap checks fail first, and a corpus report is more
useful once the code is known to compile.

## 3. Let both non-zero exits fail the build

Three exit codes, and the distinction between the last two is the point:

| exit | meaning                                                   | the build should |
| ---- | --------------------------------------------------------- | ---------------- |
| 0    | nothing wrong                                             | pass             |
| 1    | the corpus is wrong — the violations are listed on stdout | **fail**         |
| 2    | it could not report at all — usually a rejected config    | **fail**         |

`--check` is the only command that ever exits 1. Exit 2 is not a stricter 1: **nothing was checked**,
so a 2 that is allowed to pass is a gate that has silently stopped running. Measured against 0.0.2:

```
no markdown-harness.config.yaml    exit 2    CONFIG_NOT_FOUND
frontmatter.rules: []              exit 2    CONFIG_EMPTY_RULE_LIST
rules that match no file           exit 0    governedFiles: 0
one governed file in violation     exit 1
```

`&&` already does the right thing with both, because the shell stops on any non-zero status. So the
work here is refusing two temptations rather than adding anything:

- **Never `mh --check || true`.** That is the "governance drifts while checks stay green" failure the
  tool exists to prevent, written in one command.
- **Never pipe it.** `mh --check | head` puts `head`'s status in `$?` and reports success over a
  failed run. To read the JSON, capture it first: `out=$(mh --check); code=$?`.

## 4. Break something and watch it go red

A gate that has never failed is not yet known to be wired. Delete a required field from one governed
file, run the gate, and confirm it fails with exit 1 — then put the field back.

Do this. A misspelled script name, a `--config` pointing at a path that moved, or an `mh` that is not
on `PATH` in CI all produce a gate that passes without checking anything, and none of them announce
themselves.

_Done when_ the gate fails on a file you broke, and passes once you restore it.

## The first run goes red, and that number is the report

A config that governs files which predate it usually fails on its first run. That count is the real
cost of the rules the user just approved, so give it to them as a number before wiring the gate — not
afterwards through a failing CI run.

Two honest ways forward, and the user picks:

- **Fix the corpus**, when the count is small enough to work through.
- **Narrow the rules** to what is already true, then widen them as the backlog is paid down.
  Governance is opt-in, so a rule that matches less is a smaller promise rather than a broken one.

There is no ignore list, and that is deliberate. The way to exempt a path is a rule that does not
match it, which is visible in the config and reported by `mh --audit`, rather than a suppression that
is visible nowhere.
