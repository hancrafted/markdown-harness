#!/usr/bin/env node
// occurrences.mjs — measure where a CONTEXT.md glossary term actually occurs.
//
// Derives its inventory from CONTEXT.md itself, so the inventory cannot drift from
// the file it describes, and reports every bold line it failed to parse rather than
// returning a clean count over an incomplete set.
//
// Counts are split two ways: by POSITION in the markup (naming the concept vs using
// the word) and by FILE CLASS (which kind of document carries it). Loose prose is
// reported but never folded into the headline, because this glossary bans by sense
// and a grep only sees spelling.
//
// Usage:
//   node <skill>/scripts/occurrences.mjs --list
//   node <skill>/scripts/occurrences.mjs --section "The product"
//   node <skill>/scripts/occurrences.mjs --entry Module
//   node <skill>/scripts/occurrences.mjs --entry Rule --pattern '\*\*Rule\*\*|`Rule`'
//   node <skill>/scripts/occurrences.mjs                       # every entry
// Options: --root <dir> (default: repo root) · --samples <n> (default 3) · --ignore-case

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);

const root = flag('root', execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim());
const sampleCount = Number(flag('samples', '3'));
const caseSensitive = has('case-sensitive'); // default: measure case-insensitively
const sectionFilter = flag('section');
const entryFilter = flag('entry');
const patternOverride = flag('pattern');
const GLOSSARY = 'CONTEXT.md';

// ── inventory ────────────────────────────────────────────────────────────────
// Entries are bold-led lines inside a `### ` section. Two shapes are known:
// `**Term**:` (42 of 43 today) and `**Term** —` (the retired-stub variant).
// Anything else bold-led inside a section is reported as unparsed, never skipped.
function readInventory() {
  const lines = readFileSync(join(root, GLOSSARY), 'utf8').split('\n');
  const entries = [];
  const unparsed = [];
  let section = null;
  lines.forEach((line, i) => {
    if (line.startsWith('### ')) section = line.slice(4).trim();
    if (!line.startsWith('**')) return;
    if (section === null) return; // preamble prose, not an entry
    const standard = line.match(/^\*\*([^*]+)\*\*\s*:/);
    const variant = line.match(/^\*\*([^*]+)\*\*\s+[—-]/);
    const body = () => {
      const out = [];
      for (let j = i; j < lines.length; j += 1) {
        if (j > i && (lines[j].startsWith('**') || lines[j].startsWith('#'))) break;
        if (lines[j].trim() === '' && out.length > 0) break;
        out.push(lines[j]);
      }
      return out;
    };
    if (standard) entries.push({ term: standard[1].trim(), section, line: i + 1, shape: 'standard', body: body() });
    else if (variant) entries.push({ term: variant[1].trim(), section, line: i + 1, shape: 'variant', body: body() });
    else unparsed.push({ line: i + 1, text: line.slice(0, 72) });
  });
  return { entries, unparsed };
}

// ── corpus ───────────────────────────────────────────────────────────────────
const TEXT_EXT = new Set([
  '.md',
  '.ts',
  '.tsx',
  '.mts',
  '.js',
  '.mjs',
  '.cjs',
  '.yaml',
  '.yml',
  '.json',
  '.txt',
  '.sh',
]);

function readCorpus() {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0')
    .filter((f) => f && TEXT_EXT.has(extname(f)));
  return files
    .map((path) => {
      let text = '';
      try {
        text = readFileSync(join(root, path), 'utf8');
      } catch {
        return null;
      }
      return { path, text, klass: classifyFile(path, text) };
    })
    .filter(Boolean);
}

// File class. Markdown is grouped by its frontmatter `type` — the discriminator this
// repo governs on — so "where does this term live" is answered in the repo's own terms.
function classifyFile(path, text) {
  const name = basename(path);
  if (path === GLOSSARY) return 'self';
  if (name === 'AGENTS.md' || name === 'CLAUDE.md') return 'instructions';
  if (path.startsWith('.archgate/adrs/')) return 'adrs';
  if (path.startsWith('.claude/rules/')) return 'mirror';
  if (path.includes('/skills/')) return 'skills';
  if (extname(path) === '.md') {
    const fm = text.startsWith('---\n') ? text.slice(4, text.indexOf('\n---', 4)) : '';
    const type = fm.match(/^type:\s*(\S+)/m);
    return `docs:${type ? type[1] : 'untyped'}`;
  }
  return 'code';
}

// Rows the agent reads without being asked to: session instructions, ADR bodies
// loaded on Read, and skill files. A term that carries weight here carries it
// where nobody chose to look it up.
const READING_PATH = ['instructions', 'adrs', 'mirror', 'skills'];
const ROW_LABEL = {
  instructions: 'AGENTS.md / CLAUDE.md',
  adrs: 'ADRs (.archgate/adrs)',
  mirror: '  ".claude/rules" mirror — same text',
  skills: 'skills',
  code: 'code & config',
};

// ── matching ─────────────────────────────────────────────────────────────────
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildPattern(term) {
  if (patternOverride) return new RegExp(patternOverride, caseSensitive ? 'g' : 'gi');
  const bare = term.replace(/^`|`$/g, '');
  const plural = /s$/.test(bare) ? '' : '(?:s)?';
  return new RegExp(`(?<![A-Za-z0-9_-])${escape(bare)}${plural}(?![A-Za-z0-9_-])`, caseSensitive ? 'g' : 'gi');
}

const COMMENT = /^\s*(\/\/|\/\*|\*|#)/;

// Position says whether the line NAMES the concept or merely USES the word.
function classifyPosition(line, term, klass) {
  const bare = escape(term.replace(/^`|`$/g, ''));
  if (new RegExp(`\\*\\*\`?${bare}\`?\\*\\*`).test(line)) return 'bold';
  if (new RegExp('`' + bare + '`').test(line)) return 'backticked';
  if (/^#{1,6}\s/.test(line)) return 'heading';
  if (line.includes('_Avoid_')) return 'avoid';
  if (klass === 'code' && COMMENT.test(line)) return 'comment';
  return 'prose';
}

const NAMING = ['bold', 'backticked', 'heading', 'avoid'];

function measure(term, corpus) {
  const re = buildPattern(term);
  const hits = [];
  for (const file of corpus) {
    if (!re.test(file.text)) continue;
    re.lastIndex = 0;
    file.text.split('\n').forEach((line, i) => {
      re.lastIndex = 0;
      const matches = [...line.matchAll(re)];
      if (matches.length === 0) return;
      const bare = term.replace(/^`|`$/g, '');
      hits.push({
        path: file.path,
        line: i + 1,
        text: line.trim(),
        klass: file.klass,
        pos: classifyPosition(line, term, file.klass),
        caseExact: matches.some((m) => m[0] === bare || m[0] === `${bare}s`),
      });
    });
  }
  return { pattern: re.source, hits };
}

// ── report ──────────────────────────────────────────────────────────────────
const tally = (items, key) => items.reduce((acc, it) => ((acc[it[key]] = (acc[it[key]] || 0) + 1), acc), {});

function table(rows) {
  const head = ['', 'where', 'naming', 'prose', 'comments', 'files'];
  const all = [head, ...rows];
  const width = head.map((_, c) => Math.max(...all.map((r) => String(r[c]).length)));
  const line = (r) =>
    '| ' +
    r.map((cell, c) => (c < 2 ? String(cell).padEnd(width[c]) : String(cell).padStart(width[c]))).join(' | ') +
    ' |';
  const rule = '|' + width.map((w, c) => (c < 2 ? '-'.repeat(w + 2) : '-'.repeat(w + 1) + ':')).join('|') + '|';
  return [line(head), rule, ...rows.map(line)].join('\n');
}

function reportEntry(entry, corpus) {
  const { pattern, hits } = measure(entry.term, corpus);
  const self = hits.filter((h) => h.klass === 'self');
  const out = hits.filter((h) => h.klass !== 'self');

  const bucket = (h) => (h.klass.startsWith('docs:') ? 'docs' : h.klass);
  const order = [...READING_PATH, 'docs', 'code'];
  const rows = [];
  for (const key of order) {
    const group = out.filter((h) => bucket(h) === key);
    const naming = group.filter((h) => NAMING.includes(h.pos)).length;
    const prose = group.filter((h) => h.pos === 'prose').length;
    const comments = group.filter((h) => h.pos === 'comment').length;
    if (key === 'docs') {
      const byType = tally(group, 'klass');
      const label = Object.keys(byType).length
        ? `other docs (${Object.entries(byType)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `${k.slice(5)} ${v}`)
            .join(', ')})`
        : 'other docs';
      rows.push([
        READING_PATH.includes(key) ? '>' : ' ',
        label,
        naming,
        prose,
        comments,
        new Set(group.map((h) => h.path)).size,
      ]);
    } else {
      rows.push([
        READING_PATH.includes(key) ? '>' : ' ',
        ROW_LABEL[key],
        naming,
        prose,
        comments,
        new Set(group.map((h) => h.path)).size,
      ]);
    }
  }
  const nm = out.filter((h) => NAMING.includes(h.pos));
  rows.push([
    ' ',
    'TOTAL outside CONTEXT.md',
    nm.length,
    out.filter((h) => h.pos === 'prose').length,
    out.filter((h) => h.pos === 'comment').length,
    new Set(out.map((h) => h.path)).size,
  ]);
  rows.push([
    ' ',
    'CONTEXT.md itself',
    self.filter((h) => NAMING.includes(h.pos)).length,
    self.filter((h) => h.pos === 'prose').length,
    0,
    self.length ? 1 : 0,
  ]);

  console.log(
    `\n**${entry.term}** — CONTEXT.md:${entry.line}${entry.shape === 'variant' ? '  (variant shape)' : ''}\n`,
  );
  for (const l of entry.body) console.log(`  ${l}`);
  console.log('');
  console.log(table(rows).replace(/^/gm, '  '));

  const exact = nm.filter((h) => h.caseExact).length;
  const readingPath = out.filter((h) => READING_PATH.includes(h.klass)).length;
  console.log('');
  console.log(`  pattern     ${pattern}`);
  console.log(`  case-exact  ${exact} of ${nm.length} naming hits match the glossary's own spelling`);
  if (nm.length > 0 && exact === 0) {
    console.log(`  WARNING     glossary spells it "${entry.term}"; every occurrence in the wild spells it differently`);
  }
  console.log(`  reading   ${readingPath} hit(s) on the rows marked >`);
  if (out.length === 0) console.log('  NOTE        term occurs nowhere outside CONTEXT.md');

  const pick = [
    ...out.filter((h) => READING_PATH.includes(h.klass) && NAMING.includes(h.pos)).slice(0, sampleCount),
    ...out.filter((h) => !READING_PATH.includes(h.klass) && NAMING.includes(h.pos)).slice(0, 1),
    ...out.filter((h) => h.pos === 'prose').slice(0, 2),
    ...out.filter((h) => h.pos === 'comment').slice(0, 1),
  ];
  if (pick.length) {
    console.log('  samples');
    for (const h of pick) console.log(`    ${h.path}:${h.line} [${h.pos}] ${h.text.slice(0, 86)}`);
  }
}

// ── main ─────────────────────────────────────────────────────────────────────
if (!existsSync(join(root, GLOSSARY))) {
  console.error(`no ${GLOSSARY} under ${root}`);
  process.exit(1);
}

const { entries, unparsed } = readInventory();
const bySection = entries.reduce((acc, e) => ((acc[e.section] = acc[e.section] || []).push(e), acc), {});

console.log(`root      ${root}`);
console.log(
  `inventory ${entries.length} entries · ${Object.keys(bySection).length} sections · parsed from ${GLOSSARY}`,
);
for (const [section, list] of Object.entries(bySection)) {
  console.log(`  ${String(list.length).padStart(2)}  ${section}  —  ${list.map((e) => e.term).join(' · ')}`);
}
if (unparsed.length) {
  console.log(`UNPARSED ${unparsed.length} bold-led line(s) inside a section — measured by nothing:`);
  for (const u of unparsed) console.log(`  CONTEXT.md:${u.line}  ${u.text}`);
} else {
  console.log('unparsed  none');
}

if (has('list')) process.exit(0);

let selected = entries;
if (sectionFilter) selected = selected.filter((e) => e.section.toLowerCase().includes(sectionFilter.toLowerCase()));
if (entryFilter) selected = selected.filter((e) => e.term.toLowerCase() === entryFilter.toLowerCase());
if (selected.length === 0) {
  console.error(`\nselector matched no entries (section=${sectionFilter} entry=${entryFilter})`);
  process.exit(1);
}

const corpus = readCorpus();
console.log(`corpus    ${corpus.length} tracked text files`);
console.log(`selected  ${selected.length} of ${entries.length} entries`);
for (const entry of selected) reportEntry(entry, corpus);
