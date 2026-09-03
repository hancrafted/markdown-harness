import { describe, expect, it } from 'vitest';
import { FIXTURE, runJson } from './run-cli';

const CANNOT_REPORT = 2;

describe('a config it cannot trust', () => {
  it('rejects a module that governs nothing, and says where', () => {
    const rejection = {
      error: 'CONFIG_REJECTED',
      faults: [{ code: 'CONFIG_EMPTY_RULE_LIST', location: 'frontmatter.rules' }],
    };

    const { status, body } = runJson(['--check', '--root', FIXTURE.root, '--config', FIXTURE.emptyRuleListConfig]);

    expect(body.result).toEqual(rejection);
    expect(status).toBe(CANNOT_REPORT);
  });

  it('reports a config path that does not exist as a fault, not a stack trace', () => {
    const rejection = {
      error: 'CONFIG_REJECTED',
      faults: [{ code: 'CONFIG_NOT_FOUND', location: FIXTURE.absentConfig }],
    };

    const { status, body } = runJson(['--check', '--root', FIXTURE.root, '--config', FIXTURE.absentConfig]);

    expect(body.result).toEqual(rejection);
    expect(status).toBe(CANNOT_REPORT);
  });

  it('still echoes what was asked, so a rejection is readable without the command line', () => {
    const asked = { command: 'check', root: FIXTURE.root, config: FIXTURE.emptyRuleListConfig };

    const { body } = runJson(['--check', '--root', asked.root, '--config', asked.config]);

    expect({ command: body.command, root: body.root, config: body.config }).toEqual(asked);
  });

  it('exits 2 on a query, which otherwise never exits non-zero', () => {
    const answer = { command: 'query', error: 'CONFIG_REJECTED' };

    const { status, body } = runJson(['--query', 'docs/reference/labels.md', '--config', FIXTURE.emptyRuleListConfig]);

    expect({ command: body.command, error: body.result.error }).toEqual(answer);
    expect(status).toBe(CANNOT_REPORT);
  });

  it('exits 2 on an audit, which otherwise never exits non-zero', () => {
    const answer = { command: 'audit', error: 'CONFIG_REJECTED' };

    const { status, body } = runJson(['--audit', '--root', FIXTURE.root, '--config', FIXTURE.emptyRuleListConfig]);

    expect({ command: body.command, error: body.result.error }).toEqual(answer);
    expect(status).toBe(CANNOT_REPORT);
  });
});
