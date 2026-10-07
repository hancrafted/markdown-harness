// The `integrated` tier's runner, under `fixtures/conformance/integrated/`.
//
// The one tier where two Modules govern one tree, and so the one place
// composition is a contract rather than a demo: a file both Modules govern
// counts once, findings nest in DECLARED Module order whatever order the config
// wrote its sections in, a file one Module governs is passed by the other, and a
// missing `type` is reported by the Module that constrains it and silently
// selects nothing in the Module that selects on it.
//
// A SPEC-FOLDER TIER (#231). Every directory directly under the tier's `docs/` is
// one spec folder: a synthetic repo root holding the adopter's config file, whose
// first line states the spec, its Conformance cases, the frozen
// `expected-check.json` `mh` prints when run inside it with no flag, and, where
// paths were asked, `expected-query.json` — composition seen from the Steering
// side. A human verifies one folder with
// `cd <folder> && npx mh | diff - expected-check.json`, or with
// `npm run conformance --path <folder>`, and this runner asks the same question of
// every folder through the same shared module, `../spec-folder.ts`.
//
// Unlike the `body-structure` tier, every folder here keeps its cases at their
// former tier-relative paths under its own `docs/`, and every Rule is copied
// with its folder token unchanged: each Module's selector is exactly what this
// tier composes, so a rewritten token would change the claim.
//
// SPECIFICATION: the frozen files were cut from the tier-wide `check` and `query`
// responses #221 froze, as #225, #227 and #229 extended them, and never
// regenerated to agree with a run (ARCH-010). The response alone cannot tell a
// PASSES file from an UNGOVERNED one, so the markers carry that half: a folder's
// failing files are exactly its FAILS cases, and its governed count is its
// PASSES plus FAILS tally.
//
// AT THE PROCESS BOUNDARY: build before running this file alone (trap 9 in
// docs/agents/verification.md) — it measures `dist/`, never `src/`.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseYamlDocument } from '../../foundation/yaml-document.ts';
import { casesIn } from '../case-corpus.ts';
import { FAILS, PASSES, UNGOVERNED } from '../case-marker.ts';
import { compareSpecFolder, EXPECTED_CHECK, specFolderPath, specFoldersIn, statedVerdictsIn } from '../spec-folder.ts';
import { ADOPTER_CONFIG_FILE, tierForRunner } from '../tier-record.ts';
import type { ToolEnvelope, ToolRun } from '../tool-answer.ts';
import { refusalOf, toolEntry } from '../tool-answer.ts';

const TIER = tierForRunner(import.meta.url);
if (TIER.caseKind !== 'spec-folder') throw new Error(`${TIER.name} is not a spec-folder tier`);

/** The frozen `query` answers a folder holds where paths were asked, keyed by the path. */
const EXPECTED_QUERY = 'expected-query.json';

/** Both Modules' keys, in declared Module order — the order every response nests their blocks in. */
const DECLARED_MODULES = ['frontmatter', 'body-structure'];

/** One Rule as written, keyed by the Module whose section declares it. */
interface WrittenRule {
  readonly module: string;
  readonly ruleId: string;
  readonly rule: unknown;
}

/** One spec folder as written: its config, each case's stated verdict, and its frozen answers. */
interface SpecFolder {
  readonly name: string;
  readonly root: string;
  readonly configText: string;
  readonly sections: readonly string[];
  readonly rules: readonly WrittenRule[];
  readonly stated: readonly { readonly path: string; readonly verdict: string }[];
  readonly check: ToolEnvelope;
  readonly queries: Readonly<Record<string, ToolEnvelope>>;
}

const FOLDER_NAMES = specFoldersIn(TIER.name);

/** A folder file the spec permits, as text, or `undefined`. */
function optional(root: string, file: string): string | undefined {
  try {
    return readFileSync(join(root, file), 'utf8');
  } catch {
    return undefined;
  }
}

// The config as the Operator WROTE it, parsed and not validated, so the claims
// about what the tier writes need no Module to answer.
function readFolder(name: string): SpecFolder {
  const root = specFolderPath(TIER.name, name);
  const configText = readFileSync(join(root, ADOPTER_CONFIG_FILE), 'utf8');
  const parsed = parseYamlDocument(configText, 'fault');
  if (parsed.kind !== 'mapping') throw new Error(`the config of ${name} is not a YAML mapping`);
  const sections = Object.keys(parsed.document);
  const rules = sections.flatMap((module) =>
    ((parsed.document[module] as { rules: readonly { ruleId: string }[] }).rules ?? []).map((rule) => ({
      module,
      ruleId: rule.ruleId,
      rule,
    })),
  );
  return {
    name,
    root,
    configText,
    sections,
    rules,
    stated: statedVerdictsIn(root),
    check: JSON.parse(readFileSync(join(root, EXPECTED_CHECK), 'utf8')) as ToolEnvelope,
    queries: JSON.parse(optional(root, EXPECTED_QUERY) ?? '{}') as Record<string, ToolEnvelope>,
  };
}

const folders = FOLDER_NAMES.map(readFolder);
const folderNamed = (name: string): SpecFolder => {
  const folder = folders.find((candidate) => candidate.name === name);
  if (folder === undefined) throw new Error(`no spec folder ${name} in the ${TIER.name} tier`);
  return folder;
};

/** Every stated case across the tier, keyed by its tier-relative path. */
const allStated = folders.flatMap((folder) =>
  folder.stated.map((line) => ({ key: `docs/${folder.name}/${line.path}`, verdict: line.verdict })),
);
const stated = (verdict: string): readonly string[] =>
  allStated.filter((line) => line.verdict === verdict).map((line) => line.key);
const statedIn = (folder: SpecFolder, verdict: string): readonly string[] =>
  folder.stated.filter((line) => line.verdict === verdict).map((line) => line.path);

/** `mh` spawned inside a spec folder with `args` and nothing else, as a human runs it. */
function mhIn(root: string, args: readonly string[]): ToolRun {
  const spawned = spawnSync(process.execPath, [toolEntry(), ...args], { cwd: root, encoding: 'utf8' });
  return { stdout: spawned.stdout, stderr: spawned.stderr, code: spawned.status };
}

const none: readonly string[] = [];

// ---------------------------------------------------------------------------
// Each spec folder, asked through the shared comparison.
// ---------------------------------------------------------------------------

describe('each integrated spec folder answers as its frozen files state', () => {
  describe('success cases', () => {
    it.each(FOLDER_NAMES)('%s', (name) => {
      // The shared comparison `npm run conformance` prints: the `# Spec:` line, each
      // marker against the failing-file list, the governed count — a UNION across
      // Modules, so a file both govern counts once — and every frozen file byte for
      // byte, `check` and each frozen `query`. Anything but an empty list names
      // what disagreed.
      // ARRANGE
      const expected = none;
      // ACT
      const report = compareSpecFolder(specFolderPath(TIER.name, name), name);
      const actual = [
        ...(report.spec === undefined ? ['# Spec: line'] : []),
        ...report.cases.filter((line) => !line.agrees).map((line) => `${line.path} ${line.stated}`),
        ...(report.governed.stated === report.governed.reported
          ? []
          : [`governed ${report.governed.stated} stated, ${report.governed.reported} reported`]),
        ...report.frozen.filter((comparison) => !comparison.agrees).map((comparison) => comparison.label),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it.each(FOLDER_NAMES)(
      '%s exits 1 on check, because it holds a failing case, and 0 on each frozen query',
      (name) => {
        // The exit code is outside every frozen file, so it is held here.
        // ARRANGE
        const folder = folderNamed(name);
        const expected = {
          check: { code: 1, refusal: undefined },
          queries: Object.keys(folder.queries).map((path) => ({ path, code: 0, refusal: undefined })),
        };
        // ACT
        const check = mhIn(folder.root, []);
        const actual = {
          check: { code: check.code, refusal: refusalOf(check) },
          queries: Object.keys(folder.queries).map((path) => {
            const run = mhIn(folder.root, ['query', path]);
            return { path, code: run.code, refusal: refusalOf(run) };
          }),
        };
        // ASSERT
        expect(actual).toEqual(expected);
      },
    );
  });

  describe('edge cases', () => {
    it.each(FOLDER_NAMES)('%s freezes a check that agrees with its markers, before any tool is asked', (name) => {
      // The frozen response and the markers were written apart. Held to each
      // other here, tool-free, so a red comparison above is red for the tool's
      // sake and never because the spec contradicts itself.
      // ARRANGE
      const folder = folderNamed(name);
      const expected = {
        root: '.',
        config: ADOPTER_CONFIG_FILE,
        modules: DECLARED_MODULES,
        files: [...statedIn(folder, FAILS)].sort(),
        governedFiles: statedIn(folder, PASSES).length + statedIn(folder, FAILS).length,
        invalidFiles: statedIn(folder, FAILS).length,
      };
      // ACT
      const actual = {
        root: folder.check.root,
        config: folder.check.config,
        modules: folder.check.modules,
        files: (folder.check.result?.files ?? []).map((file) => file.path),
        governedFiles: folder.check.result?.summary?.governedFiles,
        invalidFiles: folder.check.result?.summary?.invalidFiles,
      };
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

// ---------------------------------------------------------------------------
// The tier as a whole: what the split must not lose.
// ---------------------------------------------------------------------------

describe('the integrated tier states one coherent specification', () => {
  describe('success cases', () => {
    it('writes both Module sections in every spec folder, body-structure first', () => {
      // The tier's whole point is one config naming more than one Module. The
      // section order is deliberate: the response nests blocks in DECLARED Module
      // order, and only a config that writes them the other way round shows it.
      // ARRANGE
      const expected = FOLDER_NAMES.map((name) => ({ name, sections: ['body-structure', 'frontmatter'] }));
      // ACT
      const actual = folders.map((folder) => ({ name: folder.name, sections: folder.sections }));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('writes every copy of a Rule identically, in whichever spec folders it appears', () => {
      // Each folder copied its Rules from the tier's former shared config byte for
      // byte, folder tokens included, so a Rule edited in one copy and not the
      // others would quietly make two specs of one Rule.
      // ARRANGE
      const expected = none;
      // ACT
      const first = new Map<string, string>();
      const drifted: string[] = [];
      for (const folder of folders) {
        for (const written of folder.rules) {
          const key = `${written.module}:${written.ruleId}`;
          const text = JSON.stringify(written.rule);
          const seen = first.get(key);
          if (seen === undefined) first.set(key, text);
          else if (seen !== text) drifted.push(`${folder.name} ${key}`);
        }
      }
      // ASSERT
      expect(drifted).toEqual(expected);
    });

    it('nests findings in declared Module order in every frozen file a Module pair reports on', () => {
      // ARRANGE
      const expected = none;
      // ACT
      const outOfOrder = folders.flatMap((folder) =>
        (folder.check.result?.files ?? [])
          .filter((file) => {
            const order = file.modules.map((block) => block.module);
            return order.join() !== DECLARED_MODULES.filter((module) => order.includes(module)).join();
          })
          .map((file) => `${folder.name} ${file.path}`),
      );
      // ASSERT
      expect(outOfOrder).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('holds the frozen query answers the tier-wide file was cut into', () => {
      // ARCH-010 §1.3: the comparison reads `expected-query.json` only where a
      // folder holds one, so a deleted file would pass silently. #231 cut the
      // seven frozen query answers into the six folders whose Rules they name;
      // these hand-stated counts make a deletion fail.
      // ARRANGE
      const expected = { folders: 6, queries: 7 };
      // ACT
      const actual = {
        folders: folders.filter((folder) => Object.keys(folder.queries).length > 0).length,
        queries: folders.reduce((sum, folder) => sum + Object.keys(folder.queries).length, 0),
      };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('writes no two case paths that differ only by case', () => {
      // A case-insensitive checkout would fold two such files into one.
      // ARRANGE
      const expected = none;
      // ACT
      const corpus = casesIn(TIER.name);
      const folded = corpus.map((path) => path.toLowerCase());
      const colliding = corpus.filter((_, index) => folded.indexOf(folded[index]) !== index);
      // ASSERT
      expect(colliding).toEqual(expected);
    });

    it('holds a governed PASSES case in every spec folder, so no folder states only failures', () => {
      // ARRANGE
      const expected = none;
      // ACT
      const without = folders.filter((folder) => statedIn(folder, PASSES).length === 0).map((folder) => folder.name);
      // ASSERT
      expect(without).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('enumerates every Conformance case the suite declares', () => {
      // ARRANGE
      const declaredCases = TIER.caseCount;
      // ACT
      const enumerated = casesIn(TIER.name).length;
      // ASSERT
      expect(enumerated).toBe(declaredCases);
    });

    it('tallies the verdicts the spec states', () => {
      // #221: 18 cases, of which 5 PASSES, 12 FAILS and 1 UNGOVERNED; #225 extends it to 25 cases,
      // of which 7 PASSES, 16 FAILS and 2 UNGOVERNED; #227 extends it to 29 cases, of which 9 PASSES,
      // 18 FAILS and 2 UNGOVERNED; #229 adds one nested-spine case, so 30 cases, of which 9 PASSES,
      // 19 FAILS and 2 UNGOVERNED; #231 adds three PASSES partners so every spec folder holds one,
      // so 33 cases, of which 12 PASSES, 19 FAILS and 2 UNGOVERNED.
      // ARRANGE
      const expected = { passes: 12, fails: 19, ungoverned: 2, other: 0 };
      // ACT
      const actual = {
        passes: stated(PASSES).length,
        fails: stated(FAILS).length,
        ungoverned: stated(UNGOVERNED).length,
        other: allStated.length - stated(PASSES).length - stated(FAILS).length - stated(UNGOVERNED).length,
      };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('exercises all three verdicts and both Modules, so no claim above is vacuous', () => {
      // ARRANGE
      const expected = { verdicts: [PASSES, FAILS, UNGOVERNED], modules: [...DECLARED_MODULES].sort() };
      // ACT
      const actual = {
        verdicts: [PASSES, FAILS, UNGOVERNED].filter((verdict) => stated(verdict).length > 0),
        modules: [
          ...new Set(
            folders.flatMap((folder) =>
              (folder.check.result?.files ?? []).flatMap((file) => file.modules.map((block) => block.module)),
            ),
          ),
        ].sort(),
      };
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
