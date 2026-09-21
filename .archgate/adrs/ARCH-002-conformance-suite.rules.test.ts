/// <reference path="../rules.d.ts" />

// Sibling test for ARCH-002-conformance-suite.rules.ts — pass path plus the
// three fail paths named in the ADR's acceptance criteria: a missing marker,
// a duplicate marker, and an unknown verdict.
//
// `assess-marker` is tested beside it, and its pass path includes the case
// `expect-marker` has none of: a file with NO marker at all. Absence is legal
// there and illegal here, which is the one difference between the two rules and
// the one thing a test of them both has to state.
//
// WHAT THIS FILE CANNOT PROVE. Every context below is hand-built, so its glob
// is matched against a `files` map this file wrote. That proves what the rule
// DECIDES about the files it is handed and says nothing whatever about whether
// the glob reaches the committed corpus — a glob pointed at a directory that
// no longer exists passes every test here. The reach proof is a probe against
// the real tree: move the fixtures without moving the glob, run
// `archgate check`, and read the violation. The empty-match guard tested below
// is what makes that probe produce a violation rather than a green run, and
// running it is a stated obligation of any change that moves the corpus.

import { describe, expect, it } from 'vitest';
import ruleSet from './ARCH-002-conformance-suite.rules';

interface Reported {
  message: string;
  file?: string;
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .split('**')
    .map((chunk) =>
      chunk
        .split('*')
        .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('[^/]*'),
    )
    .join('.*');
  return new RegExp(`^${escaped}$`);
}

function makeCtx(files: Record<string, string>) {
  const violations: Reported[] = [];
  const paths = Object.keys(files);
  const ctx = {
    projectRoot: '/repo',
    scopedFiles: paths,
    changedFiles: [],
    async glob(pattern: string) {
      const re = globToRegExp(pattern);
      return paths.filter((f) => re.test(f));
    },
    async readFile(path: string) {
      if (path in files) return files[path];
      throw new Error(`ENOENT: ${path}`);
    },
    report: {
      violation: (d: Reported) => violations.push(d),
      warning: () => {},
      info: () => {},
    },
  } as unknown as RuleContext;
  return { ctx, violations };
}

const CASE_PATH = 'fixtures/conformance/frontmatter/docs/reference/labels.md';

const rule = ruleSet.rules['expect-marker'];

describe('expect-marker', () => {
  it('passes when a Conformance case carries exactly one known-verdict marker', async () => {
    // ARRANGE
    const files = {
      [CASE_PATH]: `---\ntype: reference\n---\n\n<!-- expect: PASSES -->\n\nClosed key set, allowed status, well-formed slug.\n`,
    };
    const { ctx, violations } = makeCtx(files);
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('fails when a Conformance case has no expect marker', async () => {
    // ARRANGE
    const files = {
      [CASE_PATH]: `---\ntype: reference\n---\n\nClosed key set, allowed status, well-formed slug.\n`,
    };
    const { ctx, violations } = makeCtx(files);
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations.some((v) => /has no expect marker/.test(v.message))).toBe(true);
  });

  it('fails when a Conformance case carries a duplicate marker', async () => {
    // ARRANGE
    const files = {
      [CASE_PATH]: `---\ntype: reference\n---\n\n<!-- expect: PASSES -->\n\nClosed key set.\n\n<!-- expect: PASSES -->\n`,
    };
    const { ctx, violations } = makeCtx(files);
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations.some((v) => /carries 2 expect markers/.test(v.message))).toBe(true);
  });

  it('fails when a marker names an unknown verdict', async () => {
    // ARRANGE
    const files = {
      [CASE_PATH]: `---\ntype: reference\n---\n\n<!-- expect: MAYBE -->\n\nClosed key set.\n`,
    };
    const { ctx, violations } = makeCtx(files);
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations.some((v) => /unknown verdict 'MAYBE'/.test(v.message))).toBe(true);
  });

  it('carries the ARCH-002 provenance tag in its messages', async () => {
    // ARRANGE
    const provenance = '(ARCH-002 [expect-marker])';
    const files = {
      [CASE_PATH]: `---\ntype: reference\n---\n\nClosed key set.\n`,
    };
    const { ctx, violations } = makeCtx(files);
    // ACT
    await rule.check(ctx);
    const untagged = violations.filter((v) => !v.message.includes(provenance));
    // ASSERT
    expect(untagged).toEqual([]);
  });

  it("ignores a tier's config, which sits beside its docs/ rather than inside it", async () => {
    // ARRANGE
    const files = {
      'fixtures/conformance/frontmatter/valid-test-config.yaml': 'frontmatter:\n  rules: []\n',
    };
    const { ctx, violations } = makeCtx(files);
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations.some((v) => /has no expect marker/.test(v.message))).toBe(false);
  });

  it('reports a violation when the case glob matches nothing at all', async () => {
    // The hole this closes: the loop above runs over zero files and reports
    // success, so a corpus that moved out from under the glob left the gate
    // green while governing not one case. The message names the glob, because
    // the glob is what has to be corrected.
    // ARRANGE
    const files = {
      'fixtures/conformance/frontmatter/valid-test-config.yaml': 'frontmatter:\n  rules: []\n',
    };
    const { ctx, violations } = makeCtx(files);
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations.some((v) => /matched no files/.test(v.message))).toBe(true);
  });

  it('names the tier segment in the glob it reports, so the fix is the diff', async () => {
    // ARRANGE
    const tieredGlob = 'fixtures/conformance/*/docs/**/*.md';
    const { ctx, violations } = makeCtx({});
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations.map((v) => v.message).join('')).toContain(tieredGlob);
  });

  it('reports the empty glob exactly once rather than once per missing tier', async () => {
    // ARRANGE
    const onlyTheReachGuard = 1;
    const { ctx, violations } = makeCtx({});
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toHaveLength(onlyTheReachGuard);
  });

  it('does not reach a case filed one directory too high', async () => {
    // The old, tierless layout. A glob that still matched it would make the
    // split invisible: cases could be filed outside every tier and stay
    // governed, and the enrolment check would never see them.
    // ARRANGE
    const oldLayout = 'fixtures/conformance/docs/reference/labels.md';
    const files = { [oldLayout]: '---\ntype: reference\n---\n\nNo marker.\n' };
    const { ctx, violations } = makeCtx(files);
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations.some((v) => v.file === oldLayout)).toBe(false);
  });
});

const rule2 = ruleSet.rules['assess-marker'];

describe('assess-marker', () => {
  it('passes when a case carries exactly one known action', async () => {
    // ARRANGE
    const files = {
      [CASE_PATH]: `---\ntype: reference\n---\n\n<!-- expect: PASSES -->\n<!-- assess: REVIEW -->\n\nStale and conformant at once.\n`,
    };
    const { ctx, violations } = makeCtx(files);
    // ACT
    await rule2.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('passes when a case carries no assess marker at all', async () => {
    // THE DIFFERENCE FROM `expect-marker`, stated. Most of this corpus makes no
    // freshness claim, and a rule that demanded one everywhere would force a
    // claim onto every case that makes none.
    // ARRANGE
    const files = {
      [CASE_PATH]: `---\ntype: reference\n---\n\n<!-- expect: PASSES -->\n\nNo freshness claim here.\n`,
    };
    const { ctx, violations } = makeCtx(files);
    // ACT
    await rule2.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('fails when a case carries two assess markers', async () => {
    // ARRANGE
    const files = {
      [CASE_PATH]: `---\ntype: reference\n---\n\n<!-- assess: REVIEW -->\n\nBody.\n\n<!-- assess: PROCEED -->\n`,
    };
    const { ctx, violations } = makeCtx(files);
    // ACT
    await rule2.check(ctx);
    // ASSERT
    expect(violations.some((v) => /carries 2 assess markers/.test(v.message))).toBe(true);
  });

  it('fails when a marker names an action outside the closed set', async () => {
    // ARRANGE
    const files = {
      [CASE_PATH]: `---\ntype: reference\n---\n\n<!-- assess: MAYBE -->\n\nBody.\n`,
    };
    const { ctx, violations } = makeCtx(files);
    // ACT
    await rule2.check(ctx);
    // ASSERT
    expect(violations.some((v) => /unknown agent action 'MAYBE'/.test(v.message))).toBe(true);
  });

  it('carries the ARCH-002 provenance tag in its messages', async () => {
    // ARRANGE
    const provenance = '(ARCH-002 [assess-marker])';
    const files = {
      [CASE_PATH]: `---\ntype: reference\n---\n\n<!-- assess: MAYBE -->\n\nBody.\n`,
    };
    const { ctx, violations } = makeCtx(files);
    // ACT
    await rule2.check(ctx);
    const untagged = violations.filter((v) => !v.message.includes(provenance));
    // ASSERT
    expect(untagged).toEqual([]);
  });

  it('ignores files outside a tier docs/ folder', async () => {
    // `assess-marker` carries no empty-match guard: it loops the same case
    // glob as `expect-marker`, so one guard proves that glob's reach for both
    // and a second would report the same fact twice.
    // ARRANGE
    const files = {
      'fixtures/llm-wiki/demo.md': `<!-- assess: MAYBE -->\n`,
    };
    const { ctx, violations } = makeCtx(files);
    // ACT
    await rule2.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });
});
