import {
  ANCHORS, CASE_EVIDENCE_IDS, EVIDENCE, EVIDENCE_BY_ID, FAMILY_ACTIONS, REPLIES,
  type AnchorId, type Category, type EvidenceId, type FamilyActionId, type ReplyId, type SceneId,
} from './content';

export const SAVE_KEY = 'sci-fi-games:02-ten-seconds-earlier:v1';
export interface Settings { subtitles: boolean; muted: boolean; typewriter: boolean; reducedMotion: boolean }
export interface GameState {
  schemaVersion: 1;
  sceneId: SceneId;
  activeTimeAnchor: AnchorId | null;
  playheadOffsetSeconds: number;
  playing: boolean;
  queryHistory: AnchorId[];
  evidenceSeen: EvidenceId[];
  evidenceVerified: EvidenceId[];
  evidenceCategories: Partial<Record<EvidenceId, Category>>;
  witnessConsent: boolean;
  sourceReceiptDisclosed: boolean;
  replyId: ReplyId | null;
  birthdayRangeAuthorized: boolean;
  privateSegmentStart: number | null;
  privateSegmentEnd: number | null;
  familyActionsSeen: FamilyActionId[];
  privateClipViewed: boolean;
  privateExportConsent: boolean;
  caseSubmitted: boolean;
  privateClipSaved: boolean;
  caseSubmissionCount: number;
  privateSaveCount: number;
  exportName: '爸爸';
  settings: Settings;
  notice: string;
}

export type Action =
  | { type: 'START' }
  | { type: 'QUERY'; anchorId: AnchorId }
  | { type: 'SEEK'; offset: number }
  | { type: 'STEP'; seconds: number }
  | { type: 'BACK_TEN' }
  | { type: 'PLAY_PAUSE' }
  | { type: 'TICK' }
  | { type: 'COLLECT'; evidenceId: EvidenceId }
  | { type: 'CLASSIFY'; evidenceId: EvidenceId; category: Category }
  | { type: 'CONSENT_WITNESS'; accepted: boolean }
  | { type: 'ADVANCE' }
  | { type: 'REVEAL_SOURCE' }
  | { type: 'REPLY'; replyId: ReplyId }
  | { type: 'AUTHORIZE_FAMILY' }
  | { type: 'CONSENT_PRIVATE'; accepted: boolean }
  | { type: 'SUBMIT_CASE' }
  | { type: 'SAVE_PRIVATE' }
  | { type: 'REPLAY_PRIVATE' }
  | { type: 'SETTING'; key: keyof Settings; value: boolean };

export function createInitialState(): GameState {
  return {
    schemaVersion: 1, sceneId: 'M01', activeTimeAnchor: null, playheadOffsetSeconds: 0, playing: false,
    queryHistory: [], evidenceSeen: [], evidenceVerified: [], evidenceCategories: {}, witnessConsent: false,
    sourceReceiptDisclosed: false, replyId: null, birthdayRangeAuthorized: false,
    privateSegmentStart: null, privateSegmentEnd: null, familyActionsSeen: [], privateClipViewed: false,
    privateExportConsent: false, caseSubmitted: false, privateClipSaved: false,
    caseSubmissionCount: 0, privateSaveCount: 0, exportName: '爸爸',
    settings: { subtitles: true, muted: false, typewriter: true, reducedMotion: false },
    notice: '',
  };
}

const isInvestigation = (s: GameState) => s.sceneId === 'M02' || s.sceneId === 'M03';
const uniq = <T>(items: T[]): T[] => [...new Set(items)];
const notice = (s: GameState, message: string): GameState => ({ ...s, notice: message });

export function missingEvidence(s: GameState, includeWitness = true): typeof EVIDENCE {
  return EVIDENCE.filter(e => (includeWitness || e.id !== 'witness_statement') && !s.evidenceVerified.includes(e.id));
}

export function availableEvidence(s: GameState): typeof EVIDENCE {
  return EVIDENCE.filter(e => e.anchorId === 'witness'
    ? s.sceneId === 'M04' && s.witnessConsent
    : isInvestigation(s) && e.anchorId === s.activeTimeAnchor && s.playheadOffsetSeconds >= e.requiredOffset);
}

export function missingFamilyActions(s: GameState): string[] {
  return FAMILY_ACTIONS.filter(action => !s.familyActionsSeen.includes(action.id)).map(action => action.label);
}

function setTime(s: GameState, offset: number): GameState {
  if (!s.activeTimeAnchor || !Number.isFinite(offset)) return notice(s, '请先选择已获授权的地点与时间节点。');
  const anchor = ANCHORS[s.activeTimeAnchor];
  const bounded = Math.max(anchor.minOffset, Math.min(anchor.maxOffset, Math.round(offset)));
  let next: GameState = { ...s, playheadOffsetSeconds: bounded, notice: '', playing: bounded < anchor.maxOffset && s.playing };
  if (s.activeTimeAnchor === 'family' && s.birthdayRangeAuthorized) {
    if (bounded === -5 && s.privateSegmentStart === null) next.notice = '亲戚：“要拍了，别挡着。”唐雯：“再前面。”继续回到 18:29:50。';
    if (bounded === -10) {
      next = { ...next, privateSegmentStart: -10, privateSegmentEnd: 0, notice: '18:29:50。按播放或逐秒查看这十秒；它只属于私人片段。' };
    }
    if (next.privateSegmentStart === -10 && bounded <= 0) {
      next.familyActionsSeen = uniq([
        ...next.familyActionsSeen,
        ...FAMILY_ACTIONS.filter(action => bounded >= action.from && bounded <= action.to).map(action => action.id),
      ]);
    }
    if (bounded >= 0 && next.familyActionsSeen.length === FAMILY_ACTIONS.length) {
      next.privateClipViewed = true;
      next.playing = false;
      next.notice = s.privateClipSaved ? '十秒重播结束。私人文件仍已保存；案件资料的提交状态没有改变，可以再听一次。' : '唐雯：“就这里。”十秒已看完，随时可以再看；保存仍需另行确认。';
    }
  }
  return next;
}

export function reduceGame(s: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START':
      return s.sceneId === 'M01'
        ? { ...s, sceneId: 'M02', activeTimeAnchor: 'night', playheadOffsetSeconds: ANCHORS.night.minOffset, queryHistory: ['night'], notice: '委托已确认。事故材料和私人检索分开；先核对可观察动作。' }
        : s;
    case 'QUERY': {
      if (!ANCHORS[action.anchorId]) return notice(s, '不存在这个查询节点。');
      if (action.anchorId === 'family') {
        if (!s.birthdayRangeAuthorized || !['M06', 'M07', 'M08'].includes(s.sceneId)) return notice(s, '家庭场景尚未获得唐雯的明确授权。');
      } else if (!isInvestigation(s)) return notice(s, '请在事故调查阶段查询这些节点；提交后可查看完整的案件清单。');
      return {
        ...s, activeTimeAnchor: action.anchorId, playheadOffsetSeconds: action.anchorId === 'family' ? 0 : ANCHORS[action.anchorId].minOffset,
        playing: false, queryHistory: uniq([...s.queryHistory, action.anchorId]), notice: `查询来源：${ANCHORS[action.anchorId].source}`,
      };
    }
    case 'SEEK': return setTime(s, action.offset);
    case 'STEP': return setTime(s, s.playheadOffsetSeconds + action.seconds);
    case 'BACK_TEN': return setTime(s, s.playheadOffsetSeconds - 10);
    case 'PLAY_PAUSE':
      return s.activeTimeAnchor ? { ...s, playing: !s.playing, notice: '' } : notice(s, '请先选择查询节点。');
    case 'TICK': return s.playing ? setTime(s, s.playheadOffsetSeconds + 1) : s;
    case 'COLLECT': {
      const evidence = EVIDENCE_BY_ID[action.evidenceId];
      if (!evidence) return notice(s, '没有这项证据。');
      if (s.evidenceSeen.includes(evidence.id)) return notice(s, `“${evidence.title}”已记录。重复查询不会生成新的证据。`);
      if (evidence.anchorId === 'witness' && !s.witnessConsent) return notice(s, '缺少许宁的有限证言许可。只可核对事故时间点与应急效果。');
      if (!availableEvidence(s).some(e => e.id === evidence.id)) return notice(s, `还缺少“${evidence.title}”的观察：请查询${evidence.anchorId === 'witness' ? '已获许可的证言' : ANCHORS[evidence.anchorId].title}，播放或逐秒到关键动作以后。`);
      return { ...s, evidenceSeen: [...s.evidenceSeen, evidence.id], notice: `已记录“${evidence.title}”。请按来源能支持的内容归类，完成核验。` };
    }
    case 'CLASSIFY': {
      const evidence = EVIDENCE_BY_ID[action.evidenceId];
      if (!evidence || !s.evidenceSeen.includes(evidence.id)) return notice(s, '请先在已获许可的来源里观察并记录这项证据。');
      if (action.category !== evidence.category) return notice(s, `“${evidence.title}”尚未核验：${evidence.category === 'fact' ? '它直接记录了可观察的行为或材料改变。' : evidence.category === 'information' ? '它说明当时已递交、已获知的信息，不能读取思想。' : '它核对后果、时间点或应急效果，不能替代行为本身。'}`);
      return { ...s, evidenceCategories: { ...s.evidenceCategories, [evidence.id]: action.category }, evidenceVerified: uniq([...s.evidenceVerified, evidence.id]), notice: `“${evidence.title}”来源与类别已核验。` };
    }
    case 'CONSENT_WITNESS': {
      if (s.sceneId !== 'M04') return notice(s, '证言许可只在与许宁核对时确认。');
      if (!action.accepted && s.evidenceSeen.includes('witness_statement')) return notice(s, '已记录的证言有有限许可；不可用此按钮改写她已给予的范围。');
      return { ...s, witnessConsent: action.accepted, notice: action.accepted ? '许可已记录：仅事故时间点与应急效果。私人语音全文、家庭细节不进入材料。' : '暂不使用证言。继续前仍需确认有限许可并核对时间点；她没有授权全部私人生活。' };
    }
    case 'ADVANCE': {
      if (s.sceneId === 'M02') {
        if (!s.evidenceVerified.includes('gate_action')) return notice(s, '缺少：隔离闸的控制动作。请播放到 21:16:40，记录并归类。');
        return { ...s, sceneId: 'M03', playing: false, notice: '唐雯把原版报告也推到桌边。请继续核对事故之前和当晚减灾两条事实链。' };
      }
      if (s.sceneId === 'M03') {
        const missing = missingEvidence(s, false);
        if (missing.length) return notice(s, `缺少：${missing.map(e => e.title).join('、')}。请在对应节点观察、记录并归类。`);
        return { ...s, sceneId: 'M04', activeTimeAnchor: null, playheadOffsetSeconds: 0, playing: false, notice: '工作室接通许宁。先核对她允许提供的范围。' };
      }
      if (s.sceneId === 'M04') {
        if (!s.witnessConsent || !s.evidenceVerified.includes('witness_statement')) return notice(s, '缺少：许宁的有限证言许可与时间点证言核验。');
        return { ...s, sceneId: 'M05', playing: false, notice: '材料已齐。唐雯拿出一份她自己保留的回执。' };
      }
      if (s.sceneId === 'M05') return notice(s, '请先由唐雯主动披露回执，回应她，再确认家庭检索范围。');
      if (s.sceneId === 'M06') {
        if (!s.privateClipViewed) return notice(s, `还需定位 18:29:50 并看完十秒：${missingFamilyActions(s).join('、') || '请到 18:30:00 看完片段'}。可播放，也可逐秒操作。`);
        return { ...s, sceneId: 'M07', playing: false, notice: '案件资料包与私人片段分别等待确认，保存顺序可交换。' };
      }
      if (s.sceneId === 'M07') {
        const missing = [!s.caseSubmitted && '案件资料包提交', !s.privateClipSaved && '私人片段保存'].filter(Boolean);
        if (missing.length) return notice(s, `尚未完成：${missing.join('、')}。两项是独立操作。`);
        return { ...s, sceneId: 'M08', playing: false, notice: '唐雯在门口停下：“能再听一次吗？”两份文件都还在。' };
      }
      return s;
    }
    case 'REVEAL_SOURCE': {
      if (s.sceneId !== 'M05') return notice(s, '来源受保护，只有唐雯主动披露后才能写入核验附页。');
      if (s.sourceReceiptDisclosed) return notice(s, '唐雯主动给出的回执已核验；不会重复记录。');
      return { ...s, sourceReceiptDisclosed: true, notice: '唐雯：“最开始那份报告，是我交出去的。”回执 R-17 与原件编号一致；她授权仅写入来源核验附页。' };
    }
    case 'REPLY':
      return s.sceneId === 'M05' && s.sourceReceiptDisclosed && REPLIES[action.replyId]
        ? { ...s, replyId: action.replyId, notice: REPLIES[action.replyId].response }
        : notice(s, '先听唐雯主动说明来源，再回应她。');
    case 'AUTHORIZE_FAMILY': {
      if (s.sceneId !== 'M05' || !s.sourceReceiptDisclosed || !s.replyId) return notice(s, '还需由唐雯披露来源并回应她，才能确认独立的家庭检索授权。');
      return { ...s, sceneId: 'M06', birthdayRangeAuthorized: true, activeTimeAnchor: 'family', playheadOffsetSeconds: 0, playing: false, queryHistory: uniq([...s.queryHistory, 'family']), notice: '唐雯授权生日餐桌 18:29:50–18:30:10。它与案件范围分开；从正式录像起点再往前十秒。' };
    }
    case 'CONSENT_PRIVATE':
      if (s.sceneId !== 'M07') return notice(s, '私人文件的交付许可在导出桌单独确认。');
      return { ...s, privateExportConsent: s.privateClipSaved || action.accepted, notice: action.accepted ? '唐雯：“可以。只给我，文件名叫爸爸。”不会加入案件，也不要求她决定是否探视。' : '暂不保存私人片段。案件资料仍可独立提交，私人片段仍可重播。' };
    case 'SUBMIT_CASE': {
      if (s.caseSubmitted) return notice(s, '案件资料包已提交；此次操作没有重复提交。');
      if (s.sceneId !== 'M07') return notice(s, '请先完成调查并到导出桌核对案件材料。');
      const missing = missingEvidence(s);
      if (missing.length || !s.witnessConsent || !s.sourceReceiptDisclosed) return notice(s, `案件材料尚不完整：${[...missing.map(e => e.title), !s.witnessConsent && '证言有限许可', !s.sourceReceiptDisclosed && '唐雯主动授权的来源回执'].filter(Boolean).join('、')}。`);
      return { ...s, caseSubmitted: true, caseSubmissionCount: 1, notice: '案件资料完整性核验完成；已提交。前期责任与当晚减灾分别列明，私人十秒未进入任何附件。' };
    }
    case 'SAVE_PRIVATE': {
      if (s.privateClipSaved) return notice(s, '私人虚拟文件“爸爸”已保存；仍可重播，没有重复生成文件。');
      if (s.sceneId !== 'M07' || !s.birthdayRangeAuthorized || !s.privateClipViewed || s.privateSegmentStart !== -10 || s.privateSegmentEnd !== 0) return notice(s, '请先在授权范围内定位并看完 18:29:50–18:30:00 的十秒。');
      if (!s.privateExportConsent) return notice(s, '缺少：唐雯对私人十秒范围、文件名与只给她的交付许可。');
      return { ...s, privateClipSaved: true, privateSaveCount: 1, notice: '私人虚拟文件“爸爸”已保存。只包含授权十秒，案件材料没有混入；保存不强制原谅或探视。' };
    }
    case 'REPLAY_PRIVATE':
      if (!s.privateClipViewed || !s.birthdayRangeAuthorized || !['M06', 'M07', 'M08'].includes(s.sceneId)) return notice(s, '请先定位并看完授权十秒。');
      return { ...s, activeTimeAnchor: 'family', playheadOffsetSeconds: -10, playing: true, notice: '只重播私人十秒。两个保存标记不会改变。' };
    case 'SETTING':
      return typeof action.value === 'boolean' && Object.hasOwn(s.settings, action.key)
        ? { ...s, settings: { ...s.settings, [action.key]: action.value } }
        : s;
  }
}

export interface CaseFile {
  id: 'case-A-041'; kind: 'case'; name: 'A-041 案件资料包'; submitted: boolean;
  evidence: { id: EvidenceId; title: string; category: Category; source: string; time: string; description: string }[];
  sourceAppendix: { receiptId: 'R-17'; disclosure: string; scope: string } | null;
  witnessPermission: string | null;
  limits: string;
}

export interface PrivateFile {
  id: 'private-P-B01'; kind: 'private'; name: '爸爸'; saved: boolean;
  segment: { anchorId: 'family'; start: '18:29:50'; end: '18:30:00'; durationSeconds: 10; source: string } | null;
  recipient: '唐雯'; permission: string | null;
}

export function caseFile(s: GameState): CaseFile {
  return {
    id: 'case-A-041', kind: 'case', name: 'A-041 案件资料包', submitted: s.caseSubmitted,
    evidence: EVIDENCE.filter(e => s.evidenceVerified.includes(e.id) && (e.id !== 'witness_statement' || s.witnessConsent))
      .map(({ id, title, category, source, time, description }) => ({ id, title, category, source, time, description })),
    sourceAppendix: s.sourceReceiptDisclosed ? { receiptId: 'R-17', disclosure: '唐雯主动出示提交回执并授权来源核验', scope: '仅来源核验附页；不披露其他私人检索' } : null,
    witnessPermission: s.witnessConsent ? 'W-XN01：仅事故时间点与应急效果；不含私人语音全文或家庭生活细节' : null,
    limits: '材料提交不是司法裁决。前期失责和当晚减灾都保留；不以私人生日记忆免除责任。',
  };
}

export function privateFile(s: GameState): PrivateFile {
  return {
    id: 'private-P-B01', kind: 'private', name: '爸爸', saved: s.privateClipSaved, recipient: '唐雯',
    segment: s.privateSegmentStart === -10 && s.privateSegmentEnd === 0
      ? { anchorId: 'family', start: '18:29:50', end: '18:30:00', durationSeconds: 10, source: ANCHORS.family.source }
      : null,
    permission: s.privateExportConsent ? 'P-B01：只给唐雯，十秒单独保存；不作为案件附件，不要求原谅或探视' : null,
  };
}

export function serializeSave(s: GameState): string {
  return JSON.stringify({ ...s, playing: false });
}

export interface RestoreResult { state: GameState; recovered: boolean; reason: string | null }

function validSave(value: unknown): value is GameState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const allowedKeys = Object.keys(createInitialState());
  if (Object.keys(v).length !== allowedKeys.length || Object.keys(v).some(key => !allowedKeys.includes(key))) return false;
  const sceneIds: SceneId[] = ['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08'];
  const anchors = Object.keys(ANCHORS);
  const evidenceIds = CASE_EVIDENCE_IDS as string[];
  const arrayOf = (candidate: unknown, allowed: string[]): candidate is string[] => Array.isArray(candidate)
    && candidate.every(x => typeof x === 'string' && allowed.includes(x)) && new Set(candidate).size === candidate.length;
  if (v.schemaVersion !== 1 || !sceneIds.includes(v.sceneId as SceneId) || (v.activeTimeAnchor !== null && !anchors.includes(v.activeTimeAnchor as string))) return false;
  if (!arrayOf(v.queryHistory, anchors) || !arrayOf(v.evidenceSeen, evidenceIds) || !arrayOf(v.evidenceVerified, evidenceIds)
    || !arrayOf(v.familyActionsSeen, FAMILY_ACTIONS.map(action => action.id))) return false;
  const seen = v.evidenceSeen;
  const verified = v.evidenceVerified;
  const queries = v.queryHistory;
  if (typeof v.playheadOffsetSeconds !== 'number' || !Number.isInteger(v.playheadOffsetSeconds)) return false;
  if (v.activeTimeAnchor === null && v.playheadOffsetSeconds !== 0) return false;
  if (v.activeTimeAnchor !== null) {
    const anchor = ANCHORS[v.activeTimeAnchor as AnchorId];
    if (v.playheadOffsetSeconds < anchor.minOffset || v.playheadOffsetSeconds > anchor.maxOffset || !v.queryHistory.includes(anchor.id)) return false;
  }
  const booleans = ['playing', 'witnessConsent', 'sourceReceiptDisclosed', 'birthdayRangeAuthorized', 'privateClipViewed', 'privateExportConsent', 'caseSubmitted', 'privateClipSaved'];
  if (booleans.some(key => typeof v[key] !== 'boolean') || v.exportName !== '爸爸') return false;
  if (typeof v.notice !== 'string' || v.notice.length > 1000 || (v.replyId !== null && !Object.hasOwn(REPLIES, v.replyId as string))) return false;
  if (!v.settings || typeof v.settings !== 'object' || Array.isArray(v.settings)) return false;
  if (['subtitles', 'muted', 'typewriter', 'reducedMotion'].some(key => typeof (v.settings as Record<string, unknown>)[key] !== 'boolean')) return false;
  if (!v.evidenceCategories || typeof v.evidenceCategories !== 'object' || Array.isArray(v.evidenceCategories)) return false;
  const categories = v.evidenceCategories as Record<string, unknown>;
  if (Object.entries(categories).some(([id, category]) => !evidenceIds.includes(id) || EVIDENCE_BY_ID[id as EvidenceId].category !== category)) return false;
  if (verified.some(id => !seen.includes(id) || categories[id] !== EVIDENCE_BY_ID[id as EvidenceId].category)) return false;
  if (Object.keys(categories).some(id => !verified.includes(id))) return false;
  if ((v.evidenceSeen.includes('witness_statement') || v.evidenceVerified.includes('witness_statement')) && !v.witnessConsent) return false;
  if ((v.privateSegmentStart !== null || v.privateSegmentEnd !== null) && (v.privateSegmentStart !== -10 || v.privateSegmentEnd !== 0)) return false;
  if ((v.queryHistory.includes('family') || v.familyActionsSeen.length || v.privateSegmentStart === -10 || v.privateClipViewed || v.privateExportConsent) && !v.birthdayRangeAuthorized) return false;
  if (v.privateClipViewed && (v.familyActionsSeen.length !== FAMILY_ACTIONS.length || v.privateSegmentStart !== -10)) return false;
  if (v.privateSegmentStart === null && v.familyActionsSeen.length) return false;
  if (v.sourceReceiptDisclosed && sceneIds.indexOf(v.sceneId as SceneId) < 4) return false;
  if (v.replyId !== null && !v.sourceReceiptDisclosed) return false;
  if (v.birthdayRangeAuthorized && (!v.sourceReceiptDisclosed || v.replyId === null || sceneIds.indexOf(v.sceneId as SceneId) < 5)) return false;
  if (v.caseSubmitted && (v.evidenceVerified.length !== CASE_EVIDENCE_IDS.length || !v.witnessConsent || !v.sourceReceiptDisclosed || sceneIds.indexOf(v.sceneId as SceneId) < 6)) return false;
  if (v.privateClipSaved && (!v.privateExportConsent || !v.privateClipViewed || sceneIds.indexOf(v.sceneId as SceneId) < 6)) return false;
  if (v.caseSubmissionCount !== (v.caseSubmitted ? 1 : 0) || v.privateSaveCount !== (v.privateClipSaved ? 1 : 0)) return false;
  const index = sceneIds.indexOf(v.sceneId as SceneId);
  if (index >= 2 && !v.evidenceVerified.includes('gate_action')) return false;
  if (index >= 3 && CASE_EVIDENCE_IDS.filter(id => id !== 'witness_statement').some(id => !verified.includes(id))) return false;
  if (index >= 4 && (!v.witnessConsent || !v.evidenceVerified.includes('witness_statement'))) return false;
  if (index >= 6 && !v.privateClipViewed) return false;
  if (index === 7 && (!v.caseSubmitted || !v.privateClipSaved)) return false;
  if (index === 0 && (seen.length || verified.length || v.queryHistory.length || v.activeTimeAnchor !== null)) return false;
  if (index < 3 && v.witnessConsent) return false;
  if (index < 6 && v.privateExportConsent) return false;
  if (seen.some(id => id !== 'witness_statement' && !queries.includes(EVIDENCE_BY_ID[id as EvidenceId].anchorId))) return false;
  return true;
}

export function restoreSave(raw: string | null): RestoreResult {
  if (raw === null) return { state: createInitialState(), recovered: false, reason: null };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (validSave(parsed)) return { state: { ...parsed, playing: false, notice: '已恢复本故事的进度。其他故事存档不受影响。' }, recovered: false, reason: null };
  } catch { /* A malformed save follows the same explicit recovery path as an invalid version. */ }
  const reason = '本故事存档损坏或版本不兼容，已恢复到委托开始。其他故事存档未清除。';
  return { state: { ...createInitialState(), notice: reason }, recovered: true, reason };
}
