import test from 'node:test';
import assert from 'node:assert/strict';
import { getSceneContent } from '../src/content.ts';
import { ARTIFACT_IDS, PLAN_IDS, canAdvance, isGameState, newGame, reduce, type Action, type ChildhoodDestination, type GameState, type PlanId } from '../src/state.ts';
import { SAVE_KEY, clearGame, loadGame, saveGame, type GameStorage } from '../src/storage.ts';

class MemoryStorage implements GameStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

let stateCollector: GameState[] | null = null;
function act(state: GameState, action: Action): GameState {
  const before = JSON.stringify(state);
  const next = reduce(state, action);
  assert.equal(JSON.stringify(state), before, `action ${action.type} mutated input`);
  assert.ok(isGameState(next), `action ${action.type} made an invalid ${next.sceneId} state`);
  if (state.artifactsSeen.includes('drawing')) {
    assert.ok(next.artifactsSeen.includes('drawing'), `${action.type} lost the existing drawing`);
    assert.ok(next.drawingFold >= state.drawingFold, `${action.type} replaced the unfolded paper`);
  }
  if (state.planConfirmed) {
    assert.equal(next.adultPlan, state.adultPlan);
    assert.equal(next.applicantName, state.applicantName);
    assert.equal(next.adultDestination, state.adultDestination);
    assert.equal(next.planConfirmed, true);
  }
  stateCollector?.push(state, next);
  return next;
}
function dialogue(state: GameState): GameState {
  let next = state;
  for (let i = 0; i < getSceneContent(state).lines.length + 2; i++) next = act(next, { type: 'advanceDialogue' });
  return next;
}
function nextScene(state: GameState): GameState {
  const ready = dialogue(state);
  assert.ok(canAdvance(ready), `gate unexpectedly blocks ${state.sceneId}`);
  return act(ready, { type: 'nextScene' });
}

/** Every route starts at S01 and earns each gate through the same reducer actions as the UI. */
function toPlan(childhood: ChildhoodDestination, earlyInference = false): GameState {
  let state = newGame();
  state = act(state, { type: 'chooseArrival', choice: 'bag' });
  state = act(state, { type: 'openToolbox' });
  state = act(state, { type: 'viewArtifact', artifact: 'ticket' });
  state = act(state, { type: 'viewArtifact', artifact: 'application' });
  state = nextScene(state);
  assert.equal(state.sceneId, 'S02');
  state = act(state, { type: 'verifyReport', displacementUnit: 'mrad', temperatureUnit: 'C' });
  state = act(state, { type: 'connectLamp', port: 'P2' });
  state = act(state, { type: 'toggleInspectionLamp' });
  state = act(state, { type: 'handoffTool' });
  state = nextScene(state);
  state = act(state, { type: 'viewArtifact', artifact: 'drawing' });
  state = act(state, { type: 'viewArtifact', artifact: 'retirement' });
  state = act(state, { type: 'unfoldDrawing' });
  if (earlyInference) state = act(state, { type: 'inferDrawing' });
  state = nextScene(state);
  state = act(state, { type: 'viewArtifact', artifact: 'conditions' });
  state = nextScene(state);
  assert.equal(state.sceneId, 'S05');
  assert.equal(state.drawingFold, 1, 'the same partially seen drawing precedes the reveal');
  state = act(state, { type: 'unfoldDrawing' });
  state = act(state, { type: 'unfoldDrawing' });
  state = nextScene(state);
  state = act(state, { type: 'placeChildhoodLamp' });
  state = act(state, { type: 'toggleChildhoodLamp' });
  state = act(state, { type: 'chooseChildhoodDestination', destination: childhood });
  assert.equal(state.adultPlan, null, 'a childhood wish cannot populate the adult plan');
  assert.equal(state.applicantName, '');
  assert.equal(state.adultDestination, '');
  state = nextScene(state);
  assert.equal(state.sceneId, 'S05_TRUTH');
  state = nextScene(state);
  assert.equal(state.sceneId, 'S06');
  state = act(state, { type: 'deliverInspection' });
  return state;
}

const destinations: Record<PlanId, string> = { long_voyage: '外日球层观测航段第一段', short_trial: '地月近程试航', not_now: '本次验收后返程' };
function submit(state: GameState, plan: PlanId): GameState {
  state = act(state, { type: 'editPlan', plan, name: '陈遥', destination: destinations[plan] });
  state = act(state, { type: 'confirmPlan' });
  assert.ok(state.planConfirmed);
  return state;
}
function completeEnding(state: GameState, saveContact = false): GameState {
  state = act(state, { type: 'storeDrawing' });
  if (state.adultPlan === 'not_now') {
    state = act(state, { type: 'chooseContact', save: saveContact });
    state = act(state, { type: 'secureBag' });
  } else {
    state = act(state, { type: 'prepareEnding', item: 'schedule' });
    state = act(state, { type: 'prepareEnding', item: 'kit' });
    state = act(state, { type: 'chooseEndingResponse', response: 'own' });
  }
  state = act(state, { type: 'toggleEndingLamp' });
  state = act(state, { type: 'activateRoute' });
  state = act(state, { type: 'observeWindow' });
  return nextScene(state);
}
function roundTrip(state: GameState) {
  const storage = new MemoryStorage();
  assert.equal(saveGame(state, storage), true);
  const result = loadGame(storage);
  assert.equal(result.status, 'valid');
  assert.deepEqual(result.state, state);
  return result.state!;
}

for (const childhood of ['rain', 'threeMoons'] as const) {
  for (const plan of PLAN_IDS) {
    test(`new game → ${childhood} childhood → independent ${plan} → complete S08`, () => {
      let state = toPlan(childhood);
      assert.equal(state.planConfirmed, false);
      state = act(state, { type: 'editPlan', plan, name: '陈遥', destination: destinations[plan] });
      state = roundTrip(state); // Before confirmation, the authored draft is recoverable.
      state = submit(state, plan);
      state = roundTrip(state); // Confirmed application resumes in S06 without resubmission.
      const frozen = state;
      assert.equal(reduce(state, { type: 'confirmPlan' }), frozen);
      assert.equal(reduce(state, { type: 'editPlan', plan: plan === 'not_now' ? 'long_voyage' : 'not_now', name: '代签人', destination: '其他航段' }), frozen);
      state = nextScene(state);
      assert.equal(state.sceneId, { long_voyage: 'S07A', short_trial: 'S07B', not_now: 'S07C' }[plan]);
      state = roundTrip(state); // Every distinct epilogue has an initial save/refresh point.
      state = completeEnding(state, childhood === 'rain');
      state = roundTrip(state); // Completed, playable afterglow remains resumable.
      assert.equal(state.sceneId, 'S08');
      assert.equal(state.childhoodDestination, childhood);
      assert.equal(state.adultPlan, plan);
      assert.equal(state.adultDestination, destinations[plan]);
      assert.ok(state.drawingStored);
      assert.equal(state.artifactsSeen.filter((id) => id === 'drawing').length, 1);
      assert.ok(state.drawingUnfolded && state.inspectionDelivered && state.routeActivated);
      assert.equal(canAdvance(state), false);
      assert.equal(reduce(state, { type: 'nextScene' }), state);
      assert.equal(reduce(state, { type: 'confirmPlan' }), state);
      assert.equal(reduce(state, { type: 'editPlan', plan: null, name: '', destination: '' }), state);
      state = act(state, { type: 'toggleEndingLamp' }); // Final lamp remains a real control.
      assert.equal(state.endingLampOn, false);
      roundTrip(state);
    });
  }
}

test('normal automatic maintenance is verifiable without a failure, and wrong units/port do not pass inspection', () => {
  let state = newGame();
  state = act(state, { type: 'chooseArrival', choice: 'reply' });
  state = act(state, { type: 'openToolbox' });
  state = nextScene(state);
  assert.match(JSON.stringify(getSceneContent(state)), /校准完成/);
  assert.match(JSON.stringify(getSceneContent(state)), /两项正常/);
  const unverified = state;
  assert.equal(reduce(state, { type: 'verifyReport', displacementUnit: 'mm', temperatureUnit: 'C' }), unverified);
  assert.equal(reduce(state, { type: 'verifyReport', displacementUnit: 'mrad', temperatureUnit: 'K' }), unverified);
  assert.equal(reduce(state, { type: 'connectLamp', port: 'P2' }), unverified);
  state = act(state, { type: 'verifyReport', displacementUnit: 'mrad', temperatureUnit: 'C' });
  state = act(state, { type: 'connectLamp', port: 'P1' });
  assert.equal(reduce(state, { type: 'toggleInspectionLamp' }), state);
  assert.equal(canAdvance(dialogue(state)), false);
  state = act(state, { type: 'connectLamp', port: 'P2' });
  state = act(state, { type: 'toggleInspectionLamp' });
  state = act(state, { type: 'handoffTool' });
  assert.ok(canAdvance(dialogue(state)));
  state = act(state, { type: 'toggleInspectionLamp' });
  assert.equal(state.inspectionLampOn, false);
  assert.equal(state.lampChecked, true, 'switching a verified lamp off does not erase completed work');
  roundTrip(state);
  assert.equal(Object.keys(state).some((key) => /automation.*(?:fail|broken)/i.test(key)), false);
});

test('early inference survives the reveal, changes its dialogue, and never forces pretend surprise', () => {
  const inferred = toPlan('rain', true);
  const uninferred = toPlan('rain', false);
  assert.ok(inferred.earlyInference);
  const earlyLines = getSceneContent({ ...inferred, sceneId: 'S05_TRUTH', dialogueIndex: 0 }).lines;
  const normalLines = getSceneContent({ ...uninferred, sceneId: 'S05_TRUTH', dialogueIndex: 0 }).lines;
  assert.notDeepEqual(earlyLines, normalLines, 'the reveal must acknowledge an earlier inference');
  assert.ok(/猜|认出|看出|记得|认得|想到/.test(JSON.stringify(earlyLines)), 'inference needs a natural spoken acknowledgment');
  roundTrip(inferred);
});

test('not joining keeps or declines contact without a future commitment, while preserving the drawing', () => {
  for (const saveContact of [true, false]) {
    let state = submit(toPlan('threeMoons'), 'not_now');
    state = nextScene(state);
    state = completeEnding(state, saveContact);
    assert.equal(state.contactDecision, saveContact ? 'save' : 'skip');
    assert.equal(state.projectContactSaved, saveContact);
    assert.ok(state.drawingStored);
    assert.equal(Object.keys(state).some((key) => /future|promise|deadline|appointment|returnDate/i.test(key)), false);
    assert.equal(state.adultDestination, '本次验收后返程');
    assert.equal(state.endingPrep.length, 0);
    assert.equal(state.endingResponse, null);
    assert.match(JSON.stringify(getSceneContent(state)), /其他|团队|继续/);
  }
});

test('progress gates and scene-scoped actions reject jumping, signing early, and missing explicit form fields', () => {
  let state = dialogue(newGame());
  const actions: Action[] = [{ type: 'nextScene' }, { type: 'confirmPlan' }, { type: 'unfoldDrawing' }, { type: 'chooseChildhoodDestination', destination: 'rain' }, { type: 'editPlan', plan: 'long_voyage', name: '陈遥', destination: '远航' }, { type: 'storeDrawing' }, { type: 'activateRoute' }];
  for (const action of actions) assert.equal(reduce(state, action), state, action.type);
  state = toPlan('rain');
  assert.equal(state.adultPlan, null);
  assert.equal(reduce(state, { type: 'confirmPlan' }), state);
  state = act(state, { type: 'editPlan', plan: 'short_trial', name: '   ', destination: '近程' });
  assert.equal(reduce(state, { type: 'confirmPlan' }), state);
  state = act(state, { type: 'editPlan', plan: 'short_trial', name: '陈遥', destination: '' });
  assert.equal(reduce(state, { type: 'confirmPlan' }), state);
  state = act(state, { type: 'editPlan', plan: 'short_trial', name: ' 陈遥 ', destination: ' 地月试航 ' });
  state = act(state, { type: 'confirmPlan' });
  assert.equal(state.applicantName, '陈遥');
  assert.equal(state.adultDestination, '地月试航');
});

test('repeated discrete actions are idempotent and do not duplicate the drawing or preparation', () => {
  let state = nextScene(submit(toPlan('rain', true), 'long_voyage'));
  for (const action of [{ type: 'storeDrawing' }, { type: 'prepareEnding', item: 'schedule' }, { type: 'prepareEnding', item: 'kit' }, { type: 'chooseEndingResponse', response: 'own' }] as Action[]) {
    state = act(state, action);
    assert.equal(reduce(state, action), state);
  }
  for (const artifact of ARTIFACT_IDS) assert.equal(reduce(state, { type: 'viewArtifact', artifact }), state);
  assert.deepEqual(state.endingPrep, ['schedule', 'kit']);
  state = act(state, { type: 'toggleEndingLamp' });
  state = act(state, { type: 'activateRoute' });
  assert.equal(reduce(state, { type: 'activateRoute' }), state);
});

test('storage uses only this story namespace, preserves corrupt raw saves, and recovers after explicit restart', () => {
  const storage = new MemoryStorage();
  const unrelatedKey = 'sci-fi-games:04-the-next-morning:v1';
  storage.setItem(unrelatedKey, 'preserve-me');
  assert.equal(loadGame(storage).status, 'empty');
  const invalidSaves: string[] = ['{broken', JSON.stringify({ ...newGame(), version: 2 }), JSON.stringify({ ...newGame(), sceneId: 'S07A' }), JSON.stringify({ ...newGame(), drawingUnfolded: true }), JSON.stringify({ ...newGame(), dialogueIndex: 999 }), JSON.stringify({ ...newGame(), futurePromise: '以后一定来' })];
  for (const raw of invalidSaves) {
    storage.setItem(SAVE_KEY, raw);
    const loaded = loadGame(storage);
    assert.equal(loaded.status, 'corrupt');
    assert.equal(loaded.state, null);
    assert.equal(loaded.raw, raw);
    assert.equal(storage.getItem(SAVE_KEY), raw, 'loading cannot silently discard a corrupt save');
  }
  assert.equal(clearGame(storage), true);
  assert.equal(loadGame(storage).status, 'empty');
  assert.equal(storage.getItem(unrelatedKey), 'preserve-me');
  assert.equal(saveGame(newGame(), storage), true);
  assert.equal(loadGame(storage).status, 'valid');
  assert.equal(storage.getItem(unrelatedKey), 'preserve-me');
});

test('contradictory confirmed plans and epilogue progress are rejected on restore', () => {
  const confirmed = submit(toPlan('rain'), 'long_voyage');
  for (const invalid of [{ ...confirmed, adultPlan: null }, { ...confirmed, adultDestination: '' }, { ...confirmed, inspectionDelivered: false }, { ...confirmed, sceneId: 'S07B' }, { ...confirmed, drawingStored: true }, { ...confirmed, artifactsSeen: confirmed.artifactsSeen.filter((id) => id !== 'drawing') }]) {
    assert.equal(isGameState(invalid), false);
  }
});

test('unavailable or quota-limited storage returns an explicit result without throwing', () => {
  assert.equal(loadGame(null).status, 'unavailable');
  assert.equal(saveGame(newGame(), null), false);
  assert.equal(clearGame(null), false);
  const blocked: GameStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('blocked'); } };
  assert.equal(loadGame(blocked).status, 'unavailable');
  assert.equal(saveGame(newGame(), blocked), false);
  assert.equal(clearGame(blocked), false);
});

test('accessibility settings round-trip and editing keeps free text as plain data', () => {
  assert.deepEqual(newGame().settings, { muted: true, typing: false, reducedMotion: false });
  let state = toPlan('rain');
  for (const key of ['muted', 'reducedMotion'] as const) state = act(state, { type: 'setSetting', key, value: true });
  state = act(state, { type: 'setSetting', key: 'typing', value: false });
  state = act(state, { type: 'editPlan', plan: 'short_trial', name: '陈遥', destination: '<img src=x onerror=alert(1)>' });
  const restored = roundTrip(state);
  assert.deepEqual(restored.settings, { muted: true, typing: false, reducedMotion: true });
  assert.equal(restored.adultDestination, '<img src=x onerror=alert(1)>');
});

test('every typed action preserves save validity at all reachable checkpoints across six full routes', () => {
  const checkpoints: GameState[] = [];
  stateCollector = checkpoints;
  try {
    for (const childhood of ['rain', 'threeMoons'] as const) {
      for (const plan of PLAN_IDS) completeEnding(nextScene(submit(toPlan(childhood, true), plan)), childhood === 'rain');
    }
  } finally {
    stateCollector = null;
  }
  const actions: Action[] = [
    { type: 'advanceDialogue' }, { type: 'nextScene' }, { type: 'chooseArrival', choice: 'bag' }, { type: 'chooseArrival', choice: 'reply' },
    { type: 'openToolbox' }, { type: 'verifyReport', displacementUnit: 'mrad', temperatureUnit: 'C' },
    { type: 'verifyReport', displacementUnit: 'mm', temperatureUnit: 'K' }, { type: 'connectLamp', port: 'P1' }, { type: 'connectLamp', port: 'P2' },
    { type: 'toggleInspectionLamp' }, { type: 'handoffTool' }, ...ARTIFACT_IDS.map((artifact) => ({ type: 'viewArtifact', artifact }) as const),
    { type: 'inferDrawing' }, { type: 'unfoldDrawing' }, { type: 'placeChildhoodLamp' }, { type: 'toggleChildhoodLamp' },
    { type: 'chooseChildhoodDestination', destination: 'rain' }, { type: 'chooseChildhoodDestination', destination: 'threeMoons' },
    { type: 'deliverInspection' }, { type: 'editPlan', plan: null, name: '', destination: '' },
    ...PLAN_IDS.map((plan) => ({ type: 'editPlan', plan, name: '陈遥', destination: destinations[plan] }) as const), { type: 'confirmPlan' },
    { type: 'prepareEnding', item: 'schedule' }, { type: 'prepareEnding', item: 'kit' }, { type: 'storeDrawing' },
    { type: 'chooseContact', save: true }, { type: 'chooseContact', save: false }, { type: 'secureBag' },
    { type: 'chooseEndingResponse', response: 'own' }, { type: 'chooseEndingResponse', response: 'work' },
    { type: 'toggleEndingLamp' }, { type: 'activateRoute' }, { type: 'observeWindow' },
    { type: 'setSetting', key: 'muted', value: false }, { type: 'setSetting', key: 'typing', value: true }, { type: 'setSetting', key: 'reducedMotion', value: true },
  ];
  const uniqueCheckpoints = [...new Map(checkpoints.map((state) => [JSON.stringify(state), state])).values()];
  assert.ok(uniqueCheckpoints.length > 100);
  for (const state of uniqueCheckpoints) {
    for (const action of actions) {
      const result = reduce(state, action);
      assert.ok(isGameState(result), `${state.sceneId} + ${action.type} produced an unsavable state`);
      assert.equal(saveGame(result, new MemoryStorage()), true, `${state.sceneId} + ${action.type} could not save immediately`);
    }
  }
});
