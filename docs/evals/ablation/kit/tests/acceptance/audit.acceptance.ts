import { describe, expect, it } from 'vitest';
import { FIXTURE, nodes, runJson, text } from './run-cli';

const NOTHING_WRONG = 0;

const AUDIT_ARGS = ['--audit', '--root', FIXTURE.root, '--config', FIXTURE.validConfig];

describe('mh --audit', () => {
  it('reports one row per rule, in config order', () => {
    const rows = [
      {
        ruleId: 'index-files',
        won: 2,
        shadowed: 0,
        shadowedBy: [],
        excluded: 0,
      },
      {
        ruleId: 'log-files',
        won: 1,
        shadowed: 0,
        shadowedBy: [],
        excluded: 0,
      },
      {
        ruleId: 'provenance-exemplar',
        won: 2,
        shadowed: 0,
        shadowedBy: [],
        excluded: 0,
      },
      {
        ruleId: 'research',
        won: 6,
        shadowed: 3,
        shadowedBy: ['index-files', 'provenance-exemplar'],
        excluded: 1,
      },
      {
        ruleId: 'skills',
        won: 3,
        shadowed: 0,
        shadowedBy: [],
        excluded: 0,
      },
      {
        ruleId: 'reference',
        won: 3,
        shadowed: 0,
        shadowedBy: [],
        excluded: 0,
      },
      {
        ruleId: 'workflows',
        won: 4,
        shadowed: 0,
        shadowedBy: [],
        excluded: 0,
      },
      {
        ruleId: 'plain',
        won: 3,
        shadowed: 0,
        shadowedBy: [],
        excluded: 0,
      },
    ];

    const { body } = runJson(AUDIT_ARGS);
    const seen = nodes(body.result.rules).map((row) => ({
      ruleId: row.rule.ruleId,
      won: row.won,
      shadowed: row.shadowed,
      shadowedBy: row.shadowedBy,
      excluded: row.excluded,
    }));

    expect(seen).toEqual(rows);
  });

  it('names which rules shadowed a broader one, and what its own excludeFiles removed', () => {
    const row = {
      rule: {
        ruleId: 'research',
        selector: {
          path: ['docs/research/**/*.md'],
        },
        intent: 'Research is indexed, and an index entry copies the description',
      },
      won: 6,
      shadowed: 3,
      shadowedBy: ['index-files', 'provenance-exemplar'],
      excluded: 1,
    };

    const { body } = runJson(AUDIT_ARGS);

    expect(nodes(body.result.rules).find((entry) => text(entry.rule.ruleId) === row.rule.ruleId)).toEqual(row);
  });

  it('reports a fileName selector as the sugar the Operator wrote, never expanded', () => {
    const rule = {
      ruleId: 'index-files',
      selector: {
        fileName: 'index.md',
      },
      intent: 'OKF §8 (Index files): an index enumerates a directory, and carries no frontmatter',
    };

    const { body } = runJson(AUDIT_ARGS);

    expect(nodes(body.result.rules).map((entry) => entry.rule)).toContainEqual(rule);
  });

  it('never exits 1, and answers on the command it was asked', () => {
    const asked = { command: 'audit', root: FIXTURE.root, config: FIXTURE.validConfig };

    const { status, stderr, body } = runJson(AUDIT_ARGS);

    expect({ command: body.command, root: body.root, config: body.config }).toEqual(asked);
    expect(status).toBe(NOTHING_WRONG);
    expect(stderr).toBe('');
  });
});
