// Locate, read, parse and validate the one config file.
//
// The stages run in order and stop at the first that cannot hand its successor
// anything usable: bytes that are not YAML have no keys to recognise. Once
// there IS a mapping, both validating layers run and their faults merge, so a
// config fails whole rather than one fault at a time.

import { validateFrontmatterSection } from '../frontmatter-harness/validate-config.ts';
import { validateIndexesSection } from '../indexes-harness/validate-config.ts';
import { parseConfigDocument } from './lib/config-document.pure.ts';
import type { ConfigLoad } from './lib/config-load.types.ts';
import { readConfigSource } from './lib/config-source.impure.ts';
import { findUnrecognisedTopLevelKeys } from './lib/top-level-keys.pure.ts';

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

  // Both Modules validate, and their faults merge with the loader's own: a
  // config fails WHOLE rather than one fault at a time, so an Operator sees
  // every reason at once instead of fixing the first and re-running.
  const validated = validateFrontmatterSection(parsed.document.frontmatter);
  const indexes = validateIndexesSection(parsed.document.indexes);
  const faults = [...findUnrecognisedTopLevelKeys(parsed.document), ...validated.faults, ...indexes.faults];
  if (validated.section === undefined || faults.length > 0) return { faults };

  // ASSEMBLED, never asserted. The config is built from the sections that each
  // earned their own type, so the only keys this file names are the ones it
  // already recognises as top-level keys — it still learns nothing of either
  // Module's vocabulary below them.
  //
  // `indexes` is absent rather than empty when the key was never written, which
  // is what lets `planIndexes` answer "governs no directory" without a second
  // way of spelling it.
  return { config: { frontmatter: validated.section, indexes: indexes.section }, faults: [] };
}
