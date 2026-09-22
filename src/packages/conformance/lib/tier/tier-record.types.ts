/** One declared Conformance tier and the metadata every runner reads from it. */
export interface ConformanceTier {
  readonly name: string;
  readonly caseKind: 'markdown' | 'rejected-config';
  readonly configFile: string;
  readonly caseCount: number;
  readonly assessmentInstant?: string;
}
