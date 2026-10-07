// The gate between a run's arguments and the Host harness it would start. A matrix runs only under the Host harness
// whose profile lists it; a live Antigravity run starts only when every probe has a recorded answer; an Antigravity
// session's wall-clock bound must leave its print timeout a margin. A refusal is misuse (exit 2): the Operator asked
// for a run the instrument cannot yet make.

import { wallClockRefusal } from '../../../session/host-invocation.ts';
import type { ProbeRecord } from '../../../session/host-profile.ts';
import { hostNameOfMatrix, hostNameOfWrapper, liveRefusal, profileOf } from '../../../session/host-profile.ts';
import type { RunArgs } from './run-args.types.ts';

function matrixRefusal(args: RunArgs): string | undefined {
  if (args.host === 'stub') return undefined;
  const profile = profileOf(hostNameOfWrapper(args.host), {});
  if (profile.matrices.includes(args.matrix)) return undefined;
  return `--host ${profile.wrapperName} runs only --matrix ${profile.matrices.join(', ')}`;
}

/** The bound check applies to the Host harness whose matrix is run, so the stand-in reaches it too. */
function boundRefusal(args: RunArgs): string | undefined {
  const printsTimeout = hostNameOfMatrix(args.matrix) === 'antigravity';
  return printsTimeout && args.wallClockSeconds !== undefined
    ? wallClockRefusal(args.wallClockSeconds * 1000)
    : undefined;
}

export function hostRefusal(args: RunArgs, record: ProbeRecord): string | undefined {
  const early = matrixRefusal(args) ?? boundRefusal(args);
  if (early !== undefined || args.host === 'stub') return early;
  return liveRefusal(profileOf(hostNameOfWrapper(args.host), record));
}
