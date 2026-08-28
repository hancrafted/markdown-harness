// The specification test for `query` — the steering answer, asserted as DATA.
//
// `query` never touches the corpus. Its entire input is a path string and the
// config, which is `git check-attr` semantics: the research names that prior art
// twice, and it is what lets an agent ask "what will be required of the file I
// am about to write?" before the file exists.
//
// Assertions are on the whole payload, because the whole payload is what an
// agent gets handed — and the payload answers exactly one question, so there is
// not much of it.

import { describe, expect, it } from 'vitest';
import { CONFIG_FAULT } from '../../contract/config-error.ts';
import type { QueryResult } from '../../contract/query-result.ts';
import { isConfigError } from '../../contract/response.ts';
import { query } from '../query.ts';
import { FIXTURE_CONFIG } from './fixture-corpus.ts';

/** Fails loudly rather than narrowing silently: a rejected config here is a broken slice, not a result. */
function asked(path: string): QueryResult {
  const result = query(FIXTURE_CONFIG, path);
  if (isConfigError(result)) throw new Error(`config rejected: ${JSON.stringify(result.faults)}`);
  return result;
}

describe('a config fault is result content here too', () => {
  it('rejects an empty rule list rather than answering “ungoverned”', () => {
    // The dangerous answer, and the reason this cannot be left to `check`:
    // `governance: 'invisible'` is a claim about every rule in the config, and a
    // broken config would make it for every path. An agent would be told,
    // truthfully-looking, that nothing is required of the file it is about to
    // write.
    expect(query('frontmatter:\n  rules: []\n', 'docs/research/survey.md')).toEqual({
      error: 'CONFIG_REJECTED',
      faults: [{ code: CONFIG_FAULT.EMPTY_RULE_LIST, location: 'frontmatter.rules' }],
    });
  });

  it('refuses a pattern with no sibling intent, which the config language has always called mandatory', () => {
    // Enforced from here rather than promised. A violation carries the config
    // fragment verbatim and therefore carries the regex, so the mandatory
    // sibling is the whole of what keeps the Kubernetes failure
    // (`"failed rule: {Rule}"`) away — which makes an unexplained pattern a
    // CONFIG error, because there is no layer of ours left to paper over it.
    const config = [
      'frontmatter:',
      '  rules:',
      '    - ruleId: slugs',
      '      path: [docs/**/*.md]',
      '      intent: Slugs identify a page',
      '      fields:',
      '        slug: { pattern: "^[a-z]+$" }',
      '',
    ].join('\n');

    expect(query(config, 'docs/anything.md')).toEqual({
      error: 'CONFIG_REJECTED',
      faults: [
        {
          code: CONFIG_FAULT.MISSING_PATTERN_INTENT,
          // Positional, because this is a place in a file the Operator has open
          // — not a reference to a rule that has to survive an insertion above
          // it. That is what `ruleId` is for, everywhere else.
          location: 'frontmatter.rules[0].fields.slug.pattern',
        },
      ],
    });
  });
});

describe('a steering answer is about a path, never about a file', () => {
  it('answers for a path that does not exist', () => {
    // `docs/research/new-thing.md` is not in `fixtures/` and never has been. The
    // broad research rule selects it, and the answer is the rule's payload in
    // the config's OWN vocabulary — `presence`, `maxLength`, `minItems`,
    // `itemMaxLength`, `allowed`, `anyOf`, each fragment verbatim, each carrying
    // whatever `intent` the Operator wrote beside it.
    //
    // Nothing here is a sentence of ours. Whether those key names are
    // self-explanatory enough for an agent to author a conformant file from
    // them, with no prose to fall back on, is the experiment this payload
    // exists to run.
    expect(asked('docs/research/new-thing.md')).toEqual({
      governance: 'governed',
      path: 'docs/research/new-thing.md',
      // `ruleId` and `intent`, and no `selector`. Which glob matched is the
      // Operator's question while debugging a config, and `--coverage` answers
      // it for every rule at once.
      rule: {
        ruleId: 'research',
        intent: 'Research is indexed, and an index entry copies the description',
      },
      requirements: {
        // A LIST sorted by address, not the config's mapping. design-ADR 0001
        // records that mapping key order is a serialization detail YAML 1.2.2
        // says not to depend on — the same reason a file's violations are
        // sorted by address rather than by config order.
        //
        // FLAT: the address sits beside the demands rather than above them,
        // because the reader is an agent assembling one field at a time.
        fields: [
          { field: 'description', presence: 'required', maxLength: 200 },
          { field: 'tags', minItems: 1, maxItems: 5, itemMaxLength: 20 },
          {
            field: 'type',
            presence: 'required',
            allowed: [{ value: 'research', intent: 'Findings gathered to settle a question, with sources.' }],
          },
        ],
        // Present because this rule writes it. A rule that does not write it
        // has no `unknownKeys` key here either: the answer states what the
        // Operator stated, and `allowed` is the language's default rather than
        // their word.
        unknownKeys: 'allowed',
        crossField: { anyOf: ['sources', 'generated'] },
      },
    });
  });

  it('gives the path to the first matching rule, and says nothing about the losers', () => {
    // First match wins (tenet 5) and every losing rule is SILENT. The reference
    // rule selects `docs/reference/index.md` and will never see it, because the
    // reserved-filename rule sits above it — and this payload does not mention
    // that, by design.
    //
    // "Why isn't my rule applying?" is the Operator's question, and the check
    // report's `coverage` answers it for every rule at once. Answering it here
    // as well would put Operator content on a payload whose reader is the
    // Contributor's agent, which can act on none of it.
    expect(asked('docs/reference/index.md')).toEqual({
      governance: 'governed',
      path: 'docs/reference/index.md',
      rule: {
        ruleId: 'index-files',
        intent: 'OKF §8 (Index files): an index enumerates a directory, and carries no frontmatter',
      },
      // The whole of the rule. `frontmatter: forbidden` excludes every payload
      // key, so there is nothing else this rule can be asking for.
      requirements: { frontmatter: 'forbidden' },
    });
  });

  it('names invisibility for a path an exclusion removed, rather than leaving a null to interpret', () => {
    // The most surprising thing `markdown-harness` can do, so the payload SAYS
    // it. This is not "no constraints" — it is INVISIBLE (tenet 6): nothing will
    // ever be reported about a file here, by any rule, and a clean run looks
    // exactly the same as a file that does not exist. `governedBy: null` left
    // every reader to work that out.
    //
    // `docs/research/vendor/**` is in the research rule's own `excludeFiles`,
    // and no rule after it matches. Which glob fired is not said here; it is a
    // config question, and `--coverage` counts it against the rule that
    // declined.
    expect(asked('docs/research/vendor/new.md')).toEqual({
      governance: 'invisible',
      path: 'docs/research/vendor/new.md',
    });
  });

  it('answers identically for a path that does exist', () => {
    // The whole of `git check-attr` semantics, in one assertion: `survey.md` is
    // a real file with real frontmatter, and none of that reaches the answer.
    // Resolution is path-only, so a steering answer cannot depend on what is
    // already written — which is what makes it usable BEFORE anything is.
    const invented = asked('docs/research/new-thing.md');
    const real = asked('docs/research/survey.md');

    expect({ ...real, path: '(path)' }).toEqual({ ...invented, path: '(path)' });
  });
});
