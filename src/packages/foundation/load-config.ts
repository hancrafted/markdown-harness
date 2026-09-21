// Locate, read, parse and validate the one config file.
//
// The read itself arrives from this Package's own gate, so the config and the
// corpus are read by the same code and cannot disagree about whether a path is
// readable. What is left is the part that is about a CONFIG — which catalog
// entry each answer earns, and which stage may run next.
//
// IT IMPORTS NO MODULE. The declared Module set arrives as an argument and every
// section is validated through the descriptor that owns it, so the loader knows
// which keys exist without knowing what any of them mean. That is what let this
// file move into `foundation`: the one edge that kept the loader in a Package of
// its own — Core reaching into a Module for its validator — is gone rather than
// relocated.
//
// The stages run in order and stop at the first that cannot hand its successor
// anything usable: bytes that are not YAML have no keys to recognise. Once there
// IS a mapping, every validating layer runs and their faults merge, so a config
// fails whole rather than one fault at a time.

import type { ConfigFault, ModuleDescriptor } from '../config-contract/index.ts';
import { parseConfigDocument } from './lib/config/config-document.pure.ts';
import type { ConfigLoad, ConfigMapping } from './lib/config/config-load.types.ts';
import { configOf, validateDeclaredSections } from './lib/config/module-sections.pure.ts';
import { faultForUnread } from './lib/config/read-fault.pure.ts';
import { findUnrecognisedTopLevelKeys, namesAnyModule } from './lib/config/top-level-keys.pure.ts';
import { readTextAt } from './read-text.ts';

/**
 * The file-level answer: a config naming no declared Module governs nothing.
 *
 * Reported BEFORE the keys, on the same terms the catalog already orders itself
 * — the codes that name the file come before the codes that name a key inside it
 * — and reported BESIDE them rather than instead of them. A typo'd section name
 * is both facts at once, and an Operator fixing one wants to see the other.
 */
function missingSectionFault(
  document: ConfigMapping,
  modules: readonly ModuleDescriptor<unknown>[],
  location: string,
): readonly ConfigFault[] {
  return namesAnyModule(document, modules) ? [] : [{ code: 'CONFIG_NO_MODULE_SECTION', location }];
}

/**
 * Load the config, or report every reason it cannot be trusted.
 *
 * @param location The config path exactly as the caller wrote it — never resolved.
 * @param modules The declared Module set. The recognised top-level key set is computed from it, and nothing else recognises a key.
 */
export function loadConfig(location: string, modules: readonly ModuleDescriptor<unknown>[]): ConfigLoad {
  const source = readTextAt(location);
  if (source.kind !== 'text') return { faults: [faultForUnread(source, location)] };

  const parsed = parseConfigDocument(source.text, location);
  const document = parsed.document;
  if (document === undefined) return { faults: parsed.faults };

  const validated = validateDeclaredSections(document, modules);
  const faults = [
    ...missingSectionFault(document, modules, location),
    ...findUnrecognisedTopLevelKeys(document, modules),
    ...validated.faults,
  ];

  // ASSEMBLED, never asserted. Every section in the map is what that
  // descriptor's own validation returned, so the config is built out of sections
  // that each earned their type — and none of it is reachable while any fault
  // stands, because half a config is not a config.
  return faults.length > 0 ? { faults } : { config: configOf(validated.sections), faults: [] };
}
