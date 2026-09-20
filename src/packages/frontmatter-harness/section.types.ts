import type { FieldAddress, FieldConstraints, FileName, FolderPath, Selector } from '../config-contract/index.ts';

export type UnknownKeys = 'allowed' | 'forbidden';

export interface AssessConditions {
  stale: string;
}

export interface RuleSelector {
  folders?: readonly FolderPath[];
  folderTrees?: readonly FolderPath[];
  fileNames?: readonly FileName[];
}

export interface RuleCommon extends RuleSelector {
  ruleId: string;
  intent: string;
  excludeFiles?: readonly Selector[];
}

export interface ConstrainingPayload {
  frontmatter?: never;
  fields?: Record<FieldAddress, FieldConstraints>;
  unknownKeys?: UnknownKeys;
  exactlyOneOf?: readonly FieldAddress[];
  anyOf?: readonly FieldAddress[];
  allOf?: readonly FieldAddress[];
  assess?: AssessConditions;
}

export interface NoFrontmatterPayload {
  frontmatter: 'forbidden';
  fields?: never;
  unknownKeys?: never;
  exactlyOneOf?: never;
  anyOf?: never;
  allOf?: never;
  assess?: never;
}

export type RulePayload = ConstrainingPayload | NoFrontmatterPayload;

export type FrontmatterRule = RuleCommon & RulePayload;

export type FrontmatterAssess = AssessConditions;
export type FrontmatterPayload = RulePayload;

export interface FrontmatterConfig {
  assess?: AssessConditions;
  rules: readonly FrontmatterRule[];
}
