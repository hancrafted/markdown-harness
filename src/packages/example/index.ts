import { isSameUtcDay, toUtcDay } from './lib/impl.pure';
import type { Span } from './lib/span.types';

export type { Span } from './lib/span.types';

/** Render a span as one UTC day, or as two separated by a slash. */
export function summariseSpan(span: Span): string {
  return isSameUtcDay(span.from, span.to) ? toUtcDay(span.from) : `${toUtcDay(span.from)}/${toUtcDay(span.to)}`;
}
