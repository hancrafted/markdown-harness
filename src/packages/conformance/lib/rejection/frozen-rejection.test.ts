import { describe, expect, it } from 'vitest';
import { frozenRejection } from './frozen-rejection.pure.ts';

/** The prefix a runner supplies: where this case's config file actually sits. */
const CONFIG_PATH = '/tmp/conformance/rejected-config/config-not-found/markdown-harness.config.yaml';
const CONFIG_FILE = 'markdown-harness.config.yaml';
const CONFIG = { path: CONFIG_PATH, file: CONFIG_FILE };

/** The case a failure names, so a broken expectation is traceable to its directory. */
const CASE = 'config-not-found';

/** The one literal that marks the failure variant, spelled as a frozen file spells it. */
const REJECTED = 'CONFIG_REJECTED';

describe('a case-relative frozen rejection', () => {
  describe('success cases', () => {
    it('substitutes the case-supplied config path into a location naming the config file', () => {
      // ARRANGE
      const frozen = {
        error: REJECTED,
        faults: [{ code: 'CONFIG_NOT_FOUND', location: 'markdown-harness.config.yaml' }],
      };
      const expected = { error: REJECTED, faults: [{ code: 'CONFIG_NOT_FOUND', location: CONFIG_PATH }] };
      // ACT
      const actual = frozenRejection(frozen, CONFIG, CASE);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('leaves a location written in the config’s own notation exactly as frozen', () => {
      // ARRANGE
      const notation = 'frontmatter.rules[3].intent';
      const frozen = { error: REJECTED, faults: [{ code: 'CONFIG_EMPTY_INTENT', location: notation }] };
      const expected = { error: REJECTED, faults: [{ code: 'CONFIG_EMPTY_INTENT', location: notation }] };
      // ACT
      const actual = frozenRejection(frozen, CONFIG, CASE);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('throws naming the case when the frozen bytes are not a mapping', () => {
      // ARRANGE
      const notAMapping = [{ code: 'CONFIG_NOT_FOUND', location: 'markdown-harness.config.yaml' }];
      // ACT
      const reading = () => frozenRejection(notAMapping, CONFIG, CASE);
      // ASSERT
      expect(reading).toThrow(CASE);
    });

    it('throws naming the case when the fault list is not a list', () => {
      // ARRANGE
      const faultsNotAList = { error: REJECTED, faults: { code: 'CONFIG_NOT_FOUND' } };
      // ACT
      const reading = () => frozenRejection(faultsNotAList, CONFIG, CASE);
      // ASSERT
      expect(reading).toThrow(CASE);
    });

    it('throws naming the case when a fault carries no code and location pair', () => {
      // ARRANGE
      const faultWithoutCode = { error: REJECTED, faults: [{ location: 'markdown-harness.config.yaml' }] };
      // ACT
      const reading = () => frozenRejection(faultWithoutCode, CONFIG, CASE);
      // ASSERT
      expect(reading).toThrow(CASE);
    });
  });

  describe('edge cases', () => {
    it('leaves a location that merely contains the config filename alone', () => {
      // A config-notation location can never be the config filename, so the
      // substitution is an EXACT match rather than a prefix or a contains. A
      // looser rule would rewrite a location that happens to spell the filename
      // inside itself, and the rewrite would look like a passing case.
      // ARRANGE
      const nearMiss = 'frontmatter.rules[0].path[markdown-harness.config.yaml]';
      const frozen = { error: REJECTED, faults: [{ code: 'CONFIG_INVALID_VALUE', location: nearMiss }] };
      const expected = { error: REJECTED, faults: [{ code: 'CONFIG_INVALID_VALUE', location: nearMiss }] };
      // ACT
      const actual = frozenRejection(frozen, CONFIG, CASE);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lets an empty fault list through, because refusing one is the runner’s job', () => {
      // A rejection carrying no fault is a broken expectation, but it is broken
      // against the TIER rather than against this rule: the runner asserts every
      // case states at least one fault, where the failure can name the case
      // directory. Refusing it twice would report one mistake under two voices.
      // ARRANGE
      const frozen = { error: REJECTED, faults: [] };
      const expected = { error: REJECTED, faults: [] };
      // ACT
      const actual = frozenRejection(frozen, CONFIG, CASE);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
