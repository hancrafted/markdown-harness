/**
 * Keys the rule never named, under `unknownKeys: forbidden`.
 *
 * This holds the ONE non-verbatim requirement in any response. `allowedKeys` is
 * derived rather than quoted, because a Contributor cannot be required to open
 * the config to learn what was permitted — every other `requirement` in the
 * contract is the config fragment exactly as written.
 */

import type { FrontmatterRule } from '../../../config-contract/index.ts';
import type { UnknownKeyViolation } from '../../../response-contract/index.ts';
import type { FrontmatterMapping } from './check.types.ts';
import { evidenceFor } from './field-evidence.pure.ts';

/** The set keys, in the order §4.6 declares them. */
const SET_KEYS = ['exactlyOneOf', 'anyOf', 'allOf'] as const;

/**
 * The top-level key an address reaches through.
 *
 * `generated.by` permits `generated` and nothing deeper, and
 * `sources[].resource` permits `sources`. A rule that names a key inside a
 * container plainly means the container to be there.
 */
function topLevelSegment(address: string): string {
  const [head] = address.split(/[.[]/, 1);
  return head;
}

/**
 * Every top-level key the rule permits, deduped, in config order.
 *
 * Cross-field sets contribute too: a rule that requires `title` through `allOf`
 * cannot coherently forbid it as unknown, and a derived list that omitted it
 * would tell a Contributor to delete the key the same rule demands.
 */
function allowedKeysFor(rule: FrontmatterRule): readonly string[] {
  const addresses = [...Object.keys(rule.fields ?? {}), ...SET_KEYS.flatMap((key) => rule[key] ?? [])];
  return [...new Set(addresses.map(topLevelSegment))];
}

/**
 * Report every frontmatter key the rule does not name.
 *
 * Findings come in THE FRONTMATTER'S OWN key order — not the config's, and not
 * sorted — so a reader scanning the block top-down meets them in the same
 * sequence they appear in the file.
 *
 * @param rule The rule that won this file under first-match.
 * @param data The file's parsed frontmatter mapping.
 */
export function unknownKeyViolations(rule: FrontmatterRule, data: FrontmatterMapping): readonly UnknownKeyViolation[] {
  if (rule.unknownKeys !== 'forbidden') return [];

  const allowedKeys = allowedKeysFor(rule);
  return Object.keys(data)
    .filter((key) => !allowedKeys.includes(key))
    .map((key) => ({
      field: key,
      value: evidenceFor(data[key]),
      violation: 'UNKNOWN_KEY_FORBIDDEN' as const,
      requirement: { unknownKeys: 'forbidden' as const, allowedKeys },
    }));
}
