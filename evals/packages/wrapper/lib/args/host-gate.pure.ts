// The gate between a run's arguments and the Host harness it would start. A live Antigravity run starts only
// when every probe in its profile is recorded as working; a matrix runs only under the Host harness it was
// written for. A refusal is misuse (exit 2): the Operator asked for a run the instrument cannot yet make.

import { liveRefusal, profileOf } from '../../../session/host-profile.ts';
import type { RunArgs } from './run-args.types.ts';

export function hostRefusal(args: RunArgs): string | undefined {
  if (args.host === 'agy' && args.matrix !== 'agy') return '--host agy runs only --matrix agy';
  if (args.host === 'claude' && args.matrix === 'agy') return '--matrix agy runs only under --host agy or --host stub';
  return args.host === 'agy' ? liveRefusal(profileOf('antigravity')) : undefined;
}
