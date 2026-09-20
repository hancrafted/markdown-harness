// Unit test for the 13 contradiction rows.

import { describe, expect, it } from 'vitest';
import type { Claim, ClaimExtent, NamedExtent } from '../../../config-contract/index.ts';
import { claimsContradict } from './contradiction-table.pure.ts';

const baseExtent: ClaimExtent = {
  include: { folderTrees: ['docs/'] },
  exclude: [],
};

describe('contradiction table', () => {
  describe('success cases', () => {
    it('detects Row 1: frontmatter-block forbids x frontmatter-block requires', () => {
      // ARRANGE
      const a: Claim = { at: 'site-a', extent: baseExtent, kind: 'frontmatter-block', stance: 'forbids' };
      const b: Claim = { at: 'site-b', extent: baseExtent, kind: 'frontmatter-block', stance: 'requires' };
      // ACT
      const contradicts = claimsContradict(a, b);
      // ASSERT
      expect(contradicts).toBe(true);
    });

    it('detects Row 2: frontmatter-block forbids x field requires', () => {
      // ARRANGE
      const a: Claim = { at: 'site-a', extent: baseExtent, kind: 'frontmatter-block', stance: 'forbids' };
      const b: Claim = { at: 'site-b', extent: baseExtent, kind: 'field', stance: 'requires', field: 'type' };
      // ACT
      const contradicts = claimsContradict(a, b);
      // ASSERT
      expect(contradicts).toBe(true);
    });

    it('detects Row 3: frontmatter-block forbids x field reads', () => {
      // ARRANGE
      const a: Claim = { at: 'site-a', extent: baseExtent, kind: 'frontmatter-block', stance: 'forbids' };
      const b: Claim = { at: 'site-b', extent: baseExtent, kind: 'field', stance: 'reads', field: 'author' };
      // ACT
      const contradicts = claimsContradict(a, b);
      // ASSERT
      expect(contradicts).toBe(true);
    });

    it('detects Row 4: frontmatter-block forbids x field-cardinality atLeast >= 1', () => {
      // ARRANGE
      const a: Claim = { at: 'site-a', extent: baseExtent, kind: 'frontmatter-block', stance: 'forbids' };
      const b: Claim = {
        at: 'site-b',
        extent: baseExtent,
        kind: 'field-cardinality',
        stance: 'requires',
        fields: ['title', 'name'],
        atLeast: 1,
      };
      // ACT
      const contradicts = claimsContradict(a, b);
      // ASSERT
      expect(contradicts).toBe(true);
    });

    it('detects Row 5 & 6: field forbids x field requires/reads at same address', () => {
      // ARRANGE
      const a: Claim = { at: 'site-a', extent: baseExtent, kind: 'field', stance: 'forbids', field: 'draft' };
      const bReq: Claim = { at: 'site-b', extent: baseExtent, kind: 'field', stance: 'requires', field: 'draft' };
      const bRead: Claim = { at: 'site-c', extent: baseExtent, kind: 'field', stance: 'reads', field: 'draft' };
      // ACT
      const reqContradicts = claimsContradict(a, bReq);
      const readContradicts = claimsContradict(a, bRead);
      // ASSERT
      expect(reqContradicts).toBe(true);
      expect(readContradicts).toBe(true);
    });

    it('detects Row 7 & 8: field-closure x field requires/reads outside named keys', () => {
      // ARRANGE
      const a: Claim = { at: 'site-a', extent: baseExtent, kind: 'field-closure', stance: 'forbids', named: ['title'] };
      const bReq: Claim = { at: 'site-b', extent: baseExtent, kind: 'field', stance: 'requires', field: 'date' };
      const bRead: Claim = { at: 'site-c', extent: baseExtent, kind: 'field', stance: 'reads', field: 'extra.nested' };
      // ACT
      const reqContradicts = claimsContradict(a, bReq);
      const readContradicts = claimsContradict(a, bRead);
      // ASSERT
      expect(reqContradicts).toBe(true);
      expect(readContradicts).toBe(true);
    });

    it('detects Row 9: name-shape requires x file-exists requires naming rejected name', () => {
      // ARRANGE
      const a: Claim = {
        at: 'site-a',
        extent: baseExtent,
        kind: 'name-shape',
        stance: 'requires',
        grammar: { pattern: '^[a-z]+\\.md$' },
      };
      const namedExtent: NamedExtent = {
        include: { folderTrees: ['docs/'], fileNames: ['UPPER.md'] },
        exclude: [],
      };
      const b: Claim = { at: 'site-b', extent: namedExtent, kind: 'file-exists', stance: 'requires' };
      // ACT
      const contradicts = claimsContradict(a, b);
      // ASSERT
      expect(contradicts).toBe(true);
    });

    it('detects Row 10: field forbids x field-cardinality that cannot spare the address', () => {
      // ARRANGE
      const a: Claim = { at: 'site-a', extent: baseExtent, kind: 'field', stance: 'forbids', field: 'a' };
      const b: Claim = {
        at: 'site-b',
        extent: baseExtent,
        kind: 'field-cardinality',
        stance: 'requires',
        fields: ['a'],
        atLeast: 1,
      };
      // ACT
      const contradicts = claimsContradict(a, b);
      // ASSERT
      expect(contradicts).toBe(true);
    });

    it('detects Row 11: field-closure x field-cardinality with too few keys left open', () => {
      // ARRANGE
      const a: Claim = { at: 'site-a', extent: baseExtent, kind: 'field-closure', stance: 'forbids', named: ['x'] };
      const b: Claim = {
        at: 'site-b',
        extent: baseExtent,
        kind: 'field-cardinality',
        stance: 'requires',
        fields: ['y', 'z'],
        atLeast: 1,
      };
      // ACT
      const contradicts = claimsContradict(a, b);
      // ASSERT
      expect(contradicts).toBe(true);
    });

    it('detects Row 12: field-cardinality atMost x field-cardinality atLeast', () => {
      // ARRANGE
      const a: Claim = {
        at: 'site-a',
        extent: baseExtent,
        kind: 'field-cardinality',
        stance: 'requires',
        fields: ['f1', 'f2'],
        atLeast: 0,
        atMost: 1,
      };
      const b: Claim = {
        at: 'site-b',
        extent: baseExtent,
        kind: 'field-cardinality',
        stance: 'requires',
        fields: ['f1', 'f2'],
        atLeast: 2,
      };
      // ACT
      const contradicts = claimsContradict(a, b);
      // ASSERT
      expect(contradicts).toBe(true);
    });

    it('detects Row 13: name-shape requires x field over an extent the grammar empties', () => {
      // ARRANGE
      const a: Claim = {
        at: 'site-a',
        extent: baseExtent,
        kind: 'name-shape',
        stance: 'requires',
        grammar: { pattern: '^valid_.*\\.md$' },
      };
      const innerExtent: ClaimExtent = {
        include: { folderTrees: ['docs/'], fileNames: ['invalid.md'] },
        exclude: [],
      };
      const b: Claim = {
        at: 'site-b',
        extent: innerExtent,
        kind: 'field',
        stance: 'requires',
        field: 'type',
      };
      // ACT
      const contradicts = claimsContradict(a, b);
      // ASSERT
      expect(contradicts).toBe(true);
    });
  });

  describe('failure cases', () => {
    it('reports no contradiction when extents are disjoint', () => {
      // ARRANGE
      const aExtent: ClaimExtent = { include: { folders: ['docs/a/'] }, exclude: [] };
      const bExtent: ClaimExtent = { include: { folders: ['docs/b/'] }, exclude: [] };
      const a: Claim = { at: 'site-a', extent: aExtent, kind: 'frontmatter-block', stance: 'forbids' };
      const b: Claim = { at: 'site-b', extent: bExtent, kind: 'frontmatter-block', stance: 'requires' };
      // ACT
      const contradicts = claimsContradict(a, b);
      // ASSERT
      expect(contradicts).toBe(false);
    });

    it('reports no contradiction when field forbids does not match required address', () => {
      // ARRANGE
      const a: Claim = { at: 'site-a', extent: baseExtent, kind: 'field', stance: 'forbids', field: 'draft' };
      const b: Claim = { at: 'site-b', extent: baseExtent, kind: 'field', stance: 'requires', field: 'title' };
      // ACT
      const contradicts = claimsContradict(a, b);
      // ASSERT
      expect(contradicts).toBe(false);
    });

    it('reports no contradiction when field-closure allows the required field', () => {
      // ARRANGE
      const a: Claim = {
        at: 'site-a',
        extent: baseExtent,
        kind: 'field-closure',
        stance: 'forbids',
        named: ['title', 'date'],
      };
      const b: Claim = { at: 'site-b', extent: baseExtent, kind: 'field', stance: 'requires', field: 'title' };
      // ACT
      const contradicts = claimsContradict(a, b);
      // ASSERT
      expect(contradicts).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('is symmetric: order of arguments does not affect the outcome', () => {
      // ARRANGE
      const a: Claim = { at: 'site-a', extent: baseExtent, kind: 'frontmatter-block', stance: 'forbids' };
      const b: Claim = { at: 'site-b', extent: baseExtent, kind: 'field', stance: 'requires', field: 'type' };
      // ACT
      const forward = claimsContradict(a, b);
      const backward = claimsContradict(b, a);
      // ASSERT
      expect(forward).toBe(true);
      expect(backward).toBe(true);
    });

    it('correctly compares segmented top-level keys for nested fields in closure', () => {
      // ARRANGE
      const a: Claim = {
        at: 'site-a',
        extent: baseExtent,
        kind: 'field-closure',
        stance: 'forbids',
        named: ['sources'],
      };
      const bInside: Claim = {
        at: 'site-b',
        extent: baseExtent,
        kind: 'field',
        stance: 'requires',
        field: 'sources[].resource',
      };
      const bOutside: Claim = {
        at: 'site-c',
        extent: baseExtent,
        kind: 'field',
        stance: 'requires',
        field: 'author.name',
      };
      // ACT
      const insideContradicts = claimsContradict(a, bInside);
      const outsideContradicts = claimsContradict(a, bOutside);
      // ASSERT
      expect(insideContradicts).toBe(false);
      expect(outsideContradicts).toBe(true);
    });
  });
});
