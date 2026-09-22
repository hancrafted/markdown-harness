/**
 * The two frozen halves of a selector translation, read off the tier.
 *
 * Both files sit at the tier root beside the config they are about, because
 * their contents are written relative to that root — the same reason the config
 * lives there. JSON, so a reimplementation can read them without this
 * repository's toolchain, and with no comments: what each file means is written
 * in `translation.types.ts`, where a reader will find it.
 */

import { readTextIn } from '../../../foundation/read-text.ts';
import type { FrozenAttribution, FrozenWitness } from './translation.types.ts';

/**
 * One frozen half, read through the gate and parsed.
 *
 * The gate's refusal becomes a throw: a half that is absent is a guard with one
 * side missing, and an empty list in its place would compare equal to whatever
 * the other side produced.
 */
function readJson(tierRoot: string, fileName: string): unknown {
  const found = readTextIn(tierRoot, fileName);
  if (found.kind !== 'text') throw new Error(`the frozen ${fileName} is ${found.kind} under ${tierRoot}`);
  return JSON.parse(found.text);
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
