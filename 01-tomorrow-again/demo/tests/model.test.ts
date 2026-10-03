import assert from 'node:assert/strict';
import test from 'node:test';
import { beats, scenes } from '../src/content';
import { sceneArt } from '../src/art';
import {
  albumReady, createInitialState, decodeSave, reducer, SAVE_KEY,
  type Action, type GameState, type Hair, type Meal,
} from '../src/model';

type RouteOptions = { meal: Meal; hair: Hair; lookout?: boolean; stool?: boolean; framing?: 'left' | 'center' | 'right' };

function choose(state: GameState, choiceId: string, duplicate = true): GameState {
  const action: Action = { type: 'choose', nodeId: state.nodeId, choiceId };
  const result = reducer(state, action);
  assert.notEqual(result.nodeId, state.nodeId, `选择 ${choiceId} 应推进 ${state.nodeId}`);
  if (duplicate) assert.deepEqual(reducer(result, action), result, `重复点击 ${choiceId} 应幂等`);
  return result;
}

function organize(state: GameState): GameState {
  let s = reducer(state, { type: 'filter', filter: 'wenxia' });
  for (const kind of ['breakfast_hands', 'hill_shadow', 'lake_reflection']) {
    const frame = s.capturedFrames.find(f => f.kind === kind);
    assert.ok(frame, `${kind} 必须来自已经发生的动作`);
    s = reducer(s, { type: 'inspect', frameId: frame.frameId });
  }
  const first = s.wenxiaMarks[0];
  s = reducer(s, { type: 'reorder', frameId: first, direction: 1 });
  assert.ok(albumReady(s));
  return s;
}

function walk(options: RouteOptions, stopAt?: string): GameState {
  let s = reducer(createInitialState('unit-journey'), { type: 'start' });
  const preferences: Record<string, string> = {
    'T01.03': 'T01.answer_today',
    'T02.01': `T02.meal_${options.meal}`,
    'T02.05': 'T02.change_topic',
    'T02.07': options.stool ? 'T02.stool_help' : 'T02.stool_leave',
    'T03.00': options.lookout ? 'T03.route_lookout' : 'T03.route_observation',
    'T04.00': `T04.view_${options.framing || 'center'}`,
    'T04.03': 'T04.clear_offer',
    'T05.03': options.lookout ? 'T05.report' : 'T05.repair',
    'T06.04': 'T06.answer_silent',
    'T07.04': `T07.hair_${options.hair}`,
    'T08.00': options.hair === 'tidy' ? 'T08.photo_mirror' : 'T08.photo_sky',
    'T08.02': options.hair === 'tidy' ? 'T08.route_river' : 'T08.route_blank',
    'T08.04': 'T08.finish',
  };
  for (let steps = 0; steps < 150; steps++) {
    if (s.nodeId === stopAt || s.finished) return s;
    if (s.nodeId === 'T06.00') s = organize(s);
    const beat = beats[s.nodeId];
    s = choose(s, preferences[s.nodeId] || beat.choices[0].id);
  }
  assert.fail('真实状态路线超过150步，可能存在循环');
}

test('全部稳定场景/对白/选择ID唯一、目标存在，内容图可达', () => {
  const choiceIds = new Set<string>();
  for (const [id, beat] of Object.entries(beats)) {
    assert.equal(beat.id, id);
    assert.ok(scenes[beat.scene]);
    for (const choice of beat.choices) {
      assert.ok(!choiceIds.has(choice.id), `重复 choice ID: ${choice.id}`);
      choiceIds.add(choice.id);
      assert.ok(beats[choice.next], `缺失目标: ${choice.next}`);
    }
  }
  const reached = new Set<string>();
  const queue = ['T01.00'];
  while (queue.length) {
    const id = queue.shift()!;
    if (reached.has(id)) continue;
    reached.add(id);
    queue.push(...beats[id].choices.map(c => c.next));
  }
  assert.deepEqual([...reached].sort(), Object.keys(beats).sort());
});

for (const meal of ['porridge', 'flatbread'] as const) {
  for (const hair of ['tidy', 'leave'] as const) {
    for (const lookout of [false, true]) {
      test(`完整真实动作路线：${meal} × ${hair} × ${lookout ? '先观景' : '先观测'}`, () => {
        const s = walk({ meal, hair, lookout, framing: lookout ? 'right' : 'left' });
        assert.equal(s.finished, true);
        assert.equal(s.nodeId, 'T08.05');
        assert.deepEqual(s.visitedScenes, Object.keys(scenes));
        assert.equal(s.mealChoice, meal);
        assert.equal(s.hairChoice, hair);
        assert.equal(s.channelClosed, true);
        assert.equal(s.portraitConsent, true);
        assert.equal(s.saveAcknowledged, true);
        assert.equal(s.portraitSaved, true);
        assert.equal(s.helpedStool, false);
        assert.ok(!s.capturedFrames.some(f => f.kind === 'upright_stool'));
        assert.equal(new Set(s.capturedFrames.map(f => f.frameId)).size, s.capturedFrames.length);
        const expected = [
          ['breakfast_hands', 'T02', `T02.center_${meal}`],
          ['hill_shadow', 'T03', 'T03.shadow'],
          ['lake_reflection', 'T04', lookout ? 'T04.reflect_right' : 'T04.reflect_left'],
          ['window_sleeve', 'T05', 'T05.window'],
          ['portrait', 'T07', 'T07.portrait_save'],
        ];
        for (const [kind, scene, actionId] of expected) {
          const frame = s.capturedFrames.find(f => f.kind === kind);
          assert.ok(frame, `缺少 ${kind}`);
          assert.equal(frame.sourceScene, scene);
          assert.equal(frame.actionId, actionId);
          assert.ok(s.choices[frame.actionId]);
          assert.ok(s.wenxiaMarks.includes(frame.frameId));
          assert.equal(frame.frameId, `${s.runId}:${kind}`);
        }
        const breakfast = s.capturedFrames.find(f => f.kind === 'breakfast_hands')!;
        assert.equal(breakfast.variant.mealChoice, meal);
        assert.equal(breakfast.quote, meal === 'porridge' ? '碗别放桌子边上。' : '餐盘别放桌子边上。');
        const reflection = s.capturedFrames.find(f => f.kind === 'lake_reflection')!;
        assert.equal(reflection.variant.framing, lookout ? 'right' : 'left');
        const portrait = s.capturedFrames.find(f => f.kind === 'portrait')!;
        assert.equal(portrait.variant.hairChoice, hair);
        const breakfastPicture = sceneArt('T02', s, breakfast);
        assert.match(breakfastPicture, new RegExp(`data-meal-object="${meal}"`));
        assert.match(breakfastPicture, new RegExp(`data-utensil="${meal === 'porridge' ? 'spoon' : 'chopsticks'}"`));
        assert.match(breakfastPicture, /data-stool="upright"/, '早餐原图保留倒凳事件前的现场');
        const portraitPicture = sceneArt('T07', s, portrait);
        assert.match(portraitPicture, new RegExp(`data-portrait="true" data-hair="${hair}"`));
        const otherHair = structuredClone(portrait);
        otherHair.variant.hairChoice = hair === 'tidy' ? 'leave' : 'tidy';
        assert.notEqual(sceneArt('T07', s, otherHair), portraitPicture, '两种头发选择有实际不同画面');
        const later = structuredClone(s);
        later.mealChoice = meal === 'porridge' ? 'flatbread' : 'porridge';
        later.hairChoice = hair === 'tidy' ? 'leave' : 'tidy';
        later.framing = 'center';
        assert.equal(sceneArt('T02', later, breakfast), breakfastPicture, '早餐原图不读取后期状态');
        assert.equal(sceneArt('T07', later, portrait), portraitPicture, '肖像原图不读取后期状态');
        const epilogue = s.capturedFrames.find(f => f.kind.startsWith('epilogue_'))!;
        assert.equal(epilogue.variant.hairChoice, hair);
        assert.ok(s.mySelections.includes(epilogue.frameId));
        assert.ok(!s.wenxiaMarks.includes(epilogue.frameId));
        const acknowledged = s.events.findIndex(e => e.type === 'acknowledged');
        const closed = s.events.findIndex(e => e.type === 'channelClosed');
        assert.ok(acknowledged >= 0 && closed > acknowledged);
        assert.equal(s.events.filter(e => e.type === 'channelClosed').length, 1);
        assert.deepEqual(decodeSave(JSON.stringify(s)), s);
      });
    }
  }
}

test('相册筛选、查看和重排复用完全相同照片记录', () => {
  const original = walk({ meal: 'flatbread', hair: 'leave' }, 'T06.00');
  const records = structuredClone(original.capturedFrames);
  let s = reducer(original, { type: 'filter', filter: 'wenxia' });
  assert.equal(albumReady(s), false);
  const blocked = reducer(s, { type: 'choose', nodeId: s.nodeId, choiceId: 'T06.album_ready' });
  assert.equal(blocked.nodeId, 'T06.00');
  assert.match(blocked.lastNotice, /放大/);
  s = organize(s);
  assert.deepEqual(s.capturedFrames, records);
  assert.deepEqual([...s.albumOrder].sort(), records.map(f => f.frameId).sort());
  assert.notDeepEqual(s.albumOrder, original.albumOrder);
  const before = structuredClone(s);
  s = reducer(s, { type: 'inspect', frameId: s.inspectedFrames[0] });
  assert.deepEqual(s, before, '重复查看不复制照片或重复记录');
  assert.deepEqual(reducer(s, { type: 'inspect', frameId: 'does-not-exist' }), s);
  assert.deepEqual(reducer(s, { type: 'reorder', frameId: 'does-not-exist', direction: 1 }), s);
});

test('早期查看已存在共享记录后仍可正常推进', () => {
  let s = walk({ meal: 'porridge', hair: 'tidy' }, 'T02.04');
  const breakfast = s.capturedFrames[0];
  s = reducer(s, { type: 'filter', filter: 'wenxia' });
  s = reducer(s, { type: 'inspect', frameId: breakfast.frameId });
  assert.equal(s.nodeId, 'T02.04');
  assert.equal(s.capturedFrames.length, 1);
  s = choose(s, 'T02.mark_question');
  assert.equal(s.nodeId, 'T02.05');
  assert.deepEqual(s.capturedFrames, [breakfast]);
});

test('可选凳子只在实际执行时存在；重复点击与重入不重复发照片', () => {
  const s = walk({ meal: 'flatbread', hair: 'tidy', stool: true });
  const frame = s.capturedFrames.find(f => f.kind === 'upright_stool');
  assert.ok(frame);
  assert.equal(frame.actionId, 'T02.stool_help');
  assert.equal(s.capturedFrames.filter(f => f.kind === 'upright_stool').length, 1);
});

test('T04/T06/T07本地恢复保留真实构图、对白游标与相册进度', () => {
  for (const node of ['T04.02', 'T06.00', 'T07.05a', 'T07.08']) {
    let s = walk({ meal: 'flatbread', hair: 'tidy', framing: 'right' }, node);
    if (node === 'T06.00') s = organize(s);
    const restored = decodeSave(JSON.stringify(s));
    assert.deepEqual(restored, s);
    assert.equal(restored.nodeId, node);
    if (node === 'T06.00') assert.equal(albumReady(restored), true);
    if (node === 'T07.08') {
      assert.equal(restored.saveAcknowledged, true);
      assert.equal(restored.channelClosed, false);
    }
    const next = beats[node].choices[0].id;
    assert.deepEqual(choose(restored, next), choose(s, next));
  }
});

test('错误观测点给具体提示且可重试，不伪造点与照片', () => {
  let s = walk({ meal: 'porridge', hair: 'leave' }, 'T03.02');
  s = reducer(s, { type: 'choose', nodeId: 'T03.02', choiceId: 'T03.point_one_wrong' });
  assert.equal(s.nodeId, 'T03.02');
  assert.deepEqual(s.observationPoints, []);
  assert.ok(!s.capturedFrames.some(f => f.kind === 'rock_line'));
  assert.match(s.lastNotice, /断开的纹理/);
  s = choose(s, 'T03.point_one');
  assert.deepEqual(s.observationPoints, [1]);
});

test('无法靠过期/未来选择绕过同意、镜面与保存确认', () => {
  const start = reducer(createInitialState('guards'), { type: 'start' });
  for (const action of [
    { type: 'choose', nodeId: 'T07.07', choiceId: 'T07.portrait_save' },
    { type: 'choose', nodeId: 'T07.11', choiceId: 'T07.channel_close' },
    { type: 'photograph' },
    { type: 'inspect', frameId: 'guards:portrait' },
  ] as Action[]) assert.deepEqual(reducer(start, action), start);
  assert.equal(start.capturedFrames.length, 0);
  assert.equal(start.consent, false);
  assert.equal(start.mirrorWiped, false);
});

test('断线后仍可摄影、改构图与浏览；只有主动结束才finished', () => {
  let s = walk({ meal: 'porridge', hair: 'leave' }, 'T08.00');
  assert.equal(s.channelClosed, true);
  assert.equal(s.finished, false);
  const marks = [...s.wenxiaMarks];
  s = reducer(s, { type: 'view', framing: 'left' });
  s = reducer(s, { type: 'photograph' });
  assert.ok(s.capturedFrames.some(f => f.kind === 'epilogue_mirror'));
  assert.deepEqual(reducer(s, { type: 'photograph' }), s);
  s = reducer(s, { type: 'view', framing: 'right' });
  s = reducer(s, { type: 'photograph' });
  assert.ok(s.capturedFrames.some(f => f.kind === 'epilogue_sky'));
  assert.deepEqual(s.wenxiaMarks, marks, '断线后不产生新的闻夏标记');
  assert.equal(s.finished, false);
  const portrait = s.capturedFrames.find(f => f.kind === 'portrait')!;
  s = reducer(s, { type: 'inspect', frameId: portrait.frameId });
  assert.ok(s.inspectedFrames.includes(portrait.frameId));
});

test('自由摄影保存实际多种构图；重复同构图幂等且旧图不被改写', () => {
  let s = walk({ meal: 'flatbread', hair: 'leave' }, 'T04.00');
  for (const framing of ['left', 'center', 'right'] as const) {
    s = reducer(s, { type: 'view', framing });
    s = reducer(s, { type: 'photograph' });
    assert.deepEqual(reducer(s, { type: 'photograph' }), s);
  }
  const frames = s.capturedFrames.filter(f => f.kind === 'lake_clear');
  assert.equal(frames.length, 3, '三次不同构图应该保存三张真实照片');
  assert.deepEqual(frames.map(f => f.variant.framing), ['left', 'center', 'right']);
  assert.equal(new Set(frames.map(f => f.frameId)).size, 3);
  assert.deepEqual(decodeSave(JSON.stringify(s)), s);
  const dayEnded = walk({ meal: 'porridge', hair: 'tidy' }, 'T04.10');
  assert.deepEqual(reducer(dayEnded, { type: 'photograph' }), dayEnded, '每日窗口结束后不能继续拍出旧湖景');
});

test('尾声最后主动选择已存在的镜面照，结束画面仍引用该原图', () => {
  let s = walk({ meal: 'flatbread', hair: 'leave' }, 'T08.00');
  s = reducer(s, { type: 'view', framing: 'left' });
  s = reducer(s, { type: 'photograph' });
  const mirror = structuredClone(s.capturedFrames.find(f => f.kind === 'epilogue_mirror'))!;
  s = reducer(s, { type: 'view', framing: 'right' });
  s = reducer(s, { type: 'photograph' });
  const count = s.capturedFrames.length;
  s = choose(s, 'T08.photo_mirror');
  assert.equal(s.capturedFrames.length, count, '再次选择已有原图不重复拍照');
  assert.equal(s.endingFrameId, mirror.frameId);
  assert.deepEqual(s.capturedFrames.find(f => f.frameId === mirror.frameId), mirror);
  s = choose(s, 'T08.mirror_continue');
  s = choose(s, 'T08.route_blank');
  s = choose(s, 'T08.blank_continue');
  s = choose(s, 'T08.finish');
  assert.equal(s.finished, true);
  assert.equal(s.endingFrameId, mirror.frameId);
  assert.deepEqual(decodeSave(JSON.stringify(s)), s);
});

test('存档命名空间固定且损坏数据被明确拒绝', () => {
  assert.equal(SAVE_KEY, 'sci-fi-games:01-tomorrow-again:v1');
  assert.throws(() => decodeSave('{broken'));
  assert.throws(() => decodeSave('{}'));
  assert.throws(() => decodeSave('null'));
  const valid = walk({ meal: 'porridge', hair: 'tidy' });
  const corruptions = [
    (s: GameState) => { s.version = 2 as 1; },
    (s: GameState) => { s.nodeId = 'T99.00'; },
    (s: GameState) => { s.capturedFrames[0].sourceScene = 'T08'; },
    (s: GameState) => { s.capturedFrames[0].actionId = 'unperformed'; },
    (s: GameState) => { s.capturedFrames[0].frameId = 'another-game:breakfast_hands'; },
    (s: GameState) => { s.albumOrder.push(s.albumOrder[0]); },
    (s: GameState) => { s.saveAcknowledged = false; },
    (s: GameState) => { s.consent = false; },
    (s: GameState) => { s.settings.muted = 'yes' as unknown as boolean; },
  ];
  for (const corrupt of corruptions) {
    const s = structuredClone(valid);
    corrupt(s);
    assert.throws(() => decodeSave(JSON.stringify(s)), '损坏存档不能静默载入');
  }
});

test('损坏存档不能跳到缺少真实前置动作的后期节点而造成死档', () => {
  const initial = reducer(createInitialState('damaged-progress'), { type: 'start' });
  for (const node of ['T06.00', 'T07.00', 'T07.08', 'T08.00']) {
    const impossible = structuredClone(initial);
    impossible.nodeId = node;
    assert.throws(() => decodeSave(JSON.stringify(impossible)), `${node} 缺少实际行程，必须提示恢复`);
  }
  const missingBreakfast = walk({ meal: 'porridge', hair: 'tidy' }, 'T06.00');
  missingBreakfast.breakfastCentered = false;
  assert.throws(() => decodeSave(JSON.stringify(missingBreakfast)));
  const missingMirror = walk({ meal: 'flatbread', hair: 'leave' }, 'T07.08');
  missingMirror.mirrorWiped = false;
  assert.throws(() => decodeSave(JSON.stringify(missingMirror)));
  for (const node of ['T03.03', 'T03.04']) {
    const missingPoint = walk({ meal: 'porridge', hair: 'tidy' }, node);
    missingPoint.observationPoints.pop();
    assert.throws(() => decodeSave(JSON.stringify(missingPoint)), `${node} 的观测进度缺失必须拒绝`);
  }
  const missingHair = walk({ meal: 'flatbread', hair: 'leave' }, 'T07.05b');
  missingHair.hairChoice = null;
  assert.throws(() => decodeSave(JSON.stringify(missingHair)));
});
