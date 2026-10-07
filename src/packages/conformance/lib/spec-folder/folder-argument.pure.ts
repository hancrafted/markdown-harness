/**
 * What `npm run conformance -- <path>` was asked to run, decided from the path
 * alone.
 *
 * The path is repository-relative, with or without its `fixtures/conformance/`
 * prefix. A spec-folder tier answers for one spec folder, or for every one of
 * them when the tier root is named; a case-directory tier (`rejected-config`)
 * answers the same way for its case directories. Any other tier has neither:
 * its root runs that tier's runner, and a path below its root is refused with
 * the reason, because nothing below it is a unit the tool can run alone. A path
 * outside every tier is read as a directory to compare as a spec folder in its
 * own right — a scratch copy, say — and the caller refuses it when it holds no
 * config.
 */

import type { ConformanceArguments, FolderRequest, TierShape } from './folder-argument.types.ts';

const PREFIX = 'fixtures/conformance/';
const USAGE = 'name a spec folder, e.g. npm run conformance -- body-structure/docs/minCount__zero';

/**
 * Decide what one path asks for.
 *
 * @param argument The path as typed, repository-relative.
 * @param tiers Each declared tier's name and whether it is a spec-folder tier.
 */
export function folderRequestOf(argument: string | undefined, tiers: readonly TierShape[]): FolderRequest {
  if (argument === undefined || argument.trim() === '') return { kind: 'refused', reason: USAGE };
  const trimmed = argument.replace(/^\.\//u, '').replace(/\/+$/u, '');
  const relative = trimmed.startsWith(PREFIX) ? trimmed.slice(PREFIX.length) : trimmed;
  const [tierName, ...rest] = relative.split('/');
  const tier = tiers.find((candidate) => candidate.name === tierName);
  if (tier === undefined) return { kind: 'directory', path: argument.replace(/\/+$/u, '') };
  if (tier.unit === 'spec-folder') return inSpecTier(argument, tier.name, rest);
  if (tier.unit === 'case-directory') return inCaseTier(argument, tier.name, rest);
  return inPlainTier(tier.name, rest);
}

/** A path inside a case-directory tier: its root, one case directory straight under it, or refused. */
function inCaseTier(argument: string, tier: string, rest: readonly string[]): FolderRequest {
  if (rest.length === 0) return { kind: 'case-tier', tier };
  if (rest.length === 1 && rest[0] !== '') return { kind: 'case-directory', tier, caseName: rest[0] };
  return {
    kind: 'refused',
    reason: `${argument} is not a case directory — a ${tier} case is one directory straight under ${PREFIX}${tier}/`,
  };
}

/** A path inside a tier without spec folders: its root runs the runner, anything below is refused. */
function inPlainTier(tier: string, rest: readonly string[]): FolderRequest {
  if (rest.length === 0) return { kind: 'tier-runner', tier };
  return {
    kind: 'refused',
    reason: `the ${tier} tier is not split into spec folders: its cases share one config at the tier root, so a subfolder cannot run alone — run the tier root instead`,
  };
}

/** A path inside a spec-folder tier: its root, one folder directly under `docs/`, or refused. */
function inSpecTier(argument: string, tier: string, rest: readonly string[]): FolderRequest {
  if (rest.length === 0) return { kind: 'spec-tier', tier };
  if (rest.length === 2 && rest[0] === 'docs' && rest[1] !== '') return { kind: 'spec-folder', tier, folder: rest[1] };
  return {
    kind: 'refused',
    reason: `${argument} is not a spec folder — a spec folder sits directly under ${PREFIX}${tier}/docs/`,
  };
}

const PATH_FLAG = '--path';
const ARGUMENTS_USAGE = 'usage: npm run conformance [-- --path <path> [<path> ...]]';

/**
 * Decide what one command line asks for. No argument runs every tier, which is
 * what the gate runs. `--path` takes every argument up to the next flag, and may
 * repeat; a bare path is read as if `--path` preceded it, so the one-folder form
 * a human types keeps working.
 *
 * @param argv the arguments after the script's own path, as typed.
 */
export function conformanceArgumentsOf(argv: readonly string[]): ConformanceArguments {
  const paths: string[] = [];
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === PATH_FLAG) {
      const listed = takeUntilFlag(argv, index + 1);
      if (listed.length === 0) return { kind: 'refused', reason: `${PATH_FLAG} names no path — ${ARGUMENTS_USAGE}` };
      paths.push(...listed);
      index += listed.length;
    } else if (argument.startsWith('-')) {
      return { kind: 'refused', reason: `unknown option ${argument} — ${ARGUMENTS_USAGE}` };
    } else if (argument.trim() !== '') {
      paths.push(argument);
    }
  }
  return paths.length === 0 ? { kind: 'every-tier' } : { kind: 'paths', paths };
}

/** The arguments from `start` up to, not including, the next one that is a flag. */
function takeUntilFlag(argv: readonly string[], start: number): readonly string[] {
  const end = argv.findIndex((argument, index) => index >= start && argument.startsWith('-'));
  return argv.slice(start, end === -1 ? argv.length : end).filter((argument) => argument.trim() !== '');
}
