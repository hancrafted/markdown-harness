# Setting markdown-harness up in a repository

Reference for the `Set markdown-harness up` row of `SKILL.md`.

Four steps. The order is load-bearing: both the gate and the hook read a config, so neither does
anything until one exists. Wire the gate first and the build goes red with `CONFIG_NOT_FOUND` —
measured against 0.0.2 — which reads like the tool is broken when it is only early.

Steps 3 and 4 are independent of each other, and each is optional. A repository that stops after
step 2 is genuinely governed; it just has nothing enforcing that at a moment anyone will notice.

## 1. Install the tool and the skill

```sh
npm install --save-dev @hancrafted/markdown-harness
npx skills add hancrafted/markdown-harness
```

Both at project scope, so both are committed and every clone and CI run has them. **Never `--copy`**
on the skill: it creates independent per-agent copies, and step 4 wires a fixed path into settings
that copy mode breaks.

Confirm the CLI answers before going on — `npx mh --help` exits 0 and names four commands. Node must
be in the range `package.json` declares; outside it the command refuses and prints the range, which
is a refusal rather than a bug.

_Done when_ `npx mh --help` exits 0.

## 2. Author the config

The interview, the query loop and the audit are one workflow of their own:
[`authoring-a-config.md`](authoring-a-config.md). Run it, then come back.

Do not skip ahead to steps 3 and 4 with a config that is not yet accepted. The completion criterion
here is a `mh --check` that exits **0 or 1, and never 2** — 0 and 1 are answers about the corpus,
while 2 means the config was rejected and nothing was checked at all.

_Done when_ `mh --check` exits 0 or 1, and the user has approved what the config governs.

## 3. Put `mh --check` in the gate

So that a green build starts making a claim about the corpus and not only about the code:
[`wiring-the-gate.md`](wiring-the-gate.md).

Skip it only when the repository has no gate at all. If CI runs anything, this is where governance
stops depending on somebody remembering to run it.

_Done when_ the gate command contains `mh --check` and fails on a file you deliberately break.

## 4. Offer the freshness hook

Only on Claude Code, and only when at least one rule carries an `assess.stale` sentence — without one
there is nothing for the hook to say: [`wiring-the-hook.md`](wiring-the-hook.md).

This is the one step that is host-specific, so treat it as an offer rather than a step. Its absence
leaves the floor intact: a document carries `stale_after` in plain sight, and any reader sees it
without the hook, without Claude Code, and whatever the body of the document claims about itself.

_Done when_ the by-hand check in that file prints a sentence for a file you know is stale, or the
user has declined the hook.

## What the repository has at the end

- `markdown-harness.config.yaml` at the root, committed, governing paths the user chose.
- `@hancrafted/markdown-harness` in `devDependencies`, and the skill under `.agents/skills/`.
- `mh --check` inside the gate CI already runs, failing the build on exit 1 and exit 2 alike.
- Optionally, a `PostToolUse` entry in `.claude/settings.json`.

Report the current `mh --check` count to the user at the end. On a corpus that predates its rules
that number is usually not zero, and it is the real cost of the rules they just approved rather than
a setup failure.
