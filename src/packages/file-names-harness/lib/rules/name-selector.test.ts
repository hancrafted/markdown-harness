// Colocated unit test for this Module's first-match resolver.
//
// The matcher arrives as an argument, so these cases assert the RULE of the
// config language — which rule claims which path — without a filesystem and
// without the platform's glob semantics in the way. A hand-written matcher is
// used deliberately: `matchesGlob` is host-dependent in its case handling, and
// that is a separate question with an open issue of its own.

import { describe, expect, it } from 'vitest';
import type { FileNameRule } from '../../../config-contract/index.ts';
import { findFirstNameRule, ruleSelects } from './name-selector.pure';

/**
 * A deliberately simple stand-in for the platform matcher, in the test file
 * where a reader can see exactly what it does.
 *
 * It understands one thing: a trailing `**` is a prefix match, and anything else
 * is an exact match. That is enough to state precedence and exclusion without
 * importing a glob engine's opinions.
 */
function matches(glob: string, path: string): boolean {
  if (glob.endsWith('/**')) return path.startsWith(`${glob.slice(0, -2)}`);
  return glob === path;
}

const SUBJECT = { format: 'kebab-case' } as const;

const NARROW: FileNameRule = {
  ruleId: 'narrow',
  intent: 'The exact file',
  path: ['docs/blocks/one.md'],
  file: SUBJECT,
};

const BROAD: FileNameRule = {
  ruleId: 'broad',
  intent: 'Everything under blocks',
  path: ['docs/blocks/**'],
  file: SUBJECT,
};

const EXCLUDING: FileNameRule = {
  ruleId: 'excluding',
  intent: 'Everything under blocks except the index',
  path: ['docs/blocks/**'],
  excludeFiles: ['docs/blocks/index.md'],
  file: SUBJECT,
};

describe('naming rule selection', () => {
  describe('success cases', () => {
    it('selects a path one of its globs reaches', () => {
      // ARRANGE
      const selected = true;
      // ACT
      const actual = ruleSelects(BROAD, 'docs/blocks/one.md', matches);
      // ASSERT
      expect(actual).toBe(selected);
    });

    it('lets the rule written first win, because written order IS the precedence', () => {
      // Nothing sorts. The config's rule list is a list rather than a mapping
      // precisely because first-match needs an order YAML cannot guarantee.
      // ARRANGE
      const expected = 'narrow';
      // ACT
      const actual = findFirstNameRule('docs/blocks/one.md', [NARROW, BROAD], matches);
      // ASSERT
      expect(actual?.ruleId).toBe(expected);
    });

    it('lets a broad rule written first swallow the narrow one below it', () => {
      // The same pair reversed. Stated because it is the mistake an Operator
      // actually makes, and the harness does not rescue them from it.
      // ARRANGE
      const expected = 'broad';
      // ACT
      const actual = findFirstNameRule('docs/blocks/one.md', [BROAD, NARROW], matches);
      // ASSERT
      expect(actual?.ruleId).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('answers nothing when no rule of this Module reaches the path', () => {
      // `undefined` means "not mine", never "invisible". Deciding a path is
      // invisible is a claim about every Module at once.
      // ARRANGE
      const unclaimed = undefined;
      // ACT
      const actual = findFirstNameRule('docs/other/one.md', [NARROW, BROAD], matches);
      // ASSERT
      expect(actual).toBe(unclaimed);
    });

    it('does not select a path its own excludeFiles takes back', () => {
      // ARRANGE
      const selected = false;
      // ACT
      const actual = ruleSelects(EXCLUDING, 'docs/blocks/index.md', matches);
      // ASSERT
      expect(actual).toBe(selected);
    });

    it('answers nothing for an empty rule list', () => {
      // ARRANGE
      const unclaimed = undefined;
      // ACT
      const actual = findFirstNameRule('docs/blocks/one.md', [], matches);
      // ASSERT
      expect(actual).toBe(unclaimed);
    });
  });

  describe('edge cases', () => {
    it('lets an excluded file fall THROUGH to a later, broader rule', () => {
      // The only real use exclusion has under first-match: it removes a file
      // from ONE rule, never from the list. This is the mechanism a reserved
      // name escapes through, and it is why no second mechanism exists.
      // ARRANGE
      const expected = 'broad';
      // ACT
      const actual = findFirstNameRule('docs/blocks/index.md', [EXCLUDING, BROAD], matches);
      // ASSERT
      expect(actual?.ruleId).toBe(expected);
    });

    it('leaves a file ungoverned when the only rule that reached it excluded it', () => {
      // ARRANGE
      const unclaimed = undefined;
      // ACT
      const actual = findFirstNameRule('docs/blocks/index.md', [EXCLUDING], matches);
      // ASSERT
      expect(actual).toBe(unclaimed);
    });

    it('selects on ANY of a rule’s globs, not only the first', () => {
      // ARRANGE
      const several: FileNameRule = { ...NARROW, path: ['docs/other/one.md', 'docs/blocks/one.md'] };
      const expected = 'narrow';
      // ACT
      const actual = findFirstNameRule('docs/blocks/one.md', [several], matches);
      // ASSERT
      expect(actual?.ruleId).toBe(expected);
    });
  });
});
