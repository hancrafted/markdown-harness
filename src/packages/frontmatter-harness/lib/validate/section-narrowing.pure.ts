/**
 * Earn the config type for a validated section, rather than asserting it.
 *
 * Loading used to end in `as unknown as MarkdownHarnessConfig`. That assertion
 * was already GUARDED — validation ran first and returned early on any fault —
 * so by the time #41 landed, nothing reached the evaluator mistyped. What it
 * lacked was any way to STAY guarded. An assertion is unconditional by
 * construction, so a contract key the validator never learned to check, or an
 * edit that moved the assertion above the validation, would both be silent:
 * nothing fails, and nothing says so.
 *
 * The predicate below makes the claim conditional and states its one premise —
 * a section carrying no fault is a section of this type. That premise is not
 * free. It holds only while the validator's key vocabularies cover the keys the
 * contract declares, which is why each of those vocabularies is now written as
 * `Record<keyof T, true>` and stops compiling when its type grows.
 */

import type { FrontmatterConfig } from '../../../config-contract/index.ts';
import { sectionFaults } from './section-faults.pure.ts';

/**
 * Whether a section is assignable to the type the config contract declares.
 *
 * The validator is the whole of the check, and there is deliberately no second
 * structural walk here. Two descriptions of one shape drift apart, and the
 * quieter one wins the moment they disagree. `sectionFaults` already visits
 * every key of every rule of every constraint, so asking it is asking the only
 * authority there is; a rival walk in this file could only ever be a worse copy
 * of it.
 *
 * @param section The value written under `frontmatter:`, or `undefined` if the key was never written.
 */
export function isFrontmatterConfig(section: unknown): section is FrontmatterConfig {
  return section !== undefined && sectionFaults(section).length === 0;

  // The `undefined` guard is load-bearing, not defensive. `sectionFaults` now
  // answers `[]` for an absent section — because absence is the loader's
  // question, not this Module's — so without the guard a config that never
  // wrote `frontmatter:` would narrow to a `FrontmatterConfig` and every
  // consumer would read `rules` off `undefined`.
}
