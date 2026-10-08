#!/usr/bin/env node
// Move a repository that already uses markdown-harness onto the word commands,
// deterministically.
//
// The judgement belongs to the skill and the mechanics belong here, as in
// init.mjs. Rewriting `mh --check` to `mh check` is mechanical, so this does it.
// Translating a config rule is not — a glob has more than one honest
// translation — so for the config this only reports the lines that need a
// decision, and the skill's migrating.md makes it.
//
// Report-only by default. `--write` rewrites package.json and the GitHub
// workflow files, and refuses while the installed CLI predates the word
// commands: a gate rewritten ahead of its dependency exits 2 on every run.
// Running it twice changes nothing the second time.
//
//   node migrate.mjs [--write] [--config <file>]

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const PACKAGE = '@hancrafted/markdown-harness';
const DEFAULT_CONFIG = 'markdown-harness.config.yaml';
const VERBS = ['check', 'query', 'audit', 'assess'];

/**
 * The skill's own folder talks about the retired forms on purpose, as history,
 * so it is never reported. Lockfiles name the package without invoking it.
 */
const NEVER_SCANNED = [
  /^\.agents\/skills\/markdown-harness\//,
  /^\.claude\/skills\/markdown-harness\//,
  /(^|\/)package-lock\.json$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)yarn\.lock$/,
];

/** Larger than any script or workflow; a file this size is generated, not authored. */
const MAX_SCANNED_BYTES = 512 * 1024;

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const at = argv.indexOf(name);
  // A value-taking flag must not swallow the next flag as its value.
  return at === -1 || at + 1 >= argv.length || argv[at + 1].startsWith('--') ? fallback : argv[at + 1];
};

const write = flag('--write');
const configName = value('--config', DEFAULT_CONFIG);

/** The repository root, which is the directory holding package.json. */
function repoRoot() {
  let directory = process.cwd();
  for (;;) {
    if (existsSync(join(directory, 'package.json'))) return directory;
    const parent = dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

function report(body, code) {
  process.stdout.write(`${JSON.stringify(body, undefined, 2)}\n`);
  process.exit(code);
}

const root = repoRoot();
if (root === undefined) report({ ok: false, error: 'NO_PACKAGE_JSON', cwd: process.cwd() }, 1);

// ── 1. THE INSTALLED CLI ────────────────────────────────────────────────────
// Which grammar the CLI in node_modules speaks, read off its own --help rather
// than a version number: the help lists `check` as a word or as `--check`, and
// that is the one fact the rewrite depends on.

function installedCli() {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const declared = { ...manifest.dependencies, ...manifest.devDependencies }[PACKAGE];
  const packageDir = join(root, 'node_modules', ...PACKAGE.split('/'));
  const packageJson = join(packageDir, 'package.json');
  if (!existsSync(packageJson)) return { declared, installed: undefined, form: 'missing' };

  const installedManifest = JSON.parse(readFileSync(packageJson, 'utf8'));
  const bin = typeof installedManifest.bin === 'string' ? installedManifest.bin : installedManifest.bin?.mh;
  const entry = join(packageDir, bin);
  const help = spawnSync(process.execPath, [entry, '--help'], { cwd: root, encoding: 'utf8' });
  const text = help.stdout ?? '';
  const form = /^\s+check\s{2,}/m.test(text) ? 'words' : /^\s+--check\s/m.test(text) ? 'flags' : 'unknown';
  return { declared, installed: installedManifest.version, form, entry };
}

const cli = installedCli();

// ── 2. THE BASELINE ─────────────────────────────────────────────────────────
// What the gate reports today, through the CLI as installed. Taken before
// anything moves, so a later run can be compared with it: a count that changes
// across a migration is a boundary of governance that moved without a decision.

function baseline() {
  if (cli.form !== 'words' && cli.form !== 'flags') return undefined;
  const args = cli.form === 'words' ? ['check'] : ['--check'];
  const run = spawnSync(process.execPath, [cli.entry, ...args, '--config', configName], {
    cwd: root,
    encoding: 'utf8',
  });
  let envelope;
  try {
    envelope = JSON.parse(run.stdout);
  } catch {
    return { exit: run.status, stderr: (run.stderr ?? '').trim().split('\n').slice(-2).join(' ') };
  }
  const result = envelope.result ?? {};
  return {
    exit: run.status,
    command: `mh ${args.join(' ')}`,
    modules: envelope.modules,
    ...(result.summary ?? {}),
    ...(result.faults ? { error: result.error, faults: result.faults } : {}),
  };
}

// ── 3. THE INVOCATIONS ──────────────────────────────────────────────────────
// One scanner for every file. A binary is `mh` or `markdown-harness`, however
// it is reached (`npx`, `node_modules/.bin/`, a Windows shim). Its invocation
// runs until the shell would end it: a quote, `;`, `|`, `&`, `)`, or a newline
// that is not a line continuation. A retired `--verb` inside that stretch moves
// to just after the binary, so `mh --config c.yaml --query p` becomes
// `mh query --config c.yaml p` — flags may sit anywhere in the word grammar.

const BINARY = /(?<![\w.@-])(?:@hancrafted\/)?(?:mh|markdown-harness)(?:\.cmd|\.ps1)?(?=[\s"'`]|$)/g;
const RETIRED = new RegExp(`(\\s+)--(${VERBS.join('|')})(?=\\s|$)`);

function invocationEnd(text, from) {
  for (let at = from; at < text.length; at += 1) {
    const char = text[at];
    if (char === '\n') {
      const before = text[at - 1] === '\r' ? text[at - 2] : text[at - 1];
      if (before === '\\') continue;
      return at;
    }
    if ('"\'`;|&)'.includes(char)) return at;
  }
  return text.length;
}

const lineOf = (text, offset) => text.slice(0, offset).split('\n').length;

/** Every retired invocation in `text`, and the text with all of them rewritten. */
function rewrite(text) {
  const found = [];
  for (const match of text.matchAll(BINARY)) {
    const start = match.index;
    const binaryEnd = start + match[0].length;
    const end = invocationEnd(text, binaryEnd);
    const rest = text.slice(binaryEnd, end);
    const retired = RETIRED.exec(rest);
    if (retired === null) continue;
    const verb = retired[2];
    const restWithout = rest.slice(0, retired.index) + rest.slice(retired.index + retired[0].length);
    found.push({
      start,
      end,
      line: lineOf(text, start),
      before: text.slice(start, end).trim(),
      after: `${match[0]} ${verb}${restWithout}`.trim(),
      replacement: `${match[0]} ${verb}${restWithout}`,
    });
  }
  let next = text;
  for (const hit of [...found].reverse()) next = next.slice(0, hit.start) + hit.replacement + next.slice(hit.end);
  return { found: found.map(({ line, before, after }) => ({ line, before, after })), next };
}

/** package.json and every workflow — the files this script is allowed to rewrite. */
function rewritable() {
  const files = ['package.json'];
  const workflows = join(root, '.github', 'workflows');
  if (existsSync(workflows)) {
    for (const name of readdirSync(workflows).sort()) {
      if (/\.ya?ml$/.test(name)) files.push(`.github/workflows/${name}`);
    }
  }
  return files;
}

/** Every other tracked text file, reported but never rewritten: a Makefile, a husky hook, a README. */
function elsewhere(skip) {
  const listed = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
  if (listed.status !== 0)
    return { scanned: false, reason: 'not a git work tree; scanned package.json and workflows only' };
  const hits = [];
  for (const file of listed.stdout.split('\0').filter(Boolean)) {
    if (skip.has(file) || NEVER_SCANNED.some((pattern) => pattern.test(file))) continue;
    const path = join(root, file);
    let stat;
    try {
      stat = statSync(path);
    } catch {
      continue;
    }
    if (!stat.isFile() || stat.size > MAX_SCANNED_BYTES) continue;
    const text = readFileSync(path, 'utf8');
    if (text.includes('\0')) continue;
    for (const hit of rewrite(text).found) hits.push({ file, line: hit.line, before: hit.before, after: hit.after });
  }
  return { scanned: true, hits };
}

// ── 4. THE CONFIG ───────────────────────────────────────────────────────────
// Reported, never rewritten. Each line names a key the current CLI refuses;
// which translation is right is a question for the user, and the skill asks it.
// The CLI's own faults, once it is the current one, are the authority — these
// lines are what can be known before the dependency moves.

const CONFIG_SIGNS = [
  { kind: 'glob-selector', test: (line) => /(^|[\s{,-])(path|fileName)\s*:/.test(line) },
  {
    kind: 'wildcard-in-selector',
    test: (line) => /(^|[\s{,-])(folders|fileNames)\s*:/.test(line) && line.includes('*'),
  },
  { kind: 'retired-vocabulary', test: (line) => /(^|[\s{,-])vocabulary\s*:/.test(line) },
];

function configFindings() {
  const path = join(root, configName);
  if (!existsSync(path)) return { path: configName, present: false, findings: [] };
  const findings = [];
  readFileSync(path, 'utf8')
    .split('\n')
    .forEach((raw, index) => {
      const line = raw.replace(/(^|\s)#.*$/, '');
      for (const sign of CONFIG_SIGNS) {
        if (sign.test(line)) findings.push({ line: index + 1, kind: sign.kind, text: raw.trim() });
      }
    });
  return { path: configName, present: true, findings };
}

// ── RUN ─────────────────────────────────────────────────────────────────────

const before = baseline();
const files = rewritable();
const invocations = [];
const pending = [];

for (const file of files) {
  const path = join(root, file);
  if (!existsSync(path)) continue;
  const text = readFileSync(path, 'utf8');
  const { found, next } = rewrite(text);
  for (const hit of found) invocations.push({ file, ...hit });
  if (found.length > 0) pending.push({ path, next });
}

const blocked = write && pending.length > 0 && cli.form !== 'words';
if (write && !blocked) {
  for (const { path, next } of pending) {
    if (path.endsWith('package.json')) JSON.parse(next); // never leave a manifest that does not parse
    writeFileSync(path, next);
  }
}
const done = write && !blocked ? 'rewritten' : blocked ? 'blocked' : 'would-rewrite';

report(
  {
    ok: !blocked,
    root,
    write,
    ...(blocked
      ? {
          error: 'CLI_PREDATES_WORDS',
          detail:
            cli.form === 'missing'
              ? `${PACKAGE} is not installed in node_modules; install a release whose --help lists \`check\` as a word, then re-run`
              : `the installed ${PACKAGE} ${cli.installed} speaks the ${cli.form} form; upgrade it first or the gate exits 2 on every run`,
        }
      : {}),
    cli: { declared: cli.declared, installed: cli.installed, form: cli.form },
    baseline: before,
    invocations: invocations.map((hit) => ({ ...hit, done })),
    elsewhere: elsewhere(new Set(files.map((file) => relative(root, join(root, file))))),
    config: configFindings(),
  },
  blocked ? 1 : 0,
);
