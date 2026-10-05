#!/usr/bin/env node
// A Claude Code `PreToolUse` hook for `Write`: when the agent is about to CREATE
// a markdown file that `body-structure` governs, put each candidate Rule's
// spine in front of it: every entry's `pattern` or `allowed` titles, `intent`
// and `mayHold`, and every nested spine indented under its parent.
//
// This is round two's stretch prototype of mechanism 1 from issue #221: the
// `mh query` answer as it stands, delivered by a shim. It adds no command, no
// flag and no contract surface; everything below is composition over an answer
// the CLI already gives.
//
// IT SPEAKS ON CREATION ONLY. A file that already exists has been written once
// and `check` judges it; steering belongs to the first write. It never denies
// and never edits the call: `additionalContext` rides along, so a first draft
// that ignores it is still written and the gate is where it is caught. The cost
// of that is named in the write-up on #221.
//
// SILENCE IS THE DEFAULT, AND EVERY REFUSAL EXITS 0, for the reasons the
// `assess-hook.mjs` header gives at length. Not markdown, not a `Write`, a file
// that exists, no config above it, no install, a rejected config, no body-structure
// block: each means this layer has nothing to say.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

/** The Module this hook speaks for. Its blocks are the only ones rendered. */
const MODULE = 'body-structure';

const CONFIG_NAME = 'markdown-harness.config.yaml';

/** Bounds the one failure that is not a refusal: a hung subprocess. See `assess-hook.mjs`. */
const GIVE_UP_AFTER_MS = 5_000;

const PACKAGE_MANIFEST = join('node_modules', '@hancrafted', 'markdown-harness', 'package.json');

/** The directory holding the config, found by walking up from the file, or `undefined`. */
function rootHolding(file) {
  let directory = dirname(file);
  for (;;) {
    if (existsSync(join(directory, CONFIG_NAME))) return directory;
    const parent = dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

/** The CLI entry the installed package declares, or `undefined`. */
function installedEntry(root) {
  const manifest = join(root, PACKAGE_MANIFEST);
  if (!existsSync(manifest)) return undefined;
  const declared = JSON.parse(readFileSync(manifest, 'utf8')).bin?.mh;
  if (typeof declared !== 'string') return undefined;
  const entry = resolve(dirname(manifest), declared);
  return existsSync(entry) ? entry : undefined;
}

/** One `allowed` title, quoted, its intent beside it when the Operator wrote one. */
function allowedTitle({ title, intent }) {
  return intent === undefined ? `"${title}"` : `"${title}" (${intent})`;
}

/** What a matching heading's text must be: a pattern, a fixed set of titles, or anything. */
function titleShape(entry) {
  if (entry.pattern !== undefined) return `text matching /${entry.pattern}/`;
  if (entry.allowed === undefined) return 'any text';
  const titles = entry.allowed.map(allowedTitle).join(', ');
  return entry.allowed.length === 1 ? titles : `one of ${titles}`;
}

/**
 * One spine entry as lines a person can read: the level, the shape, the count,
 * the blocks its section may hold, then the Operator's own words; its nested
 * spine follows, one indent step deeper per level of nesting.
 */
function entryLines(entry, depth) {
  const indent = '  '.repeat(depth);
  const heading = `${'#'.repeat(entry.level)}`;
  const shape = titleShape(entry);
  const counts = [
    entry.minCount === undefined ? undefined : `at least ${entry.minCount}`,
    entry.maxCount === undefined ? undefined : `at most ${entry.maxCount}`,
  ].filter((part) => part !== undefined);
  const kind =
    entry.purpose === 'enumeration'
      ? `repeating (${counts.join(', ')})`
      : entry.presence === 'optional'
        ? 'optional, once'
        : 'once';
  const holds =
    entry.mayHold === undefined ? '' : `, holding only ${entry.mayHold.join(' or ')} before any sub-heading`;
  const intent = entry.intent === undefined ? '' : ` - ${entry.intent}`;
  const own = `${indent}${heading} ${shape}, ${kind}${holds}${intent}`;
  return [own, ...(entry.headings ?? []).flatMap((child) => entryLines(child, depth + 1))];
}

/** One candidate Rule: who it applies to, how deep it lets the document go, whether its spine is closed, and the spine. */
function candidateBlock(block) {
  const { types, maxLevel, undefinedHeadings, headings } = block.requirements;
  const applies = types === undefined ? 'any type' : `type ${types.join(' or ')}`;
  const lines = [`Rule "${block.rule.ruleId}" (${applies}): ${block.rule.intent}`];
  if (maxLevel !== undefined) lines.push(`  no heading deeper than level ${maxLevel}`);
  if (undefinedHeadings === 'forbid') lines.push('  no heading outside these entries (undefinedHeadings: forbid)');
  for (const entry of headings ?? []) lines.push(...entryLines(entry, 1));
  return lines.join('\n');
}

/** What the agent is told, built only from what the tool reported. */
function notice(path, blocks) {
  return [
    `markdown-harness: ${path} is a new file that Module "${MODULE}" governs. Headings must follow the spine of the first of these Rules whose type matches the frontmatter type you give the file. An indented entry is a nested spine: it applies again under every heading its parent matches, up to the next heading at the parent's level or shallower.`,
    '',
    blocks.map(candidateBlock).join('\n\n'),
  ].join('\n');
}

/** The sentence for the agent, or `undefined` when this layer has nothing to say. */
function main() {
  const payload = JSON.parse(readFileSync(0, 'utf8'));
  if (payload?.tool_name !== 'Write') return undefined;
  const written = payload?.tool_input?.file_path;
  if (typeof written !== 'string' || written === '') return undefined;

  const file = written.split('\\').join('/');
  if (!file.toLowerCase().endsWith('.md') || existsSync(file)) return undefined;

  const root = rootHolding(file);
  if (root === undefined) return undefined;
  const entry = installedEntry(root);
  if (entry === undefined) return undefined;

  const asked = relative(root, file).split(sep).join('/');
  const run = spawnSync(process.execPath, [entry, 'query', asked], {
    cwd: root,
    encoding: 'utf8',
    timeout: GIVE_UP_AFTER_MS,
  });
  const modules = JSON.parse(run.stdout)?.result?.modules;
  if (!Array.isArray(modules)) return undefined;

  const blocks = modules.filter(({ module }) => module === MODULE);
  return blocks.length === 0 ? undefined : notice(asked, blocks);
}

let text;
try {
  text = main();
} catch {
  text = undefined;
}

if (text !== undefined) {
  process.stdout.write(
    `${JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: text } })}\n`,
  );
}

process.exit(0);
