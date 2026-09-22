// Colocated unit test for the selector token grammar shared by every Module.

import { describe, expect, it } from 'vitest';
import { fileNameOf, folderOf, isFileNameToken, isFolderToken } from './selector-grammar.pure.ts';

describe('selector token grammar', () => {
  describe('success cases', () => {
    it('admits literal folder and file-name tokens', () => {
      // ARRANGE
      const folder = 'docs/vision/';
      const fileName = 'product.md';
      const admitted = true;
      // ACT
      const actual = [isFolderToken(folder), isFileNameToken(fileName)];
      // ASSERT
      expect(actual).toEqual([admitted, admitted]);
    });

    it('decomposes a normalised nested path into selector tokens', () => {
      // ARRANGE
      const path = 'docs/vision/product.md';
      const expected = { folder: 'docs/vision/', fileName: 'product.md' };
      // ACT
      const actual = { folder: folderOf(path), fileName: fileNameOf(path) };
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses decorated, malformed, wildcard-bearing, and directory-entry tokens', () => {
      // ARRANGE
      const decoratedFolder = './docs/';
      const missingSeparator = 'docs';
      const wildcardName = '*.md';
      const currentDirectory = '.';
      const parentDirectory = '..';
      const refused = false;
      // ACT
      const actual = [
        isFolderToken(decoratedFolder),
        isFolderToken(missingSeparator),
        isFileNameToken(wildcardName),
        isFileNameToken(currentDirectory),
        isFileNameToken(parentDirectory),
      ];
      // ASSERT
      expect(actual).toEqual([refused, refused, refused, refused, refused]);
    });
  });

  describe('edge cases', () => {
    it('gives the corpus root and a root file their writable token spellings', () => {
      // ARRANGE
      const rootFolder = './';
      const rootFile = 'README.md';
      // ACT
      const actual = {
        folderAdmitted: isFolderToken(rootFolder),
        folder: folderOf(rootFile),
        fileName: fileNameOf(rootFile),
      };
      // ASSERT
      expect(actual).toEqual({ folderAdmitted: true, folder: rootFolder, fileName: rootFile });
    });
  });
});
