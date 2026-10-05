// Colocated unit test for the spine check at its one interface, `bodyViolations`:
// the spine walk: `heading` entries claimed one heading
// each, `enumeration` entries owning a run, and every leftover given to the
// first rule that fits, and the `maxLevel` check, one
// violation per level beyond the limit.

import { describe, expect, it } from 'vitest';
import type { BodyStructureRule, HeadingEntry } from '../../section.ts';
import { bodyViolations } from './body-violations.pure.ts';

const TITLE: HeadingEntry = { purpose: 'heading', level: 1 };
const FINDINGS: HeadingEntry = {
  purpose: 'heading',
  level: 2,
  pattern: '^Findings$',
  intent: 'What was measured, with numbers.',
};
const SOURCES: HeadingEntry = { purpose: 'enumeration', level: 2, pattern: '^Source: ', minCount: 1, maxCount: 2 };
const OPTIONAL: HeadingEntry = { purpose: 'heading', level: 2, pattern: '^Consequences$', presence: 'optional' };
const ANY_PARTS: HeadingEntry = { purpose: 'enumeration', level: 2, minCount: 0 };
const CONCLUSION: HeadingEntry = { purpose: 'heading', level: 2, pattern: '^Conclusion$' };

const h = (level: number, content: string) => ({ level, content });

/** The markdown body whose top-level headings are `outline`. */
const bodyOf = (outline: readonly { level: number; content: string }[]): string =>
  outline.map(({ level, content }) => `${'#'.repeat(level)} ${content}\n`).join('\n');

/** What `bodyViolations` finds in a body made of `outline` against a Rule of `headings` and `maxLevel`. */
const violationsOf = (
  headings: readonly HeadingEntry[] | undefined,
  outline: readonly { level: number; content: string }[],
  maxLevel?: number,
) => {
  const rule: BodyStructureRule = { ruleId: 'r', intent: 'A test Rule.', folders: ['docs/'], headings, maxLevel };
  return bodyViolations(rule, bodyOf(outline));
};

describe('bodyViolations', () => {
  describe('success cases', () => {
    it('claims every heading entry in order and counts the repeats of an enumeration', () => {
      // ARRANGE
      const outline = [h(1, 'Report'), h(2, 'Findings'), h(3, 'Detail'), h(2, 'Source: One'), h(2, 'Source: Two')];
      const expected: readonly unknown[] = [];
      // ACT
      const actual = violationsOf([TITLE, FINDINGS, SOURCES], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lets headings no later entry claims interleave an enumeration run', () => {
      // ARRANGE
      const outline = [h(2, 'Source: One'), h(3, 'Aside'), h(2, 'Other'), h(2, 'Source: Two')];
      const expected: readonly unknown[] = [];
      // ACT
      const actual = violationsOf([SOURCES], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lets an enumeration yield to a later heading entry, so an unpatterned run ends before the Conclusion', () => {
      // ARRANGE
      const outline = [h(1, 'Title'), h(2, 'A'), h(2, 'B'), h(2, 'Conclusion')];
      const expected: readonly unknown[] = [];
      // ACT
      const actual = violationsOf([TITLE, ANY_PARTS, CONCLUSION], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports a required heading entry with no matching heading as missing, entry verbatim', () => {
      // ARRANGE
      const outline = [h(1, 'Report'), h(2, 'Source: One')];
      const expected = [{ violation: 'BODY_STRUCTURE__HEADING_MISSING', entry: 1, requirement: FINDINGS }];
      // ACT
      const actual = violationsOf([TITLE, FINDINGS, SOURCES], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a heading entry whose only match sits before the cursor as out of order, never as missing', () => {
      // ARRANGE
      const source: HeadingEntry = { purpose: 'heading', level: 2, pattern: '^Source: ' };
      const outline = [h(1, 'Report'), h(2, 'Source: One'), h(2, 'Findings')];
      const expected = [{ violation: 'BODY_STRUCTURE__HEADING_OUT_OF_ORDER', entry: 2, requirement: source }];
      // ACT
      const actual = violationsOf([TITLE, FINDINGS, source], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a second heading a heading entry matches as repeated, with found one plus the repeats', () => {
      // ARRANGE
      const outline = [h(1, 'One'), h(1, 'Two'), h(1, 'Three')];
      const expected = [{ violation: 'BODY_STRUCTURE__HEADING_REPEATED', entry: 0, found: 3, requirement: TITLE }];
      // ACT
      const actual = violationsOf([TITLE], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports an enumeration below its minimum and above its maximum with found counted', () => {
      // ARRANGE
      const none = [h(1, 'Report')];
      const three = [h(2, 'Source: A'), h(2, 'Source: B'), h(2, 'Source: C')];
      const expected = [
        ['BODY_STRUCTURE__ENUMERATION_BELOW_MINIMUM', 0],
        ['BODY_STRUCTURE__ENUMERATION_ABOVE_MAXIMUM', 3],
      ];
      // ACT
      const actual = [none, three].map((outline) => {
        const [violation] = violationsOf([SOURCES], outline);
        return [violation?.violation, violation !== undefined && 'found' in violation ? violation.found : -1];
      });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a repeat outside its run as out of order and still counts it, never as missing', () => {
      // ARRANGE
      const outline = [h(2, 'Conclusion'), h(2, 'Part')];
      const parts: HeadingEntry = { purpose: 'enumeration', level: 2, pattern: '^Part', minCount: 1 };
      const expected = ['BODY_STRUCTURE__HEADING_OUT_OF_ORDER'];
      // ACT
      const actual = violationsOf([parts, CONCLUSION], outline).map((v) => v.violation);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reports level violations before spine violations for a Rule with both maxLevel and headings', () => {
      // ARRANGE
      const outline = [h(1, 'One'), h(1, 'Two'), h(2, 'Deep')];
      const expected = ['BODY_STRUCTURE__LEVEL_TOO_DEEP', 'BODY_STRUCTURE__HEADING_REPEATED'];
      // ACT
      const actual = violationsOf([TITLE], outline, 1).map((v) => v.violation);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('gives a leftover matching a claimed heading entry and an enumeration to the heading entry, as a repeat', () => {
      // ARRANGE
      const parts: HeadingEntry = { purpose: 'enumeration', level: 2, pattern: '^F', minCount: 0 };
      const outline = [h(2, 'Findings'), h(2, 'Findings')];
      const expected = [{ violation: 'BODY_STRUCTURE__HEADING_REPEATED', entry: 1, found: 2, requirement: FINDINGS }];
      // ACT
      const actual = violationsOf([parts, FINDINGS], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('gives a leftover matching an unclaimed heading entry and an enumeration to the enumeration, out of its run', () => {
      // ARRANGE
      const z: HeadingEntry = { purpose: 'heading', level: 2, pattern: '^Z$' };
      const parts: HeadingEntry = { purpose: 'enumeration', level: 2, pattern: '^F', minCount: 0 };
      const outline = [h(2, 'Findings'), h(2, 'Z')];
      const expected = [
        { violation: 'BODY_STRUCTURE__HEADING_OUT_OF_ORDER', entry: 1, requirement: FINDINGS },
        { violation: 'BODY_STRUCTURE__HEADING_OUT_OF_ORDER', entry: 2, requirement: parts },
      ];
      // ACT
      const actual = violationsOf([z, FINDINGS, parts], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('stays silent for an absent optional heading entry but reports a misplaced one as out of order', () => {
      // ARRANGE
      const absent = [h(2, 'Findings')];
      const misplaced = [h(2, 'Consequences'), h(2, 'Findings')];
      const expected = [[], ['BODY_STRUCTURE__HEADING_OUT_OF_ORDER']];
      // ACT
      const actual = [absent, misplaced].map((outline) =>
        violationsOf([FINDINGS, OPTIONAL], outline).map((v) => v.violation),
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('searches a pattern and never anchors it, case-sensitively', () => {
      // ARRANGE
      const contains: HeadingEntry = { purpose: 'heading', level: 2, pattern: 'ecis' };
      const expected = [[], [{ violation: 'BODY_STRUCTURE__HEADING_MISSING', entry: 0, requirement: contains }]];
      // ACT
      const actual = [[h(2, 'A Decision')], [h(2, 'DECISION')]].map((outline) => violationsOf([contains], outline));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('matches greedily: an earlier unpatterned entry takes the first match a later entry needed', () => {
      // ARRANGE
      const any2: HeadingEntry = { purpose: 'heading', level: 2 };
      const outline = [h(2, 'Findings')];
      const expected = [{ violation: 'BODY_STRUCTURE__HEADING_MISSING', entry: 1, requirement: FINDINGS }];
      // ACT
      const actual = violationsOf([any2, FINDINGS], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('matches an entry only at its own level', () => {
      // ARRANGE
      const outline = [h(3, 'Findings')];
      const expected = [{ violation: 'BODY_STRUCTURE__HEADING_MISSING', entry: 0, requirement: FINDINGS }];
      // ACT
      const actual = violationsOf([FINDINGS], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports nothing for a Rule that writes no headings', () => {
      // ARRANGE
      const expected: readonly unknown[] = [];
      // ACT
      const actual = violationsOf(undefined, [h(1, 'x')]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

const deep = (level: number) => h(level, `L${level}`);

describe('bodyViolations: maxLevel', () => {
  describe('success cases', () => {
    it('reports one violation per level beyond the limit, ascending, counting the headings at it', () => {
      // ARRANGE
      const outline = [deep(1), deep(4), deep(3), deep(4), deep(6)];
      const expected = [
        { violation: 'BODY_STRUCTURE__LEVEL_TOO_DEEP', level: 4, found: 2, requirement: { maxLevel: 3 } },
        { violation: 'BODY_STRUCTURE__LEVEL_TOO_DEEP', level: 6, found: 1, requirement: { maxLevel: 3 } },
      ];
      // ACT
      const actual = violationsOf(undefined, outline, 3);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports a level beyond the limit even when nothing else is wrong', () => {
      // ARRANGE
      const expected = [
        { violation: 'BODY_STRUCTURE__LEVEL_TOO_DEEP', level: 2, found: 1, requirement: { maxLevel: 1 } },
      ];
      // ACT
      const actual = violationsOf(undefined, [deep(1), deep(2)], 1);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('permits any depth when the Rule writes no maxLevel', () => {
      // ARRANGE
      const expected: readonly unknown[] = [];
      // ACT
      const actual = violationsOf(undefined, [deep(6)], undefined);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('accepts a heading exactly at the limit', () => {
      // ARRANGE
      const expected: readonly unknown[] = [];
      // ACT
      const actual = violationsOf(undefined, [deep(2)], 2);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

/** What `bodyViolations` finds in a raw `body` against a Rule of `headings` and the `undefinedHeadings` key. */
const closedViolationsOf = (
  headings: readonly HeadingEntry[] | undefined,
  body: string,
  undefinedHeadings: BodyStructureRule['undefinedHeadings'] = 'forbid',
) => {
  const rule: BodyStructureRule = {
    ruleId: 'r',
    intent: 'A test Rule.',
    folders: ['docs/'],
    headings,
    undefinedHeadings,
  };
  return bodyViolations(rule, body);
};

/** One `BODY_STRUCTURE__HEADING_UNDEFINED` as the closure reports it. */
const undefinedHeading = (level: number, content: string) => ({
  violation: 'BODY_STRUCTURE__HEADING_UNDEFINED',
  level,
  content,
  requirement: { undefinedHeadings: 'forbid' },
});

describe('bodyViolations: undefinedHeadings', () => {
  describe('success cases', () => {
    it('passes a closed document whose every heading an entry matches', () => {
      // ARRANGE
      const outline = [h(1, 'Report'), h(2, 'Source: One'), h(2, 'Source: Two'), h(2, 'Conclusion')];
      const expected: readonly unknown[] = [];
      // ACT
      const actual = closedViolationsOf([TITLE, SOURCES, CONCLUSION], bodyOf(outline));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports one violation per undefined heading with its level and raw content, in document order', () => {
      // ARRANGE
      const outline = [h(1, 'Report'), h(2, 'Source: One'), h(2, 'Aside'), h(2, 'Conclusion'), h(2, 'Appendix')];
      const expected = [undefinedHeading(2, 'Aside'), undefinedHeading(2, 'Appendix')];
      // ACT
      const actual = closedViolationsOf([TITLE, SOURCES, CONCLUSION], bodyOf(outline));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('passes the same body under allow and under no key at all', () => {
      // ARRANGE
      const outline = [h(1, 'Report'), h(2, 'Aside'), h(2, 'Conclusion')];
      const expected: readonly unknown[] = [];
      // ACT
      const actual = [
        closedViolationsOf([TITLE, CONCLUSION], bodyOf(outline), 'allow'),
        violationsOf([TITLE, CONCLUSION], outline),
      ];
      // ASSERT
      expect(actual).toEqual([expected, expected]);
    });
  });

  describe('failure cases', () => {
    it('reports undefined headings before the missing entries, so a renamed section reads undefined then missing', () => {
      // ARRANGE
      const outline = [h(1, 'Report'), h(2, 'Rationale')];
      const expected = [
        undefinedHeading(2, 'Rationale'),
        { violation: 'BODY_STRUCTURE__HEADING_MISSING', entry: 1, requirement: FINDINGS },
      ];
      // ACT
      const actual = closedViolationsOf([TITLE, FINDINGS], bodyOf(outline));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a title when the spine names no level 1 entry', () => {
      // ARRANGE
      const expected = [undefinedHeading(1, 'Report')];
      // ACT
      const actual = closedViolationsOf([CONCLUSION], bodyOf([h(1, 'Report'), h(2, 'Conclusion')]));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a heading whose text an entry names at a level the entry does not as undefined', () => {
      // ARRANGE
      const expected = [
        undefinedHeading(3, 'Findings'),
        { violation: 'BODY_STRUCTURE__HEADING_MISSING', entry: 1, requirement: FINDINGS },
      ];
      // ACT
      const actual = closedViolationsOf([TITLE, FINDINGS], bodyOf([h(1, 'Report'), h(3, 'Findings')]));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports every heading as undefined when the Rule writes no headings', () => {
      // ARRANGE
      const expected = [undefinedHeading(1, 'Report'), undefinedHeading(2, 'Aside')];
      // ACT
      const actual = closedViolationsOf(undefined, bodyOf([h(1, 'Report'), h(2, 'Aside')]));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports two undefined headings of one level and one content as two violations', () => {
      // ARRANGE
      const expected = [undefinedHeading(2, 'Aside'), undefinedHeading(2, 'Aside')];
      // ACT
      const actual = closedViolationsOf([TITLE], bodyOf([h(1, 'Report'), h(2, 'Aside'), h(2, 'Aside')]));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('never reports a repeated or misplaced heading as undefined: its entry reports it', () => {
      // ARRANGE
      const outline = [h(2, 'Conclusion'), h(2, 'Findings'), h(2, 'Findings')];
      const expected = [
        { violation: 'BODY_STRUCTURE__HEADING_REPEATED', entry: 0, found: 2, requirement: FINDINGS },
        { violation: 'BODY_STRUCTURE__HEADING_OUT_OF_ORDER', entry: 1, requirement: CONCLUSION },
      ];
      // ACT
      const actual = closedViolationsOf([FINDINGS, CONCLUSION], bodyOf(outline));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('never reports a repeat outside an enumeration run as undefined: it is out of order and counted', () => {
      // ARRANGE
      const outline = [h(2, 'Source: One'), h(2, 'Conclusion'), h(2, 'Source: Two')];
      const expected = [{ violation: 'BODY_STRUCTURE__HEADING_OUT_OF_ORDER', entry: 0, requirement: SOURCES }];
      // ACT
      const actual = closedViolationsOf([SOURCES, CONCLUSION], bodyOf(outline));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('decides from matching and never from the walk, so a misplaced heading is out of order and not undefined', () => {
      // ARRANGE
      const outline = [h(2, 'Conclusion'), h(2, 'Findings')];
      const expected = [{ violation: 'BODY_STRUCTURE__HEADING_OUT_OF_ORDER', entry: 1, requirement: CONCLUSION }];
      // ACT
      const actual = closedViolationsOf([FINDINGS, CONCLUSION], bodyOf(outline));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('does not read a heading in a fence, a blockquote or an indented code block', () => {
      // ARRANGE
      const body = [
        '# Report',
        '',
        '```',
        '## In a fence',
        '```',
        '',
        '> ## In a quote',
        '',
        '    ## Indented',
        '',
      ].join('\n');
      const expected: readonly unknown[] = [];
      // ACT
      const actual = closedViolationsOf([TITLE], body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reaches a heading at any level, down to 6', () => {
      // ARRANGE
      const expected = [undefinedHeading(6, 'Deep')];
      // ACT
      const actual = closedViolationsOf([TITLE], bodyOf([h(1, 'Report'), h(6, 'Deep')]));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports an empty body against a closed Rule with no headings as clean', () => {
      // ARRANGE
      const expected: readonly unknown[] = [];
      // ACT
      const actual = closedViolationsOf(undefined, '');
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

/** A Rule of `fields` over a hand-written markdown `body`, so a test states the document a reader sees. */
const check = (fields: Partial<BodyStructureRule>, body: string) =>
  bodyViolations({ ruleId: 'r', intent: 'A test Rule.', folders: ['docs/'], ...fields }, body);

/** The violation codes alone, in order. */
const codesOf = (violations: readonly { violation: string }[]) => violations.map(({ violation }) => violation);

const SIX = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];
const RELEASES: HeadingEntry = { purpose: 'enumeration', level: 2, pattern: '^\\[', minCount: 1 };

describe('bodyViolations: the heading vocabulary', () => {
  describe('success cases', () => {
    it('lets a closed spine govern a changelog: releases claimed by an enumeration, the rest by the vocabulary', () => {
      // ARRANGE
      const body = '# Changelog\n\n## [2.0.0]\n\n### Added\n\n### Fixed\n\n## [1.0.0]\n\n### Fixed\n\n### Added\n';
      const expected: readonly unknown[] = [];
      // ACT
      const actual = check(
        {
          undefinedHeadings: 'forbid',
          headings: [{ purpose: 'heading', level: 1, pattern: '^Changelog$' }, RELEASES],
          vocabulary: [{ level: 3, allowed: SIX }],
        },
        body,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('holds a title at its level wherever it sits: before the title and before any release', () => {
      // ARRANGE
      const body = '### Added\n\n# Changelog\n\n### Fixed\n\n## [1.0.0]\n';
      const expected: readonly unknown[] = [];
      // ACT
      const actual = check(
        {
          headings: [{ purpose: 'heading', level: 1, pattern: '^Changelog$' }, RELEASES],
          vocabulary: [{ level: 3, allowed: SIX }],
        },
        body,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('accepts a Rule that writes only a vocabulary, holding no other level to anything', () => {
      // ARRANGE
      const body = '# Anything\n\n## Whatever\n\n### Added\n\n#### Deep\n';
      const expected: readonly unknown[] = [];
      // ACT
      const actual = check({ vocabulary: [{ level: 3, allowed: ['Added'] }] }, body);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports a heading outside the vocabulary with its level, raw content and the whole item', () => {
      // ARRANGE
      const body = '# T\n\n### Improved\n';
      const item = { level: 3, allowed: SIX };
      const expected = [
        { violation: 'BODY_STRUCTURE__HEADING_NOT_IN_VOCABULARY', level: 3, content: 'Improved', requirement: item },
      ];
      // ACT
      const actual = check({ vocabulary: [item] }, body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports it as outside the vocabulary and never as out of order, though no entry could place it', () => {
      // ARRANGE
      const body = '### Improved\n\n# Changelog\n\n## [1.0.0]\n';
      const expected = ['BODY_STRUCTURE__HEADING_NOT_IN_VOCABULARY'];
      // ACT
      const actual = codesOf(
        check(
          {
            headings: [{ purpose: 'heading', level: 1, pattern: '^Changelog$' }, RELEASES],
            vocabulary: [{ level: 3, allowed: SIX }],
          },
          body,
        ),
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a heading outside the vocabulary once under a closed spine, never also as undefined', () => {
      // ARRANGE
      const body = '# Changelog\n\n## [1.0.0]\n\n### Improved\n';
      const expected = ['BODY_STRUCTURE__HEADING_NOT_IN_VOCABULARY'];
      // ACT
      const actual = codesOf(
        check(
          {
            undefinedHeadings: 'forbid',
            headings: [{ purpose: 'heading', level: 1, pattern: '^Changelog$' }, RELEASES],
            vocabulary: [{ level: 3, allowed: SIX }],
          },
          body,
        ),
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('is case-sensitive and whole-title: added, Added things and **Added** are all outside', () => {
      // ARRANGE
      const body = '### added\n\n### Added things\n\n### **Added**\n\n### Added\n';
      const expected = ['added', 'Added things', '**Added**'];
      // ACT
      const actual = check({ vocabulary: [{ level: 3, allowed: ['Added'] }] }, body).map((violation) =>
        'content' in violation ? violation.content : undefined,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('orders undefined and out-of-vocabulary headings together in document order, ahead of the spine', () => {
      // ARRANGE
      const body = '### Improved\n\n## Unreleased\n\n#### Deep\n';
      const expected = [
        'BODY_STRUCTURE__HEADING_NOT_IN_VOCABULARY',
        'BODY_STRUCTURE__HEADING_UNDEFINED',
        'BODY_STRUCTURE__HEADING_UNDEFINED',
        'BODY_STRUCTURE__HEADING_MISSING',
      ];
      // ACT
      const actual = codesOf(
        check(
          {
            undefinedHeadings: 'forbid',
            headings: [{ purpose: 'heading', level: 1 }],
            vocabulary: [{ level: 3, allowed: SIX }],
          },
          body,
        ),
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lets maxLevel and a vocabulary stand together, depth first', () => {
      // ARRANGE
      const body = '#### Deep\n\n### Improved\n';
      const expected = ['BODY_STRUCTURE__LEVEL_TOO_DEEP', 'BODY_STRUCTURE__HEADING_NOT_IN_VOCABULARY'];
      // ACT
      const actual = codesOf(check({ maxLevel: 3, vocabulary: [{ level: 3, allowed: ['Added'] }] }, body));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads no heading inside a fence or a quote as a title', () => {
      // ARRANGE
      const body = '```\n### Improved\n```\n\n> ### Improved\n';
      const expected: readonly unknown[] = [];
      // ACT
      const actual = check({ vocabulary: [{ level: 3, allowed: ['Added'] }] }, body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports an empty heading as outside the vocabulary', () => {
      // ARRANGE
      const body = '###\n';
      const expected = ['BODY_STRUCTURE__HEADING_NOT_IN_VOCABULARY'];
      // ACT
      const actual = codesOf(check({ vocabulary: [{ level: 3, allowed: ['Added'] }] }, body));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('bodyViolations: section content', () => {
  const CONTEXT: HeadingEntry = { purpose: 'heading', level: 2, pattern: '^Context$', mayHold: ['prose'] };
  const STEP: HeadingEntry = {
    purpose: 'enumeration',
    level: 3,
    pattern: '^[0-9]+\\. ',
    minCount: 1,
    mayHold: ['ordered-list'],
  };

  /** The `[entry, content, kind, found]` of each content finding. */
  const contentOf = (violations: ReturnType<typeof bodyViolations>) =>
    violations.flatMap((violation) =>
      violation.violation === 'BODY_STRUCTURE__BLOCK_KIND_NOT_ALLOWED'
        ? [[violation.entry, violation.content, violation.kind, violation.found]]
        : [],
    );

  describe('success cases', () => {
    it('passes a section whose blocks are all of listed kinds, and an empty section', () => {
      // ARRANGE
      const body = '## Context\n\nOne.\n\nTwo.\n\n## Decision\n';
      const expected: readonly unknown[] = [];
      // ACT
      const actual = check(
        { headings: [CONTEXT, { purpose: 'heading', level: 2, pattern: '^Decision$', mayHold: ['prose'] }] },
        body,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('judges the section a claimed heading owns up to the next heading of any level', () => {
      // ARRANGE
      const body = '## Context\n\nProse.\n\n### Sub\n\n- a bullet\n';
      const expected: readonly unknown[] = [];
      // ACT
      const actual = check({ headings: [CONTEXT] }, body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('governs a subsection by its own entry and never its parent', () => {
      // ARRANGE
      const body = '## Decision\n\nProse.\n\n### 1. First\n\n1. one\n\n### 2. Second\n\n1. one\n';
      const expected: readonly unknown[] = [];
      // ACT
      const actual = check(
        { headings: [{ purpose: 'heading', level: 2, pattern: '^Decision$', mayHold: ['prose'] }, STEP] },
        body,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('judges blocks before the first heading never, so a preamble is free', () => {
      // ARRANGE
      const body = '- a preamble bullet\n\n## Context\n\nProse.\n';
      const expected: readonly unknown[] = [];
      // ACT
      const actual = check({ headings: [CONTEXT] }, body);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports an unlisted kind with the entry index, the heading content, the kind and the count', () => {
      // ARRANGE
      const body = '# T\n\n## Context\n\n- a\n\n1. b\n\n- c\n';
      const expected = [
        [1, 'Context', 'unordered-list', 2],
        [1, 'Context', 'ordered-list', 1],
      ];
      // ACT
      const actual = contentOf(check({ headings: [{ purpose: 'heading', level: 1 }, CONTEXT] }, body));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('carries the entry verbatim as the requirement, mayHold and intent included', () => {
      // ARRANGE
      const entry: HeadingEntry = { ...CONTEXT, intent: 'Why, in prose.' };
      const expected = [
        {
          violation: 'BODY_STRUCTURE__BLOCK_KIND_NOT_ALLOWED',
          entry: 0,
          content: 'Context',
          kind: 'unordered-list',
          found: 1,
          requirement: entry,
        },
      ];
      // ACT
      const actual = check({ headings: [entry] }, '## Context\n\n- a\n');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('judges each repeat of an enumeration by its own section', () => {
      // ARRANGE
      const body = '### 1. A\n\n1. ok\n\n### 2. B\n\n- bad\n\n### 3. C\n\ntext\n';
      const expected = [
        [0, '2. B', 'unordered-list', 1],
        [0, '3. C', 'prose', 1],
      ];
      // ACT
      const actual = contentOf(check({ headings: [STEP] }, body));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('orders content findings after every structural finding, by entry then section', () => {
      // ARRANGE
      const body = '## Context\n\n- a\n\n## Extra\n';
      const expected = ['BODY_STRUCTURE__HEADING_MISSING', 'BODY_STRUCTURE__BLOCK_KIND_NOT_ALLOWED'];
      // ACT
      const actual = codesOf(
        check({ headings: [CONTEXT, { purpose: 'heading', level: 2, pattern: '^Missing$' }] }, body),
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('judges nobody for a heading no entry claims, though its parent declares mayHold', () => {
      // ARRANGE
      const body = '## Context\n\nProse.\n\n### Unclaimed\n\n- bullets\n\n## Other\n\n- also unclaimed\n';
      const expected: readonly unknown[] = [];
      // ACT
      const actual = check({ headings: [CONTEXT] }, body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('judges only the claimed one of a repeated heading, the repeat is already a finding of its own', () => {
      // ARRANGE
      const body = '## Context\n\nProse.\n\n## Context\n\n- bullets\n';
      const expected = ['BODY_STRUCTURE__HEADING_REPEATED'];
      // ACT
      const actual = codesOf(check({ headings: [CONTEXT] }, body));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('judges nobody for a misplaced heading: it is moved first and told about its blocks next', () => {
      // ARRANGE
      const body = '## Other\n\n- bullets\n\n## Context\n\nProse.\n';
      const other: HeadingEntry = { purpose: 'heading', level: 2, pattern: '^Other$', mayHold: ['prose'] };
      const expected = ['BODY_STRUCTURE__HEADING_OUT_OF_ORDER'];
      // ACT
      const actual = codesOf(check({ headings: [CONTEXT, other] }, body));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('judges nobody for a repeat outside an enumeration run', () => {
      // ARRANGE
      const body = '### 1. A\n\n1. ok\n\n## Next\n\n### 2. Late\n\n- bullets\n';
      const entries: readonly HeadingEntry[] = [STEP, { purpose: 'heading', level: 2, pattern: '^Next$' }];
      const expected = ['BODY_STRUCTURE__HEADING_OUT_OF_ORDER'];
      // ACT
      const actual = codesOf(check({ headings: entries }, body));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('judges nobody for an undefined heading under a closed spine, or for a heading a vocabulary admits', () => {
      // ARRANGE
      const body = '## Context\n\nProse.\n\n## Appendix\n\n- bullets\n\n### Added\n\n- bullets\n';
      const expected = ['BODY_STRUCTURE__HEADING_UNDEFINED'];
      // ACT
      const actual = codesOf(
        check(
          { undefinedHeadings: 'forbid', headings: [CONTEXT], vocabulary: [{ level: 3, allowed: ['Added'] }] },
          body,
        ),
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('judges nobody for an optional heading that is absent', () => {
      // ARRANGE
      const entry: HeadingEntry = { ...CONTEXT, presence: 'optional' };
      const expected: readonly unknown[] = [];
      // ACT
      const actual = check({ headings: [entry] }, '## Other\n\n- bullets\n');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('does not end a section at a heading inside a fence, a quote or a list item', () => {
      // ARRANGE
      const body = '## Context\n\n```\n## in fence\n```\n\n> ## in quote\n\n- ## in item\n';
      const expected = [[0, 'Context', 'unordered-list', 1]];
      // ACT
      const actual = contentOf(check({ headings: [CONTEXT] }, body));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('treats a bold label as prose, a nested list as part of its outer list, and a fence as nothing', () => {
      // ARRANGE
      const body = '## Context\n\n**Positive:**\n\n```\ncode\n```\n\n1. a\n   - nested\n';
      const expected = [[0, 'Context', 'ordered-list', 1]];
      // ACT
      const actual = contentOf(check({ headings: [CONTEXT] }, body));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
