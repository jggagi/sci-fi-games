/**
 * The story's fictional, two-pulse apparatus. A unit is a selectable interval,
 * not a real-time wait: the player never has to react on a timer.
 */
export type Port = 'left' | 'right';
export type Interval = 1 | 2 | 3 | 4;
export type TrialInput = Readonly<{
  first: Port;
  second: Port;
  interval: Interval;
}>;
export type Output = readonly [1, 1 | 2];
export type Hypothesis = 'port' | 'second' | 'timing';

/**
 * The only source of experimental results. Each call is a new, reset trial;
 * neither previous calls nor the chosen ports can affect its output.
 */
export function evaluateTrial(input: TrialInput): Output {
  if (
    !input ||
    (input.first !== 'left' && input.first !== 'right') ||
    (input.second !== 'left' && input.second !== 'right') ||
    ![1, 2, 3, 4].includes(input.interval)
  ) {
    throw new RangeError('试验需要两个有效端口，以及 1–4 单位的间隔。');
  }
  return [1, input.interval < 3 ? 2 : 1];
}

/**
 * Whether one completed trial agrees with a proposed local explanation.
 * Agreement is supporting evidence, never proof of a universal theory.
 * “timing” uses the model above instead of implementing another result rule.
 */
export function assessHypothesis(hypothesis: Hypothesis, input: TrialInput): boolean {
  const actual = evaluateTrial(input);
  let prediction: readonly [number, number];
  switch (hypothesis) {
    case 'port':
      prediction = [input.first === 'left' ? 1 : 2, input.second === 'left' ? 1 : 2];
      break;
    case 'second':
      prediction = [1, 2];
      break;
    case 'timing':
      prediction = actual;
      break;
    default:
      throw new RangeError('未知的局部假设。');
  }
  return actual[0] === prediction[0] && actual[1] === prediction[1];
}
