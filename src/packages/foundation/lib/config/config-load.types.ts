/**
 * Types for loading and parsing markdown-harness configuration.
 */

import type { ConfigFault, ModuleDescriptor } from '../../../config-contract/index.ts';

export type ConfigMapping = Record<string, unknown>;

export interface ConfigParse {
  document?: ConfigMapping;
  faults: readonly ConfigFault[];
}

export interface LoadedConfig {
  sectionFor<TSection>(module: ModuleDescriptor<TSection>): TSection | undefined;
}

export interface LoadConfigResult {
  config?: LoadedConfig;
  faults: readonly ConfigFault[];
}

export type ConfigLoad = LoadConfigResult;
