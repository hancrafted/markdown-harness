/**
 * Core contradiction table (design-ADR 0008).
 *
 * Implements the 13 pairwise contradiction rows.
 */

import type { Claim } from '../../../config-contract/index.ts';
import { contains, extentsOverlap } from '../extent/extent-algebra.pure.ts';

function grammarAdmits(pattern: string, name: string): boolean {
  try {
    return new RegExp(pattern).test(name);
  } catch {
    return false;
  }
}

function closesOver(named: readonly string[], field: string): boolean {
  const topKey = field.split('.')[0]!.replace(/\[\]$/, '');
  return named.includes(topKey);
}

function blockForbidsRequires(a: Claim, b: Claim): boolean {
  if (b.kind === 'frontmatter-block' && b.stance === 'requires') return extentsOverlap(a.extent, b.extent);
  if (b.kind === 'field' && (b.stance === 'requires' || b.stance === 'reads'))
    return extentsOverlap(a.extent, b.extent);
  return false;
}

function blockForbidsCardinality(a: Claim, b: Claim): boolean {
  if (b.kind === 'field-cardinality' && b.stance === 'requires' && b.atLeast >= 1) {
    return extentsOverlap(a.extent, b.extent);
  }
  return false;
}

function checkBlockContradiction(a: Claim, b: Claim): boolean {
  if (a.kind !== 'frontmatter-block' || a.stance !== 'forbids') return false;
  return blockForbidsRequires(a, b) || blockForbidsCardinality(a, b);
}

function checkFieldContradiction(a: Claim, b: Claim): boolean {
  if (a.kind !== 'field' || a.stance !== 'forbids') return false;

  if (b.kind === 'field' && (b.stance === 'requires' || b.stance === 'reads') && a.field === b.field) {
    return extentsOverlap(a.extent, b.extent);
  }
  return false;
}

function checkClosureContradiction(a: Claim, b: Claim): boolean {
  if (a.kind !== 'field-closure' || a.stance !== 'forbids') return false;

  if (b.kind === 'field' && (b.stance === 'requires' || b.stance === 'reads') && !closesOver(a.named, b.field)) {
    return extentsOverlap(a.extent, b.extent);
  }
  return false;
}

function row10(a: Claim, b: Claim): boolean {
  if (a.kind === 'field' && a.stance === 'forbids' && b.kind === 'field-cardinality') {
    return b.fields.includes(a.field) && b.fields.length - 1 < b.atLeast && extentsOverlap(a.extent, b.extent);
  }
  return false;
}

function row11(a: Claim, b: Claim): boolean {
  if (a.kind === 'field-closure' && b.kind === 'field-cardinality') {
    const open = b.fields.filter((f) => closesOver(a.named, f)).length;
    return open < b.atLeast && extentsOverlap(a.extent, b.extent);
  }
  return false;
}

function row12(a: Claim, b: Claim): boolean {
  if (a.kind === 'field-cardinality' && b.kind === 'field-cardinality' && a.atMost !== undefined) {
    const outsideCount = b.fields.filter((f) => !a.fields.includes(f)).length;
    return b.atLeast > a.atMost + outsideCount && extentsOverlap(a.extent, b.extent);
  }
  return false;
}

function checkCardinalityContradiction(a: Claim, b: Claim): boolean {
  return row10(a, b) || row11(a, b) || row12(a, b);
}

function row9(a: Extract<Claim, { kind: 'name-shape' }>, b: Claim): boolean {
  if (b.kind === 'file-exists' && b.stance === 'requires') {
    const hasRejected = b.extent.include.fileNames?.some((n) => !grammarAdmits(a.grammar.pattern, n)) ?? false;
    return hasRejected && extentsOverlap(a.extent, b.extent);
  }
  return false;
}

function row13(a: Extract<Claim, { kind: 'name-shape' }>, b: Claim): boolean {
  if (b.kind === 'field' && b.stance !== 'forbids') {
    const names = b.extent.include.fileNames;
    const empties = names !== undefined && names.length > 0 && names.every((n) => !grammarAdmits(a.grammar.pattern, n));
    return empties && contains(a.extent, b.extent);
  }
  return false;
}

function checkNameShapeContradiction(a: Claim, b: Claim): boolean {
  if (a.kind !== 'name-shape') return false;
  return row9(a, b) || row13(a, b);
}

function matchDirectedRow(a: Claim, b: Claim): boolean {
  return (
    checkBlockContradiction(a, b) ||
    checkFieldContradiction(a, b) ||
    checkClosureContradiction(a, b) ||
    checkCardinalityContradiction(a, b) ||
    checkNameShapeContradiction(a, b)
  );
}

/**
 * Whether two claims contradict each other under the 13 contradiction rows.
 */
export function claimsContradict(a: Claim, b: Claim): boolean {
  return matchDirectedRow(a, b) || matchDirectedRow(b, a);
}
