import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RAIN_CHOICES, WORD_CHOICES, CHAIR_CHOICES, PAPER_IDS, CLOUD_CANDIDATES, ORIGINAL_LINE } from '../src/content.ts';
import { newGame, reduce, getManuscript, getFinalOptions, getEpilogueReferences, getRevision, serialize, loadSave, SAVE_KEY } from '../src/model.ts';
import type { State, Action, RainChoice, RevisionChoice, ChairChoice } from '../src/model.ts';

type Route = { rain: RainChoice; word: RevisionChoice; chair: ChairChoice; zhou: boolean; early?: boolean };
const defaultRoute: Route = { rain: 'rain_count', word: 'word_wait', chair: 'chair_window', zhou: true };
function apply(state: State, ...actions: Action[]): State {
  for (const action of actions) state = reduce(state, action);
  return state;
}
function sortPages(state: State): State {
  for (let target = 0; target < PAPER_IDS.length; target++) {
    while (state.pageOrder.indexOf(PAPER_IDS[target]) > target) state = reduce(state, { type: 'movePage', id: PAPER_IDS[target], direction: -1 });
  }
  return state;
}
function toAssembly(route: Route = defaultRoute, onState?: (state: State) => void): State {
  let state = newGame();
  const act = (action: Action) => { state = reduce(state, action); onState?.(state); };
  if (route.early) act({ type: 'viewCover' });
  for (const id of PAPER_IDS) act({ type: 'collectPaper', id });
  act({ type: 'startRain' });
  act({ type: 'moveBasin' });
  act({ type: 'chooseRain', id: route.rain });
  act({ type: 'finishRain' });
  act({ type: 'linkRain' });
  act({ type: 'cloudView', id: 'cloud_1' });
  act({ type: 'cloudDraft', id: 'cloud_2' });
  act({ type: 'startRevision' });
  act({ type: 'chooseWord', id: route.word });
  act({ type: 'chooseZhouEdit', accept: route.zhou });
  act({ type: 'commitRevision' });
  act({ type: 'tryChair' });
  act({ type: 'chooseChair', id: route.chair });
  act({ type: 'setReminder' });
  act({ type: 'finishChair' });
  return state;
}
function complete(route: Route = defaultRoute, final = 'final-chair'): State {
  return apply(sortPages(toAssembly(route)), { type: 'compile' }, { type: 'viewCover' }, { type: 'startFinal' }, { type: 'chooseFinal', id: final }, { type: 'saveFinal' }, { type: 'confirmAuthors' });
}

for (const rain of RAIN_CHOICES) {
  for (const word of WORD_CHOICES) {
    for (const chair of CHAIR_CHOICES) {
      test(`真实贡献→手稿→结尾：${rain.id} × ${word.id} × ${chair.id}`, () => {
        for (const zhou of [true, false]) {
          const state = complete({ rain: rain.id, word: word.id, chair: chair.id, zhou });
          assert.equal(state.sceneId, 'P08');
          assert.equal(state.authorshipConfirmed, true);
          assert.deepEqual(state.visitedMemories, ['P02', 'P04', 'P05']);
          assert.equal(state.memoryContributions.length, 3);
          const manuscript = getManuscript(state);
          const references = getEpilogueReferences(state);
          assert.equal(state.memoryContributions[0].text, rain.text);
          assert.ok(manuscript[1].text.includes(rain.text));
          assert.equal(references[0].text, rain.text);
          assert.equal(state.memoryContributions[0].choiceId, rain.id);
          for (const unchosen of RAIN_CHOICES.filter((item) => item.id !== rain.id)) {
            assert.ok(!manuscript.flatMap((page) => page.text).join('\n').includes(unchosen.text));
            assert.ok(references.every((item) => !item.text.includes(unchosen.text)));
          }
          const expected = word.id === 'word_pass' ? `${zhou ? '晚风' : '夜风'}经过屋子的灯` : `${zhou ? '晚风' : '夜风'}替屋子${word.word}灯`;
          assert.equal(state.memoryContributions[1].text, expected);
          assert.ok(manuscript[2].text.includes(`本次共同采用：${expected}`));
          assert.ok(manuscript[2].text.includes(`旁批／说明：${word.explanation}`));
          assert.equal(references[1].revision?.original, ORIGINAL_LINE);
          assert.equal(references[1].revision?.playerVersion, word.id === 'word_pass' ? '夜风经过屋子的灯' : `夜风替屋子${word.word}灯`);
          assert.equal(references[1].revision?.zhouEditAccepted, zhou);
          assert.equal(references[1].revision?.adopted, expected);
          assert.equal(state.memoryContributions[2].text, chair.note);
          assert.ok(manuscript[3].text.includes(chair.note));
          assert.equal(references[2].text, chair.note);
          assert.equal(state.finalLineText, chair.final);
          assert.ok(manuscript[5].text.includes(chair.final));
          assert.equal(getFinalOptions(state).find((option) => option.id === 'final-rain')?.text, `今天又想起那句：“${rain.text}”`);
          assert.equal(getFinalOptions(state).find((option) => option.id === 'final-word')?.text, `我们最后留下的是：“${expected}”。今天我还这样读。`);
          assert.ok(getFinalOptions(state).every((option) => !option.text.includes(CHAIR_CHOICES.find((item) => item.id !== chair.id)!.final)));
          assert.equal(loadSave(serialize(state)).status, 'valid');
          assert.deepEqual(loadSave(serialize(state)).state, state);
          for (const finalId of ['final-rain', 'final-word']) {
            const alternative = complete({ rain: rain.id, word: word.id, chair: chair.id, zhou }, finalId);
            const expectedFinal = getFinalOptions(state).find((option) => option.id === finalId)!;
            assert.equal(alternative.finalLineText, expectedFinal.text);
            assert.ok(getManuscript(alternative)[5].text.includes(expectedFinal.text));
            assert.deepEqual(alternative.memoryContributions, state.memoryContributions);
            assert.equal(loadSave(serialize(alternative)).status, 'valid');
          }
        }
      });
    }
  }
}

test('提前署名与留白仍需实际贡献、完整拼接及玩家确认', () => {
  let state = toAssembly({ rain: 'rain_plain', word: 'word_keep', chair: 'chair_angled', zhou: false, early: true });
  assert.equal(state.coauthorSeen, true);
  assert.equal(state.compilationUnderstood, false);
  assert.equal(reduce(state, { type: 'startFinal' }), state);
  state = apply(sortPages(state), { type: 'compile' }, { type: 'startFinal' }, { type: 'chooseFinal', id: 'deferred' }, { type: 'saveFinal' });
  assert.equal(state.sceneId, 'P08');
  assert.equal(state.finalLineMode, 'deferred');
  assert.equal(state.finalLineText, '');
  assert.equal(state.authorshipConfirmed, false);
  assert.ok(getManuscript(state)[5].text.includes('待小序续写'));
  assert.ok(getManuscript(state)[4].text.includes('作者栏：等待小序亲手确认'));
  state = reduce(state, { type: 'confirmAuthors' });
  assert.equal(state.authorshipConfirmed, true);
  assert.equal(state.sceneId, 'P08');
  assert.deepEqual(loadSave(serialize(state)).state, state);
});

test('未经历内容不会在手稿或尾声伪造玩家选择', () => {
  const state = newGame();
  assert.deepEqual(getEpilogueReferences(state), []);
  assert.deepEqual(getFinalOptions(state), []);
  assert.equal(state.memoryContributions.length, 0);
  const manuscriptText = getManuscript(state).flatMap((page) => page.text).join('\n');
  for (const rain of RAIN_CHOICES) assert.ok(!manuscriptText.includes(rain.text));
  for (const chair of CHAIR_CHOICES) assert.ok(!manuscriptText.includes(chair.note));
  assert.equal(state.coauthorSeen, false);
  assert.ok(!manuscriptText.includes('实体作者栏：周淮　小序'));
});

test('诗云查看和暂存只能改变候选，不能覆盖历史、原句和修订', () => {
  let state = newGame();
  state = apply(state, ...PAPER_IDS.map((id): Action => ({ type: 'collectPaper', id })), { type: 'startRain' }, { type: 'moveBasin' }, { type: 'chooseRain', id: 'rain_rice' }, { type: 'finishRain' });
  const history = JSON.stringify(state.memoryContributions);
  const pages = JSON.stringify(getManuscript(state));
  for (const candidate of CLOUD_CANDIDATES) {
    state = apply(state, { type: 'cloudView', id: candidate.id }, { type: 'cloudDraft', id: candidate.id });
    assert.equal(JSON.stringify(state.memoryContributions), history);
    assert.equal(JSON.stringify(getManuscript(state)), pages);
  }
  assert.deepEqual(state.cloudCandidateViewed, ['cloud_1', 'cloud_2', 'cloud_3']);
  state = reduce(state, { type: 'cloudDraft', id: null });
  assert.equal(state.candidateDraft, null);
  assert.equal(JSON.stringify(state.memoryContributions), history);
  assert.deepEqual(loadSave(serialize(state)).state, state);
});

test('逐步门槛拒绝跳关、不正确排序、无效选择和越界纸页移动', () => {
  let state = newGame();
  for (const type of ['startRain', 'finishRain', 'startRevision', 'commitRevision', 'finishChair', 'compile', 'startFinal', 'saveFinal', 'confirmAuthors'] as const) assert.equal(reduce(state, { type }), state);
  assert.equal(reduce(state, { type: 'collectPaper', id: 'not-a-page' }), state);
  state = toAssembly();
  assert.equal(reduce(state, { type: 'compile' }), state);
  assert.equal(reduce(state, { type: 'movePage', id: state.pageOrder[0], direction: -1 }), state);
  assert.equal(reduce(state, { type: 'movePage', id: state.pageOrder[5], direction: 1 }), state);
  assert.equal(reduce(state, { type: 'movePage', id: 'invalid', direction: 1 }), state);
  state = apply(sortPages(state), { type: 'compile' });
  assert.equal(state.compilationUnderstood, true);
  assert.equal(reduce(state, { type: 'startFinal' }), state);
  assert.equal(reduce(state, { type: 'movePage', id: 'page-1', direction: 1 }), state);
  state = apply(state, { type: 'viewCover' }, { type: 'startFinal' });
  assert.equal(reduce(state, { type: 'chooseFinal', id: 'made-up-memory' }), state);
  assert.equal(reduce(state, { type: 'saveFinal' }), state);
});

test('重复操作幂等；预览修改只在提交时生成一次最终贡献', () => {
  let state = newGame();
  state = reduce(state, { type: 'collectPaper', id: 'page-1' });
  assert.equal(reduce(state, { type: 'collectPaper', id: 'page-1' }), state);
  for (const id of PAPER_IDS.slice(1)) state = reduce(state, { type: 'collectPaper', id });
  state = apply(state, { type: 'startRain' }, { type: 'moveBasin' }, { type: 'chooseRain', id: 'rain_plain' });
  assert.equal(reduce(state, { type: 'chooseRain', id: 'rain_count' }), state);
  assert.equal(state.memoryContributions.length, 1);
  state = apply(state, { type: 'finishRain' }, { type: 'linkRain' }, { type: 'startRevision' }, { type: 'chooseWord', id: 'word_pass' }, { type: 'chooseZhouEdit', accept: true });
  assert.equal(state.memoryContributions.length, 1);
  assert.equal(getRevision(state)?.adopted, '晚风经过屋子的灯');
  state = apply(state, { type: 'chooseWord', id: 'word_wait' }, { type: 'chooseZhouEdit', accept: false }, { type: 'commitRevision' });
  assert.equal(state.memoryContributions[1].text, '夜风替屋子等着灯');
  assert.equal(state.memoryContributions.length, 2);
  assert.equal(reduce(state, { type: 'commitRevision' }), state);
  state = apply(state, { type: 'tryChair' }, { type: 'chooseChair', id: 'chair_window' }, { type: 'chooseChair', id: 'chair_angled' });
  assert.equal(state.memoryContributions.length, 2);
  state = apply(state, { type: 'setReminder' }, { type: 'finishChair' });
  assert.equal(state.memoryContributions[2].choiceId, 'chair_angled');
  assert.equal(state.memoryContributions.length, 3);
  assert.equal(reduce(state, { type: 'finishChair' }), state);
  state = complete();
  assert.equal(reduce(state, { type: 'confirmAuthors' }), state);
});

test('刷新恢复每个实际中间步骤，保留设置、来源、草稿与纸页顺序', () => {
  toAssembly({ ...defaultRoute, early: true }, (state) => {
    const loaded = loadSave(serialize(state));
    assert.equal(loaded.status, 'valid', `恢复 ${state.sceneId} ${JSON.stringify(state)}`);
    assert.deepEqual(loaded.state, state);
  });
  let state = toAssembly({ ...defaultRoute, early: true });
  state = apply(state, { type: 'movePage', id: 'page-1', direction: -1 }, { type: 'updateSettings', settings: { sound: true, typewriter: true, reducedMotion: true } }, { type: 'inspectPaper', id: 'page-2', side: 'back' });
  assert.deepEqual(loadSave(serialize(state)).state, state);
  state = apply(sortPages(state), { type: 'compile' }, { type: 'startFinal' }, { type: 'chooseFinal', id: 'final-rain' });
  assert.deepEqual(loadSave(serialize(state)).state, state);
  state = apply(state, { type: 'chooseFinal', id: 'final-word' }, { type: 'saveFinal' });
  assert.deepEqual(loadSave(serialize(state)).state, state);
});

test('损坏和自相矛盾存档明确恢复，不接受伪造的贡献、最终句或进度', () => {
  assert.equal(loadSave(null).status, 'empty');
  assert.equal(loadSave('').status, 'empty');
  for (const raw of ['{', 'null', '[]', '{}', 'x'.repeat(100_001), JSON.stringify({ version: 2, state: newGame() })]) {
    const result = loadSave(raw);
    assert.equal(result.status, 'recovered');
    assert.ok(result.message);
    assert.deepEqual(result.state, newGame());
  }
  const valid = complete();
  const corruptions: ((state: State) => void)[] = [
    (state) => { state.memoryContributions[0].text = '伪造玩家选择'; },
    (state) => { state.memoryContributions.push({ ...state.memoryContributions[0] }); },
    (state) => { state.memoryContributions[1].revision!.original = '伪造原稿'; },
    (state) => { state.chairChoice = 'chair_angled'; },
    (state) => { state.finalLineText = '并未选择的最后一行'; },
    (state) => { state.finalLineMode = 'deferred'; },
    (state) => { state.visitedMemories = ['P05']; },
    (state) => { state.coauthorSeen = false; },
    (state) => { state.pageOrder = ['page-1', 'page-1', 'page-3', 'page-4', 'page-5', 'page-6']; },
    (state) => { state.basinMoved = false; },
    (state) => { state.sceneId = 'P01'; },
    (state) => { state.paperSidesInspected = []; },
    (state) => { state.cloudCandidateViewed = []; },
  ];
  for (const mutate of corruptions) {
    const state = structuredClone(valid);
    mutate(state);
    assert.equal(loadSave(serialize(state)).status, 'recovered');
  }
  const fakeLate = newGame();
  fakeLate.sceneId = 'P08';
  fakeLate.authorshipConfirmed = true;
  assert.equal(loadSave(serialize(fakeLate)).status, 'recovered');
  for (const sceneId of ['P06', 'P07', 'P08'] as const) {
    const invalidStage = newGame();
    invalidStage.sceneId = sceneId;
    invalidStage.pageOrder = [...PAPER_IDS];
    assert.equal(loadSave(serialize(invalidStage)).status, 'recovered', `无前置状态的 ${sceneId} 应立即恢复，不能陷入排序循环`);
  }
});

test('重开新游戏与其他命名空间隔离，无历史串入', () => {
  const previous = complete({ rain: 'rain_rice', word: 'word_pass', chair: 'chair_angled', zhou: true });
  const otherProjectKey = 'sci-fi-games:01-tomorrow-again:v1';
  const storage = new Map([[SAVE_KEY, serialize(previous)], [otherProjectKey, 'other-project-save']]);
  const restarted = newGame(previous.settings);
  storage.set(SAVE_KEY, serialize(restarted));
  assert.equal(storage.get(otherProjectKey), 'other-project-save');
  assert.equal(loadSave(storage.get(SAVE_KEY)).status, 'valid');
  assert.deepEqual(restarted.memoryContributions, []);
  assert.equal(restarted.rainChoice, null);
  assert.equal(restarted.revisionChoice, null);
  assert.equal(restarted.chairChoice, null);
  assert.equal(restarted.coauthorSeen, false);
  assert.equal(restarted.authorshipConfirmed, false);
  assert.ok(getManuscript(restarted).every((page) => !page.text.includes(previous.finalLineText)));
  assert.equal(previous.authorshipConfirmed, true);
});

test('归约器和尾声读取不会修改输入状态或泄露可变历史引用', () => {
  const state = complete();
  const before = serialize(state);
  const references = getEpilogueReferences(state);
  references[0].text = '外部修改';
  references[0].source.push('外部修改');
  references[1].revision!.original = '外部修改';
  const pages = getManuscript(state);
  pages[1].text.push('外部修改');
  pages[1].source.push('外部修改');
  reduce(state, { type: 'updateSettings', settings: { sound: true } });
  assert.equal(serialize(state), before);
});
