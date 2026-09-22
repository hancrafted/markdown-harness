/**
 * Whether an already-parsed value is a plain mapping.
 *
 * This is the one narrowing every invalid-value fault in the tool rests on.
 * It used to be written out ten times, byte-identical, across three
 * Packages — eight call sites narrowing to this generic shape and two
 * narrowing to `FrontmatterMapping`, frontmatter-harness's own name for the
 * identical structural type. Both names survive this move: `FrontmatterMapping`
 * stays declared in `frontmatter-harness/lib/check/check.types.ts` as that
 * Package's domain vocabulary for parsed frontmatter data, and this function
 * still narrows to it wherever it is called, because `FrontmatterMapping` is a
 * plain alias for `Record<string, unknown>` rather than a branded type — the
 * two names describe one shape, and TypeScript accepts this predicate's
 * result at either name without a cast.
 *
 * Arrays are excluded explicitly: `typeof [] === 'object'`, so a value written
 * as a list would otherwise pass a bare object check and fail much later, with
 * a fault naming a key rather than the value itself.
 */
export function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
