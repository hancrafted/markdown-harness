// The workspace and scratch home one probe session runs in, both made under the system temporary directory, outside
// any parent chain this repository controls, and removed by the caller whatever the session did. The only ambient
// reads are the filesystem and a random suffix. The scratch home is made only for the credential probe, and only
// holds the credential files the consent notice listed.

import { randomHex } from '../../../platform/host-ambient.ts';
import {
  copyFile,
  makeDirectory,
  pathExists,
  systemTemporaryDirectory,
  writeText,
} from '../../../platform/host-files.ts';
import type { ProbeId } from '../../../session/host-profile.ts';
import { credentialCopies } from '../../../session/scratch-home.ts';
import { HOOKS_JSON, HOOK_SCRIPT } from '../task/probe-task.pure.ts';

const stamp = (kind: string): string => `${systemTemporaryDirectory()}/mh-agy-probe-${kind}-${randomHex(6)}`;

/** A fresh workspace; the hook probe's also holds the hooks.json and the handler the probe plants. */
export function makeWorkspace(probe: ProbeId): string {
  const root = stamp('workspace');
  makeDirectory(root);
  if (probe === 'hook-fires-headless') {
    writeText(`${root}/.agents/hooks.json`, HOOKS_JSON);
    writeText(`${root}/.agents/hook.mjs`, HOOK_SCRIPT);
  }
  return root;
}

/** The path a scratch home would have, named before it exists so the consent notice can print it. */
export const scratchHomePath = (): string => stamp('home');

/** A scratch home holding the credential files that exist under the source home; returns how many were copied. */
export function fillScratchHome(sourceHome: string, scratchHome: string): number {
  makeDirectory(scratchHome);
  const present = credentialCopies(sourceHome, scratchHome).filter((copy) => pathExists(copy.from));
  for (const copy of present) copyFile(copy.from, copy.to);
  return present.length;
}
