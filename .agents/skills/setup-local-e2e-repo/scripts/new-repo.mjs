#!/usr/bin/env node
// Mint a throwaway repository that looks like an adopter's, for end-to-end runs.
//
//   node new-repo.mjs --name wiki-a [--under ~/Developer/mh-e2e] [--skip-harness]
//
// Four fixed steps: a git repo, the dev-tooling harness, the markdown-harness
// package, and the skill. The skill decides WHICH build of markdown-harness to
// install — a local checkout to test unreleased work, or the published tarball to
// test what an adopter would actually get — and passes it in. That choice changes
// what the run proves, so it does not belong in a script.
//
// It reports JSON, and refuses rather than overwriting an existing directory: a
// half-recycled repo is the one thing that makes an e2e result untrustworthy.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const at = argv.indexOf(name);
  return at === -1 || at + 1 >= argv.length ? fallback : argv[at + 1];
};

const name = value('--name', undefined);
const under = value('--under', join(homedir(), 'Developer', 'mh-e2e'));
const source = value('--source', 'published');
const skipHarness = flag('--skip-harness');

function report(ok, detail) {
  process.stdout.write(`${JSON.stringify({ ok, ...detail }, undefined, 2)}\n`);
  process.exit(ok ? 0 : 1);
}

if (name === undefined) report(false, { error: 'NO_NAME', detail: 'Pass --name <repo-name>.' });

const root = resolve(under.replace(/^~/, homedir()), name);
if (existsSync(root)) {
  report(false, {
    error: 'ALREADY_EXISTS',
    detail: `${root} exists. Delete it or pick another --name — recycling a repo makes the result untrustworthy.`,
  });
}

const steps = [];
const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', stdio: 'pipe' });
  return { ok: r.status === 0, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
};

// 1. An empty repository with a manifest, because every later step edits one.
mkdirSync(root, { recursive: true });
writeFileSync(join(root, 'package.json'), `${JSON.stringify({ name, private: true, type: 'module' }, undefined, 2)}\n`);
writeFileSync(join(root, '.gitignore'), 'node_modules\n');
writeFileSync(join(root, 'README.md'), `# ${name}\n\nThrowaway repository for a markdown-harness end-to-end run.\n`);
const git = run('git', ['init', '-q'], root);
steps.push({ step: 'repo', ok: git.ok, detail: root });

// 2. The dev-tooling harness, which is what supplies the `verify` script that
//    init will extend. Skippable because it is the slowest step by far and not
//    every run needs it.
if (skipHarness) {
  steps.push({ step: 'harness', ok: true, detail: 'skipped' });
} else {
  const harness = run('npx', ['--yes', '@hancrafted/typescript-ai-harness', '--yes'], root);
  steps.push({
    step: 'harness',
    ok: harness.ok,
    detail: harness.ok ? 'installed' : harness.err.split('\n').slice(-3).join(' '),
  });
}

// 3. The package under test. A local checkout is linked rather than copied, so
//    edits in the working tree are live in the e2e repo without a reinstall.
if (source === 'published') {
  const install = run('npm', ['install', '--save-dev', '@hancrafted/markdown-harness'], root);
  steps.push({
    step: 'package',
    ok: install.ok,
    detail: install.ok ? 'published tarball' : install.err.split('\n').slice(-3).join(' '),
  });
} else {
  const checkout = resolve(source.replace(/^~/, homedir()));
  if (!existsSync(join(checkout, 'package.json'))) {
    steps.push({ step: 'package', ok: false, detail: `no package.json at ${checkout}` });
  } else {
    const scope = join(root, 'node_modules', '@hancrafted');
    mkdirSync(scope, { recursive: true });
    symlinkSync(checkout, join(scope, 'markdown-harness'));
    const manifestPath = join(root, 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.devDependencies = { ...manifest.devDependencies, '@hancrafted/markdown-harness': `file:${checkout}` };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, undefined, 2)}\n`);
    steps.push({ step: 'package', ok: true, detail: `linked ${checkout}` });
  }
}

// 4. The skill, linked the same way the skills CLI lays it out, so the hook's
//    hard-coded `.agents/skills/markdown-harness/scripts/...` path resolves.
{
  const skills = join(root, '.agents', 'skills');
  mkdirSync(skills, { recursive: true });
  const from =
    source === 'published'
      ? join(root, 'node_modules', '@hancrafted', 'markdown-harness', '.agents', 'skills', 'markdown-harness')
      : join(resolve(source.replace(/^~/, homedir())), '.agents', 'skills', 'markdown-harness');

  if (existsSync(from)) {
    symlinkSync(from, join(skills, 'markdown-harness'));
    steps.push({ step: 'skill', ok: true, detail: 'linked from the checkout' });
  } else {
    steps.push({
      step: 'skill',
      ok: false,
      detail: `Not found at ${from}. The published tarball ships only dist/, so install the skill with \`npx skills add hancrafted/markdown-harness\` from inside ${root}.`,
    });
  }
}

const failed = steps.filter((s) => !s.ok);
report(failed.length === 0, {
  root,
  source,
  steps,
  next: `cd ${root} && node .agents/skills/markdown-harness/scripts/init.mjs --gate verify`,
});
