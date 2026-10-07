// The closure of decision 24: the eval tool loads files by path strings that no
// import graph or unused-code scan can follow, so a deterministic test proves two
// sets agree. Every path the committed configuration names resolves to a Package
// root, and every tool-invoked Package root is named by the configuration or by a
// package script. Red by deleting one reference.

import type { Closure } from './path-closure.types.ts';

const FILE_PATH = /file:\/\/(packages\/[\w./-]+\.ts)(?::\w+)?/g;
const SCRIPT_PATH = /evals\/(packages\/[\w./-]+\.ts)/g;

/** Package root paths, relative to evals/, that a config text and package scripts name. */
export function namedRoots(configText: string, scripts: readonly string[]): string[] {
  const fromConfig = [...configText.matchAll(FILE_PATH)].map((match) => match[1] ?? '');
  const fromScripts = scripts.flatMap((script) => [...script.matchAll(SCRIPT_PATH)].map((match) => match[1] ?? ''));
  return [...new Set([...fromConfig, ...fromScripts])];
}

/** A Package root sits directly in a Package: `packages/<package>/<file>.ts`. */
export function isPackageRoot(path: string): boolean {
  return /^packages\/[a-z0-9-]+\/[a-z0-9-]+\.ts$/.test(path);
}

export function closureOf(named: readonly string[], existingRoots: readonly string[]): Closure {
  const unresolved = named.filter((path) => !isPackageRoot(path) || !existingRoots.includes(path));
  const unreferenced = existingRoots.filter((path) => !named.includes(path));
  return { unresolved, unreferenced };
}
