// Colocated unit test for the corpus verdict composed across Modules.
//
// Every fixture below names its Modules `zulu` and `alpha`, in that order and
// never alphabetically. Two properties ride on that choice: a composition that
// wrote a Module name as a literal cannot pass at all, and one that sorted the
// blocks would put `alpha` first.

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { ModuleDescriptor } from '../../../config-contract/index.ts';
import { loadConfig } from '../../../foundation/load-config.ts';
import type { ModuleCheck } from '../../../response-contract/index.ts';
import { corpusVerdict } from './corpus-verdict.pure';

/** One thing wrong, written out once so the fixtures stay about the nesting. */
const MISSING_TYPE = {
  field: 'type',
  violation: 'MISSING_REQUIRED_FIELD',
  requirement: { presence: 'required' },
} as const;

/** Where the one config written by hand below is planted. */
const scratch = mkdtempSync(join(tmpdir(), 'mh-corpus-verdict-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** The section a stand-in Module recognises: one sentence, and nothing else. */
interface StandInSection {
  intent: string;
}

/**
 * A stand-in Module, hand-written here rather than mocked.
 *
 * Two are needed and the declared set holds one, so the second Module this
 * ticket exists for has to be written out. It is kept to the smallest thing the
 * real loader accepts: one key, and a section that is one sentence.
 */
function moduleNamed(key: string): ModuleDescriptor<StandInSection> {
  return {
    key,
    validateSection(raw: unknown) {
      const intent = (raw as { intent?: unknown } | null)?.intent;
      if (typeof intent !== 'string') return { faults: [{ code: 'CONFIG_INVALID_VALUE', location: `${key}.intent` }] };
      return { section: { intent }, faults: [] };
    },
  };
}

/**
 * What a stand-in Module answers about a corpus it governs whole.
 *
 * The intent comes out of the loaded SECTION, so a section reaching the wrong
 * Module shows up as the wrong sentence rather than as nothing at all.
 */
function checkOf(corpus: readonly string[], section: StandInSection | undefined): ModuleCheck {
  if (section === undefined) return { governed: [], files: [] };
  return {
    governed: corpus,
    files: corpus.map((path) => ({
      path,
      ruleId: 'the-rule',
      ruleIntent: section.intent,
      violations: [MISSING_TYPE],
    })),
  };
}

describe('corpusVerdict', () => {
  describe('success cases', () => {
    it("nests a file's findings under the Module that made them, in declared order", () => {
      // ARRANGE
      const corpus = ['docs/a.md'];
      const zulu = {
        module: 'zulu',
        check: {
          governed: ['docs/a.md'],
          files: [
            { path: 'docs/a.md', ruleId: 'z-rule', ruleIntent: 'Zulu asks for a type', violations: [MISSING_TYPE] },
          ],
        },
      };
      const alpha = {
        module: 'alpha',
        check: {
          governed: ['docs/a.md'],
          files: [
            { path: 'docs/a.md', ruleId: 'a-rule', ruleIntent: 'Alpha asks for a type', violations: [MISSING_TYPE] },
          ],
        },
      };
      const expected = [
        {
          path: 'docs/a.md',
          modules: [
            { module: 'zulu', ruleId: 'z-rule', ruleIntent: 'Zulu asks for a type', violations: [MISSING_TYPE] },
            { module: 'alpha', ruleId: 'a-rule', ruleIntent: 'Alpha asks for a type', violations: [MISSING_TYPE] },
          ],
        },
      ];
      // ACT
      const actual = corpusVerdict(corpus, [zulu, alpha]);
      // ASSERT
      expect(actual.files).toEqual(expected);
    });

    it('reports the blocks in declared Module order, whatever order the config wrote the keys in', () => {
      // The one assertion that spans both halves of the claim. The config below
      // writes `alpha:` above `zulu:`, the declared set below names `zulu`
      // first, and each Module's finding is read out of its own section — so a
      // response following the document rather than the declared set would come
      // back the other way round and say so.
      //
      // YAML mappings carry no guaranteed key order, which is the whole reason
      // the Rules are a list; the Module blocks are ordered on the same terms.
      // ARRANGE
      const config = join(scratch, 'reversed-keys.yaml');
      writeFileSync(config, 'alpha:\n  intent: Alpha asks for a type\nzulu:\n  intent: Zulu asks for a type\n');
      const declared = [moduleNamed('zulu'), moduleNamed('alpha')];
      const corpus = ['docs/a.md'];
      const expected = [
        { module: 'zulu', ruleIntent: 'Zulu asks for a type' },
        { module: 'alpha', ruleIntent: 'Alpha asks for a type' },
      ];
      // ACT
      const loaded = loadConfig(config, declared);
      const answers = declared.map((descriptor) => ({
        module: descriptor.key,
        check: checkOf(corpus, loaded.config?.sectionFor(descriptor)),
      }));
      const actual = corpusVerdict(corpus, answers).files.flatMap((file) =>
        file.modules.map((block) => ({ module: block.module, ruleIntent: block.ruleIntent })),
      );
      // ASSERT
      expect(loaded.faults).toEqual([]);
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('lists only the Modules with a finding, not every Module that governed the file', () => {
      // An agent about to edit the document can act on nothing in a block that
      // says nothing is wrong. The steering command is where every governing
      // Module is listed.
      // ARRANGE
      const corpus = ['docs/a.md'];
      const zulu = {
        module: 'zulu',
        check: {
          governed: ['docs/a.md'],
          files: [
            { path: 'docs/a.md', ruleId: 'z-rule', ruleIntent: 'Zulu asks for a type', violations: [MISSING_TYPE] },
          ],
        },
      };
      const quiet = { module: 'alpha', check: { governed: ['docs/a.md'], files: [] } };
      const expected = ['zulu'];
      // ACT
      const actual = corpusVerdict(corpus, [zulu, quiet]).files.flatMap((file) =>
        file.modules.map((block) => block.module),
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps walker order across Modules governing different halves of the corpus', () => {
      // `zulu` answers about the second file and `alpha` about the first, so a
      // composition ordering by the Modules it asked would report them
      // backwards. The corpus is the only thing that knows the walk's order.
      // ARRANGE
      const corpus = ['docs/a.md', 'docs/b.md'];
      const zulu = {
        module: 'zulu',
        check: {
          governed: ['docs/b.md'],
          files: [
            { path: 'docs/b.md', ruleId: 'z-rule', ruleIntent: 'Zulu asks for a type', violations: [MISSING_TYPE] },
          ],
        },
      };
      const alpha = {
        module: 'alpha',
        check: {
          governed: ['docs/a.md'],
          files: [
            { path: 'docs/a.md', ruleId: 'a-rule', ruleIntent: 'Alpha asks for a type', violations: [MISSING_TYPE] },
          ],
        },
      };
      const expected = ['docs/a.md', 'docs/b.md'];
      // ACT
      const actual = corpusVerdict(corpus, [zulu, alpha]).files.map((file) => file.path);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('counts a file two Modules govern once, and both its findings', () => {
      // `governedFiles` is a union rather than a sum: adding the two Modules'
      // own tallies would report two governed files over a corpus of one. The
      // numbers are written out by hand rather than derived from the fixture,
      // so the fixture is deliberately lopsided — one file, two Modules, two
      // findings, and three different numbers to get wrong.
      // ARRANGE
      const corpus = ['docs/a.md'];
      const zulu = {
        module: 'zulu',
        check: {
          governed: ['docs/a.md'],
          files: [
            { path: 'docs/a.md', ruleId: 'z-rule', ruleIntent: 'Zulu asks for a type', violations: [MISSING_TYPE] },
          ],
        },
      };
      const alpha = {
        module: 'alpha',
        check: {
          governed: ['docs/a.md'],
          files: [
            { path: 'docs/a.md', ruleId: 'a-rule', ruleIntent: 'Alpha asks for a type', violations: [MISSING_TYPE] },
          ],
        },
      };
      const expected = { governedFiles: 1, invalidFiles: 1, totalViolations: 2 };
      // ACT
      const actual = corpusVerdict(corpus, [zulu, alpha]).summary;
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('answers a corpus no Module governs as nothing governed and nothing wrong', () => {
      // Reachable whenever a config names one Module and not another: the
      // second governs nothing here, and a Module governing nothing is not an
      // error.
      // ARRANGE
      const corpus = ['docs/a.md'];
      const silent = { module: 'zulu', check: { governed: [], files: [] } };
      const expected = { summary: { governedFiles: 0, invalidFiles: 0, totalViolations: 0 }, files: [] };
      // ACT
      const actual = corpusVerdict(corpus, [silent]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
