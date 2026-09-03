import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIXTURE, nodes, runJson, text } from './run-cli';

const CORPUS_IS_WRONG = 1;

describe('mh --check', () => {
  it('reports the frozen verdict for the coverage config', () => {
    const summary = { governedFiles: 24, invalidFiles: 15, totalViolations: 22 };

    const { status, stderr, body } = runJson(['--check', '--root', FIXTURE.root, '--config', FIXTURE.validConfig]);

    expect(body.result.summary).toEqual(summary);
    expect(status).toBe(CORPUS_IS_WRONG);
    expect(stderr).toBe('');
  });

  it('echoes root and config exactly as the caller wrote them', () => {
    const asked = { command: 'check', root: FIXTURE.root, config: FIXTURE.validConfig };

    const { body } = runJson(['--check', '--root', asked.root, '--config', asked.config]);

    expect({ command: body.command, root: body.root, config: body.config }).toEqual(asked);
  });

  it('lists every file carrying a violation, in walker order', () => {
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

    const { body } = runJson(['--check', '--root', FIXTURE.root, '--config', FIXTURE.validConfig]);

    expect(nodes(body.result.files).map((file) => file.path)).toEqual(paths);
  });

  it('reaches every violation code the contract defines', () => {
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

    const { body } = runJson(['--check', '--root', FIXTURE.root, '--config', FIXTURE.validConfig]);
    const reached = nodes(body.result.files).flatMap((file) =>
      nodes(file.violations).map((violation) => violation.violation),
    );

    expect([...new Set(reached)].sort()).toEqual(codes);
  });

  it('reports a too-short title with the rule that won the file and its intent', () => {
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

    const { body } = runJson(['--check', '--root', FIXTURE.root, '--config', FIXTURE.validConfig]);

    expect(nodes(body.result.files).find((file) => text(file.path) === row.path)).toEqual(row);
  });

  it('refuses node_modules and .git at any depth, whatever the config selects', () => {
    const kept = 'kept.md';
    const planted = [kept, 'node_modules/pkg/README.md', 'packages/x/node_modules/dep.md', '.git/hooks/notes.md'];
    const walked = { files: [kept], governedFiles: 1 };
    const root = resolve(tmpdir(), 'mh-acceptance-walker');
    rmSync(root, { recursive: true, force: true });
    for (const relative of planted) {
      const absolute = resolve(root, relative);
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, '# a file with no frontmatter\n', 'utf8');
    }

    const { status, body } = runJson(['--check', '--root', root, '--config', FIXTURE.walkerConfig]);
    const seen = {
      files: nodes(body.result.files).map((file) => file.path),
      governedFiles: body.result.summary.governedFiles,
    };

    expect(seen).toEqual(walked);
    expect(status).toBe(CORPUS_IS_WRONG);
  });
});
