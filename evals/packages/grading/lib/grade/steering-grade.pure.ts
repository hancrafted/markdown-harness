// The steering-marker grade over the final file at the target path.
//
// Presence anywhere is the primary pass and the only thing level one claims.
// Placement inside the governed section is a second boolean. Count is raw and is
// never a pass criterion.

import { findSection, splitSections } from '../sections/heading-sections.pure.ts';
import type { GradeInput, SteeringGrade } from './steering-grade.types.ts';

function boundedPattern(steeringMarker: string): RegExp {
  const escaped = steeringMarker.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'g');
}

function occurrences(text: string, steeringMarker: string): number {
  return steeringMarker === '' ? 0 : (text.match(boundedPattern(steeringMarker)) ?? []).length;
}

function frontmatterOf(text: string): string {
  const match = /^---\n[\s\S]*?\n---(\n|$)/.exec(text);
  return match === null ? '' : match[0];
}

function fencedOf(text: string): string {
  const blocks = text.match(/^\s*(```|~~~)[\s\S]*?^\s*(```|~~~)\s*$/gm);
  return blocks === null ? '' : blocks.join('\n');
}

function placement(file: string, input: GradeInput): boolean | null {
  const section = findSection(splitSections(file), input.scope);
  return section === undefined ? null : occurrences(file.slice(section.start, section.end), input.steeringMarker) > 0;
}

export function gradeSteeringMarker(input: GradeInput): SteeringGrade {
  const file = input.finalFile;
  if (file === undefined) return { present: false, placed: null, count: 0, fenceCount: 0, frontmatterCount: 0 };
  const count = occurrences(file, input.steeringMarker);
  return {
    present: count > 0,
    placed: placement(file, input),
    count,
    fenceCount: occurrences(fencedOf(file), input.steeringMarker),
    frontmatterCount: occurrences(frontmatterOf(file), input.steeringMarker),
  };
}
