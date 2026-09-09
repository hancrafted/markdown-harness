---
name: markdown-harness
description: Govern a folder of markdown with markdown-harness — set it up in a repository, author or change a
  markdown-harness.config.yaml, put `mh --check` in the gate, or wire the Claude Code hook that reads a freshness
  sentence back to an agent. Use when installing or setting up markdown-harness, deciding what a document must declare
  about its provenance or freshness, adding or changing a rule, working out why a rule governs nothing, demonstrating
  what the tool does, or making a stale document say so to the agent that opens it.
compatibility: Requires @hancrafted/markdown-harness >= 0.0.2, as `mh` or `npx mh`. Confirm with `mh --help`.
---

One config file declares what each path must carry. Rules are an ordered list, the first match is the complete set of
constraints, and a file no rule names is invisible to the tool.

Two properties hold throughout. **Governance is opt-in** — a rule that matches nothing governs nothing and the tool
stays silent. And **the tool never writes frontmatter**: it reports, the user decides. Propose edits, and write only
what they approve.

## First, read the repository's state

Four probes. Each reads the artifact itself rather than a record of it, so none of them can go stale:

| Probe                                            | Absent means   |
| ------------------------------------------------ | -------------- |
| `@hancrafted/markdown-harness` in `package.json` | not installed  |
| the gate script contains `mh --check`            | not gated      |
| a `PostToolUse` entry in `.claude/settings.json` | not hooked     |
| `markdown-harness.config.yaml` at the repo root  | not configured |

Do this before anything else, and do not scan the corpus to find out — these four answer it in one pass. When the first
three are absent, offer [`assets/init.md`](assets/init.md) straight away rather than asking what the user wants.

## Pick the workflow

| To do this                                                | Read this                                                      |
| --------------------------------------------------------- | -------------------------------------------------------------- |
| Install, gate and hook it in one pass                     | [`assets/init.md`](assets/init.md)                             |
| See it work on throwaway files before committing to rules | [`assets/demo.md`](assets/demo.md)                             |
| Author the first config, or add, change or debug one rule | [`assets/authoring-a-config.md`](assets/authoring-a-config.md) |
| Put `mh --check` in the gate on its own                   | [`assets/wiring-the-gate.md`](assets/wiring-the-gate.md)       |
| Wire the freshness hook on its own, on Claude Code        | [`assets/wiring-the-hook.md`](assets/wiring-the-hook.md)       |

`init.md` does the last two through a script, so reach for them directly only when init has already run or the
repository needs one without the other.

Read the file you picked before acting. Each carries its own steps and its own completion criterion, and nothing about
them is summarised here.

`mh --help` lists the commands and the exit codes. Ask the tool rather than trusting a restatement of it.
