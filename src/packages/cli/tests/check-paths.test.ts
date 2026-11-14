// Scoped checks, observed only through the compiled CLI process.
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as { bin: { mh: string } };
const entry = resolve(manifest.bin.mh);
let tree = '';
const config = 'markdown-harness.config.yaml';
const expectedModules = ['frontmatter', 'body-structure'];
const cleanSummary = { governedFiles: 1, invalidFiles: 0, totalViolations: 0 };
const fullSummary = { governedFiles: 3, invalidFiles: 2, totalViolations: 2 };
const usageLead = 'usage: mh';
const usageCode = 2;
const indentation = 2;
const moduleConfig = 'modules.yaml';

function mh(args: readonly string[], cwd = tree) {
  const child = spawnSync(process.execPath, [entry, ...args], { cwd, encoding: 'utf8' });
  if (child.error) throw child.error;
  return { code: child.status, stdout: child.stdout, stderr: child.stderr };
}

beforeAll(() => {
  tree = mkdtempSync(join(tmpdir(), 'mh-check-paths-'));
  mkdirSync(join(tree, 'docs'));
  mkdirSync(join(tree, 'docs-extra'));
  mkdirSync(join(tree, 'notes'));
  writeFileSync(join(tree, 'docs', 'clean.md'), '---\ntype: note\n---\n## Too deep\n');
  writeFileSync(join(tree, 'docs', 'bad.md'), '---\nother: note\n---\n');
  writeFileSync(join(tree, 'docs-extra', 'bad.md'), '---\nother: note\n---\n');
  writeFileSync(join(tree, 'notes', 'free.md'), '# Ungoverned\n');
  writeFileSync(
    join(tree, config),
    [
      'frontmatter:',
      '  rules:',
      '    - ruleId: typed',
      "      folders: ['docs/', 'docs-extra/']",
      '      intent: Every document says what it is',
      '      fields:',
      '        type:',
      '          presence: required',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(tree, moduleConfig),
    readFileSync(join(tree, config), 'utf8') +
      [
        'body-structure:',
        '  rules:',
        '    - ruleId: shallow',
        "      folders: ['docs/']",
        '      intent: Documents have shallow headings',
        '      maxLevel: 1',
        '',
      ].join('\n'),
  );
  writeFileSync(join(tree, 'rejected.yaml'), 'unknown-module: {}\n');
  writeFileSync(
    join(tree, 'root.yaml'),
    readFileSync(join(tree, config), 'utf8').replace("['docs/', 'docs-extra/']", "['./']"),
  );
});

afterAll(() => rmSync(tree, { recursive: true, force: true }));

describe('check paths at the process boundary', () => {
  describe('success cases', () => {
    it('counts a clean governed path even when other files are invalid', () => {
      // ARRANGE
      const paths = ['./docs/clean.md'];
      const expected = {
        command: 'check',
        modules: expectedModules,
        root: '.',
        config,
        paths,
        result: { summary: cleanSummary, files: [], ungovernedPaths: [] },
      };
      // ACT
      const answer = mh(['check', ...paths]);
      // ASSERT
      expect(answer.code).toBe(0);
      expect(answer.stderr).toBe('');
      expect(answer.stdout).toBe(`${JSON.stringify(expected, null, indentation)}\n`);
    });
    it('reports existing ungoverned files and directories in raw input order without counting them', () => {
      // ARRANGE
      const paths = ['notes/free.md', './notes/', 'notes/free.md'];
      const expected = {
        summary: { governedFiles: 0, invalidFiles: 0, totalViolations: 0 },
        files: [],
        ungovernedPaths: paths,
      };
      // ACT
      const answer = mh(['check', ...paths]);
      const envelope = JSON.parse(answer.stdout);
      // ASSERT
      expect(answer.code).toBe(0);
      expect(answer.stderr).toBe('');
      expect(envelope.paths).toEqual(paths);
      expect(envelope.result).toEqual(expected);
    });
    it('resolves paths, --root and --config independently from cwd', () => {
      // ARRANGE
      const paths = ['./clean.md'];
      const root = '.';
      const configPath = '../root.yaml';
      const expected = {
        command: 'check',
        modules: expectedModules,
        root,
        config: configPath,
        paths,
        result: { summary: cleanSummary, files: [], ungovernedPaths: [] },
      };
      // ACT
      const answer = mh(['check', ...paths, '--root', root, '--config', configPath], join(tree, 'docs'));
      // ASSERT
      expect(answer.code).toBe(0);
      expect(answer.stderr).toBe('');
      expect(answer.stdout).toBe(`${JSON.stringify(expected, null, indentation)}\n`);
    });
    it('composes Module and path scope while ignoring other Modules findings', () => {
      // ARRANGE
      const paths = ['docs/clean.md'];
      const modules = ['frontmatter'];
      const expected = { summary: cleanSummary, files: [], ungovernedPaths: [] };
      // ACT
      const answer = mh(['frontmatter', 'check', ...paths, '--config', moduleConfig]);
      const envelope = JSON.parse(answer.stdout);
      // ASSERT
      expect(answer.code).toBe(0);
      expect(answer.stderr).toBe('');
      expect(envelope.modules).toEqual(modules);
      expect(envelope.paths).toEqual(paths);
      expect(envelope.result).toEqual(expected);
    });
    it('marks a path ungoverned relative to the selected Module', () => {
      // ARRANGE
      const paths = ['docs-extra/bad.md'];
      const modules = ['body-structure'];
      const expected = {
        summary: { governedFiles: 0, invalidFiles: 0, totalViolations: 0 },
        files: [],
        ungovernedPaths: paths,
      };
      // ACT
      const answer = mh(['body-structure', 'check', ...paths, '--config', moduleConfig]);
      const envelope = JSON.parse(answer.stdout);
      // ASSERT
      expect(answer.code).toBe(0);
      expect(envelope.modules).toEqual(modules);
      expect(envelope.result).toEqual(expected);
    });
  });
  describe('failure cases', () => {
    it('reports violations on the full corpus', () => {
      // ARRANGE
      const args = ['check'];
      const expected = {
        command: 'check',
        modules: expectedModules,
        root: '.',
        config,
        result: {
          summary: fullSummary,
          files: ['docs-extra/bad.md', 'docs/bad.md'].map((path) => ({
            path,
            modules: [
              {
                module: 'frontmatter',
                ruleId: 'typed',
                ruleIntent: 'Every document says what it is',
                violations: [
                  {
                    field: 'type',
                    violation: 'FRONTMATTER__MISSING_REQUIRED_FIELD',
                    requirement: { presence: 'required' },
                  },
                ],
              },
            ],
          })),
        },
      };
      // ACT
      const answer = mh(args);
      const result = JSON.parse(answer.stdout).result;
      // ASSERT
      expect(answer.code).toBe(1);
      expect(answer.stderr).toBe('');
      expect(result.summary).toEqual(fullSummary);
      expect(answer.stdout).toBe(`${JSON.stringify(expected, null, indentation)}\n`);
    });
    it('preserves a violating files full verdict and exits on only the scoped findings', () => {
      // ARRANGE
      const path = 'docs/bad.md';
      const summary = { governedFiles: 1, invalidFiles: 1, totalViolations: 1 };
      const moduleName = 'frontmatter';
      const code = 'FRONTMATTER__MISSING_REQUIRED_FIELD';
      // ACT
      const full = mh(['check']);
      const scoped = mh(['check', path]);
      const fullFile = JSON.parse(full.stdout).result.files.find((file: { path: string }) => file.path === path);
      const result = JSON.parse(scoped.stdout).result;
      // ASSERT
      expect(scoped.code).toBe(1);
      expect(scoped.stderr).toBe('');
      expect(result.summary).toEqual(summary);
      expect(result.files).toEqual([fullFile]);
      expect(result.files[0].path).toBe(path);
      expect(result.files[0].modules[0].module).toBe(moduleName);
      expect(result.files[0].modules[0].violations[0].violation).toBe(code);
      expect(result.ungovernedPaths).toEqual([]);
    });
    it('retains a Module-scoped violation and the union count across Modules', () => {
      // ARRANGE
      const path = 'docs/clean.md';
      const summary = { governedFiles: 1, invalidFiles: 1, totalViolations: 1 };
      const modules = ['body-structure'];
      // ACT
      const module = mh(['body-structure', 'check', path, '--config', moduleConfig]);
      const full = mh(['check', '--config', moduleConfig]);
      const scoped = mh(['check', path, '--config', moduleConfig]);
      const moduleEnvelope = JSON.parse(module.stdout);
      const fullFile = JSON.parse(full.stdout).result.files.find((file: { path: string }) => file.path === path);
      const scopedResult = JSON.parse(scoped.stdout).result;
      // ASSERT
      expect(module.code).toBe(1);
      expect(moduleEnvelope.modules).toEqual(modules);
      expect(moduleEnvelope.result.summary).toEqual(summary);
      expect(scoped.code).toBe(1);
      expect(scopedResult.summary).toEqual(summary);
      expect(scopedResult.files).toEqual([fullFile]);
    });
    it('counts a file governed and violated by two Modules only once', () => {
      // ARRANGE
      const file = join(tree, 'notes', 'both.md');
      const selected = 'notes/both.md';
      const configPath = join(tree, 'notes-modules.yaml');
      writeFileSync(file, '---\nother: note\n---\n## Too deep\n');
      writeFileSync(
        configPath,
        readFileSync(join(tree, moduleConfig), 'utf8')
          .replace("['docs/', 'docs-extra/']", "['./']")
          .replace("['docs/']", "['./']"),
      );
      const summary = { governedFiles: 1, invalidFiles: 1, totalViolations: 2 };
      const modules = ['frontmatter', 'body-structure'];
      // ACT
      let answer;
      try {
        answer = mh(['check', selected, '--root', 'notes', '--config', configPath]);
      } finally {
        rmSync(file);
        rmSync(configPath);
      }
      const result = JSON.parse(answer.stdout).result;
      // ASSERT
      expect(answer.code).toBe(1);
      expect(answer.stderr).toBe('');
      expect(result.summary).toEqual(summary);
      expect(result.files[0].modules.map((module: { module: string }) => module.module)).toEqual(modules);
    });
    it.each(['missing.md', 'notes/missing', 'docs/bad.md/child'])('names missing path %s as a usage error', (path) => {
      // ARRANGE
      const args = ['check', path];
      const diagnostic = `mh: cannot resolve check path "${path}" to a file or directory`;
      // ACT
      const answer = mh(args);
      // ASSERT
      expect(answer.code).toBe(usageCode);
      expect(answer.stdout).toBe('');
      expect(answer.stderr).toContain(usageLead);
      expect(answer.stderr).toContain(diagnostic);
    });
    it.each(['notes/free.md', 'docs-extra/bad.md'])('rejects outside-root path %s', (path) => {
      // ARRANGE
      const args = ['check', path, '--root', 'docs'];
      const diagnostic = `mh: check path "${path}" is outside --root`;
      // ACT
      const answer = mh(args);
      // ASSERT
      expect(answer.code).toBe(usageCode);
      expect(answer.stdout).toBe('');
      expect(answer.stderr).toContain(usageLead);
      expect(answer.stderr).toContain(diagnostic);
    });
    it('rejects an outside lexical alias even when its canonical target is inside root', () => {
      // ARRANGE
      const path = 'alias.md';
      const diagnostic = `check path "${path}" is outside --root`;
      symlinkSync(join(tree, 'docs', 'clean.md'), join(tree, path));
      // ACT
      const answer = mh(['check', path, '--root', 'docs']);
      // ASSERT
      expect(answer.code).toBe(usageCode);
      expect(answer.stdout).toBe('');
      expect(answer.stderr).toContain(diagnostic);
    });
    it('retains full-corpus refusal when an unselected governed file cannot be read', () => {
      // ARRANGE
      const path = join(tree, 'docs', 'bad.md');
      const diagnostic = 'mh: cannot read docs/bad.md';
      chmodSync(path, 0o000);
      let reading;
      try {
        readFileSync(path);
        reading = 'readable';
      } catch {
        reading = 'denied';
      }
      const denied = 'denied';
      // ACT
      let answer;
      try {
        answer = mh(['check', 'docs/clean.md']);
      } finally {
        chmodSync(path, 0o644);
      }
      // ASSERT
      expect(reading).toBe(denied);
      expect(answer.code).toBe(usageCode);
      expect(answer.stdout).toBe('');
      expect(answer.stderr).toContain(diagnostic);
    });
  });
  describe('edge cases', () => {
    it('keeps the bare and explicit no-path envelopes byte-identical', () => {
      // ARRANGE
      const explicitArgs = ['check'];
      const absentKeys = ['paths', 'ungovernedPaths'];
      // ACT
      const bare = mh([]);
      const explicit = mh(explicitArgs);
      const envelope = JSON.parse(explicit.stdout);
      // ASSERT
      expect(explicit).toEqual(bare);
      expect(envelope).not.toHaveProperty(absentKeys[0]);
      expect(envelope.result).not.toHaveProperty(absentKeys[1]);
    });
    it('unions overlapping directories and files without leaking a sibling prefix', () => {
      // ARRANGE
      const paths = ['./docs/', 'docs/bad.md', 'docs', './docs/clean.md'];
      const summary = { governedFiles: 2, invalidFiles: 1, totalViolations: 1 };
      const files = ['docs/bad.md'];
      // ACT
      const answer = mh(['check', ...paths]);
      const envelope = JSON.parse(answer.stdout);
      // ASSERT
      expect(answer.code).toBe(1);
      expect(answer.stderr).toBe('');
      expect(envelope.paths).toEqual(paths);
      expect(envelope.result.summary).toEqual(summary);
      expect(envelope.result.files.map((file: { path: string }) => file.path)).toEqual(files);
      expect(envelope.result.ungovernedPaths).toEqual([]);
    });
    it('selects the whole root with dot and keeps only the scoped additions', () => {
      // ARRANGE
      const paths = ['.', './docs/bad.md', 'docs/../docs/clean.md'];
      // ACT
      const full = mh(['check']);
      const scoped = mh(['check', ...paths]);
      const fullResult = JSON.parse(full.stdout).result;
      const envelope = JSON.parse(scoped.stdout);
      // ASSERT
      expect(scoped.code).toBe(1);
      expect(envelope.paths).toEqual(paths);
      expect(envelope.result).toEqual({ ...fullResult, ungovernedPaths: [] });
      expect(envelope.result.summary).toEqual(fullSummary);
    });
    it('echoes absolute operands without turning them into root-relative envelope paths', () => {
      // ARRANGE
      const paths = [join(tree, 'docs', 'clean.md')];
      const args = ['check', ...paths, '--root', tree, '--config', join(tree, config)];
      // ACT
      const answer = mh(args);
      const envelope = JSON.parse(answer.stdout);
      // ASSERT
      expect(answer.code).toBe(0);
      expect(envelope.paths).toEqual(paths);
      expect(envelope.result.summary).toEqual(cleanSummary);
    });
    it.each(['docs/clean.md', 'missing.md', '../outside'])(
      'echoes %s on CONFIG_REJECTED without per-path reports',
      (path) => {
        // ARRANGE
        const configPath = 'rejected.yaml';
        const paths = [path, path];
        const rejected = 'CONFIG_REJECTED';
        const forbidden = 'ungovernedPaths';
        // ACT
        const full = mh(['check', '--config', configPath]);
        const scoped = mh(['check', ...paths, '--config', configPath]);
        const fullResult = JSON.parse(full.stdout).result;
        const envelope = JSON.parse(scoped.stdout);
        // ASSERT
        expect(scoped.code).toBe(usageCode);
        expect(scoped.stderr).toBe('');
        expect(envelope.paths).toEqual(paths);
        expect(envelope.result.error).toBe(rejected);
        expect(envelope.result).toEqual(fullResult);
        expect(envelope.result).not.toHaveProperty(forbidden);
      },
    );
    it('keeps root refusal ahead of rejected config and operand validation', () => {
      // ARRANGE
      const args = ['check', 'missing.md', '--root', 'absent-root', '--config', 'rejected.yaml'];
      // ACT
      const answer = mh(args);
      // ASSERT
      expect(answer.code).toBe(usageCode);
      expect(answer.stdout).toBe('');
      expect(answer.stderr).toContain(usageLead);
    });
    it('keeps canonical corpus confinement ahead of a scoped clean verdict', () => {
      // ARRANGE
      const escaping = join(tree, 'docs', 'escaping.md');
      symlinkSync(join(tree, 'notes', 'free.md'), escaping);
      const args = ['check', 'docs/clean.md', '--root', 'docs', '--config', 'root.yaml'];
      // ACT
      let answer;
      try {
        answer = mh(args);
      } finally {
        rmSync(escaping);
      }
      // ASSERT
      expect(answer.code).toBe(usageCode);
      expect(answer.stdout).toBe('');
      expect(answer.stderr).toContain(usageLead);
    });
    it('confines canonical operand targets even under a directory the walker excludes', () => {
      // ARRANGE
      const excluded = join(tree, 'docs', 'node_modules');
      const path = 'docs/node_modules/escape.md';
      const diagnostic = `check path "${path}" is outside --root`;
      mkdirSync(excluded);
      symlinkSync(join(tree, 'notes', 'free.md'), join(excluded, 'escape.md'));
      // ACT
      let answer;
      try {
        answer = mh(['check', path, '--root', 'docs', '--config', 'root.yaml']);
      } finally {
        rmSync(excluded, { recursive: true });
      }
      // ASSERT
      expect(answer.code).toBe(usageCode);
      expect(answer.stdout).toBe('');
      expect(answer.stderr).toContain(diagnostic);
    });
    it('accepts an in-root document symlink and a canonicalized corpus root', () => {
      // ARRANGE
      const link = join(tree, 'docs', 'linked.md');
      const root = join(tree, 'root-link');
      const paths = ['root-link/linked.md'];
      const args = ['check', ...paths, '--root', root, '--config', 'root.yaml'];
      symlinkSync(join(tree, 'docs', 'clean.md'), link);
      symlinkSync(join(tree, 'docs'), root);
      // ACT
      let answer;
      try {
        answer = mh(args);
      } finally {
        rmSync(link);
        rmSync(root);
      }
      // ASSERT
      expect(answer.code).toBe(0);
      expect(answer.stderr).toBe('');
      expect(JSON.parse(answer.stdout).paths).toEqual(paths);
      expect(JSON.parse(answer.stdout).result.summary).toEqual(cleanSummary);
    });
    it('documents the scoped grammar, ungoverned paths and scoped exit rule in help', () => {
      // ARRANGE
      const args = ['--help'];
      const grammar = 'usage: mh [[<module>] check [<path> ...]]';
      const ungoverned = 'ungoverned';
      const exitRule = 'in-scope';
      // ACT
      const answer = mh(args);
      // ASSERT
      expect(answer.code).toBe(0);
      expect(answer.stderr).toBe('');
      expect(answer.stdout).toContain(grammar);
      expect(answer.stdout).toContain(ungoverned);
      expect(answer.stdout).toContain(exitRule);
    });
  });
});
