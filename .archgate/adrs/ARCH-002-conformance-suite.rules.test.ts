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

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import ruleSet from './ARCH-002-conformance-suite.rules';

interface Reported {
  message: string;
  file?: string;
}

// `**/` matches zero or more whole directories, as archgate's glob does, so
// `<folder>/**/*.md` reaches a case at the folder root as well as below it.
function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .split('**/')
    .join('\u0000')
    .split('**')
    .map((chunk) =>
      chunk
        .split('*')
        .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('[^/]*'),
    )
    .join('.*')
    .split('\u0000')
    .join('(?:.*/)?');
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

// ---------------------------------------------------------------------------
// Spec folders (#231): the verbatim exception, the `# Spec:` line, the key left
// of `__`, and at least one PASSES case. Hand-built contexts prove what each
// rule DECIDES; the reach tests at the end run each rule over the real tree.
// ---------------------------------------------------------------------------

const FOLDER = 'fixtures/conformance/body-structure/docs/maxLevel__depth-only';
const SPEC_CONFIG = `# Spec: A Rule that writes only maxLevel reports every heading deeper than it.\nbody-structure:\n  rules:\n    - ruleId: depth-only\n      folders: ['./']\n      intent: 'Shallow.'\n      maxLevel: 2\n`;
const PASSING = '<!-- expect: PASSES -->\n\n# Title\n';
const FAILING = '<!-- expect: FAILS -->\n\n### Deep\n';

function folderFiles(overrides: Record<string, string | undefined> = {}): Record<string, string> {
  const files: Record<string, string | undefined> = {
    [`${FOLDER}/markdown-harness.config.yaml`]: SPEC_CONFIG,
    [`${FOLDER}/passes.md`]: PASSING,
    [`${FOLDER}/deep.md`]: FAILING,
    'CONTEXT.md': '# Context\n\n**selector**:\nWhat a Rule selects by.\n',
    ...overrides,
  };
  return Object.fromEntries(Object.entries(files).filter((entry): entry is [string, string] => entry[1] !== undefined));
}

describe('expect-marker on a verbatim case', () => {
  const VERBATIM = 'fixtures/conformance/body-structure/docs/headings__real-gen-001-adr-passes';
  const manifest = (verdict: string) => JSON.stringify({ 'GEN-001-adr.md': { verdict } });

  it('passes an unmarked case its manifest lists with a known verdict', async () => {
    // ARRANGE
    const { ctx, violations } = makeCtx({
      [`${VERBATIM}/GEN-001-adr.md`]: '# GEN-001\n',
      [`${VERBATIM}/verbatim-cases.json`]: manifest('PASSES'),
    });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('fails an unmarked case no manifest lists', async () => {
    // ARRANGE
    const { ctx, violations } = makeCtx({ [`${VERBATIM}/GEN-001-adr.md`]: '# GEN-001\n' });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations.map((v) => v.file)).toEqual([`${VERBATIM}/GEN-001-adr.md`]);
  });

  it('fails a listed case whose manifest names an unknown verdict', async () => {
    // ARRANGE
    const named = "'MAYBE'";
    const { ctx, violations } = makeCtx({
      [`${VERBATIM}/GEN-001-adr.md`]: '# GEN-001\n',
      [`${VERBATIM}/verbatim-cases.json`]: manifest('MAYBE'),
    });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain(named);
  });

  it('fails a listed case that also carries a marker', async () => {
    // ARRANGE
    const reason = 'carries an expect marker';
    const { ctx, violations } = makeCtx({
      [`${VERBATIM}/GEN-001-adr.md`]: '<!-- expect: PASSES -->\n# GEN-001\n',
      [`${VERBATIM}/verbatim-cases.json`]: manifest('PASSES'),
    });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain(reason);
  });
});

describe('spec-line', () => {
  const specLine = ruleSet.rules['spec-line'];

  it('passes a folder whose config opens with a spec sentence', async () => {
    // ARRANGE
    const { ctx, violations } = makeCtx(folderFiles());
    // ACT
    await specLine.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('fails a folder whose config opens with anything else', async () => {
    // ARRANGE
    const { ctx, violations } = makeCtx(
      folderFiles({ [`${FOLDER}/markdown-harness.config.yaml`]: `# A comment\n${SPEC_CONFIG}` }),
    );
    // ACT
    await specLine.check(ctx);
    // ASSERT
    expect(violations.map((v) => v.file)).toEqual([`${FOLDER}/markdown-harness.config.yaml`]);
  });

  it('fails a folder that holds no config', async () => {
    // ARRANGE
    const { ctx, violations } = makeCtx(folderFiles({ [`${FOLDER}/markdown-harness.config.yaml`]: undefined }));
    // ACT
    await specLine.check(ctx);
    // ASSERT
    expect(violations.map((v) => v.file)).toEqual([FOLDER]);
  });

  it('fails when no spec folder is found at all', async () => {
    // ARRANGE
    const reason = 'No spec folder found';
    const { ctx, violations } = makeCtx({ 'README.md': '# Elsewhere\n' });
    // ACT
    await specLine.check(ctx);
    // ASSERT
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain(reason);
  });
});

describe('spec-folder-key', () => {
  const folderKey = ruleSet.rules['spec-folder-key'];
  const renamed = (name: string, config = SPEC_CONFIG) => {
    const folder = `fixtures/conformance/body-structure/docs/${name}`;
    return {
      folder,
      files: {
        [`${folder}/markdown-harness.config.yaml`]: config,
        [`${folder}/passes.md`]: PASSING,
        'CONTEXT.md': '# Context\n\n**selector**:\nWhat a Rule selects by.\n',
      },
    };
  };

  it('passes a folder named for a key its config writes', async () => {
    // ARRANGE
    const { ctx, violations } = makeCtx(folderFiles());
    // ACT
    await folderKey.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('passes a dotted key whose every segment the config writes', async () => {
    // ARRANGE
    const { files } = renamed('rules.maxLevel__depth-only');
    const { ctx, violations } = makeCtx(files);
    // ACT
    await folderKey.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('passes a family term CONTEXT.md defines', async () => {
    // ARRANGE
    const { files } = renamed('selector__every-axis-must-match');
    const { ctx, violations } = makeCtx(files);
    // ACT
    await folderKey.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('fails a key the config never writes and CONTEXT.md does not define', async () => {
    // ARRANGE
    const { folder, files } = renamed('minCount__depth-only');
    const { ctx, violations } = makeCtx(files);
    // ACT
    await folderKey.check(ctx);
    // ASSERT
    expect(violations.map((v) => v.file)).toEqual([folder]);
  });

  it('does not count a key written only in a comment', async () => {
    // ARRANGE
    const { folder, files } = renamed('minCount__depth-only', `${SPEC_CONFIG}# minCount: 2\n`);
    const { ctx, violations } = makeCtx(files);
    // ACT
    await folderKey.check(ctx);
    // ASSERT
    expect(violations.map((v) => v.file)).toEqual([folder]);
  });

  it('fails a folder not named <key>__<behaviour>', async () => {
    // ARRANGE
    const { folder, files } = renamed('depth-only');
    const { ctx, violations } = makeCtx(files);
    // ACT
    await folderKey.check(ctx);
    // ASSERT
    expect(violations.map((v) => v.file)).toEqual([folder]);
  });
});

describe('spec-folder-passes', () => {
  const folderPasses = ruleSet.rules['spec-folder-passes'];

  it('passes a folder holding a PASSES case', async () => {
    // ARRANGE
    const { ctx, violations } = makeCtx(folderFiles());
    // ACT
    await folderPasses.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('passes a folder whose only PASSES case is a verbatim one', async () => {
    // ARRANGE
    const { ctx, violations } = makeCtx(
      folderFiles({
        [`${FOLDER}/passes.md`]: undefined,
        [`${FOLDER}/GEN-001-adr.md`]: '# GEN-001\n',
        [`${FOLDER}/verbatim-cases.json`]: JSON.stringify({ 'GEN-001-adr.md': { verdict: 'PASSES' } }),
      }),
    );
    // ACT
    await folderPasses.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('fails a folder that states only failures and ungoverned cases', async () => {
    // ARRANGE
    const { ctx, violations } = makeCtx(
      folderFiles({ [`${FOLDER}/passes.md`]: '<!-- expect: UNGOVERNED -->\n\n# Title\n' }),
    );
    // ACT
    await folderPasses.check(ctx);
    // ASSERT
    expect(violations.map((v) => v.file)).toEqual([FOLDER]);
  });
});

// REACH over the real tree. A hand-built context proves what a rule decides
// and nothing about whether its globs reach the committed corpus, so each rule
// also runs here against the repository itself: every spec folder of every
// spec-folder tier must be enumerated, and every one must pass.
describe('the spec-folder rules reach the real tree', () => {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const realFiles = (dir: string): string[] =>
    readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? realFiles(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`],
    );
  const SPEC_TIERS = ['body-structure', 'integrated'];
  const tree = [...SPEC_TIERS.flatMap((tier) => realFiles(`fixtures/conformance/${tier}`)), 'CONTEXT.md'];

  function realCtx() {
    const violations: Reported[] = [];
    const ctx = {
      projectRoot: ROOT,
      scopedFiles: [],
      changedFiles: [],
      async glob(pattern: string) {
        const re = globToRegExp(pattern);
        return tree.filter((f) => re.test(f));
      },
      async readFile(path: string) {
        return readFileSync(join(ROOT, path), 'utf8');
      },
      report: { violation: (d: Reported) => violations.push(d), warning: () => {}, info: () => {} },
    } as unknown as RuleContext;
    return { ctx, violations };
  }

  const foldersOf = (tier: string): string[] => readdirSync(join(ROOT, `fixtures/conformance/${tier}/docs`));

  it.each(['spec-line', 'spec-folder-key', 'spec-folder-passes', 'expect-marker'] as const)(
    '%s passes every committed spec folder',
    async (ruleId) => {
      // ARRANGE
      const { ctx, violations } = realCtx();
      // ACT
      await ruleSet.rules[ruleId].check(ctx);
      // ASSERT
      expect(violations).toEqual([]);
    },
  );

  it('enumerates every spec folder of both spec-folder tiers, so no rule above passed over nothing', () => {
    // ARRANGE
    const fewest = { 'body-structure': 40, integrated: 9 };
    // ACT
    const actual = SPEC_TIERS.map((tier) => ({
      tier,
      folders: foldersOf(tier).length,
      configs: tree.filter(
        (f) => f.startsWith(`fixtures/conformance/${tier}/`) && f.endsWith('/markdown-harness.config.yaml'),
      ).length,
    }));
    // ASSERT
    for (const row of actual) {
      expect(row.folders).toBeGreaterThan(fewest[row.tier as keyof typeof fewest]);
      expect(row.configs).toBe(row.folders);
    }
  });
});
