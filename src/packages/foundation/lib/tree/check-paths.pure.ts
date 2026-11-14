import { isInsideRoot } from './containment.pure.ts';
import { normalisePath } from './path-shape.pure.ts';

interface PathReading {
  readonly path: string;
  readonly absolute: string;
  readonly named: string | undefined;
  readonly real: string | undefined;
  readonly kind: string | undefined;
  readonly relative: string;
  readonly namedRelative: string;
}

/** The first unusable operand, or each operand's root-relative selection. */
export function checkPathReading(absoluteRoot: string, realRoot: string | undefined, readings: readonly PathReading[]) {
  for (const reading of readings) {
    const reason = refusalFor(absoluteRoot, realRoot, reading);
    if (reason !== undefined) return { kind: 'path-refused' as const, reason };
  }
  return {
    kind: 'paths' as const,
    paths: readings.map((reading) => ({
      path: reading.path,
      relative: normalisePath(isInsideRoot(absoluteRoot, reading.absolute) ? reading.relative : reading.namedRelative),
      directory: reading.kind === 'directory',
    })),
  };
}

function refusalFor(absoluteRoot: string, realRoot: string | undefined, reading: PathReading) {
  if (reading.real === undefined || (reading.kind !== 'file' && reading.kind !== 'directory')) {
    return `cannot resolve check path "${reading.path}" to a file or directory`;
  }
  if (
    realRoot === undefined ||
    !namesInsideRoot(absoluteRoot, realRoot, reading) ||
    !isInsideRoot(realRoot, reading.real)
  ) {
    return `check path "${reading.path}" is outside --root`;
  }
  return undefined;
}

/** Parent aliases may name the same corpus; a file alias outside it still does not. */
function namesInsideRoot(absoluteRoot: string, realRoot: string, reading: PathReading): boolean {
  return (
    isInsideRoot(absoluteRoot, reading.absolute) ||
    (reading.named !== undefined && isInsideRoot(realRoot, reading.named))
  );
}
