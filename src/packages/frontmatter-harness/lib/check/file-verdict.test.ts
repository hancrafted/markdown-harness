// Colocated unit test for one file's whole verdict.
//
// Two things are decided here and nowhere else. The PRECEDENCE between a broken
// block and the rule that met it — reported alone under a constraining rule,
// suppressed entirely under a forbidding one — and the ORDER violations come
// back in, which four independent implementations got three different ways.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../../config-contract/index.ts';
import { violationsForFile } from './file-verdict.pure';

const PLAIN: FrontmatterRule = {
  ruleId: 'plain',
  intent: 'Everything under plain/ still has to say what it is',
  path: ['docs/plain/**/*.md'],
  fields: { type: { presence: 'required' } },
};

const INDEX: FrontmatterRule = {
  ruleId: 'index-files',
  intent: 'An index enumerates a directory, and carries no frontmatter',
  fileName: 'index.md',
  frontmatter: 'forbidden',
};

describe('one file verdict', () => {
  describe('success cases', () => {
    it('reports nothing for a file that satisfies its rule', () => {
      // ARRANGE
      const file = '---\ntype: plain\n---\n\n# Notes\n';
      const clean: readonly unknown[] = [];
      // ACT
      const actual = violationsForFile(file, PLAIN);
      // ASSERT
      expect(actual).toEqual(clean);
    });

    it('reports nothing when a forbidding rule meets a file with no frontmatter', () => {
      // ARRANGE
      const file = '# Conformance cases\n\nNo frontmatter, so the rule is satisfied.\n';
      const clean: readonly unknown[] = [];
      // ACT
      const actual = violationsForFile(file, INDEX);
      // ASSERT
      expect(actual).toEqual(clean);
    });
  });

  describe('failure cases', () => {
    it('reports a forbidden block by its top-level keys', () => {
      // ARRANGE
      const file = '---\ntype: research\ndescription: An index that carries frontmatter.\n---\n';
      const expected = [
        {
          field: null,
          value: { keys: ['type', 'description'] },
          violation: 'FRONTMATTER_FORBIDDEN',
          requirement: { frontmatter: 'forbidden' },
        },
      ];
      // ACT
      const actual = violationsForFile(file, INDEX);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });

    it('reports an unparseable block ALONE under a constraining rule', () => {
      // Every field, `unknownKeys` and cross-field check is skipped, because
      // none of them are answerable against data that never parsed. Reading a
      // value out of the source text by eye is not available to the harness.
      // ARRANGE
      const file = '---\ntype: plain\ntags: [okf, provenance\n---\n';
      const expected = [{ field: null, violation: 'FRONTMATTER_UNPARSEABLE' }];
      // ACT
      const actual = violationsForFile(file, PLAIN);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });

    it('reports a broken block under a forbidding rule with its value key omitted', () => {
      // The rule's complaint — that there is a block at all — is true whether or
      // not the bytes are well-formed, so `FRONTMATTER_FORBIDDEN` fires and
      // `FRONTMATTER_UNPARSEABLE` is not additionally reported: deletion is the
      // fix either way. The keys cannot be extracted from bytes that never
      // parsed, so there is no evidence to carry.
      // ARRANGE
      const file = '---\ntype: plain\n  title: indented under a scalar\n---\n';
      const expected = [{ field: null, violation: 'FRONTMATTER_FORBIDDEN', requirement: { frontmatter: 'forbidden' } }];
      // ACT
      const actual = violationsForFile(file, INDEX);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('fires presence on a file that never opened a block', () => {
      // A file with no fence reads as `{}` under a constraining rule, which is
      // what lets `presence: required` speak at all here.
      // ARRANGE
      const file = '# Notes that never opened a block\n\nProse only.\n';
      const expected = ['MISSING_REQUIRED_FIELD'];
      // ACT
      const actual = violationsForFile(file, PLAIN).map((found) => found.violation);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('treats an immediately closed fence as a block with no keys', () => {
      // An empty mapping is what distinguishes this from a block whose bytes
      // never parsed at all.
      // ARRANGE
      const file = '---\n---\n\n# Plain documents\n';
      const expected = [
        {
          field: null,
          value: { keys: [] },
          violation: 'FRONTMATTER_FORBIDDEN',
          requirement: { frontmatter: 'forbidden' },
        },
      ];
      // ACT
      const actual = violationsForFile(file, INDEX);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });

    it('fires presence rather than skipping on an immediately closed fence', () => {
      // ARRANGE
      const file = '---\n---\n';
      const expected = ['MISSING_REQUIRED_FIELD'];
      // ACT
      const actual = violationsForFile(file, PLAIN).map((found) => found.violation);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('orders fields first, then cross-field, then unknown keys', () => {
      // Declared-field findings group together and the not-declared finding goes
      // last. The choice is arbitrary; being written down is not.
      // ARRANGE
      const rule: FrontmatterRule = {
        ruleId: 'everything',
        intent: 'A rule that breaks in all three tiers at once',
        path: ['docs/**/*.md'],
        unknownKeys: 'forbidden',
        allOf: ['title', 'description'],
        fields: { type: { presence: 'required' }, slug: { pattern: '^[a-z]+$', intent: 'lowercase' } },
      };
      const file = '---\nslug: NOT_LOWER\nstray: 1\n---\n';
      const expected = ['MISSING_REQUIRED_FIELD', 'PATTERN_MISMATCH', 'ALL_OF_UNSATISFIED', 'UNKNOWN_KEY_FORBIDDEN'];
      // ACT
      const actual = violationsForFile(file, rule).map((found) => found.violation);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps field findings in the config own declaration order', () => {
      // Not sorted, and not the file's order: the order the Operator wrote the
      // constraints in, so a reader can follow the config down the page.
      // ARRANGE
      const rule: FrontmatterRule = {
        ruleId: 'datasets',
        intent: 'A dataset card says who fetched it, when, and where it came from',
        path: ['docs/datasets/**/*.md'],
        fields: {
          'retrieved.by': { presence: 'required', format: 'actor' },
          'retrieved.at': { presence: 'required', format: 'datetime' },
          origin: { presence: 'required', format: 'uri' },
        },
      };
      const file =
        '---\norigin: s3://bucket/quarterly usage.parquet\nretrieved:\n  by: human/hancrafted\n  at: 2026-08-24\n---\n';
      const expected = ['retrieved.by', 'retrieved.at', 'origin'];
      // ACT
      const actual = violationsForFile(file, rule).map((found) => found.field);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
