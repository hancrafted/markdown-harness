/**
 * The exact bytes of the region, and of the file created to hold one.
 *
 * CANONICAL BYTES ARE PRETTIER'S NORMAL FORM, and that is a measurement rather
 * than a preference: `npm run verify` runs `prettier --check .`, and
 * `.prettierignore` exempts four paths, none of them a governed documents
 * directory. A region this repo's own gate would rewrite breaks B4 — the
 * region regenerates byte-identically from identical input — on the first run
 * after it is written. So `-` bullets, a blank line after the opening comments
 * and one before the closing marker.
 *
 * The alternatives were weighed and cost more: a `.prettierignore` entry per
 * index is file-granular, so it would exempt the hand-authored prose sharing
 * the file — bytes the generator is supposed to touch nothing outside of — and
 * a semantic comparison in `--check` gives up B4 by name and means reading the
 * generator's own previous output back.
 */

import { END_MARKER, START_MARKER } from './marker-scan.pure.ts';

/**
 * The one in-band line the generator writes beneath the start marker.
 *
 * In-band rather than in prose above it, because hand-authored prose can be
 * absent, stale, or never written — and generation without governance drifts.
 * A comment rather than visible prose, because visible prose would reverse "the
 * generator writes list items and nothing else".
 *
 * PROVISIONAL. The verb `mh indexes generate` is issue #108's to settle and
 * that issue is open. It is regenerated on every run, so changing it later
 * costs one regeneration across an adopter's tree rather than a migration —
 * which is exactly why it was safe to write a provisional string here.
 */
const IN_BAND_COMMENT = '<!-- generated, do not edit; run `mh indexes generate` to update -->';

/**
 * The one line that discloses an exclusion.
 *
 * A FACT, not a list: no names and no count. That is what keeps it narrower
 * than the trailing `## Not indexed` section and the trailing count line, both
 * of which were rejected for publishing precisely what an Operator chose not to
 * publish. Its presence is deterministic from config alone, so it holds B4.
 */
const EXCLUSION_DISCLOSURE = '<!-- some files are excluded per configuration -->';

/**
 * The file created when a declared directory holds no `index.md`.
 *
 * A shipped template copied byte for byte, so creation is deterministic and the
 * default is migratable. The H1 is the literal word `Index` with no
 * substitution: a pure copy stays one artifact a Conformance case can pin,
 * while substitution buys computation for very little.
 *
 * NO FRONTMATTER, and that one is forced. Both the adopter-facing
 * `starter-config.yaml` and `fixtures/conformance/valid-test-config.yaml` ship
 * a `ruleId: index-files` rule asserting `frontmatter: forbidden`, so a created
 * file carrying frontmatter would fail `mh --check` under the config this tool
 * ships — the generator and the checker would disagree out of the box. That
 * contradiction is issue #94's to resolve; until it does, the template stays
 * frontmatter-free.
 *
 * HONEST COST: the template is write-once, so a later wording change reaches
 * only newly created files and never existing ones. The in-band comment is the
 * opposite — regenerated every run, so its wording propagates. The migration
 * property holds for the region, never for the template.
 */
export const CREATION_TEMPLATE = [
  '# Index',
  '',
  'This index file is governed by markdown-harness. The list of files contains byte-equal',
  'copies of frontmatter descriptions, where available.',
  '',
  START_MARKER,
  IN_BAND_COMMENT,
  '',
  '- [okf-conformance](okf-conformance.md) - Where the harness departs from OKF.',
  '',
  END_MARKER,
  '',
].join('\n');

/**
 * The region, markers included, as lines.
 *
 * Regenerated WHOLE from the config every time — never appended to and never
 * edited in place. A deterministic full rewrite of a bounded region beats a
 * diff-and-patch that has to reason about what is already there, and it is the
 * mechanism that makes B4 true rather than merely intended.
 *
 * @param entries One rendered list item per entry, already ordered.
 * @param disclosed Whether `excludeFiles` is in effect for this directory.
 */
export function regionLines(entries: readonly string[], disclosed: boolean): readonly string[] {
  const disclosure = disclosed ? [EXCLUSION_DISCLOSURE, ''] : [];
  return [START_MARKER, IN_BAND_COMMENT, '', ...entries, '', ...disclosure, END_MARKER];
}
