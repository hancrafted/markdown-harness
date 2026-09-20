/**
 * Locate, read, parse and validate the one config file across the declared Module set.
 */

import type { ConfigFault, ModuleDescriptor } from '../config-contract/index.ts';
import { parseConfigDocument } from './lib/config/config-document.pure.ts';
import type { ConfigLoad, ConfigMapping, LoadedConfig } from './lib/config/config-load.types.ts';
import { faultForReadFailure } from './lib/config/read-fault.pure.ts';
import { checkNoModuleSection, findUnrecognisedTopLevelKeys } from './lib/config/top-level-keys.pure.ts';
import { readFile } from './lib/platform/file-system.impure.ts';

export type { ConfigLoad, ConfigMapping, LoadConfigResult, LoadedConfig } from './lib/config/config-load.types.ts';

function readConfigSource(location: string): { text?: string; fault?: ConfigFault } {
  const source = readFile(location);
  if (source.kind === 'absent') return { fault: faultForReadFailure('ENOENT', location) };
  if (source.kind === 'unreadable') return { fault: faultForReadFailure(undefined, location) };
  return { text: source.text };
}

function validateModuleSections(
  document: ConfigMapping,
  modules: readonly ModuleDescriptor<unknown>[],
): { faults: ConfigFault[]; sections: Map<ModuleDescriptor<unknown>, unknown> } {
  const faults: ConfigFault[] = [];
  const sections = new Map<ModuleDescriptor<unknown>, unknown>();
  for (const mod of modules) {
    if (Object.hasOwn(document, mod.key)) {
      const validated = mod.validateSection(document[mod.key]);
      faults.push(...validated.faults);
      if (validated.section !== undefined) sections.set(mod, validated.section);
    }
  }
  return { faults, sections };
}

/**
 * Load the config across the declared Module set.
 *
 * @param location The config path as written by the caller.
 * @param modules The declared Module set.
 */
export function loadConfig(location: string, modules: readonly ModuleDescriptor<unknown>[]): ConfigLoad {
  const source = readConfigSource(location);
  if (source.fault !== undefined) return { faults: [source.fault] };

  const parsed = parseConfigDocument(source.text!, location);
  if (parsed.document === undefined) return { faults: parsed.faults };

  const topLevel = [
    ...findUnrecognisedTopLevelKeys(parsed.document, modules),
    ...checkNoModuleSection(parsed.document, modules, location),
  ];
  const { faults, sections } = validateModuleSections(parsed.document, modules);
  const allFaults = [...topLevel, ...faults];
  if (allFaults.length > 0) return { faults: allFaults };

  const config: LoadedConfig = {
    sectionFor<TSection>(mod: ModuleDescriptor<TSection>): TSection | undefined {
      return sections.get(mod) as TSection | undefined;
    },
  };

  return { config, faults: [] };
}
