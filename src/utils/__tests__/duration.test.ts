import { describe, expect, it } from 'vitest';
import { formatDuration } from '../duration';

describe('formatDuration', () => {
  it('formats sub-second durations in milliseconds', () => {
    expect(formatDuration(0)).toBe('0ms');
    expect(formatDuration(-50)).toBe('0ms');
    expect(formatDuration(425.4)).toBe('425ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  it('formats durations under a minute with one decimal place in seconds', () => {
    expect(formatDuration(1000)).toBe('1.0s');
    expect(formatDuration(4320)).toBe('4.3s');
    expect(formatDuration(59940)).toBe('59.9s');
    expect(formatDuration(59960)).toBe('1m 0s');
  });

  it('formats durations of one minute or longer as minutes and seconds', () => {
    expect(formatDuration(60_000)).toBe('1m 0s');
    expect(formatDuration(75_400)).toBe('1m 15s');
    expect(formatDuration(182_000)).toBe('3m 2s');
  });
});
