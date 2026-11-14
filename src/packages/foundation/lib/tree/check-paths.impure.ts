import {
  absoluteHostPath,
  namedHostPath,
  realHostPath,
  relativeHostPath,
  resolvedKindOf,
} from '../platform/node-host.impure.ts';
import { checkPathReading } from './check-paths.pure.ts';

/** Read every operand's lexical location, canonical target and kind before judging it. */
export function readCheckPaths(root: string, paths: readonly string[]) {
  const absoluteRoot = absoluteHostPath(root);
  const realRoot = realHostPath(root);
  const readings = paths.map((path) => {
    const absolute = absoluteHostPath(path);
    const named = namedHostPath(absolute);
    return {
      path,
      absolute,
      named,
      real: realHostPath(absolute),
      kind: resolvedKindOf(absolute),
      relative: relativeHostPath(absoluteRoot, absolute),
      namedRelative: relativeHostPath(realRoot ?? absoluteRoot, named ?? absolute),
    };
  });
  return checkPathReading(absoluteRoot, realRoot, readings);
}
