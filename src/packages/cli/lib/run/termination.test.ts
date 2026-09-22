import { describe, expect, it } from 'vitest';
import type {
  AssessResult,
  AuditResult,
  CheckResult,
  ConfigFault,
  QueryResult,
} from '../../../response-contract/index.ts';
import { resolvedInstant, route, terminationFor, withCorpusGuard } from './termination.pure.ts';

const SAMPLE_FAULTS: readonly ConfigFault[] = [{ code: 'CONFIG_NOT_FOUND', location: 'markdown-harness.config.yaml' }];

const EMPTY_QUERY_RESULT: QueryResult = {
  governance: 'invisible',
  path: 'docs/a.md',
};

const EMPTY_AUDIT_RESULT: AuditResult = {
  rules: [],
};

const CLEAN_CHECK_RESULT: CheckResult = {
  summary: { governedFiles: 1, invalidFiles: 0, totalViolations: 0 },
  files: [],
};

const DIRTY_CHECK_RESULT: CheckResult = {
  summary: { governedFiles: 1, invalidFiles: 1, totalViolations: 1 },
  files: [],
};

const SAMPLE_ASSESS_RESULT: AssessResult = {
  agentAction: 'PROCEED',
  state: 'ungoverned',
};

describe('termination', () => {
  describe('success cases', () => {
    it('routes a valid query under a supported runtime to a parsed invocation', () => {
      // ARRANGE
      const nodeVersion = '24.16.0';
      const argv = ['--query', 'docs/a.md'];
      const expectedKind = 'routed';
      const expectedCommand = 'query';
      const expectedPath = 'docs/a.md';
      // ACT
      const actual = route(nodeVersion, argv);
      const actualCommand = actual.kind === 'routed' ? actual.invocation.command : '';
      const actualPath =
        actual.kind === 'routed' && actual.invocation.command === 'query' ? actual.invocation.path : '';
      // ASSERT
      expect(actual.kind).toBe(expectedKind);
      expect(actualCommand).toBe(expectedCommand);
      expect(actualPath).toBe(expectedPath);
    });

    it('routes --help under a supported runtime to help invocation', () => {
      // ARRANGE
      const nodeVersion = '26.1.0';
      const argv = ['--help'];
      const expectedKind = 'routed';
      const expectedCommand = 'help';
      // ACT
      const actual = route(nodeVersion, argv);
      const actualCommand = actual.kind === 'routed' ? actual.invocation.command : '';
      // ASSERT
      expect(actual.kind).toBe(expectedKind);
      expect(actualCommand).toBe(expectedCommand);
    });

    it('resolves empty --now to the host clock instant', () => {
      // ARRANGE
      const nowArg = '';
      const clock = '2026-09-22T10:00:00.000Z';
      // ACT
      const actual = resolvedInstant(nowArg, clock);
      // ASSERT
      expect(actual).toBe(clock);
    });

    it('resolves non-empty --now to the given instant rather than the clock', () => {
      // ARRANGE
      const nowArg = '2025-01-01T00:00:00.000Z';
      const clock = '2026-09-22T10:00:00.000Z';
      // ACT
      const actual = resolvedInstant(nowArg, clock);
      // ASSERT
      expect(actual).toBe(nowArg);
    });

    it('terminates --help with exit 0, help text on stdout, and empty stderr', () => {
      // ARRANGE
      const nothingWrong = 0;
      const empty = '';
      const usageSynopsis = 'usage: mh';
      // ACT
      const actual = terminationFor({ kind: 'help' });
      // ASSERT
      expect(actual.code).toBe(nothingWrong);
      expect(actual.stderr).toBe(empty);
      expect(actual.stdout).toContain(usageSynopsis);
    });

    it('terminates answered query with exit 0, JSON on stdout, and empty stderr', () => {
      // ARRANGE
      const nothingWrong = 0;
      const empty = '';
      const queryCommand = 'query';
      const gathered = {
        kind: 'query' as const,
        path: 'docs/a.md',
        config: 'mh.yaml',
        outcome: { kind: 'answered' as const, result: EMPTY_QUERY_RESULT },
      };
      // ACT
      const actual = terminationFor(gathered);
      const parsed = JSON.parse(actual.stdout);
      // ASSERT
      expect(actual.code).toBe(nothingWrong);
      expect(actual.stderr).toBe(empty);
      expect(parsed.command).toBe(queryCommand);
      expect(parsed.result).toEqual(EMPTY_QUERY_RESULT);
    });

    it('terminates answered audit with exit 0, JSON on stdout, and empty stderr', () => {
      // ARRANGE
      const nothingWrong = 0;
      const empty = '';
      const auditCommand = 'audit';
      const gathered = {
        kind: 'audit' as const,
        root: '.',
        config: 'mh.yaml',
        outcome: { kind: 'answered' as const, result: EMPTY_AUDIT_RESULT },
      };
      // ACT
      const actual = terminationFor(gathered);
      const parsed = JSON.parse(actual.stdout);
      // ASSERT
      expect(actual.code).toBe(nothingWrong);
      expect(actual.stderr).toBe(empty);
      expect(parsed.command).toBe(auditCommand);
      expect(parsed.result).toEqual(EMPTY_AUDIT_RESULT);
    });

    it('terminates answered assess with exit 0, JSON on stdout, and empty stderr', () => {
      // ARRANGE
      const nothingWrong = 0;
      const empty = '';
      const assessCommand = 'assess';
      const now = '2026-09-22T10:00:00.000Z';
      const gathered = {
        kind: 'assess' as const,
        path: 'docs/a.md',
        now,
        config: 'mh.yaml',
        outcome: { kind: 'answered' as const, result: SAMPLE_ASSESS_RESULT },
      };
      // ACT
      const actual = terminationFor(gathered);
      const parsed = JSON.parse(actual.stdout);
      // ASSERT
      expect(actual.code).toBe(nothingWrong);
      expect(actual.stderr).toBe(empty);
      expect(parsed.command).toBe(assessCommand);
      expect(parsed.now).toBe(now);
      expect(parsed.result).toEqual(SAMPLE_ASSESS_RESULT);
    });

    it('terminates answered check with 0 invalid files as exit 0', () => {
      // ARRANGE
      const nothingWrong = 0;
      const empty = '';
      const checkCommand = 'check';
      const gathered = {
        kind: 'check' as const,
        root: '.',
        config: 'mh.yaml',
        outcome: { kind: 'answered' as const, result: CLEAN_CHECK_RESULT },
      };
      // ACT
      const actual = terminationFor(gathered);
      const parsed = JSON.parse(actual.stdout);
      // ASSERT
      expect(actual.code).toBe(nothingWrong);
      expect(actual.stderr).toBe(empty);
      expect(parsed.command).toBe(checkCommand);
      expect(parsed.result.summary.invalidFiles).toBe(0);
    });
  });

  describe('failure cases', () => {
    it('refuses an unsupported runtime before inspecting argv (ordering contract 1)', () => {
      // The two ordering contracts: runtime floor is checked before argv.
      // ARRANGE
      const unsupportedNode = '20.0.0';
      const invalidArgv = ['--not-a-valid-flag'];
      const expectedKind = 'runtime-refused';
      // ACT
      const actual = route(unsupportedNode, invalidArgv);
      // ASSERT
      expect(actual.kind).toBe(expectedKind);
    });

    it('refuses invalid argv under a supported runtime with argv-refused', () => {
      // ARRANGE
      const supportedNode = '24.16.0';
      const invalidArgv = ['--bogus-flag'];
      const expectedKind = 'argv-refused';
      // ACT
      const actual = route(supportedNode, invalidArgv);
      // ASSERT
      expect(actual.kind).toBe(expectedKind);
    });

    it('terminates runtime-refused with exit 2, refusal on stderr, and empty stdout', () => {
      // ARRANGE
      const cannotReport = 2;
      const empty = '';
      const refusalText = 'node version unsupported';
      // ACT
      const actual = terminationFor({ kind: 'runtime-refused', refusal: refusalText });
      // ASSERT
      expect(actual.code).toBe(cannotReport);
      expect(actual.stdout).toBe(empty);
      expect(actual.stderr).toBe(refusalText);
    });

    it('terminates argv-refused with exit 2, usage on stderr, and empty stdout', () => {
      // ARRANGE
      const cannotReport = 2;
      const empty = '';
      const usageSynopsis = 'usage: mh';
      // ACT
      const actual = terminationFor({ kind: 'argv-refused' });
      // ASSERT
      expect(actual.code).toBe(cannotReport);
      expect(actual.stdout).toBe(empty);
      expect(actual.stderr).toContain(usageSynopsis);
    });

    it('terminates query with rejected config as exit 2 with rejection JSON on stdout', () => {
      // ARRANGE
      const cannotReport = 2;
      const empty = '';
      const expectedError = 'CONFIG_REJECTED';
      const gathered = {
        kind: 'query' as const,
        path: 'docs/a.md',
        config: 'mh.yaml',
        outcome: { kind: 'rejected' as const, faults: SAMPLE_FAULTS },
      };
      // ACT
      const actual = terminationFor(gathered);
      const parsed = JSON.parse(actual.stdout);
      // ASSERT
      expect(actual.code).toBe(cannotReport);
      expect(actual.stderr).toBe(empty);
      expect(parsed.result.error).toBe(expectedError);
      expect(parsed.result.faults).toEqual(SAMPLE_FAULTS);
    });

    it('terminates audit with rejected config as exit 2 with rejection JSON on stdout', () => {
      // ARRANGE
      const cannotReport = 2;
      const empty = '';
      const expectedError = 'CONFIG_REJECTED';
      const gathered = {
        kind: 'audit' as const,
        root: '.',
        config: 'mh.yaml',
        outcome: { kind: 'rejected' as const, faults: SAMPLE_FAULTS },
      };
      // ACT
      const actual = terminationFor(gathered);
      const parsed = JSON.parse(actual.stdout);
      // ASSERT
      expect(actual.code).toBe(cannotReport);
      expect(actual.stderr).toBe(empty);
      expect(parsed.result.error).toBe(expectedError);
      expect(parsed.result.faults).toEqual(SAMPLE_FAULTS);
    });

    it('terminates assess with rejected config as exit 2 with rejection JSON on stdout', () => {
      // ARRANGE
      const cannotReport = 2;
      const empty = '';
      const expectedError = 'CONFIG_REJECTED';
      const now = '2026-09-22T10:00:00.000Z';
      const gathered = {
        kind: 'assess' as const,
        path: 'docs/a.md',
        now,
        config: 'mh.yaml',
        outcome: { kind: 'rejected' as const, faults: SAMPLE_FAULTS },
      };
      // ACT
      const actual = terminationFor(gathered);
      const parsed = JSON.parse(actual.stdout);
      // ASSERT
      expect(actual.code).toBe(cannotReport);
      expect(actual.stderr).toBe(empty);
      expect(parsed.result.error).toBe(expectedError);
      expect(parsed.result.faults).toEqual(SAMPLE_FAULTS);
    });

    it('terminates check with rejected config as exit 2 with rejection JSON on stdout', () => {
      // ARRANGE
      const cannotReport = 2;
      const empty = '';
      const expectedError = 'CONFIG_REJECTED';
      const gathered = {
        kind: 'check' as const,
        root: '.',
        config: 'mh.yaml',
        outcome: { kind: 'rejected' as const, faults: SAMPLE_FAULTS },
      };
      // ACT
      const actual = terminationFor(gathered);
      const parsed = JSON.parse(actual.stdout);
      // ASSERT
      expect(actual.code).toBe(cannotReport);
      expect(actual.stderr).toBe(empty);
      expect(parsed.result.error).toBe(expectedError);
      expect(parsed.result.faults).toEqual(SAMPLE_FAULTS);
    });

    it('terminates check with unreadable file as exit 2 with message on stderr and empty stdout', () => {
      // ARRANGE
      const cannotReport = 2;
      const empty = '';
      const unreadablePath = 'docs/locked.md';
      const gathered = {
        kind: 'check' as const,
        root: '.',
        config: 'mh.yaml',
        outcome: { kind: 'unreadable' as const, path: unreadablePath },
      };
      // ACT
      const actual = terminationFor(gathered);
      // ASSERT
      expect(actual.code).toBe(cannotReport);
      expect(actual.stdout).toBe(empty);
      expect(actual.stderr).toContain(unreadablePath);
    });

    it('terminates check with invalid files as exit 1 (CORPUS_IS_WRONG)', () => {
      // ARRANGE
      const corpusIsWrong = 1;
      const empty = '';
      const checkCommand = 'check';
      const gathered = {
        kind: 'check' as const,
        root: '.',
        config: 'mh.yaml',
        outcome: { kind: 'answered' as const, result: DIRTY_CHECK_RESULT },
      };
      // ACT
      const actual = terminationFor(gathered);
      const parsed = JSON.parse(actual.stdout);
      // ASSERT
      expect(actual.code).toBe(corpusIsWrong);
      expect(actual.stderr).toBe(empty);
      expect(parsed.command).toBe(checkCommand);
      expect(parsed.result.summary.invalidFiles).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('answers audit no-root as usage error on stderr, refusing before config load (ordering contract 2)', () => {
      // When root cannot be enumerated, outcome is no-root.
      // ARRANGE
      const cannotReport = 2;
      const empty = '';
      const usageSynopsis = 'usage: mh';
      const gathered = {
        kind: 'audit' as const,
        root: 'nonexistent-dir',
        config: 'bad-config.yaml',
        outcome: { kind: 'no-root' as const },
      };
      // ACT
      const actual = terminationFor(gathered);
      // ASSERT
      expect(actual.code).toBe(cannotReport);
      expect(actual.stdout).toBe(empty);
      expect(actual.stderr).toContain(usageSynopsis);
    });

    it('answers check no-root as usage error on stderr, refusing before config load (ordering contract 2)', () => {
      // ARRANGE
      const cannotReport = 2;
      const empty = '';
      const usageSynopsis = 'usage: mh';
      const gathered = {
        kind: 'check' as const,
        root: 'nonexistent-dir',
        config: 'bad-config.yaml',
        outcome: { kind: 'no-root' as const },
      };
      // ACT
      const actual = terminationFor(gathered);
      // ASSERT
      expect(actual.code).toBe(cannotReport);
      expect(actual.stdout).toBe(empty);
      expect(actual.stderr).toContain(usageSynopsis);
    });

    it('withCorpusGuard does not evaluate config when corpus is missing (ordering contract 2)', () => {
      // ARRANGE
      let configEvaluated = false;
      const expectedKind = 'no-root';
      const missingCorpus = undefined;
      const loadConfig = () => {
        configEvaluated = true;
        return { kind: 'rejected' as const, faults: [] };
      };
      // ACT
      const outcome = withCorpusGuard(missingCorpus, loadConfig);
      // ASSERT
      expect(outcome.kind).toBe(expectedKind);
      expect(configEvaluated).toBe(false);
    });

    it('withCorpusGuard evaluates config only when corpus is present', () => {
      // ARRANGE
      let configEvaluated = false;
      const expectedKind = 'rejected';
      const presentCorpus = ['README.md'];
      const loadConfig = () => {
        configEvaluated = true;
        return { kind: 'rejected' as const, faults: [] };
      };
      // ACT
      const outcome = withCorpusGuard(presentCorpus, loadConfig);
      // ASSERT
      expect(outcome.kind).toBe(expectedKind);
      expect(configEvaluated).toBe(true);
    });

    it('serialises response JSON with two-space indentation and trailing newline', () => {
      // ARRANGE
      const trailingNewline = '\n';
      const twoSpacePrefix = '  ';
      const prefixLength = 2;
      const gathered = {
        kind: 'query' as const,
        path: 'docs/a.md',
        config: 'mh.yaml',
        outcome: { kind: 'answered' as const, result: EMPTY_QUERY_RESULT },
      };
      // ACT
      const actual = terminationFor(gathered);
      const lastChar = actual.stdout.slice(-1);
      const secondLinePrefix = (actual.stdout.split('\n')[1] ?? '').slice(0, prefixLength);
      // ASSERT
      expect(lastChar).toBe(trailingNewline);
      expect(secondLinePrefix).toBe(twoSpacePrefix);
    });
  });
});
