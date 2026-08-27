/**
 * `render` — THE SOFT LAYER, and the only place in the repo where the harness
 * speaks English.
 *
 * This is the line the whole design is drawn around: the report DATA carries no
 * prose, so a change to the data is a CONTRACT change and a change to the
 * wording is a CORPUS change. Freeze the data at `format: 1`; hold the wording
 * at asserted-but-revisable. The message design is the thing the workshops will
 * actually change, and this is the file they change.
 *
 * The message corpus and the rendering rules live in `lib/render/violation.ts`.
 */

import type { CheckReport } from '../contract/check-report.ts';
import type { ConfigRejected } from '../contract/config-rejected.ts';
import { renderCheck } from './lib/render/check.ts';
import { renderConfigRejected } from './lib/render/config-rejected.ts';

export type Report = CheckReport | ConfigRejected;

export function render(report: Report): string {
  return report.report === 'check' ? renderCheck(report) : renderConfigRejected(report);
}
