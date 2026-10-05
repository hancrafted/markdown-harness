// The `PreToolUse` hook that puts `mh query`'s body-structure candidates in
// front of an agent about to create a file, exercised at the process boundary
// an agent reaches it through (#221's stretch: mechanism 1).
//
// Like `assess-hook.test.ts`, it sits here because enforcement does and not
// because the CLI is its subject. Silence is the hard part, so every silent case
// is paired with a speaking one it differs from by one arranged fact.

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const HOOK = resolve('.agents/skills/markdown-harness/scripts/query-hook.mjs');
const INSTALLED_AT = join('node_modules', '@hancrafted', 'markdown-harness');
const CONFIG_NAME = 'markdown-harness.config.yaml';

const RESEARCH_INTENT = 'Research reads the same way every time.';
const FINDINGS_INTENT = 'What was measured, with numbers.';
const SOURCE_INTENT = 'One section per source consulted.';
const CATCH_ALL_INTENT = 'Any other research file has one title.';
const NEVER_REACHED_INTENT = 'Shadowed by the catch-all above it.';

/** Two Rules for the folder, the second carrying no `types`, then one the catch-all shadows. */
const CONFIG = [
  'body-structure:',
  '  rules:',
  '    - ruleId: research-reports',
  '      folders: [docs/research/]',
  '      types: [research]',
  `      intent: ${RESEARCH_INTENT}`,
  '      maxLevel: 3',
  '      headings:',
  '        - { purpose: heading, level: 1 }',
  `        - { purpose: heading, level: 2, pattern: '^Findings$', intent: '${FINDINGS_INTENT}' }`,
  `        - { purpose: enumeration, level: 2, pattern: '^Source: ', minCount: 1, maxCount: 5, intent: '${SOURCE_INTENT}' }`,
  '    - ruleId: research-untyped',
  '      folders: [docs/research/]',
  `      intent: ${CATCH_ALL_INTENT}`,
  '      maxLevel: 1',
  '    - ruleId: shadowed',
  '      folders: [docs/research/]',
  '      types: [memo]',
  `      intent: ${NEVER_REACHED_INTENT}`,
  '      maxLevel: 2',
  '',
].join('\n');

const FRONTMATTER_ONLY = [
  'frontmatter:',
  '  rules:',
  '    - ruleId: notes',
  '      folders: [docs/research/]',
  '      intent: Notes say what they are.',
  '      fields:',
  '        description: { presence: required }',
  '',
].join('\n');

const ADDED_INTENT = 'New features.';
const TRADE_OFFS_INTENT = 'What choosing this option costs.';

/**
 * A Keep a Changelog Rule (one level of nesting) and an ADR Rule (two levels),
 * spelled with `allowed` titles and `mayHold`, in two folders of one config.
 */
const NESTED_CONFIG = [
  'body-structure:',
  '  rules:',
  '    - ruleId: changelog',
  '      folders: [docs/changelog/]',
  '      intent: Releases list their changes by type.',
  '      headings:',
  "        - { purpose: heading, level: 1, pattern: '^Changelog$' }",
  '        - purpose: enumeration',
  '          level: 2',
  "          pattern: '^\\['",
  '          minCount: 1',
  '          headings:',
  `            - { purpose: heading, level: 3, presence: optional, allowed: [{ title: Added, intent: '${ADDED_INTENT}' }] }`,
  '            - { purpose: heading, level: 3, presence: optional, allowed: [{ title: Fixed }] }',
  '    - ruleId: adr',
  '      folders: [docs/adr/]',
  '      intent: Decisions weigh options and name consequences.',
  '      undefinedHeadings: forbid',
  '      headings:',
  '        - { purpose: heading, level: 1 }',
  '        - purpose: heading',
  '          level: 2',
  '          allowed: [{ title: Options }]',
  '          headings:',
  '            - purpose: enumeration',
  '              level: 3',
  "              pattern: '^Option '",
  '              minCount: 2',
  '              headings:',
  `                - { purpose: heading, level: 4, presence: optional, allowed: [{ title: Trade-offs, intent: '${TRADE_OFFS_INTENT}' }, { title: Risks }] }`,
  '        - purpose: heading',
  '          level: 2',
  '          allowed: [{ title: Consequences }]',
  '          headings:',
  '            - { purpose: heading, level: 3, allowed: [{ title: Positive }], mayHold: [unordered-list] }',
  '            - { purpose: heading, level: 3, allowed: [{ title: Negative }], mayHold: [prose, unordered-list] }',
  '',
].join('\n');

let governed = '';
let nested = '';
let frontmatterOnly = '';
let unconfigured = '';

function install(root: string): void {
  mkdirSync(join(root, 'node_modules', '@hancrafted'), { recursive: true });
  symlinkSync(resolve('.'), join(root, INSTALLED_AT), 'junction');
}

function corpus(prefix: string, config?: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(root, 'docs', 'research'), { recursive: true });
  if (config !== undefined) writeFileSync(join(root, CONFIG_NAME), config);
  writeFileSync(join(root, 'docs', 'research', 'existing.md'), '# Exists\n');
  install(root);
  return root;
}

beforeAll(() => {
  governed = corpus('mh-qhook-governed-', CONFIG);
  nested = corpus('mh-qhook-nested-', NESTED_CONFIG);
  frontmatterOnly = corpus('mh-qhook-frontmatter-', FRONTMATTER_ONLY);
  unconfigured = corpus('mh-qhook-unconfigured-');
});

afterAll(() => {
  for (const root of [governed, nested, frontmatterOnly, unconfigured]) rmSync(root, { recursive: true, force: true });
});

/** The hook's stdout and exit code for one tool call. */
function fire(tool: string, root: string, relative: string): { stdout: string; status: number | null } {
  const payload = { tool_name: tool, tool_input: { file_path: join(root, relative) } };
  const run = spawnSync(process.execPath, [HOOK], { input: JSON.stringify(payload), encoding: 'utf8' });
  return { stdout: run.stdout, status: run.status };
}

/** The `additionalContext` the hook handed back, or the empty string when it said nothing. */
function spoken(tool: string, root: string, relative: string): string {
  const { stdout } = fire(tool, root, relative);
  return stdout === '' ? '' : (JSON.parse(stdout).hookSpecificOutput.additionalContext as string);
}

describe('the query hook', () => {
  describe('success cases', () => {
    it('hands an agent about to create a governed file the spine of every candidate Rule, intents and patterns included', () => {
      // ARRANGE
      const expected = [
        'Rule "research-reports" (type research)',
        FINDINGS_INTENT,
        SOURCE_INTENT,
        '/^Findings$/',
        '/^Source: /',
        'at least 1, at most 5',
        'no heading deeper than level 3',
        'Rule "research-untyped" (any type)',
      ];
      // ACT
      const actual = spoken('Write', governed, 'docs/research/new.md');
      // ASSERT
      for (const fragment of expected) expect(actual).toContain(fragment);
    });

    it('names an entry by its allowed titles, each with its intent, never as any text', () => {
      // ARRANGE
      const expected = [
        `    ### "Added" (${ADDED_INTENT}), optional, once`,
        '    ### "Fixed", optional, once',
        `      #### one of "Trade-offs" (${TRADE_OFFS_INTENT}), "Risks", optional, once`,
      ];
      // ACT
      const actual = [
        spoken('Write', nested, 'docs/changelog/CHANGELOG.md'),
        spoken('Write', nested, 'docs/adr/0001-pick.md'),
      ].flatMap((text) => text.split('\n'));
      // ASSERT
      for (const line of expected) expect(actual).toContain(line);
    });

    it('renders a nested spine under its parent, indented one step per level of nesting', () => {
      // ARRANGE
      const changelog = [
        '  # text matching /^Changelog$/, once',
        '  ## text matching /^\\[/, repeating (at least 1)',
        `    ### "Added" (${ADDED_INTENT}), optional, once`,
        '    ### "Fixed", optional, once',
      ].join('\n');
      const adr = [
        '  # any text, once',
        '  ## "Options", once',
        '    ### text matching /^Option /, repeating (at least 2)',
        `      #### one of "Trade-offs" (${TRADE_OFFS_INTENT}), "Risks", optional, once`,
        '  ## "Consequences", once',
      ].join('\n');
      // ACT
      const actual = [
        spoken('Write', nested, 'docs/changelog/CHANGELOG.md'),
        spoken('Write', nested, 'docs/adr/0001-pick.md'),
      ];
      // ASSERT
      expect(actual[0]).toContain(changelog);
      expect(actual[1]).toContain(adr);
    });

    it('names the blocks a section may hold before its first sub-heading, and a closed spine', () => {
      // ARRANGE
      const expected = [
        '    ### "Positive", once, holding only unordered-list before any sub-heading',
        '    ### "Negative", once, holding only prose or unordered-list before any sub-heading',
        '  no heading outside these entries (undefinedHeadings: forbid)',
      ];
      // ACT
      const actual = spoken('Write', nested, 'docs/adr/0001-pick.md').split('\n');
      // ASSERT
      for (const line of expected) expect(actual).toContain(line);
    });

    it('ends the list at the first Rule that wins every type, so a shadowed Rule is never shown', () => {
      // ARRANGE
      const shadowed = NEVER_REACHED_INTENT;
      // ACT
      const actual = spoken('Write', governed, 'docs/research/new.md');
      // ASSERT
      expect(actual).not.toContain(shadowed);
      expect(actual).toContain(CATCH_ALL_INTENT);
    });
  });

  describe('failure cases', () => {
    it('stays silent for a file that already exists, where a new path beside it speaks', () => {
      // ARRANGE
      const silent = '';
      // ACT
      const actual = [
        spoken('Write', governed, 'docs/research/existing.md'),
        spoken('Write', governed, 'docs/research/other.md'),
      ];
      // ASSERT
      expect(actual[0]).toBe(silent);
      expect(actual[1]).toContain(CATCH_ALL_INTENT);
    });

    it('stays silent for a tool that is not a Write and for a path that is not markdown', () => {
      // ARRANGE
      const silent = '';
      // ACT
      const actual = [
        spoken('Edit', governed, 'docs/research/new.md'),
        spoken('Write', governed, 'docs/research/new.txt'),
      ];
      // ASSERT
      expect(actual).toEqual([silent, silent]);
    });

    it('stays silent when no config sits above the file, and when the config has no body-structure section', () => {
      // ARRANGE
      const silent = '';
      // ACT
      const actual = [
        spoken('Write', unconfigured, 'docs/research/new.md'),
        spoken('Write', frontmatterOnly, 'docs/research/new.md'),
      ];
      // ASSERT
      expect(actual).toEqual([silent, silent]);
    });
  });

  describe('edge cases', () => {
    it('exits 0 and says nothing for a payload that is not JSON', () => {
      // ARRANGE
      const expected = { stdout: '', status: 0 };
      // ACT
      const run = spawnSync(process.execPath, [HOOK], { input: 'not json', encoding: 'utf8' });
      // ASSERT
      expect({ stdout: run.stdout, status: run.status }).toEqual(expected);
    });

    it('exits 0 whether it speaks or not', () => {
      // ARRANGE
      const expected = [0, 0];
      // ACT
      const actual = [
        fire('Write', governed, 'docs/research/new.md').status,
        fire('Write', governed, 'docs/research/existing.md').status,
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
