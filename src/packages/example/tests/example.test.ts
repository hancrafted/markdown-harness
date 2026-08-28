import { describe, expect, it } from 'vitest';
import { summariseSpan, type Span } from '../index';

const DAY = 86_400_000;

describe('summariseSpan', () => {
  it('collapses a span that stays inside one UTC day', () => {
    const span: Span = { from: 0, to: DAY - 1 };
    expect(summariseSpan(span)).toBe('1970-01-01');
  });

  it('names both days when the span crosses midnight UTC', () => {
    const span: Span = { from: 0, to: DAY };
    expect(summariseSpan(span)).toBe('1970-01-01/1970-01-02');
  });
});
