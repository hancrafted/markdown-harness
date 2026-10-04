// The guard on the declared Module set, and the one compile-time guarantee this
// architecture traded away.
//
// A whole-config interface could not declare a key twice: `frontmatter?:` twice
// in one `interface` is `TS2300`. The Module set is a list, so two descriptors
// both claiming `'frontmatter'` compile clean and the second one's section would
// be silently unreachable through `sectionFor` — a Module that registered and
// governs nothing, with nothing anywhere saying so.
//
// The replacement is this file. It is written as a two-sided canary on purpose:
// the failure case plants the duplicate the check exists to catch, so the check
// re-proves itself on every run rather than passing over a set that happens to
// be fine. A one-sided version would pass just as happily with `duplicateKeys`
// returning `[]` unconditionally.
//
// `duplicateKeys` is hand-written here rather than imported from a production
// file, because nothing in production would call it: the declared set is a
// constant, so the only moment a duplicate can appear is the moment someone
// edits this repository. A `.pure.ts` nothing calls is one more check that can
// never go red.

import { describe, expect, it } from 'vitest';
import { bodyStructureModule } from '../../body-structure-harness/module.ts';
import type { ModuleDescriptor } from '../../config-contract/index.ts';
import { loadConfig } from '../../foundation/load-config.ts';
import { MODULE_SET } from '../module-set.ts';

/** Every key claimed by more than one descriptor, in the order they were claimed. */
function duplicateKeys(modules: readonly ModuleDescriptor<unknown>[]): readonly string[] {
  const seen = new Set<string>();
  const repeated: string[] = [];
  for (const module of modules) {
    if (seen.has(module.key)) repeated.push(module.key);
    seen.add(module.key);
  }
  return repeated;
}

/** A descriptor that validates nothing, standing in for a Module by its key alone. */
function descriptorFor(key: string): ModuleDescriptor<unknown> {
  return {
    key,
    validateSection: () => ({ faults: [] }),
    query: () => undefined,
    audit: () => undefined,
    assess: () => undefined,
    check: () => undefined,
  };
}

/** What one descriptor's audit answered, in the union every declared Module's answer falls in. */
type AuditAnswer = ReturnType<(typeof MODULE_SET)[number]['audit']>;

/**
 * What one audit answered: the file it refused over, or how many rows it
 * tallied and how many times its `log-files` row won. The row count is what
 * tells an empty tally apart from a refusal, which has no rows to count.
 */
function auditAnswerOf(audit: AuditAnswer): { rows: number; wins: number | undefined } | { refused: string } {
  if (!('rules' in audit)) return { refused: audit.path };
  return { rows: audit.rules.length, wins: audit.rules.find((row) => row.rule.ruleId === 'log-files')?.won };
}

describe('the declared Module set', () => {
  describe('success cases', () => {
    it('reaches every read verb through each declared descriptor', () => {
      // ARRANGE
      const configPath = 'fixtures/conformance/frontmatter/valid-test-config.yaml';
      const root = 'fixtures/conformance/frontmatter';
      const stalePath = 'docs/freshness/stale.md';
      const logPath = 'docs/log.md';
      const instant = '2026-12-01T00:00:00Z';
      // The tier's config writes only a `frontmatter:` section, so the second
      // Module is asked every verb and answers each with nothing it governs:
      // an audit with no rows, which is not a refusal (design-ADR 0010).
      const frontmatterRules = 10;
      const expected = [
        {
          key: 'frontmatter',
          queryRule: 'log-files',
          audit: { rows: frontmatterRules, wins: 1 },
          assessment: 'stale',
          check: 'checked',
        },
        {
          key: 'body-structure',
          queryRule: undefined,
          audit: { rows: 0, wins: undefined },
          assessment: undefined,
          check: 'checked',
        },
      ];
      const loaded = loadConfig(configPath, MODULE_SET);
      if (loaded.config === undefined)
        throw new Error('the conformance config must load for this suite to mean anything');
      const config = loaded.config;
      // ACT
      const actual = MODULE_SET.map((module) => {
        const claims = [module.query(logPath, config) ?? []].flat();
        return {
          key: module.key,
          queryRule: claims[0]?.rule.ruleId,
          audit: auditAnswerOf(module.audit(root, [logPath], config)),
          assessment: module.assess({ root, path: stalePath }, instant, config)?.state,
          check: module.check(root, [logPath], config).kind,
        };
      });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('claims each top-level key once', () => {
      // ARRANGE
      const none: readonly string[] = [];
      // ACT
      const actual = duplicateKeys(MODULE_SET);
      // ASSERT
      expect(actual).toEqual(none);
    });

    it('declares at least one Module, so the key set it derives is not empty', () => {
      // A recognised key set computed from an empty list would reject every
      // config ever written, and every assertion above would still pass.
      // ARRANGE
      const atLeastOne = 0;
      // ACT
      const actual = MODULE_SET.map((module) => module.key);
      // ASSERT
      expect(actual.length).toBeGreaterThan(atLeastOne);
    });
  });

  describe('failure cases', () => {
    it('keeps an audit that refused apart from one that tallied nothing', () => {
      // The planted refusal. The body-structure tier's config reaches every
      // file under `docs/`, so a corpus naming one that does not exist makes
      // the second Module refuse its audit rather than tally it. Read through
      // the same observation the row above uses, a refusal must not come out
      // looking like the empty answer that row expects.
      // ARRANGE
      const root = 'fixtures/conformance/body-structure';
      const absent = 'docs/research/absent.md';
      const expected = { refused: `${root}/${absent}` };
      const loaded = loadConfig(`${root}/valid-test-config.yaml`, MODULE_SET);
      if (loaded.config === undefined)
        throw new Error('the body-structure tier config must load for this case to mean anything');
      const config = loaded.config;
      // ACT
      const actual = auditAnswerOf(bodyStructureModule.audit(root, [absent], config));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('names the key two descriptors both claim', () => {
      // The planted violation. Both descriptors compile, which is exactly the
      // guarantee that was traded away.
      // ARRANGE
      const contested = 'frontmatter';
      const expected = [contested];
      const collided = [descriptorFor(contested), descriptorFor('indexes'), descriptorFor(contested)];
      // ACT
      const actual = duplicateKeys(collided);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('finds nothing to report in a set of distinct keys', () => {
      // The clean half of the canary: the check must pass a set it should pass,
      // or a `duplicateKeys` that returned every key would satisfy the case
      // above and prove nothing.
      // ARRANGE
      const none: readonly string[] = [];
      const distinct = [descriptorFor('frontmatter'), descriptorFor('indexes'), descriptorFor('drift')];
      // ACT
      const actual = duplicateKeys(distinct);
      // ASSERT
      expect(actual).toEqual(none);
    });
  });
});
