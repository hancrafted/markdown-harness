import { describe, expect, it } from 'vitest';

import { appendActivity, normaliseActivityCap } from '../activity-log.ts';
import { formatReviewNotice } from '../assess-hook.ts';
import { insertDemoBlock, removeDemoBlock } from '../demo.ts';
import { extendGate } from '../initialization.ts';

const ASSESSMENT = {
  module: 'frontmatter',
  instruction: 'Refresh these instructions before using them.',
  evidence: { value: '2026-09-01T00:00:00Z' },
  rule: { ruleId: 'runbooks', intent: 'Runbooks name their freshness.' },
};
const ASSESSED_PATH = 'docs/runbooks/deploy.md';
const ASSESSMENT_INSTANT = '2026-09-22T00:00:00Z';
const NOTICE = [
  'markdown-harness: docs/runbooks/deploy.md is past its stale_after under Module "frontmatter".',
  '',
  'Refresh these instructions before using them.',
  '',
  'stale_after 2026-09-01T00:00:00Z, assessed at 2026-09-22T00:00:00Z. Rule "runbooks": Runbooks name their freshness.',
].join('\n');
const EXISTING_GATE = 'tsc --noEmit';
const CHECK = 'mh --check';
const EXTENDED_GATE = 'tsc --noEmit && mh --check';
const DEMO_BLOCK = '    - ruleId: markdown-harness-demo';
const CONFIG_WITH_RULES = 'frontmatter:\n  rules:\n';
const CONFIG_WITHOUT_RULES = 'frontmatter:\n  fields:\n';
const CONFIG_WITH_DEMO = 'frontmatter:\n  rules:\n    - ruleId: markdown-harness-demo\n';
const CONFIG_WITH_MARKED_DEMO = [
  'frontmatter:',
  '  rules:',
  '    # --- BEGIN markdown-harness demo ---',
  '    - ruleId: markdown-harness-demo',
  '    # --- END markdown-harness demo ---',
  '',
].join('\n');
const HEADER = 'time,command,file,result';
const ROW_INSTANT = '2026-09-22T00:00:00.000Z';
const COMMA_PATH = 'docs/runbooks/deploy, then verify.md';
const ACTIVITY = `${HEADER}\n${ROW_INSTANT},assess,"${COMMA_PATH}",stale\n`;
const DEFAULT_LINE_CAP = 1000;
const INVALID_CAP = 'not-a-number';

describe('skill runtime', () => {
  describe('success cases', () => {
    it('formats the review notice from the assessment the command returned', () => {
      // ARRANGE
      const expected = NOTICE;
      // ACT
      const actual = formatReviewNotice({ path: ASSESSED_PATH, now: ASSESSMENT_INSTANT, assessment: ASSESSMENT });
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('extends an existing gate with the check command', () => {
      // ARRANGE
      const expected = EXTENDED_GATE;
      // ACT
      const actual = extendGate(EXISTING_GATE, CHECK);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses to insert a demo rule when the config has no rules key', () => {
      // ARRANGE
      const expected = undefined;
      // ACT
      const actual = insertDemoBlock(CONFIG_WITHOUT_RULES, DEMO_BLOCK);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('leaves an unmarked config unchanged when removing a demo rule', () => {
      // ARRANGE
      const expected = { text: CONFIG_WITHOUT_RULES, found: false };
      // ACT
      const actual = removeDemoBlock(CONFIG_WITHOUT_RULES);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps the shipped cap when an environment override is invalid', () => {
      // ARRANGE
      const expected = DEFAULT_LINE_CAP;
      // ACT
      const actual = normaliseActivityCap(INVALID_CAP, DEFAULT_LINE_CAP);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('quotes a comma-bearing activity path while adding the header', () => {
      // ARRANGE
      const expected = ACTIVITY;
      // ACT
      const actual = appendActivity('', {
        instant: ROW_INSTANT,
        command: 'assess',
        file: COMMA_PATH,
        result: 'stale',
        maxLines: 0,
        maxDays: 0,
        now: ROW_INSTANT,
      });
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('inserts a demo rule directly below the rules key', () => {
      // ARRANGE
      const expected = CONFIG_WITH_DEMO;
      // ACT
      const actual = insertDemoBlock(CONFIG_WITH_RULES, DEMO_BLOCK);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('removes only the marked demo block', () => {
      // ARRANGE
      const expected = { text: CONFIG_WITH_RULES, found: true };
      // ACT
      const actual = removeDemoBlock(CONFIG_WITH_MARKED_DEMO);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
