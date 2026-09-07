// Integration suite for the `mh` entry point, at the process boundary.
//
// Exit codes and the stdout/stderr split are contract, and neither is
// observable from inside the process. The entry file is resolved from
// `package.json`'s `bin.mh` rather than hard-coded, so a declaration that goes
// missing fails this suite instead of being quietly worked around — and since
// that declaration now names a build artefact, so does one that was never
// built.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const CONFIG = 'fixtures/conformance/valid-test-config.yaml';
const KIT_ROOT = 'docs/evals/ablation/kit/fixtures';
const KIT_CONFIG = 'docs/evals/ablation/kit/fixtures/valid-test-config.yaml';
const CORPUS_ROOT = 'fixtures/conformance';
const USAGE_LEAD = 'usage: mh';
const REJECTED = 'CONFIG_REJECTED';
const GOVERNED = 'governed';
const INVISIBLE = 'invisible';

const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
  bin?: { mh?: string };
  engines?: { node?: string };
};
const declared = manifest.bin?.mh;
if (declared === undefined) throw new Error('package.json must declare bin.mh for this suite to run');
const entry = declared;

// The forgotten build, named. Measured 2026-09-07 with the guard off and
// `dist/` moved aside: 24 of this file's 26 tests failed — 15 value mismatches
// and 9 `SyntaxError: Unexpected end of JSON input` from parsing an empty
// stdout — and not one of them mentioned a build. So the suite refuses to start
// instead, in one sentence that does. The shape is the acceptance kit's own
// runner's, which refuses when the manifest declares no entry and names the
// manifest key in its message.
//
// The ordinary path never meets this, because `npm run verify` builds before it
// tests. It exists for the direct and watch-mode runs that bypass that chain.
if (!existsSync(entry)) {
  throw new Error(`package.json bin.mh names "${entry}", and nothing is there — run \`npm run build\` first.`);
}

/**
 * The supported Node range, read off the manifest rather than written out here.
 *
 * An adopter's installer reads `engines.node`; the command prints its own range
 * when it refuses. Asserting that the printed text carries this value is what
 * keeps the two from drifting apart — there is no third place to check.
 */
const engines = manifest.engines?.node;
if (engines === undefined) throw new Error('package.json must declare engines.node for this suite to run');

/**
 * A corpus planted in a tmpdir, with a config that governs every markdown file
 * the walker enumerates.
 *
 * The refusals are only observable under a config broad enough to select what
 * the walker should never have handed over: a file no rule selects is invisible
 * either way, so a narrower config reads the same whether the walker refused
 * `node_modules/` or not. The kit ships such a config, but planting a
 * `node_modules/` fixture under `docs/evals/ablation/kit/` would change
 * `kit.sha256` and make every future mint refuse to run.
 */
let planted = '';
let plantedConfig = '';

/**
 * A corpus with nothing wrong with it, so exit 0 can be proven.
 *
 * Neither the kit nor `fixtures/conformance/` can serve here: both are built
 * to fail, and a `--check` that always exited 1 would satisfy every other
 * assertion in this file.
 */
let conforming = '';
let conformingConfig = '';

/** Where the one-line Node-version stand-ins are written. See `mhOnNode`. */
let shimmed = '';

beforeAll(() => {
  planted = mkdtempSync(join(tmpdir(), 'mh-cli-audit-'));

  mkdirSync(join(planted, 'node_modules', 'pkg'), { recursive: true });
  mkdirSync(join(planted, '.git'), { recursive: true });

  writeFileSync(join(planted, 'kept.md'), '');
  writeFileSync(join(planted, 'node_modules', 'pkg', 'refused.md'), '');
  writeFileSync(join(planted, '.git', 'refused.md'), '');

  shimmed = mkdtempSync(join(tmpdir(), 'mh-node-shim-'));

  conforming = mkdtempSync(join(tmpdir(), 'mh-check-clean-'));
  writeFileSync(join(conforming, 'ok.md'), '---\ntype: note\n---\n');
  conformingConfig = join(conforming, 'clean.config.yaml');
  writeFileSync(
    conformingConfig,
    [
      'frontmatter:',
      '  rules:',
      '    - ruleId: every-markdown-file',
      "      path: ['**/*.md']",
      '      intent: Every markdown file says what it is',
      '      fields:',
      '        type:',
      '          presence: required',
      '',
    ].join('\n'),
  );

  plantedConfig = join(planted, 'walker.config.yaml');
  writeFileSync(
    plantedConfig,
    [
      'frontmatter:',
      '  rules:',
      '    - ruleId: every-markdown-file',
      "      path: ['**/*.md']",
      '      intent: Governs every markdown file the walker enumerates',
      '      fields:',
      '        type:',
      '          presence: required',
      '',
    ].join('\n'),
  );
});

afterAll(() => {
  rmSync(planted, { recursive: true, force: true });
  rmSync(conforming, { recursive: true, force: true });
  rmSync(shimmed, { recursive: true, force: true });
});

/** Run the built entry file the way a caller would, and report all three channels. */
function mh(...args: readonly string[]): { stdout: string; stderr: string; code: number | null } {
  const run = spawnSync(process.execPath, [entry, ...args], { encoding: 'utf8' });
  return { stdout: run.stdout, stderr: run.stderr, code: run.status };
}

/**
 * Run the entry under a STATED Node version rather than under this one.
 *
 * The runtime floor is only observable from a Node the floor rejects, and there
 * is no such Node here to run on. The honest way to arrange one is to hand the
 * spawned process a stand-in for the single ambient read the floor makes — one
 * line, written out below where a reader can see it does nothing else. It runs
 * in the CHILD, so this suite's own process keeps its real version, and the
 * shipped code carries no test hook: `process.versions.node` is what every real
 * Node reports and what the floor reads.
 *
 * `defineProperty` rather than assignment: the property is read-only, and a
 * plain write is discarded without a word outside strict mode.
 */
function mhOnNode(
  version: string,
  ...args: readonly string[]
): { stdout: string; stderr: string; code: number | null } {
  const shim = join(shimmed, `node-${version}.mjs`);
  const stand = `Object.defineProperty(process.versions, 'node', { value: ${JSON.stringify(version)} });\n`;
  writeFileSync(shim, stand);

  const run = spawnSync(process.execPath, ['--import', pathToFileURL(shim).href, entry, ...args], {
    encoding: 'utf8',
  });
  return { stdout: run.stdout, stderr: run.stderr, code: run.status };
}

describe('mh', () => {
  describe('success cases', () => {
    it('answers a governed query on stdout and exits 0', () => {
      // ARRANGE
      const success = 0;
      const empty = '';
      // ACT
      const run = mh('--query', 'docs/reference/api-limits.md', '--config', CONFIG);
      // ASSERT
      expect(run.code).toBe(success);
      expect(run.stderr).toBe(empty);
      expect(JSON.parse(run.stdout).result.governance).toBe(GOVERNED);
    });

    it('answers an audit on stdout and exits 0', () => {
      // ARRANGE
      const success = 0;
      const empty = '';
      const auditing = 'audit';
      // ACT
      const run = mh('--audit', '--root', CORPUS_ROOT, '--config', CONFIG);
      // ASSERT
      expect(run.code).toBe(success);
      expect(run.stderr).toBe(empty);
      expect(JSON.parse(run.stdout).command).toBe(auditing);
    });

    it('gives every rule a row, including the ones that governed nothing', () => {
      // A rule that wins no file reports nothing anywhere else, so its row is
      // the only place an ordering mistake or a glob typo becomes visible.
      //
      // The count tracks `fixtures/conformance/valid-test-config.yaml`. ARCH-002
      // makes growing that config a reviewed act, so stating the number here
      // rather than counting it back off the file keeps this test part of that
      // review instead of silently agreeing with whatever the config now says.
      // ARRANGE
      const declaredRules = 9;
      const rowShape = ['rule', 'won', 'shadowed', 'shadowedBy', 'excluded'];
      // ACT
      const run = mh('--audit', '--root', CORPUS_ROOT, '--config', CONFIG);
      const rows = JSON.parse(run.stdout).result.rules;
      // ASSERT
      expect(rows).toHaveLength(declaredRules);
      expect(Object.keys(rows[0])).toEqual(rowShape);
    });

    it('answers an ungoverned path as invisible and still exits 0', () => {
      // ARRANGE
      const success = 0;
      // ACT
      const run = mh('--query', 'README.md', '--config', CONFIG);
      // ASSERT
      expect(run.code).toBe(success);
      expect(JSON.parse(run.stdout).result.governance).toBe(INVISIBLE);
    });
  });

  describe('failure cases', () => {
    it('puts usage on stderr, nothing on stdout, and exits 2', () => {
      // The two flavours of exit 2 are told apart by channel, never by number.
      // ARRANGE
      const refused = 2;
      const empty = '';
      // ACT
      const run = mh('--verbose');
      // ASSERT
      expect(run.code).toBe(refused);
      expect(run.stdout).toBe(empty);
      expect(run.stderr.slice(0, USAGE_LEAD.length)).toBe(USAGE_LEAD);
    });

    it('puts a rejected config on stdout, nothing on stderr, and exits 2', () => {
      // ARRANGE
      const refused = 2;
      const empty = '';
      // ACT
      const run = mh('--query', 'docs/a.md', '--config', 'no-such-config.yaml');
      // ASSERT
      expect(run.code).toBe(refused);
      expect(run.stderr).toBe(empty);
      expect(JSON.parse(run.stdout).result.error).toBe(REJECTED);
    });

    it('defaults the bare invocation to --check and rejects the missing default config', () => {
      // A CONTRACT CHANGE from the phase that refused `--check` as a usage
      // error: the bare invocation now runs, with both documented defaults
      // applied, and fails on the config rather than on the argv.
      // ARRANGE
      const refused = 2;
      const checking = 'check';
      const notFound = 'CONFIG_NOT_FOUND';
      const empty = '';
      // ACT
      const run = mh();
      const body = JSON.parse(run.stdout);
      // ASSERT
      expect(run.code).toBe(refused);
      expect(run.stderr).toBe(empty);
      expect(body.command).toBe(checking);
      expect(body.result.faults.map((fault: { code: string }) => fault.code)).toEqual([notFound]);
    });

    it('refuses a root that does not exist rather than auditing an empty corpus', () => {
      // The acceptance criterion this exists for: a mistyped root is a usage
      // error, never a report over nothing.
      // ARRANGE
      const refused = 2;
      const empty = '';
      // ACT
      const run = mh('--audit', '--root', 'no-such-directory', '--config', CONFIG);
      // ASSERT
      expect(run.code).toBe(refused);
      expect(run.stdout).toBe(empty);
      expect(run.stderr.slice(0, USAGE_LEAD.length)).toBe(USAGE_LEAD);
    });

    it('rejects a config on stdout even though the command was --audit', () => {
      // "Never exits 1" is a statement about the corpus, not a promise of 0.
      // ARRANGE
      const refused = 2;
      const empty = '';
      // ACT
      const run = mh('--audit', '--root', CORPUS_ROOT, '--config', 'no-such-config.yaml');
      // ASSERT
      expect(run.code).toBe(refused);
      expect(run.stderr).toBe(empty);
      expect(JSON.parse(run.stdout).result.error).toBe(REJECTED);
    });

    it('refuses a root combined with a query', () => {
      // ARRANGE
      const refused = 2;
      const empty = '';
      // ACT
      const run = mh('--root', 'docs', '--query', 'docs/a.md');
      // ASSERT
      expect(run.code).toBe(refused);
      expect(run.stdout).toBe(empty);
    });
  });

  describe('edge cases', () => {
    it('writes JSON with two-space indentation and a trailing newline', () => {
      // ARRANGE
      const indented = '\n  "command"';
      const trailing = '}\n';
      // ACT
      const run = mh('--query', 'README.md', '--config', CONFIG);
      // ASSERT
      expect(run.stdout).toContain(indented);
      expect(run.stdout.slice(-trailing.length)).toBe(trailing);
    });

    it('echoes path and config exactly as written, never resolved', () => {
      // ARRANGE
      const written = './docs/reference/api-limits.md';
      // ACT
      const run = mh('--query', written, '--config', CONFIG);
      // ASSERT
      expect(JSON.parse(run.stdout).path).toBe(written);
      expect(JSON.parse(run.stdout).config).toBe(CONFIG);
    });

    it('never lets a refused directory into the corpus it audits', () => {
      // Measured, not assumed: `node_modules/x.md` DOES match `**/*.md` under
      // the platform matcher, so this count is the only thing standing between
      // an adopter and every dependency they ever installed.
      // ARRANGE
      const onlyKeptMd = 1;
      // ACT
      const run = mh('--audit', '--root', planted, '--config', plantedConfig);
      const rows = JSON.parse(run.stdout).result.rules;
      // ASSERT
      expect(rows[0].won).toBe(onlyKeptMd);
    });

    it('echoes an audit root and config exactly as written, never resolved', () => {
      // ARRANGE
      const written = './fixtures/conformance';
      // ACT
      const run = mh('--audit', '--root', written, '--config', CONFIG);
      // ASSERT
      expect(JSON.parse(run.stdout).root).toBe(written);
      expect(JSON.parse(run.stdout).config).toBe(CONFIG);
    });

    it('emits nothing at all on stdout when argv is refused', () => {
      // ARRANGE
      const empty = '';
      // ACT
      const run = mh('--check', '--audit');
      // ASSERT
      expect(run.stdout).toBe(empty);
    });
  });
});

// ---------------------------------------------------------------------------
// The end-stage corroboration, against the frozen acceptance kit.
// ---------------------------------------------------------------------------
//
// The kit is NOT ours to edit, and this suite is READ-ONLY over it: it spawns
// the binary with the kit as `--root` and asserts the verdict the kit's own
// frozen suite asserts. The kit's tests are named `*.acceptance.ts`, so vitest's
// include never picks them up here — which is exactly why this file has to
// restate the numbers rather than rely on them running.
//
// Every expected value below is written out by hand. Counting them back off the
// kit would make the assertion agree with whatever the kit now says, and the
// point of a frozen verdict is that it cannot.

describe('mh --check against the frozen acceptance kit', () => {
  describe('success cases', () => {
    it('reproduces the frozen verdict and exits 1', () => {
      // ARRANGE
      const summary = { governedFiles: 24, invalidFiles: 15, totalViolations: 22 };
      const corpusIsWrong = 1;
      const empty = '';
      // ACT
      const run = mh('--check', '--root', KIT_ROOT, '--config', KIT_CONFIG);
      const body = JSON.parse(run.stdout);
      // ASSERT
      expect(body.result.summary).toEqual(summary);
      expect(run.code).toBe(corpusIsWrong);
      expect(run.stderr).toBe(empty);
    });

    it('lists every file carrying a violation, in walker order', () => {
      // ARRANGE
      const paths = [
        'docs/plain/empty-type.md',
        'docs/plain/untyped.md',
        'docs/reference/drafty.md',
        'docs/reference/legacy.md',
        'docs/research/index.md',
        'docs/research/mistyped-tags.md',
        'docs/research/over-tagged.md',
        'docs/research/provenance-broken.md',
        'docs/research/unsourced.md',
        'docs/research/untagged.md',
        'docs/skills/anonymous/SKILL.md',
        'docs/skills/legacy/SKILL.md',
        'docs/workflows/overlong.md',
        'docs/workflows/terse.md',
        'docs/workflows/undescribed.md',
      ];
      // ACT
      const run = mh('--check', '--root', KIT_ROOT, '--config', KIT_CONFIG);
      const actual = JSON.parse(run.stdout).result.files.map((file: { path: string }) => file.path);
      // ASSERT
      expect(actual).toEqual(paths);
    });

    it('reaches all eighteen violation codes', () => {
      // The corpus is built to reach every one. A code no corpus reaches is a
      // code nothing has checked, which is why this is asserted as a SET
      // equality rather than a count.
      // ARRANGE
      const codes = [
        'ALL_OF_UNSATISFIED',
        'ANY_OF_UNSATISFIED',
        'CONSTRAINT_SHAPE_MISMATCH',
        'EMPTY_REQUIRED_FIELD',
        'EXACTLY_ONE_OF_MULTIPLE_PRESENT',
        'EXACTLY_ONE_OF_NONE_PRESENT',
        'FORBIDDEN_FIELD_PRESENT',
        'FORMAT_MISMATCH',
        'FRONTMATTER_FORBIDDEN',
        'ITEM_TOO_LONG',
        'MISSING_REQUIRED_FIELD',
        'PATTERN_MISMATCH',
        'TOO_FEW_ITEMS',
        'TOO_MANY_ITEMS',
        'UNKNOWN_KEY_FORBIDDEN',
        'VALUE_NOT_ALLOWED',
        'VALUE_TOO_LONG',
        'VALUE_TOO_SHORT',
      ];
      // ACT
      const run = mh('--check', '--root', KIT_ROOT, '--config', KIT_CONFIG);
      const files = JSON.parse(run.stdout).result.files as { violations: { violation: string }[] }[];
      const reached = files.flatMap((file) => file.violations.map((found) => found.violation));
      // ASSERT
      expect([...new Set(reached)].sort()).toEqual(codes);
    });
  });

  describe('failure cases', () => {
    it('reports a too-short title with the rule that won the file and its intent', () => {
      // The one row the kit pins exactly, so every key of it is contract: the
      // file carries `ruleId` and `ruleIntent`, the violation carries the
      // config fragment verbatim, and there is no `message` anywhere.
      // ARRANGE
      const row = {
        path: 'docs/workflows/terse.md',
        ruleId: 'workflows',
        ruleIntent: 'A workflow names itself and says when to reach for it',
        violations: [
          {
            field: 'title',
            value: 'ci',
            violation: 'VALUE_TOO_SHORT',
            requirement: { minLength: 3, maxLength: 80 },
          },
        ],
      };
      // ACT
      const run = mh('--check', '--root', KIT_ROOT, '--config', KIT_CONFIG);
      const files = JSON.parse(run.stdout).result.files as { path: string }[];
      const actual = files.find((file) => file.path === row.path);
      // ASSERT
      expect(actual).toEqual(row);
    });
  });

  describe('edge cases', () => {
    it('leaves the kit tree untouched, having only read it', () => {
      // The kit is content-pinned: writing under it would make every future
      // mint refuse to run, and the refusal would name drift rather than cause.
      // ARRANGE
      const clean = '';
      // ACT
      mh('--check', '--root', KIT_ROOT, '--config', KIT_CONFIG);
      const status = spawnSync('git', ['status', '--porcelain', 'docs/evals/ablation/kit'], { encoding: 'utf8' });
      // ASSERT
      expect(status.stdout).toBe(clean);
    });

    it('exits 0 on a corpus with nothing wrong with it', () => {
      // "Exits 1 when the corpus is wrong" needs the other direction proven too,
      // or a command that always exited 1 would satisfy every test above.
      // ARRANGE
      const nothingWrong = 0;
      const clean = { governedFiles: 1, invalidFiles: 0, totalViolations: 0 };
      // ACT
      const run = mh('--check', '--root', conforming, '--config', conformingConfig);
      // ASSERT
      expect(run.code).toBe(nothingWrong);
      expect(JSON.parse(run.stdout).result.summary).toEqual(clean);
    });
  });
});

// ---------------------------------------------------------------------------
// The runtime floor, at the same process seam.
// ---------------------------------------------------------------------------
//
// `engines` is advisory — npm enforces it only for an adopter who opted into
// strictness — so the command refuses for itself rather than trusting the
// installer to have done it. What that protects is tenet 3: path matching
// delegates to the platform's glob matcher, whose behaviour is fixed by the
// matcher bundled with each Node release, and outside the declared range the
// same tree gives a different result out. A refusal is the only honest answer
// available there, and it is preferable to a quietly different one.

describe('mh under a stated Node version', () => {
  describe('success cases', () => {
    it('answers normally on the first release of the upper window', () => {
      // ARRANGE
      const supported = '26.1.0';
      const success = 0;
      const empty = '';
      // ACT
      const run = mhOnNode(supported, '--query', 'docs/reference/api-limits.md', '--config', CONFIG);
      // ASSERT
      expect(run.code).toBe(success);
      expect(run.stderr).toBe(empty);
      expect(JSON.parse(run.stdout).result.governance).toBe(GOVERNED);
    });
  });

  describe('failure cases', () => {
    it('refuses a Node the range excludes, naming the range on stderr, and exits 2', () => {
      // A THIRD thing stderr carries, and deliberately so: the usage text
      // answers "what did you ask for", and this answers "not on this machine".
      // Both are refusals to report at all, which is what stderr is for here.
      // ARRANGE
      const unsupported = '25.4.0';
      const refused = 2;
      const empty = '';
      // ACT
      const run = mhOnNode(unsupported, '--query', 'README.md', '--config', CONFIG);
      // ASSERT
      expect(run.code).toBe(refused);
      expect(run.stdout).toBe(empty);
      expect(run.stderr).toContain(engines);
      expect(run.stderr).toContain(unsupported);
    });

    it('refuses before it reads anything, so a doomed invocation still names the runtime', () => {
      // The bare invocation would otherwise reject a missing default config on
      // stdout and exit 2 for THAT reason. Both exit 2, so the channel is the
      // only thing telling "wrong runtime" from "wrong config" apart — and only
      // one of the two is worth an Operator's next five minutes.
      // ARRANGE
      const unsupported = '22.20.0';
      const refused = 2;
      const empty = '';
      // ACT
      const run = mhOnNode(unsupported);
      // ASSERT
      expect(run.code).toBe(refused);
      expect(run.stdout).toBe(empty);
      expect(run.stderr).toContain(engines);
    });
  });

  describe('edge cases', () => {
    it('takes each window at its first release and refuses the release below it', () => {
      // Written out by hand, because the boundaries ARE the decision. A
      // prerelease is read as its release: `26.1.0-rc.1` is below `26.1.0` to
      // semver, and refusing it would be a refusal about version syntax rather
      // than about matcher behaviour, which is the only thing at stake.
      // ARRANGE
      const nothingWrong = 0;
      const cannotReport = 2;
      const boundaries = [
        { version: '22.20.0', code: cannotReport },
        { version: '24.15.9', code: cannotReport },
        { version: '24.16.0', code: nothingWrong },
        { version: '24.99.0', code: nothingWrong },
        { version: '25.0.0', code: cannotReport },
        { version: '26.0.9', code: cannotReport },
        { version: '26.1.0', code: nothingWrong },
        { version: '26.1.0-rc.1', code: nothingWrong },
        { version: '27.0.0', code: nothingWrong },
      ];
      // ACT
      const actual = boundaries.map(({ version }) => ({
        version,
        code: mhOnNode(version, '--query', 'README.md', '--config', CONFIG).code,
      }));
      // ASSERT
      expect(actual).toEqual(boundaries);
    });

    it('refuses a version it cannot read rather than assuming it is new enough', () => {
      // Nothing reports this; a nightly reports `27.0.0-nightly…`, which parses.
      // What the case pins is the direction of the doubt.
      // ARRANGE
      const unreadable = 'not-a-version';
      const refused = 2;
      const empty = '';
      // ACT
      const run = mhOnNode(unreadable, '--query', 'README.md', '--config', CONFIG);
      // ASSERT
      expect(run.code).toBe(refused);
      expect(run.stdout).toBe(empty);
      expect(run.stderr).toContain(engines);
    });
  });
});
