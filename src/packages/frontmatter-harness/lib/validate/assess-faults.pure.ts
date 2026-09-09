/**
 * Validate the `assess:` vocabulary, wherever it was written.
 *
 * The same block shape is legal at two levels — Module-wide beside `rules:`,
 * and per-rule beside `fields:` — so the shape check lives here once and both
 * callers pass their own address in. What differs between the two levels is not
 * the shape but the CONSEQUENCE, and that is the second export: a prompt is
 * only ever reached through a rule, so whether one can fire is a question about
 * a rule even when the sentence came from the Module.
 *
 * Nothing here consults a clock. Whether a file IS stale is decided against a
 * supplied instant elsewhere; this file only decides whether the config could
 * ever say so.
 */

import type { ConfigFault } from '../../../response-contract/index.ts';

/**
 * Every condition the `assess:` vocabulary defines.
 *
 * One entry. A second condition is a deliberate amendment rather than an
 * accident, which is the whole reason this is a list and not a free mapping.
 */
const ASSESS_KEYS: readonly string[] = ['stale'];

/** The one condition, and the frontmatter field it is answered from. */
const STALE = 'stale';
const STALE_AFTER = 'stale_after';

/** What `presence` must say for a `stale` prompt to be able to fire. */
const REQUIRED = 'required';

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Whether a written block carries a prompt that could be printed.
 *
 * A non-string or an empty string is not a prompt; those are reported as faults
 * by `assessBlockFaults` and must not also count as a prompt here, or one
 * mistake would earn two unrelated faults.
 */
export function hasStalePrompt(block: unknown): boolean {
  return isMapping(block) && typeof block[STALE] === 'string' && block[STALE] !== '';
}

/**
 * Every fault one `assess:` block carries, at the address it was written.
 *
 * `assess:` written with nothing after it parses to `null`, which is a mistake
 * and reported as one. An EXPLICIT empty mapping is not: under whole-block
 * replacement it is the only way a rule can decline the Module-wide default
 * without the default being deleted for everyone, so it is left legal and
 * silent — it selects no condition, and nothing then fires.
 *
 * @param block The value written under `assess:`, or `undefined` if the key was never written.
 * @param at The block's address in the config's own notation, e.g. `frontmatter.rules[3].assess`.
 */
export function assessBlockFaults(block: unknown, at: string): readonly ConfigFault[] {
  if (block === undefined) return [];
  if (!isMapping(block)) return [{ code: 'CONFIG_INVALID_VALUE', location: at }];

  const unrecognised = Object.keys(block)
    .filter((key) => !ASSESS_KEYS.includes(key))
    .map((key): ConfigFault => ({ code: 'CONFIG_UNRECOGNISED_KEY', location: `${at}.${key}` }));

  const written = STALE in block;
  const usable = typeof block[STALE] === 'string' && block[STALE] !== '';
  const stale = written && !usable ? [{ code: 'CONFIG_INVALID_VALUE' as const, location: `${at}.${STALE}` }] : [];

  return [...unrecognised, ...stale];
}

/** Whether a rule requires `stale_after` — `presence: optional` deliberately does not count. */
function enforcesStaleAfter(rule: Record<string, unknown>): boolean {
  const fields = rule.fields;
  if (!isMapping(fields)) return false;

  const constraint = fields[STALE_AFTER];
  return isMapping(constraint) && constraint.presence === REQUIRED;
}

/**
 * The fault for a prompt that can never fire, reported at the rule.
 *
 * The prompt is resolved the way the command resolves it — the rule's own block
 * if it wrote one, the Module-wide block otherwise, never a merge of the two —
 * so a Module-wide default forces `stale_after: { presence: required }` onto
 * every constraining rule. That is the expensive half of adopting one, and an
 * Operator is better told at validation than left with a sentence that stays
 * silent forever.
 *
 * `frontmatter: forbidden` rules are exempt: a file that must carry no
 * frontmatter has no `stale_after` to require, and the payload exclusivity
 * fault already covers a block written beside it.
 *
 * @param rule One entry of the ordered rule list, straight off the YAML.
 * @param at The rule's address in the config's own notation.
 * @param moduleAssess The value written under `frontmatter.assess:`, if any.
 */
export function unfireableAssessFaults(
  rule: Record<string, unknown>,
  at: string,
  moduleAssess: unknown,
): readonly ConfigFault[] {
  if (rule.frontmatter === 'forbidden') return [];

  const effective = 'assess' in rule ? rule.assess : moduleAssess;
  if (!hasStalePrompt(effective)) return [];
  if (enforcesStaleAfter(rule)) return [];

  return [{ code: 'CONFIG_ASSESS_WITHOUT_REQUIRED_FIELD', location: at }];
}
