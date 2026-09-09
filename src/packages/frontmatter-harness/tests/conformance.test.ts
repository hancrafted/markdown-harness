// The Conformance suite, under `fixtures/conformance/`, doing both of its jobs.
//
// COVERAGE: every key in the config vocabulary is exercised somewhere, and the
// config obeys the config-validity rules the validator enforces. When the
// vocabulary grows, this fails until the suite grows with it.
//
// SPECIFICATION: every Conformance case states its own expected outcome in an
// `<!-- expect: -->` marker, and the last suite in this file holds the
// implementation to it. That half could not exist before `--check` did; the
// coverage half above ran alone until then.
//
// ARCH-002 makes a changed marker a CONTRACT CHANGE rather than a test fix, so
// a failure here is answered by reading the case's reasoning paragraph and
// deciding which of the two is wrong — never by editing the marker to agree
// with the code.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import type { AllowedValue, FieldConstraints, Format, MarkdownHarnessConfig } from '../../config-contract/index.ts';
import { listMarkdownFiles } from '../../markdown-file-tree/list-markdown-files.ts';
import { assessPath } from '../assess.ts';
import { checkCorpus } from '../check.ts';
import { queryPath } from '../query.ts';

const CONFIG_URL = new URL('../../../../fixtures/conformance/valid-test-config.yaml', import.meta.url);
const config = parse(readFileSync(CONFIG_URL, 'utf8')) as MarkdownHarnessConfig;
const rules = config.frontmatter?.rules ?? [];

/** Every key a rule may carry. Grows only by deliberate amendment. */
const RULE_KEYS = [
  'ruleId',
  'path',
  'fileName',
  'excludeFiles',
  'intent',
  'frontmatter',
  'fields',
  'unknownKeys',
  'exactlyOneOf',
  'anyOf',
  'allOf',
  'assess',
] as const;

/** Every key a field constraint may carry. */
const CONSTRAINT_KEYS = [
  'presence',
  'minLength',
  'maxLength',
  'format',
  'pattern',
  'minItems',
  'maxItems',
  'itemMaxLength',
  'allowed',
  'intent',
] as const;

/**
 * What a rule may still carry alongside `frontmatter: forbidden`. Everything else
 * in `RULE_KEYS` is payload, derived rather than listed again — so a payload key
 * added above is covered here without a second edit.
 */
const NON_PAYLOAD_KEYS: readonly string[] = ['ruleId', 'path', 'fileName', 'excludeFiles', 'intent', 'frontmatter'];
const PAYLOAD_KEYS = RULE_KEYS.filter((key) => !NON_PAYLOAD_KEYS.includes(key));

/** Every key one `allowed` entry may carry. */
const ALLOWED_ENTRY_KEYS: readonly string[] = ['value', 'intent'];

const FORMATS: Format[] = ['datetime', 'uri', 'actor'];

function everyRuleKey(): Set<string> {
  const seen = new Set<string>();
  for (const rule of rules) for (const key of Object.keys(rule)) seen.add(key);
  return seen;
}

function everyConstraint(): FieldConstraints[] {
  return rules.flatMap((rule) => Object.values(rule.fields ?? {}));
}

function everyConstraintKey(): Set<string> {
  const seen = new Set<string>();
  for (const constraint of everyConstraint()) for (const key of Object.keys(constraint)) seen.add(key);
  return seen;
}

function everyAllowedValue(): AllowedValue[] {
  return everyConstraint().flatMap((constraint) => constraint.allowed ?? []);
}

function everyFieldAddress(): string[] {
  return rules.flatMap((rule) => Object.keys(rule.fields ?? {}));
}

describe('valid-test-config.yaml is a complete test surface', () => {
  describe('success cases', () => {
    it('parses into exactly one module section', () => {
      // ARRANGE
      const expected = ['frontmatter'];
      // ACT
      const actual = Object.keys(config);
      // ASSERT
      expect(actual).toEqual(expected);
      expect(rules.length).toBeGreaterThan(0);
    });

    it.each(RULE_KEYS)('exercises the rule key %s', (key) => {
      // ARRANGE
      const keysInConfig = everyRuleKey();
      // ACT
      const seen = [...keysInConfig];
      // ASSERT
      expect(seen).toContain(key);
    });

    it.each(CONSTRAINT_KEYS)('exercises the constraint %s', (key) => {
      // ARRANGE
      const constraints = everyConstraint();
      // ACT
      const seen = constraints.flatMap((constraint) => Object.keys(constraint));
      // ASSERT
      expect(seen).toContain(key);
    });

    it.each(ALLOWED_ENTRY_KEYS)('exercises the allowed-entry key %s', (key) => {
      // The allowed-entry tier had a closure assertion and no coverage loop, so
      // an entry key could have gone unreached while the suite still called
      // itself complete. ARCH-002 §1.2 names this tier alongside the other
      // three; §3.1 requires every one of them be reached.
      // ARRANGE
      const entries = everyAllowedValue();
      // ACT
      const seen = entries.flatMap((entry) => Object.keys(entry));
      // ASSERT
      expect(seen).toContain(key);
    });

    it.each(FORMATS)('exercises the named format %s', (format) => {
      // ARRANGE
      const constraints = everyConstraint();
      // ACT
      const seen = constraints.flatMap((constraint) => constraint.format ?? []);
      // ASSERT
      expect(seen).toContain(format);
    });
  });

  describe('failure cases', () => {
    it('carries no rule key outside the vocabulary', () => {
      // ARRANGE
      const known: readonly string[] = RULE_KEYS;
      // ACT
      const unknown = [...everyRuleKey()].filter((key) => !known.includes(key));
      // ASSERT
      expect(unknown).toEqual([]);
    });

    it('carries no allowed-entry key outside the vocabulary', () => {
      // The assertion that was missing while five intents sat truncated. An
      // unquoted YAML flow scalar splits on its own commas, so
      // `{ value: log, intent: A history, newest first. }` yields a halved
      // `intent` and a null key named after the tail. Every presence check
      // still passes, which is exactly why presence checks were not enough.
      // ARRANGE
      const known = ALLOWED_ENTRY_KEYS;
      // ACT
      const unknown = everyAllowedValue().flatMap((entry) => Object.keys(entry).filter((key) => !known.includes(key)));
      // ASSERT
      expect(unknown).toEqual([]);
    });

    it('names no format outside the vocabulary', () => {
      // The named-format tier had a coverage loop and no closure assertion, so
      // `format: datetiem` would have failed nothing here — the constraint-key
      // closure test sees the KEY `format`, never its value. Only three formats
      // exist, and a fourth is a deliberate amendment.
      // ARRANGE
      const known: readonly string[] = FORMATS;
      // ACT
      const unknown = everyConstraint()
        .flatMap((constraint) => constraint.format ?? [])
        .filter((format) => !known.includes(format));
      // ASSERT
      expect(unknown).toEqual([]);
    });

    it('carries no constraint key outside the vocabulary', () => {
      // ARRANGE
      const known: readonly string[] = CONSTRAINT_KEYS;
      // ACT
      const unknown = [...everyConstraintKey()].filter((key) => !known.includes(key));
      // ASSERT
      expect(unknown).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('reaches both nesting depths', () => {
      // ARRANGE
      const listEntry = 'list entry';
      const mappingKey = 'mapping key';
      const topLevel = 'top level';
      // ACT
      const depths = everyFieldAddress().map((address) => {
        if (address.includes('[].')) return listEntry;
        return address.includes('.') ? mappingKey : topLevel;
      });
      // ASSERT
      expect(depths).toContain(listEntry);
      expect(depths).toContain(mappingKey);
    });

    it('addresses a list and its entries separately', () => {
      // ARRANGE
      const list = 'sources';
      const entryField = 'sources[].resource';
      // ACT
      const addresses = new Set(everyFieldAddress());
      // ASSERT
      expect(addresses).toContain(list);
      expect(addresses).toContain(entryField);
    });
  });
});

describe('valid-test-config.yaml obeys the config-validity rules', () => {
  describe('success cases', () => {
    it('gives every rule exactly one selector', () => {
      // ARRANGE
      const selectorKeys = ['path', 'fileName'];
      // ACT
      const counts = rules.map((rule) => selectorKeys.filter((key) => key in rule).length);
      // ASSERT
      for (const count of counts) expect(count).toBe(1);
    });

    it('gives every rule a ruleId', () => {
      // ARRANGE
      const ids = rules.map((rule) => rule.ruleId);
      // ACT
      const missing = ids.filter((id) => !id);
      // ASSERT
      expect(missing).toEqual([]);
    });

    it('gives every rule an intent', () => {
      // ARRANGE
      const intents = rules.map((rule) => rule.intent);
      // ACT
      const missing = intents.filter((intent) => !intent);
      // ASSERT
      expect(missing).toEqual([]);
    });

    it('gives every pattern a sibling intent', () => {
      // ARRANGE
      const patterned = everyConstraint().filter((constraint) => 'pattern' in constraint);
      // ACT
      const missing = patterned.filter((constraint) => !constraint.intent);
      // ASSERT
      expect(missing).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('gives no two rules the same ruleId', () => {
      // ARRANGE
      const ids = rules.map((rule) => rule.ruleId);
      // ACT
      const repeated = ids.filter((id, index) => ids.indexOf(id) !== index);
      // ASSERT
      expect(repeated).toEqual([]);
    });

    it('leaves a frontmatter-forbidden rule with no payload', () => {
      // ARRANGE
      const forbidding = rules.filter((rule) => 'frontmatter' in rule);
      const forbidden = 'forbidden';
      // ACT
      const withPayload = forbidding.flatMap((rule) => PAYLOAD_KEYS.filter((key) => key in rule));
      // ASSERT
      for (const rule of forbidding) expect(rule.frontmatter).toBe(forbidden);
      expect(withPayload).toEqual([]);
    });

    it('spells every allowed entry as a record, never a bare string', () => {
      // ARRANGE
      const entries = everyAllowedValue();
      const recordType = 'object';
      const valueKey = 'value';
      // ACT
      const types = entries.map((entry) => typeof entry);
      // ASSERT
      for (const type of types) expect(type).toBe(recordType);
      for (const entry of entries) expect(entry).toHaveProperty(valueKey);
    });

    it('rejects an intent that is present but empty', () => {
      // ARRANGE
      const carriers = [...everyConstraint(), ...everyAllowedValue()].filter((carrier) => 'intent' in carrier);
      // ACT
      const empty = carriers.filter((carrier) => !carrier.intent);
      // ASSERT
      expect(empty).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('derives the type vocabulary from the union of allowed values', () => {
      // The Floor is gone: no top-level ceiling and no rule-level `types:`. `type`
      // is an ordinary field, so the repo's vocabulary is implicit rather than
      // declared — derivable for reporting, no longer stated in one place.
      // ARRANGE
      const retiredKey = 'types';
      // ACT
      const ceilingCarriers = rules.filter((rule) => retiredKey in rule).map((rule) => rule.intent);
      const vocabulary = new Set(
        (rules.flatMap((rule) => rule.fields?.type?.allowed ?? []) as AllowedValue[]).map((entry) => entry.value),
      );
      // ASSERT
      expect(ceilingCarriers).toEqual([]);
      expect(vocabulary.size).toBeGreaterThan(1);
    });
  });
});

// ---------------------------------------------------------------------------
// The specification half: each case's stated verdict, against what runs.
// ---------------------------------------------------------------------------

/** The synthetic repo root the config's paths are written relative to. */
const CORPUS_ROOT = fileURLToPath(new URL('../../../../fixtures/conformance', import.meta.url));

/** The three verdicts a Conformance case may state (ARCH-002 §2.1). */
const PASSES = 'PASSES';
const FAILS = 'FAILS';
const UNGOVERNED = 'UNGOVERNED';

const MARKER = /<!-- expect: (\w+) -->/g;

/**
 * The verdict one case states.
 *
 * Throws rather than defaulting: a case with no marker, or with two, is a
 * broken contract and not a file to quietly skip. `expect-marker` already
 * rejects both, so reaching here means the rule did not run.
 */
function verdictOf(path: string): string {
  const body = readFileSync(new URL(`../../../../fixtures/conformance/${path}`, import.meta.url), 'utf8');
  const found = [...body.matchAll(MARKER)].map((match) => match[1]);
  if (found.length !== 1) throw new Error(`${path} must carry exactly one expect marker, found ${found.length}`);
  return found[0];
}

const corpus = listMarkdownFiles(CORPUS_ROOT) ?? [];
const cases = corpus.map((path) => ({ path, verdict: verdictOf(path) }));
const stated = (verdict: string): string[] => cases.filter((one) => one.verdict === verdict).map((one) => one.path);

const checked = checkCorpus(CORPUS_ROOT, corpus, config);
const reported = new Set((checked?.files ?? []).map((file) => file.path));

/**
 * The verdict the IMPLEMENTATION reaches for one case.
 *
 * Reduced to the same three words the markers use, so a disagreement reads as
 * `expected 'PASSES' to be 'FAILS'` — which names what the harness actually
 * said. Comparing set membership as a boolean would report only that false is
 * not true, the same message for every possible cause.
 */
function verdictFrom(path: string): string {
  if (queryPath(path, config).governance === 'invisible') return UNGOVERNED;
  return reported.has(path) ? FAILS : PASSES;
}

describe('the harness reports the verdict each Conformance case states', () => {
  describe('success cases', () => {
    it.each(stated(PASSES))('reports %s as conforming', (path) => {
      // A PASSES case must be GOVERNED and carry nothing: a file that passed
      // because no rule looked at it would be an UNGOVERNED case instead, and
      // the two are different claims. Both are covered by comparing verdicts.
      // ARRANGE
      const expected = PASSES;
      // ACT
      const actual = verdictFrom(path);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it.each(stated(FAILS))('reports %s as violating', (path) => {
      // ARRANGE
      const expected = FAILS;
      // ACT
      const actual = verdictFrom(path);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it.each(stated(UNGOVERNED))('never governs %s, so it can carry real faults unreported', (path) => {
      // The faults in an UNGOVERNED case are real and may never be reported.
      // That is the whole of what such a case tests.
      // ARRANGE
      const expected = UNGOVERNED;
      // ACT
      const actual = verdictFrom(path);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('answers every case at once, so a disagreement names the whole corpus', () => {
      // The per-case tests above fail one file at a time. This one fails with a
      // diff of every case that disagrees, which is what a reader needs when a
      // parsing change moves several verdicts together.
      // ARRANGE
      const expected = Object.fromEntries(cases.map((one) => [one.path, one.verdict]));
      // ACT
      const actual = Object.fromEntries(cases.map((one) => [one.path, verdictFrom(one.path)]));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('exercises all three verdicts, so no branch of this suite is vacuous', () => {
      // An `it.each` over an empty list is a passing suite that asserted
      // nothing. This is what stops one of the three blocks above going silent.
      // ARRANGE
      const everyVerdict = [PASSES, FAILS, UNGOVERNED];
      // ACT
      const exercised = everyVerdict.filter((verdict) => stated(verdict).length > 0);
      // ASSERT
      expect(exercised).toEqual(everyVerdict);
    });

    it('agrees with the marker tally on how many files are governed and invalid', () => {
      // The counts and the per-file verdicts come from the same run, so this
      // catches the summary drifting from `files` — and it is stated against the
      // MARKERS rather than against the corpus size, so adding a case with no
      // marker cannot quietly satisfy it.
      // ARRANGE
      const expected = {
        governedFiles: stated(PASSES).length + stated(FAILS).length,
        invalidFiles: stated(FAILS).length,
      };
      // ACT
      const actual = { governedFiles: checked?.summary.governedFiles, invalidFiles: checked?.summary.invalidFiles };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('enumerates every Conformance case the suite declares', () => {
      // Stated by hand rather than counted back off the corpus it is checking.
      // ARCH-002 makes adding or removing a Conformance case a contract change,
      // so this number belongs to that review instead of silently agreeing with
      // whatever the tree now holds — and `corpus.length` compared against
      // anything derived from `corpus` could not fail at all.
      // ARRANGE
      const declaredCases = 37;
      // ACT
      const enumerated = corpus.length;
      // ASSERT
      expect(enumerated).toBe(declaredCases);
    });
  });
});

// ---------------------------------------------------------------------------
// The Assessment half: each case's stated agent action, against what runs.
// ---------------------------------------------------------------------------

/**
 * The instant this suite is judged against, PINNED.
 *
 * Not in `valid-test-config.yaml`, and the placement is the decision: the
 * config is the subject under test, so the instant belongs beside the runner
 * that judges it. Left to a real clock, `fresh.md` would turn `REVIEW` on the
 * day its `stale_after` passed and this suite would go red on an unchanged tree
 * — on a date nobody wrote down. Moving this constant is a contract change on
 * the same terms as moving a marker.
 */
const ASSESSMENT_INSTANT = '2026-12-01T00:00:00Z';

/** The three agent actions a Conformance case may state (ARCH-002 §4). */
const REVIEW = 'REVIEW';
const PROCEED = 'PROCEED';
const FIX_FILE = 'FIX_FILE';

const ASSESS_MARKER = /<!-- assess: (\w+) -->/g;

/**
 * The agent action one case states, or nothing if it states none.
 *
 * Absence is legal here and is not legal for `expect:`: the Assessment markers
 * cover the five states deliberately rather than exhaustively, because a
 * freshness answer is meaningless for most of this corpus. Two markers is a
 * broken contract on the same terms as two `expect:` markers, so it throws.
 */
function assessMarkerOf(path: string): string | undefined {
  const body = readFileSync(new URL(`../../../../fixtures/conformance/${path}`, import.meta.url), 'utf8');
  const found = [...body.matchAll(ASSESS_MARKER)].map((match) => match[1]);
  if (found.length > 1) throw new Error(`${path} must carry at most one assess marker, found ${found.length}`);
  return found[0];
}

const assessCases = corpus
  .map((path) => ({ path, action: assessMarkerOf(path) }))
  .filter((one): one is { path: string; action: string } => one.action !== undefined);

const marked = (action: string): string[] => assessCases.filter((one) => one.action === action).map((one) => one.path);

/** What the IMPLEMENTATION answers for one case, at the pinned instant. */
function actionFrom(path: string): string {
  return assessPath({ root: CORPUS_ROOT, path: path }, config, ASSESSMENT_INSTANT).agentAction;
}

describe('the harness reports the agent action each Conformance case states', () => {
  describe('success cases', () => {
    it.each(marked(PROCEED))('tells an agent to proceed on %s', (path) => {
      // ARRANGE
      const expected = PROCEED;
      // ACT
      const actual = actionFrom(path);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it("carries the Operator's own sentence on a stale file, verbatim, and names the block it came from", () => {
      // The one case where this tool emits prose, and it is never its own. The
      // sentence below is the `freshness` rule's `assess.stale` value, copied
      // from the config rather than reworded — if the two ever disagree, the
      // config is right and this is the contract change.
      // ARRANGE
      const verbatim = 'Re-verify this against the source before quoting it, then move stale_after.';
      const expected = { instruction: verbatim, source: 'rule' };
      // ACT
      const answered = assessPath({ root: CORPUS_ROOT, path: 'docs/freshness/stale.md' }, config, ASSESSMENT_INSTANT);
      const actual = { instruction: answered.instruction, source: answered.source };
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it.each(marked(REVIEW))('tells an agent to review %s', (path) => {
      // ARRANGE
      const expected = REVIEW;
      // ACT
      const actual = actionFrom(path);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it.each(marked(FIX_FILE))('tells an agent to repair %s', (path) => {
      // ARRANGE
      const expected = FIX_FILE;
      // ACT
      const actual = actionFrom(path);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('answers every marked case at once, so a disagreement names them together', () => {
      // ARRANGE
      const expected = Object.fromEntries(assessCases.map((one) => [one.path, one.action]));
      // ACT
      const actual = Object.fromEntries(assessCases.map((one) => [one.path, actionFrom(one.path)]));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('exercises all three agent actions, so no branch of this suite is vacuous', () => {
      // ARRANGE
      const everyAction = [REVIEW, PROCEED, FIX_FILE];
      // ACT
      const exercised = everyAction.filter((action) => marked(action).length > 0);
      // ASSERT
      expect(exercised).toEqual(everyAction);
    });

    it('states no agent action outside the vocabulary', () => {
      // Closure, not coverage: the marker set proves the SUITE reaches every
      // action, and this proves no case states one the contract does not define.
      // ARRANGE
      const known = [REVIEW, PROCEED, FIX_FILE];
      // ACT
      const unknown = assessCases.map((one) => one.action).filter((action) => !known.includes(action));
      // ASSERT
      expect(unknown).toEqual([]);
    });

    it('says nothing at all about a file no rule selects', () => {
      // The UNGOVERNED case carries a second marker, and this is what the
      // marker means beyond the action: no rule, no evidence, no sentence.
      // ARRANGE
      const expected = { agentAction: PROCEED, state: 'ungoverned' };
      // ACT
      const actual = assessPath(
        { root: CORPUS_ROOT, path: 'docs/research/vendor/upstream.md' },
        config,
        ASSESSMENT_INSTANT,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
