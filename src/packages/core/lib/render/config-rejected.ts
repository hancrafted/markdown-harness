/**
 * Rendering a rejected config. The soft layer.
 *
 * A config fault is report content, so it renders through the same seam as a
 * check report rather than arriving as a stack trace on a different channel.
 */

import type { ConfigFault, ConfigFaultCode, ConfigRejected } from '../../../contract/config-rejected.ts';

const SENTENCES: Record<ConfigFaultCode, string> = {
  'empty-rule-list':
    'the rule list is empty. A config that names a module and then governs nothing is a mistake, not an inert harness.',
};

function stanza(fault: ConfigFault): readonly string[] {
  return [`  ${fault.at}  [${fault.code}]`, `    ${SENTENCES[fault.code]}`, ''];
}

export function renderConfigRejected(report: ConfigRejected): string {
  return [
    'The config was rejected. Nothing was checked.',
    '',
    ...report.faults.flatMap(stanza),
    `${report.faults.length} config faults.`,
    '',
  ].join('\n');
}
