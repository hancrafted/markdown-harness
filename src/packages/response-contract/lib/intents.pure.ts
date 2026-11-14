/**
 * The intents view of a `query` answer: a projection of the full answer, never a
 * second evaluation of governance.
 *
 * The test is "carries an `intent`", not a list of Module-specific shapes, so a
 * Module emitting intents later is covered without a change here. A node is kept
 * when it carries an `intent` or holds a kept descendant, together with the keys
 * that place it; everything else is dropped.
 */

import type { GovernedPath, IntentRequirements, QueryResult } from './query.types.ts';

/** The keys that say which node an intent belongs to — a field, a heading, a permitted value or title. */
const PLACING_KEYS: ReadonlySet<string> = new Set(['field', 'presence', 'level', 'pattern', 'value', 'title']);

const INTENT_KEY = 'intent';

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The kept form of an array: its kept entries, or `undefined` when none survive. */
function projectedList(nodes: readonly unknown[]): unknown {
  const kept = nodes.map(projected).filter((entry) => entry !== undefined);
  return kept.length === 0 ? undefined : kept;
}

/** The kept form of one record, or `undefined` when neither it nor anything under it carries an intent. */
function projectedRecord(node: Json): unknown {
  const placed: Json = {};
  let keeps = typeof node[INTENT_KEY] === 'string';
  for (const [key, value] of Object.entries(node)) {
    if (key === INTENT_KEY || PLACING_KEYS.has(key)) {
      placed[key] = value;
      continue;
    }
    const kept = projected(value);
    if (kept === undefined) continue;
    placed[key] = kept;
    keeps = true;
  }
  return keeps ? placed : undefined;
}

/** The kept form of one node, or `undefined` when neither it nor anything under it carries an intent. */
function projected(node: unknown): unknown {
  if (Array.isArray(node)) return projectedList(node);
  return isRecord(node) ? projectedRecord(node) : undefined;
}

/**
 * The intents view of one path's answer.
 *
 * An invisible path is returned as it is; a governed path keeps each Module's
 * `module`, `rule` and the intent-carrying part of its requirements, in order.
 *
 * @param result The full answer for one path.
 */
export function intentsOf<TRequirements>(result: QueryResult<TRequirements>): QueryResult<IntentRequirements> {
  if (result.governance === 'invisible') return result;
  const governed: GovernedPath<IntentRequirements> = {
    ...result,
    modules: result.modules.map(({ module, rule, requirements }) => ({
      module,
      rule,
      requirements: (projected(requirements) ?? {}) as IntentRequirements,
    })),
  };
  return governed;
}
