import { readFile as read, resetReadCache as reset } from './lib/platform/file-system.impure.ts';
import type { ReadOutcome } from './lib/platform/file-system.types.ts';
export type { ReadOutcome } from './lib/platform/file-system.types.ts';

export function readFile(location: string, relativePath?: string): ReadOutcome {
  return read(location, relativePath);
}

export function resetReadCache(): void {
  reset();
}
