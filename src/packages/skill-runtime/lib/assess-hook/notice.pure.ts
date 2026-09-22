/**
 * The hook sentence built from a reviewed assessment.
 *
 * The Operator's instruction is copied verbatim and only when the Module
 * supplied one. The evidence line remains present in both cases.
 */
export function formatReviewNotice({
  path,
  now,
  assessment,
}: {
  path: string;
  now: string;
  assessment: {
    module: string;
    instruction?: string;
    evidence?: { value?: string };
    rule: { ruleId: string; intent: string };
  };
}): string {
  const wentStale = assessment.evidence?.value ?? 'an instant it did not report';
  const lines = [`markdown-harness: ${path} is past its stale_after under Module "${assessment.module}".`];

  if (typeof assessment.instruction === 'string') lines.push('', assessment.instruction);

  lines.push(
    '',
    `stale_after ${wentStale}, assessed at ${now}. Rule "${assessment.rule.ruleId}": ${assessment.rule.intent}`,
  );
  return lines.join('\n');
}
