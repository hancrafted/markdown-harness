// The `body-structure` tier's runner, under `fixtures/conformance/body-structure/`.
//
// A SPEC-FOLDER TIER (#231). Every directory directly under the tier's `docs/` is
// one spec folder: a synthetic repo root holding the adopter's config file, whose
// first line states the spec, its Conformance cases, and the frozen output `mh`
// prints when run inside it with no flag — `expected-check.json` always,
// `expected-audit.json` where Rules compete for a file, `expected-query.json`
// where paths were asked. A human verifies one folder with
// `cd <folder> && npx mh | diff - expected-check.json`, or with
// `npm run conformance -- <folder>`, and this runner asks the same question of
// every folder through the same shared module, `../spec-folder.ts`.
//
// SPECIFICATION: every case states its verdict in an `<!-- expect: -->` marker,
// and the frozen files state, for every failing case, the Rule that won it and
// its exact violations. The one exception is the verbatim case, a byte-identical
// copy that cannot carry a marker and states its verdict in its folder's
// `verbatim-cases.json`. The cases and their findings were written from the spec
// in #221 and never from an implementation, and #231 moved them into spec folders
// by rename and cut each frozen file from the old tier-wide ones; a disagreement
// here is answered by deciding which side is wrong — never by editing a case, a
// marker or a frozen file to agree with the code (ARCH-010).
//
// AT THE PROCESS BOUNDARY, on purpose: the compiled `mh` is the artefact a
// reimplementation is judged at. Two consequences follow.
//
// 1. `check` lists only failing files and counts the governed ones, so it cannot
//    tell a PASSES file from an UNGOVERNED one. Each case is therefore ALSO copied
//    byte for byte into a root of its own and asked there under its folder's
//    config: `governedFiles` is then that file's governance. That rests on one
//    premise: A BODY-STRUCTURE VERDICT IS A FUNCTION OF THE CONFIG PLUS ONE FILE'S
//    PATH AND BYTES. A Module whose verdict read a second file would break it.
// 2. Build before running this file alone (trap 9 in
//    docs/agents/verification.md): it measures `dist/`, never `src/`.

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MODULE_SET } from '../../cli/module-set.ts';
import { loadConfig } from '../../foundation/load-config.ts';
import { parseYamlDocument } from '../../foundation/yaml-document.ts';
import { casesIn } from '../case-corpus.ts';
import { FAILS, PASSES, UNGOVERNED } from '../case-marker.ts';
import { coverageAndClosure } from '../coverage-closure.ts';
import {
  compareSpecFolder,
  EXPECTED_CHECK,
  specFolderPath,
  specFoldersIn,
  statedVerdictsIn,
  VERBATIM_MANIFEST,
} from '../spec-folder.ts';
import { ADOPTER_CONFIG_FILE, tierForRunner } from '../tier-record.ts';
import type { ToolBlock, ToolRun } from '../tool-answer.ts';
import { envelopeOf, refusalOf, toolEntry } from '../tool-answer.ts';

const TIER = tierForRunner(import.meta.url);
if (TIER.caseKind !== 'spec-folder') throw new Error(`${TIER.name} is not a spec-folder tier`);

/** The Module's top-level key, which names its block in every response. */
const MODULE = 'body-structure';

// ---------------------------------------------------------------------------
// The spec, read off every spec folder: config, markers and frozen check.
// ---------------------------------------------------------------------------

interface HeadingEntry {
  readonly purpose: string;
  readonly level: number;
  readonly pattern?: string;
  readonly presence?: string;
  readonly minCount?: number;
  readonly maxCount?: number;
  readonly intent?: string;
  readonly mayHold?: readonly string[];
  readonly allowed?: readonly { readonly title: string; readonly intent?: string }[];
  readonly headings?: readonly HeadingEntry[];
}

interface RuleSpec {
  readonly ruleId: string;
  readonly intent: string;
  readonly undefinedHeadings?: string;
  readonly folders?: readonly string[];
  readonly fileNames?: readonly string[];
  readonly types?: readonly string[];
  readonly excludeFiles?: readonly unknown[];
  readonly maxLevel?: number;
  readonly headings?: readonly HeadingEntry[];
}

interface Finding {
  readonly ruleId: string;
  readonly violations: readonly unknown[];
}

interface VerbatimCase extends Finding {
  readonly source: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly verdict: string;
}

/** One spec folder as written: its config, each case's stated verdict, and its frozen failing findings. */
interface SpecFolder {
  readonly name: string;
  readonly root: string;
  readonly section: Record<string, unknown>;
  readonly rules: readonly RuleSpec[];
  readonly stated: readonly { readonly path: string; readonly verdict: string }[];
  readonly failing: ReadonlyMap<string, Finding>;
  readonly summary: { readonly governedFiles: number; readonly invalidFiles: number; readonly totalViolations: number };
  readonly verbatim: Readonly<Record<string, VerbatimCase>>;
}

const FOLDER_NAMES = specFoldersIn(TIER.name);

/** A folder file the spec requires, as text. */
function required(root: string, file: string): string {
  return readFileSync(join(root, file), 'utf8');
}

/** A folder file the spec permits, as text, or `undefined`. */
function optional(root: string, file: string): string | undefined {
  try {
    return readFileSync(join(root, file), 'utf8');
  } catch {
    return undefined;
  }
}

// The config as the Operator WROTE it, parsed and not validated, so the
// vocabulary checks below need no Module to answer.
function readFolder(name: string): SpecFolder {
  const root = specFolderPath(TIER.name, name);
  const parsed = parseYamlDocument(required(root, ADOPTER_CONFIG_FILE), 'fault');
  if (parsed.kind !== 'mapping') throw new Error(`the config of ${name} is not a YAML mapping`);
  const section = parsed.document[MODULE] as Record<string, unknown>;
  const check = JSON.parse(required(root, EXPECTED_CHECK)) as {
    result: {
      summary: SpecFolder['summary'];
      files: readonly { path: string; modules: readonly (Finding & { module: string })[] }[];
    };
  };
  const failing = new Map(
    check.result.files.map((file) => {
      const block = file.modules.find((candidate) => candidate.module === MODULE);
      return [file.path, { ruleId: block?.ruleId ?? '', violations: block?.violations ?? [] }] as const;
    }),
  );
  const manifest = optional(root, VERBATIM_MANIFEST);
  return {
    name,
    root,
    section,
    rules: section.rules as readonly RuleSpec[],
    stated: statedVerdictsIn(root),
    failing,
    summary: check.result.summary,
    verbatim: manifest === undefined ? {} : (JSON.parse(manifest) as Record<string, VerbatimCase>),
  };
}

const folders = FOLDER_NAMES.map(readFolder);

/** Every stated case across the tier, its path tier-relative, with the folder that holds it. */
const allStated = folders.flatMap((folder) =>
  folder.stated.map((line) => ({
    folder,
    path: line.path,
    verdict: line.verdict,
    key: `docs/${folder.name}/${line.path}`,
  })),
);
const stated = (verdict: string): readonly string[] =>
  allStated.filter((line) => line.verdict === verdict).map((line) => line.key);
const caseNamed = new Map(allStated.map((line) => [line.key, line]));

/**
 * Every Rule the tier writes, once. A Rule copied into several folders is the
 * same Rule in each — only a folder token is rewritten when its cases moved to
 * the folder root — so the first copy speaks for all of them.
 */
const rulesById = new Map<string, RuleSpec>();
for (const folder of folders)
  for (const rule of folder.rules) if (!rulesById.has(rule.ruleId)) rulesById.set(rule.ruleId, rule);
const rules = [...rulesById.values()];

/** A Rule with its folder tokens dropped, which is what every copy of it must share. */
function withoutFolders(rule: RuleSpec): Omit<RuleSpec, 'folders'> {
  return Object.fromEntries(Object.entries(rule).filter(([key]) => key !== 'folders')) as Omit<RuleSpec, 'folders'>;
}

/** Every entry of a list and of every list nested under it, depth-first in config order. */
function entriesWithin(list: readonly HeadingEntry[] | undefined): readonly HeadingEntry[] {
  return (list ?? []).flatMap((entry) => [entry, ...entriesWithin(entry.headings)]);
}

/** How many lists deep a list goes: 1 for a list nothing is nested under, 0 for none. */
function depthOf(list: readonly HeadingEntry[] | undefined): number {
  return list === undefined ? 0 : 1 + Math.max(0, ...list.map((entry) => depthOf(entry.headings)));
}

/** Every key the Module's vocabulary admits (#221, the listing's vocabulary paragraph). */
const SECTION_KEYS = ['rules'];
const RULE_KEYS = [
  'ruleId',
  'intent',
  'folders',
  'fileNames',
  'types',
  'excludeFiles',
  'maxLevel',
  'undefinedHeadings',
  'headings',
];
const ENTRY_KEYS = [
  'purpose',
  'level',
  'pattern',
  'allowed',
  'presence',
  'minCount',
  'maxCount',
  'intent',
  'mayHold',
  'headings',
];
const PURPOSE_VALUES = ['heading', 'enumeration'];
const PRESENCE_VALUES = ['required', 'optional'];
const UNDEFINED_HEADINGS_VALUES = ['allow', 'forbid'];
// An `allowed` item has two keys (#229) and a `mayHold` set has three kinds (#227):
// the configs write every key and every kind, and no other.
const ALLOWED_ITEM_KEYS = ['title', 'intent'];
const BLOCK_KIND_VALUES = ['prose', 'ordered-list', 'unordered-list'];

describe('the body-structure tier states one coherent specification', () => {
  describe('success cases', () => {
    it('proves coverage and closure over the union of every spec folder config', () => {
      // Splitting one config into many must lose no key: coverage and closure are
      // read off every folder config together, as WRITTEN, whatever the loader answers.
      // ARRANGE
      const complete = { unreached: [], undeclared: [] };
      const sectionKeys = folders.flatMap((folder) => Object.keys(folder.section));
      const ruleKeys = rules.flatMap((rule) => Object.keys(rule));
      const entries = rules.flatMap((rule) => entriesWithin(rule.headings));
      const entryKeys = entries.flatMap((entry) => Object.keys(entry));
      const purposes = entries.map((entry) => entry.purpose);
      // A `heading` entry that omits `presence` is required: the omitted key is the
      // written spelling of `required`. An `enumeration` never carries `presence`.
      const presences = entries
        .filter((entry) => entry.purpose === 'heading')
        .map((entry) => entry.presence ?? 'required');
      const undefinedHeadings = rules.flatMap((rule) =>
        rule.undefinedHeadings === undefined ? [] : [rule.undefinedHeadings],
      );
      const items = entries.flatMap((entry) => entry.allowed ?? []);
      const itemKeys = items.flatMap((item) => Object.keys(item));
      const blockKinds = entries.flatMap((entry) => entry.mayHold ?? []);
      // ACT
      const actual = {
        section: coverageAndClosure(SECTION_KEYS, sectionKeys, sectionKeys),
        rule: coverageAndClosure(RULE_KEYS, ruleKeys, ruleKeys),
        entry: coverageAndClosure(ENTRY_KEYS, entryKeys, entryKeys),
        purpose: coverageAndClosure(PURPOSE_VALUES, purposes, purposes),
        presence: coverageAndClosure(PRESENCE_VALUES, presences, presences),
        undefinedHeadings: coverageAndClosure(UNDEFINED_HEADINGS_VALUES, undefinedHeadings, undefinedHeadings),
        allowedItem: coverageAndClosure(ALLOWED_ITEM_KEYS, itemKeys, itemKeys),
        blockKind: coverageAndClosure(BLOCK_KIND_VALUES, blockKinds, blockKinds),
      };
      // ASSERT
      expect(actual).toEqual({
        section: complete,
        rule: complete,
        entry: complete,
        purpose: complete,
        presence: complete,
        undefinedHeadings: complete,
        allowedItem: complete,
        blockKind: complete,
      });
    });

    it('writes maxLevel on some Rules and omits it on others, and writes presence: optional fourteen times', () => {
      // Counted over distinct Rules, at every depth: #221 wrote it once, #225 twice,
      // #227 eight times and #229 fourteen. A tier that always wrote maxLevel, or
      // never did, could not tell open depth from forbidden depth.
      // ARRANGE
      const expected = { writesMaxLevel: true, omitsMaxLevel: true, optionalEntries: 14 };
      // ACT
      const actual = {
        writesMaxLevel: rules.some((rule) => rule.maxLevel !== undefined),
        omitsMaxLevel: rules.some((rule) => rule.maxLevel === undefined),
        optionalEntries: rules
          .flatMap((rule) => entriesWithin(rule.headings))
          .filter((entry) => entry.presence === 'optional').length,
      };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('nests a list under a heading entry and under an enumeration, four lists deep at most', () => {
      // #229 decision 1: both purposes may carry `headings:`, at any depth down to level 6.
      // ARRANGE
      const expected = { underHeading: true, underEnumeration: true, deepest: 4 };
      // ACT
      const parents = rules.flatMap((rule) => entriesWithin(rule.headings)).filter((entry) => entry.headings);
      const actual = {
        underHeading: parents.some((entry) => entry.purpose === 'heading'),
        underEnumeration: parents.some((entry) => entry.purpose === 'enumeration'),
        deepest: Math.max(...rules.map((rule) => depthOf(rule.headings))),
      };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('writes every copy of a Rule as the same Rule, folder tokens aside', () => {
      // A first-match folder copies its competing Rules; a copy that drifted would
      // specify a second Rule under the first one's ID.
      // ARRANGE
      const none: readonly string[] = [];
      // ACT
      const drifted = folders.flatMap((folder) =>
        folder.rules
          .filter(
            (rule) =>
              JSON.stringify(withoutFolders(rule)) !== JSON.stringify(withoutFolders(rulesById.get(rule.ruleId)!)),
          )
          .map((rule) => `${folder.name}: ${rule.ruleId}`),
      );
      // ASSERT
      expect(drifted).toEqual(none);
    });
  });

  describe('failure cases', () => {
    it('freezes a failing finding for exactly the cases whose marker says FAILS', () => {
      // ARRANGE
      const expected = [...stated(FAILS)].sort();
      // ACT
      const frozen = folders
        .flatMap((folder) => [...folder.failing.keys()].map((path) => `docs/${folder.name}/${path}`))
        .sort();
      // ASSERT
      expect(frozen).toEqual(expected);
    });

    it('freezes at least one violation for every failing file', () => {
      // ARRANGE
      const none: readonly string[] = [];
      // ACT
      const empty = folders.flatMap((folder) =>
        [...folder.failing]
          .filter(([, finding]) => finding.violations.length === 0)
          .map(([path]) => `${folder.name}/${path}`),
      );
      // ASSERT
      expect(empty).toEqual(none);
    });

    it('names a Rule its own folder config declares in every frozen finding', () => {
      // ARRANGE
      const none: readonly string[] = [];
      // ACT
      const undeclared = folders.flatMap((folder) =>
        [...folder.failing.values()]
          .filter((finding) => !folder.rules.some((rule) => rule.ruleId === finding.ruleId))
          .map((finding) => `${folder.name}: ${finding.ruleId}`),
      );
      // ASSERT
      expect(undeclared).toEqual(none);
    });

    it('writes no two case paths that differ only by case', () => {
      // A case-insensitive checkout would fold two such files into one.
      // ARRANGE
      const none: readonly string[] = [];
      // ACT
      const corpus = casesIn(TIER.name);
      const folded = corpus.map((path) => path.toLowerCase());
      const colliding = corpus.filter((_, index) => folded.indexOf(folded[index]) !== index);
      // ASSERT
      expect(colliding).toEqual(none);
    });
  });

  describe('edge cases', () => {
    it('enumerates every Conformance case the suite declares', () => {
      // Stated by hand in the tier record, never counted back off the tree. #231
      // moved 296 cases (the verbatim one now a `.md` the walk reaches) and added
      // five governed partners.
      // ARRANGE
      const declaredCases = TIER.caseCount;
      // ACT
      const enumerated = casesIn(TIER.name).length;
      // ASSERT
      expect(enumerated).toBe(declaredCases);
    });

    it('tallies the verdicts and violations the spec states', () => {
      // #221's counts as #225, #227 and #229 left them — 122 PASSES, 155 FAILS,
      // 18 UNGOVERNED, 173 violations — plus the verbatim PASSES case and the five
      // PASSES partners #231 added so every spec folder holds a governed PASSES case.
      // ARRANGE
      const expected = { passes: 128, fails: 155, ungoverned: 18, violations: 173 };
      // ACT
      const actual = {
        passes: stated(PASSES).length,
        fails: stated(FAILS).length,
        ungoverned: stated(UNGOVERNED).length,
        violations: folders.reduce((sum, folder) => sum + folder.summary.totalViolations, 0),
      };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps the bytes the byte-sensitive cases exist to state', () => {
      // ARCH-010 makes these bytes the contract, and nothing but this test reads
      // them as bytes: an editor trimming a space, or a checkout converting line
      // endings, would otherwise move a verdict with every check still green.
      // ARRANGE
      const expected = {
        leadingBytes: [0xef, 0xbb, 0xbf, 0x2d],
        findingsLine: '## Findings   ',
        extraLeadingSpace: '##  Findings',
        sourceLine: '## Source: ',
        doubleSpaceLine: '## Source:  One',
        suffixLine: '# Q3 Report ',
        astralLine: '# a\u{1F600}b',
        indentedCode: ['    ### Not a heading', '    #### Nor this'],
        indentFourAfterText: '    ### Not a heading',
        indentThree: ['   ## One', '   ## Two'],
        titleLine: '#\tTitle',
        emptyHeadings: ['##', '## '],
        bareLineFeeds: 0,
        lastBytes: '\r\n',
        nestedInOrdered: ['   - A bullet inside it.', '   - Another.', '   1. A numbered item inside it.'],
        looseParagraph: ['   More about the first.'],
        nestedInBullets: ['  1. A numbered item inside it.', '  2. Another.'],
      };
      const bytes = (path: string): Buffer => readFileSync(join(specFolderPath(TIER.name, ''), path));
      const linesOf = (path: string): string[] => bytes(path).toString('utf8').split('\n');
      const crlf = bytes('headings__recognition/crlf.md').toString('utf8');
      // ACT
      const actual = {
        leadingBytes: [
          ...bytes('types__value-matching/docs/research/bom-frontmatter.md').subarray(0, expected.leadingBytes.length),
        ],
        findingsLine: linesOf('pattern__anchored-section-title/title-trailing-spaces.md').find((line) =>
          line.startsWith('## F'),
        ),
        extraLeadingSpace: linesOf('pattern__anchored-section-title/title-extra-leading-space.md').find((line) =>
          line.includes('Findings'),
        ),
        sourceLine: linesOf('pattern__source-prefix/prefix-bare.md').find((line) => line.startsWith('## S')),
        doubleSpaceLine: linesOf('pattern__source-prefix/prefix-double-space.md').find((line) =>
          line.startsWith('## S'),
        ),
        suffixLine: linesOf('pattern__title-suffix/trailing-space.md').find((line) => line.startsWith('# Q')),
        astralLine: linesOf('pattern__title-length/emoji.md').find((line) => line.startsWith('# ')),
        indentedCode: linesOf('headings__recognition/indented-code.md').filter((line) => line.startsWith('    ')),
        indentFourAfterText: linesOf('headings__recognition/indent-four-after-text.md').find((line) =>
          line.startsWith('    '),
        ),
        indentThree: linesOf('headings__recognition/indent-three.md').filter((line) => line.startsWith('   ##')),
        titleLine: linesOf('headings__recognition/tab-after-hash.md').find((line) => line.endsWith('Title')),
        emptyHeadings: linesOf('headings__recognition/empty-h2-twice.md').filter((line) => /^##\s*$/u.test(line)),
        bareLineFeeds: crlf.split('\n').length - crlf.split('\r\n').length,
        lastBytes: crlf.slice(-expected.lastBytes.length),
        nestedInOrdered: linesOf('mayHold__block-kinds/ordered-nested.md').filter((line) => line.startsWith('   ')),
        looseParagraph: linesOf('mayHold__block-kinds/ordered-loose.md').filter((line) => line.startsWith('   ')),
        nestedInBullets: linesOf('mayHold__block-kinds/bullets-nested-ordered.md').filter((line) =>
          line.startsWith('  '),
        ),
      };
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

// ---------------------------------------------------------------------------
// Each spec folder, run as a human runs it, against its frozen files.
// ---------------------------------------------------------------------------

/**
 * A folder's `check` answer IN PROCESS, reached through the declared Module set
 * and the port every Module implements — never through a Module's own files,
 * which this suite must not name — reduced to what the frozen check states.
 */
function inProcessCheck(folder: SpecFolder): unknown {
  const loaded = loadConfig(join(folder.root, ADOPTER_CONFIG_FILE), MODULE_SET);
  if (loaded.config === undefined) return { refused: loaded.faults };
  const descriptor = MODULE_SET.find((candidate) => candidate.key === MODULE);
  if (descriptor?.check === undefined) return { refused: `no ${MODULE} check in the declared Module set` };
  const answer = descriptor.check(
    folder.root,
    folder.stated.map((line) => line.path),
    loaded.config,
  );
  if (answer.kind !== 'checked') return answer;
  return {
    governed: answer.result.governed.length,
    failing: Object.fromEntries(
      answer.result.files.map(({ path, ruleId, violations }) => [path, { ruleId, violations }]),
    ),
  };
}

describe('each body-structure spec folder answers as its frozen files state', () => {
  describe('success cases', () => {
    it.each(FOLDER_NAMES)('%s', (name) => {
      // The shared comparison `npm run conformance` prints: the `# Spec:` line, each
      // marker against the failing-file list, the governed count, and every frozen
      // file byte for byte. Anything but an empty list names what disagreed.
      // ARRANGE
      const none: readonly string[] = [];
      // ACT
      const report = compareSpecFolder(specFolderPath(TIER.name, name), name);
      const disagreements = [
        ...(report.spec === undefined ? ['# Spec: line'] : []),
        ...report.cases.filter((line) => !line.agrees).map((line) => `${line.path} ${line.stated}`),
        ...(report.governed.stated === report.governed.reported
          ? []
          : [`governed ${report.governed.stated} stated, ${report.governed.reported} reported`]),
        ...report.frozen.filter((comparison) => !comparison.agrees).map((comparison) => comparison.label),
      ];
      // ASSERT
      expect(disagreements).toEqual(none);
    });
  });

  describe('failure cases', () => {
    it.each(FOLDER_NAMES)('%s answers through the port with exactly its frozen failing findings', (name) => {
      // The same answer at the in-process seam, reached through the declared
      // Module set and the port every Module implements — never through a Module's
      // own files, which this suite must not name.
      // ARRANGE
      const folder = folders.find((candidate) => candidate.name === name)!;
      const expected = {
        governed: folder.stated.filter((line) => line.verdict === PASSES || line.verdict === FAILS).length,
        failing: Object.fromEntries(folder.failing),
      };
      // ACT
      const actual = inProcessCheck(folder);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('holds a governed PASSES case in every spec folder, so no folder states only failures', () => {
      // ARRANGE
      const none: readonly string[] = [];
      // ACT
      const without = folders
        .filter((folder) => !folder.stated.some((line) => line.verdict === PASSES))
        .map((folder) => folder.name);
      // ASSERT
      expect(without).toEqual(none);
    });
  });
});

// ---------------------------------------------------------------------------
// Each case asked alone, against what it states.
// ---------------------------------------------------------------------------

const ENTRY = toolEntry();

function mh(args: readonly string[], cwd?: string): Promise<ToolRun> {
  return new Promise((settle, refuse) => {
    const child = spawn(process.execPath, [ENTRY, ...args], { cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => (stdout += chunk));
    child.stderr.on('data', (chunk: string) => (stderr += chunk));
    child.on('error', refuse);
    child.on('close', (code) => settle({ stdout, stderr, code }));
  });
}

/** Run `work` over `items` with at most `width` in flight, keeping input order. */
async function inPool<T, R>(items: readonly T[], width: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  async function lane(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      results[index] = await work(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(width, items.length) }, lane));
  return results;
}

/** What one case answers when asked alone: its verdict and, when failing, its finding — or a refusal. */
type CaseAnswer = { readonly verdict: string; readonly finding?: Finding } | { readonly refusal: unknown };

let scratch = '';
const answers = new Map<string, CaseAnswer>();

/** Seed a fresh root with one case's own bytes at its own folder-relative path. */
function seedAlone(key: string, index: number): { readonly root: string; readonly config: string } {
  const { folder, path } = caseNamed.get(key)!;
  const root = join(scratch, `case-${index}`);
  mkdirSync(dirname(join(root, path)), { recursive: true });
  copyFileSync(join(folder.root, path), join(root, path));
  return { root, config: join(folder.root, ADOPTER_CONFIG_FILE) };
}

/** This Module's block in the one file a `check` of a single-case root lists, if it lists one. */
function blockOfAlone(check: ToolRun): ToolBlock | undefined {
  const files = envelopeOf(check).result?.files ?? [];
  return files.flatMap((file) => file.modules).find((candidate) => candidate.module === MODULE);
}

/** One case's verdict and, when failing, its finding, read off a `check` of a root holding it alone. */
function verdictOfAlone(check: ToolRun): CaseAnswer {
  const refusal = refusalOf(check);
  if (refusal !== undefined) return { refusal };
  if (envelopeOf(check).result?.summary?.governedFiles === 0) return { verdict: UNGOVERNED };
  const block = blockOfAlone(check);
  if (block === undefined) return { verdict: PASSES };
  return { verdict: FAILS, finding: { ruleId: String(block.ruleId), violations: block.violations ?? [] } };
}

/** Ask one case alone, under its own folder's config. */
async function answerAlone(key: string, index: number): Promise<CaseAnswer> {
  const { root, config } = seedAlone(key, index);
  return verdictOfAlone(await mh(['check', '--root', root, '--config', config]));
}

beforeAll(async () => {
  scratch = mkdtempSync(join(tmpdir(), 'mh-body-structure-tier-'));
  const keys = allStated.map((line) => line.key);
  const alone = await inPool(keys, 8, (key) => answerAlone(key, keys.indexOf(key)));
  keys.forEach((key, index) => answers.set(key, alone[index]));
}, 120_000);

afterAll(() => {
  if (scratch !== '') rmSync(scratch, { recursive: true, force: true });
});

/** What the spec states for one case: its verdict and, when failing, its frozen finding. */
function statedAnswer(key: string): CaseAnswer {
  const { folder, path, verdict } = caseNamed.get(key)!;
  const finding = folder.failing.get(path);
  return finding === undefined ? { verdict } : { verdict, finding };
}

describe('the tool answers each body-structure case asked alone as it states', () => {
  describe('success cases', () => {
    it.each(stated(PASSES))('passes %s, governed and with no violation', (key) => {
      // ARRANGE
      const expected = statedAnswer(key);
      // ACT
      const actual = answers.get(key);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it.each(stated(FAILS))('fails %s under the Rule its folder freezes, with exactly its violations', (key) => {
      // ARRANGE
      const expected = statedAnswer(key);
      // ACT
      const actual = answers.get(key);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it.each(stated(UNGOVERNED))('never governs %s, so its real faults go unreported', (key) => {
      // ARRANGE
      const expected = statedAnswer(key);
      // ACT
      const actual = answers.get(key);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('exercises all three verdicts, so no block above is vacuous', () => {
      // ARRANGE
      const everyVerdict = [PASSES, FAILS, UNGOVERNED];
      // ACT
      const exercised = everyVerdict.filter((verdict) => stated(verdict).length > 0);
      // ASSERT
      expect(exercised).toEqual(everyVerdict);
    });
  });
});

// ---------------------------------------------------------------------------
// The verbatim case (#227): `GEN-001` byte for byte. Its bytes cannot carry the
// marker every case needs, so its folder's `verbatim-cases.json` states its
// verdict, and the `expect-marker` rule reads the manifest for exactly the paths
// it lists. It is never read from `.archgate/`: the corpus is the portable
// specification and adopters never receive that directory.
// ---------------------------------------------------------------------------

const verbatimCases = folders.flatMap((folder) =>
  Object.entries(folder.verbatim).map(([path, entry]) => ({ folder, path, entry, key: `docs/${folder.name}/${path}` })),
);

describe('the verbatim body-structure case holds the bytes and the answer its manifest states', () => {
  describe('success cases', () => {
    it.each(verbatimCases.map((verbatim) => verbatim.key))('answers %s under the Rule it names', (key) => {
      // ARRANGE
      const { entry } = verbatimCases.find((verbatim) => verbatim.key === key)!;
      const expected =
        entry.verdict === FAILS
          ? { verdict: entry.verdict, finding: { ruleId: entry.ruleId, violations: entry.violations } }
          : { verdict: entry.verdict };
      // ACT
      const actual = answers.get(key);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it.each(verbatimCases.map((verbatim) => verbatim.key))(
      'holds %s to the length and hash its entry states',
      (key) => {
        // ARRANGE
        const { folder, path, entry } = verbatimCases.find((verbatim) => verbatim.key === key)!;
        const expected = { bytes: entry.bytes, sha256: entry.sha256 };
        // ACT
        const stored = readFileSync(join(folder.root, path));
        const actual = { bytes: stored.length, sha256: createHash('sha256').update(stored).digest('hex') };
        // ASSERT
        expect(actual).toEqual(expected);
      },
    );
  });

  describe('edge cases', () => {
    it('lists exactly one verbatim case, and it carries no expect marker', () => {
      // ARRANGE
      const expected = [{ key: 'docs/headings__real-gen-001-adr-passes/GEN-001-adr.md', markers: 0 }];
      // ACT
      const actual = verbatimCases.map(({ folder, path, key }) => ({
        key,
        markers: (readFileSync(join(folder.root, path), 'utf8').match(/<!--\s*expect:/gu) ?? []).length,
      }));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

// ---------------------------------------------------------------------------
// `assess`, which this Module does not implement.
// ---------------------------------------------------------------------------

/**
 * The instant handed to `assess`. This tier carries no `assess:` marker and its
 * tier record states no instant (#221), because the Module makes no freshness
 * claim; `--now` is supplied only so that no clock is read.
 */
const ASSESSMENT_INSTANT = '2026-12-01T00:00:00Z';

describe('assess answers a body-structure case as ungoverned', () => {
  describe('success cases', () => {
    it('answers assess with PROCEED for a file it reads, governed by body-structure or not', async () => {
      // ARRANGE
      const expected = { code: 0, agentAction: 'PROCEED' };
      // ACT
      const run = await mh(
        ['assess', 'two.md', '--now', ASSESSMENT_INSTANT],
        specFolderPath(TIER.name, 'maxCount__exactly-two'),
      );
      const actual = { code: run.code, agentAction: envelopeOf(run).result?.agentAction };
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('answers assess with no body-structure block, because this Module implements no assess', async () => {
      // ARRANGE
      const expected = ['frontmatter'];
      // ACT
      const run = await mh(
        ['assess', 'one.md', '--now', ASSESSMENT_INSTANT],
        specFolderPath(TIER.name, 'maxCount__exactly-two'),
      );
      const actual = envelopeOf(run) as { modules?: readonly string[] };
      // ASSERT
      expect(actual.modules).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it.each([
      ['headings__research-report', 'report-pass.md'],
      ['headings__research-report', 'report-h4-no-h1.md'],
      ['fileNames__index-pages', 'docs/upper/INDEX.md'],
    ])('answers assess %s/%s as ungoverned, because this Module implements no assess', async (name, path) => {
      // A known imprecision, not a claim that the file is outside every Rule:
      // this Module makes no freshness claim, so a file it governs reads
      // `ungoverned` in an Assessment all the same.
      // ARRANGE
      const expected = { code: 0, refusal: undefined, agentAction: 'PROCEED', state: 'ungoverned' };
      // ACT
      const run = await mh(['assess', path, '--now', ASSESSMENT_INSTANT], specFolderPath(TIER.name, name));
      const result = envelopeOf(run).result;
      const actual = {
        code: run.code,
        refusal: refusalOf(run),
        agentAction: result?.agentAction,
        state: result?.state,
      };
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
