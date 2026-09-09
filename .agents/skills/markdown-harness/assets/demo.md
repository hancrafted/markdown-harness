# Showing the tool working, on throwaway files

Reference for the `See it work on throwaway files` row of `SKILL.md`.

Three files and one rule, laid into `docs/markdown-harness/demo/`, that make `--check`, `--assess`
and the freshness hook visible in about a minute. Everything it adds is marked, and one command takes
it all back out.

Use it when someone is meeting the tool for the first time. The freshness sentence is the product
surface, and watching one arrive unasked lands differently from reading that it would.

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
rule actually wins and fails loudly unless the answer is `markdown-harness-demo`. If the config had
no config yet, it creates one holding only the demo block.

_Done when_ the report says `"governedBy": "markdown-harness-demo"`.

## 2. Show the two commands

```sh
mh --check
```

Exits **1**, reporting one violation: `incomplete.md` declares no `stale_after`. That is the exit
code that fails a build, so run the gate too and let them watch it go red.

```sh
mh --assess docs/markdown-harness/demo/stale.md
```

Answers `REVIEW`, and carries back the sentence the demo rule configured — not a sentence
markdown-harness wrote. Point at that: the tool supplies the mechanism, the Operator supplies the
words.

## 3. Prove the hook, which is the part worth seeing

**Start a genuinely fresh Claude Code session.** Not `--continue`, not `--resume`: those replay the
saved context from the previous session instead of re-running the hook, so a resumed session shows a
freshness notice from a hook that never fired. That would fake a pass.

In the fresh session, ask it to read `docs/markdown-harness/demo/stale.md` — no mention of freshness,
staleness or markdown-harness in the prompt. Something like _"summarise this file for me."_

The response should say the file is stale without being asked. Nothing in the file's body says so;
the frontmatter did, and the hook carried it.

Then ask it to read `fresh.md` in the same session. Nothing happens, and that contrast is the demo:
the hook is specific rather than noisy. `incomplete.md` is also silent — a missing `stale_after` is
`--check`'s job once in the gate, not the hook's on every read.

**If nothing arrives**, the injected context is model-only — it is never shown in the UI, `Ctrl+O`
shows nothing for a successful hook, and `/hooks` only lists what is configured. So check it directly
rather than looking harder:

```sh
printf '{"tool_input":{"file_path":"%s"}}' "$PWD/docs/markdown-harness/demo/stale.md" \
  | node .agents/skills/markdown-harness/scripts/assess-hook.mjs
```

JSON back means the hook works and the wiring is wrong; silence means the corpus or the install is.
[`wiring-the-hook.md`](wiring-the-hook.md) has the full troubleshooting table. For a running session,
`claude --debug-file <path>` logs which hooks matched, their exit codes and their full output.

_Done when_ a fresh session says `stale.md` is stale unprompted, and says nothing about `fresh.md`.

## 4. Take it back out

```sh
node .agents/skills/markdown-harness/scripts/setup-demo.mjs --remove
```

Deletes the folder and strips the marked block, leaving everything outside the markers byte for byte.
A config that held nothing but the demo is removed entirely rather than left as a husk with an empty
rule list, which the tool rejects with `CONFIG_EMPTY_RULE_LIST`. The `.gitkeep` from init survives.

Offer this before the user commits. The demo is throwaway by design, and a demo rule left in a real
config governs a folder that is about to stop existing.

_Done when_ `git status` shows nothing from the demo, or the user has chosen to keep it deliberately.
