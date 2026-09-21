// Colocated unit test for this Module's answer about one corpus.
//
// What this file answers is one Module's half: the extent it governed and the
// findings it made. The three counts are no longer here — `governedFiles` is a
// union across Modules and no Module can see the others to take it — so the
// arithmetic is asserted where it is now computed, in `cli`, and what is
// asserted here is the two facts the arithmetic is taken over.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../section.ts';
import { moduleCheckFor } from './check-result.pure';

const PLAIN: FrontmatterRule = {
  ruleId: 'plain',
  intent: 'Everything under plain/ still has to say what it is',
  folders: ['docs/plain/'],
  fields: { type: { presence: 'required' } },
};

const CONFORMING = '---\ntype: plain\n---\n';
const UNTYPED = '---\ntitle: No type here\n---\n';

describe("one Module's corpus check", () => {
  describe('success cases', () => {
    it('reports an all-conforming corpus as governed but clean', () => {
      // ARRANGE
      const sources = [{ path: 'docs/plain/notes.md', rule: PLAIN, text: CONFORMING }];
      const expected = { governed: ['docs/plain/notes.md'], files: [] };
      // ACT
      const actual = moduleCheckFor(sources);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('carries the winning rule id and its intent on the finding', () => {
      // Under first-match every violation in a file comes from the same rule,
      // so these sit on the finding rather than on each violation. The
      // justification is not repealed by the nesting: it holds within one
      // Module, which is the level this finding becomes a block at.
      // ARRANGE
      const sources = [{ path: 'docs/plain/untyped.md', rule: PLAIN, text: UNTYPED }];
      const expected = { ruleId: 'plain', ruleIntent: 'Everything under plain/ still has to say what it is' };
      // ACT
      const [finding] = moduleCheckFor(sources).files;
      // ASSERT
      expect({ ruleId: finding.ruleId, ruleIntent: finding.ruleIntent }).toEqual(expected);
    });

    it('names no Module, leaving that to the descriptor at composition', () => {
      // The defect this ticket exists to not reproduce: a Module that wrote its
      // own config key into its own findings would make the promise that a
      // Module costs one descriptor plus one list entry quietly false. The
      // finding carries the rule and the path; the key comes from `cli`.
      // ARRANGE
      const sources = [{ path: 'docs/plain/untyped.md', rule: PLAIN, text: UNTYPED }];
      const expected = ['path', 'ruleId', 'ruleIntent', 'violations'];
      // ACT
      const [finding] = moduleCheckFor(sources).files;
      // ASSERT
      expect(Object.keys(finding)).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('lists only the files carrying a violation, in the order given', () => {
      // Conforming files are absent from the findings, and the order is the
      // walker's.
      // ARRANGE
      const sources = [
        { path: 'docs/plain/untyped.md', rule: PLAIN, text: UNTYPED },
        { path: 'docs/plain/notes.md', rule: PLAIN, text: CONFORMING },
        { path: 'docs/plain/empty.md', rule: PLAIN, text: '---\ntype:\n---\n' },
      ];
      const expected = ['docs/plain/untyped.md', 'docs/plain/empty.md'];
      // ACT
      const actual = moduleCheckFor(sources).files.map((finding) => finding.path);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports the whole governed extent, not only the part it found something in', () => {
      // The extent is what the union behind `governedFiles` is taken over, and
      // it is the one fact not recoverable from the findings: a governed file
      // that passed leaves no finding to count. The fixture is deliberately
      // mixed and both numbers are written out by hand — read off one return,
      // a corpus whose files were ALL invalid could not tell the two apart.
      // ARRANGE
      const sources = [
        { path: 'docs/plain/a.md', rule: PLAIN, text: UNTYPED },
        { path: 'docs/plain/notes.md', rule: PLAIN, text: CONFORMING },
        { path: 'docs/plain/b.md', rule: PLAIN, text: UNTYPED },
      ];
      const governed = ['docs/plain/a.md', 'docs/plain/notes.md', 'docs/plain/b.md'];
      const found = ['docs/plain/a.md', 'docs/plain/b.md'];
      // ACT
      const actual = moduleCheckFor(sources);
      // ASSERT
      expect(actual.governed).toEqual(governed);
      expect(actual.files.map((finding) => finding.path)).toEqual(found);
    });
  });

  describe('edge cases', () => {
    it('keeps every finding about one file in one block', () => {
      // A file with three findings must not become three entries: the block is
      // per Module and per file, and what nests under it is the whole list.
      // ARRANGE
      const reference: FrontmatterRule = {
        ruleId: 'reference',
        intent: 'Reference pages say how far they can be trusted',
        folders: ['docs/reference/'],
        unknownKeys: 'forbidden',
        fields: {
          status: { allowed: [{ value: 'stable' }] },
          slug: { pattern: '^[a-z]+$', intent: 'lowercase words' },
        },
      };
      const text = '---\nstatus: retired\nslug: Legacy_Reference\nreviewedBy: nobody\n---\n';
      const sources = [{ path: 'docs/reference/legacy.md', rule: reference, text }];
      const findings = 1;
      const violations = 3;
      // ACT
      const actual = moduleCheckFor(sources);
      // ASSERT
      expect(actual.files).toHaveLength(findings);
      expect(actual.files[0]?.violations).toHaveLength(violations);
    });

    it('reports an empty corpus as nothing governed and nothing found', () => {
      // ARRANGE
      const expected = { governed: [], files: [] };
      // ACT
      const actual = moduleCheckFor([]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
