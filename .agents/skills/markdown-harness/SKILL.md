---
name: markdown-harness
description:
  Govern a folder of markdown with markdown-harness — author or change a markdown-harness.config.yaml, put `mh --check`
  in a repository's gate, or wire the Claude Code hook that reads a freshness sentence back to an agent. Use when
  setting markdown-harness up in a repository, deciding what a document must declare about its provenance or freshness,
  adding or changing a rule, working out why a rule governs nothing, or making a stale document say so to the agent
  that opens it.
compatibility: Requires @hancrafted/markdown-harness >= 0.0.2, as `mh` or `npx mh`. Confirm with `mh --help`.
---

One config file declares what each path must carry. Rules are an ordered list, the first match is the complete set of
constraints, and a file no rule names is invisible to the tool.

Two properties hold across every workflow below. **Governance is opt-in** — a rule that matches nothing governs
nothing and the tool stays silent, so a corpus becomes governed by adding rules and never the reverse. And **the tool
never writes frontmatter**: it reports, the user decides. Propose edits, and write only what they approve.

## Pick the workflow

| To do this                                                             | Read this                                                      |
| ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| Set markdown-harness up in a repository that has none of it yet        | [`assets/setup.md`](assets/setup.md)                           |
| Author the first config, or add, change or debug one rule              | [`assets/authoring-a-config.md`](assets/authoring-a-config.md) |
| Make a green build mean something, by putting `mh --check` in the gate | [`assets/wiring-the-gate.md`](assets/wiring-the-gate.md)       |
| Make a stale file say so to the agent that opens it, on Claude Code    | [`assets/wiring-the-hook.md`](assets/wiring-the-hook.md)       |

`assets/setup.md` is the only one that assumes nothing is in place, and it runs the other three in order. Enter the
others directly when the repository already has what they build on.

Read the file you picked before acting. Each carries its own steps and its own completion criterion, and nothing about
them is summarised here — a workflow this file could summarise would not have earned a file.

`mh --help` lists the commands and the exit codes. Ask the tool rather than trusting a restatement of it.
