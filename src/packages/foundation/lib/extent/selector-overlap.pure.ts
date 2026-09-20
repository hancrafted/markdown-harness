/**
 * Selector overlap algebra.
 *
 * Decided from config text alone with no tree read (design-ADR 0007).
 */

import type { Selector } from '../../../config-contract/index.ts';

function foldersMatch(aFolders: readonly string[], bFolders: readonly string[]): boolean {
  return aFolders.some((fA) => bFolders.includes(fA));
}

function folderInTrees(folders: readonly string[], trees: readonly string[]): boolean {
  return folders.some((f) => trees.some((t) => f.startsWith(t)));
}

function treesOverlap(aTrees: readonly string[], bTrees: readonly string[]): boolean {
  return aTrees.some((tA) => bTrees.some((tB) => tA.startsWith(tB) || tB.startsWith(tA)));
}

interface FolderAxis {
  readonly folders: readonly string[];
  readonly trees: readonly string[];
  readonly hasAxis: boolean;
}

function extractFolderAxis(s: Selector): FolderAxis {
  const folders = s.folders ?? [];
  const trees = s.folderTrees ?? [];
  return { folders, trees, hasAxis: folders.length > 0 || trees.length > 0 };
}

function crossCheckFolders(a: FolderAxis, b: FolderAxis): boolean {
  return (
    foldersMatch(a.folders, b.folders) ||
    folderInTrees(a.folders, b.trees) ||
    folderInTrees(b.folders, a.trees) ||
    treesOverlap(a.trees, b.trees)
  );
}

function folderAxesIntersect(a: Selector, b: Selector): boolean {
  const axisA = extractFolderAxis(a);
  const axisB = extractFolderAxis(b);
  if (!axisA.hasAxis || !axisB.hasAxis) return true;
  return crossCheckFolders(axisA, axisB);
}

function nameAxesIntersect(a: Selector, b: Selector): boolean {
  const aNames = a.fileNames ?? [];
  const bNames = b.fileNames ?? [];

  const aHasNameAxis = aNames.length > 0;
  const bHasNameAxis = bNames.length > 0;

  if (!aHasNameAxis || !bHasNameAxis) return true;

  return aNames.some((name) => bNames.includes(name));
}

/**
 * Two selectors overlap when their folder axes intersect AND their name axes intersect.
 */
export function selectorsOverlap(a: Selector, b: Selector): boolean {
  return folderAxesIntersect(a, b) && nameAxesIntersect(a, b);
}

function namesContained(outerNames?: readonly string[], innerNames?: readonly string[]): boolean {
  if (outerNames === undefined || outerNames.length === 0) return true;
  if (innerNames === undefined || innerNames.length === 0) return false;
  return innerNames.every((n) => outerNames.includes(n));
}

function innerFoldersCovered(
  innerFolders: readonly string[],
  outerFolders: readonly string[],
  outerTrees: readonly string[],
): boolean {
  return innerFolders.every((fI) => outerFolders.includes(fI) || outerTrees.some((tO) => fI.startsWith(tO)));
}

function innerTreesCovered(innerTrees: readonly string[], outerTrees: readonly string[]): boolean {
  return innerTrees.every((tI) => outerTrees.some((tO) => tI.startsWith(tO)));
}

function folderAxesContained(outer: Selector, inner: Selector): boolean {
  const outAxis = extractFolderAxis(outer);
  if (!outAxis.hasAxis) return true;

  const inAxis = extractFolderAxis(inner);
  if (!inAxis.hasAxis) return false;

  return (
    innerFoldersCovered(inAxis.folders, outAxis.folders, outAxis.trees) &&
    innerTreesCovered(inAxis.trees, outAxis.trees)
  );
}

/**
 * Whether the outer selector contains every witness point the inner selector admits.
 */
export function selectorContains(outer: Selector, inner: Selector): boolean {
  return namesContained(outer.fileNames, inner.fileNames) && folderAxesContained(outer, inner);
}
