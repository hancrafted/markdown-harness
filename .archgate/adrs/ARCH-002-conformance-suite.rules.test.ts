/// <reference path="../rules.d.ts" />

// Sibling test for ARCH-002-conformance-suite.rules.ts — pass path plus the
// three fail paths named in the ADR's acceptance criteria: a missing marker,
// a duplicate marker, and an unknown verdict.

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

const CASE_PATH = 'fixtures/conformance/docs/reference/labels.md';

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

  it('ignores files outside fixtures/conformance/docs/', async () => {
    // ARRANGE
    const files = {
      'fixtures/conformance/valid-test-config.yaml': 'frontmatter:\n  rules: []\n',
    };
    const { ctx, violations } = makeCtx(files);
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });
});
