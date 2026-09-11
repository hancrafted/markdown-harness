// Locate, read, parse and validate the one config file.
//
// The stages run in order and stop at the first that cannot hand its successor
// anything usable: bytes that are not YAML have no keys to recognise. Once
// there IS a mapping, every validating layer runs and their faults merge, so a
// config fails whole rather than one fault at a time.
//
// This file knows the NAME of each Module's section and nothing else about it.
// Gaining the second Module cost exactly one import, one call and one key here,
// and no knowledge of segments, delimiters or name grammars leaked in — which
// is design-ADR 0006's growth rule working rather than being asserted.

import { validateFileNamesSection } from '../file-names-harness/validate-config.ts';
import { validateFrontmatterSection } from '../frontmatter-harness/validate-config.ts';
import type { ConfigFault } from '../response-contract/index.ts';
import { parseConfigDocument } from './lib/config-document.pure.ts';
import type { ConfigLoad, ConfigMapping } from './lib/config-load.types.ts';
import { readConfigSource } from './lib/config-source.impure.ts';
import { findUnrecognisedTopLevelKeys } from './lib/top-level-keys.pure.ts';

/**
 * A config that declares no Module at all governs nothing, which is a mistake
 * rather than a no-op.
 *
 * Reported at `frontmatter.rules` rather than at the document root, because
 * that is the fault an Operator of a single-Module config has always seen and
 * the sentence that fixes it is unchanged. A config declaring `file-names:`
 * alone never reaches here.
 */
const NO_MODULE: ConfigFault = { code: 'CONFIG_EMPTY_RULE_LIST', location: 'frontmatter.rules' };

/** Whether the document names any Module section at all. */
function namesNoModule(document: ConfigMapping): boolean {
  return document.frontmatter === undefined && document['file-names'] === undefined;
}

/**
 * Every fault across the top level and both Module sections, in reporting order.
 *
 * Concatenated rather than short-circuited: a config fails WHOLE, so an
 * Operator sees every reason at once instead of fixing one per run.
 */
function everyFault(
  document: ConfigMapping,
  frontmatter: readonly ConfigFault[],
  fileNames: readonly ConfigFault[],
): readonly ConfigFault[] {
  return [
    ...findUnrecognisedTopLevelKeys(document),
    ...(namesNoModule(document) ? [NO_MODULE] : []),
    ...frontmatter,
    ...fileNames,
  ];
}

/**
 * Load the config, or report every reason it cannot be trusted.
 *
 * @param location The config path exactly as the caller wrote it — never resolved.
 */
export function loadConfig(location: string): ConfigLoad {
  const source = readConfigSource(location);
  if (source.text === undefined) return { faults: source.faults };

  const parsed = parseConfigDocument(source.text, location);
  if (parsed.document === undefined) return { faults: parsed.faults };

  const document = parsed.document;
  const frontmatter = validateFrontmatterSection(document.frontmatter);
  const fileNames = validateFileNamesSection(document['file-names']);

  const faults = everyFault(document, frontmatter.faults, fileNames.faults);
  if (faults.length > 0) return { faults };

  // ASSEMBLED, never asserted. The config is built from the sections that
  // earned their types, so the only keys this file names are the ones it
  // already recognises as top-level keys — it still learns nothing of the rule
  // language below them.
  //
  // Each key is OMITTED rather than set to `undefined` when its section was not
  // written, so a serialised config round-trips to the same document the
  // Operator wrote.
  return {
    config: {
      ...(frontmatter.section === undefined ? {} : { frontmatter: frontmatter.section }),
      ...(fileNames.section === undefined ? {} : { 'file-names': fileNames.section }),
    },
    faults: [],
  };
}
