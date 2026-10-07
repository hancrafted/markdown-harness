// Colocated unit test for the pull command's source: the encoding is written into it and the source is a runnable
// script. What it prints for each encoding is shown through the integration suite in tests/, which runs it.

import { describe, expect, it } from 'vitest';
import type { Encoding } from '../../delivery-surface.ts';
import { pullShimSource } from './pull-shim.pure.ts';

const ENCODINGS: Encoding[] = ['json', 'prose', 'intent-only'];
const SHEBANG = '#!/usr/bin/env node';

describe('pullShimSource', () => {
  describe('success cases', () => {
    it('writes the surface encoding into the source, once, for each encoding', () => {
      // ARRANGE
      const expected = ENCODINGS.map((encoding) => `const ENCODING = '${encoding}';`);
      // ACT
      const sources = ENCODINGS.map(pullShimSource);
      // ASSERT
      sources.forEach((source, index) => expect(source.split(expected[index] ?? '').length - 1).toBe(1));
    });

    it('starts with the node shebang, so the file runs as the pull command once made executable', () => {
      // ARRANGE
      const source = pullShimSource('json');
      // ACT
      const firstLine = source.split('\n')[0];
      // ASSERT
      expect(firstLine).toBe(SHEBANG);
    });
  });

  describe('failure cases', () => {
    it('leaves no placeholder behind in the source', () => {
      // ARRANGE
      const placeholder = '__ENCODING__';
      // ACT
      const sources = ENCODINGS.map(pullShimSource);
      // ASSERT
      for (const source of sources) expect(source).not.toContain(placeholder);
    });
  });

  describe('edge cases', () => {
    it('differs between encodings in the encoding constant alone', () => {
      // ARRANGE
      const normalise = (encoding: Encoding) => pullShimSource(encoding).replace(`'${encoding}'`, "'X'");
      // ACT
      const distinct = new Set(ENCODINGS.map(normalise));
      // ASSERT
      expect(distinct.size).toBe(1);
    });
  });
});
