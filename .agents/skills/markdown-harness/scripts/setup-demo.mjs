#!/usr/bin/env node
// Lay down a throwaway demo corpus, and take it away again.
//
//   node setup-demo.mjs            add the demo
//   node setup-demo.mjs --remove   take it back out
//
// The demo rule goes in the ROOT config, between two markers, because that is
// the only place the hook will read. It walks up from the file it was handed and
// stops at the first `markdown-harness.config.yaml`, then resolves the CLI from
// `node_modules` beside THAT directory — so a config nested in the demo folder
// finds no package, and the hook goes silent on a file that is genuinely stale.
// Measured 2026-09-09. Marked blocks in the root config avoid that entirely.
//
// INSERTING INTO YAML BY TEXT IS BRITTLE, SO THIS DOES NOT TRUST ITSELF. After
// writing, it asks `mh --query` which rule actually wins for a demo path, and
// fails loudly unless the answer is the demo rule. A silent mis-insert would
// look exactly like a working demo that never fires.

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordActivity } from './activity-log.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = resolve(HERE, '..', 'assets', 'demo');
const DEMO_DIR = join('docs', 'markdown-harness', 'demo');
const CONFIG_NAME = 'markdown-harness.config.yaml';
const BEGIN = '    # --- BEGIN markdown-harness demo ---';
const END = '    # --- END markdown-harness demo ---';
const PROBE = 'docs/markdown-harness/demo/tomorrows-weather.md';
const DEMO_RULE = 'markdown-harness-demo';

/**
 * THE CANARY. The prompt names its own rule id, and that id lives in the config
 * and in ZERO demo files.
 *
 * The corpus is deliberately non-telling — no body mentions freshness, dates or
 * this tool — but a model can still guess that a weather forecast perishes, and
 * a guess that happens to be right is indistinguishable from a hook that fired.
 * An id that appears nowhere a model could have read it is not guessable: a
 * reply quoting `markdown-harness-demo` can only have arrived through the hook.
 */
const BLOCK = `${BEGIN}
    # Added by the markdown-harness skill. Everything between these two markers is
    # throwaway: run \`setup-demo.mjs --remove\`, or delete this block and the
    # ${DEMO_DIR}/ folder by hand, and the config is exactly as it was.
    # It sits first on purpose — rules are first-match, so a broader rule above it
    # would swallow the demo paths and the demo would silently do nothing.
    - ruleId: ${DEMO_RULE}
      path: [docs/markdown-harness/demo/**/*.md]
      intent: Demo files show what the tool reports, and what an agent hears when a file has gone stale
      assess:
        stale: Tell the user this file is past its stale_after, and quote the rule id ${DEMO_RULE} so they can see the sentence reached you through the hook rather than from the file.
      fields:
        title: { presence: required }
        stale_after: { presence: required, format: datetime }
${END}`;

const FRESH_CONFIG = `frontmatter:
  rules:
${BLOCK}
`;

const remove = process.argv.includes('--remove');

function repoRoot() {
  let directory = process.cwd();
  for (;;) {
    if (existsSync(join(directory, 'package.json'))) return directory;
    const parent = dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

function report(ok, detail) {
  process.stdout.write(`${JSON.stringify({ ok, ...detail }, undefined, 2)}\n`);
  process.exit(ok ? 0 : 1);
}

/** Strip the marked block, leaving everything outside it byte-for-byte. */
function withoutBlock(text) {
  const lines = text.split('\n');
  const from = lines.findIndex((l) => l.trim() === BEGIN.trim());
  if (from === -1) return { text, found: false };
  const to = lines.findIndex((l, i) => i > from && l.trim() === END.trim());
  if (to === -1) return { text, found: false };
  lines.splice(from, to - from + 1);
  return { text: lines.join('\n'), found: true };
}

/** Insert the block directly beneath the `rules:` key, so it wins first-match. */
function withBlock(text) {
  const lines = text.split('\n');
  const at = lines.findIndex((l) => /^\s*rules:\s*$/.test(l));
  if (at === -1) return undefined;
  lines.splice(at + 1, 0, BLOCK);
  return lines.join('\n');
}

const root = repoRoot();
if (root === undefined) report(false, { error: 'NO_PACKAGE_JSON', cwd: process.cwd() });

const configPath = join(root, CONFIG_NAME);
const demoPath = join(root, DEMO_DIR);

if (remove) {
  const removed = [];
  if (existsSync(demoPath)) {
    rmSync(demoPath, { recursive: true, force: true });
    removed.push(DEMO_DIR);
  }
  if (existsSync(configPath)) {
    const { text, found } = withoutBlock(readFileSync(configPath, 'utf8'));
    if (found) {
      // A config that held nothing but the demo is left with an empty rule list,
      // which the tool rejects outright — so the whole file goes rather than a
      // husk that fails every command with CONFIG_EMPTY_RULE_LIST.
      if (/rules:\s*$/.test(text.trim())) {
        rmSync(configPath);
        removed.push(`${CONFIG_NAME} (it held nothing else)`);
      } else {
        writeFileSync(configPath, text);
        removed.push(`the marked block in ${CONFIG_NAME}`);
      }
    }
  }
  // `docs/markdown-harness/` outlives the demo folder inside it, so the log is
  // still there to take this row — and a reader can see the window close.
  recordActivity(root, 'demo', DEMO_DIR.split(sep).join('/'), 'removed');
  report(true, { removed });
}

// 1. The files.
mkdirSync(demoPath, { recursive: true });
const copied = readdirSync(TEMPLATES).filter((f) => f.endsWith('.md'));
for (const file of copied) copyFileSync(join(TEMPLATES, file), join(demoPath, file));

// 2. The rule.
let configAction;
if (!existsSync(configPath)) {
  writeFileSync(configPath, FRESH_CONFIG);
  configAction = 'created';
} else {
  const current = readFileSync(configPath, 'utf8');
  if (current.includes(BEGIN.trim())) {
    configAction = 'already';
  } else {
    const next = withBlock(current);
    if (next === undefined) {
      report(false, {
        error: 'NO_RULES_KEY',
        detail: `Could not find a \`rules:\` line in ${CONFIG_NAME}. Add the block by hand, first in the list.`,
        block: BLOCK,
      });
    }
    writeFileSync(configPath, next);
    configAction = 'inserted';
  }
}

// 3. THE PROOF. Text surgery on YAML is not trusted until the tool agrees.
const cli = join(root, 'node_modules', '@hancrafted', 'markdown-harness', 'dist', 'packages', 'cli', 'cli.js');
const run = existsSync(cli)
  ? spawnSync(process.execPath, [cli, '--query', PROBE], { cwd: root, encoding: 'utf8' })
  : spawnSync('npx', ['mh', '--query', PROBE], { cwd: root, encoding: 'utf8' });

let won;
try {
  won = JSON.parse(run.stdout)?.result?.rule?.ruleId;
} catch {
  won = undefined;
}

if (won !== DEMO_RULE) {
  report(false, {
    error: 'DEMO_RULE_DOES_NOT_WIN',
    detail: `Expected \`${DEMO_RULE}\` to govern ${PROBE}, got ${won ?? 'no answer'}. The block is in the config but something above it matches first — run \`mh --audit\` and move it up.`,
    configAction,
  });
}

// 4. THE MARKER. This row timestamps the boundary, so an `assess` row LATER than
//    it is evidence the hook fired during the demo rather than at some point
//    before it. That comparison is what `demo.md` step 4 asks the user to make,
//    and it is the reason no step here reports the hook as proven.
const marker = recordActivity(root, 'demo', DEMO_DIR.split(sep).join('/'), 'installed');

report(true, {
  demoDir: DEMO_DIR,
  files: copied,
  config: configAction,
  governedBy: won,
  marker: marker ? 'docs/markdown-harness/activity.csv' : 'not written — docs/markdown-harness/ is missing',
  next: `Hand the user the runbook in demo.md and STOP. This script laying files down is not the hook firing: only an \`assess\` row later than this marker is. A resumed session replays saved context instead of re-running the hook, so the read has to happen in a FRESH one.`,
});
