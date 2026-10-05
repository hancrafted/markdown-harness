// How this Module reaches the Core: one descriptor, one top-level key.
//
// The whole of this Package's registration surface. `cli` holds the one list a
// Module is declared in, and this is the value that list names — so this Module
// costs one file like this one plus one entry there.
// Core still knows no Module by name.

import type { ModuleDescriptor } from '../config-contract/index.ts';
import { auditRules } from './audit.ts';
import { checkCorpus } from './check.ts';
import type { BodyStructureFaultCode } from './lib/validate/fault.types.ts';
import { queryPath } from './query.ts';
import type { BodyStructureConfig } from './section.ts';
import { validateBodyStructureSection } from './validate-config.ts';

/**
 * This Module, as the Core sees it.
 *
 * No `assess`: the port's verbs are optional and this Module makes no freshness
 * claim, so it has nothing to answer and the descriptor's type carries no such
 * member — `cli` skips it, and it adds nothing to the derived assess answer. A
 * file it alone governs therefore reads `ungoverned` in an Assessment — a known
 * imprecision, left open, not a claim that the file is outside every Rule. The
 * `never` in the omitted verb's slot is unreachable by construction.
 */
export const bodyStructureModule: Omit<
  ModuleDescriptor<
    BodyStructureConfig,
    ReturnType<typeof queryPath>,
    ReturnType<typeof auditRules>,
    never,
    ReturnType<typeof checkCorpus>,
    BodyStructureFaultCode
  >,
  'assess'
> = {
  key: 'body-structure',
  validateSection(raw: unknown) {
    return validateBodyStructureSection(raw);
  },
  query(path, config) {
    return queryPath(path, config.sectionFor(bodyStructureModule));
  },
  audit(root, files, config) {
    return auditRules(root, files, config.sectionFor(bodyStructureModule));
  },
  check(root, files, config) {
    return checkCorpus(root, files, config.sectionFor(bodyStructureModule));
  },
};
