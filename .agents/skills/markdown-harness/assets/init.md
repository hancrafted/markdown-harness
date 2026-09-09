# Setting the repository up

Reference for the `Set it up — install, gate and hook in one pass` row of `SKILL.md`.

Three things get wired: the dependency, the gate, and — under Claude Code only — the freshness hook.
All three are mechanical, so a script does them and this file covers the one part that is not.

## 1. Decide which script is the gate

This is the whole judgement in the workflow, and it is why a script cannot do it alone. The gate is
whichever command CI actually runs, which is not reliably the one named `verify`.

Read `.github/workflows/*.yml` (or the equivalent) for the command it invokes, then read that script
in `package.json`. A repository scaffolded by `@hancrafted/typescript-ai-harness` already has
`verify`, so extending it is the common case. One that runs `npm test` and has no `verify` should get
`mh --check` in `test` instead.

**A repository with both `verify` and `verify:commit` has already made this decision, and it is not
yours to re-make.** They are different gates: `verify:commit` is the fast pre-commit pass and
`verify` is what CI runs. Pick the one the workflow file names. Measured across four throwaway runs
on 2026-09-09: three picked `verify`, one picked `verify:commit`, and only the workflow file
distinguishes them — the names do not.

Appending to a script nobody runs looks exactly like success. Read CI rather than assuming.

_Done when_ you can name the gate script, quoting the line of the workflow that calls it.

## 2. Run the script

```sh
node .agents/skills/markdown-harness/scripts/init.mjs --gate verify
```

Pass the script you just identified. Add `--dry-run` first if you want to show the user what will
change before it changes — it reports the same steps and writes nothing.

It reports JSON, one entry per step, and every step is skipped when already done. That makes it safe
to re-run after a partial failure, and safe to run on a repository somebody else already set up.

| Step         | What it does                                                                        |
| ------------ | ----------------------------------------------------------------------------------- |
| `dependency` | `npm install --save-dev @hancrafted/markdown-harness`, unless `package.json` has it |
| `gate`       | Appends `&& mh --check` to the named script, or creates it if absent                |
| `folder`     | Creates `docs/markdown-harness/.gitkeep`, so the folder survives a clone            |
| `log`        | Gitignores `docs/markdown-harness/activity.csv`, and writes its first row           |
| `hook`       | Merges a `PostToolUse` entry into `.claude/settings.json`                           |

Two things it deliberately does **not** do. It writes no config — that is the user's, and
[`authoring-a-config.md`](authoring-a-config.md) is how it gets written. And it wires the hook only
when `CLAUDECODE=1`, so on any other host the step reports `skipped` rather than leaving a dead entry
in a settings file that host will never read.

The hook merge is additive. Hook entries merge across settings levels rather than replacing each
other, and identical entries dedupe to one run — so this lands beside a user's own global hook
without either being lost or firing twice.

_Done when_ the report says `"ok": true` and no step reports `failed`.

## 3. Check the hook, because `wired` is not `running`

The `hook` step reports `wired` when the entry is in the settings file. That is a claim about a file
on disk, and it is **not** the claim that this session will run it. The step carries a `check` field
saying so; do what it says rather than reporting the step as done.

Open `/hooks` and look for the entry under `PostToolUse`. A file watcher normally picks settings
edits up without a restart, but it can miss one — the official guide names that failure mode — and
`/hooks` is the read-only viewer that settles it. If the entry is not listed, restart the session.

Measured 2026-09-09: this script reported `{"step":"hook","done":"wired"}` and the hook never ran
again in that session. An agent then reported it as a completed, proven step.

Two things it is worth telling the user now, because both look like bugs later:

- The matcher is `Read`. Opening a file with `Bash cat`, `grep` or `Glob` will never fire the hook.
- Silence is the default. The hook speaks only on a stale file, and it records every run — including
  the silent ones — to `docs/markdown-harness/activity.csv`. That file is how you check it ran.

_Done when_ you have looked at `/hooks` and can say whether the entry is listed.

## 4. Show the user what changed, then prove the gate

Report the five steps in their terms, then run the gate once so the result is real rather than
claimed:

```sh
npm run verify
```

On a repository with no config yet this exits **2**, `CONFIG_NOT_FOUND` — which is correct and worth
naming out loud, because it looks like breakage. Nothing is governed until a config exists, and the
gate is honest about not being able to report rather than passing vacuously.

That is also why the next step matters. Offer both, numbered:

1. **See it work first** — [`demo.md`](demo.md) lays down throwaway files that make `--check`,
   `--assess` and the hook all visible in about a minute, then removes itself.
2. **Go straight to real rules** — [`authoring-a-config.md`](authoring-a-config.md).

Offer the demo to anyone meeting the tool for the first time. Reading what a freshness sentence does
is a much weaker experience than watching one arrive unasked.

_Done when_ the user has seen the gate run, and has picked 1 or 2.
