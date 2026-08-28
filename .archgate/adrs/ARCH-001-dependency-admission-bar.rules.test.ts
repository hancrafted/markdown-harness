/// <reference path="../rules.d.ts" />

// Sibling test for ARCH-001-dependency-admission-bar.rules.ts — pass and fail
// path for the single rule, covering every refused range form named in the ADR.

import { describe, expect, it } from 'vitest';
import ruleSet from './ARCH-001-dependency-admission-bar.rules';

interface Reported {
  message: string;
  file?: string;
}

function makeCtx(files: Record<string, string>) {
  const violations: Reported[] = [];
  const ctx = {
    projectRoot: '/repo',
    scopedFiles: Object.keys(files),
    changedFiles: [],
    async glob(pattern: string) {
      return Object.keys(files).filter((f) => f === pattern);
    },
    async readFile(path: string) {
      if (path in files) return files[path];
      throw new Error(`ENOENT: ${path}`);
    },
    async readJSON(path: string) {
      return JSON.parse(files[path]);
    },
    report: {
      violation: (d: Reported) => violations.push(d),
      warning: () => {},
      info: () => {},
    },
  } as unknown as RuleContext;
  return { ctx, violations };
}

function pkgWith(dependencies: Record<string, string>, devDependencies: Record<string, string> = {}): string {
  return JSON.stringify({ name: 'x', version: '0.0.0', dependencies, devDependencies });
}

const rule = ruleSet.rules['dependency-range-form'];

describe('dependency-range-form', () => {
  it('passes an exact pin and a tilde range in dependencies', async () => {
    // ARRANGE
    const { ctx, violations } = makeCtx({
      'package.json': pkgWith({ 'pkg-a': '1.2.3', 'pkg-b': '~2.4.0' }),
    });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('passes an exact pin and a tilde range in devDependencies', async () => {
    // ARRANGE
    const { ctx, violations } = makeCtx({
      'package.json': pkgWith({}, { 'pkg-a': '1.2.3', 'pkg-b': '~2.4.0' }),
    });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('passes a prerelease exact pin and tilde range', async () => {
    // ARRANGE
    const { ctx, violations } = makeCtx({
      'package.json': pkgWith({ 'pkg-a': '1.2.3-beta.1', 'pkg-b': '~2.4.0-rc.2' }),
    });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it.each([
    ['caret range', '^1.2.3'],
    ['wildcard', '*'],
    ['latest dist-tag', 'latest'],
    ['arbitrary dist-tag', 'next'],
    ['bare comparison range', '>=1.2.3'],
    ['git URL', 'git+https://github.com/example/pkg.git'],
    ['GitHub shorthand', 'example/pkg'],
    ['file link', 'file:../local-pkg'],
    ['link protocol', 'link:../local-pkg'],
    ['x-range', '1.2.x'],
    ['range with space', '1.2.3 - 1.3.0'],
  ])('fails on %s (%s)', async (_label, range) => {
    // ARRANGE
    const { ctx, violations } = makeCtx({
      'package.json': pkgWith({ 'pkg-a': range }),
    });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations.some((v) => v.message.includes(`range '${range}'`))).toBe(true);
  });

  it('fails independently for each offending entry across both fields', async () => {
    // ARRANGE
    const offendingEntries = 2;
    const caretEntry = 'dependencies.dep-a';
    const wildcardEntry = 'devDependencies.dep-b';
    const { ctx, violations } = makeCtx({
      'package.json': pkgWith({ 'dep-a': '^1.0.0' }, { 'dep-b': '*' }),
    });
    // ACT
    await rule.check(ctx);
    const messages = violations.map((v) => v.message).join('\n');
    // ASSERT
    expect(violations).toHaveLength(offendingEntries);
    expect(messages).toContain(caretEntry);
    expect(messages).toContain(wildcardEntry);
  });

  it('does nothing when package.json is absent', async () => {
    // ARRANGE
    const { ctx, violations } = makeCtx({});
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('flags unparsable package.json without throwing', async () => {
    // ARRANGE
    const { ctx, violations } = makeCtx({ 'package.json': '{ not json' });
    // ACT
    const settled = rule.check(ctx);
    // ASSERT
    await expect(settled).resolves.toBeUndefined();
    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toMatch(/not valid JSON/);
  });

  it('flags a non-object dependencies field', async () => {
    // ARRANGE
    const { ctx, violations } = makeCtx({
      'package.json': JSON.stringify({ name: 'x', dependencies: ['pkg-a'] }),
    });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations.some((v) => /must be an object/.test(v.message))).toBe(true);
  });

  it('carries the ARCH-001 provenance tag in every message', async () => {
    // ARRANGE
    const provenance = '(ARCH-001 [dependency-range-form])';
    const { ctx, violations } = makeCtx({
      'package.json': pkgWith({ 'pkg-a': '^1.0.0' }),
    });
    // ACT
    await rule.check(ctx);
    const untagged = violations.filter((v) => !v.message.includes(provenance));
    // ASSERT
    expect(untagged).toEqual([]);
  });
});
