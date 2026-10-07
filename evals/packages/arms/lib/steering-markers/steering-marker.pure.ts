// The steering-marker generator. A steering marker is a code of two letters, two digits, a
// separator and four digits: the family with the lowest prior and the most
// reliable reproduction in the research. One is drawn per run, case and carrier
// from a seed, so a hit attributes to one carrier.
//
// Pure: the seed and the corpus of tracked text arrive as arguments. A candidate
// that occurs anywhere in the corpus is redrawn, so a steering marker never exists in the
// checkout before a run.

import type { GuardFile, SteeringMarkerDraw } from './steering-marker.types.ts';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MAX_ATTEMPTS = 200;

/** The shape of every code this generator can draw; the transcription guard scans committed text for it. */
export const STEERING_MARKER_FAMILY_SHAPE = /\b[A-Z]{2}\d{2}-\d{4}\b/;

function hash32(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function candidate(draw: SteeringMarkerDraw, attempt: number): string {
  const base = `${draw.seed}|${draw.caseId}|${draw.address}|${attempt}`;
  const letters = hash32(`${base}|letters`);
  const digits = hash32(`${base}|digits`);
  const pair = LETTERS[letters % LETTERS.length] + LETTERS[Math.floor(letters / LETTERS.length) % LETTERS.length];
  const head = String(digits % 100).padStart(2, '0');
  const tail = String(hash32(`${base}|tail`) % 10000).padStart(4, '0');
  return `${pair}${head}-${tail}`;
}

export function drawSteeringMarker(draw: SteeringMarkerDraw): string {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = candidate(draw, attempt);
    if (!draw.corpus.includes(code)) return code;
  }
  throw new Error(`steering marker: every one of ${MAX_ATTEMPTS} candidates collided with the corpus`);
}

/** The committed half of the transcription guard: every committed file that holds a code of the steering marker family. */
export function transcriptionGuardHits(files: readonly GuardFile[]): string[] {
  const family = new RegExp(STEERING_MARKER_FAMILY_SHAPE.source);
  return files.filter((file) => family.test(file.text)).map((file) => file.path);
}
