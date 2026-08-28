import { describe, expect, it } from 'vitest';
import { summariseSpan, type Span } from '../index';

const DAY = 86_400_000;

describe('summariseSpan', () => {
  describe('success cases', () => {
    it('collapses a span that stays inside one UTC day', () => {
      // ARRANGE
      const span: Span = { from: 0, to: DAY - 1 };
      const expected = '1970-01-01';
      // ACT
      const actual = summariseSpan(span);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('names both days when the span crosses midnight UTC', () => {
      // ARRANGE
      const span: Span = { from: 0, to: DAY };
      const expected = '1970-01-01/1970-01-02';
      // ACT
      const actual = summariseSpan(span);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('renders a reversed span in the order given rather than repairing it', () => {
      // ARRANGE
      const span: Span = { from: DAY, to: 0 };
      const expected = '1970-01-02/1970-01-01';
      // ACT
      const actual = summariseSpan(span);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('names the UTC day of a pre-epoch instant', () => {
      // ARRANGE
      const span: Span = { from: -1, to: -1 };
      const expected = '1969-12-31';
      // ACT
      const actual = summariseSpan(span);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});
