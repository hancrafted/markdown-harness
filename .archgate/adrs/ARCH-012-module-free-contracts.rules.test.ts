/// <reference path="../rules.d.ts" />

// Sibling test for ARCH-012-module-free-contracts.rules.ts — pass and fail path
// for each spelling of a Module the rule refuses, the comment carve-out that
// keeps prose writable, and the fail-closed answer to an unreadable Module set.

import { describe, expect, it } from 'vitest';
import ruleSet from './ARCH-012-module-free-contracts.rules';

interface Reported {
  message: string;
  file?: string;
  line?: number;
}

/** Minimal glob for the two patterns the rule asks: `<dir>/**\/*.ts`. */
function globMatches(pattern: string, file: string): boolean {
  const dir = pattern.replace('/**/*.ts', '/');
  return file.startsWith(dir) && file.endsWith('.ts');
}

function makeCtx(files: Record<string, string>) {
  const violations: Reported[] = [];
  const ctx = {
    projectRoot: '/repo',
    scopedFiles: Object.keys(files),
    changedFiles: [],
    async glob(pattern: string) {
      return Object.keys(files).filter((f) => globMatches(pattern, f));
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

/** The Module set the fixtures declare: two Modules, as the real tree has. */
const MODULE_TREE: Record<string, string> = {
  'src/packages/cli/module-set.ts': [
    "import { bodyStructureModule } from '../body-structure-harness/module.ts';",
    "import { frontmatterModule } from '../frontmatter-harness/module.ts';",
  ].join('\n'),
  'src/packages/frontmatter-harness/module.ts': "export const frontmatterModule = { key: 'frontmatter' };",
  'src/packages/body-structure-harness/module.ts': "export const bodyStructureModule = { key: 'body-structure' };",
};

/** A generic contract: the shape this record requires. */
const GENERIC_CLAIM = [
  '/** What one Module asks of a path, e.g. a frontmatter Rule or a body-structure candidate. */',
  'export interface ModuleClaim<TRequirements = unknown> {',
  '  // generic in what a claim requires, so no FrontmatterRequirements is named here',
  '  requirements: TRequirements;',
  '}',
].join('\n');

const rule = ruleSet.rules['contracts-name-no-module'];

async function checkContract(file: string, source: string) {
  const { ctx, violations } = makeCtx({ ...MODULE_TREE, [file]: source });
  await rule.check(ctx);
  return violations;
}

describe('contracts-name-no-module', () => {
  it('passes a generic contract whose comments name Modules', async () => {
    // ARRANGE
    const file = 'src/packages/response-contract/lib/query.types.ts';
    // ACT
    const violations = await checkContract(file, GENERIC_CLAIM);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('passes a Module-named type outside the contract Packages', async () => {
    // ARRANGE
    const file = 'src/packages/frontmatter-harness/lib/query/requirements.types.ts';
    // ACT
    const violations = await checkContract(file, 'export type FrontmatterRequirements = { fields: string[] };');
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('refuses a type named for a Module, at its line', async () => {
    // ARRANGE
    const file = 'src/packages/response-contract/lib/query.types.ts';
    const source = 'export interface ModuleClaim {\n  requirements: BodyStructureRequirements;\n}';
    const offendingLine = 2;
    const reason = "a type named for 'body-structure'";
    const provenance = '(ARCH-012 [contracts-name-no-module])';
    // ACT
    const violations = await checkContract(file, source);
    // ASSERT
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ file, line: offendingLine });
    expect(violations[0].message).toContain(reason);
    expect(violations[0].message).toContain(provenance);
  });

  it('refuses a Module config key written as a string literal', async () => {
    // ARRANGE
    const file = 'src/packages/config-contract/lib/fault.types.ts';
    const reason = "the Module key 'frontmatter'";
    // ACT
    const violations = await checkContract(file, "export type Owner = 'frontmatter' | 'core';");
    // ASSERT
    expect(violations.map((v) => v.message)).toEqual([expect.stringContaining(reason)]);
  });

  it("refuses a Module's code prefix", async () => {
    // ARRANGE
    const file = 'src/packages/response-contract/lib/violation.types.ts';
    const reason = "a 'frontmatter' code";
    // ACT
    const violations = await checkContract(file, "export type Code = 'FRONTMATTER__MISSING_REQUIRED_FIELD';");
    // ASSERT
    expect(violations.map((v) => v.message)).toEqual([expect.stringContaining(reason)]);
  });

  it('refuses an import reaching a Module Package', async () => {
    // ARRANGE
    const file = 'src/packages/config-contract/index.ts';
    const source = "export type { HeadingEntry } from '../body-structure-harness/section.ts';";
    const reason = "an import of 'body-structure-harness'";
    // ACT
    const violations = await checkContract(file, source);
    // ASSERT
    expect(violations.map((v) => v.message)).toEqual([expect.stringContaining(reason)]);
  });

  it('fails closed when the Module set cannot be read', async () => {
    // ARRANGE
    const { ctx, violations } = makeCtx({ 'src/packages/config-contract/index.ts': GENERIC_CLAIM });
    const reason = 'Cannot read the declared Module set';
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain(reason);
  });

  it('fails closed when a declared Module carries no readable key', async () => {
    // ARRANGE
    const { ctx, violations } = makeCtx({
      ...MODULE_TREE,
      'src/packages/frontmatter-harness/module.ts': 'export const frontmatterModule = {};',
    });
    const moduleSet = 'src/packages/cli/module-set.ts';
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations.map((v) => v.file)).toEqual([moduleSet]);
  });

  it('does not read a comment opener inside a string literal as a comment', async () => {
    // A URL in a string must not blank the rest of the line, or a violation
    // written after it would hide.
    // ARRANGE
    const file = 'src/packages/response-contract/lib/response.types.ts';
    const source = "export type Link = { href: 'https://x.test'; owner: 'body-structure' };";
    const reason = "the Module key 'body-structure'";
    // ACT
    const violations = await checkContract(file, source);
    // ASSERT
    expect(violations.map((v) => v.message)).toEqual([expect.stringContaining(reason)]);
  });
});
