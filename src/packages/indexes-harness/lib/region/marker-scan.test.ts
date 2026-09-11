// Recognition, which the Conformance corpus can only partly reach.
//
// The corpus exercises the STATES a file can be in — created, appended, healed,
// refused — because those are whole-file outcomes with golden bytes. It cannot
// cheaply exercise the six SPELLINGS of a marker, because each needs its own
// directory to be worth a golden. Measured: deleting the indented-code branch
// from the scanner left the whole Conformance suite green. These tests are what
// makes that regression fail.

import { describe, expect, it } from 'vitest';
import { scanMarkers } from './marker-scan.pure.ts';

const START = '<!-- indexes:start -->';
const END = '<!-- indexes:end -->';

describe('scanMarkers', () => {
  describe('success cases', () => {
    it('finds a well-formed pair and reports where each sits', () => {
      // ARRANGE
      const text = ['# Title', '', START, '', '- [a](a.md)', '', END, ''].join('\n');
      const expected = { starts: [2], ends: [6], unterminated: [] };
      // ACT
      const actual = scanMarkers(text);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('recognises a marker indented up to three spaces, which renders identically', () => {
      // Three spaces is legal CommonMark and renders the same, so refusing a
      // file over it would be hostile for zero contract value.
      // ARRANGE
      const text = [`   ${START}`, '', `   ${END}`].join('\n');
      const expected = { starts: [0], ends: [2], unterminated: [] };
      // ACT
      const actual = scanMarkers(text);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('recognises a marker carrying trailing whitespace, which is invisible', () => {
      // ARRANGE
      const text = [`${START}  `, `${END}\t`].join('\n');
      const expected = { starts: [0], ends: [1], unterminated: [] };
      // ACT
      const actual = scanMarkers(text);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses a marker written with no inner spaces, because the bytes differ', () => {
      // `<!--indexes:start-->` is a different string. Recognising it would break
      // the uniqueness invariant the region depends on, and it is also the case
      // the generator must leave untouched rather than delete.
      // ARRANGE
      const text = ['<!--indexes:start-->', '<!--indexes:end-->'].join('\n');
      const nothing = { starts: [], ends: [], unterminated: [] };
      // ACT
      const actual = scanMarkers(text);
      // ASSERT
      expect(actual).toEqual(nothing);
    });

    it('refuses a marker with text after it, which CommonMark swallows', () => {
      // The survey's first implication: CommonMark absorbs the trailing text
      // into the HTML block, while MkDocs leaks it back out as a paragraph.
      // ARRANGE
      const text = [`${START} and then some prose`, `${END} likewise`].join('\n');
      const nothing = { starts: [], ends: [], unterminated: [] };
      // ACT
      const actual = scanMarkers(text);
      // ASSERT
      expect(actual).toEqual(nothing);
    });

    it('refuses a four-space-indented marker, which is an indented code block', () => {
      // The one spelling that needs no rule of its own in the specification,
      // because CommonMark already gives it a different meaning. It needs a
      // branch here all the same, and a test to keep that branch honest.
      // ARRANGE
      const text = ['paragraph', '', `    ${START}`, '', `    ${END}`].join('\n');
      const nothing = { starts: [], ends: [], unterminated: [] };
      // ACT
      const actual = scanMarkers(text);
      // ASSERT
      expect(actual).toEqual(nothing);
    });
  });

  describe('edge cases', () => {
    it('never treats a marker inside a fenced code block as a boundary', () => {
      // The survey called this the central finding of its section, and doctoc is
      // the only surveyed tool exempt — for exactly this reason. The real pair
      // below the fence is still found.
      // ARRANGE
      const text = ['```markdown', START, END, '```', '', START, '', END].join('\n');
      const expected = { starts: [5], ends: [7], unterminated: [] };
      // ACT
      const actual = scanMarkers(text);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('never treats a marker inside a tilde fence as a boundary either', () => {
      // Both fence characters, because supporting only backticks would leave a
      // silent hole in a file this repo could legitimately write.
      // ARRANGE
      const text = ['~~~text', START, '~~~'].join('\n');
      const nothing = { starts: [], ends: [], unterminated: [] };
      // ACT
      const actual = scanMarkers(text);
      // ASSERT
      expect(actual).toEqual(nothing);
    });

    it('never treats a marker mid-line as a boundary, because that is inline HTML', () => {
      // ARRANGE
      const text = `A sentence mentioning ${END} in passing.`;
      const nothing = { starts: [], ends: [], unterminated: [] };
      // ACT
      const actual = scanMarkers(text);
      // ASSERT
      expect(actual).toEqual(nothing);
    });

    it('reports an unterminated start marker without recognising it', () => {
      // The one state healing cannot reach. It is reportable and not healable:
      // there is no recognised survivor to delete.
      // ARRANGE
      const text = ['# Title', '', '<!-- indexes:start', '', '- [a](a.md)'].join('\n');
      const expected = { starts: [], ends: [], unterminated: [2] };
      // ACT
      const actual = scanMarkers(text);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('finds both pairs when a file holds two, so the caller can refuse', () => {
      // The scanner does not decide; it reports. Refusal is the splicer's call,
      // and it cannot make it without seeing both.
      // ARRANGE
      const text = [START, END, '', START, END].join('\n');
      const expected = { starts: [0, 3], ends: [1, 4], unterminated: [] };
      // ACT
      const actual = scanMarkers(text);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
