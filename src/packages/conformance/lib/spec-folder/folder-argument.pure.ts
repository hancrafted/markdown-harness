/**
 * What `npm run conformance -- <path>` was asked to run, decided from the path
 * alone.
 *
 * The path is repository-relative, with or without its `fixtures/conformance/`
 * prefix. A spec-folder tier answers for one spec folder, or for every one of
 * them when the tier root is named. Any other tier has no spec folders: its
 * root runs that tier's runner, and a path below its root is refused with the
 * reason, because nothing below it is a unit the tool can run alone. A path
 * outside every tier is read as a directory to compare as a spec folder in its
 * own right — a scratch copy, say — and the caller refuses it when it holds no
 * config.
 */

import type { FolderRequest, TierShape } from './folder-argument.types.ts';

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
  return tier.specFolders ? inSpecTier(argument, tier.name, rest) : inPlainTier(tier.name, rest);
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
