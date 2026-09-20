/**
 * Projection from validated FrontmatterConfig to Core claim vocabulary (design-ADR 0008).
 */

import type { Claim, ClaimExtent, FieldConstraints, Selector } from '../../../config-contract/index.ts';
import type { FrontmatterConfig, FrontmatterRule } from '../../section.types.ts';
import { allowedKeysFor } from '../check/unknown-key.pure.ts';

interface ClaimProvenance {
  readonly atPrefix: string;
  readonly label: string;
  readonly extent: ClaimExtent;
}

function selectorOf(rule: FrontmatterRule): Selector {
  const sel: Selector = {};
  if (rule.folders) sel.folders = rule.folders;
  if (rule.folderTrees) sel.folderTrees = rule.folderTrees;
  if (rule.fileNames) sel.fileNames = rule.fileNames;
  return sel;
}

function singleFieldClaim(fieldAddress: string, constraints: FieldConstraints, prov: ClaimProvenance): Claim {
  const at = `${prov.atPrefix}.fields.${fieldAddress}`;
  if (constraints.presence === 'required') {
    return { kind: 'field', stance: 'requires', field: fieldAddress, at, label: prov.label, extent: prov.extent };
  }
  if (constraints.presence === 'forbidden') {
    return { kind: 'field', stance: 'forbids', field: fieldAddress, at, label: prov.label, extent: prov.extent };
  }
  return { kind: 'field', stance: 'reads', field: fieldAddress, at, label: prov.label, extent: prov.extent };
}

function fieldClaims(rule: FrontmatterRule, prov: ClaimProvenance): readonly Claim[] {
  if (rule.fields === undefined) return [];
  return Object.entries(rule.fields).map(([f, c]) => singleFieldClaim(f, c, prov));
}

function cardinalityClaims(rule: FrontmatterRule, prov: ClaimProvenance): readonly Claim[] {
  const claims: Claim[] = [];
  if (rule.exactlyOneOf !== undefined) {
    claims.push({
      kind: 'field-cardinality',
      stance: 'requires',
      fields: rule.exactlyOneOf,
      atLeast: 1,
      atMost: 1,
      at: `${prov.atPrefix}.exactlyOneOf`,
      label: prov.label,
      extent: prov.extent,
    });
  }
  if (rule.anyOf !== undefined) {
    claims.push({
      kind: 'field-cardinality',
      stance: 'requires',
      fields: rule.anyOf,
      atLeast: 1,
      at: `${prov.atPrefix}.anyOf`,
      label: prov.label,
      extent: prov.extent,
    });
  }
  return claims;
}

function closureClaims(rule: FrontmatterRule, prov: ClaimProvenance): readonly Claim[] {
  if (rule.unknownKeys !== 'forbidden') return [];
  return [
    {
      kind: 'field-closure',
      stance: 'forbids',
      named: allowedKeysFor(rule),
      at: `${prov.atPrefix}.unknownKeys`,
      label: prov.label,
      extent: prov.extent,
    },
  ];
}

function allOfClaims(rule: FrontmatterRule, prov: ClaimProvenance): readonly Claim[] {
  if (rule.allOf === undefined) return [];
  return rule.allOf.map((field) => ({
    kind: 'field',
    stance: 'requires',
    field,
    at: `${prov.atPrefix}.allOf`,
    label: prov.label,
    extent: prov.extent,
  }));
}

function setClaims(rule: FrontmatterRule, prov: ClaimProvenance): readonly Claim[] {
  return [...closureClaims(rule, prov), ...cardinalityClaims(rule, prov), ...allOfClaims(rule, prov)];
}

function buildExtent(rule: FrontmatterRule, earlier: readonly ClaimExtent[]): ClaimExtent {
  const exclusions: ClaimExtent[] = (rule.excludeFiles ?? []).map((sel) => ({
    include: sel,
    exclude: [],
  }));
  return {
    include: selectorOf(rule),
    exclude: [...exclusions, ...earlier],
  };
}

function claimsForRule(rule: FrontmatterRule, i: number, earlier: ClaimExtent[]): readonly Claim[] {
  const extent = buildExtent(rule, earlier);
  earlier.push(extent);

  const prov: ClaimProvenance = {
    atPrefix: `frontmatter.rules[${i}]`,
    label: rule.ruleId,
    extent,
  };

  if (rule.frontmatter === 'forbidden') {
    return [
      {
        kind: 'frontmatter-block',
        stance: 'forbids',
        at: `${prov.atPrefix}.frontmatter`,
        label: prov.label,
        extent,
      },
    ];
  }

  return [...fieldClaims(rule, prov), ...setClaims(rule, prov)];
}

/**
 * Project a validated frontmatter section into Core claims over recursive extents.
 *
 * @param section The validated FrontmatterConfig.
 */
export function claimsForFrontmatter(section: FrontmatterConfig): readonly Claim[] {
  const earlierExtents: ClaimExtent[] = [];
  return section.rules.flatMap((rule, i) => claimsForRule(rule, i, earlierExtents));
}
