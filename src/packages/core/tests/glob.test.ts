// The characterization table for path matching.
//
// Under tenet 4 the config language is public, so path matching is public
// behaviour. `architecture.md` is explicit about what that costs: "delegating to
// a runtime built-in is fine; inheriting undocumented semantics from one is not,
// because a future port has nothing to hit." So this table is not a test of
// Node's `path.matchesGlob` — it is OUR specification, and Node happens to be
// the current implementation of it. A port passes by reproducing this table.
//
// Every row was measured, not reasoned about.

import { describe, expect, it } from 'vitest';
import { matches } from '../glob.ts';

/** [path, glob, expected, what the row pins] */
const TABLE: readonly [string, string, boolean, string][] = [
  // ── `**` ──────────────────────────────────────────────────────────────────
  [
    'docs/research/survey.md',
    'docs/research/**/*.md',
    true,
    '`**` matches ZERO directories — the row every other implementation disagrees about',
  ],
  ['docs/research/vendor/upstream.md', 'docs/research/**/*.md', true, '`**` matches one directory'],
  ['docs/a/b/c.md', 'docs/**', true, '`**` matches many directories'],
  ['log.md', '**/log.md', true, 'a leading `**/` matches at the root, so `fileName` sugar reaches top-level files'],
  ['docs/log.md', '**/log.md', true, 'a leading `**/` matches one level down'],
  ['docs/research/index.md', '**/index.md', true, 'a leading `**/` matches at depth'],
  ['docs/research/vendor', 'docs/research/vendor/**', false, 'a directory does not match its own `/**`'],

  // ── Segment awareness: the Jekyll defect, absent ──────────────────────────
  [
    'docs/logging/x.md',
    'docs/log/**',
    false,
    'matching is SEGMENT-aware, not prefix-based. Jekyll ranks scopes by byte length and its ' +
      '`path_is_subpath?` is a bare `start_with?`, so a rule for `docs/log` silently captures ' +
      '`docs/logging/`. Tenet 5 names this defect; this row is the evidence it is absent here.',
  ],
  ['docs/plain/notes.md', 'docs/*.md', false, 'a single `*` does not cross a `/`'],
  ['docs/notes.md', 'docs/*.md', true, 'a single `*` matches within one segment'],

  // ── Exactness ─────────────────────────────────────────────────────────────
  ['docs/research/provenance.md', 'docs/research/provenance.md', true, 'a glob with no metacharacter is an exact path'],
  ['docs/skills/legacy/SKILL.md', 'docs/skills/**/SKILL.md', true, 'a basename after `**/` matches at depth'],
  ['docs/skills/SKILL.md', 'docs/skills/**/SKILL.md', true, 'and matches with no intervening directory at all'],

  // ── Two rows an adopter will meet ─────────────────────────────────────────
  [
    'docs/INDEX.md',
    '**/index.md',
    false,
    'matching is CASE-SENSITIVE, on every platform. On a case-insensitive filesystem — macOS by ' +
      'default — an adopter can therefore have a file that opens as `index.md` and is governed by ' +
      'no rule. Pinned because it is surprising, not because it is convenient.',
  ],
  ['docs/index.MD', '**/index.md', false, 'the extension is part of that case-sensitivity'],
  [
    'docs/research/.hidden.md',
    'docs/research/**/*.md',
    false,
    '`*` does not match a leading dot, so a dotfile is ungoverned unless a rule names it. ' +
      'Governance is opt-in by path (tenet 6), and this is one more way a file can fall outside it.',
  ],
];

describe('path matching is this table, and this table is the specification', () => {
  it.each(TABLE)('%s <> %s → %s', (path, glob, expected) => {
    expect(matches(path, glob)).toBe(expected);
  });

  it('states what each row pins, so a port knows what it is reproducing', () => {
    for (const [, , , why] of TABLE) expect(why).toBeTruthy();
  });
});
