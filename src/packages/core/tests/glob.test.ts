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

  // ── Directory paths against file globs ───────────────────────────────────
  // FOLDER QUERIES WERE REMOVED. `query` treats every path as given, so nothing
  // below is reachable through an entry point today. The rows are kept because
  // they are MEASUREMENTS rather than decisions, and they are the evidence base
  // that would decide whether folder queries can come back: two of them are
  // residuals no normalisation fixes, and the second is the one that would sink
  // the feature. Re-deriving this later would cost the same afternoon twice.
  [
    'docs/research/survey.md',
    'docs/**',
    true,
    'a directory-shaped glob governs FILES too, so one config serves both query kinds and there ' +
      'is no trade-off to make. The `*.md` suffixes in `fixtures/valid-test-config.yaml` are a ' +
      'coverage device, not a convention.',
  ],
  ['docs', 'docs/**', false, 'a tree root does not match its own `/**` — the same rule as the `vendor` row above'],
  [
    'docs/research/',
    'docs/research/**',
    true,
    'but WITH a trailing slash it does. This is why a folder query would have to normalise to a ' +
      'trailing slash: without it, the MOST SPECIFIC rule for a folder is not even a candidate, ' +
      'and a config whose only rule is `docs/research/**` would answer `governedBy: null` for ' +
      '`docs/research` — "invisible", about a folder whose files it plainly governs.',
  ],
  [
    'docs/research',
    'docs/*',
    true,
    'RESIDUAL ONE, a false positive that the trailing slash does NOT fix: a rule selecting files ' +
      'directly in `docs/` matches the DIRECTORY `docs/research` and governs nothing in it. ' +
      'Compare the row below — `docs/*` does not match `docs/research/survey.md`, so the rule ' +
      'genuinely reaches nothing under that folder.',
  ],
  ['docs/research/', 'docs/*', true, 'and it still matches once normalised, so the slash is no help here'],
  ['docs/research/survey.md', 'docs/*', false, 'the row that proves the two above are a false positive'],
  [
    'docs/research/',
    'docs/research/*',
    false,
    'RESIDUAL TWO, a false negative, and the worse direction: `*` needs a segment to consume, so ' +
      'a rule written `X/*` is never found by a query for `X` itself, in either spelling. It ' +
      "fails towards `governedBy: null`, which is the payload's strongest claim.",
  ],
  // Both residuals are one root cause: a directory path is being matched
  // against a glob that selects FILES, and only `**` survives that category
  // error intact. Getting both right needs glob INTERSECTION — "could this glob
  // match anything under here" — which `matchesGlob` does not offer, and that
  // cost is what folder queries could not carry.

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
