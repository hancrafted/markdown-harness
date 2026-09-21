/**
 * The two frozen halves of a selector translation, read off the tier.
 *
 * Both files sit at the tier root beside the config they are about, because
 * their contents are written relative to that root — the same reason the config
 * lives there. JSON, so a reimplementation can read them without this
 * repository's toolchain, and with no comments: what each file means is written
 * in `translation.types.ts`, where a reader will find it.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FrozenAttribution, FrozenWitness } from './translation.types.ts';

function readJson(tierRoot: string, fileName: string): unknown {
  return JSON.parse(readFileSync(join(tierRoot, fileName), 'utf8'));
}

/**
 * Every corpus file's frozen attribution.
 *
 * @param tierRoot The tier's synthetic repo root.
 */
export function frozenAttributions(tierRoot: string): readonly FrozenAttribution[] {
  return (readJson(tierRoot, 'corpus-attribution.json') as { files: FrozenAttribution[] }).files;
}

/**
 * Every witness case's frozen steering answer.
 *
 * @param tierRoot The tier's synthetic repo root.
 */
export function frozenWitnesses(tierRoot: string): readonly FrozenWitness[] {
  return (readJson(tierRoot, 'witness-cases.json') as { witnesses: FrozenWitness[] }).witnesses;
}
