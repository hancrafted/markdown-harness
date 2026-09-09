# Wiring the freshness hook into Claude Code

Reference for the `Wire the freshness hook on its own, on Claude Code` row of `SKILL.md`.

A rule's `assess.stale` sentence is only ever heard by something that asks. This hook asks, once per
file the agent opens: after every `Read`, it runs `mh --assess` on that path, and when the file is
past its `stale_after` it puts the Operator's own sentence in front of the agent alongside the file.

It is an optional, host-specific layer. Its absence leaves the floor intact — a document carries
`stale_after` in plain sight, and any reader can see it without this hook, without Claude Code, and
whatever the body of the document claims about itself.

## Installing it

**1. Have the skill installed at project scope**, which [`init.md`](init.md) does. The
command below hard-codes the path `.agents/skills/markdown-harness/`, so an install performed with
`--copy` puts the script somewhere else and the hook never runs.

**2. Add the hook** to `.claude/settings.json` at the repository root. That is the one settings file
meant to be committed and shared — `settings.local.json` is gitignored, and `~/.claude/settings.json`
is your machine only.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PROJECT_DIR}/.agents/skills/markdown-harness/scripts/assess-hook.mjs\""
          }
        ]
      }
    ]
  }
}
```

If the file already has a `hooks` key, add the `PostToolUse` entry beside what is there rather than
replacing the object.

**3. Prove it works** before trusting its silence. The hook reads the same payload Claude Code sends,
so you can hand it one yourself — point it at a file you know is stale:

```sh
printf '{"tool_input":{"file_path":"%s"}}' "$PWD/docs/runbooks/some-stale-file.md" \
  | node .agents/skills/markdown-harness/scripts/assess-hook.mjs
```

A JSON object comes back if it would speak, and nothing at all if it would not. **Do this step.** A
mistyped path in `settings.json` leaves the hook silently disabled, and a hook that never fires is
indistinguishable from a corpus that is entirely fresh.

**4. Confirm the session picked it up, which is a separate question from step 3.** A file watcher
normally reads settings edits without a restart, but the official guide names the failure mode
itself: if the entry has not appeared after a few seconds, the watcher may have missed the change and
the session must be restarted to force a reload. Open `/hooks` and look for the entry under
`PostToolUse`. It is a read-only viewer — it cannot add or change anything — but it answers the only
question that matters here, which is whether **this** session will run the hook.

Measured 2026-09-09 in a throwaway repository: `init.mjs` reported `{"step":"hook","done":"wired"}`,
and every `PostToolUse:Read` afterwards resolved to an unrelated plugin hook instead. The entry was
in the file. It was not in the session. **Written is not wired, and wired is not running.**

## What it needs

| Requirement                                      | Why                                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `markdown-harness.config.yaml` above the file    | The hook walks up from the file to find it, and that directory becomes the root    |
| `@hancrafted/markdown-harness` installed locally | Resolved through the package's own `bin.mh`, so a global-only install is not found |
| At least one rule with `assess.stale`            | Without a sentence there is nothing to say, though the evidence still travels      |

The root is found from the **file**, never from the working directory. That is what makes it work in
a git worktree, where `${CLAUDE_PROJECT_DIR}` stays pinned to wherever the session started, and in a
session opened inside a subdirectory.

## It sees the `Read` tool and nothing else

`matcher: "Read"` is an exact tool-name match. The docs are explicit that a matcher of bare letters
matches that tool only — an `"Edit|Write"` matcher "fires only when Claude uses the `Edit` or `Write`
tool, not when it uses `Bash`, `Read`, or any other tool" — and the same holds in reverse here.

**So an agent that opens files with `Bash cat`, `grep`, `head` or `Glob` will never fire this hook,
however correctly it is wired.** Measured 2026-09-09: a session made zero `Read` calls, routed every
file through `Bash`, and then explained confidently how the hook works. The hook could not have run
once.

That is a property of the host harness's tool choice, not something this hook can fix. It is also
why the demo asks the user to say "read this file" in a fresh session rather than leaving the tool
choice open, and why the activity log exists — a hook that could not fire leaves no row, and no row
is a finding.

## It records that it ran, even when it says nothing

Every invocation that finds a config root appends one line to
`docs/markdown-harness/activity.csv`, silent ones included:

```text
time,command,file,result
2026-09-09T15:51:22.118Z,assess,"docs/runbooks/deploy.md",stale
2026-09-09T15:51:40.882Z,assess,"docs/notes/idea.md",fresh
```

`result` is `mh --assess`'s own state — `stale`, `fresh`, `unassessable`, `ungoverned`, `absent` — or
one of this hook's three refusals: `not-installed`, `config-rejected`, `no-answer`. Never a bare
boolean, because "ran and found nothing" and "ran" are different facts.

A `fresh` row is the useful one: it proves the hook ran and chose to stay quiet, which is the one
thing stdout can never show you. **Nothing is written where the tool was not invited** — no config
above the file means no root, and no `docs/markdown-harness/` means the repository never ran init.

It is gitignored by `init.mjs`, capped at 1000 lines and 30 days
(`MARKDOWN_HARNESS_LOG_MAX_LINES`, `MARKDOWN_HARNESS_LOG_MAX_DAYS`; `0` for unbounded). The log does
not log itself: `.csv` fails the hook's own `.md` filter.

## When it speaks, and when it does not

It speaks on one answer and stays silent on every other. Silence is not a failure mode here — it is
the same thing the hook's absence would look like, which is what tenet 11 asks of every layer above
the floor.

| What happened                                         | The hook   |
| ----------------------------------------------------- | ---------- |
| `mh --assess` answered `REVIEW`                       | **Speaks** |
| It answered anything else                             | Silent     |
| Never asked — the file is not `.md`                   | Silent     |
| Never asked — no config anywhere above the file       | Silent     |
| Never asked — `markdown-harness` is not installed     | Silent     |
| Could not answer — rejected config, malformed payload | Silent     |

The answers are `mh --assess`'s to define, not this hook's, so run it yourself on the file in
question rather than reading a copy of its states here.

One silence is worth naming, because it will look like a bug. A governed file that cannot answer —
no `stale_after`, or frontmatter that will not parse — is a repair the author owes, and the hook says
nothing about it. `mh --check` reports it once in your gate; a hook would report it on every read of
every governed file in a corpus that has not adopted `stale_after` yet, and a governance tool that
talks that much gets switched off.

## What the agent is shown

The Operator's sentence travels verbatim on its own line. Everything around it is the evidence the
tool reported, so the agent can check the judgement rather than take it:

```text
markdown-harness: docs/runbooks/deploy.md is past its stale_after.

Re-run these steps against the live system before following them, then move stale_after.

stale_after 2026-01-01T00:00:00Z, assessed at 2026-09-09T15:43:55.206Z. Rule "runbooks": A runbook
that has drifted from the system it describes is worse than none
```

When the winning rule configured no `assess.stale`, the middle line is absent and the rest is
unchanged. The finding is real either way, and this hook writes no sentence of its own to fill the
gap.

The text arrives beside the tool result as context the agent reads on its next turn. It is not a
chat message, and the user does not see it.

One claim worth keeping honest: the published docs we could reach confirm `additionalContext` for
`UserPromptSubmit`, and were truncated before the `PostToolUse` schema. Its use here rests on
measurement rather than on a cited spec — the transcripts show it arriving, and
`src/packages/cli/tests/assess-hook.test.ts` asserts the envelope. If a future release changes it,
the log will still record that the hook ran while the agent stops hearing anything, which is exactly
the pair of facts needed to tell that apart from a fresh corpus.

## It cannot block, and never fails the read

The hook runs on `PostToolUse` — after the read has already happened. There is nothing left to block,
which is the point: the agent asked to read a file and got it, and a layer that turned that into an
error would be worse than no layer. Every refusal inside the hook exits 0 with empty output, and a
malformed payload, a missing install or a rejected config all land there.

## Troubleshooting

**Read `docs/markdown-harness/activity.csv` first.** No rows and a working step 3 narrows this to two
causes in one look, and both are near the top of the table.

| Symptom                                | Cause                                                                                                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No rows in the log at all              | The hook never ran. Either the session has not picked up the settings edit — check `/hooks`, restart if absent — or the agent never used the `Read` tool              |
| No rows, and `/hooks` lists the entry  | The agent is opening files with `Bash cat`, `grep` or `Glob`. A `Read` matcher never sees those. Ask for a `Read` explicitly                                          |
| Rows say `not-installed`               | It ran and found no local `@hancrafted/markdown-harness`. A global-only install is not found, by design                                                               |
| Rows say `config-rejected`             | It ran and the config does not load. `mh --check` reports the faults and their locations                                                                              |
| Rows say `fresh` or `ungoverned`       | It ran and correctly had nothing to say. The corpus is the answer, not the wiring                                                                                     |
| Never says anything                    | Run step 3 by hand. If that speaks, the wiring is wrong; if it is silent, the corpus is                                                                               |
| Silent, and step 3 is silent too       | No config above the file, no local install, or the file is not `.md`                                                                                                  |
| Silent on a file you know is stale     | `mh --query <path>` — check a rule actually selects it, and `mh --audit` for a rule reporting `won: 0`                                                                |
| Speaks with no sentence, only evidence | The winning rule has no `assess.stale`. Add one to that rule, not module-wide                                                                                         |
| Fires on files you do not care about   | The rule's glob is broader than you meant. Narrow it, then re-run `mh --audit`                                                                                        |
| Slows every `Read`                     | Every markdown read spawns one short-lived process. Non-markdown reads cost nothing                                                                                   |
| Worked for one person, nobody else     | The skill was installed with `--copy`, which puts it somewhere per-agent instead of `.agents/skills/`. The command path above is fixed, so reinstall without the flag |

## Reporting back

This is early, and it ships to be argued with rather than adopted quietly. Three things are worth
more than a general impression:

- **A sentence that landed wrong.** Quote the rule's `intent` and its `assess.stale` text, and say
  what you wanted the agent to do instead. That sentence is the whole product surface here.
- **Silence you did not expect.** Include the output of the by-hand check above — it separates a
  wiring problem from a corpus that really is fresh.
- **Noise.** A rule that fires more often than it earns, and the glob behind it.

Open an issue at <https://github.com/hancrafted/markdown-harness/issues> with the label
`needs-triage`, which is this repository's intake label.

## What this deliberately does not do

- **No steering at write time.** `Edit` and `Write` are not matched. Asking what a rule requires
  _before_ a file is written is `mh --query`'s job, and wiring that is a separate decision.
- **No writes, ever.** The hook reads and reports. Moving a `stale_after` is the author's act.
- **No second surface.** This is a hook, not an MCP tool.
- **Not in the npm package.** `npm install` will never put this file in your tree — it arrives with
  the skill. The README says why.
