import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ANCHORS, EVIDENCE_BY_ID, FAMILY_ACTIONS, formatTime, type AnchorId, type EvidenceId, type ReplyId } from '../src/content.ts';
import {
  SAVE_KEY, availableEvidence, caseFile, createInitialState, missingEvidence, privateFile,
  reduceGame, restoreSave, serializeSave, type Action, type GameState,
} from '../src/state.ts';

const act = (s: GameState, ...actions: Action[]): GameState => actions.reduce(reduceGame, s);

function record(s: GameState, ids: EvidenceId[]): GameState {
  return ids.reduce((state, evidenceId) => act(state,
    { type: 'COLLECT', evidenceId },
    { type: 'CLASSIFY', evidenceId, category: EVIDENCE_BY_ID[evidenceId].category },
  ), s);
}

function investigation(order: AnchorId[] = ['night', 'earlier', 'mitigation']): GameState {
  let s = act(createInitialState(), { type: 'START' });
  for (const anchorId of order) {
    s = act(s, { type: 'QUERY', anchorId }, { type: 'SEEK', offset: ANCHORS[anchorId].maxOffset });
    s = record(s, availableEvidence(s).map(e => e.id));
  }
  s = act(s, { type: 'ADVANCE' }, { type: 'ADVANCE' });
  assert.equal(s.sceneId, 'M04');
  s = act(s, { type: 'CONSENT_WITNESS', accepted: true });
  s = record(s, ['witness_statement']);
  return act(s, { type: 'ADVANCE' });
}

function tenSeconds(s = investigation(), replyId: ReplyId = 'find'): GameState {
  s = act(s, { type: 'REVEAL_SOURCE' }, { type: 'REPLY', replyId }, { type: 'AUTHORIZE_FAMILY' }, { type: 'BACK_TEN' });
  for (let second = 0; second < 10; second++) s = act(s, { type: 'STEP', seconds: 1 });
  assert.equal(s.privateClipViewed, true);
  return act(s, { type: 'ADVANCE' });
}

test('fixed sources, exact time boundaries and the standalone save namespace', () => {
  assert.equal(SAVE_KEY, 'sci-fi-games:02-ten-seconds-earlier:v1');
  assert.equal(formatTime('family', -10), '18:29:50');
  assert.equal(formatTime('night', 0), '21:16:40');
  assert.equal(formatTime('earlier', -12), '10:04:00');
  for (const evidence of Object.values(EVIDENCE_BY_ID)) {
    assert.ok(evidence.source.length > 10);
    assert.ok(evidence.time.length > 4);
  }
});

test('unselected time controls cannot invent an authorized query', () => {
  let s = createInitialState();
  for (const action of [
    { type: 'SEEK', offset: -10 }, { type: 'STEP', seconds: 1 }, { type: 'BACK_TEN' },
  ] as Action[]) {
    s = act(s, action);
    assert.equal(s.activeTimeAnchor, null);
    assert.equal(s.playheadOffsetSeconds, 0);
    assert.equal(s.birthdayRangeAuthorized, false);
    assert.equal(s.privateSegmentStart, null);
    assert.match(s.notice, /请先选择已获授权/);
  }
  s = act(s, { type: 'REVEAL_SOURCE' });
  assert.equal(s.sceneId, 'M01');
  assert.equal(s.sourceReceiptDisclosed, false);
});

test('every scene is reachable and both facts stay in the complete case material', () => {
  let s = tenSeconds();
  assert.equal(s.sceneId, 'M07');
  s = act(s, { type: 'SUBMIT_CASE' }, { type: 'CONSENT_PRIVATE', accepted: true }, { type: 'SAVE_PRIVATE' }, { type: 'ADVANCE' });
  assert.equal(s.sceneId, 'M08');
  assert.equal(s.caseSubmitted, true);
  assert.equal(s.privateClipSaved, true);
  assert.deepEqual(caseFile(s).evidence.map(e => e.id), Object.keys(EVIDENCE_BY_ID));
  assert.ok(caseFile(s).evidence.find(e => e.id === 'amended_report'));
  assert.ok(caseFile(s).evidence.find(e => e.id === 'mitigation_timeline'));
});

test('different query order, including mitigation first, cannot deadlock the case', () => {
  const a = investigation();
  const b = investigation(['mitigation', 'earlier', 'night']);
  assert.equal(a.sceneId, 'M05');
  assert.equal(b.sceneId, 'M05');
  assert.deepEqual([...a.evidenceVerified].sort(), [...b.evidenceVerified].sort());
});

test('missing evidence names and missing observation are explicit', () => {
  let s = act(createInitialState(), { type: 'START' }, { type: 'ADVANCE' });
  assert.match(s.notice, /缺少.*隔离闸/);
  s = act(s, { type: 'COLLECT', evidenceId: 'gate_action' });
  assert.match(s.notice, /还缺少.*观察/);
  assert.deepEqual(s.evidenceSeen, []);
  s = act(s, { type: 'SEEK', offset: 0 });
  s = record(s, ['gate_action']);
  s = act(s, { type: 'ADVANCE' }, { type: 'ADVANCE' });
  assert.match(s.notice, /R-17 原始风险报告/);
  assert.match(s.notice, /减灾窗口/);
  assert.equal(missingEvidence(s, false).length, 4);
});

test('wrong category is actionable feedback and does not create a verified fact', () => {
  let s = act(createInitialState(), { type: 'START' }, { type: 'SEEK', offset: 0 }, { type: 'COLLECT', evidenceId: 'gate_action' });
  s = act(s, { type: 'CLASSIFY', evidenceId: 'gate_action', category: 'information' });
  assert.equal(s.evidenceVerified.length, 0);
  assert.match(s.notice, /可观察的行为/);
  s = act(s, { type: 'CLASSIFY', evidenceId: 'gate_action', category: 'fact' });
  assert.deepEqual(s.evidenceVerified, ['gate_action']);
});

test('duplicate query, collection and classification stay idempotent', () => {
  let s = act(createInitialState(), { type: 'START' });
  s = act(s, { type: 'QUERY', anchorId: 'night' }, { type: 'QUERY', anchorId: 'night' }, { type: 'SEEK', offset: 0 });
  s = record(s, ['gate_action', 'gate_action']);
  assert.deepEqual(s.queryHistory, ['night']);
  assert.deepEqual(s.evidenceSeen, ['gate_action']);
  assert.deepEqual(s.evidenceVerified, ['gate_action']);
});

test('witness cannot be collected before consent and exports stay within permission', () => {
  let s = act(createInitialState(), { type: 'START' }, { type: 'COLLECT', evidenceId: 'witness_statement' });
  assert.equal(s.witnessConsent, false);
  assert.equal(s.evidenceSeen.includes('witness_statement'), false);
  assert.match(s.notice, /有限证言许可/);
  s = investigation();
  const exported = caseFile(s);
  assert.match(exported.witnessPermission!, /仅事故时间点与应急效果/);
  assert.match(exported.witnessPermission!, /不含私人语音全文/);
  assert.equal(exported.evidence.filter(e => e.id === 'witness_statement').length, 1);
  assert.equal('transcript' in exported, false);
  assert.equal('privateVoice' in exported, false);
});

test('protected source cannot be discovered by early actions or family query', () => {
  let s = act(createInitialState(), { type: 'START' }, { type: 'REVEAL_SOURCE' }, { type: 'QUERY', anchorId: 'family' });
  assert.equal(s.sourceReceiptDisclosed, false);
  assert.equal(s.birthdayRangeAuthorized, false);
  assert.equal(s.queryHistory.includes('family'), false);
  assert.equal(caseFile(s).sourceAppendix, null);
  s = investigation();
  assert.equal(s.sourceReceiptDisclosed, false);
  s = act(s, { type: 'REVEAL_SOURCE' });
  assert.equal(s.sourceReceiptDisclosed, true);
  assert.equal(caseFile(s).sourceAppendix?.receiptId, 'R-17');
});

test('each response permits private search without deciding forgiveness', () => {
  for (const replyId of ['find', 'space', 'silent'] as const) {
    const s = tenSeconds(investigation(), replyId);
    assert.equal(s.sceneId, 'M07');
    assert.equal(s.replyId, replyId);
    assert.equal('forgiven' in s, false);
    assert.equal('moralScore' in s, false);
  }
});

test('exact ten-second rewind is bounded and all five family actions must be seen', () => {
  let s = act(investigation(), { type: 'REVEAL_SOURCE' }, { type: 'REPLY', replyId: 'space' }, { type: 'AUTHORIZE_FAMILY' });
  assert.equal(s.playheadOffsetSeconds, 0);
  s = act(s, { type: 'BACK_TEN' });
  assert.equal(s.playheadOffsetSeconds, -10);
  assert.equal(s.privateSegmentStart, -10);
  assert.equal(s.privateSegmentEnd, 0);
  s = act(s, { type: 'SEEK', offset: 0 }, { type: 'ADVANCE' });
  assert.equal(s.sceneId, 'M06');
  assert.equal(s.privateClipViewed, false);
  assert.match(s.notice, /拦住手/);
  s = act(s, { type: 'SEEK', offset: -10 });
  for (let n = 0; n < 10; n++) s = act(s, { type: 'STEP', seconds: 1 });
  assert.deepEqual([...s.familyActionsSeen].sort(), FAMILY_ACTIONS.map(a => a.id).sort());
  assert.equal(s.privateClipViewed, true);
  s = act(s, { type: 'BACK_TEN' }, { type: 'BACK_TEN' });
  assert.equal(s.playheadOffsetSeconds, -10);
});

test('case-first save is independent, private consent is separate, repeat submission is harmless', () => {
  let s = tenSeconds();
  s = act(s, { type: 'SUBMIT_CASE' });
  assert.equal(s.caseSubmitted, true);
  assert.equal(s.privateClipSaved, false);
  assert.equal(s.privateExportConsent, false);
  s = act(s, { type: 'SAVE_PRIVATE' });
  assert.equal(s.privateClipSaved, false);
  assert.match(s.notice, /缺少.*交付许可/);
  s = act(s, { type: 'CONSENT_PRIVATE', accepted: true }, { type: 'SAVE_PRIVATE' }, { type: 'SUBMIT_CASE' }, { type: 'SUBMIT_CASE' }, { type: 'SAVE_PRIVATE' });
  assert.equal(s.caseSubmissionCount, 1);
  assert.equal(s.privateSaveCount, 1);
});

test('private-first save is independent and no private evidence enters the case collection', () => {
  let s = tenSeconds();
  s = act(s, { type: 'CONSENT_PRIVATE', accepted: true }, { type: 'SAVE_PRIVATE' });
  assert.equal(s.privateClipSaved, true);
  assert.equal(s.caseSubmitted, false);
  const privateExport = privateFile(s);
  const caseExport = caseFile(s);
  assert.deepEqual(Object.keys(privateExport).sort(), ['id', 'kind', 'name', 'saved', 'segment', 'recipient', 'permission'].sort());
  assert.equal('evidence' in privateExport, false);
  assert.equal('sourceAppendix' in privateExport, false);
  assert.equal('segment' in caseExport, false);
  assert.equal('privateFile' in caseExport, false);
  assert.equal(caseExport.evidence.some(e => (e.id as string).includes('family')), false);
  assert.equal(JSON.stringify(caseExport).includes('爸爸'), false);
  assert.equal(JSON.stringify(privateExport).includes('gate_action'), false);
  assert.equal(JSON.stringify(privateExport).includes('witness_statement'), false);
  assert.equal(privateExport.segment?.start, '18:29:50');
  assert.equal(privateExport.segment?.end, '18:30:00');
  assert.equal(privateExport.name, '爸爸');
  s = act(s, { type: 'SUBMIT_CASE' }, { type: 'ADVANCE' });
  assert.equal(s.sceneId, 'M08');
});

test('save and restore before disclosure, after rewind and after the first export preserves progress', () => {
  let s = investigation();
  let restored = restoreSave(serializeSave(s));
  assert.equal(restored.recovered, false);
  assert.equal(restored.state.sceneId, 'M05');
  assert.equal(restored.state.sourceReceiptDisclosed, false);
  s = act(restored.state, { type: 'REVEAL_SOURCE' }, { type: 'REPLY', replyId: 'silent' }, { type: 'AUTHORIZE_FAMILY' }, { type: 'BACK_TEN' });
  restored = restoreSave(serializeSave(s));
  assert.equal(restored.recovered, false);
  assert.equal(restored.state.playheadOffsetSeconds, -10);
  assert.equal(restored.state.privateClipViewed, false);
  s = restored.state;
  for (let n = 0; n < 10; n++) s = act(s, { type: 'STEP', seconds: 1 });
  s = act(s, { type: 'ADVANCE' }, { type: 'SUBMIT_CASE' });
  restored = restoreSave(serializeSave(s));
  assert.equal(restored.recovered, false);
  assert.equal(restored.state.caseSubmitted, true);
  assert.equal(restored.state.privateClipSaved, false);
  s = act(restored.state, { type: 'CONSENT_PRIVATE', accepted: true }, { type: 'SAVE_PRIVATE' }, { type: 'ADVANCE' });
  assert.equal(s.sceneId, 'M08');
});

test('replay after saving is playable, survives refresh and does not change exports', () => {
  let s = tenSeconds();
  s = act(s, { type: 'CONSENT_PRIVATE', accepted: true }, { type: 'SAVE_PRIVATE' }, { type: 'SUBMIT_CASE' }, { type: 'ADVANCE' }, { type: 'REPLAY_PRIVATE' });
  assert.equal(s.playing, true);
  assert.equal(s.playheadOffsetSeconds, -10);
  for (let n = 0; n < 10; n++) s = act(s, { type: 'TICK' });
  assert.equal(s.playheadOffsetSeconds, 0);
  assert.equal(s.playing, false);
  assert.equal(s.sceneId, 'M08');
  const restored = restoreSave(serializeSave(s));
  assert.equal(restored.recovered, false);
  assert.equal(restored.state.caseSubmitted, true);
  assert.equal(restored.state.privateClipSaved, true);
});

test('malformed, incompatible and contradictory saves recover explicitly', () => {
  for (const raw of ['', '{bad', 'null', '{}', JSON.stringify({ ...createInitialState(), schemaVersion: 99 }), JSON.stringify({ ...createInitialState(), sceneId: 'M08' })]) {
    const restored = restoreSave(raw);
    assert.equal(restored.recovered, true);
    assert.equal(restored.state.sceneId, 'M01');
    assert.match(restored.reason!, /损坏或版本不兼容/);
    assert.match(restored.reason!, /其他故事存档未清除/);
  }
  const valid = tenSeconds();
  for (const bad of [
    { ...valid, witnessConsent: false },
    { ...valid, privateClipSaved: true, privateExportConsent: false },
    { ...valid, activeTimeAnchor: 'family', playheadOffsetSeconds: -11 },
    { ...valid, evidenceVerified: [...valid.evidenceVerified, 'private_birthday'] },
    { ...valid, sourceReceiptDisclosed: false },
    { ...valid, privateSegmentEnd: 5 },
  ]) assert.equal(restoreSave(JSON.stringify(bad)).recovered, true);
  assert.equal(restoreSave(null).recovered, false);
});

test('settings persist and time control never depends on audio or text animation', () => {
  let s = tenSeconds();
  s = act(s,
    { type: 'SETTING', key: 'muted', value: true },
    { type: 'SETTING', key: 'typewriter', value: false },
    { type: 'SETTING', key: 'reducedMotion', value: true },
    { type: 'SETTING', key: 'subtitles', value: false },
  );
  const restored = restoreSave(serializeSave(s));
  assert.equal(restored.recovered, false);
  assert.deepEqual(restored.state.settings, { muted: true, typewriter: false, reducedMotion: true, subtitles: false });
  assert.equal(restored.state.privateClipViewed, true);
});

test('every intermediate reducer result on a legal complete path survives validation', () => {
  let s = createInitialState();
  const steps: Action[] = [
    { type: 'SETTING', key: 'muted', value: true }, { type: 'START' },
    { type: 'QUERY', anchorId: 'earlier' }, { type: 'COLLECT', evidenceId: 'original_warning' },
    { type: 'CLASSIFY', evidenceId: 'original_warning', category: 'information' },
    { type: 'SEEK', offset: 0 }, { type: 'COLLECT', evidenceId: 'amended_report' },
    { type: 'CLASSIFY', evidenceId: 'amended_report', category: 'fact' },
    { type: 'COLLECT', evidenceId: 'signature_scene' },
    { type: 'CLASSIFY', evidenceId: 'signature_scene', category: 'information' },
    { type: 'QUERY', anchorId: 'night' }, { type: 'SEEK', offset: 0 },
    { type: 'COLLECT', evidenceId: 'gate_action' }, { type: 'CLASSIFY', evidenceId: 'gate_action', category: 'fact' },
    { type: 'ADVANCE' }, { type: 'QUERY', anchorId: 'mitigation' }, { type: 'SEEK', offset: 8 },
    { type: 'COLLECT', evidenceId: 'mitigation_timeline' }, { type: 'CLASSIFY', evidenceId: 'mitigation_timeline', category: 'consequence' },
    { type: 'ADVANCE' }, { type: 'CONSENT_WITNESS', accepted: false },
    { type: 'CONSENT_WITNESS', accepted: true }, { type: 'COLLECT', evidenceId: 'witness_statement' },
    { type: 'CLASSIFY', evidenceId: 'witness_statement', category: 'consequence' },
    { type: 'ADVANCE' }, { type: 'REVEAL_SOURCE' }, { type: 'REPLY', replyId: 'space' },
    { type: 'AUTHORIZE_FAMILY' }, { type: 'BACK_TEN' }, { type: 'PLAY_PAUSE' },
    ...Array.from({ length: 10 }, () => ({ type: 'TICK' } as Action)),
    { type: 'ADVANCE' }, { type: 'CONSENT_PRIVATE', accepted: true }, { type: 'SAVE_PRIVATE' },
    { type: 'SUBMIT_CASE' }, { type: 'ADVANCE' }, { type: 'REPLAY_PRIVATE' },
  ];
  assert.equal(restoreSave(serializeSave(s)).recovered, false);
  for (const action of steps) {
    s = reduceGame(s, action);
    assert.equal(restoreSave(serializeSave(s)).recovered, false, `${action.type} at ${s.sceneId}`);
  }
  assert.equal(s.sceneId, 'M08');
});
