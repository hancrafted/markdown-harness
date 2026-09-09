/**
 * Whether one file's freshness claim has run out, at a supplied instant.
 *
 * The instant ARRIVES AS AN ARGUMENT and nothing here reads a clock, which is
 * the whole of what keeps a clock-consulting command reproducible: the same
 * bytes and the same instant give the same answer out. `Date.parse` is
 * admissible for exactly that reason — its result is a function of its
 * argument alone. The clock readers are the zero-argument constructor and
 * `Date.now`, and neither appears.
 *
 * COMPARED AS INSTANTS, never as strings. `2026-01-01T00:00:00+02:00` sorts
 * after `2026-01-01T00:00:00Z` alphabetically and names the earlier moment, so
 * a string comparison would report a stale file fresh whenever the two carried
 * different offsets.
 */

import type { AssessEvidence } from '../../../response-contract/index.ts';
import { resolveAddress } from '../check/field-address.pure.ts';
import { frontmatterData } from '../check/frontmatter-data.pure.ts';
import type { Freshness } from './assess.types.ts';

/** The one frontmatter address a freshness judgement reads. */
const STALE_AFTER = 'stale_after';

/**
 * The freshness claim a file actually wrote, or nothing.
 *
 * Every way of declining to answer collapses to `undefined` HERE rather than in
 * the judgement below, so the judgement stays one comparison: no frontmatter,
 * frontmatter that will not parse, no `stale_after`, one written empty, and one
 * that is not a string are all the same thing from the caller's side — a
 * governed file that has made no claim.
 */
function claimWritten(text: string): string | undefined {
  const data = frontmatterData(text);
  if (data.kind !== 'mapping') return undefined;

  const resolved = resolveAddress(STALE_AFTER, data.data);
  if (resolved.kind !== 'sites') return undefined;

  const site = resolved.sites[0];
  if (site === undefined || !site.present) return undefined;
  return typeof site.value === 'string' && site.value !== '' ? site.value : undefined;
}

/**
 * Read one file's freshness claim and judge it.
 *
 * `unassessable` covers every way the file declines to answer — no frontmatter,
 * frontmatter that will not parse, no `stale_after`, one written empty, one
 * that is not a string, and one that is a string naming no moment. All six are
 * the same finding from the caller's side: a governed file that has made no
 * claim, which is deliberately NOT reported as fresh.
 *
 * AT or before, not before: a file whose `stale_after` equals the instant is
 * stale. `stale_after` names the moment the claim expires rather than the last
 * moment it holds, so the boundary belongs to the expiry.
 *
 * @param text The file's full contents.
 * @param now The Assessment instant, as the caller wrote it.
 */
export function freshnessOf(text: string, now: string): Freshness {
  const claim = claimWritten(text);
  if (claim === undefined) return { state: 'unassessable' };

  const expiry = Date.parse(claim);
  const instant = Date.parse(now);
  if (!Number.isFinite(expiry) || !Number.isFinite(instant)) return { state: 'unassessable' };

  const evidence: AssessEvidence = { field: STALE_AFTER, value: claim };
  return instant >= expiry ? { state: 'stale', evidence } : { state: 'fresh', evidence };
}
