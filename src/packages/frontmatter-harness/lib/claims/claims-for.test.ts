// Colocated unit test for claimsForFrontmatter.

import { describe, expect, it } from 'vitest';
import type { FrontmatterConfig } from '../../section.types.ts';
import { claimsForFrontmatter } from './claims-for.pure.ts';

describe('claimsForFrontmatter', () => {
  describe('success cases', () => {
    it('projects frontmatter-block forbids claim', () => {
      // ARRANGE
      const expectedShape = {
        kind: 'frontmatter-block',
        stance: 'forbids',
        label: 'no-fm',
      };
      const section: FrontmatterConfig = {
        rules: [
          {
            ruleId: 'no-fm',
            intent: 'an index file carries no frontmatter',
            fileNames: ['index.md'],
            frontmatter: 'forbidden',
          },
        ],
      };
      // ACT
      const claims = claimsForFrontmatter(section);
      // ASSERT
      expect(claims).toHaveLength(1);
      expect(claims[0]).toMatchObject(expectedShape);
    });

    it('projects field requirements, reads, and closure', () => {
      // ARRANGE
      const section: FrontmatterConfig = {
        rules: [
          {
            ruleId: 'docs',
            intent: 'docs have type and optional author',
            folderTrees: ['docs/'],
            fields: {
              type: { presence: 'required' },
              author: { presence: 'optional' },
            },
            unknownKeys: 'forbidden',
          },
        ],
      };
      // ACT
      const claims = claimsForFrontmatter(section);
      const req = claims.find((c) => c.kind === 'field' && c.stance === 'requires');
      const read = claims.find((c) => c.kind === 'field' && c.stance === 'reads');
      const closure = claims.find((c) => c.kind === 'field-closure');
      // ASSERT
      expect(req).toBeDefined();
      expect(read).toBeDefined();
      expect(closure).toBeDefined();
    });
  });

  describe('failure cases', () => {
    it('handles empty rule list by projecting no claims', () => {
      // ARRANGE
      const emptyClaims: readonly unknown[] = [];
      const section: FrontmatterConfig = { rules: [] };
      // ACT
      const claims = claimsForFrontmatter(section);
      // ASSERT
      expect(claims).toEqual(emptyClaims);
    });
  });

  describe('edge cases', () => {
    it('accumulates earlier winning rules in recursive extent exclusions', () => {
      // ARRANGE
      const visionFolder = 'docs/vision/';
      const expectedInclude = { folders: [visionFolder] };
      const section: FrontmatterConfig = {
        rules: [
          {
            ruleId: 'rule-0',
            intent: 'first rule',
            folders: [visionFolder],
            fields: { type: { presence: 'required' } },
          },
          {
            ruleId: 'rule-1',
            intent: 'second rule',
            folderTrees: ['docs/'],
            fields: { type: { presence: 'required' } },
          },
        ],
      };
      // ACT
      const claims = claimsForFrontmatter(section);
      const secondRuleClaim = claims.find((c) => c.label === 'rule-1');
      // ASSERT
      expect(secondRuleClaim?.extent.exclude).toHaveLength(1);
      expect(secondRuleClaim?.extent.exclude[0]?.include).toEqual(expectedInclude);
    });
  });
});
