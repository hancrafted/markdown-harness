// The closure over tested carriers, run over the committed eval: every case file
// declares the placeholders its seed config holds, and every placeholder it declares
// resolves to exactly one intent carrier. Shown red by deleting a declaration, and by
// declaring one the config does not hold. The closure is computed by evaluating the
// config (parsing the YAML and walking it), never by grepping for the placeholder.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { carrierClosure } from '../../../arms/derive-arms.ts';

const EVALS = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const CASES = join(EVALS, 'suites/steering/cases');

interface CaseEntry {
  readonly vars: {
    readonly caseId: string;
    readonly seedDir: string;
    readonly carriers: { readonly placeholder: string }[];
  };
}

function committedCases(): CaseEntry[] {
  return readdirSync(CASES)
    .filter((name) => name.endsWith('.yaml'))
    .flatMap((name) => parse(readFileSync(join(CASES, name), 'utf8')) as CaseEntry[]);
}

const seedConfig = (entry: CaseEntry): string =>
  readFileSync(join(EVALS, '..', entry.vars.seedDir, 'markdown-harness.config.yaml'), 'utf8');
const declaredBy = (entry: CaseEntry): string[] => entry.vars.carriers.map((carrier) => carrier.placeholder);

describe('the closure over the committed cases', () => {
  describe('success cases', () => {
    it('is closed for every committed case, over a non-empty set that includes a two-carrier case', () => {
      // ARRANGE
      const cases = committedCases();
      const floor = 2;
      // ACT
      const problems = cases.flatMap((entry) => carrierClosure(seedConfig(entry), declaredBy(entry)));
      const widest = Math.max(...cases.map((entry) => entry.vars.carriers.length));
      // ASSERT
      expect(cases.length).toBeGreaterThanOrEqual(floor);
      expect(widest).toBeGreaterThanOrEqual(floor);
      expect(problems).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('goes red on the real two-carrier case with one declaration deleted', () => {
      // ARRANGE
      const entry = committedCases().find((candidate) => candidate.vars.carriers.length > 1);
      const declared = entry === undefined ? [] : declaredBy(entry).slice(1);
      const expected = /is in .* and no case declares it/;
      // ACT
      const problems = carrierClosure(entry === undefined ? '' : seedConfig(entry), declared).join('\n');
      // ASSERT
      expect(problems).toMatch(expected);
    });

    it('goes red on the real case with a declaration the config does not hold', () => {
      // ARRANGE
      const [entry] = committedCases();
      const declared = [...(entry === undefined ? [] : declaredBy(entry)), 'NOT_IN_CONFIG_PLACEHOLDER'];
      const expected = ['declared placeholder NOT_IN_CONFIG_PLACEHOLDER is in no intent carrier'];
      // ACT
      const problems = carrierClosure(entry === undefined ? '' : seedConfig(entry), declared);
      // ASSERT
      expect(problems).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('gives each committed case its own caseId and its own seed config', () => {
      // ARRANGE
      const cases = committedCases();
      // ACT
      const ids = new Set(cases.map((entry) => entry.vars.caseId));
      // ASSERT
      expect(ids.size).toBe(cases.length);
    });
  });
});
