// The compiled `mh`, as the Conformance runners that spawn it see it: where it
// is, and what one run of it answered.
//
// The entry is the one `package.json` declares under `bin.mh`, read through
// `foundation` like every other file this Package opens. It names a build
// artefact under `dist/`, so a runner measures the LAST BUILD and never the
// source on disk — trap 9 in docs/agents/verification.md. Build beside a
// single-file run.

import { directoryOf, hostPath } from '../foundation/host-path.ts';
import { readTextIn } from '../foundation/read-text.ts';

export { envelopeOf, refusalOf } from './lib/tool/tool-answer.pure.ts';
export type { ToolBlock, ToolEnvelope, ToolFault, ToolRefusal, ToolRun } from './lib/tool/tool-answer.types.ts';

/** The repository root, resolved from this file's own location. */
const REPOSITORY = hostPath(directoryOf(import.meta.url), '..', '..', '..');

/**
 * The absolute path of the `mh` entry `package.json` declares.
 *
 * Throws, naming the fix, when the manifest declares none or nothing has been
 * built there: a runner without its entry would otherwise report every case as
 * a crash rather than say once why it cannot run.
 */
export function toolEntry(): string {
  const manifest = readTextIn(REPOSITORY, 'package.json');
  if (manifest.kind !== 'text') throw new Error(`package.json is ${manifest.kind} at ${REPOSITORY}`);
  const declared = (JSON.parse(manifest.text) as { bin?: { mh?: string } }).bin?.mh;
  if (declared === undefined) throw new Error('package.json must declare bin.mh for this suite to run');
  if (readTextIn(REPOSITORY, declared).kind !== 'text') {
    throw new Error(`package.json bin.mh names "${declared}", and nothing is there — run \`npm run build\` first.`);
  }
  return hostPath(REPOSITORY, declared);
}
