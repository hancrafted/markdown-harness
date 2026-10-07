// The mint's pure guards and copy plan (R0 item 8, R3 isolation).
//
// Roots are minted by copy, never by link. The plan is a positive list: the seed
// tree, the built `mh` with its manifest and two runtime dependencies, and the
// hook scripts. The held-out cases directory is excluded by never being in it.

import { allHookScripts, hookScriptsFor } from '../surface/delivery-surface.pure.ts';
import type { DeliverySurface } from '../surface/delivery-surface.types.ts';
import type { AncestorListing, CopyStep, MintSources, SeedLocation, TreeEntry } from './mint-plan.types.ts';

/** Names a Host harness reads from a parent directory, so any of them above a minted root leaks into it. */
const PARENT_LEAKS = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.claude'];
const INSTRUCTION_FILES = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'];
// The bare giveaway word stays in this list on purpose: the list exists to catch that word in a minted root,
// where it would give the eval away. It is data to match, not vocabulary the code uses.
const GIVEAWAY_WORDS = /eval|steer|neutral|control|arm\b|marker|case/i;

const PACKAGE_HOME = 'node_modules/@hancrafted/markdown-harness';

export function checkParentChain(chain: readonly AncestorListing[]): string[] {
  return chain.flatMap(({ dir, entries }) =>
    entries.filter((entry) => PARENT_LEAKS.includes(entry)).map((entry) => `${dir === '/' ? '' : dir}/${entry}`),
  );
}

/** The sources a surface ships: the ones `hookScriptsFor` names, picked from the superset a case offers. */
export function hookSourcesFor(sources: MintSources, surface: DeliverySurface): string[] {
  const own = hookScriptsFor(surface);
  return sources.hookScripts.filter((script) => own.includes(script.slice(script.lastIndexOf('/') + 1)));
}

function hookStep(script: string): CopyStep {
  return { from: script, to: `.agents/skills/markdown-harness/scripts/${script.slice(script.lastIndexOf('/') + 1)}` };
}

export function planCopies(sources: MintSources): CopyStep[] {
  return [
    { from: sources.seedDir, to: '.' },
    { from: sources.mhDist, to: `${PACKAGE_HOME}/dist` },
    { from: sources.mhManifest, to: `${PACKAGE_HOME}/package.json` },
    { from: sources.markedDir, to: 'node_modules/marked' },
    { from: sources.yamlDir, to: 'node_modules/yaml' },
    ...sources.hookScripts.map(hookStep),
  ];
}

function within(path: string, directory: string): boolean {
  return path === directory || path.startsWith(`${directory}/`);
}

/** Held-out directories the plan would copy from or into. */
export function heldOutViolations(plan: readonly CopyStep[], heldOut: readonly string[]): string[] {
  return heldOut.filter((directory) => plan.some((step) => within(step.from, directory)));
}

function instructionProblems(tree: readonly TreeEntry[]): string[] {
  const root = tree.filter((entry) => !entry.path.includes('/') && INSTRUCTION_FILES.includes(entry.path));
  const extras = root.filter((entry) => entry.path !== 'AGENTS.md').map((entry) => `instruction file: ${entry.path}`);
  return root.some((entry) => entry.path === 'AGENTS.md')
    ? extras
    : ['instruction file: AGENTS.md is missing', ...extras];
}

export function checkMintedTree(tree: readonly TreeEntry[]): string[] {
  const symlinks = tree.filter((entry) => entry.kind === 'symlink').map((entry) => `symlink: ${entry.path}`);
  const cases = tree
    .filter((entry) => entry.path.split('/').includes('cases'))
    .filter((entry) => entry.kind === 'dir')
    .map((entry) => `held-out cases: ${entry.path}`);
  return [...symlinks, ...cases, ...instructionProblems(tree)];
}

/**
 * An opaque path names no arm and no eval. Only the segments minted below `parent` are read, case-insensitively:
 * the parent is a system temporary directory or a caller's choice, and a word in it must not refuse the mint.
 * A path that is not below the parent has no minted segment to vouch for, so it is refused.
 */
export function isOpaquePath(path: string, parent: string): boolean {
  const prefix = parent.endsWith('/') ? parent : `${parent}/`;
  return path.startsWith(prefix) && !GIVEAWAY_WORDS.test(path.slice(prefix.length));
}

/** Where the skill's scripts sit in a checkout and in a minted root. */
export const SKILL_SCRIPTS = '.agents/skills/markdown-harness/scripts';

/** The copy sources for one case, rooted at its checkout and seed directory. */
export function sourcesFor(location: SeedLocation): MintSources {
  const { checkout, seedRelative } = location;
  return {
    seedDir: `${checkout}/${seedRelative}`,
    mhDist: `${checkout}/dist`,
    mhManifest: `${checkout}/package.json`,
    markedDir: `${checkout}/node_modules/marked`,
    yamlDir: `${checkout}/node_modules/yaml`,
    hookScripts: allHookScripts().map((script) => `${checkout}/${SKILL_SCRIPTS}/${script}`),
  };
}
