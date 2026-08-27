// The specification test for `query` — the steering answer, asserted as DATA.
//
// `query` never touches the corpus. Its entire input is a path string and the
// config, which is `git check-attr` semantics: the research names that prior art
// twice, and it is what lets an agent ask "what will be required of the file I
// am about to write?" before the file exists.
//
// Assertions are on the whole payload, because the whole payload is what an
// agent gets handed.

import { describe, expect, it } from 'vitest';
import type { SteeringAnswer } from '../../contract/steering-answer.ts';
import { query } from '../query.ts';
import { FIXTURE_CONFIG } from './fixture-corpus.ts';

/** Fails loudly rather than narrowing silently: a rejected config here is a broken slice, not a result. */
function asked(path: string): SteeringAnswer {
  const answer = query(FIXTURE_CONFIG, path);
  if (answer.report !== 'steering') throw new Error(`config rejected: ${JSON.stringify(answer.faults)}`);
  return answer;
}

describe('a path is a folder unless its last segment carries an extension', () => {
  // Two rules, directory-shaped, the broad one first — the config shape that
  // makes a folder query mean anything. `docs/**` governs files as well as
  // folders, so nothing is traded away to get this.
  const CONFIG = [
    'frontmatter:',
    '  rules:',
    '    - ruleId: everything',
    '      path: [docs/**]',
    '      intent: Everything under docs/ says what it is',
    '      fields:',
    '        type: { presence: required }',
    '    - ruleId: research',
    '      path: [docs/research/**]',
    '      intent: Research is indexed, and an index entry copies the description',
    '      fields:',
    '        description: { presence: required }',
    '',
  ].join('\n');

  function asked(path: string) {
    const answer = query(CONFIG, path);
    if (answer.report !== 'steering') throw new Error('config rejected');
    return answer;
  }

  it('resolves a folder by the same first match, and says it read a folder', () => {
    // First match wins, exactly as for a file: `everything` sits above
    // `research` and takes it. No second resolution semantics.
    const answer = asked('docs/research');

    expect(answer.pathKind).toBe('folder');
    // Normalised to a trailing slash, and echoed that way. Not cosmetic:
    // `docs/research` does not match `docs/research/**` while `docs/research/`
    // does, so without this the MOST SPECIFIC rule for a folder is not even a
    // candidate — and a config whose only rule is `docs/research/**` would
    // answer `governs: null` about a folder whose files it plainly governs.
    expect(answer.path).toBe('docs/research/');
    expect(answer.governs?.rule.ruleId).toBe('everything');
    expect(answer.shadowed.map((entry) => entry.ruleId)).toEqual(['research']);
  });

  it('reads both spellings of a folder as the same folder', () => {
    expect(asked('docs/research/')).toEqual(asked('docs/research'));
  });

  it('reads a last segment with an extension as a file, and leaves it alone', () => {
    const answer = asked('docs/research/new-thing.md');

    expect(answer.pathKind).toBe('file');
    expect(answer.path).toBe('docs/research/new-thing.md');
  });

  it('reads an extensionless last segment as a folder, because it cannot look', () => {
    // `query` never touches disk — that is the `git check-attr` seam — so a
    // folder and an extensionless file are indistinguishable and the last
    // segment is all there is to go on. `README` is read as a folder.
    expect(asked('docs/research/README').path).toBe('docs/research/README/');
  });
});

describe('a config fault is report content here too', () => {
  it('rejects an empty rule list rather than answering “ungoverned”', () => {
    // The dangerous answer, and the reason this cannot be left to `check`:
    // `governs: null` means INVISIBLE, and a broken config would produce it for
    // every path. An agent would be told, truthfully-looking, that nothing is
    // required of the file it is about to write.
    expect(query('frontmatter:\n  rules: []\n', 'docs/research/survey.md')).toEqual({
      report: 'config-rejected',
      faults: [{ code: 'empty-rule-list', at: 'frontmatter.rules' }],
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
      report: 'steering',
      format: 1,
      path: 'docs/research/new-thing.md',
      pathKind: 'file',
      governs: {
        rule: {
          ruleId: 'research',
          selector: { path: ['docs/research/**/*.md'] },
          intent: 'Research is indexed, and an index entry copies the description',
        },
        requires: {
          // A LIST sorted by address, not the config's mapping. design-ADR 0001
          // records that mapping key order is a serialization detail YAML 1.2.2
          // says not to depend on — the same reason a file's violations are
          // sorted by address rather than by config order.
          fields: [
            { field: 'description', constraints: { presence: 'required', maxLength: 200 } },
            { field: 'tags', constraints: { minItems: 1, maxItems: 5, itemMaxLength: 20 } },
            {
              field: 'type',
              constraints: {
                presence: 'required',
                allowed: [{ value: 'research', intent: 'Findings gathered to settle a question, with sources.' }],
              },
            },
          ],
          // Present because this rule writes it. A rule that does not write it
          // has no `unknownKeys` key here either: the answer states what the
          // Operator stated, and `allowed` is the language's default rather than
          // their word.
          unknownKeys: 'allowed',
          anyOf: ['sources', 'generated'],
        },
      },
      shadowed: [],
      excluded: [],
    });
  });

  it('names the rules that also select the path and lost', () => {
    // "Why isn't my rule applying?", asked from the other side. The reference
    // rule selects `docs/reference/index.md` and will never see it, because the
    // reserved-filename rule sits above it — the stated cost of tenet 5, made
    // visible for one path.
    //
    // Named ONLY. Its constraints are deliberately absent: nothing merges, and
    // listing what a silent rule would have wanted would read as though
    // something did.
    expect(asked('docs/reference/index.md')).toEqual({
      report: 'steering',
      format: 1,
      path: 'docs/reference/index.md',
      pathKind: 'file',
      governs: {
        rule: {
          ruleId: 'index-files',
          // Sugar unexpanded: the Operator wrote `fileName`, so the answer says
          // `fileName`, not the `**/index.md` it desugars to.
          selector: { fileName: 'index.md' },
          intent: 'OKF §8 (Index files): an index enumerates a directory, and carries no frontmatter',
        },
        // The whole of the rule. `frontmatter: forbidden` excludes every payload
        // key, so there is nothing else this rule can be asking for.
        requires: { frontmatter: 'forbidden' },
      },
      // Named and located, NOT explained. A rule's `intent` is carried in a
      // report so the Contributor — who never opens the config — gets the
      // reason. For a rule that does not govern here, the Contributor has no
      // business with the reason, and carrying it is actively dangerous: a
      // sentence in the config author's voice, describing constraints that do
      // not apply, handed to an agent that may well satisfy them. That is the
      // merge tenet 5 forbids, reintroduced at the steering surface. The
      // Operator can read the intent in the config, being the one role that
      // opens it.
      shadowed: [{ ruleId: 'reference', selector: { path: ['docs/reference/**/*.md'] } }],
      excluded: [],
    });
  });

  it('says which glob excluded a path nothing governs', () => {
    // The most surprising thing `markdown-harness` can do, and the answer to it.
    // `governs: null` is not "no constraints" — it is INVISIBLE (tenet 6):
    // nothing will ever be reported about a file here, by any rule, and a clean
    // run looks exactly the same as a file that does not exist.
    //
    // `excludedBy` is what makes that actionable. It names the line to delete,
    // in the config's own words, rather than saying that some exclusion
    // somewhere fired.
    expect(asked('docs/research/vendor/new.md')).toEqual({
      report: 'steering',
      format: 1,
      path: 'docs/research/vendor/new.md',
      pathKind: 'file',
      governs: null,
      // Exclusion is answered BEFORE a rule can win, so it is not shadowing:
      // no rule took this path, the research rule declined it.
      shadowed: [],
      excluded: [
        {
          rule: { ruleId: 'research', selector: { path: ['docs/research/**/*.md'] } },
          excludedBy: ['docs/research/vendor/**'],
        },
      ],
    });
  });

  it('reports an exclusion that fired even when deleting it would change nothing', () => {
    // `excludedBy` says what FIRED. It is not a promise that removing it makes
    // the rule apply, and this is the case that proves the difference:
    // exclusion is answered before ordering, so `research` reports `excluded`
    // although `everything` sits above it and would have taken the path anyway.
    //
    // The payload still tells the two apart, without the reader opening the
    // config: `governs` names a rule that is not this one.
    const CONFIG = [
      'frontmatter:',
      '  rules:',
      '    - ruleId: everything',
      '      path: [docs/**/*.md]',
      '      intent: Everything under docs/ says what it is',
      '      fields:',
      '        type: { presence: required }',
      '    - ruleId: research',
      '      path: [docs/research/**/*.md]',
      '      excludeFiles: [docs/research/vendor/**]',
      '      intent: Research is indexed, and an index entry copies the description',
      '      fields:',
      '        description: { presence: required }',
      '',
    ].join('\n');

    const answer = query(CONFIG, 'docs/research/vendor/new.md');
    if (answer.report !== 'steering') throw new Error('config rejected');

    expect(answer.governs?.rule.ruleId).toBe('everything');
    expect(answer.shadowed).toEqual([]);
    expect(answer.excluded).toEqual([
      {
        rule: { ruleId: 'research', selector: { path: ['docs/research/**/*.md'] } },
        excludedBy: ['docs/research/vendor/**'],
      },
    ]);
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
