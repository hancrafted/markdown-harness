// Colocated unit test for the four named formats.
//
// Form only, and that means no calendar arithmetic: the datetime cases below
// deliberately include a date that does not exist and expect it to pass. A
// validator that reached for `Date` would fail it, and would be checking
// something this constraint does not claim.
//
// Moved here from `frontmatter-harness/lib/check/value-format.test.ts` when the
// grammars became a Package of their own, because a second Module now reads
// them. The datetime, uri and actor cases are the same cases; `kebab-case` is
// new, and it is the thickest block in the file on purpose — the corpus checks
// it thinly, so every edge design-ADR work settled is stated here.

import { describe, expect, it } from 'vitest';
import { matchesFormat } from './format-grammar.pure';

describe('named formats', () => {
  describe('success cases', () => {
    it.each([
      '2026-08-25T09:00:00Z',
      '2026-08-25T11:30:00z',
      '2026-08-25t09:00:00Z',
      '2026-08-25T09:00:00.123Z',
      '2026-08-25T09:00:00+02:00',
      '2026-08-25T09:00:00-05:30',
    ])('accepts %s as a datetime', (value) => {
      // ARRANGE
      const wellFormed = true;
      // ACT
      const actual = matchesFormat('datetime', value);
      // ASSERT
      expect(actual).toBe(wellFormed);
    });

    it.each(['docs/okf/SPEC-v0.2.md', 'https://example.invalid/survey', 's3://bucket/key.parquet', './relative'])(
      'accepts %s as a uri',
      (value) => {
        // ARRANGE
        const wellFormed = true;
        // ACT
        const actual = matchesFormat('uri', value);
        // ASSERT
        expect(actual).toBe(wellFormed);
      },
    );

    it.each(['human:hancrafted', 'process:nightly-export', 'claude-opus/5', 'human:okf-authors'])(
      'accepts %s as an actor',
      (value) => {
        // ARRANGE
        const wellFormed = true;
        // ACT
        const actual = matchesFormat('actor', value);
        // ASSERT
        expect(actual).toBe(wellFormed);
      },
    );

    it.each(['llm-wiki', 'corpus', 'a', '0006-slug', '2026', 'aikb', 'deep-module-boundary', 'v2-migration-notes'])(
      'accepts %s as kebab-case',
      (value) => {
        // ARRANGE
        const wellFormed = true;
        // ACT
        const actual = matchesFormat('kebab-case', value);
        // ASSERT
        expect(actual).toBe(wellFormed);
      },
    );
  });

  describe('failure cases', () => {
    it.each(['yesterday', '2026-08-24', '2026-08-25T09:00:00', '2026-08-25T09:00Z', '', '2026-08-25 09:00:00Z'])(
      'rejects %s as a datetime',
      (value) => {
        // ARRANGE
        const wellFormed = false;
        // ACT
        const actual = matchesFormat('datetime', value);
        // ASSERT
        expect(actual).toBe(wellFormed);
      },
    );

    it.each(['has a space in it', '', '   ', 's3://bucket/quarterly usage.parquet'])('rejects %s as a uri', (value) => {
      // ARRANGE
      const wellFormed = false;
      // ACT
      const actual = matchesFormat('uri', value);
      // ASSERT
      expect(actual).toBe(wellFormed);
    });

    it.each(['human/hancrafted', 'process/nightly', 'claude/opus/5', 'noslash', '/5', 'claude-opus/', 'human:', ''])(
      'rejects %s as an actor',
      (value) => {
        // ARRANGE
        const wellFormed = false;
        // ACT
        const actual = matchesFormat('actor', value);
        // ASSERT
        expect(actual).toBe(wellFormed);
      },
    );

    it.each([
      'LLM-Wiki',
      'llm_wiki',
      'llm wiki',
      '-llm-wiki',
      'llm-wiki-',
      'llm--wiki',
      'llm.wiki',
      'aikb__llm-wiki',
      '',
      '-',
    ])('rejects %s as kebab-case', (value) => {
      // ARRANGE
      const wellFormed = false;
      // ACT
      const actual = matchesFormat('kebab-case', value);
      // ASSERT
      expect(actual).toBe(wellFormed);
    });
  });

  describe('edge cases', () => {
    it('accepts a date that never happened, because form is all this checks', () => {
      // `2026-02-30` is not a day. It is well-FORMED, which is the whole of what
      // `format: datetime` claims, and the spec says so outright.
      // ARRANGE
      const wellFormed = true;
      // ACT
      const actual = matchesFormat('datetime', '2026-02-30T00:00:00Z');
      // ASSERT
      expect(actual).toBe(wellFormed);
    });

    it('rejects a month-13 date for want of a time and an offset, not for the month', () => {
      // The same reading from the other side: what fails here is the missing
      // time and offset. Adding them would make month 13 pass.
      // ARRANGE
      const bare = false;
      const stamped = true;
      // ACT
      const withoutTime = matchesFormat('datetime', '2026-13-45');
      const withTime = matchesFormat('datetime', '2026-13-45T00:00:00Z');
      // ASSERT
      expect(withoutTime).toBe(bare);
      expect(withTime).toBe(stamped);
    });

    it('reserves the two colon-form producers from the slash form', () => {
      // The rule that was previously discoverable only by reading a fixture.
      // ARRANGE
      const reserved = false;
      const ordinary = true;
      // ACT
      const asSlash = matchesFormat('actor', 'human/hancrafted');
      const asColon = matchesFormat('actor', 'human:hancrafted');
      const tool = matchesFormat('actor', 'human-review/2');
      // ASSERT
      expect(asSlash).toBe(reserved);
      expect(asColon).toBe(ordinary);
      expect(tool).toBe(ordinary);
    });

    it('accepts a digit in first position, because this repo would otherwise reject its own filenames', () => {
      // The Operator's opening proposal capped and cased the slug against his
      // own document, and was refused on measurement. This is the surviving
      // half: `docs/design-adr/0006-module-sections-and-module-wide-defaults.md`
      // opens with a digit run, so a kebab-case that rejected digits would
      // reject six of this repo's own design-ADRs.
      // ARRANGE
      const wellFormed = true;
      // ACT
      const digitLed = matchesFormat('kebab-case', '0006-module-sections');
      const digitsOnly = matchesFormat('kebab-case', '2026');
      // ASSERT
      expect(digitLed).toBe(wellFormed);
      expect(digitsOnly).toBe(wellFormed);
    });

    it('rejects a doubled hyphen, so the delimiter cannot be faked by the word shape', () => {
      // Stated because it is portable specification, and measured: 0 of 346
      // stems in the two target corpora carry a leading, trailing or doubled
      // hyphen, so nothing real is lost by refusing all three.
      // ARRANGE
      const malformed = false;
      // ACT
      const doubled = matchesFormat('kebab-case', 'llm--wiki');
      const leading = matchesFormat('kebab-case', '-wiki');
      const trailing = matchesFormat('kebab-case', 'wiki-');
      // ASSERT
      expect(doubled).toBe(malformed);
      expect(leading).toBe(malformed);
      expect(trailing).toBe(malformed);
    });

    it('rejects a name still carrying the segment delimiter, which is what keeps the two readings apart', () => {
      // `__` is the fixed split point wherever `segments:` is declared. A
      // segment's own value can therefore never contain one, and this is the
      // grammar-level half of that guarantee: a segment that somehow arrived
      // holding `__` fails its format rather than passing quietly.
      // ARRANGE
      const malformed = false;
      // ACT
      const actual = matchesFormat('kebab-case', 'aikb__llm-wiki');
      // ASSERT
      expect(actual).toBe(malformed);
    });
  });
});
