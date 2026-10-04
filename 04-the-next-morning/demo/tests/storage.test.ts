import { describe, expect, it, vi } from 'vitest';
import { decodeSave, loadSave, saveGame, clearSave, SAVE_KEY, defaultPreferences, type Save } from '../src/storage';
import { newState, reduceState, type Action, type Choice, type State } from '../src/state';
import type { Interval } from '../src/experiment';

function act(state: State, ...actions: Action[]): State { return actions.reduce(reduceState, state); }
function trial(state: State, interval: Interval, second: 'left' | 'right' = 'left'): State {
  return act(state,
    { type: 'reset', from: state.sceneId },
    { type: 'configure', value: { first: 'left', second, interval } },
    { type: 'pulse', index: 1, from: state.sceneId }, { type: 'pulse', index: 2, from: state.sceneId },
  );
}
function checkpoints(choice: Choice): State[] {
  let state = act(newState(), { type: 'focus', value: 'scale' }, { type: 'connect' }, { type: 'advance', from: 'D01' });
  state = trial(state, 1, 'right');
  state = reduceState(state, { type: 'propose', model: 'port' });
  state = trial(state, 1);
  state = act(state, { type: 'revise-short' }, { type: 'advance', from: 'D02' });
  for (const interval of [2, 3, 4] as Interval[]) state = trial(state, interval);
  state = act(state, { type: 'revise-time' }, { type: 'advance', from: 'D03' },
    { type: 'retain-method' }, { type: 'reject-explanation' },
    { type: 'question', value: '为何不同虚构装置出现相似的时间边界？' }, { type: 'save-question' },
    { type: 'advance', from: 'D04' }, { type: 'archive' }, { type: 'ask' }, { type: 'advance', from: 'D05' },
    { type: 'regret' }, { type: 'wish' }, { type: 'classify', id: 'records', category: 'fact' },
  );
  const partialHandoff = state;
  state = act(state, { type: 'classify', id: 'conjecture', category: 'conjecture' },
    { type: 'classify', id: 'unfinished', category: 'unfinished' }, { type: 'advance', from: 'D06' }, { type: 'choose', choice });
  const pending = state;
  state = reduceState(state, { type: 'confirm', choice });
  const committed = state;
  state = reduceState(state, { type: 'morning' });
  const morning = state;
  state = reduceState(state, { type: 'wire' });
  if (choice === 'withdrawn') {
    state = trial(state, 3);
    state = act(state, { type: 'board', value: '下一轮仍需核验的条件是什么？' }, { type: 'revise-board' },
      { type: 'reset', from: 'D08A' }, { type: 'pulse', index: 1, from: 'D08A' }, { type: 'finish' });
  } else {
    state = act(state, { type: 'verify', id: 'records' }, { type: 'verify', id: 'conjecture' },
      { type: 'verify', id: 'unfinished' }, { type: 'today', value: 'measure' });
    state = act(trial(state, 3), { type: 'finish' });
  }
  return [partialHandoff, pending, committed, morning, state];
}
function save(state = newState()): Save { return { state, preferences: defaultPreferences() }; }
function roundtrip(state: State): State {
  const decoded = decodeSave(JSON.stringify(save(state)));
  expect(decoded.kind).toBe('valid');
  if (decoded.kind !== 'valid') throw new Error('Expected a valid save');
  expect(decoded.save.state).toEqual(state);
  return decoded.save.state;
}

describe('independent, recoverable local saves', () => {
  it('uses exactly the assigned versioned namespace', () => {
    expect(SAVE_KEY).toBe('sci-fi-games:04-the-next-morning:v1');
  });

  it('distinguishes an absent save from corrupt JSON, missing data and incompatible versions', () => {
    expect(decodeSave(null)).toEqual({ kind: 'empty' });
    for (const raw of ['{broken', 'null', '{}', JSON.stringify({ state: { version: 2 }, preferences: defaultPreferences() })]) {
      const result = decodeSave(raw);
      expect(result.kind).toBe('corrupt');
      if (result.kind === 'corrupt') expect(result.reason.length).toBeGreaterThan(0);
    }
    const data = save();
    (data.state as { version: number }).version = 2;
    expect(decodeSave(JSON.stringify(data)).kind).toBe('corrupt');
  });

  it.each(['withdrawn', 'accepted'] as const)('restores %s handoff, pending confirmation, committed decision and active/completed epilogue', (choice) => {
    const stages = checkpoints(choice);
    stages.forEach(roundtrip);
    expect(stages.map(s => s.sceneId)).toEqual(['D06', 'D07', 'D07', choice === 'withdrawn' ? 'D08A' : 'D08B', choice === 'withdrawn' ? 'D08A' : 'D08B']);
    expect(stages[1].pendingChoice).toBe(choice);
    expect(stages[1].finalChoice).toBeNull();
    expect(stages[2].finalChoice).toBe(choice);
    expect(stages[2].pendingChoice).toBeNull();
    expect(stages[4].epilogueAction).toBe(true);
    const restored = roundtrip(stages[2]);
    const opposite = choice === 'accepted' ? 'withdrawn' : 'accepted';
    expect(act(restored, { type: 'review-handoff' }, { type: 'choose', choice: opposite }, { type: 'confirm', choice: opposite })).toEqual(restored);
  });

  it('preserves mid-trial input without inventing an output on refresh', () => {
    let state = act(newState(), { type: 'focus', value: 'local' }, { type: 'connect' }, { type: 'advance', from: 'D01' }, { type: 'pulse', index: 1, from: 'D02' });
    state = roundtrip(state);
    expect(state.pulse).toBe(1);
    expect(state.trialHistory).toEqual([]);
    state = reduceState(state, { type: 'pulse', index: 2, from: 'D02' });
    expect(state.trialHistory).toHaveLength(1);
    expect(state.trialHistory[0].output).toEqual([1, 2]);
  });

  it('rejects tampered experiment outputs and invalid operations', () => {
    const state = checkpoints('withdrawn')[1];
    const outputChanged = save(structuredClone(state));
    outputChanged.state.trialHistory[0].output = [1, 1];
    expect(decodeSave(JSON.stringify(outputChanged))).toMatchObject({ kind: 'corrupt', reason: '实验输出不符' });
    const inputChanged = save(structuredClone(state));
    (inputChanged.state.planned as { interval: number }).interval = 9;
    expect(decodeSave(JSON.stringify(inputChanged)).kind).toBe('corrupt');
    const missingEvidence = save(structuredClone(state));
    missingEvidence.state.hypotheses[0].evidenceIds = ['trial-nonexistent'];
    expect(decodeSave(JSON.stringify(missingEvidence))).toMatchObject({ kind: 'corrupt', reason: '假设证据损坏' });
  });

  it.each(['withdrawn', 'accepted'] as const)('rejects %s saves when the epilogue belongs to the other character', (choice) => {
    const data = save(checkpoints(choice)[3]);
    data.state.sceneId = choice === 'withdrawn' ? 'D08B' : 'D08A';
    expect(decodeSave(JSON.stringify(data))).toMatchObject({ kind: 'corrupt', reason: '尾声与角色不一致' });
  });

  it('rejects a confirmed choice with a pending alternative or inconsistent material categories', () => {
    const pending = save(checkpoints('accepted')[2]);
    pending.state.pendingChoice = 'withdrawn';
    expect(decodeSave(JSON.stringify(pending)).kind).toBe('corrupt');
    const categories = save(checkpoints('accepted')[2]);
    categories.state.handoffItems.conjecture = 'fact';
    expect(decodeSave(JSON.stringify(categories)).kind).toBe('corrupt');
  });

  it('reports invalid preferences rather than silently changing player settings', () => {
    const data = save();
    (data.preferences as unknown as Record<string, unknown>).staticPulse = 'yes';
    expect(decodeSave(JSON.stringify(data))).toMatchObject({ kind: 'corrupt', reason: '设置损坏' });
  });

  it('only reads, sets and removes this story key, preserving other stories and unknown keys', () => {
    const entries = new Map<string, string>([['sci-fi-games:01-tomorrow-again:v1', 'other-story'], ['unrelated-setting', 'keep']]);
    const storage = {
      getItem: vi.fn((key: string) => entries.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => { entries.set(key, value); }),
      removeItem: vi.fn((key: string) => { entries.delete(key); }),
    };
    const data = save(checkpoints('accepted')[1]);
    expect(saveGame(storage, data)).toBe(true);
    expect(storage.setItem).toHaveBeenCalledExactlyOnceWith(SAVE_KEY, JSON.stringify(data));
    expect(loadSave(storage)).toEqual({ kind: 'valid', save: data });
    expect(storage.getItem).toHaveBeenCalledExactlyOnceWith(SAVE_KEY);
    expect(clearSave(storage)).toBe(true);
    expect(storage.removeItem).toHaveBeenCalledExactlyOnceWith(SAVE_KEY);
    expect(entries.get('sci-fi-games:01-tomorrow-again:v1')).toBe('other-story');
    expect(entries.get('unrelated-setting')).toBe('keep');
    expect(entries.has(SAVE_KEY)).toBe(false);
  });

  it('surfaces unavailable browser storage without throwing or deleting anything else', () => {
    const denied = () => { throw new Error('Storage denied'); };
    expect(loadSave({ getItem: denied })).toMatchObject({ kind: 'corrupt', reason: '浏览器不允许读取本地存档' });
    expect(saveGame({ setItem: denied }, save())).toBe(false);
    expect(clearSave({ removeItem: denied })).toBe(false);
  });
});
