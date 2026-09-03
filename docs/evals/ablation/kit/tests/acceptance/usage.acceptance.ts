import { describe, expect, it } from 'vitest';
import { FIXTURE, runCli, runJson } from './run-cli';

const CORPUS_IS_WRONG = 1;
const CANNOT_REPORT = 2;

describe('the command surface', () => {
  it('treats no command flag as --check', () => {
    const answer = { command: 'check', governedFiles: 24, invalidFiles: 15, totalViolations: 22 };

    const { status, body } = runJson(['--root', FIXTURE.root, '--config', FIXTURE.validConfig]);
    const seen = { command: body.command, ...(body.result.summary as object) };

    expect(seen).toEqual(answer);
    expect(status).toBe(CORPUS_IS_WRONG);
  });

  it('refuses two command flags rather than resolving them by precedence', () => {
    const { status, stdout, stderr } = runCli([
      '--check',
      '--query',
      'docs/reference/labels.md',
      '--config',
      FIXTURE.validConfig,
    ]);

    expect({ status, stdout }).toEqual({ status: CANNOT_REPORT, stdout: '' });
    expect(stderr.length).toBeGreaterThan(0);
  });

  it('refuses two command flags even when one of them is the default', () => {
    const { status, stdout, stderr } = runCli(['--audit', '--query', 'docs/reference/labels.md']);

    expect({ status, stdout }).toEqual({ status: CANNOT_REPORT, stdout: '' });
    expect(stderr.length).toBeGreaterThan(0);
  });

  it('refuses --root beside --query, because a query has no corpus', () => {
    const { status, stdout, stderr } = runCli([
      '--query',
      'docs/reference/labels.md',
      '--root',
      FIXTURE.root,
      '--config',
      FIXTURE.validConfig,
    ]);

    expect({ status, stdout }).toEqual({ status: CANNOT_REPORT, stdout: '' });
    expect(stderr.length).toBeGreaterThan(0);
  });

  it('refuses a flag it does not define', () => {
    const { status, stdout, stderr } = runCli(['--check', '--verbose', '--config', FIXTURE.validConfig]);

    expect({ status, stdout }).toEqual({ status: CANNOT_REPORT, stdout: '' });
    expect(stderr.length).toBeGreaterThan(0);
  });
});
