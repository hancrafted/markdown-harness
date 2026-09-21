/**
 * Recognise the top tier of the config, and nothing below it.
 *
 * The vocabulary at this level is one key per Module, and it is DERIVED from the
 * declared Module set rather than written down. No hand-maintained list of
 * top-level keys survives anywhere: the key set and the Modules the tool
 * actually ships are now one fact, so they cannot drift apart between releases
 * and a mistyped section name is rejected by name instead of ignored.
 *
 * A section's own keys are that Module's business, so this stops at the first
 * level deliberately: a loader that validated rule shapes would have to know the
 * rule language, and gaining a second Module would mean editing it.
 */

import type { ConfigFault, ModuleDescriptor } from '../../../config-contract/index.ts';
import type { ConfigMapping } from './config-load.types.ts';

/**
 * Report one fault per top-level key no declared Module claims.
 *
 * The code's meaning moved with the derivation. `CONFIG_UNRECOGNISED_KEY` at
 * this level used to mean "a key the config language does not define"; it now
 * means "a key no declared Module claims", which is a statement about the
 * composition rather than about a grammar.
 *
 * Reporting order follows the order the keys were written, so the faults read
 * down the file the way the Operator would scan it.
 *
 * @param document The parsed config mapping.
 * @param modules The declared Module set, exactly as the composing Package wrote it.
 */
export function findUnrecognisedTopLevelKeys(
  document: ConfigMapping,
  modules: readonly ModuleDescriptor<unknown>[],
): readonly ConfigFault[] {
  const claimed = modules.map((module) => module.key);
  return Object.keys(document)
    .filter((key) => !claimed.includes(key))
    .map((key) => ({ code: 'CONFIG_UNRECOGNISED_KEY', location: key }));
}

/**
 * Whether any declared Module was named at all.
 *
 * Asked of the document rather than of the validated sections, and the
 * difference is the point: a section that is present and WRONG is the Module's
 * fault to report, while a config that names no Module at all is a config that
 * governs nothing whoever is at fault. `Object.hasOwn` rather than `in`, which
 * walks the prototype chain and would answer true for `toString`.
 *
 * @param document The parsed config mapping.
 * @param modules The declared Module set, exactly as the composing Package wrote it.
 */
export function namesAnyModule(document: ConfigMapping, modules: readonly ModuleDescriptor<unknown>[]): boolean {
  return modules.some((module) => Object.hasOwn(document, module.key));
}
