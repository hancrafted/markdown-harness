# Setting the repository up

Reference for the `Install, gate and hook it in one pass` row of `SKILL.md`.

Three things get wired: the dependency, the gate, and — under Claude Code only — the freshness hook.
All three are mechanical, so a script does them and this file covers the one part that is not.

## 1. Decide which script is the gate

This is the whole judgement in the workflow, and it is why a script cannot do it alone. The gate is
whichever command CI actually runs, which is not reliably the one named `verify`.

Read `.github/workflows/*.yml` (or the equivalent) for the command it invokes, then read that script
in `package.json`. A repository scaffolded by `@hancrafted/typescript-ai-harness` already has
`verify`, so extending it is the common case. One that runs `npm test` and has no `verify` should get
`mh --check` in `test` instead.

Appending to a script nobody runs looks exactly like success. Read CI rather than assuming.

_Done when_ you can name the gate script, having read the workflow that calls it.

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
| `hook`       | Merges a `PostToolUse` entry into `.claude/settings.json`                           |

Two things it deliberately does **not** do. It writes no config — that is the user's, and
[`authoring-a-config.md`](authoring-a-config.md) is how it gets written. And it wires the hook only
when `CLAUDECODE=1`, so on any other host the step reports `skipped` rather than leaving a dead entry
in a settings file that host will never read.

The hook merge is additive. Hook entries merge across settings levels rather than replacing each
other, and identical entries dedupe to one run — so this lands beside a user's own global hook
without either being lost or firing twice.

_Done when_ the report says `"ok": true` and no step reports `failed`.

## 3. Show the user what changed, then prove the gate

Report the four steps in their terms, then run the gate once so the result is real rather than
claimed:

```sh
npm run verify
```

On a repository with no config yet this exits **2**, `CONFIG_NOT_FOUND` — which is correct and worth
naming out loud, because it looks like breakage. Nothing is governed until a config exists, and the
gate is honest about not being able to report rather than passing vacuously.

That is also why the next step matters, and you should offer both:

- **See it work first** — [`demo.md`](demo.md) lays down throwaway files that make `--check`,
  `--query` and the hook all visible in about a minute, then removes itself.
- **Go straight to real rules** — [`authoring-a-config.md`](authoring-a-config.md).

Offer the demo to anyone meeting the tool for the first time. Reading what a freshness sentence does
is a much weaker experience than watching one arrive unasked.

_Done when_ the user has seen the gate run, and has picked the demo or the interview.
