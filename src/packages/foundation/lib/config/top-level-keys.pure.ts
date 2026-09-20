/**
 * Recognise the top tier of the config, derived from the declared Module set.
 *
 * The recognised top-level key set derives from the declared Module set,
 * never from a hardcoded literal list (ARCH-008 §3.2).
 */

import type { ConfigFault, ModuleDescriptor } from '../../../config-contract/index.ts';
import type { ConfigMapping } from './config-load.types.ts';

/**
 * Report one fault per top-level key outside the recognised Module set.
 *
 * @param document The parsed config mapping.
 * @param modules The declared Module set.
 */
export function findUnrecognisedTopLevelKeys(
  document: ConfigMapping,
  modules: readonly ModuleDescriptor<unknown>[],
): readonly ConfigFault[] {
  const recognised = modules.map((m) => m.key);
  return Object.keys(document)
    .filter((key) => !recognised.includes(key))
    .map((key): ConfigFault => ({ code: 'CONFIG_UNRECOGNISED_KEY', location: key }));
}

/**
 * Report `CONFIG_NO_MODULE_SECTION` when no declared Module's key is present.
 *
 * @param document The parsed config mapping.
 * @param modules The declared Module set.
 * @param location The config path as written by the caller.
 */
export function checkNoModuleSection(
  document: ConfigMapping,
  modules: readonly ModuleDescriptor<unknown>[],
  location: string,
): readonly ConfigFault[] {
  const hasModuleSection = modules.some((m) => Object.hasOwn(document, m.key));
  if (!hasModuleSection) {
    return [{ code: 'CONFIG_NO_MODULE_SECTION', location }];
  }
  return [];
}
