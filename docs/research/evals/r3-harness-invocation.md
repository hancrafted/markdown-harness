---
type: research
---

# R3 — Invoking Host harnesses headless for steering evals

Measured 2026-10-07 on macOS, Claude Code 2.1.285 and Antigravity CLI (`agy`) 1.3.0, both on Han's existing subscriptions. Every "Measured" label below names a live probe run under `/private/tmp/claude-501/r3-probe-*`; every "Documented" label names something read from `--help`, the binary's embedded docs, or this repository, and not run. Nothing here uses an API-key provider. The generic LLM endpoint is a separate research item and is not covered.

The eval shape this serves: mint a throwaway root (a `markdown-harness.config.yaml`, an `AGENTS.md`, optionally a Claude Code hook in `.claude/settings.json`, a seed file), run a Host harness headless in it with a writing task, then read back the files it left and match a regex marker.

## Verdict

| Host harness        | Headless viable                                                                                     | Auth                                                       | Hook in a minted root                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| Claude Code         | Yes, mature: `-p`, `--output-format stream-json`, `--include-hook-events`, `--max-turns`, `--model` | Subscription OAuth, `apiKeySource: none` in the init event | Yes. Measured firing in `-p` mode; the agent saw the `additionalContext` |
| Antigravity (`agy`) | Yes: `-p`, `--output-format json\|stream-json`, `--print-timeout`, `--model`. No turn cap flag      | Google OAuth from `~/.gemini/`, no API key                 | Documented only (`.agents/hooks.json`). Not probed                       |

Biggest isolation risk, Claude Code: the default invocation loads Han's whole user environment (8 plugins, 74 skills, 19 MCP servers including 17 claude.ai account connectors, `~/.claude/CLAUDE.md`, user hooks). Measured: the same trivial prompt saw 0 skills and 0 MCP servers with `--setting-sources project --strict-mcp-config --disable-slash-commands`, and 74 skills and 19 MCP servers without. For `agy` there is no equivalent flag, and the user-level `~/.gemini/config/hooks.json` and skills are read from `$HOME`; the only isolation lever found (`HOME=...`) also drops auth.

## 1. Claude Code

### Non-interactive form

Measured working command, run from inside the minted root. The `env -u` list is not optional in this environment, see "Environment leaks" below.

```sh
env -u ANTHROPIC_BASE_URL -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_SESSION_ID \
    -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_EXECPATH -u CLAUDE_CODE_MESSAGING_SOCKET \
    -u CLAUDE_CODE_MESSAGING_TOKEN \
  claude -p "<task>" \
    --output-format stream-json --verbose --include-hook-events \
    --max-turns 4 --no-session-persistence --model sonnet \
    --setting-sources project --strict-mcp-config --disable-slash-commands \
    --permission-mode acceptEdits < /dev/null
```

Flags, all from `claude --help` and all exercised above:

| Flag                                      | Role                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| `-p`, `--print`                           | Non-interactive. Skips the workspace trust dialog, so the root is trusted implicitly       |
| `--output-format text\|json\|stream-json` | `stream-json` requires `--verbose` with `-p` (measured: used together throughout)          |
| `--include-hook-events`                   | Adds `hook_started` / `hook_response` system events to the stream. Only with `stream-json` |
| `--max-turns N`                           | Turn cap. Measured: a 2-turn run reported `num_turns: 2` in the result event               |
| `--max-budget-usd`                        | Cost cap. Listed in help, not exercised. Meaningless on a subscription except as a guard   |
| `--no-session-persistence`                | No transcript saved under `~/.claude/projects/`. Keeps the user's session list clean       |
| `--permission-mode acceptEdits`           | Lets `Write`/`Edit` run unprompted. Measured: `Write` succeeded and the hook fired         |
| `--permission-prompts none`               | Documented: anything that would prompt is denied. Not exercised                            |
| `< /dev/null`                             | Without it Claude waits 3 seconds and warns `no stdin data received` (measured, stderr)    |

Do not use `--dangerously-skip-permissions` for steering evals unless the task needs `Bash`; `acceptEdits` covers file writes and keeps the permission surface smaller.

### Exit code and output shape

Measured exit code 0 on success. The stream is newline-delimited JSON. Event order seen in the hook probe:

1. `{"type":"system","subtype":"commands_changed",...}` (an early event, sometimes first)
2. `{"type":"system","subtype":"init",...}` carrying `cwd`, `model`, `permissionMode`, `apiKeySource`, `claude_code_version`, `tools`, `mcp_servers`, `plugins`, `skills`, `slash_commands`, `agents`, `memory_paths`
3. `assistant` events whose `message.content[]` hold `text` and `tool_use` blocks
4. With `--include-hook-events`: `{"type":"system","subtype":"hook_started","hook_name":"PostToolUse:Write",...}` then `hook_response` whose `output` field is the hook's stdout verbatim
5. `user` events (tool results), `rate_limit_event`
6. A final `{"type":"result","subtype":"success","is_error":false,"num_turns":2,"total_cost_usd":...,"modelUsage":{...},"terminal_reason":"completed","result":"<final text>"}`

Failure shape, measured: a run that cannot authenticate still exits 0 and prints a `result` event with `terminal_reason: "api_error"` and `result: "Not logged in · Please run /login"`. A harness must therefore check `is_error` and `terminal_reason`, never the exit code alone.

### Wall-clock and cost, measured

| Probe                                    | Wall clock                       | Turns | `total_cost_usd` |
| ---------------------------------------- | -------------------------------- | ----- | ---------------- |
| One-line answer, no tools, isolated      | 11 to 16 s                       | 1     | 0.011 to 0.017   |
| `Write` plus hook plus answer            | not timed separately, under 30 s | 2     | 0.023            |
| Same one-line answer, no isolation flags | not timed                        | 1     | 0.060            |

`total_cost_usd` is a notional API-equivalent price. On a subscription it is not billed per call, but it counts against the subscription's rate limit, and a `rate_limit_event` appears in the stream. The unisolated run cost roughly 5 times the isolated one because the user's skills and MCP tool list inflate the prompt, which is a second reason to isolate.

Time to first token was about 10 s even for a one-line answer (`ttft_ms: 10828`). Budget at least 15 s per cell for the cheapest run and plan for 30 to 60 s when tools are used.

### Working directory

Measured: the init event's `cwd` equals the directory the process was started in. There is no `--cwd` flag in the help output, so the harness spawns with `cwd` set (Node `spawn({cwd})`). `--add-dir` adds extra directories to tool access and to CLAUDE.md discovery only when `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` is set (name seen in the binary, not exercised).

### Does it walk up parent directories

Measured: yes. The probe ran in `r3-probe-a/child/`, which has no instruction file of its own, and the model reported `CLAUDEMD-SECRET-4410`, a string that exists only in the parent's `CLAUDE.md`. So a root minted anywhere beneath a directory holding a `CLAUDE.md` inherits it. This includes the repo's own checkout: `/Users/han/Developer/markdown-harness/CLAUDE.md` is a symlink to `AGENTS.md`, so a root minted under `.worktrees/` or under the repo would inherit this repo's whole instruction set.

Where a mint stays isolated:

- `/private/tmp/claude-501/...` (used here). Measured: `/private/tmp`, `/private`, and `/` hold no `CLAUDE.md` or `AGENTS.md`.
- `~/Developer/mh-e2e/` (the `setup-local-e2e-repo` default). Measured: `/Users/han/Developer/` and `/Users/han/` hold no `CLAUDE.md` or `AGENTS.md`, and `mh-e2e` is a sibling of `markdown-harness`, not a child. Safe today; a later `~/CLAUDE.md` would silently change that, so the harness should assert the parent chain is clean at mint time rather than assume it.
- Never under the repo checkout, never under `.worktrees/`.

There is a single fully hermetic switch, `CLAUDE_CODE_DISABLE_CLAUDE_MDS` (name present in the binary; not exercised), but it would also switch off the root's own `AGENTS.md`, which is the thing under test. Do not use it.

### Keeping user-level state out

Measured, with the isolation flags on versus off (same prompt, same minted tree, run from `r3-probe-a/child`):

|                                          | `--setting-sources project --strict-mcp-config --disable-slash-commands` | no flags                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Plugins in init event                    | `cc-plugin-agents-md`, `cc-plugin-telemetry` (both builtin)              | 8, including archgate, mattpocock-skills, ui-ux-pro-max, warp |
| Skills                                   | 0                                                                        | 74                                                            |
| MCP servers                              | 0                                                                        | 19 (headroom, tokensave, 17 claude.ai connectors)             |
| `~/.claude/CLAUDE.md` (RTK instructions) | Not seen (model answered "no" to RTK)                                    | Seen ("yes")                                                  |
| Tools                                    | 25                                                                       | 37                                                            |

What each lever does, and what it does not:

| Lever                           | Effect                                                                                                                                                                      | Keeps subscription auth                                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `--setting-sources project`     | Drops user and local settings: user hooks, user `CLAUDE.md`, user plugins, user permissions. Project `.claude/settings.json` still loads (measured: the project hook fired) | Yes (measured)                                                                                                                      |
| `--strict-mcp-config`           | Ignores every MCP source except `--mcp-config`. This is what removed the claude.ai connectors, which are account-level and not in any file                                  | Yes (measured)                                                                                                                      |
| `--disable-slash-commands`      | Disables all skills                                                                                                                                                         | Yes (measured)                                                                                                                      |
| `CLAUDE_CONFIG_DIR=<empty dir>` | Removes everything under `~/.claude`                                                                                                                                        | **No.** Measured: `Not logged in · Please run /login`. The OAuth credential is bound to the default config directory                |
| `--bare`                        | Skips hooks, CLAUDE.md discovery, keychain                                                                                                                                  | **No.** Documented in help: auth is strictly `ANTHROPIC_API_KEY` or `apiKeyHelper`; OAuth and keychain are never read. Rules it out |
| `--safe-mode`                   | Disables CLAUDE.md, hooks, skills, plugins, MCP                                                                                                                             | Yes (documented), but it disables the root's own `AGENTS.md` and hook, so it cannot be used for steering                            |
| `--restricted`                  | Ignores user, project and local settings files                                                                                                                              | Not tested. Ignores the project settings too, so it kills the hook under test                                                       |

Residual leaks that survive `--setting-sources project`, none of which touch the instruction text the model reads but all of which are real:

- Managed (policy) settings still apply, and `~/.claude/policy-limits.json` exists on this machine. The init event does not say what it contained. Record `claude --version` and the init event per cell so a policy change shows up as a diff.
- Auto-memory: the init event reported `memory_paths.auto` as `/Users/han/.claude/projects/<mangled-cwd>/memory/`. The probe did not test whether a memory file already there is read. The `CLAUDE_CODE_DISABLE_AUTO_MEMORY` variable exists in the binary and is the lever to try; a fresh throwaway cwd has no memory directory, which is the practical protection.
- Builtin plugins `cc-plugin-agents-md` and `cc-plugin-telemetry` always load. The first is what reads `AGENTS.md` (next section).

Subscription auth leak to guard against in the other direction: if `ANTHROPIC_API_KEY` is set in the spawning environment the run would bill an API key instead of the subscription. It is not set here (checked by name only), but the harness should unset it explicitly and then assert `apiKeySource` is `none` in the init event.

### Environment leaks to strip

This session's environment sets `ANTHROPIC_BASE_URL` to a local proxy on `127.0.0.1:8787` and a set of `CLAUDE_CODE_*` session variables inherited from the orchestrating Claude Code session. A child `claude` spawned from inside another Claude Code session inherits them. The probes unset them and ran straight against the subscription, so the data above is for that case. If the orchestrator leaves `ANTHROPIC_BASE_URL` in place, eval traffic goes through whatever the proxy is and the cohort is no longer "plain subscription". The harness should spawn with an explicit allow-list environment (`PATH`, `HOME`, `LANG`, `TERM`) rather than a deny-list, and assert the init event's `apiKeySource: "none"`.

### AGENTS.md and hooks in a minted root

`AGENTS.md` is read natively. Measured: a root holding only `AGENTS.md` produced `AGENTSMD-CODEWORD-7731` in the answer, via the builtin `cc-plugin-agents-md` plugin.

Measured and important: when a root holds both `CLAUDE.md` and `AGENTS.md`, the model reported the `CLAUDE.md` secret and `NONE` for the `AGENTS.md` codeword. So `CLAUDE.md` takes precedence over `AGENTS.md` in the same directory, and `AGENTS.md` is a fallback, not an addition. Consequence for the eval: a minted root must hold exactly one of the two at each directory level, and the harness should say which, because a stray `CLAUDE.md` from a template silently hides the file under test. (The repo's own convention, `CLAUDE.md` as a symlink to `AGENTS.md`, is fine: it is the same bytes.)

Hooks load from the root's `.claude/settings.json` under `--setting-sources project`. Measured: a `PostToolUse` hook with `matcher: "Write"` emitting `{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"HOOKWORD-9920..."}}` fired once after the `Write`, the stream showed `hook_started` then `hook_response` with that exact JSON as `output`, and the model quoted `HOOKWORD-9920` in its answer. This closes the gap named in `.agents/skills/markdown-harness/assets/wiring-the-hook.md`, which says the `PostToolUse` `additionalContext` envelope rests on transcripts; it now also rests on a headless run.

Against `docs/agents/verification.md` trap 10: in headless mode the "watcher may have missed the write" failure cannot occur, because settings are read once at process start and the file already exists. The second half of trap 10 stays fully live: a `Read` matcher never sees `Bash cat`, and a `Write` matcher never sees `Bash` redirects. An eval cell that expects a hook to fire must either force the tool (prompt: "use the Write tool") or treat "hook did not fire" as a measurement, not a harness fault. The proof it fired is the `hook_started` event, or `docs/markdown-harness/activity.csv` when the real `assess-hook.mjs` is wired; never the settings file.

### Reading back the tree

The process leaves files in its cwd and exits. Measured: `git status --short` in the root after the run showed exactly `?? note.md`, and `cat note.md` returned `hello`. Mint the root as a git repo with the seed committed, then `git status --porcelain` plus `git diff` (and `git ls-files --others --exclude-standard` for untracked files) is the full readback. Reading `.git` rather than walking the tree catches deletions and renames too. The stream also names every `Write`/`Edit` target in `tool_use` blocks, which is a cross-check, not a substitute: a `Bash` redirect writes files without a `Write` event.

Whether `--no-session-persistence` fully suppresses writes under `~/.claude` (project entries, memory) was not checked; treat `~/.claude` as writable shared state.

### Model selection and recording

`--model sonnet` takes an alias or a full name. Measured: the alias resolved to `claude-sonnet-5-5`, visible in three places in the stream: the init event's `model`, each assistant event's `message.model`, and the result event's `modelUsage` keys. Record all of: `claude_code_version` from init, resolved `model` from the result's `modelUsage` keys (the authoritative one, because a `--fallback-model` or overload fallback can change it mid-run), `permissionMode`, `apiKeySource`, `--effort` if set (`low|medium|high|xhigh|max`), and the counts of `skills`, `mcp_servers`, `plugins`. The env var `CLAUDE_CODE_SUBAGENT_MODEL` was set in the spawning environment and would change subagent models; the allow-list environment above removes it.

## 2. Antigravity (`agy`)

Real binary is `/opt/homebrew/bin/agy` (`type -a agy` shows only the alias plus this path), version 1.3.0. Han's shell alias adds `caffeinate -s` and `--dangerously-skip-permissions`; the harness must call the binary by absolute path and pass its own flags, not rely on the alias (non-interactive spawns do not load aliases anyway).

### Non-interactive form

Measured working command:

```sh
/opt/homebrew/bin/agy -p "<task>" \
  --output-format stream-json --model gemini-3.8-flash-low \
  --dangerously-skip-permissions --print-timeout 120s < /dev/null
```

| Flag                                                                                               | Role                                                                                                      |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `-p`, `--print`, `--prompt`                                                                        | Run one prompt non-interactively and print the response                                                   |
| `--output-format text\|json\|stream-json`                                                          | Measured both `json` (single object) and `stream-json` (NDJSON)                                           |
| `--input-format stream-json`                                                                       | Documented: one NDJSON message per stdin line, one turn each                                              |
| `--print-timeout`                                                                                  | Wall-clock limit; `0` waits for the turn to complete. Measured accepted as `120s`                         |
| `--dangerously-skip-permissions`                                                                   | Measured required for writes, see below                                                                   |
| `--mode accept-edits\|plan`                                                                        | Documented. Not exercised: whether it avoids the denial below without skipping all permissions is unknown |
| `--model <id>`                                                                                     | Ids from `agy models`                                                                                     |
| `--effort`, `--json-schema`, `--sandbox`, `--add-dir`, `--project`, `--conversation`, `--continue` | Present in help                                                                                           |
| (none)                                                                                             | There is no turn or budget cap flag. `--print-timeout` is the only bound                                  |

Measured without `--dangerously-skip-permissions`: exit 0, no file written, one stderr line `jetski: no output produced — a tool required the "write_file" permission that headless mode cannot prompt for, so it was auto-denied. Add an allow-rule under permissions.allow in settings.json (e.g. write_file(<target>)). Alternatively, re-run with --dangerously-skip-permissions`. Exit 0 over a task that did nothing is the same shape as the Claude auth failure: check stderr and the `result.status`, never the exit code. The permission allow-list lives in the user-level `~/.gemini/antigravity-cli/settings.json`; Han's already holds a long `permissions.allow` list of `command(...)` entries, which would make permissions behave differently from a clean machine. `--dangerously-skip-permissions` sidesteps that, at the cost of no permission gate.

### Output shape, measured

`stream-json` is NDJSON with an `event` discriminator, different from Claude's `type`:

1. `{"event":"init","init":{"model":"gemini-3.8-flash-low","cwd":"<root>","tools":[...~60 names...],"permission_mode":"always-proceed"},"conversation_id":...}`. The tool list has 60-odd entries including `write_to_file`, `view_file`, `run_command`, `grep_search`, browser tools, `search_web`, `call_mcp_tool`, `schedule`
2. `{"event":"step_update","step_update":{"step_index":N,"state":"ACTIVE|DONE","step_type":"user_input|agent_response|tool","tool_name":...,"tool_info":{"parameters":{"TargetFile":...}},"text_delta":...,"usage":{...}}}`
3. `{"event":"result","result":{"status":"SUCCESS","response":"<final text>","num_turns":1,"duration_seconds":7.4,"usage":{"input_tokens":26718,"output_tokens":305,...}}}`

With `--output-format json` the output is the inner result object alone: `{"conversation_id","status":"SUCCESS","response","duration_seconds","num_turns","usage"}`. There is no cost field. No hook events were in the stream (no hooks were wired in that root).

Wall clock, measured: 7.2 s for a tool-using run with the low-effort flash model; 1.9 s reported for a no-tool answer. Much faster than Claude Code, and no 10 s time to first token.

### Working directory and parent walk

Measured: init's `cwd` equals the spawn directory. There is no `--cwd` flag. `--add-dir` adds workspace directories, `--project` selects an Antigravity project; a fresh cwd is accepted without either.

Measured: parent walk yes, for `AGENTS.md`. Run from `r3-probe-a/child/`, the model reported the parent's `AGENTS.md` codeword as present (`Yes`) and the parent's `CLAUDE.md` secret as absent (`No`). So `agy` reads `AGENTS.md` (and, per the embedded docs, `GEMINI.md` and `.agents/rules/*.md`) hierarchically up the tree, and does not read `CLAUDE.md`. The isolation rule for mint location is therefore the same as for Claude Code, with `AGENTS.md` as the file that matters; a `CLAUDE.md` is invisible to it, which makes this repo's symlink convention work for both.

### Keeping user-level state out

No isolation flag exists. `agy --help` lists none equivalent to `--setting-sources` or `--strict-mcp-config`. What the binary and `$HOME` show:

- User settings: `~/.gemini/antigravity-cli/settings.json` (model, a long permissions allow list).
- User hooks: `~/.gemini/config/hooks.json` exists on this machine and holds one hook (`PreInvocation` running a shell script). Per the embedded docs, hooks "from different plugins or configs" merge and run sequentially, so a user hook runs in every eval cell and adds latency and side effects that nobody put in the cell's design. Not probed live whether it fired in headless mode.
- User skills: `~/.gemini/antigravity-cli/skills/` holds symlinks into `~/.claude/plugins/cache/...` (archgate skills). Same leak, by symlink, from the Claude Code plugin cache.
- User MCP: `~/.gemini/config/mcp_config.json` exists (content did not parse as JSON in this check).
- Account-level plugins under `~/.gemini/antigravity-cli/plugin_data`.

Measured: `HOME=/private/tmp/claude-501/r3-home agy ...` isolates all of that and also drops authentication: output was `Authentication required. Please visit the URL to log in: https://accounts.google.com/o/oauth2/auth?...` and the process waits for a browser. So `HOME` override is not viable on subscription auth unless the harness copies the OAuth token files into a scratch `HOME`. Files seen: `~/.gemini/jetski-standalone-oauth-token` and `~/.gemini/antigravity-cli/antigravity-oauth-token`. That copy was not tried and is the one open path to hermetic `agy` runs; whether the credential is also bound to the Keychain is unknown. Strings in the binary name `AGY_LLM_GATEWAY_API_KEY` and `AGY_ADC_AUTH`; those are API/ADC routes and out of scope.

### AGENTS.md and hooks in a minted root

`AGENTS.md` is read natively. Measured twice: a root holding only `AGENTS.md` produced `AGENTSMD-CODEWORD-7731` verbatim in the response.

Hooks: documented in the binary's embedded guide, not probed. Config is a single `hooks.json` in the "customization root", which the guide gives as `.agents/hooks.json` for a workspace. The event names are `PreToolUse`, `PostToolUse`, `PreInvocation`, `PostInvocation`, `Stop`. Tool-scoped events take a `{matcher, hooks:[...]}` group, matchers are regexes over tool names derived from the step type (`run_command`, `view_file`, `write_to_file` as shown in the init tool list), input is camelCase JSON on stdin, output is JSON on stdout, and handler cwd is the directory holding `hooks.json`. This is the same family as Claude Code's hook contract but not the same schema, and the key point for steering is that the read-time hook in this repo (`assess-hook.mjs`) reads Claude's payload (`tool_input.file_path`) and hard-codes `${CLAUDE_PROJECT_DIR}`; neither exists here. An Antigravity hook cell needs its own shim and its own live probe before any claim.

Skills load from `{workspace}/.agents/skills/<name>/SKILL.md` (string in the binary), the same path this repo installs the `markdown-harness` skill to, so a minted root's skill folder is reachable by both Host harnesses.

### Reading back the tree

Identical to Claude Code: git root, `status`, `diff`. Measured: `?? note.md` with `hello`. The stream's `tool_name: "write_to_file"` with `TargetFile` is the cross-check; `run_command` can write without it.

### Model selection and recording

`agy models` lists ids; the effort level is part of the id for the Gemini and Claude entries (`gemini-3.8-flash-low`, `claude-sonnet-5-5-medium`, and so on), so the id alone fixes the cohort. The list also holds `gpt-oss-120b-medium`. Measured: the init event echoes the requested id as `model`; the result carries no model field and no cost. Record the id passed, the id echoed in init, `agy --version`, and `agy models` output at run time (the list changes between versions; the changelog in this install bumped from 1.3.0 to 1.3.1 in one check).

Caution for cohort design: Antigravity can run Claude models (`claude-sonnet-5-5-*`) through Google's subscription. "Claude Sonnet 5.5 via Claude Code" and "Claude Sonnet 5.5 via Antigravity" are different cohorts: different Host harness, system prompt, tool set and billing. Do not pool them.

## 3. What the probes did not establish

- Whether `CLAUDE.md` precedence over `AGENTS.md` is by design or an artifact of the builtin plugin, and whether it holds for nested directories. Measured at one level only.
- Whether `agy` hooks fire in headless mode, and the exact `additionalContext`-equivalent field name an `agy` hook must return for text to reach the model.
- Whether copying the OAuth token files into a scratch `HOME` gives `agy` an authenticated, isolated run.
- Whether a Claude Code run touches `~/.claude` state beyond the transcript (memory, `~/.claude.json` project entries) in a way that leaks between cells.
- Model non-determinism: every run here was a single sample. No variance data exists, so nothing here supports a pass-rate claim.
- Concurrency limits on the subscriptions. Claude Code printed a `rate_limit_event` per run; its payload was not inspected. Parallel cells could hit the subscription limit and fail as `api_error`, not as steering failures.

## Seam: reusing `setup-local-e2e-repo`

`.agents/skills/setup-local-e2e-repo/scripts/new-repo.mjs` mints an adopter-like root in four steps: `git init`, the dev-tooling harness (skippable with `--skip-harness`), `npm install --save-dev @hancrafted/markdown-harness` (or a link to a checkout via `--source <path>`), and the skill at `.agents/skills/markdown-harness/`. It takes `--under` for the parent directory (default `~/Developer/mh-e2e`), refuses an existing directory, and reports JSON per repository with a `provenance` block that must read `checked: true, drift: false`. It does **not** write an `AGENTS.md`, a `markdown-harness.config.yaml`, or `.claude/settings.json`; `init.mjs` in the skill wires the hook into `.claude/settings.json`, and the hook command is `node "${CLAUDE_PROJECT_DIR}/.agents/skills/markdown-harness/scripts/assess-hook.mjs"`. The preferred seam is therefore:

1. Call `new-repo.mjs --under /private/tmp/claude-501/<run>/ --source <checkout> --skip-harness --name <cell>` for the git repo, package and skill. `--under` is the only change from its defaults and it moves the root out of any parent chain Han controls.
2. Layer the cell's own files on top: config, `AGENTS.md`, seed document, and (for hook cells) a `.claude/settings.json` written directly or by the skill's `init.mjs`.
3. Commit the layered state so the readback diff starts from a known tree.

Two costs: `--source published` pulls from npm and GitHub on every mint (slow, network, and flagged by drift), and a checkout link means the run measures unreleased code. The skill's own section 1 says to default to the published tarball unless testing unreleased work; for steering evals on a prototype, the checkout link is the honest choice and the cohort record should say so. Also note the skill says the hook check needs a fresh session, never `--continue` or `--resume`: every headless cell is a fresh session by construction, and `--no-session-persistence` guarantees no resume.

## Glossary gaps

`CONTEXT.md` has **Host harness**, **Steering query** (asking the config what governs a path before the file is written), **Rule**, **Operator**, **Contributor**, and **Assessment**. Terms this spec needs that it does not define:

- **eval** / **cell** / **cohort**: no entry. A cell is one (Host harness, model, config, task) run; a cohort is a set of cells sharing everything but the variable under test. Without entries, "cohort" will be used for both "same model" and "same minted root".
- **minted root** / **throwaway root**: **corpus tier** defines "a tier root is a synthetic repo root", and `setup-local-e2e-repo` calls these "repositories". The eval root is a third sense of "root", beside the config root the hooks walk up to find. Needs one name.
- **steering** (bare): CONTEXT.md uses it in the **Host harness** entry ("contributes steering to it") and in **Contributor** ("governed, steered and warned"), but defines only **Steering query**, which is the narrow mechanical sense. An eval of "did steering reach the agent" is about the broad sense, delivery to the agent, not about the query. Needs a decision whether the eval measures the query's answer arriving or the agent's behaviour changing.
- **marker**: **Conformance case** uses `<!-- expect: -->` as a "marker". The eval's "regex marker" is a different thing (a pattern matched against files the agent left). Collision.
- **headless** / **print mode**: no entry; the two Host harnesses spell it differently (`-p` in both, `--print-timeout` only in `agy`).
- **subscription auth** vs **API-key provider**: no entry; the distinction this spec depends on, and one that `docs/vision/` may need to rule on given the tenets about dependencies.

## What spec agents must decide

1. **Which Host harness at launch.** Claude Code is the lower-risk first target: richer stream, hook events observable, flags that isolate user state while keeping subscription auth, a turn cap. `agy` is faster and has no cost field, but has no isolation flag, no turn cap, and unproven hooks. Decide whether `agy` is a second target or a deferred one.
2. **Mint location rule.** Under `/private/tmp/claude-501/` for every run, or allow `~/Developer/mh-e2e` with a parent-chain assertion at mint. Never the repo or `.worktrees/`.
3. **Environment policy.** Allow-list environment for the child (`PATH`, `HOME`, `LANG`, `TERM`) and an assertion on the Claude init event: `apiKeySource: "none"`, `skills: []`, `mcp_servers: []`, expected plugin set. Decide whether a failed assertion invalidates the cell (recommended) or only flags it.
4. **`CLAUDE.md` and `AGENTS.md` in a root.** Exactly one per directory level, or a symlink between them. Given measured precedence, a cell that wants to test the `AGENTS.md` path must contain no `CLAUDE.md`.
5. **Hook cells.** Which tool the hook matches and how the task forces that tool, given trap 10 (a `Write` matcher never sees `Bash`). Whether "hook did not fire" is a result or a harness fault, and the evidence required (`hook_started` in the stream, or the activity log).
6. **Permission policy.** `acceptEdits` for Claude Code is proposed. For `agy`, `--dangerously-skip-permissions` is the only measured way to write; decide whether that is acceptable inside a throwaway root or whether to probe `--mode accept-edits` first.
7. **Failure classification.** Both Host harnesses exit 0 on auth failure and on denied permissions. The runner needs a status taxonomy (`ok`, `auth`, `permission-denied`, `timeout`, `rate-limited`, `no-effect`) derived from stream fields, not exit codes, so that harness faults are never counted as steering failures.
8. **Cohort record.** The fields listed per harness above, minimum: Host harness name and version, resolved model id, effort, permission mode, isolation flags, root provenance block (`checked`, `drift`, source checkout commit), and sample index. Decide how many samples per cell, since one sample supports no pass-rate claim.
9. **Readback.** Git status and diff against a committed seed, as proposed, plus the regex marker over the resulting files. Decide whether the stream's tool-call list is also recorded as a cross-check.
10. **Whether `agy` credentials may be copied into a scratch `HOME`.** It is the only found path to isolating `agy`, it touches OAuth token files, and it needs the user's consent before anyone tries it.
11. **Cost and rate-limit budget.** Per-cell wall clock (15 to 60 s for Claude Code, under 15 s for `agy`) and a concurrency cap, given that one subscription's rate limit is shared with Han's own interactive work.
12. **Naming.** Settle the glossary gaps above before the framework names its own types.
