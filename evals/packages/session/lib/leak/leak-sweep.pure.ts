// The leak sweep over a minted root's files, as text. The intent-neutralised arm's
// root must hold the generated string nowhere; the steered root must hold exactly
// the occurrences the substitution placed. It reports the files it opened and fails
// on zero, so a sweep over an empty listing cannot read as clean.

import type { SweepExpectation, SweepVerdict, SweptFile } from './leak-sweep.types.ts';

function countIn(text: string, steeringMarker: string): number {
  return steeringMarker === '' ? 0 : text.split(steeringMarker).length - 1;
}

function reasonFor(filesOpened: number, occurrences: number, expectation: SweepExpectation): string {
  if (filesOpened === 0) return 'the sweep opened no files, so it proves nothing';
  const wanted = expectation.kind === 'none' ? 0 : expectation.occurrences;
  return occurrences === wanted ? 'as expected' : `found ${occurrences} occurrences, expected ${wanted}`;
}

export function sweepForSteeringMarker(
  files: readonly SweptFile[],
  steeringMarker: string,
  expectation: SweepExpectation,
): SweepVerdict {
  const hits = files
    .map((file) => ({ path: file.path, count: countIn(file.text, steeringMarker) }))
    .filter((hit) => hit.count > 0);
  const occurrences = hits.reduce((sum, hit) => sum + hit.count, 0);
  const reason = reasonFor(files.length, occurrences, expectation);
  return { ok: reason === 'as expected', filesOpened: files.length, occurrences, hits, reason };
}
