// Colocated unit test for the intent-carrier walk.
//
// The walk is generic: it names no Module's section type, so the seam is a plain
// parsed document in and a list of carriers out.

import { describe, expect, it } from 'vitest';
import { intentCarrierAddresses, intentCarriers } from './intent-carriers.pure.ts';

describe('intentCarrierAddresses', () => {
  describe('success cases', () => {
    it('addresses a Rule by its ruleId and anything else below a list by index', () => {
      // ARRANGE
      const document = {
        frontmatter: {
          rules: [
            { ruleId: 'a', intent: 'x' },
            { id: 'b', intent: 'y' },
          ],
        },
        intent: 'top',
      };
      const expected = ['frontmatter.rules[ruleId=a].intent', 'frontmatter.rules[1].intent', 'intent'];
      // ACT
      const actual = intentCarrierAddresses(document);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reaches an intent nested several spine levels below a Rule, not only the top level', () => {
      // ARRANGE
      const document = {
        rules: [
          {
            ruleId: 'r',
            intent: 'rule',
            headings: [
              { level: 1 },
              { level: 2, intent: 'entry', headings: [{ level: 3, allowed: [{ title: 'Added', intent: 'deep' }] }] },
            ],
          },
        ],
      };
      const expected = [
        'rules[ruleId=r].intent',
        'rules[ruleId=r].headings[1].intent',
        'rules[ruleId=r].headings[1].headings[0].allowed[0].intent',
      ];
      // ACT
      const actual = intentCarrierAddresses(document);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('counts the assess.stale sentence as a carrier, addressed by its path under the Rule that holds it', () => {
      // ARRANGE
      const document = { frontmatter: { rules: [{ ruleId: 'r', intent: 'x', assess: { stale: 'Re-read this.' } }] } };
      const expected = ['frontmatter.rules[ruleId=r].intent', 'frontmatter.rules[ruleId=r].assess.stale'];
      // ACT
      const actual = intentCarrierAddresses(document);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('hands a writer the keys that reach each carrier', () => {
      // ARRANGE
      const document = { rules: [{ ruleId: 'r', intent: 'x' }] };
      const expected = [['rules', 0, 'intent']];
      // ACT
      const actual = intentCarriers(document).map((carrier) => carrier.path);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('ignores an intent key whose value is not a string', () => {
      // ARRANGE
      const document = { a: { intent: 3 }, b: { intent: null }, c: { intent: { nested: 'x' } } };
      const expected: string[] = [];
      // ACT
      const actual = intentCarrierAddresses(document);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('does not count a stale key that is not directly under assess', () => {
      // ARRANGE
      const document = { stale: 'a', other: { stale: 'b' }, assess: { instruction: 'c', nested: { stale: 'd' } } };
      const expected: string[] = [];
      // ACT
      const actual = intentCarrierAddresses(document);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('does not count an assess.stale whose value is not a string', () => {
      // ARRANGE
      const document = { assess: { stale: { words: 'x' } } };
      const expected: string[] = [];
      // ACT
      const actual = intentCarrierAddresses(document);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('returns nothing for a scalar or an empty document', () => {
      // ARRANGE
      const documents = ['intent', 7, null, {}, []];
      const expected = [[], [], [], [], []];
      // ACT
      const actual = documents.map(intentCarrierAddresses);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
