#!/usr/bin/env node
// Mint throwaway repositories that look like an adopter's, for end-to-end runs.
//
//   node new-repo.mjs --name wiki-a[,wiki-b] [--name wiki-c] [--under ~/Developer/mh-e2e]
//                     [--source published|<checkout>] [--skip-harness] [--dry-run]
//
// Four fixed steps per repository: a git repo, the dev-tooling harness, the
// markdown-harness package, and the skill. The skill decides WHICH build of
// markdown-harness to install — a local checkout to test unreleased work, or the
// published tarball to test what an adopter would actually get — and passes it in.
// That choice changes what the run proves, so it does not belong in a script.
//
// `--name` takes several; SKILL.md holds the reasoning for minting a comparison
// run in one invocation.
//
// It reports JSON, and refuses rather than overwriting an existing directory: a
// half-recycled repo is the one thing that makes an e2e result untrustworthy. A
// name that collides is refused on its own, and the other names still mint, so
// one stale directory does not cost a whole comparison run.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

// The skill is NOT in the published tarball — `package.json` ships `files: ["dist"]`
// only. `README.md` therefore tells adopters to fetch it from GitHub with the
// skills CLI, and this is that same command. The previous spelling looked for the
// skill inside `node_modules/@hancrafted/markdown-harness/`, a path that cannot
// exist in a published install, so every `--source published` mint exited 1 at the
// last step with three steps already green.
const SKILL_REPO = 'https://github.com/hancrafted/markdown-harness.git';
const SKILL_REF = 'hancrafted/markdown-harness';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);

function report(ok, detail) {
  process.stdout.write(`${JSON.stringify({ ok, ...detail }, undefined, 2)}\n`);
  process.exit(ok ? 0 : 1);
}

// A flag that takes a value must not swallow the NEXT flag as that value. Without
// this, `--under --dry-run` resolves `--under` to the string `--dry-run` and mints
// into a directory of that name, reporting `ok: true` over a garbage path. An
// absent flag still falls back; a flag present with no value is an error, because
// the alternative is guessing which of the two the hand meant.
const value = (name, fallback) => {
  const at = argv.indexOf(name);
  if (at === -1) return fallback;
  const next = argv[at + 1];
  if (next === undefined || next.startsWith('--')) {
    report(false, {
      error: 'MISSING_VALUE',
      detail: `${name} needs a value, and \`${next ?? 'nothing'}\` is not one.`,
    });
  }
  return next;
};

// Repeatable and comma-separated, because both spellings are what a hand reaches
// for. Order is preserved and repeats are dropped, so `--name a,a` mints once
// rather than minting `a` and then refusing `a` as already existing.
const requestedNames = () => {
  const names = [];
  argv.forEach((arg, index) => {
    if (arg !== '--name') return;
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) return;
    next.split(',').forEach((raw) => {
      const name = raw.trim();
      if (name !== '' && !names.includes(name)) names.push(name);
    });
  });
  return names;
};

const names = requestedNames();
const under = value('--under', join(homedir(), 'Developer', 'mh-e2e'));
const source = value('--source', 'published');
const skipHarness = flag('--skip-harness');
const dryRun = flag('--dry-run');

const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', stdio: 'pipe' });
  return { ok: r.status === 0, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
};

const lastLines = (text, count) => text.split('\n').slice(-count).join(' ');
const rootFor = (name) => resolve(under.replace(/^~/, homedir()), name);

if (names.length === 0) {
  report(false, { error: 'NO_NAME', detail: 'Pass --name <repo-name>, repeatable or comma-separated.' });
}

if (dryRun) {
  report(true, {
    dryRun: true,
    source,
    repos: names.map((name) => ({ name, root: rootFor(name), exists: existsSync(rootFor(name)) })),
    detail: 'Nothing was created. A repo reporting `exists` would be refused. Drop --dry-run to mint.',
  });
}

// Which build of the skill a run actually pairs with the package. On a published
// run the package comes from npm at its released version while the skill comes
// from the default branch, so the two agree only while that branch sits on the
// release tag. When they disagree the run is measuring a skill against a package
// that never shipped with it — the "passes on code nobody can install yet" failure
// in a shape that looks green.
//
// `checked` is reported separately from `drift`, because "compared and equal" and
// "never compared" are different answers and a bare `drift: false` cannot tell
// them apart. Every repository carries this block, so a missing one is a bug
// rather than a silent pass.
function provenance(root) {
  if (source !== 'published') {
    return {
      checked: true,
      drift: false,
      detail: 'checkout run: the skill and the package are one tree, so they cannot disagree',
    };
  }

  const manifest = join(root, 'node_modules', '@hancrafted', 'markdown-harness', 'package.json');
  if (!existsSync(manifest))
    return { checked: false, detail: 'package not installed, so there was nothing to compare' };

  const { version } = JSON.parse(readFileSync(manifest, 'utf8'));

  // `git ls-remote` exits 0 with EMPTY output for a ref that does not exist, so an
  // exit-code check alone reads a missing tag as a successful lookup. Returning
  // undefined on empty output is what keeps `refs/tags/v<unreleased>` from
  // comparing HEAD against `''` and reporting drift against nothing.
  const sha = (ref) => {
    const r = run('git', ['ls-remote', SKILL_REPO, ref]);
    const first = r.ok ? r.out.split(/\s+/)[0] : '';
    return first === '' ? undefined : first;
  };

  const skill = sha('HEAD');
  if (skill === undefined) return { checked: false, version, detail: `could not reach ${SKILL_REPO} to read its HEAD` };

  // PEELED with `^{}`. These are annotated tags, so `refs/tags/v0.0.4` resolves to
  // the tag object rather than the commit it points at, and comparing that against
  // HEAD reports drift on every run including the runs that have none.
  const release = sha(`refs/tags/v${version}^{}`);
  if (release === undefined) {
    return {
      checked: false,
      version,
      skillCommit: skill,
      detail: `no v${version} tag on the remote, so the pairing could not be compared`,
    };
  }

  return {
    checked: true,
    drift: skill !== release,
    version,
    skillCommit: skill,
    releaseCommit: release,
    detail:
      skill === release
        ? `skill and package both at ${release.slice(0, 7)}`
        : `WARNING: skill is at ${skill.slice(0, 7)} but package ${version} shipped from ${release.slice(0, 7)}. The run measures a pairing no adopter can install. Release first, or pass --source <checkout> and say so in the result.`,
  };
}

// 1. An empty repository with a manifest, because every later step edits one. The
//    writes are guarded: an uncaught fs error here would throw past the report and
//    exit with no JSON at all, while steps 2-4 capture their faults through
//    `spawnSync`.
function stepRepo(name, root) {
  try {
    mkdirSync(root, { recursive: true });
    writeFileSync(
      join(root, 'package.json'),
      `${JSON.stringify({ name, private: true, type: 'module' }, undefined, 2)}\n`,
    );
    writeFileSync(join(root, '.gitignore'), 'node_modules\n');
    writeFileSync(
      join(root, 'README.md'),
      `# ${name}\n\nThrowaway repository for a markdown-harness end-to-end run.\n`,
    );
  } catch (error) {
    return { step: 'repo', ok: false, detail: `could not create ${root}: ${error.message}` };
  }
  return { step: 'repo', ok: run('git', ['init', '-q'], root).ok, detail: root };
}

// 2. The dev-tooling harness, which is what supplies the `verify` script that init
//    will extend. Skippable because it is the slowest step by far and not every run
//    needs it.
function stepHarness(root) {
  if (skipHarness) return { step: 'harness', ok: true, detail: 'skipped' };
  const harness = run('npx', ['--yes', '@hancrafted/typescript-ai-harness', '--yes'], root);
  return { step: 'harness', ok: harness.ok, detail: harness.ok ? 'installed' : lastLines(harness.err, 3) };
}

// 3. The package under test. A local checkout is linked rather than copied, so
//    edits in the working tree are live in the e2e repo without a reinstall.
function stepPackage(root) {
  if (source === 'published') {
    const install = run('npm', ['install', '--save-dev', '@hancrafted/markdown-harness'], root);
    return { step: 'package', ok: install.ok, detail: install.ok ? 'published tarball' : lastLines(install.err, 3) };
  }

  const checkout = resolve(source.replace(/^~/, homedir()));
  if (!existsSync(join(checkout, 'package.json'))) {
    return { step: 'package', ok: false, detail: `no package.json at ${checkout}` };
  }

  try {
    const scope = join(root, 'node_modules', '@hancrafted');
    mkdirSync(scope, { recursive: true });
    symlinkSync(checkout, join(scope, 'markdown-harness'));
    const manifestPath = join(root, 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.devDependencies = { ...manifest.devDependencies, '@hancrafted/markdown-harness': `file:${checkout}` };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, undefined, 2)}\n`);
  } catch (error) {
    return { step: 'package', ok: false, detail: `could not link ${checkout}: ${error.message}` };
  }
  return { step: 'package', ok: true, detail: `linked ${checkout}` };
}

// 4. The skill. A published run fetches it the way `README.md` tells an adopter to;
//    a checkout run links it, so working-tree edits are live. Either way it must
//    land at `.agents/skills/markdown-harness/`, because the hook's path is
//    hard-coded to `.agents/skills/markdown-harness/scripts/...`. The landing path
//    is checked rather than the exit code: what the next step needs is the
//    directory, not a zero.
function stepSkill(root) {
  const installed = join(root, '.agents', 'skills', 'markdown-harness');

  if (source === 'published') {
    const added = run('npx', ['--yes', 'skills', 'add', SKILL_REF], root);
    if (!existsSync(installed)) {
      return {
        step: 'skill',
        ok: false,
        detail: `\`npx skills add ${SKILL_REF}\` left nothing at ${installed}. ${lastLines(added.err, 3)}`,
      };
    }
    return { step: 'skill', ok: true, detail: `installed by the skills CLI from ${SKILL_REF}` };
  }

  const from = join(resolve(source.replace(/^~/, homedir())), '.agents', 'skills', 'markdown-harness');
  if (!existsSync(from)) return { step: 'skill', ok: false, detail: `not found at ${from}` };

  try {
    mkdirSync(join(root, '.agents', 'skills'), { recursive: true });
    symlinkSync(from, installed);
  } catch (error) {
    return { step: 'skill', ok: false, detail: `could not link ${from}: ${error.message}` };
  }
  return { step: 'skill', ok: true, detail: `linked from ${from}` };
}

// One repository's four steps. A name whose directory already exists is refused
// here rather than in a pre-flight over every name, so the refusal costs that one
// repository instead of the whole run. Later steps still run after an earlier one
// fails, so a single report shows every fault rather than only the first.
function mint(name) {
  const root = rootFor(name);

  // A refused repository still carries a provenance block, so that a missing block
  // stays a bug rather than a quiet pass. It is NOT computed from `root`: the stale
  // directory may hold an unrelated manifest, and reading that would report a
  // pairing this run never installed. It carries no `next` either — there is
  // nothing to continue with until the directory is dealt with.
  if (existsSync(root)) {
    return {
      name,
      root,
      ok: false,
      steps: [
        {
          step: 'repo',
          ok: false,
          detail: `${root} exists. Delete it or pick another --name — recycling a repo makes the result untrustworthy.`,
        },
      ],
      provenance: { checked: false, detail: 'refused before minting, so there was nothing to compare' },
    };
  }

  const steps = [stepRepo(name, root)];
  steps.push(stepHarness(root), stepPackage(root), stepSkill(root));
  return {
    name,
    root,
    ok: steps.every((step) => step.ok),
    steps,
    provenance: provenance(root),
    next: `cd ${root} && node .agents/skills/markdown-harness/scripts/init.mjs --gate verify`,
  };
}

// Each repository is minted even if an earlier one failed: with four of them, the
// useful report is which ones are usable, not where the run stopped.
const repos = names.map(mint);

report(
  repos.every((repo) => repo.ok),
  { source, repos },
);
