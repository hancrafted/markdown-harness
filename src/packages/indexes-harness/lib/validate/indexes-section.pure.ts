/**
 * This Module's half of the config catalog.
 *
 * The loader owns the faults that name the config FILE; everything from the
 * `indexes:` key down names a key inside it and is decided here. The section
 * arrives as an opaque value rather than as a parsed config, for the same
 * reason the `frontmatter:` section does: a loader that knew a Module's
 * vocabulary would have to be edited to gain a third Module.
 *
 * TWO FAULTS THIS FILE DOES NOT REPORT, and neither is an oversight.
 *
 * A DUPLICATE directory key never reaches here. `yaml@2.9.0` throws
 * `Map keys must be unique` with a line and column, so the error is
 * unrepresentable rather than validated — the same trade `config.types.ts`
 * takes for its two exclusivity rules, and it costs no fault code.
 *
 * A declared directory that does not exist ON DISK is not checkable here
 * either: this file is deterministic and takes no filesystem. It is the one
 * fault in this Module's family that may not be a unit test, and it is issue
 * #91's to place.
 *
 * PROTOTYPE NOTE on the codes themselves. `ConfigFaultCode` is a closed union
 * and issue #91 owns the violation family, so nothing here invents a code:
 * every fault reuses `CONFIG_INVALID_VALUE` or `CONFIG_UNRECOGNISED_KEY`. That
 * makes two genuinely different mistakes — a key without its trailing slash,
 * and an empty mapping — arrive under one code today.
 */

import type { DirectorySettings, IndexesConfig } from '../../../config-contract/index.ts';
import type { ConfigFault } from '../../../response-contract/index.ts';

/** The section's own address, and the two keys it defines. */
const SECTION = 'indexes';
const DIRECTORIES = `${SECTION}.directories`;
const DESCRIPTION_SOURCE = `${SECTION}.descriptionSource`;

/**
 * Every key the section defines, keyed by the type that defines them.
 *
 * `Record<keyof T, true>` rather than a list of strings: a key added to
 * `IndexesConfig` and forgotten here leaves a missing entry and will not
 * compile, so the vocabulary cannot quietly decay.
 */
const SECTION_KEYS: Record<keyof IndexesConfig, true> = { descriptionSource: true, directories: true };

/** Every key one directory's settings may carry, on the same terms. */
const SETTINGS_KEYS: Record<keyof DirectorySettings, true> = { descriptionSource: true, excludeFiles: true };

/** What makes a directory key's textual uniqueness also semantic. */
const TRAILING_SLASH = '/';

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringList(value: unknown): boolean {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

/** Every value under one directory's settings that is the wrong shape. */
function settingsValueFaults(at: string, settings: Record<string, unknown>): readonly ConfigFault[] {
  const faults: ConfigFault[] = [];

  if (settings.descriptionSource !== undefined && typeof settings.descriptionSource !== 'string')
    faults.push({ code: 'CONFIG_INVALID_VALUE', location: `${at}.descriptionSource` });

  if (settings.excludeFiles !== undefined && !isStringList(settings.excludeFiles))
    faults.push({ code: 'CONFIG_INVALID_VALUE', location: `${at}.excludeFiles` });

  return faults;
}

/** Every fault one directory's settings carry. */
function settingsFaults(key: string, settings: unknown): readonly ConfigFault[] {
  const at = `${DIRECTORIES}['${key}']`;

  // A bare key parses to `null` and means "every default", which is the whole
  // point of it costing four characters.
  if (settings === null || settings === undefined) return [];
  if (!isMapping(settings)) return [{ code: 'CONFIG_INVALID_VALUE', location: at }];

  const unrecognised: ConfigFault[] = Object.keys(settings)
    .filter((name) => !Object.hasOwn(SETTINGS_KEYS, name))
    .map((name) => ({ code: 'CONFIG_UNRECOGNISED_KEY', location: `${at}.${name}` }));

  return [...unrecognised, ...settingsValueFaults(at, settings)];
}

/**
 * Every fault the `directories:` mapping carries, keys and values alike.
 *
 * An EMPTY mapping is a fault, on the precedent that an empty rule list is a
 * config error rather than an inert harness — both are a Module named and then
 * asked to do nothing.
 */
function directoriesFaults(directories: unknown): readonly ConfigFault[] {
  if (!isMapping(directories)) return [{ code: 'CONFIG_INVALID_VALUE', location: DIRECTORIES }];

  const keys = Object.keys(directories);
  if (keys.length === 0) return [{ code: 'CONFIG_INVALID_VALUE', location: DIRECTORIES }];

  return keys.flatMap((key) => {
    const unslashed: ConfigFault[] = key.endsWith(TRAILING_SLASH)
      ? []
      : [{ code: 'CONFIG_INVALID_VALUE', location: `${DIRECTORIES}['${key}']` }];
    return [...unslashed, ...settingsFaults(key, directories[key])];
  });
}

/**
 * Every fault the `indexes:` section carries.
 *
 * An absent section is not a fault: a config naming no Module governs nothing,
 * and governance is opt-in. An section present with an EMPTY `directories:`
 * mapping IS a fault, on the precedent that an empty rule list is a config
 * error rather than an inert harness — both are a Module named and then asked
 * to do nothing.
 *
 * @param section The value written under `indexes:`, or `undefined` if the key was never written.
 */
export function indexesSectionFaults(section: unknown): readonly ConfigFault[] {
  if (section === undefined) return [];
  if (!isMapping(section)) return [{ code: 'CONFIG_INVALID_VALUE', location: SECTION }];

  const faults: ConfigFault[] = Object.keys(section)
    .filter((key) => !Object.hasOwn(SECTION_KEYS, key))
    .map((key) => ({ code: 'CONFIG_UNRECOGNISED_KEY', location: `${SECTION}.${key}` }));

  if (section.descriptionSource !== undefined && typeof section.descriptionSource !== 'string')
    faults.push({ code: 'CONFIG_INVALID_VALUE', location: DESCRIPTION_SOURCE });

  return [...faults, ...directoriesFaults(section.directories)];
}

/**
 * Whether a value is a sound `indexes:` section.
 *
 * A predicate rather than a cast, and it is worth exactly what the fault walk
 * above covers — which is why the two share their vocabulary constants rather
 * than each holding their own copy.
 *
 * @param section The value written under `indexes:`.
 */
export function isIndexesConfig(section: unknown): section is IndexesConfig {
  return indexesSectionFaults(section).length === 0 && section !== undefined;
}
