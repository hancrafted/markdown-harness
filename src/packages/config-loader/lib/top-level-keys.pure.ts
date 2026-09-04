/**
 * Recognise the top tier of the config, and nothing below it.
 *
 * The vocabulary at this level is one key per Module. A section's own keys are
 * that Module's business, so this stops at the first level deliberately: a
 * loader that validated rule shapes would have to know the rule language, and
 * gaining a second Module would mean editing it.
 */

import type { ConfigFault } from '../../response-contract/index.ts';
import type { ConfigMapping } from './config-load.types.ts';

/**
 * Every top-level key the config language defines.
 *
 * One entry, because one Module exists. A config naming no module governs
 * nothing, which is a fault the Module reports rather than a key this rejects.
 */
const TOP_LEVEL_KEYS: readonly string[] = ['frontmatter'];

/**
 * Report one fault per top-level key outside the vocabulary.
 *
 * Reporting order follows the order the keys were written, so the faults read
 * down the file the way the Operator would scan it.
 *
 * @param document The parsed config mapping.
 */
export function findUnrecognisedTopLevelKeys(document: ConfigMapping): readonly ConfigFault[] {
  return Object.keys(document)
    .filter((key) => !TOP_LEVEL_KEYS.includes(key))
    .map((key) => ({ code: 'CONFIG_UNRECOGNISED_KEY', location: key }));
}
