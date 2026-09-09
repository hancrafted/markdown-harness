// Every config example this repo ships to an adopter must load.
//
// A published example that the tool rejects is worse than no example: the first
// command a new adopter runs is a copy of it, and the answer they get is exit 2.
// That happened — the README's primary example omitted `ruleId` through 0.0.2 —
// so this suite reads the shipped text itself rather than a copy of it, and a
// copy that drifts from the source it documents cannot pass by construction.
//
// The README blocks have no committed file of their own, so they are extracted
// and written to an explicit path named in the test. The starter config is a
// real committed file and is read where it lives.

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../load-config.ts';

const README = 'README.md';
const STARTER_CONFIG = '.agents/skills/markdown-harness/assets/starter-config.yaml';

const scratch = mkdtempSync(join(tmpdir(), 'mh-shipped-examples-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/**
 * Every ```yaml block in a markdown file, in document order.
 *
 * Hand-written rather than imported: the extractor is part of what this suite
 * asserts, so it stays where a reader can see what it matched.
 */
function yamlBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  let open: string[] | undefined;
  for (const line of markdown.split('\n')) {
    if (open === undefined && line.trimEnd() === '```yaml') open = [];
    else if (open !== undefined && line.trimEnd() === '```') {
      blocks.push(open.join('\n'));
      open = undefined;
    } else if (open !== undefined) open.push(line);
  }
  return blocks;
}

/** Only the blocks that are configs — a block naming the `frontmatter:` section. */
function configBlocks(markdown: string): string[] {
  return yamlBlocks(markdown).filter((block) => block.includes('frontmatter:'));
}

function loadFromText(yaml: string, name: string) {
  const path = join(scratch, name);
  writeFileSync(path, yaml);
  return loadConfig(path);
}

describe('shipped config examples', () => {
  describe('success cases', () => {
    it('loads the starter config the skill points at, with no faults', () => {
      // ARRANGE
      const noFaults = 0;
      const atLeastOneRule = 0;
      // ACT
      const actual = loadConfig(STARTER_CONFIG);
      // ASSERT
      expect(actual.faults).toHaveLength(noFaults);
      expect(actual.config?.frontmatter?.rules.length).toBeGreaterThan(atLeastOneRule);
    });

    it('loads every config example in the README, with no faults', () => {
      // ARRANGE
      const noFaults: unknown[] = [];
      const blocks = configBlocks(readFileSync(README, 'utf8'));
      // ACT
      const actual = blocks.map((block, index) => ({
        index,
        faults: loadFromText(block, `readme-${index}.yaml`).faults,
      }));
      // ASSERT
      expect(actual).toEqual(blocks.map((_, index) => ({ index, faults: noFaults })));
    });
  });

  describe('failure cases', () => {
    it('reports the exact key when a rule in a shipped example loses its ruleId', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: 'frontmatter.rules[0].ruleId' }];
      const starter = readFileSync(STARTER_CONFIG, 'utf8');
      const withoutFirstRuleId = starter.replace(/^(\s*)- ruleId: .*$/m, '$1-');
      // ACT
      const actual = loadFromText(withoutFirstRuleId, 'starter-without-ruleid.yaml');
      // ASSERT
      expect(actual.faults).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('finds config blocks in the README, so a broken extractor cannot pass over nothing', () => {
      // ARRANGE
      const atLeastOne = 0;
      // ACT
      const actual = configBlocks(readFileSync(README, 'utf8'));
      // ASSERT
      expect(actual.length).toBeGreaterThan(atLeastOne);
    });
  });
});
