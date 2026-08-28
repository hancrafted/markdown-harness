// The Module asked the other question, in isolation: a rule payload in, what it
// would ask of any path it governs out. No files, no globs, no YAML.
//
// The seam matters more than it looks. `core/tests/query.test.ts` reaches this
// only through resolution, so it can only ever exercise the payloads the fixture
// config happens to contain. Every claim about WHICH KEYS TRAVEL is reachable
// here and nowhere else.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../contract/config.ts';
import { requirements } from '../requirements.ts';

describe('a rule that forbids frontmatter has nothing else to say', () => {
  it('hands back the whole payload, which is one key', () => {
    const rule: FrontmatterRule = {
      ruleId: 'index-files',
      fileName: 'index.md',
      intent: 'OKF §8 (Index files): an index enumerates a directory, and carries no frontmatter',
      frontmatter: 'forbidden',
    };

    expect(requirements(rule)).toEqual({ frontmatter: 'forbidden' });
  });
});

describe('what the Operator wrote travels; what they did not is absent', () => {
  it('omits every unwritten key rather than filling in the language’s defaults', () => {
    // The sharp end of the verbatim principle, and only reachable here: the
    // fixture config writes `unknownKeys: allowed` on the research rule, so
    // resolution can never show what its ABSENCE looks like.
    //
    // The config language defaults an absent `unknownKeys` to `allowed`. That is
    // the LANGUAGE's word, not the Operator's, and an answer that writes it has
    // put a word in their mouth. `undefined` would be no better: it survives
    // neither JSON nor a port.
    const rule: FrontmatterRule = {
      ruleId: 'plain',
      path: ['docs/plain/**/*.md'],
      intent: 'Everything under plain/ still has to say what it is',
      fields: { type: { presence: 'required' } },
    };

    expect(Object.keys(requirements(rule))).toEqual(['fields']);
  });

  it('carries each written key exactly once, with the Operator’s own value', () => {
    const rule: FrontmatterRule = {
      ruleId: 'workflows',
      path: ['docs/workflows/**/*.md'],
      intent: 'A workflow names itself and says when to reach for it',
      unknownKeys: 'forbidden',
      allOf: ['title', 'description'],
      fields: { title: { minLength: 3, maxLength: 80 } },
    };

    expect(requirements(rule)).toEqual({
      // FLAT: the address sits beside the demands rather than above them.
      fields: [{ field: 'title', minLength: 3, maxLength: 80 }],
      unknownKeys: 'forbidden',
      // Grouped, so the three set-constraints read as one concern rather than as
      // three siblings of `fields`.
      crossField: { allOf: ['title', 'description'] },
    });
  });

  it('keeps `fields` even when the rule names no address, because `fields` is ours', () => {
    // The one exception to the rule above, and it is a real distinction rather
    // than an inconsistency. `unknownKeys` and the cross-field keys are the
    // Operator's VALUES travelling through, so absence is meaningful. `fields`
    // is a list WE build — sorted, and flattened with the address — out of
    // fragments that are theirs. One shape wins for what we compute.
    const rule: FrontmatterRule = {
      ruleId: 'skills',
      path: ['docs/skills/**/SKILL.md'],
      intent: 'A skill is addressed by exactly one of its two names',
      exactlyOneOf: ['name', 'title'],
    };

    expect(requirements(rule)).toEqual({ fields: [], crossField: { exactlyOneOf: ['name', 'title'] } });
  });
});

describe('addresses arrive in a deterministic order, whatever the config did', () => {
  it('sorts by address rather than by the mapping the Operator typed', () => {
    // design-ADR 0001 records that the config language does not constrain key
    // order, quoting YAML 1.2.2 that mapping key order is "a serialization
    // detail" that "should not be used". Written here in a deliberately
    // scrambled order, so the assertion cannot pass by echoing the input.
    const rule: FrontmatterRule = {
      ruleId: 'provenance-exemplar',
      path: ['docs/research/provenance.md'],
      intent: 'The one document that records its own provenance in full',
      fields: {
        'verified[].by': { format: 'actor' },
        type: { presence: 'required' },
        'sources[].resource': { presence: 'required', format: 'uri' },
        sources: { minItems: 1 },
        'generated.at': { presence: 'required', format: 'datetime' },
      },
    };

    const requirement = requirements(rule);

    // Addressing a list entry and addressing the list itself are different
    // addresses, and they sort as the different strings they are.
    expect(requirement.fields?.map((entry) => entry.field)).toEqual([
      'generated.at',
      'sources',
      'sources[].resource',
      'type',
      'verified[].by',
    ]);
    // Constraints are untouched on the way through — including the nested
    // shapes, which is what "verbatim" has to mean to be worth anything.
    expect(requirement.fields?.[2]).toEqual({
      field: 'sources[].resource',
      presence: 'required',
      format: 'uri',
    });
  });
});
