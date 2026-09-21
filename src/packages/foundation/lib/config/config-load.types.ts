/**
 * What each stage of loading hands back.
 *
 * Every stage returns faults alongside its value rather than throwing, because
 * a config fails whole (§3.5): the loader concatenates what each stage found
 * and rejects once, carrying every fault it could reach.
 *
 * `ConfigMapping` is the ONLY whole-file type in this repository, and it is
 * honest about what it describes: a YAML mapping before any key of it has been
 * recognised. The interface that used to describe the whole config file retired
 * outright — with a Module set that is declared rather than fixed, a single
 * interface over the file could only be widened with an index signature or made
 * generic over a Module tuple, and neither describes a consumer that exists.
 *
 * The READ has no shape here. It is the gate's, and its answer is a `FileRead`
 * like every other read in this repository; what this folder owns is the fault
 * that answer earns.
 */

import type { ConfigFault, LoadedConfig, ModuleDescriptor } from '../../../config-contract/index.ts';

/** A YAML mapping, before any key of it has been recognised. */
export type ConfigMapping = Record<string, unknown>;

/** The outcome of parsing those bytes and checking they form a mapping. */
export interface ConfigParse {
  /** The parsed mapping, absent when the bytes were not one. */
  document?: ConfigMapping;
  /** Why parsing failed; empty when it did not. */
  faults: readonly ConfigFault[];
}

/** The outcome of asking every declared Module about its own section. */
export interface SectionOutcome {
  /**
   * Each validated section, under the descriptor that produced it.
   *
   * A Module whose key was not written has no entry, which is how `sectionFor`
   * answers `undefined` without anyone storing one.
   */
  sections: ReadonlyMap<ModuleDescriptor<unknown>, unknown>;
  /** Every fault the Modules reported, in declared order; empty when they reported none. */
  faults: readonly ConfigFault[];
}

/** The outcome of the whole load: a config to trust, or every reason not to. */
export interface ConfigLoad {
  /**
   * The validated config, absent when any fault was found.
   *
   * Not a shape with keys on it. The only way into it is `sectionFor`, handed a
   * descriptor — so a caller reads the section its own Module earned and has no
   * spelling for anyone else's.
   */
  config?: LoadedConfig;
  /** Every fault found across every stage, in reporting order. */
  faults: readonly ConfigFault[];
}
