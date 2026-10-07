// Colocated unit test for the steering-marker grade: presence anywhere is the
// pass; placement in the governed section is a recorded second boolean.

import { describe, expect, it } from 'vitest';
import { gradeSteeringMarker } from './steering-grade.pure.ts';

const STEERING_MARKER = 'QQ11-2222';
const SCOPE = { level: 2, titlePattern: '^Findings$' };

function grade(finalFile: string | undefined) {
  return gradeSteeringMarker({ finalFile, steeringMarker: STEERING_MARKER, scope: SCOPE });
}

const IN_SCOPE = `# T\n## Findings\nfound ${STEERING_MARKER}\n## Sources\nsrc\n`;
const ONE_OVER = `# T\n## Findings\nfound\n## Sources\nsrc ${STEERING_MARKER}\n`;

describe('gradeSteeringMarker', () => {
  describe('success cases', () => {
    it('passes and places a steering marker inside the governed section', () => {
      // ARRANGE
      const expected = { present: true, placed: true, count: 1 };
      // ACT
      const { present, placed, count } = grade(IN_SCOPE);
      // ASSERT
      expect({ present, placed, count }).toEqual(expected);
    });

    it('passes but does not place a steering marker one section over', () => {
      // ARRANGE
      const expected = { present: true, placed: false };
      // ACT
      const { present, placed } = grade(ONE_OVER);
      // ASSERT
      expect({ present, placed }).toEqual(expected);
    });

    it('counts fence and frontmatter occurrences apart from the raw count', () => {
      // ARRANGE
      const text = `---\nnote: ${STEERING_MARKER}\n---\n## Findings\n\`\`\`\n${STEERING_MARKER}\n\`\`\`\n${STEERING_MARKER}\n`;
      const expected = { count: 3, fenceCount: 1, frontmatterCount: 1 };
      // ACT
      const { count, fenceCount, frontmatterCount } = grade(text);
      // ASSERT
      expect({ count, fenceCount, frontmatterCount }).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('fails when the steering marker is absent', () => {
      // ARRANGE
      const expected = { present: false, placed: false, count: 0 };
      // ACT
      const { present, placed, count } = grade('# T\n## Findings\nnothing\n');
      // ASSERT
      expect({ present, placed, count }).toEqual(expected);
    });

    it('fails when there is no file at the target path', () => {
      // ARRANGE
      const expected = { present: false, placed: null, count: 0 };
      // ACT
      const { present, placed, count } = grade(undefined);
      // ASSERT
      expect({ present, placed, count }).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('does not match a longer code that merely starts with the steering marker', () => {
      // ARRANGE
      const text = `## Findings\n${STEERING_MARKER}9\n`;
      // ACT
      const actual = grade(text).present;
      // ASSERT
      expect(actual).toBe(false);
    });

    it('reports placement as null when the document has no governed section', () => {
      // ARRANGE
      const text = `# T\n${STEERING_MARKER}\n`;
      // ACT
      const { present, placed } = grade(text);
      // ASSERT
      expect({ present, placed }).toEqual({ present: true, placed: null });
    });
  });
});
