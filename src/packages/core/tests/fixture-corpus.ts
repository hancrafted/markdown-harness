// Loads `fixtures/` — the synthetic repo root that IS the specification.
//
// This helper plays the role `src/cli.ts` plays in production: it is the
// caller's edge, and the only place in a test that touches disk. Everything
// past it is values.

import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Corpus } from '../../contract/corpus.ts';

const DIR = fileURLToPath(new URL('../../../../fixtures/', import.meta.url));

export const FIXTURE_CONFIG = readFileSync(`${DIR}valid-test-config.yaml`, 'utf8');

/**
 * `root` is the string the caller passed, never the absolute path it resolved
 * to. A frozen report has to compare equal on another machine, which it cannot
 * do while it carries somebody's home directory.
 */
export function fixtureCorpus(): Corpus {
  const paths = globSync('**/*.md', { cwd: DIR }).sort();
  return {
    root: 'fixtures',
    files: paths.map((path) => ({ path, text: readFileSync(`${DIR}${path}`, 'utf8') })),
  };
}
