/**
 * The two textual operations this Module is built on: taking a stem off a path,
 * and splitting that stem on the fixed delimiter.
 *
 * Both are written out rather than delegated to `node:path`, because a `.pure`
 * file may not reach a builtin — and `basename` is host-dependent in exactly the
 * way this Module must not be.
 */

/** Path segments are `/`-separated by the time a path reaches this Module. */
const SEPARATOR = '/';

/**
 * The one extension a corpus file can have.
 *
 * `isMarkdownFile` already makes the corpus `.md`-only, so a stray `notes.txt`
 * is ungoverned by construction and never reaches here.
 */
const EXTENSION = '.md';

/**
 * The delimiter. FIXED, not configurable — there is no `separator:` key.
 *
 * A doubled character rather than a single one, and the Operator's reason is
 * forward-looking: it stays available as the split point however many segments
 * are added later, where a single `-` or `_` would collide with the word shapes
 * the segments themselves use.
 *
 * "Fixed" rather than "reserved", and the narrowing is deliberate. Prior art's
 * nearest analogues — C++'s reserved double underscore, Python's dunder
 * mangling — are LANGUAGE-WIDE, and importing that connotation would claim
 * something this design explicitly refused. `__` means something only where
 * `segments:` is declared. Everywhere else it is an ordinary pair of
 * characters.
 */
const DELIMITER = '__';

/**
 * The stem of a path: its basename with a final `.md` removed.
 *
 * The stem is what every `file:` constraint measures. The extension does not
 * participate — it cannot vary, so a config asked to describe it would be
 * describing a constant.
 *
 * @param path A normalised, repo-root-relative path.
 */
export function stemOf(path: string): string {
  const basename = path.slice(path.lastIndexOf(SEPARATOR) + 1);
  return basename.endsWith(EXTENSION) ? basename.slice(0, -EXTENSION.length) : basename;
}

/**
 * The parts of a stem, split on every `__`, EMPTY PARTS DROPPED.
 *
 * Three rules, all of them decisions:
 *
 * EVERY `__` IS A SPLIT POINT. Not the first, and not a greedy last segment.
 * A greedy last segment blames the slug's format for a delimiter placed
 * elsewhere, and lets a segment quietly hold a `__` of its own.
 *
 * A PART MUST BE NON-EMPTY TO COUNT AS ONE. This is what turns `aikb__` into a
 * one-part name rather than a two-part name whose second part is blank — so it
 * reports a count mismatch, which names the real repair, rather than a format
 * mismatch against nothing.
 *
 * NO SEPARATE CODE FOR AN EMPTY PART. Refused deliberately: `a____b` would then
 * carry both an empty-part finding and whatever the surviving parts report, and
 * ranking two findings on one name is a decision this design has already
 * closed. The consequence is visible and is covered by a Conformance case:
 * `aikb____llm-wiki` drops its empty middle and PASSES a two-segment rule. If
 * that is the wrong answer, this is the function to change and the case is
 * where the disagreement gets recorded.
 *
 * @param stem A file stem, with its extension already removed.
 */
export function partsOf(stem: string): readonly string[] {
  return stem.split(DELIMITER).filter((part) => part.length > 0);
}
