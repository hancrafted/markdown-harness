#!/usr/bin/env bash
# Both surfaces, always. Antigravity reads .agents/; Claude Code reads .claude/.
# Shipping one without the other yields skills that silently never load.

link_skills() {
  local run_dir=$1 skill_dir=$2
  mkdir -p "$run_dir/.agents/skills" "$run_dir/.claude/skills"
  rsync -aL "$skill_dir/assets/skills/" "$run_dir/.agents/skills/"
  for s in "$run_dir/.agents/skills"/*; do
    ln -sfn "../../.agents/skills/$(basename "$s")" "$run_dir/.claude/skills/$(basename "$s")"
  done
}

# Governed only. These point within the run repo, which is the one place a
# symlink belongs here: the records must be pointed at, never copied, or the
# two surfaces can drift apart.
link_rules() {
  local run_dir=$1
  [ -d "$run_dir/.archgate/adrs" ] || return 0
  mkdir -p "$run_dir/.claude/rules"
  for adr in "$run_dir/.archgate/adrs"/*.md; do
    base=$(basename "$adr")
    lower=$(echo "$base" | tr '[:upper:]' '[:lower:]')
    ln -sfn "../../.archgate/adrs/$base" "$run_dir/.claude/rules/$lower"
  done
}
