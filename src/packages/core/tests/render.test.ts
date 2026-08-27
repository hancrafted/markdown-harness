// The text rendering, asserted separately from the data.
//
// There is much less to assert than there was. The renderer no longer writes
// sentences — it serialises `expected` back to YAML with the same library that
// parsed the config — so what these tests pin is the LAYOUT and the invariants,
// not wording that somebody has to keep in step with the data.

import { describe, expect, it } from 'vitest';
import { check } from '../check.ts';
import { render } from '../render.ts';
import { FIXTURE_CONFIG, fixtureCorpus } from './fixture-corpus.ts';

const TEXT = render(check(FIXTURE_CONFIG, fixtureCorpus()));

/** The lines of one violation stanza, found by its heading. */
function stanza(heading: string): string {
  const lines = TEXT.split('\n');
  const start = lines.indexOf(heading);
  if (start === -1) throw new Error(`no stanza ${JSON.stringify(heading)} in:\n${TEXT}`);
  const end = lines.indexOf('', start);
  return lines.slice(start, end).join('\n');
}

describe('a stanza is the evidence and the config fragment, and nothing of ours', () => {
  it('shows the fragment verbatim, carrying its own reason', () => {
    // Every word after `Expected:` was typed by the Operator. Nothing here was
    // written by the harness, which is why there is no wording to review.
    expect(stanza('  slug  [pattern]')).toBe(
      [
        '  slug  [pattern]',
        '    Found:    "Legacy_Reference"',
        '    Expected: pattern: ^[a-z0-9]+(-[a-z0-9]+)*$',
        '              intent: Slugs are lowercase words joined by single hyphens',
      ].join('\n'),
    );
  });

  it('hands over the whole vocabulary, uncapped, with each value’s meaning', () => {
    // The highest-leverage stanza in the product, and it now costs no rendering
    // code at all: the meanings are part of the fragment, so pasting the
    // fragment brings them along.
    expect(stanza('  status  [allowed]')).toBe(
      [
        '  status  [allowed]',
        '    Found:    "retired"',
        '    Expected: allowed:',
        '                - value: draft',
        '                  intent: Written down, not yet trusted.',
        '                - value: stable',
        '                  intent: Safe to rely on.',
        '                - value: deprecated',
        '                  intent: Still here, no longer to be followed.',
      ].join('\n'),
    );
  });

  it('says what the rule DOES name when a key is unknown', () => {
    expect(stanza('  reviewedBy  [unknownKeys]')).toBe(
      [
        '  reviewedBy  [unknownKeys]',
        '    Found:    "nobody"',
        '    Expected: unknownKeys: forbidden',
        '              allowedKeys:',
        '                - type',
        '                - description',
        '                - status',
        '                - slug',
        '                - draft',
      ].join('\n'),
    );
  });

  it('gives a rule-level constraint the satisfied set as its evidence', () => {
    expect(stanza('  (whole file)  [exactlyOneOf]')).toBe(
      [
        '  (whole file)  [exactlyOneOf]',
        '    Found:    name and title',
        '    Expected: exactlyOneOf:',
        '                - name',
        '                - title',
      ].join('\n'),
    );
  });
});

describe('the file header names the rule and its reason once', () => {
  it('identifies the rule by ruleId, never by position', () => {
    expect(TEXT).toContain('  governed by index-files   fileName: index.md');
    expect(TEXT).toContain('  governed by reference   path: docs/reference/**/*.md');
    // Nothing anywhere refers to a rule by index. `rules[5]` was volatile:
    // inserting one rule renumbered every later one.
    expect(TEXT).not.toMatch(/rules\[\d+\]/);
  });

  it('prints the rule’s intent once per file rather than under every violation', () => {
    const reason = '  because: Reference pages are looked up by slug and say how far they can be trusted';

    expect(TEXT).toContain(reason);
    expect(TEXT.split('\n').filter((line) => line === reason)).toHaveLength(1);
  });

  it('names the Module only when more than one reported', () => {
    // `frontmatter-harness` is the only Module, so the key stays out of the way.
    // The condition is on the DATA, so it is already correct for Module 2.
    // A line that is ONLY the module name — not the `frontmatter` CONSTRAINT
    // stanza, which legitimately reads `(whole file)  [frontmatter]`.
    expect(TEXT.split('\n')).not.toContain('  [frontmatter]');
  });

  it('counts what the data does not store', () => {
    expect(TEXT).toContain('6 violations in 4 files. 13 files governed, 9 conforming.');
  });
});

describe('rendering rules that are specification, not taste', () => {
  it('introduces no non-ASCII of its own', () => {
    // Harness prose is ASCII; author prose is verbatim. So every non-ASCII
    // character in the output has to be traceable to the config the Operator
    // wrote — here, the section sign in an intent quoting OKF.
    const printable = /[ -~\n]/g;
    const foreign = [...new Set(TEXT.replace(printable, ''))];

    expect(foreign.length).toBeGreaterThan(0);
    for (const character of foreign) expect(FIXTURE_CONFIG).toContain(character);
  });

  it('is plain text, with no markdown for a glob to break', () => {
    // The report quotes globs full of `*` and intents containing `#`. A format
    // with no escapes cannot be injected, which is why this is not markdown.
    expect(TEXT).toContain('docs/reference/**/*.md');
    expect(TEXT).not.toContain('`');
    expect(TEXT).not.toMatch(/^#/m);
  });

  it('wraps nothing, so no line is broken at a guessed width', () => {
    const longest = Math.max(...TEXT.split('\n').map((line) => line.length));
    expect(longest).toBeGreaterThan(80);
  });
});
