// The command that starts the stand-in for the Host harness, for the deterministic and self-test tiers. The
// stand-in prints the stream of the Host harness it is told to be by an explicit `--stub-host` flag; it does not
// read the Host harness's own argv to guess, because a flag the real Host harness takes would then change what the
// stand-in is.

import { hostNameOfMatrix, profileOf } from '../../../session/host-profile.ts';
import type { StubCommandInput } from './stub-command.types.ts';

export function stubCommand(input: StubCommandInput): string[] {
  const wrapperName = profileOf(hostNameOfMatrix(input.matrix), {}).wrapperName;
  return [
    'node',
    `${input.checkout}/evals/self-test/stub-host.mjs`,
    '--mode',
    input.stubMode,
    '--log',
    `${input.runDir}/stub-sessions.log`,
    '--stub-host',
    wrapperName,
  ];
}
