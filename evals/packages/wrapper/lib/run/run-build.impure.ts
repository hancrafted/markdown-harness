// The repository's own build is rebuilt before a run, so the `mh` the minted roots
// carry is the one the checkout holds. A failed build is an instrument failure.

import { environment } from '../../../platform/host-ambient.ts';
import { runProcess } from '../../../platform/host-process.ts';

export function buildCurrentMh(checkout: string): string | undefined {
  const env = { PATH: environment().PATH ?? '', HOME: environment().HOME ?? '' };
  const report = runProcess({ command: 'npm', args: ['run', 'build'], cwd: checkout, env, timeoutMs: 300_000 });
  return report.status === 0
    ? undefined
    : `the repository build failed: ${report.stderr.trim().split('\n').slice(-3).join(' | ')}`;
}
