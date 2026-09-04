// Locate, read, parse and validate the one config file.
//
// The stages run in order and stop at the first that cannot hand its successor
// anything usable: bytes that are not YAML have no keys to recognise. Once
// there IS a mapping, both validating layers run and their faults merge, so a
// config fails whole rather than one fault at a time.

import type { MarkdownHarnessConfig } from '../config-contract/index.ts';
import { validateFrontmatterSection } from '../frontmatter-harness/validate-config.ts';
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

  const faults = [
    ...findUnrecognisedTopLevelKeys(parsed.document),
    ...validateFrontmatterSection(parsed.document.frontmatter),
  ];
  if (faults.length > 0) return { faults };

  return { config: parsed.document as unknown as MarkdownHarnessConfig, faults: [] };
}
