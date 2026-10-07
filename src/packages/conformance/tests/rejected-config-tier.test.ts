// The `rejected-config` tier's runner, under `fixtures/conformance/rejected-config/`.
//
// The other tier proves what the harness reports about DOCUMENTS. A rejected
// config produces no document, so until this tier existed the config faults an
// Operator can actually hit were proven by this repository's own unit tests and
// travelled to no reimplementation: a declared specification that specified half
// the files inside it.
//
// A case here is a DIRECTORY — config bytes under the adopter's own config
// filename, plus one expectation freezing the whole config-error response
// verbatim with the fault list ORDERED. Locations inside an expectation are
// case-relative and this runner supplies the prefix, so moving the tier stays a
// rename rather than a rewrite of every case.
//
// Each case is ALSO asked at the process boundary (#231): the compiled `mh` run
// inside the case directory with no flag, as a human runs it, through the same
// comparison `npm run conformance --path rejected-config/<case>` prints. Inside the
// case the config is named by its bare file name, so the case-relative payload
// compares with no prefix at all, and a case that freezes the whole envelope
// freezes it byte for byte. That comparison spawns `dist/`, so build first
// (trap 9 in docs/agents/verification.md).
//
// A case directory is named `<module>__<behaviour>`, or `file__<behaviour>` for
// a fault outside every Module section, so the directory listing says which
// section a fault sits in and what it refuses.
//
// Three properties are asserted over the fault catalog. COVERAGE: every member
// is reached by at least one case, read off what the loader actually emitted.
// CLOSURE: no expectation names a code outside the declared list, read off the
// frozen files. And a COMPILE-TIME PIN, in `../config-fault-catalog.ts`, which
// no test here can exercise — vitest transforms types away without reading them,
// so `tsc --noEmit` is the only thing that holds it.
//
// ARCH-002 §3.1 makes a changed expectation a CONTRACT CHANGE rather than a test
// fix. A failure here is answered by reading the case's config bytes and
// deciding which of the two is wrong — never by editing the frozen file to agree
// with the code.

import { beforeAll, describe, expect, it } from 'vitest';
import { MODULE_SET } from '../../cli/module-set.ts';
import { loadConfig } from '../../foundation/load-config.ts';
import { configError } from '../../response-contract/index.ts';
import { casesIn } from '../case-corpus.ts';
import { DECLARED_CODES } from '../config-fault-catalog.ts';
import { coverageAndClosure } from '../coverage-closure.ts';
import type { RejectedCaseReport } from '../rejected-config-case.ts';
import {
  compareRejectedCase,
  configPathOf,
  EXPECTED_CHECK_RESPONSE,
  expectedRejectionOf,
  rejectedCasePath,
  rejectedConfigCases,
} from '../rejected-config-case.ts';
import { tierForRunner } from '../tier-record.ts';

const TIER = tierForRunner(import.meta.url);
if (TIER.caseKind !== 'rejected-config') throw new Error(`${TIER.name} is not a rejected-config tier`);
const cases = rejectedConfigCases(TIER);
/** The one case that freezes the whole `check` envelope beside its payload. */
const CONFIG_NOT_FOUND = 'file__config-not-found';

/** The cases whose whole envelope is frozen, stated by hand so a deleted file fails rather than skips. */
const ENVELOPE_CASES = [CONFIG_NOT_FOUND];

/** Each case compared once at the process boundary, by case name. */
const reports = new Map<string, RejectedCaseReport>();

beforeAll(() => {
  for (const caseName of cases)
    reports.set(caseName, compareRejectedCase(rejectedCasePath(TIER.name, caseName), caseName));
}, 120_000);

function reportFor(caseName: string): RejectedCaseReport {
  const report = reports.get(caseName);
  if (report === undefined) throw new Error(`no process-boundary report for ${caseName}`);
  return report;
}

/**
 * The whole config-error response one case produces.
 *
 * Built from the Core loader rather than spawned through the CLI: the payload is
 * what every command reports identically, and the envelope around it is each
 * command's own business. Driven by the DECLARED Module set rather than a set
 * assembled here, because two of the codes below are now facts about the
 * composition — which keys are claimed at all, and whether any Module was named
 * — so a tier running against its own Module list would specify a tool nobody
 * ships.
 */
function rejectionFor(caseName: string) {
  return configError(loadConfig(configPathOf(TIER, caseName), MODULE_SET).faults);
}

/** Every code the frozen files name, across the tier, with repeats. */
function codesFrozen(): readonly string[] {
  return cases.flatMap((caseName) => expectedRejectionOf(TIER, caseName).faults.map((fault) => fault.code));
}

describe('the rejected-config tier', () => {
  describe('success cases', () => {
    it.each(cases)('freezes the whole config-error response for %s', (caseName) => {
      // Deep equality over the WHOLE payload, fault list included and in order.
      // Asserting membership instead would pass over a rejection carrying extra
      // faults, and a config fails whole precisely so an Operator sees all of
      // them in one run.
      // ARRANGE
      const expected = expectedRejectionOf(TIER, caseName);
      // ACT
      const actual = rejectionFor(caseName);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it.each(cases)('answers %s at the process boundary exactly as its frozen files state', (caseName) => {
      // The disagreeing comparisons, diffs included, so a red run names the
      // frozen file and the lines that moved.
      // ARRANGE
      const none: readonly unknown[] = [];
      // ACT
      const actual = reportFor(caseName).frozen.filter((comparison) => !comparison.agrees);
      // ASSERT
      expect(actual).toEqual(none);
    });

    it('freezes the serialized check envelope for exactly the cases that state one', () => {
      // Without this, deleting an envelope file would drop its comparison
      // silently and the case would still agree (ARCH-010).
      // ARRANGE
      const expected = ENVELOPE_CASES;
      // ACT
      const actual = cases.filter((caseName) =>
        reportFor(caseName).frozen.some((comparison) => comparison.label === EXPECTED_CHECK_RESPONSE),
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('points at its own tier rather than at the directory holding every tier', () => {
      // A runner pointed one level up reads every tier's files as its own, and
      // for the tier next door that means reading its cases with the wrong
      // prefix rather than failing.
      // ARRANGE
      const ownTier = `${TIER.name}/`;
      // ACT
      const actual = configPathOf(TIER, cases[0]);
      // ASSERT
      expect(actual).toContain(ownTier);
    });
  });

  describe('failure cases', () => {
    it.each(cases)('hands back no config at all for %s', (caseName) => {
      // A case whose config is ACCEPTED is a broken case, and this is where it
      // says so by name. Without it the deep-equality test above would compare
      // an empty fault list against an empty fault list and pass.
      // ARRANGE
      const noConfig = undefined;
      // ACT
      const actual = loadConfig(configPathOf(TIER, caseName), MODULE_SET).config;
      // ASSERT
      expect(actual).toBe(noConfig);
    });

    it.each(cases)('freezes at least one fault for %s', (caseName) => {
      // The other half of the same guard, on the frozen side: an expectation
      // stating no fault would satisfy closure vacuously and contribute nothing
      // to coverage, while still looking like a case.
      // ARRANGE
      const none = 0;
      // ACT
      const frozen = expectedRejectionOf(TIER, caseName).faults.length;
      // ASSERT
      expect(frozen).toBeGreaterThan(none);
    });
  });

  describe('edge cases', () => {
    it('proves coverage and closure against the fault catalog together', () => {
      // A reached code says the tier has bytes that provoke it. A frozen code
      // says the permanent specification names it. Neither assertion is
      // meaningful alone, so the paired operation answers both at once.
      // ARRANGE
      const complete = { unreached: [], undeclared: [] };
      // ACT
      const actual = coverageAndClosure(
        DECLARED_CODES,
        cases.flatMap((caseName) => rejectionFor(caseName).faults.map((fault) => fault.code)),
        codesFrozen(),
      );
      // ASSERT
      expect(actual).toEqual(complete);
    });

    it('freezes only codes the catalog declares, and every one of them', () => {
      // Tool-free, so it holds whatever the loader answers: a misspelled code
      // in any frozen expectation is red here even when the loader is broken,
      // and the test above cannot tell one wrong answer from another. Coverage
      // over the FROZEN side too, so a catalog code no case freezes is just as
      // red.
      // ARRANGE
      const complete = { unreached: [], undeclared: [] };
      // ACT
      const actual = coverageAndClosure(DECLARED_CODES, codesFrozen(), codesFrozen());
      // ASSERT
      expect(actual).toEqual(complete);
    });

    it('enumerates every case the suite declares', () => {
      // Stated by hand rather than counted back off the tree it is checking.
      // ARCH-002 §3.1 makes adding or removing a case a contract change, so the
      // number belongs in review — and `cases.length` compared against anything
      // derived from `cases` could not fail at all.
      // ARRANGE
      const declaredCases = TIER.caseCount;
      // ACT
      const enumerated = cases.length;
      // ASSERT
      expect(enumerated).toBe(declaredCases);
    });

    it('freezes one case carrying several faults, so fault order is not stated vacuously', () => {
      // Deep equality over a one-fault list says nothing whatever about order.
      // `frontmatter__fault-order/` is the case that makes the contract real, and this is
      // what stops it being deleted down to a set of singletons.
      // ARRANGE
      const single = 1;
      // ACT
      const longest = Math.max(...cases.map((caseName) => expectedRejectionOf(TIER, caseName).faults.length));
      // ASSERT
      expect(longest).toBeGreaterThan(single);
    });

    it('holds no markdown, so no document Conformance case can be filed here by mistake', () => {
      // A rejected config produces no document. This is also why ARCH-002's case
      // glob stops at `<tier>/docs/**/*.md` and never reaches this tier: there is
      // nothing here for an `expect:` marker to sit in.
      // ARRANGE
      const noMarkdown: readonly string[] = [];
      // ACT
      const actual = [...casesIn(TIER.name)];
      // ASSERT
      expect(actual).toEqual(noMarkdown);
    });
  });
});
