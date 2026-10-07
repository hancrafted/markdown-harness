// Colocated unit test for the mint's pure guards. Every bad input is constructed
// below the mint, because a guard whose bad case the mint refuses to produce is
// green forever.

import { describe, expect, it } from 'vitest';
import {
  checkMintedTree,
  checkParentChain,
  heldOutViolations,
  isOpaquePath,
  planCopies,
  sourcesFor,
} from './mint-plan.pure.ts';

const SOURCES = {
  seedDir: '/repo/evals/suites/steering/seed/research',
  mhDist: '/repo/dist',
  mhManifest: '/repo/package.json',
  markedDir: '/repo/node_modules/marked',
  yamlDir: '/repo/node_modules/yaml',
  hookScripts: ['/repo/.agents/skills/markdown-harness/scripts/query-hook.mjs'],
};

describe('checkParentChain', () => {
  describe('success cases', () => {
    it('accepts a chain with no instruction file or project settings directory', () => {
      // ARRANGE
      const chain = [
        { dir: '/private/tmp', entries: ['abc', 'def'] },
        { dir: '/private', entries: ['tmp', 'var'] },
      ];
      // ACT
      const refusals = checkParentChain(chain);
      // ASSERT
      expect(refusals).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it.each(['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.claude'])('refuses a stray %s in any parent', (name) => {
      // ARRANGE
      const chain = [
        { dir: '/private/tmp', entries: ['abc'] },
        { dir: '/private', entries: [name] },
      ];
      const expected = [`/private/${name}`];
      // ACT
      const refusals = checkParentChain(chain);
      // ASSERT
      expect(refusals).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('names every offender, nearest parent first', () => {
      // ARRANGE
      const chain = [
        { dir: '/a/b', entries: ['AGENTS.md'] },
        { dir: '/a', entries: ['CLAUDE.md'] },
      ];
      const expected = ['/a/b/AGENTS.md', '/a/CLAUDE.md'];
      // ACT
      const refusals = checkParentChain(chain);
      // ASSERT
      expect(refusals).toEqual(expected);
    });
  });
});

describe('planCopies', () => {
  describe('success cases', () => {
    it('lists the seed, the built mh with its manifest and two runtime dependencies, and the hook scripts, and nothing else', () => {
      // ARRANGE
      const expected = [
        '.',
        'node_modules/@hancrafted/markdown-harness/dist',
        'node_modules/@hancrafted/markdown-harness/package.json',
        'node_modules/marked',
        'node_modules/yaml',
        '.agents/skills/markdown-harness/scripts/query-hook.mjs',
      ];
      // ACT
      const plan = planCopies(SOURCES);
      // ASSERT
      expect(plan.map((step) => step.to)).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports a held-out directory that sits in the plan, and none when it does not', () => {
      // ARRANGE
      const held = '/repo/evals/suites/steering/cases';
      const leaking = planCopies({ ...SOURCES, seedDir: held });
      // ACT
      const clean = heldOutViolations(planCopies(SOURCES), [held]);
      const dirty = heldOutViolations(leaking, [held]);
      // ASSERT
      expect(clean).toEqual([]);
      expect(dirty).toEqual([held]);
    });
  });

  describe('edge cases', () => {
    it('treats a source inside a held-out directory as a violation too', () => {
      // ARRANGE
      const held = '/repo/evals/suites/steering/cases';
      const plan = [{ from: `${held}/one.yaml`, to: 'x' }];
      // ACT
      const violations = heldOutViolations(plan, [held]);
      // ASSERT
      expect(violations).toEqual([held]);
    });
  });
});

describe('checkMintedTree', () => {
  describe('success cases', () => {
    it('accepts a tree with AGENTS.md alone, no cases directory and no symlink', () => {
      // ARRANGE
      const tree = [
        { path: 'AGENTS.md', kind: 'file' as const },
        { path: 'docs', kind: 'dir' as const },
      ];
      // ACT
      const problems = checkMintedTree(tree);
      // ASSERT
      expect(problems).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('flags any symlink, a cases directory, and a CLAUDE.md beside AGENTS.md', () => {
      // ARRANGE
      const tree = [
        { path: 'AGENTS.md', kind: 'file' as const },
        { path: 'CLAUDE.md', kind: 'symlink' as const },
        { path: 'evals/cases', kind: 'dir' as const },
        { path: 'node_modules/x', kind: 'symlink' as const },
      ];
      const expected = [
        'symlink: CLAUDE.md',
        'symlink: node_modules/x',
        'held-out cases: evals/cases',
        'instruction file: CLAUDE.md',
      ];
      // ACT
      const problems = checkMintedTree(tree);
      // ASSERT
      expect([...problems].sort()).toEqual([...expected].sort());
    });
  });

  describe('edge cases', () => {
    it('flags a root with no AGENTS.md at all', () => {
      // ARRANGE
      const expected = ['instruction file: AGENTS.md is missing'];
      // ACT
      const problems = checkMintedTree([{ path: 'docs', kind: 'dir' }]);
      // ASSERT
      expect(problems).toEqual(expected);
    });
  });
});

describe('isOpaquePath', () => {
  describe('success cases', () => {
    it('accepts a random identifier under a system temporary directory', () => {
      // ARRANGE
      const parent = '/private/var/folders/zz/T';
      const path = `${parent}/9f2c41ab07de`;
      // ACT
      const actual = isOpaquePath(path, parent);
      // ASSERT
      expect(actual).toBe(true);
    });

    it('does not judge the parent it was handed, only the segments minted below it', () => {
      // ARRANGE
      const parent = '/private/var/folders/evals-casey/T';
      const path = `${parent}/9f2c41ab07de`;
      // ACT
      const actual = isOpaquePath(path, parent);
      // ASSERT
      expect(actual).toBe(true);
    });
  });

  describe('failure cases', () => {
    it.each(['/tmp/evals-run/abc', '/tmp/steered-1', '/tmp/neutralised', '/tmp/control-arm/x', '/tmp/steering'])(
      'refuses %s',
      (path) => {
        // ARRANGE
        const expected = false;
        // ACT
        const actual = isOpaquePath(path, '/tmp');
        // ASSERT
        expect(actual).toBe(expected);
      },
    );

    it('refuses a path that is not below the parent, since nothing can then be called minted', () => {
      // ARRANGE
      const expected = false;
      // ACT
      const actual = isOpaquePath('/elsewhere/9f2c41ab07de', '/tmp');
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('reads the arm and eval words case-insensitively', () => {
      // ARRANGE
      const path = '/tmp/EVALS/abc';
      // ACT
      const actual = isOpaquePath(path, '/tmp');
      // ASSERT
      expect(actual).toBe(false);
    });
  });
});

describe('sourcesFor', () => {
  describe('success cases', () => {
    it('roots every source at the checkout and the seed at the case seed directory', () => {
      // ARRANGE
      const expected = { seedDir: '/co/seed/x', mhDist: '/co/dist' };
      // ACT
      const sources = sourcesFor({ checkout: '/co', seedRelative: 'seed/x' });
      // ASSERT
      expect(sources).toMatchObject(expected);
    });
  });

  describe('failure cases', () => {
    it('never lists the held-out cases directory among its sources', () => {
      // ARRANGE
      const held = '/co/evals/suites/steering/cases';
      // ACT
      const violations = heldOutViolations(
        planCopies(sourcesFor({ checkout: '/co', seedRelative: 'evals/suites/steering/seed/research-note' })),
        [held],
      );
      // ASSERT
      expect(violations).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('offers the unmodified hook scripts and the activity log the assess hook imports, and nothing else', () => {
      // ARRANGE
      const expected = [
        '/co/.agents/skills/markdown-harness/scripts/query-hook.mjs',
        '/co/.agents/skills/markdown-harness/scripts/assess-hook.mjs',
        '/co/.agents/skills/markdown-harness/scripts/activity-log.mjs',
      ];
      // ACT
      const actual = sourcesFor({ checkout: '/co', seedRelative: 's' }).hookScripts;
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
