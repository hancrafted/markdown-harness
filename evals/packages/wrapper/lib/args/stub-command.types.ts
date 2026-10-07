import type { MatrixName } from '../../../session/host-profile.ts';

export interface StubCommandInput {
  readonly checkout: string;
  readonly runDir: string;
  readonly matrix: MatrixName;
  readonly stubMode: string;
}
