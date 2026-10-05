/** What `check` answers: this Module's half of the report, or the file it could not read. */

import type { Unreadable } from '../../../foundation/read-corpus.ts';
import type { ModuleCheck } from '../../../response-contract/index.ts';
import type { BodyStructureViolation } from './violation.types.ts';

export type CorpusCheck = { kind: 'checked'; result: ModuleCheck<BodyStructureViolation> } | Unreadable;
