// The assertion body, pure: output text and provider metadata in, a verdict out.
// A steered or control trial passes when every tested carrier's steering marker
// reached the final file; an intent-neutralised trial passes when none did.
//
// A repair case seeds the target file, so a final file that holds the steering
// marker is not enough: the file must also have changed from its seed. A steered
// or control trial of a repair case that left the seeded file alone is a null
// however it got the marker; the intent-neutralised arm is not asked, because
// leaving the file as seeded is the outcome it expects.

import type { SectionScope } from '../../../grading/grade-steering-marker.ts';
import { armHit, gradeSteeringMarker } from '../../../grading/grade-steering-marker.ts';
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

function changedFilesOf(output: string): readonly string[] {
  try {
    const parsed = JSON.parse(output) as { changedFiles?: unknown };
    return Array.isArray(parsed.changedFiles) ? parsed.changedFiles.filter((file) => typeof file === 'string') : [];
  } catch {
    return [];
  }
}

/** Whether the case seeds its target file and so asks that it was repaired, and the path it must have changed. */
function repairTarget(metadata: Metadata): string | undefined {
  const target = metadata?.targetPath;
  return metadata?.kind === 'repair' && typeof target === 'string' ? target : undefined;
}

interface Carrier {
  readonly address: string;
  readonly steeringMarker: string;
  readonly scope: SectionScope;
}

interface Spec {
  readonly arm: string;
  readonly carriers: readonly Carrier[];
}

function specOf(metadata: Metadata): Spec | undefined {
  const arm = metadata?.arm;
  const carriers = metadata?.carriers as Carrier[] | undefined;
  return typeof arm === 'string' && Array.isArray(carriers) && carriers.length > 0 ? { arm, carriers } : undefined;
}

function profileOf(spec: Spec, seen: readonly { present: boolean; placed: boolean | null }[]): string {
  return spec.carriers
    .map((carrier, index) => `${carrier.address}: ${seen[index]?.present ? 'present' : 'absent'}`)
    .join('; ');
}

function reasonFor(
  spec: Spec,
  seen: readonly { present: boolean; placed: boolean | null }[],
  context: { readonly metadata: Metadata; readonly repaired: boolean | undefined },
): string {
  const { metadata, repaired } = context;
  const expected = spec.arm !== 'neutralised' ? 'present' : 'absent';
  const placed = seen.map((one) => String(one.placed)).join(',');
  const rung = String(metadata?.localised ?? 'unknown');
  const repair = repaired === undefined ? '' : `; repaired=${String(repaired)}`;
  return `${spec.arm}: steering markers (expected ${expected}) ${profileOf(spec, seen)}; placed=${placed}${repair}; localised: ${rung}; creating tool: ${String(metadata?.creatingTool ?? 'none')}`;
}

export function gradeSteeringAssertion(output: string, metadata: Metadata): AssertionResult {
  const spec = specOf(metadata);
  if (spec === undefined)
    return { pass: false, score: 0, reason: 'the provider returned no steering-marker specification' };
  const finalFile = finalFileOf(output);
  const seen = spec.carriers.map((carrier) =>
    gradeSteeringMarker({ finalFile, steeringMarker: carrier.steeringMarker, scope: carrier.scope }),
  );
  const hit = armHit(spec.arm, seen);
  const target = repairTarget(metadata);
  const repaired = target === undefined ? undefined : changedFilesOf(output).includes(target);
  const pass = spec.arm === 'neutralised' ? !hit : hit && repaired !== false;
  return { pass, score: pass ? 1 : 0, reason: reasonFor(spec, seen, { metadata, repaired }) };
}
