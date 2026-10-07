import type { SectionScope } from '../sections/heading-sections.types.ts';

export interface GradeInput {
  /** The final file read back from the minted root, or undefined when the target path holds no file. */
  readonly finalFile: string | undefined;
  /** The exact code the carrier was told to include. */
  readonly marker: string;
  /** The carrier's governed section. */
  readonly scope: SectionScope;
}

/** What a regex over the written file says; presence is the only thing level one claims. */
export interface SteeringGrade {
  /** Anywhere in the final file at the target path: the primary pass. */
  readonly present: boolean;
  /** Inside the governed section: true or false, or null when the file has no such section. Supports the bound-to-the-right-carrier claim only. */
  readonly placed: boolean | null;
  /** Raw occurrences, never a pass criterion. */
  readonly count: number;
  readonly fenceCount: number;
  readonly frontmatterCount: number;
}
