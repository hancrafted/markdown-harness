# Showing the tool working, on throwaway files

Reference for the `See it work on throwaway files before committing to rules` row of `SKILL.md`.

Three files and one rule, laid into `docs/markdown-harness/demo/`, that make `--check`, `--assess`
and the freshness hook visible in about a minute. Everything it adds is marked, and one command takes
it all back out.

Use it when someone is meeting the tool for the first time. The freshness sentence is the product
surface, and watching one arrive unasked lands differently from reading that it would.

**Read step 3 before you start.** This workflow hands off to the user partway through and stops. The
demo is not proven by this script, by you, or by anything you can run in this session.

## 1. Lay it down

```sh
node .agents/skills/markdown-harness/scripts/setup-demo.mjs
```

It copies the three files, then adds one rule to the **root** config between two markers:

```text
    # --- BEGIN markdown-harness demo ---
    ...the demo rule...
    # --- END markdown-harness demo ---
```

The rule goes in the root config because that is the only place the hook will read — it walks up from
the file it was handed, stops at the first `markdown-harness.config.yaml`, and resolves the CLI from
`node_modules` beside _that_ directory. A config nested in the demo folder therefore finds no
package and the hook goes silent on a file that is genuinely stale. Measured 2026-09-09.

It is inserted **first** in the rule list, because rules are first-match and a broader rule above it
would swallow the demo paths. The script does not trust its own YAML edit: it asks `mh --query` which
rule actually wins and fails loudly unless the answer is `markdown-harness-demo`. If the repository
had no config yet, it creates one holding only the demo block.

It also appends a `demo,…,installed` row to `docs/markdown-harness/activity.csv`. That row is the
**boundary**: step 4 asks whether an `assess` row landed after it, and nothing before it counts.

**None of the three files mentions freshness, staleness or this tool.** That is deliberate. The
previous corpus said "this file is stale" in its own prose, so a model summarising it repeated the
prose and everyone read that as the hook working.

| File                      | What it is                        | What the tool answers       |
| ------------------------- | --------------------------------- | --------------------------- |
| `tomorrows-weather.md`    | a forecast, no dates in the prose | `REVIEW`                    |
| `einstein-on-insanity.md` | a truism about repetition         | `PROCEED`                   |
| `coffee-machine.md`       | a descaling procedure             | `FIX_FILE`, and `--check` 1 |

The pairing is semantic: a forecast perishes, a truism does not, and a coffee machine is genuinely
ambiguous. The third is the interesting one — it declares no `stale_after` at all, and the tool
refuses to guess, reporting that the file made no claim rather than calling it sound.

_Done when_ the report says `"governedBy": "markdown-harness-demo"`.

## 2. Show the two commands

```sh
mh --check
```

Exits **1**, reporting one violation: `coffee-machine.md` declares no `stale_after`. That is the exit
code that fails a build, so run the gate too and let them watch it go red.

```sh
mh --assess docs/markdown-harness/demo/tomorrows-weather.md
```

Answers `REVIEW`, and carries back the sentence the demo rule configured — not a sentence
markdown-harness wrote. Point at that: the tool supplies the mechanism, the Operator supplies the
words.

## 3. Hand the runbook over, then stop

The next step needs a second terminal and a session you are not in. Give the user these four
instructions, and **wait**:

1. Open a second terminal in this repository.
2. Start a **genuinely fresh** Claude Code session there. Not `--continue`, not `--resume`: those
   replay saved context instead of re-running the hook, so a resumed session can show a freshness
   notice from a hook that never fired.
3. Ask it to **open** `docs/markdown-harness/demo/tomorrows-weather.md` — something like _"read this
   file and summarise it for me."_ Say nothing about freshness, staleness or markdown-harness. It has
   to use the `Read` tool: the hook's matcher is `Read`, so `cat` and `grep` never reach it.
4. Come back here and say what happened.

**Stop here.** Do not offer to remove the demo, do not report the demo as working, and do not run
anything else in the meantime. A script that exited 0 has laid files down; it has not shown anybody
anything.

_Done when_ the user has gone away to do this and come back.

## 4. On their return, verify from the log

Their impression is worth having, and it is not the criterion. Read the file:

```sh
cat docs/markdown-harness/activity.csv
```

One row per invocation that found a config root, oldest first, including the silent ones — a `fresh`
row means the hook ran and chose to say nothing. Find the `demo,…,installed` row from step 1 and read
what came after it:

| What is after the marker                             | What it means                                                                |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| an `assess` row for the weather file, result `stale` | It fired and it spoke. This is the pass                                      |
| no rows at all                                       | The hook never ran: the session predates the wiring, or the agent used `cat` |
| a `not-installed` row                                | It ran, and found no local `@hancrafted/markdown-harness` to answer          |
| a `config-rejected` row                              | It ran, and the config is currently broken — `mh --check` will say how       |

If the reply quoted the rule id `markdown-harness-demo`, that settles it on its own. The id appears
in the config and in none of the three files, so there is nowhere else it could have been read from.

If there are no rows, [`wiring-the-hook.md`](wiring-the-hook.md) has the troubleshooting table, and
the by-hand check there separates a wiring problem from a corpus problem in one command.

_Done when_ you have named which of the four rows you found, quoting it.

## 5. Then offer, numbered

Only now, and only after step 4 gave an answer:

1. Remove the demo and move on to real rules — [`authoring-a-config.md`](authoring-a-config.md).
2. Keep it for now, and remove it before committing.

```sh
node .agents/skills/markdown-harness/scripts/setup-demo.mjs --remove
```

Deletes the folder and strips the marked block, leaving everything outside the markers byte for byte.
A config that held nothing but the demo is removed entirely rather than left as a husk with an empty
rule list, which the tool rejects with `CONFIG_EMPTY_RULE_LIST`. The `.gitkeep` and the activity log
from init both survive.

The demo is throwaway by design, and a demo rule left in a real config governs a folder that is about
to stop existing.

_Done when_ `git status` shows nothing from the demo, or the user has chosen to keep it deliberately.
