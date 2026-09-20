// Conformance runner for the config/ tier, covering the fifteen rejected-config cases.
//
// Governed by ARCH-002: every fault code in the catalog has an on-disk case,
// and no case names a code outside it.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MODULE_SET } from '../../cli/module-set.ts';
import type { ConfigFaultCode } from '../../config-contract/index.ts';
import { loadConfig } from '../../foundation/load-config.ts';
import type { ConfigErrorResult } from '../../response-contract/index.ts';

const CONFIG_TIER_DIR = fileURLToPath(new URL('../../../../fixtures/conformance/config', import.meta.url));

/** The catalog, stated by hand so its size belongs to §3.2 review — as `declaredCases` already is. */
const DECLARED_CODES = [
  'CONFIG_NOT_FOUND',
  'CONFIG_UNREADABLE',
  'CONFIG_NOT_YAML',
  'CONFIG_UNRECOGNISED_KEY',
  'CONFIG_INVALID_VALUE',
  'CONFIG_NO_MODULE_SECTION',
  'CONFIG_EMPTY_RULE_LIST',
  'CONFIG_DUPLICATE_RULE_ID',
  'CONFIG_SELECTOR_MISSING',
  'CONFIG_MISSING_RULE_INTENT',
  'CONFIG_MISSING_PATTERN_INTENT',
  'CONFIG_EMPTY_INTENT',
  'CONFIG_EMPTY_CONSTRAINT',
  'CONFIG_FRONTMATTER_FORBIDDEN_WITH_PAYLOAD',
  'CONFIG_ASSESS_WITHOUT_REQUIRED_FIELD',
] as const satisfies readonly ConfigFaultCode[];

type UnreachedCodes = Exclude<ConfigFaultCode, (typeof DECLARED_CODES)[number]>;
export const unreachedProof: [UnreachedCodes] extends [never] ? true : false = true;

const caseDirs = readdirSync(CONFIG_TIER_DIR, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name)
  .sort();

interface LoadedCase {
  caseName: string;
  expected: ConfigErrorResult;
  actual: ConfigErrorResult;
  loadedConfigUndefined: boolean;
}

function runCase(caseName: string): LoadedCase {
  const caseDir = join(CONFIG_TIER_DIR, caseName);
  const configPath = join(caseDir, 'markdown-harness.config.yaml');
  const expected = JSON.parse(readFileSync(join(caseDir, 'expected.json'), 'utf8')) as ConfigErrorResult;

  const load = loadConfig(configPath, MODULE_SET);
  const faults = load.faults.map((fault) => {
    const prefix = `${caseDir}/`;
    const loc = fault.location.startsWith(prefix) ? fault.location.slice(prefix.length) : fault.location;
    return { ...fault, location: loc };
  });

  const actual: ConfigErrorResult = {
    error: 'CONFIG_REJECTED',
    faults,
  };

  return {
    caseName,
    expected,
    actual,
    loadedConfigUndefined: load.config === undefined,
  };
}

const loadedCases = caseDirs.map(runCase);

describe('conformance config tier', () => {
  describe('success cases', () => {
    it.each(caseDirs)('rejects %s and reproduces expected faults', (caseName) => {
      // ARRANGE
      const current = loadedCases.find((c) => c.caseName === caseName)!;
      const expectedUndefined = true;
      // ACT
      const isUndefined = current.loadedConfigUndefined;
      const actualResult = current.actual;
      // ASSERT
      expect(isUndefined).toBe(expectedUndefined);
      expect(actualResult).toEqual(current.expected);
    });

    it('covers every member of the fault catalog', () => {
      // ARRANGE
      const expectedCodes = [...DECLARED_CODES].sort();
      // ACT
      const reachedCodes = [...new Set(loadedCases.flatMap((c) => c.actual.faults.map((fault) => fault.code)))].sort();
      // ASSERT
      expect(reachedCodes).toEqual(expectedCodes);
    });
  });

  describe('failure cases', () => {
    it('names no code outside the declared fault catalog in any case golden', () => {
      // ARRANGE
      const catalog = new Set<string>(DECLARED_CODES);
      // ACT
      const foreign = loadedCases
        .flatMap((c) => c.expected.faults.map((f) => f.code))
        .filter((code) => !catalog.has(code));
      // ASSERT
      expect(foreign).toEqual([]);
    });

    it('rejects an unrecognised top-level key', () => {
      // ARRANGE
      const caseName = 'unrecognised-key';
      const expectedCode = 'CONFIG_UNRECOGNISED_KEY';
      // ACT
      const current = loadedCases.find((c) => c.caseName === caseName)!;
      const codes = current.actual.faults.map((f) => f.code);
      // ASSERT
      expect(codes).toContain(expectedCode);
    });
  });

  describe('edge cases', () => {
    it('enumerates exactly fifteen case directories', () => {
      // ARRANGE
      const declaredCaseCount = 15;
      // ACT
      const count = caseDirs.length;
      // ASSERT
      expect(count).toBe(declaredCaseCount);
    });

    it('has zero unreached codes at compile time', () => {
      // ARRANGE
      const expected = true;
      // ACT
      const verified = unreachedProof;
      // ASSERT
      expect(verified).toBe(expected);
    });
  });
});
