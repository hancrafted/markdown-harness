// The assertion body, pure: output text and provider metadata in, a verdict out.

import { gradeSteeringMarker } from '../../../grading/grade-steering-marker.ts';
import type { AssertionResult } from './steering-assertion.types.ts';

type Metadata = Readonly<Record<string, unknown>> | undefined;

function finalFileOf(output: string): string | undefined {
  try {
    const parsed = JSON.parse(output) as { finalFile?: string | null };
    return parsed.finalFile ?? undefined;
  } catch {
    return undefined;
  }
}

interface Spec {
  readonly arm: string;
  readonly marker: string;
  readonly scope: { level: number; titlePattern: string };
}

function specOf(metadata: Metadata): Spec | undefined {
  const arm = metadata?.arm;
  const marker = metadata?.marker;
  const scope = metadata?.scope as Spec['scope'] | undefined;
  return typeof arm === 'string' && typeof marker === 'string' && scope !== undefined
    ? { arm, marker, scope }
    : undefined;
}

function reasonFor(spec: Spec, seenPlaced: { present: boolean; placed: boolean | null }, metadata: Metadata): string {
  const { present, placed } = seenPlaced;
  const expected = spec.arm !== 'neutralised' ? 'present' : 'absent';
  const seen = present ? 'present' : 'absent';
  const rung = String(metadata?.localised ?? 'unknown');
  return `${spec.arm}: marker ${seen} (expected ${expected}); placed=${String(placed)}; localised: ${rung}; creating tool: ${String(metadata?.creatingTool ?? 'none')}`;
}

export function gradeSteeringAssertion(output: string, metadata: Metadata): AssertionResult {
  const spec = specOf(metadata);
  if (spec === undefined)
    return { pass: false, score: 0, reason: 'the provider returned no steering-marker specification' };
  const grade = gradeSteeringMarker({ finalFile: finalFileOf(output), marker: spec.marker, scope: spec.scope });
  const pass = grade.present === (spec.arm !== 'neutralised');
  return { pass, score: pass ? 1 : 0, reason: reasonFor(spec, grade, metadata) };
}
