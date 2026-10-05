// The `body-structure` tier's runner, under `fixtures/conformance/body-structure/`.
//
// SPECIFICATION: every case states its verdict in an `<!-- expect: -->` marker,
// and `expected-findings.json` freezes, for every GOVERNED case, the Rule that
// wins it and its exact violations. The one exception is the verbatim case, a
// byte-identical copy that cannot carry a marker and states its verdict in
// `verbatim-cases.json` instead. Both were written from the spec in #221 and
// never from an implementation, so a disagreement here is answered by deciding
// which side is wrong — never by editing a case, a marker or a frozen finding to
// agree with the code (ARCH-010).
//
// AT THE PROCESS BOUNDARY, on purpose. The tier was written before its Module
// existed, so the only seam that could hold it without naming the Module's own
// internals is the compiled `mh` — the same artefact `cli.test.ts` spawns, and
// the one a reimplementation is judged at. Two consequences follow.
//
// 1. Per-case governance is asked of a corpus of ONE, and that rests on one
//    premise: A BODY-STRUCTURE VERDICT IS A FUNCTION OF THE CONFIG PLUS ONE
//    FILE'S PATH AND BYTES. A `--check` response lists only failing files and
//    counts the governed ones, so it cannot tell a PASSES file from an
//    UNGOVERNED one. Each case is therefore copied byte for byte into a root of
//    its own and asked there: `governedFiles` is then that file's governance,
//    the `--check` block its violations, and the one `--audit` row that won it
//    names its Rule. A Module whose verdict read a second file would break the
//    premise, and this seam with it.
// 2. Build before running this file alone (trap 9 in
//    docs/agents/verification.md): it measures `dist/`, never `src/`.

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MODULE_SET } from '../../cli/module-set.ts';
import { loadConfig } from '../../foundation/load-config.ts';
import { readTextIn } from '../../foundation/read-text.ts';
import { parseYamlDocument } from '../../foundation/yaml-document.ts';
import type { ModuleCheck } from '../../response-contract/index.ts';
import { casesIn, tierRoot } from '../case-corpus.ts';
import { casesStating, FAILS, PASSES, UNGOVERNED, verdictOf } from '../case-marker.ts';
import { coverageAndClosure } from '../coverage-closure.ts';
import { tierForRunner } from '../tier-record.ts';
import type { ToolRefusal, ToolRun } from '../tool-answer.ts';
import { envelopeOf, refusalOf, toolEntry } from '../tool-answer.ts';

const TIER = tierForRunner(import.meta.url);
if (TIER.caseKind !== 'markdown') throw new Error(`${TIER.name} is not a markdown tier`);

/** The synthetic repo root the tier's config is written relative to. */
const CORPUS_ROOT = tierRoot(TIER.name);

/** The tier root and config exactly as a caller types them from the repository root. */
const TYPED_ROOT = `fixtures/conformance/${TIER.name}`;
const TYPED_CONFIG = `${TYPED_ROOT}/${TIER.configFile}`;

/** The Module's top-level key, which names its block in every response. */
const MODULE = 'body-structure';

/** The frozen findings, beside the config. */
const FINDINGS_FILE = 'expected-findings.json';

// ---------------------------------------------------------------------------
// The spec, read off the tier: config, markers and frozen findings.
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
  readonly vocabulary?: readonly { level: number; allowed: readonly string[] }[];
  readonly headings?: readonly HeadingEntry[];
}

interface Finding {
  readonly ruleId: string;
  readonly violations: readonly unknown[];
}

function readTierText(file: string): string {
  const found = readTextIn(CORPUS_ROOT, file);
  if (found.kind !== 'text') throw new Error(`${file} in the ${TIER.name} tier is ${found.kind}`);
  return found.text;
}

// The config as the Operator WROTE it, parsed and not validated: the loader
// refuses this section until the Module exists, and the vocabulary checks below
// are about what the tier writes, which needs no Module to answer.
const parsedConfig = parseYamlDocument(readTierText(TIER.configFile), 'fault');
if (parsedConfig.kind !== 'mapping') throw new Error('the tier config is not a YAML mapping');
const writtenConfig = parsedConfig.document;
const writtenSection = writtenConfig[MODULE] as { rules: readonly RuleSpec[] };
const rules = writtenSection.rules;
const ruleNamed = (ruleId: string): RuleSpec => {
  const rule = rules.find((candidate) => candidate.ruleId === ruleId);
  if (rule === undefined) throw new Error(`the tier config has no Rule ${ruleId}`);
  return rule;
};

const frozen = JSON.parse(readTierText(FINDINGS_FILE)) as Record<string, Finding>;

const corpus = casesIn(TIER.name);
const stated = (verdict: string): string[] => [...casesStating(TIER.name, verdict)];

// ---------------------------------------------------------------------------
// The tool, spawned. Async so every one-file corpus can be asked in parallel. The
// spawn stays here: only a test file may import a platform builtin outside
// `foundation` (ARCH-008 §2.1), so the shared half is `../tool-answer.ts`.
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

/**
 * What one case answers when asked alone: its verdict and, when governed, its
 * finding — or the refusal that stopped the tool answering at all.
 */
type CaseAnswer = { readonly verdict: string; readonly finding?: Finding } | { readonly refusal: ToolRefusal };

let scratch = '';
const answers = new Map<string, CaseAnswer>();
let tierCheck: ToolRun;
let tierAudit: ToolRun;

/** This Module's violations in one `--check` run, across every file it reports. */
function violationsIn(check: ToolRun): readonly unknown[] {
  const files = envelopeOf(check).result?.files ?? [];
  const blocks = files.flatMap((file) => file.modules).filter((block) => block.module === MODULE);
  return blocks.flatMap((block) => block.violations ?? []);
}

/** Every Rule of this Module that won a file in one `--audit` run, joined in config order. */
function winnersIn(audit: ToolRun): string {
  const blocks = (envelopeOf(audit).result?.modules ?? []).filter((block) => block.module === MODULE);
  const rows = blocks.flatMap((block) => block.rules ?? []);
  return rows
    .filter((row) => row.won > 0)
    .map((row) => row.rule.ruleId)
    .join(', ');
}

/**
 * Ask a root already seeded with one file: its verdict and, when governed, its
 * finding — or the refusal that stopped the tool answering at all.
 */
async function answerSeeded(root: string): Promise<CaseAnswer> {
  const [check, audit] = await Promise.all([
    mh(['--check', '--root', root, '--config', TYPED_CONFIG]),
    mh(['--audit', '--root', root, '--config', TYPED_CONFIG]),
  ]);
  const refusal = refusalOf(check) ?? refusalOf(audit);
  if (refusal !== undefined) return { refusal };
  if (envelopeOf(check).result?.summary?.governedFiles === 0) return { verdict: UNGOVERNED };
  const violations = violationsIn(check);
  return {
    verdict: violations.length > 0 ? FAILS : PASSES,
    finding: { ruleId: winnersIn(audit), violations },
  };
}

/** Ask one case alone, in a root holding nothing but its own bytes at its own path. */
async function answerAlone(path: string, index: number): Promise<CaseAnswer> {
  const root = join(scratch, `case-${index}`);
  mkdirSync(dirname(join(root, path)), { recursive: true });
  copyFileSync(join(CORPUS_ROOT, path), join(root, path));
  return answerSeeded(root);
}

beforeAll(async () => {
  scratch = mkdtempSync(join(tmpdir(), 'mh-body-structure-tier-'));
  const width = 8;
  const alone = await inPool(corpus, width, (path) => answerAlone(path, corpus.indexOf(path)));
  corpus.forEach((path, index) => answers.set(path, alone[index]));
  [tierCheck, tierAudit] = await Promise.all([
    mh(['--check', '--root', TYPED_ROOT, '--config', TYPED_CONFIG]),
    mh(['--audit', '--root', TYPED_ROOT, '--config', TYPED_CONFIG]),
  ]);
}, 120_000);

afterAll(() => {
  if (scratch !== '') rmSync(scratch, { recursive: true, force: true });
});

/** The tier config's location as this file hands it to the loader in process. */
const IN_PROCESS_CONFIG = join(CORPUS_ROOT, TIER.configFile);

/**
 * The Module's own `check` answer for the whole tier, IN PROCESS, reached through
 * the declared Module set and the port every Module implements — never through
 * a Module's own files, which this suite must not name. While the section is
 * refused or no descriptor carries the key, the answer is the reason why.
 */
function inProcessCheck(): unknown {
  const loaded = loadConfig(IN_PROCESS_CONFIG, MODULE_SET);
  if (loaded.config === undefined) return { refused: loaded.faults };
  const descriptor = MODULE_SET.find((candidate) => candidate.key === MODULE);
  if (descriptor === undefined) return { refused: `no descriptor keyed ${MODULE} in the declared Module set` };
  return projected(descriptor.check(CORPUS_ROOT, corpus, loaded.config));
}

/**
 * A port `check` answer reduced to what the frozen findings state: governance,
 * winner and violations. Typed with the response contract's own `ModuleCheck`,
 * so a renamed finding field fails `tsc` here rather than reading as absent.
 */
function projected(answer: { readonly kind: string; readonly result?: ModuleCheck }): unknown {
  if (answer.kind !== 'checked' || answer.result === undefined) return answer;
  const files = answer.result.files.map(({ path, ruleId, violations }) => ({ path, ruleId, violations }));
  return { governed: answer.result.governed, files };
}

/** What the spec states for one case: its marker and, when governed, its frozen finding. */
function statedAnswer(path: string): CaseAnswer {
  const verdict = verdictOf(CORPUS_ROOT, path);
  const finding = frozen[path];
  return finding === undefined ? { verdict } : { verdict, finding };
}

function answerFor(path: string): CaseAnswer | undefined {
  return answers.get(path);
}

// ---------------------------------------------------------------------------
// The spec's internal agreement: no tool asked.
// ---------------------------------------------------------------------------

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
  'vocabulary',
  'headings',
];
const ENTRY_KEYS = ['purpose', 'level', 'pattern', 'presence', 'minCount', 'maxCount', 'intent', 'mayHold'];
const PURPOSE_VALUES = ['heading', 'enumeration'];
const PRESENCE_VALUES = ['required', 'optional'];
const UNDEFINED_HEADINGS_VALUES = ['allow', 'forbid'];
// A vocabulary item has two keys and a `mayHold` set has three kinds (#227):
// the config writes every key and every kind, and no other.
const VOCABULARY_ITEM_KEYS = ['level', 'allowed'];
const BLOCK_KIND_VALUES = ['prose', 'ordered-list', 'unordered-list'];

describe('the body-structure tier states one coherent specification', () => {
  describe('success cases', () => {
    it('proves coverage and closure for the section, rule, entry, purpose, presence, undefinedHeadings, vocabulary-item and block-kind vocabularies together', () => {
      // Read off the config as WRITTEN, so this holds whatever the loader
      // answers; the suite below asks the loader and the tool.
      // ARRANGE
      const complete = { unreached: [], undeclared: [] };
      const sectionKeys = Object.keys(writtenSection);
      const ruleKeys = rules.flatMap((rule) => Object.keys(rule));
      const entries = rules.flatMap((rule) => rule.headings ?? []);
      const entryKeys = entries.flatMap((entry) => Object.keys(entry));
      const purposes = entries.map((entry) => entry.purpose);
      // A `heading` entry that omits `presence` is required: that is the default the
      // spec states, so an omitted key is the written spelling of `required`. An
      // `enumeration` may never carry `presence`, so it contributes none.
      const presences = entries
        .filter((entry) => entry.purpose === 'heading')
        .map((entry) => entry.presence ?? 'required');
      // `undefinedHeadings` is a Rule key with a value set of its own (#225): the config
      // writes both values and no other, and a Rule that omits it is the open spine.
      const undefinedHeadings = rules.flatMap((rule) =>
        rule.undefinedHeadings === undefined ? [] : [rule.undefinedHeadings],
      );
      // `vocabulary` is a Rule key whose items carry two keys, and `mayHold` an entry key whose
      // values are the three block kinds (#227): the config writes every one and no other.
      const items = rules.flatMap((rule) => rule.vocabulary ?? []);
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
        vocabularyItem: coverageAndClosure(VOCABULARY_ITEM_KEYS, itemKeys, itemKeys),
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
        vocabularyItem: complete,
        blockKind: complete,
      });
    });

    it('writes maxLevel on some Rules and omits it on others, and writes presence: optional eight times', () => {
      // The listing: "`maxLevel` both written and omitted and with `presence:
      // optional` written" -- once in #221, and twice since #225 added
      // `closed-record`'s `Consequences` entry as the second, and eight since #227 added the
      // six optional entries of `section-kinds`. #221's "written once"
      // described that round's config and not a property of the Module. A tier that
      // always wrote it, or never wrote it, could not tell open depth from forbidden depth.
      // ARRANGE
      const expected = { writesMaxLevel: true, omitsMaxLevel: true, optionalEntries: 8 };
      // ACT
      const actual = {
        writesMaxLevel: rules.some((rule) => rule.maxLevel !== undefined),
        omitsMaxLevel: rules.some((rule) => rule.maxLevel === undefined),
        optionalEntries: rules.flatMap((rule) => rule.headings ?? []).filter((entry) => entry.presence === 'optional')
          .length,
      };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('freezes a finding for exactly the cases whose marker says they are governed', () => {
      // ARRANGE
      const governed = [...stated(PASSES), ...stated(FAILS)].sort();
      // ACT
      const keys = Object.keys(frozen).sort();
      // ASSERT
      expect(keys).toEqual(governed);
    });
  });

  describe('failure cases', () => {
    it('freezes violations for every FAILS case and none for a PASSES case', () => {
      // ARRANGE
      const none: readonly string[] = [];
      // ACT
      const passingWithViolations = stated(PASSES).filter((path) => frozen[path]?.violations.length !== 0);
      const failingWithout = stated(FAILS).filter((path) => (frozen[path]?.violations.length ?? 0) === 0);
      // ASSERT
      expect(passingWithViolations).toEqual(none);
      expect(failingWithout).toEqual(none);
    });

    it('names a Rule the config declares in every frozen finding', () => {
      // ARRANGE
      const declared = rules.map((rule) => rule.ruleId);
      // ACT
      const named = [...new Set(Object.values(frozen).map((f) => f.ruleId))];
      const undeclared = named.filter((ruleId) => !declared.includes(ruleId));
      // ASSERT
      expect(undeclared).toEqual([]);
    });

    it('writes no two case paths that differ only by case', () => {
      // A case-insensitive checkout would fold two such files into one.
      // ARRANGE
      const none: readonly string[] = [];
      // ACT
      const folded = corpus.map((path) => path.toLowerCase());
      const colliding = corpus.filter((_, index) => folded.indexOf(folded[index]) !== index);
      // ASSERT
      expect(colliding).toEqual(none);
    });
  });

  describe('edge cases', () => {
    it('enumerates every Conformance case the suite declares', () => {
      // Stated by hand in the tier record, never counted back off the tree.
      // ARRANGE
      const declaredCases = TIER.caseCount;
      // ACT
      const enumerated = corpus.length;
      // ASSERT
      expect(enumerated).toBe(declaredCases);
    });

    it('tallies the verdicts and violations the spec states', () => {
      // #221's expected counts, as #225 and then #227 extend them: 128 PASSES, 149 FAILS, 18 UNGOVERNED, 172 violations.
      // ARRANGE
      const expected = { passes: 128, fails: 149, ungoverned: 18, violations: 172 };
      // ACT
      const actual = {
        passes: stated(PASSES).length,
        fails: stated(FAILS).length,
        ungoverned: stated(UNGOVERNED).length,
        violations: Object.values(frozen).reduce((sum, f) => sum + f.violations.length, 0),
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
        // #227: the nested items of three section-content cases. An editor that stripped an
        // indent would turn a nested list into a second one and move a verdict with every check green.
        nestedInOrdered: ['   - A bullet inside it.', '   - Another.', '   1. A numbered item inside it.'],
        looseParagraph: ['   More about the first.'],
        nestedInBullets: ['  1. A numbered item inside it.', '  2. Another.'],
      };
      const bytes = (path: string): Buffer => readFileSync(join(CORPUS_ROOT, path));
      const linesOf = (path: string): string[] => bytes(path).toString('utf8').split('\n');
      const crlf = bytes('docs/recognition/crlf.md').toString('utf8');
      // ACT
      const actual = {
        leadingBytes: [...bytes('docs/research/bom-frontmatter.md').subarray(0, expected.leadingBytes.length)],
        findingsLine: linesOf('docs/research/title-trailing-spaces.md').find((line) => line.startsWith('## F')),
        extraLeadingSpace: linesOf('docs/research/title-extra-leading-space.md').find((line) =>
          line.includes('Findings'),
        ),
        sourceLine: linesOf('docs/research/prefix-bare.md').find((line) => line.startsWith('## S')),
        doubleSpaceLine: linesOf('docs/research/prefix-double-space.md').find((line) => line.startsWith('## S')),
        suffixLine: linesOf('docs/suffix/trailing-space.md').find((line) => line.startsWith('# Q')),
        astralLine: linesOf('docs/length/emoji.md').find((line) => line.startsWith('# ')),
        indentedCode: linesOf('docs/recognition/indented-code.md').filter((line) => line.startsWith('    ')),
        indentFourAfterText: linesOf('docs/recognition/indent-four-after-text.md').find((line) =>
          line.startsWith('    '),
        ),
        indentThree: linesOf('docs/recognition/indent-three.md').filter((line) => line.startsWith('   ##')),
        titleLine: linesOf('docs/recognition/tab-after-hash.md').find((line) => line.endsWith('Title')),
        emptyHeadings: linesOf('docs/recognition/empty-h2-twice.md').filter((line) => /^##\s*$/u.test(line)),
        bareLineFeeds: crlf.split('\n').length - crlf.split('\r\n').length,
        lastBytes: crlf.slice(-expected.lastBytes.length),
        nestedInOrdered: linesOf('docs/section-kinds/ordered-nested.md').filter((line) => line.startsWith('   ')),
        looseParagraph: linesOf('docs/section-kinds/ordered-loose.md').filter((line) => line.startsWith('   ')),
        nestedInBullets: linesOf('docs/section-kinds/bullets-nested-ordered.md').filter((line) =>
          line.startsWith('  '),
        ),
      };
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

// ---------------------------------------------------------------------------
// The specification half: each case asked alone, against what it states.
// ---------------------------------------------------------------------------

describe('the tool answers each body-structure case as it states', () => {
  describe('success cases', () => {
    it.each(stated(PASSES))('passes %s under the Rule it names, with no violation', (path) => {
      // A PASSES case must be GOVERNED and carry nothing, and its frozen finding
      // names the Rule that won it — the marker alone cannot.
      // ARRANGE
      const expected = statedAnswer(path);
      // ACT
      const actual = answerFor(path);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it.each(stated(FAILS))('fails %s under the Rule it names, with exactly its frozen violations', (path) => {
      // ARRANGE
      const expected = statedAnswer(path);
      // ACT
      const actual = answerFor(path);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it.each(stated(UNGOVERNED))('never governs %s, so its real faults go unreported', (path) => {
      // ARRANGE
      const expected = statedAnswer(path);
      // ACT
      const actual = answerFor(path);
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
// The verbatim case (#227): `GEN-001` byte for byte.
//
// A byte-identical copy cannot carry the `expect` marker ARCH-002 §2.1 requires in every
// case under `docs/`, so the copy is held outside `docs/` and outside `.md`, in
// `verbatim/`, and `verbatim-cases.json` states what the tier's config must answer for it.
// It is asked exactly as a case is: alone, in a root of its own, at the path the entry's key
// names. It does NOT read `.archgate/`: the corpus is the portable specification and
// adopters never receive that directory.
// ---------------------------------------------------------------------------

/** The verbatim cases, beside the config. */
const VERBATIM_FILE = 'verbatim-cases.json';

interface VerbatimCase extends Finding {
  readonly stored: string;
  readonly source: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly verdict: string;
}

const verbatimCases = JSON.parse(readTierText(VERBATIM_FILE)) as Record<string, VerbatimCase>;

const storedBytes = (path: string): Buffer => readFileSync(join(CORPUS_ROOT, verbatimCases[path].stored));

/** Ask one verbatim case alone: its stored bytes at its own path, in a root holding nothing else. */
async function answerVerbatim(path: string, index: number): Promise<CaseAnswer> {
  const root = join(scratch, `verbatim-${index}`);
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), storedBytes(path));
  return answerSeeded(root);
}

describe('the tool answers the verbatim body-structure case as it states', () => {
  describe('success cases', () => {
    it.each(Object.keys(verbatimCases))(
      'answers %s under the Rule it names, with the violations it states',
      async (path) => {
        // ARRANGE
        const stated = verbatimCases[path];
        const expected = { verdict: stated.verdict, finding: { ruleId: stated.ruleId, violations: stated.violations } };
        // ACT
        const actual = await answerVerbatim(path, Object.keys(verbatimCases).indexOf(path));
        // ASSERT
        expect(actual).toEqual(expected);
      },
    );
  });

  describe('failure cases', () => {
    it.each(Object.keys(verbatimCases))(
      'holds the stored bytes of %s to the length and hash the entry states',
      (path) => {
        // An edit to the copy goes red here, before any tool is asked.
        // ARRANGE
        const stated = verbatimCases[path];
        const expected = { bytes: stated.bytes, sha256: stated.sha256 };
        // ACT
        const stored = storedBytes(path);
        const actual = { bytes: stored.length, sha256: createHash('sha256').update(stored).digest('hex') };
        // ASSERT
        expect(actual).toEqual(expected);
      },
    );
  });

  describe('edge cases', () => {
    it('never enumerates a stored file as a case, which is what the .verbatim name is for', () => {
      // ARRANGE
      const stored = Object.values(verbatimCases).map((entry) => entry.stored);
      // ACT
      const enumerated = stored.filter((file) => corpus.includes(file));
      // ASSERT
      expect(enumerated).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// The whole tier at the process boundary: --check, --audit, --query, --assess.
// ---------------------------------------------------------------------------

/** The `--audit` rows #221 freezes for this tier, in config order. */
const AUDIT_ROWS = [
  { ruleId: 'index-pages', won: 3, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'decision-records', won: 9, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'research-reports', won: 32, shadowed: 1, shadowedBy: ['index-pages'], excluded: 1 },
  { ruleId: 'research-notes', won: 3, shadowed: 0, shadowedBy: [], excluded: 0 },
  {
    ruleId: 'research-untyped',
    won: 12,
    shadowed: 36,
    shadowedBy: ['index-pages', 'research-reports', 'research-notes'],
    excluded: 0,
  },
  { ruleId: 'guides', won: 3, shadowed: 1, shadowedBy: ['research-untyped'], excluded: 0 },
  { ruleId: 'changelogs', won: 3, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'recognition', won: 24, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'open-template', won: 4, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'plural-names', won: 3, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'triple-plural', won: 4, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'depth-only', won: 5, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'steps', won: 8, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'pairs', won: 3, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'free-sections', won: 4, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'kinds', won: 5, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'windowed', won: 9, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'swallow', won: 5, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'anonymous-pair', won: 3, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'suffix-titles', won: 4, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'sentence-titles', won: 3, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'short-titles', won: 6, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'substring-titles', won: 3, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'closed-set', won: 4, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'loose-alternation', won: 3, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'escaped-literals', won: 3, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'raw-markup', won: 2, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'setext-lines', won: 2, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'no-dotall', won: 2, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'no-multiline', won: 2, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'empty-heading', won: 2, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'closed-record', won: 9, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'closed-levels', won: 5, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'closed-sources', won: 5, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'open-sources', won: 2, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'closed-bare', won: 2, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'vocab-changelog', won: 13, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'vocab-closed', won: 4, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'vocab-levels', won: 3, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'vocab-depth', won: 2, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'section-kinds', won: 29, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'section-steps', won: 4, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'section-nested', won: 3, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'section-closed', won: 4, shadowed: 0, shadowedBy: [], excluded: 0 },
  { ruleId: 'adr-contract', won: 14, shadowed: 0, shadowedBy: [], excluded: 0 },
];

/** The `--query` candidates #221 freezes, per path asked, in order. */
const QUERY_CANDIDATES: readonly (readonly [string, readonly string[]])[] = [
  ['docs/research/anything.md', ['research-reports', 'research-notes', 'research-untyped']],
  ['docs/research/index.md', ['index-pages']],
  ['docs/research/scratch.md', ['research-notes', 'research-untyped']],
  ['docs/decisions/new.md', ['decision-records', 'guides']],
  ['docs/elsewhere/x.md', ['guides']],
  ['docs/releases/CHANGELOG.md', ['guides', 'changelogs']],
  ['docs/recognition/x.md', ['guides', 'recognition']],
  ['docs/manual/x.md', ['guides', 'open-template']],
  ['docs/research/deep/report.md', ['guides']],
  ['docs/tp/two/b.md', ['guides', 'triple-plural']],
  ['docs/names/GUIDE.md', ['guides', 'plural-names']],
  ['docs/steps/new.md', ['guides', 'steps']],
  ['docs/closed-record/x.md', ['guides', 'closed-record']],
  ['docs/open-sources/x.md', ['guides', 'open-sources']],
  ['docs/closed-bare/x.md', ['guides', 'closed-bare']],
  ['docs/vocab-changelog/x.md', ['guides', 'vocab-changelog']],
  ['docs/vocab-levels/x.md', ['guides', 'vocab-levels']],
  ['docs/section-kinds/x.md', ['guides', 'section-kinds']],
  ['docs/adr/x.md', ['guides', 'adr-contract']],
];

/** A Rule's selector as written: an axis it never wrote is left out entirely. */
function selectorOf(rule: RuleSpec): Record<string, readonly string[]> {
  const axes = { folders: rule.folders, fileNames: rule.fileNames, types: rule.types };
  return Object.fromEntries(Object.entries(axes).filter(([, tokens]) => tokens !== undefined)) as Record<
    string,
    readonly string[]
  >;
}

/** A candidate block, its requirements copied verbatim from the Rule, an omitted key staying omitted. */
function candidateBlock(ruleId: string): unknown {
  const rule = ruleNamed(ruleId);
  const written = {
    types: rule.types,
    maxLevel: rule.maxLevel,
    undefinedHeadings: rule.undefinedHeadings,
    vocabulary: rule.vocabulary,
    headings: rule.headings,
  };
  const requirements = Object.fromEntries(Object.entries(written).filter(([, value]) => value !== undefined));
  return { module: MODULE, rule: { ruleId: rule.ruleId, intent: rule.intent }, requirements };
}

/**
 * The instant handed to `--assess`. This tier carries no `assess:` marker and its
 * tier record states no instant (#221), because the Module makes no freshness
 * claim; `--now` is supplied only so that no clock is read. The answer below is
 * the same at every instant.
 */
const ASSESSMENT_INSTANT = '2026-12-01T00:00:00Z';

describe('the tool answers for the whole body-structure tier', () => {
  describe('success cases', () => {
    it('loads the tier config through the declared Module set, naming the body-structure Module alone', () => {
      // ARRANGE
      const expected = { faults: [], modules: [MODULE] };
      // ACT
      const loaded = loadConfig(IN_PROCESS_CONFIG, MODULE_SET);
      const modules = MODULE_SET.filter((module) => loaded.config?.sectionFor(module) !== undefined).map(
        (module) => module.key,
      );
      const actual = { faults: loaded.faults, modules };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('answers, through the port, a governed list equal to the frozen key set and every frozen failing finding', () => {
      // #221's frozen-findings paragraph, at the in-process seam: the Module's
      // governed list equals the key set, and each failing file's winner and
      // violations deep-equal its entry. A PASSES file carries no finding in a
      // `ModuleCheck`, so its winner is held by the per-case suite above.
      // ARRANGE
      const expected = {
        governed: Object.keys(frozen).sort(),
        files: [...stated(FAILS)].sort().map((path) => ({ path, ...frozen[path] })),
      };
      // ACT
      const actual = inProcessCheck();
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports every failing file once, in code-unit order, under the Rule that won it', () => {
      // ARRANGE
      const expected = {
        refusal: undefined,
        files: [...stated(FAILS)].sort().map((path) => ({
          path,
          modules: [
            {
              module: MODULE,
              ruleId: frozen[path].ruleId,
              ruleIntent: ruleNamed(frozen[path].ruleId).intent,
              violations: frozen[path].violations,
            },
          ],
        })),
      };
      // ACT
      const actual = { refusal: refusalOf(tierCheck), files: envelopeOf(tierCheck).result?.files };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it.each(QUERY_CANDIDATES)('answers --query %s with every candidate Rule in config order', async (path, ids) => {
      // ARRANGE
      const expected = { refusal: undefined, governance: 'governed', modules: ids.map(candidateBlock) };
      const answered = 0;
      // ACT
      const run = await mh(['--query', path, '--config', TYPED_CONFIG]);
      const result = envelopeOf(run).result;
      const actual = { refusal: refusalOf(run), governance: result?.governance, modules: result?.modules };
      // ASSERT
      expect(actual).toEqual(expected);
      expect(run.code).toBe(answered);
    });
  });

  describe('failure cases', () => {
    it('exits 1 on the tier and counts what the markers and the frozen findings state', () => {
      // ARRANGE
      const expected = {
        code: 1,
        refusal: undefined,
        summary: { governedFiles: 277, invalidFiles: 149, totalViolations: 172 },
      };
      // ACT
      const actual = {
        code: tierCheck.code,
        refusal: refusalOf(tierCheck),
        summary: envelopeOf(tierCheck).result?.summary,
      };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it.each(['docs/research/report-pass.md', 'docs/research/report-h4-no-h1.md', 'docs/upper/INDEX.md'])(
      'answers --assess %s as ungoverned, because this Module passes every path by',
      async (path) => {
        // A known imprecision, not a claim that the file is
        // outside every Rule: this Module makes no freshness claim, so a file it
        // governs reads `ungoverned` in an Assessment all the same.
        // ARRANGE
        const expected = { code: 0, refusal: undefined, agentAction: 'PROCEED', state: 'ungoverned' };
        // ACT
        const run = await mh(['--assess', path, '--config', TIER.configFile, '--now', ASSESSMENT_INSTANT], CORPUS_ROOT);
        const result = envelopeOf(run).result;
        const actual = {
          code: run.code,
          refusal: refusalOf(run),
          agentAction: result?.agentAction,
          state: result?.state,
        };
        // ASSERT
        expect(actual).toEqual(expected);
      },
    );
  });

  describe('edge cases', () => {
    it('audits beside the first Module, whose block is empty because this tier writes no frontmatter section', () => {
      // 0010: an audit includes every declared Module, so a config that writes
      // no `frontmatter:` section still answers an empty block for it.
      // ARRANGE
      const expected = { refusal: undefined, blocks: [{ module: 'frontmatter', rules: [] }] };
      // ACT
      const blocks = (envelopeOf(tierAudit).result?.modules ?? []).filter((block) => block.module !== MODULE);
      const actual = { refusal: refusalOf(tierAudit), blocks };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('audits the forty-five Rules in config order, so a shadowed or excluded file is visible', () => {
      // ARRANGE
      const expected = {
        code: 0,
        refusal: undefined,
        blocks: [
          {
            module: MODULE,
            rules: AUDIT_ROWS.map(({ ruleId, ...tally }) => ({
              rule: { ruleId, selector: selectorOf(ruleNamed(ruleId)), intent: ruleNamed(ruleId).intent },
              ...tally,
            })),
          },
        ],
      };
      // ACT
      const blocks = (envelopeOf(tierAudit).result?.modules ?? []).filter((block) => block.module === MODULE);
      const actual = { code: tierAudit.code, refusal: refusalOf(tierAudit), blocks };
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

// ---------------------------------------------------------------------------
// The hand-written tables above, held to the config and to each other. No tool
// asked, so a wrong table is red here on its own rather than only through the
// tool-asking tests that read it.
// ---------------------------------------------------------------------------

/** Where `ruleId` sits in the config, or -1 when the config declares no such Rule. */
const configIndexOf = (ruleId: string): number => rules.findIndex((rule) => rule.ruleId === ruleId);

/** `ids` minus every one already in config order, so an empty answer means ordered. */
const outOfConfigOrder = (ids: readonly string[]): readonly string[] =>
  ids.filter((ruleId, index) => index > 0 && configIndexOf(ruleId) <= configIndexOf(ids[index - 1]));

describe('the hand-written audit and query tables agree with the tier config', () => {
  describe('success cases', () => {
    it('agrees with the frozen audit on how many files each Rule wins', () => {
      // The spec's audit table and its per-case winners were written apart, so
      // this is the one place they are held to each other.
      // ARRANGE
      const expected = Object.fromEntries(AUDIT_ROWS.map((row) => [row.ruleId, row.won]));
      // ACT
      const actual = Object.fromEntries(
        rules.map((rule) => [rule.ruleId, Object.values(frozen).filter((f) => f.ruleId === rule.ruleId).length]),
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('audits exactly the Rules the config declares, one row each, in config order', () => {
      // ARRANGE
      const declared = rules.map((rule) => rule.ruleId);
      // ACT
      const audited = AUDIT_ROWS.map((row) => row.ruleId);
      // ASSERT
      expect(audited).toEqual(declared);
    });

    it('sums the won column to the governed count the markers state', () => {
      // #221: "The `won` column sums to 178, the governed count".
      // ARRANGE
      const governed = stated(PASSES).length + stated(FAILS).length;
      // ACT
      const won = AUDIT_ROWS.reduce((sum, row) => sum + row.won, 0);
      // ASSERT
      expect(won).toBe(governed);
    });
  });

  describe('failure cases', () => {
    it('names only Rules the config declares, in every query candidate and every shadowedBy list', () => {
      // A misspelled Rule ID would otherwise surface only as `ruleNamed`
      // throwing inside a tool-asking test, or not at all.
      // ARRANGE
      const none: readonly string[] = [];
      // ACT
      const named = [...QUERY_CANDIDATES.flatMap(([, ids]) => ids), ...AUDIT_ROWS.flatMap((row) => row.shadowedBy)];
      const undeclared = [...new Set(named.filter((ruleId) => configIndexOf(ruleId) < 0))];
      // ASSERT
      expect(undeclared).toEqual(none);
    });

    it('shadows a Rule only by Rules ahead of it, listed in config order, and only when it counts a shadowed file', () => {
      // First-match: only an earlier Rule can win a file a later one also
      // matches. A row counting shadowed files names at least one shadower,
      // and a row counting none names none.
      // ARRANGE
      const consistent: readonly string[] = [];
      // ACT
      const broken = AUDIT_ROWS.filter(
        (row) =>
          row.shadowedBy.some((ruleId) => configIndexOf(ruleId) >= configIndexOf(row.ruleId)) ||
          outOfConfigOrder(row.shadowedBy).length > 0 ||
          row.shadowed > 0 !== row.shadowedBy.length > 0 ||
          row.shadowedBy.length > row.shadowed,
      ).map((row) => row.ruleId);
      // ASSERT
      expect(broken).toEqual(consistent);
    });
  });

  describe('edge cases', () => {
    it('lists every query answer in config order, ending at the first candidate that writes no types', () => {
      // ARRANGE
      const consistent: readonly string[] = [];
      // ACT
      const broken = QUERY_CANDIDATES.filter(
        ([, ids]) =>
          ids.length === 0 ||
          outOfConfigOrder(ids).length > 0 ||
          ids.slice(0, -1).some((ruleId) => ruleNamed(ruleId).types === undefined),
      ).map(([path]) => path);
      // ASSERT
      expect(broken).toEqual(consistent);
    });

    it('excludes exactly the one file the spec names, from the one Rule whose excludeFiles removes it', () => {
      // #221: the one `excluded` is `docs/research/scratch.md`, which
      // `research-reports` matches on all three axes and its own `excludeFiles` removes.
      // ARRANGE
      const expected = [{ ruleId: 'research-reports', excluded: 1, writesExcludeFiles: true }];
      // ACT
      const actual = AUDIT_ROWS.filter((row) => row.excluded > 0).map((row) => ({
        ruleId: row.ruleId,
        excluded: row.excluded,
        writesExcludeFiles: ruleNamed(row.ruleId).excludeFiles !== undefined,
      }));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
