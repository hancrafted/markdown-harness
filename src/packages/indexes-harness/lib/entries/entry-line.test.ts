// One entry, as one line — and the three strings that cannot become one.

import { describe, expect, it } from 'vitest';
import { entryLine, entryRefusal } from './entry-line.pure.ts';

describe('entryLine', () => {
  describe('success cases', () => {
    it('renders a link and its description, copied unchanged', () => {
      // No escaping, no truncation, no reflowing: the entry text equals the
      // source text character for character.
      // ARRANGE
      const entry = {
        text: 'Getting started',
        target: 'getting-started.md',
        description: 'Read me first.',
        sortKey: 'getting-started.md',
      };
      const expected = '- [Getting started](getting-started.md) - Read me first.';
      // ACT
      const actual = entryLine(entry);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('renders a folder entry pointing at the child index', () => {
      // A folder entry ALWAYS links the child's index.md, never its descriptor:
      // linking the descriptor sends a reader following a table of contents
      // into a file of agent instructions.
      // ARRANGE
      const entry = {
        text: 'skills',
        target: 'skills/index.md',
        description: 'What this folder holds.',
        sortKey: 'skills',
      };
      const expected = '- [skills](skills/index.md) - What this folder holds.';
      // ACT
      const actual = entryLine(entry);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses a description holding a line break, because an entry is one line', () => {
      // A `|` literal block parses to a string carrying `\n`. A second line
      // beginning `-` or `#` would start a new block inside the region.
      // ARRANGE
      const entry = {
        text: 'Multiline',
        target: 'multiline.md',
        description: 'One line.\nAnd a second.',
        sortKey: 'multiline.md',
      };
      const expected = 'ENTRY_TEXT_HOLDS_LINE_BREAK';
      // ACT
      const actual = entryRefusal(entry);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('refuses link text holding an unbalanced closing bracket', () => {
      // `[Rules ]draft](rules.md)` ends the link early and leaks the rest as
      // prose, which corrupts the region rather than merely looking wrong.
      // ARRANGE
      const entry = { text: 'Rules ]draft', target: 'rules.md', sortKey: 'rules.md' };
      const expected = 'ENTRY_TEXT_HOLDS_UNBALANCED_BRACKET';
      // ACT
      const actual = entryRefusal(entry);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('refuses text holding either boundary literal, not only the end marker', () => {
      // The ground is the ARTIFACT's uniqueness invariant rather than this
      // finder's immunity, so a description carrying the START marker breaks
      // the identical rule and is refused on identical terms.
      // ARRANGE
      const leadingEnd = {
        text: 'Leaky',
        target: 'a.md',
        description: 'Ends with <!-- indexes:end --> literally.',
        sortKey: 'a.md',
      };
      const leadingStart = {
        text: 'Leaky',
        target: 'b.md',
        description: 'Holds <!-- indexes:start --> too.',
        sortKey: 'b.md',
      };
      const expected = 'ENTRY_TEXT_HOLDS_REGION_MARKER';
      // ACT
      const actual = [entryRefusal(leadingEnd), entryRefusal(leadingStart)];
      // ASSERT
      expect(actual).toEqual([expected, expected]);
    });
  });

  describe('edge cases', () => {
    it('renders a name-only entry when no description was found, as the forgiveness path', () => {
      // The degraded form is ordinary, not an error: this Module reports
      // nothing at all about a missing description.
      // ARRANGE
      const entry = { text: 'undescribed', target: 'undescribed.md', sortKey: 'undescribed.md' };
      const expected = '- [undescribed](undescribed.md)';
      // ACT
      const actual = entryLine(entry);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('permits a closing bracket in a description, which sits outside the link', () => {
      // The bracket rule is about link text only. Refusing a `]` anywhere would
      // refuse real sentences for no gain.
      // ARRANGE
      const entry = {
        text: 'Notes',
        target: 'notes.md',
        description: 'See item b] in the table.',
        sortKey: 'notes.md',
      };
      const nothing = undefined;
      // ACT
      const actual = entryRefusal(entry);
      // ASSERT
      expect(actual).toBe(nothing);
    });

    it('permits balanced brackets in link text, which render as literal brackets', () => {
      // ARRANGE
      const entry = { text: 'Rules [draft]', target: 'rules.md', sortKey: 'rules.md' };
      const nothing = undefined;
      // ACT
      const actual = entryRefusal(entry);
      // ASSERT
      expect(actual).toBe(nothing);
    });
  });
});
