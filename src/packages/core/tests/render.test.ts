// The soft layer, asserted separately from the data — because it is the layer we
// EXPECT to churn. A change to the report data is a contract change; a change to
// the wording asserted here is a corpus change, and these tests are what make
// the second cheap without making the first cheap too.

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

describe('the render honours what the data guarantees', () => {
  it('names the constraint and the field, and describes the pattern nowhere', () => {
    // The data has no field that could hold the regex. The render must not
    // reintroduce it by DESCRIBING it either — "lowercase words joined by single
    // hyphens" appears here only because the Operator wrote it as the mandatory
    // sibling `intent`, on the `Why:` line, in their own words.
    expect(stanza('  slug  [pattern]')).toBe(
      [
        '  slug  [pattern]',
        '    Found:  "Legacy_Reference"',
        '    Wanted: a value matching the pattern this rule sets for slug',
        '    Why:    Slugs are lowercase words joined by single hyphens',
      ].join('\n'),
    );
  });

  it('puts the pattern nowhere in the rendered text', () => {
    expect(TEXT).not.toContain('^[a-z0-9]');
    expect(TEXT).not.toContain('[a-z0-9]+(-');
  });

  it('hands over the whole vocabulary, uncapped, with each value’s meaning', () => {
    // This is the highest-leverage stanza in the product: it is fixable without
    // opening the config, because the vocabulary and the meanings arrived with
    // the failure.
    expect(stanza('  status  [allowed]')).toBe(
      [
        '  status  [allowed]',
        '    Found:  "retired"',
        '    Wanted: one of the 3 values this rule permits',
        '              draft       Written down, not yet trusted.',
        '              stable      Safe to rely on.',
        '              deprecated  Still here, no longer to be followed.',
        '    Why:    Reference pages are looked up by slug and say how far they can be trusted',
      ].join('\n'),
    );
  });

  it('gives a rule-level constraint the satisfied set as its evidence', () => {
    expect(stanza('  (whole file)  [exactlyOneOf]')).toBe(
      [
        '  (whole file)  [exactlyOneOf]',
        '    Found:  name and title',
        '    Wanted: exactly one of name, title',
        '    Why:    A skill is addressed by exactly one of its two names',
      ].join('\n'),
    );
  });

  it('shows which rule won, and how it selected', () => {
    expect(TEXT).toContain('  governed by frontmatter.rules[0]   fileName: index.md');
    expect(TEXT).toContain('  governed by frontmatter.rules[5]   path: docs/reference/**/*.md');
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
