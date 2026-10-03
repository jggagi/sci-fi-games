import { describe, expect, it } from 'vitest';
import { assessHypothesis, evaluateTrial, type Interval, type Port, type TrialInput } from '../src/experiment';

const ports: readonly Port[] = ['left', 'right'];
const intervals: readonly Interval[] = [1, 2, 3, 4];
const trialTable = ports.flatMap((first) =>
  ports.flatMap((second) =>
    intervals.map((interval) => ({
      first,
      second,
      interval,
      expectedSecond: interval === 1 || interval === 2 ? 2 : 1,
    })),
  ),
);

describe('the fictional two-pulse experiment', () => {
  it.each(trialTable)('$first → $second, $interval units: first 1, second $expectedSecond', ({ first, second, interval, expectedSecond }) => {
    const result = evaluateTrial({ first, second, interval });
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(expectedSecond);
  });

  it('resets between complete trials, regardless of previous ports or intervals', () => {
    expect(evaluateTrial({ first: 'left', second: 'right', interval: 1 })).toEqual([1, 2]);
    expect(evaluateTrial({ first: 'right', second: 'right', interval: 4 })).toEqual([1, 1]);
    expect(evaluateTrial({ first: 'left', second: 'right', interval: 1 })).toEqual([1, 2]);
    expect(evaluateTrial({ first: 'right', second: 'left', interval: 3 })).toEqual([1, 1]);
  });

  it.each(intervals)('changing either port cannot change the result at interval %i', (interval) => {
    const baseline = evaluateTrial({ first: 'left', second: 'left', interval });
    for (const first of ports) {
      for (const second of ports) {
        expect(evaluateTrial({ first, second, interval })).toEqual(baseline);
      }
    }
  });

  it('does not modify an input or depend on a mutable result from an earlier trial', () => {
    const input = Object.freeze({ first: 'left', second: 'right', interval: 2 } as const);
    const snapshot = { ...input };
    const firstResult = evaluateTrial(input);
    expect(input).toEqual(snapshot);
    expect(evaluateTrial(input)).toEqual([1, 2]);
    expect(evaluateTrial(input)).not.toBe(firstResult);
  });

  it.each([
    { first: 'up', second: 'right', interval: 1 },
    { first: 'left', second: 'down', interval: 1 },
    { first: 'left', second: 'right', interval: 0 },
    { first: 'left', second: 'right', interval: 5 },
    { first: 'left', second: 'right', interval: 1.5 },
    { first: 'left', second: 'right', interval: '1' },
    null,
  ])('rejects an undefined operation: %j', (input) => {
    expect(() => evaluateTrial(input as unknown as TrialInput)).toThrow(RangeError);
  });
});

describe('hypotheses use observable counterexamples', () => {
  it('allows a misleading initial observation to support the port hypothesis', () => {
    expect(assessHypothesis('port', { first: 'left', second: 'right', interval: 1 })).toBe(true);
  });

  it('repeating the left port disproves the port hypothesis without changing the interval', () => {
    expect(assessHypothesis('port', { first: 'left', second: 'left', interval: 1 })).toBe(false);
  });

  it('reversing the ports also disproves the port hypothesis', () => {
    expect(assessHypothesis('port', { first: 'right', second: 'left', interval: 1 })).toBe(false);
  });

  it('a longer interval supplies a counterexample to “the second is always stronger”', () => {
    expect(assessHypothesis('second', { first: 'left', second: 'left', interval: 2 })).toBe(true);
    expect(assessHypothesis('second', { first: 'left', second: 'left', interval: 3 })).toBe(false);
  });

  it.each(trialTable)('the timing model agrees with $first → $second at $interval units', ({ first, second, interval }) => {
    expect(assessHypothesis('timing', { first, second, interval })).toBe(true);
  });
});
