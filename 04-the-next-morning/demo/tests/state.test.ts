import { describe, expect, it } from 'vitest';
import { newState, reduceState, canAdvance, handoffComplete, sceneTrials, type Action, type Choice, type State } from '../src/state';
import type { Interval, TrialInput } from '../src/experiment';

function apply(state: State, ...actions: Action[]): State {
  return actions.reduce(reduceState, state);
}
function measure(state: State, input: TrialInput): State {
  return apply(state,
    { type: 'reset', from: state.sceneId },
    { type: 'configure', value: input },
    { type: 'pulse', index: 1, from: state.sceneId },
    { type: 'pulse', index: 2, from: state.sceneId },
  );
}
function advance(state: State): State {
  expect(canAdvance(state)).toBe(true);
  return reduceState(state, { type: 'advance', from: state.sceneId });
}
function reachHandoff(initial: 'port' | 'second' = 'port'): State {
  let state = apply(newState(), { type: 'focus', value: 'local' }, { type: 'connect' });
  state = advance(state);
  state = measure(state, { first: 'left', second: 'right', interval: 1 });
  state = reduceState(state, { type: 'propose', model: initial });
  state = measure(state, { first: 'left', second: 'left', interval: 1 });
  state = reduceState(state, { type: 'revise-short' });
  state = advance(state);
  for (const interval of [2, 3, 4] as Interval[]) state = measure(state, { first: 'left', second: 'left', interval });
  state = reduceState(state, { type: 'revise-time' });
  state = advance(state);
  state = apply(state,
    { type: 'retain-method' }, { type: 'reject-explanation' },
    { type: 'question', value: '相似的时间边界为何出现在不同虚构装置中？' }, { type: 'save-question' },
  );
  state = advance(state);
  state = apply(state, { type: 'archive' }, { type: 'ask' });
  state = advance(state);
  return apply(state, { type: 'regret' }, { type: 'wish' });
}
function reachDecision(initial: 'port' | 'second' = 'port'): State {
  return advance(apply(reachHandoff(initial),
    { type: 'classify', id: 'records', category: 'fact' },
    { type: 'classify', id: 'conjecture', category: 'conjecture' },
    { type: 'classify', id: 'unfinished', category: 'unfinished' },
  ));
}
function choose(state: State, choice: Choice): State {
  return apply(state, { type: 'choose', choice }, { type: 'confirm', choice }, { type: 'morning' });
}

describe('progress is earned by observations and acknowledged actions', () => {
  it('cannot advance a fresh scene, or propose/revise before observing', () => {
    const start = newState();
    expect(apply(start, { type: 'connect' }, { type: 'advance', from: 'D01' })).toEqual(start);
    let state = advance(apply(start, { type: 'focus', value: 'structure' }, { type: 'connect' }));
    const before = state;
    state = apply(state, { type: 'propose', model: 'port' }, { type: 'revise-short' }, { type: 'advance', from: 'D02' });
    expect(state).toEqual(before);
  });

  it('a recorded counterexample refutes the player hypothesis; dialogue alone cannot do it', () => {
    let state = advance(apply(newState(), { type: 'focus', value: 'local' }, { type: 'connect' }));
    state = measure(state, { first: 'left', second: 'right', interval: 1 });
    state = reduceState(state, { type: 'propose', model: 'port' });
    expect(state.hypotheses[0]).toMatchObject({ model: 'port', status: 'provisional', evidenceIds: ['trial-1'] });
    expect(reduceState(state, { type: 'revise-short' }).shortRevision).toBe(false);
    state = measure(state, { first: 'left', second: 'left', interval: 1 });
    expect(state.trialHistory[1]).toMatchObject({ first: 'left', second: 'left', interval: 1, output: [1, 2] });
    expect(state.hypotheses[0]).toMatchObject({ status: 'refuted', evidenceIds: ['trial-2'] });
    state = reduceState(state, { type: 'revise-short' });
    expect(state.shortRevision).toBe(true);
    expect(state.hypotheses.find(h => h.model === 'second')?.status).toBe('provisional');
    const once = state;
    expect(reduceState(state, { type: 'revise-short' })).toEqual(once);
  });

  it('the longer-interval counterexample stays recorded after revising the model', () => {
    const state = reachDecision();
    const second = state.hypotheses.find(h => h.model === 'second');
    const timing = state.hypotheses.find(h => h.model === 'timing');
    expect(second?.status).toBe('refuted');
    expect(second?.evidenceIds).toEqual(['trial-4', 'trial-5']);
    expect(timing).toMatchObject({ status: 'provisional', evidenceIds: ['trial-3', 'trial-4', 'trial-5'] });
    expect(sceneTrials(state, 'D03').map(t => [t.interval, t.output])).toEqual([[2, [1, 2]], [3, [1, 1]], [4, [1, 1]]]);
  });

  it('two explicit inputs produce one record; repeats and reconfiguration mid-trial cannot corrupt it', () => {
    let state = advance(apply(newState(), { type: 'focus', value: 'scale' }, { type: 'connect' }));
    state = reduceState(state, { type: 'pulse', index: 2, from: 'D02' });
    expect(state.trialHistory).toHaveLength(0);
    state = reduceState(state, { type: 'pulse', index: 1, from: 'D02' });
    state = apply(state,
      { type: 'pulse', index: 1, from: 'D02' },
      { type: 'configure', value: { first: 'right', second: 'left', interval: 1 } },
    );
    expect(state.planned).toEqual({ first: 'left', second: 'right', interval: 1 });
    expect(state.pulse).toBe(1);
    state = apply(state, { type: 'pulse', index: 2, from: 'D02' }, { type: 'pulse', index: 2, from: 'D02' });
    expect(state.trialHistory).toHaveLength(1);
    expect(state.trialHistory[0].output).toEqual([1, 2]);
    state = reduceState(state, { type: 'reset', from: 'D02' });
    expect(state.pulse).toBe(0);
    expect(state.trialHistory).toHaveLength(1);
    state = measure(state, { first: 'right', second: 'left', interval: 1 });
    expect(state.trialHistory[1]).toMatchObject({ id: 'trial-2', output: [1, 2] });
  });

  it('a stale advance and stale pulse cannot move the following scene or create a record', () => {
    const state = advance(apply(newState(), { type: 'focus', value: 'local' }, { type: 'connect' }));
    expect(apply(state,
      { type: 'advance', from: 'D01' },
      { type: 'pulse', index: 1, from: 'D01' },
      { type: 'pulse', index: 2, from: 'D01' },
      { type: 'reset', from: 'D01' },
    )).toEqual(state);
  });

  it('only correctly separated facts, conjectures and unfinished work enable the decision', () => {
    let state = reachHandoff();
    expect(handoffComplete(state)).toBe(false);
    expect(reduceState(state, { type: 'advance', from: 'D06' }).sceneId).toBe('D06');
    state = apply(state,
      { type: 'classify', id: 'records', category: 'fact' },
      { type: 'classify', id: 'conjecture', category: 'fact' },
      { type: 'classify', id: 'unfinished', category: 'unfinished' },
    );
    expect(handoffComplete(state)).toBe(false);
    state = reduceState(state, { type: 'classify', id: 'conjecture', category: 'conjecture' });
    expect(handoffComplete(state)).toBe(true);
    expect(advance(state).sceneId).toBe('D07');
  });

  it('the reducer leaves its input unchanged', () => {
    const state = reachDecision();
    const original = structuredClone(state);
    reduceState(state, { type: 'choose', choice: 'accepted' });
    expect(state).toEqual(original);
  });
});

describe('the final choice has no hidden score and has a separate confirmation', () => {
  it.each(['port', 'second'] as const)('either outcome is possible after proposing %s', (model) => {
    const before = reachDecision(model);
    for (const choice of ['withdrawn', 'accepted'] as const) {
      const state = choose(before, choice);
      expect(state.finalChoice).toBe(choice);
      expect(state.sceneId).toBe(choice === 'withdrawn' ? 'D08A' : 'D08B');
      expect(state.trialHistory).toEqual(before.trialHistory);
      expect(state.hypotheses).toEqual(before.hypotheses);
    }
  });

  it('unconfirmed and mismatched confirmations do not commit a choice; review clears the pending choice', () => {
    const before = reachDecision();
    expect(reduceState(before, { type: 'confirm', choice: 'accepted' }).finalChoice).toBeNull();
    const pending = reduceState(before, { type: 'choose', choice: 'accepted' });
    expect(pending.finalChoice).toBeNull();
    expect(reduceState(pending, { type: 'morning' }).sceneId).toBe('D07');
    expect(reduceState(pending, { type: 'confirm', choice: 'withdrawn' }).finalChoice).toBeNull();
    const reviewed = reduceState(pending, { type: 'review-handoff' });
    expect(reviewed.sceneId).toBe('D06');
    expect(reviewed.pendingChoice).toBeNull();
    expect(reviewed.finalChoice).toBeNull();
    expect(handoffComplete(reviewed)).toBe(true);
    expect(advance(reviewed).sceneId).toBe('D07');
    expect(reduceState(pending, { type: 'cancel-choice' }).pendingChoice).toBeNull();
  });

  it('confirmation rejects inconsistent handoff even if a decision scene is supplied', () => {
    const state = reachDecision();
    state.handoffItems.conjecture = 'fact';
    expect(reduceState(state, { type: 'choose', choice: 'accepted' }).pendingChoice).toBeNull();
    state.pendingChoice = 'accepted';
    expect(reduceState(state, { type: 'confirm', choice: 'accepted' }).finalChoice).toBeNull();
  });

  it.each(['withdrawn', 'accepted'] as const)('confirmed %s is immutable under repeats, review and opposite choices', (choice) => {
    let state = apply(reachDecision(), { type: 'choose', choice }, { type: 'confirm', choice });
    const committed = state;
    const opposite = choice === 'withdrawn' ? 'accepted' : 'withdrawn';
    state = apply(state,
      { type: 'confirm', choice }, { type: 'choose', choice: opposite },
      { type: 'confirm', choice: opposite }, { type: 'cancel-choice' }, { type: 'review-handoff' },
    );
    expect(state).toEqual(committed);
    state = reduceState(state, { type: 'morning' });
    const morning = state;
    state = apply(state, { type: 'morning' }, { type: 'choose', choice: opposite }, { type: 'confirm', choice: opposite });
    expect(state).toEqual(morning);
  });
});

describe('both complete epilogues require the correct character actions', () => {
  it('Lin Yu measures again, revises the question, then starts a fresh next trial', () => {
    let state = choose(reachDecision(), 'withdrawn');
    expect(state.sceneId).toBe('D08A');
    expect(reduceState(state, { type: 'finish' }).epilogueAction).toBe(false);
    expect(reduceState(state, { type: 'pulse', index: 1, from: 'D08A' }).pulse).toBe(0);
    state = reduceState(state, { type: 'wire' });
    state = measure(state, { first: 'left', second: 'right', interval: 3 });
    expect(sceneTrials(state)[0].output).toEqual([1, 1]);
    state = apply(state, { type: 'board', value: '时间边界之后还缺少哪种可检验解释？' }, { type: 'revise-board' });
    expect(state.boardRevised).toBe(true);
    expect(reduceState(state, { type: 'finish' }).epilogueAction).toBe(false);
    state = apply(state, { type: 'reset', from: 'D08A' }, { type: 'pulse', index: 1, from: 'D08A' }, { type: 'finish' });
    expect(state.nextStarted).toBe(true);
    expect(state.epilogueAction).toBe(true);
    expect(state.finalChoice).toBe('withdrawn');
    expect(state.verified).toEqual([]);
    expect(state.questionOnBoard).not.toBe('');
  });

  it.each(['archive', 'measure'] as const)('Cheng Yan can choose %s after personally verifying inherited material', (today) => {
    let state = choose(reachDecision(), 'accepted');
    expect(state.sceneId).toBe('D08B');
    expect(reduceState(state, { type: 'today', value: today }).today).toBeNull();
    state = apply(state, { type: 'verify', id: 'records' }, { type: 'verify', id: 'records' }, { type: 'verify', id: 'conjecture' }, { type: 'verify', id: 'unfinished' });
    expect(state.verified).toEqual(['records', 'conjecture', 'unfinished']);
    expect(reduceState(state, { type: 'today', value: today }).today).toBeNull();
    state = apply(state, { type: 'wire' }, { type: 'today', value: today });
    if (today === 'measure') {
      expect(reduceState(state, { type: 'finish' }).epilogueAction).toBe(false);
      state = measure(state, { first: 'right', second: 'left', interval: 3 });
      expect(sceneTrials(state)[0].output).toEqual([1, 1]);
    } else {
      expect(reduceState(state, { type: 'pulse', index: 1, from: 'D08B' }).pulse).toBe(0);
      expect(sceneTrials(state)).toEqual([]);
    }
    state = apply(state, { type: 'board', value: '不得填入未传回的答案' }, { type: 'finish' });
    expect(state.questionOnBoard).toBe('');
    expect(state.epilogueAction).toBe(true);
    expect(state.finalChoice).toBe('accepted');
    expect(state.handoffItems).toEqual({ records: 'fact', conjecture: 'conjecture', unfinished: 'unfinished' });
  });

  it('completed archival work cannot be relabeled as a measurement by a later or stale click', () => {
    const completed = apply(choose(reachDecision(), 'accepted'),
      { type: 'verify', id: 'records' }, { type: 'verify', id: 'conjecture' },
      { type: 'verify', id: 'unfinished' }, { type: 'wire' },
      { type: 'today', value: 'archive' }, { type: 'finish' },
    );
    expect(completed.today).toBe('archive');
    expect(completed.epilogueAction).toBe(true);
    expect(sceneTrials(completed, 'D08B')).toEqual([]);
    const retried = apply(completed,
      { type: 'today', value: 'measure' },
      { type: 'pulse', index: 1, from: 'D08B' }, { type: 'pulse', index: 2, from: 'D08B' },
      { type: 'finish' },
    );
    expect(retried).toEqual(completed);
    expect(retried.today).toBe('archive');
    expect(retried.epilogueAction).toBe(true);
    expect(sceneTrials(retried, 'D08B')).toEqual([]);
  });
});
