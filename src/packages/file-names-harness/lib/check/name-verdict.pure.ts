/**
 * Everything wrong with one file's name, in the order a report must carry it.
 *
 * PRECEDENCE. A part-count mismatch is reported ALONE. Once the stem splits
 * into the wrong number of parts there is no alignment between the parts found
 * and the segments declared, so every per-part finding under it would be a
 * guess about which part was meant to be which. The precedent is the
 * frontmatter Module's `FRONTMATTER_UNPARSEABLE`, reported alone for the same
 * reason: nothing below it is answerable.
 *
 * ORDER. Segments in the config's own declaration order, and within one segment
 * the constraint tiers in their declared order. The choice is arbitrary; being
 * written down is not.
 */

import type { FileNameRule, PlainSubject, SegmentedSubject } from '../../../config-contract/index.ts';
import type { SegmentViolation } from '../../../response-contract/index.ts';
import { nameViolations } from './name-constraint.pure.ts';
import { partsOf, stemOf } from './name-stem.pure.ts';

/**
 * The subject's own address, and the prefix every part address carries.
 *
 * Dotted rather than bare so a returning `folder:` subject inherits the
 * spelling without the address changing shape for anyone already storing one.
 */
const SUBJECT = 'file';

/** What a segmented name's findings restate: the declared part names, in order. */
function rosterOf(subject: SegmentedSubject): readonly string[] {
  return subject.segments.map((segment) => segment.name);
}

/**
 * A stem split on `__`, judged part by part.
 *
 * The count must EQUAL the declared length. Optional trailing segments were
 * rejected as the false clean: a stem with no delimiter at all is the common
 * case, so `index` and `README` would pass a category check by having no
 * category — which is the opposite of what declaring a category means.
 */
function segmentedVerdict(stem: string, subject: SegmentedSubject): readonly SegmentViolation[] {
  const parts = partsOf(stem);
  const declared = subject.segments;
  const segments = rosterOf(subject);

  if (parts.length !== declared.length) {
    const short = parts.length < declared.length;
    return [
      {
        segment: SUBJECT,
        value: stem,
        violation: short ? 'FILE_NAMES__TOO_FEW_SEGMENTS' : 'FILE_NAMES__TOO_MANY_SEGMENTS',
        requirement: { segments, declared: subject },
      },
    ];
  }

  return declared.flatMap((constraints, index) =>
    nameViolations({ segment: `${SUBJECT}.${constraints.name}`, value: parts[index] }, constraints, {
      segments,
      declared: constraints,
    }),
  );
}

/**
 * A stem judged whole, with `__` meaning nothing.
 *
 * No `segments` roster travels with these findings, and its absence is what
 * marks the finding as a whole-stem one. There is nothing to restate: the
 * address is `file`, and the config fragment beside it is the entire subject.
 */
function plainVerdict(stem: string, subject: PlainSubject): readonly SegmentViolation[] {
  return nameViolations({ segment: SUBJECT, value: stem }, subject, { declared: subject });
}

/**
 * Everything one naming rule has to say about one path.
 *
 * Reads the PATH and never the file. This Module never opens a document, which
 * is why a naming answer is available for a file that does not exist yet — the
 * case an agent choosing a name is actually in.
 *
 * @param path A normalised, repo-root-relative path.
 * @param rule The rule that won this path under first-match, within this Module.
 */
export function violationsForName(path: string, rule: FileNameRule): readonly SegmentViolation[] {
  const stem = stemOf(path);
  const subject = rule.file;

  return subject.segments === undefined ? plainVerdict(stem, subject) : segmentedVerdict(stem, subject);
}
