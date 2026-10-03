import {
  RAIN_CHOICES, WORD_CHOICES, CHAIR_CHOICES, CLOUD_CANDIDATES,
  ORIGINAL_LINE, PAPER_IDS, PAPER_TITLES, UI_TEXT,
} from './content.ts';
import type { SceneId, RainId, WordId, ChairId, CloudId, PageId } from './content.ts';

export type { SceneId } from './content.ts';
export type RainChoice = RainId;
export type RevisionChoice = WordId;
export type ChairChoice = ChairId;
export const SAVE_KEY = 'sci-fi-games:03-a-line-for-you:v1';
export const SAVE_VERSION = 1;
export type Settings = { sound: boolean; typewriter: boolean; reducedMotion: boolean };
export type RevisionRecord = {
  original: string; playerVersion: string; adopted: string; playerNote: string;
  zhouEditAccepted: boolean; zhouBefore: string; zhouAfter: string;
};
export type Contribution = {
  id: string; contributionId: string; choiceId: RainId | WordId | ChairId;
  text: string; sceneId: 'P02' | 'P04' | 'P05'; source: string[];
  revision?: RevisionRecord;
};
export type State = {
  version: 1; sceneId: SceneId; visitedMemories: ('P02' | 'P04' | 'P05')[];
  pageOrder: PageId[]; collectedPaperIds: PageId[]; paperSidesInspected: string[];
  rainChoice: RainId | null; revisionChoice: WordId | null; chairChoice: ChairId | null;
  memoryContributions: Contribution[];
  cloudCandidateViewed: CloudId[]; candidateDraft: CloudId | null;
  coauthorSeen: boolean; compilationUnderstood: boolean;
  basinMoved: boolean; rainLinked: boolean; chairTried: boolean; reminderSet: boolean;
  zhouEdit: boolean | null;
  finalChoiceId: string | null; finalLineMode: 'fixed' | 'deferred' | null;
  finalLineText: string; authorshipConfirmed: boolean; settings: Settings;
};
export type Action =
  | { type: 'collectPaper'; id: string }
  | { type: 'inspectPaper'; id: string; side?: 'front' | 'back' }
  | { type: 'viewCover' | 'startRain' | 'moveBasin' | 'finishRain' | 'linkRain' | 'startRevision' | 'commitRevision' | 'tryChair' | 'setReminder' | 'finishChair' | 'compile' | 'startFinal' | 'saveFinal' | 'confirmAuthors' }
  | { type: 'chooseRain'; id: RainId }
  | { type: 'cloudView' | 'cloudDraft'; id: string | null }
  | { type: 'chooseWord'; id: WordId }
  | { type: 'chooseZhouEdit'; accept: boolean }
  | { type: 'chooseChair'; id: ChairId }
  | { type: 'movePage'; id: string; direction: -1 | 1 }
  | { type: 'chooseFinal'; id: string }
  | { type: 'updateSettings'; settings: Partial<Settings> };
export type Page = { id: PageId; number: number; title: string; text: string[]; source: string[] };
export type FinalOption = { id: string; text: string; source: string[] };

export function newGame(settings: Partial<Settings> = {}): State {
  return {
    version: 1, sceneId: 'P01', visitedMemories: [],
    pageOrder: ['page-2', 'page-4', 'page-1', 'page-5', 'page-3', 'page-6'],
    collectedPaperIds: [], paperSidesInspected: [],
    rainChoice: null, revisionChoice: null, chairChoice: null, memoryContributions: [],
    cloudCandidateViewed: [], candidateDraft: null,
    coauthorSeen: false, compilationUnderstood: false,
    basinMoved: false, rainLinked: false, chairTried: false, reminderSet: false, zhouEdit: null,
    finalChoiceId: null, finalLineMode: null, finalLineText: '', authorshipConfirmed: false,
    settings: { sound: false, typewriter: false, reducedMotion: false, ...settings },
  };
}

function appendUnique<T>(items: T[], item: T): T[] {
  return items.includes(item) ? items : [...items, item];
}
function contribution(state: State, id: string): Contribution | undefined {
  return state.memoryContributions.find((item) => item.id === id);
}
function addContribution(state: State, item: Contribution): State {
  return contribution(state, item.id) ? state : { ...state, memoryContributions: [...state.memoryContributions, item] };
}
export function getRevision(state: Pick<State, 'revisionChoice' | 'zhouEdit'>): RevisionRecord | null {
  const choice = WORD_CHOICES.find((item) => item.id === state.revisionChoice);
  if (!choice) return null;
  const lineFor = (wind: string) => choice.id === 'word_pass' ? `${wind}经过屋子的灯` : `${wind}替屋子${choice.word}灯`;
  const playerVersion = lineFor('夜风');
  return {
    original: ORIGINAL_LINE, playerVersion,
    adopted: lineFor(state.zhouEdit ? '晚风' : '夜风'),
    playerNote: choice.explanation, zhouEditAccepted: state.zhouEdit === true,
    zhouBefore: '夜风', zhouAfter: state.zhouEdit ? '晚风' : '夜风',
  };
}

/** All story mutations pass this explicit state machine. Invalid or repeated actions are no-ops. */
export function reduce(state: State, action: Action): State {
  const at = (scene: SceneId) => state.sceneId === scene;
  switch (action.type) {
    case 'updateSettings': {
      const settings = { ...state.settings };
      for (const key of ['sound', 'typewriter', 'reducedMotion'] as const) {
        if (typeof action.settings[key] === 'boolean') settings[key] = action.settings[key];
      }
      return { ...state, settings };
    }
    case 'collectPaper':
      if (!at('P01') || !PAPER_IDS.includes(action.id as PageId) || state.collectedPaperIds.includes(action.id as PageId)) return state;
      return { ...state, collectedPaperIds: [...state.collectedPaperIds, action.id as PageId], paperSidesInspected: appendUnique(state.paperSidesInspected, `${action.id}:front`) };
    case 'inspectPaper':
      if (!PAPER_IDS.includes(action.id as PageId) || !state.collectedPaperIds.includes(action.id as PageId)) return state;
      return { ...state, paperSidesInspected: appendUnique(state.paperSidesInspected, `${action.id}:${action.side ?? 'front'}`) };
    case 'viewCover':
      if (state.coauthorSeen) return state;
      return { ...state, coauthorSeen: true, paperSidesInspected: appendUnique(state.paperSidesInspected, 'cover:back') };
    case 'startRain':
      if (!at('P01') || state.collectedPaperIds.length !== 6) return state;
      return { ...state, sceneId: 'P02', visitedMemories: appendUnique(state.visitedMemories, 'P02') };
    case 'moveBasin':
      return at('P02') && !state.basinMoved ? { ...state, basinMoved: true } : state;
    case 'chooseRain': {
      const choice = RAIN_CHOICES.find((item) => item.id === action.id);
      if (!at('P02') || !state.basinMoved || state.rainChoice || !choice) return state;
      return addContribution({ ...state, rainChoice: choice.id }, {
        id: 'contribution-rain', contributionId: 'contribution-rain', choiceId: choice.id,
        text: choice.text, sceneId: 'P02',
        source: ['P02｜十二年前，下雨的下午', '小序的原句；周淮当场完整记下', `本轮回答：${choice.text}`],
      });
    }
    case 'finishRain':
      return at('P02') && state.rainChoice ? { ...state, sceneId: 'P03' } : state;
    case 'linkRain':
      return at('P03') && state.rainChoice && !state.rainLinked ? { ...state, rainLinked: true } : state;
    case 'cloudView':
    case 'cloudDraft': {
      if (!at('P03')) return state;
      if (action.type === 'cloudDraft' && action.id === null) return { ...state, candidateDraft: null };
      const candidate = CLOUD_CANDIDATES.find((item) => item.id === action.id);
      if (!candidate) return state;
      return { ...state, cloudCandidateViewed: appendUnique(state.cloudCandidateViewed, candidate.id), ...(action.type === 'cloudDraft' ? { candidateDraft: candidate.id } : {}) };
    }
    case 'startRevision':
      return at('P03') && state.rainLinked ? { ...state, sceneId: 'P04', visitedMemories: appendUnique(state.visitedMemories, 'P04') } : state;
    case 'chooseWord':
      return at('P04') && WORD_CHOICES.some((item) => item.id === action.id) ? { ...state, revisionChoice: action.id } : state;
    case 'chooseZhouEdit':
      return at('P04') && typeof action.accept === 'boolean' ? { ...state, zhouEdit: action.accept } : state;
    case 'commitRevision': {
      const revision = getRevision(state);
      if (!at('P04') || !revision || state.zhouEdit === null || !state.revisionChoice) return state;
      const result = addContribution(state, {
        id: 'contribution-revision', contributionId: 'contribution-revision', choiceId: state.revisionChoice,
        text: revision.adopted, sceneId: 'P04', revision,
        source: ['P04｜七年前，傍晚', `周淮原稿：${revision.original}`, `小序提出：${revision.playerVersion}`, `小序说明：${revision.playerNote}`, state.zhouEdit ? '周淮提出“夜风→晚风”；小序采用' : '周淮提出“夜风→晚风”；小序保留“夜风”', '双方比较后，小序标记本次共同采用'],
      });
      return { ...result, sceneId: 'P05', visitedMemories: appendUnique(state.visitedMemories, 'P05') };
    }
    case 'tryChair':
      return at('P05') && !state.chairTried ? { ...state, chairTried: true } : state;
    case 'chooseChair':
      return at('P05') && state.chairTried && CHAIR_CHOICES.some((item) => item.id === action.id) ? { ...state, chairChoice: action.id } : state;
    case 'setReminder':
      return at('P05') && state.chairChoice && !state.reminderSet ? { ...state, reminderSet: true } : state;
    case 'finishChair': {
      const choice = CHAIR_CHOICES.find((item) => item.id === state.chairChoice);
      if (!at('P05') || !state.chairTried || !state.reminderSet || !choice) return state;
      const result = addContribution(state, {
        id: 'contribution-chair', contributionId: 'contribution-chair', choiceId: choice.id,
        text: choice.note, sceneId: 'P05',
        source: ['P05｜一年前，晴天下午', '小序先把椅子移到书桌边，再与周淮决定窗边姿态', `本轮摆放：${choice.text}`, '普通提醒：晚饭以后给朋友回信'],
      });
      return { ...result, sceneId: 'P06' };
    }
    case 'movePage': {
      if (!at('P06') || state.compilationUnderstood || ![-1, 1].includes(action.direction)) return state;
      const index = state.pageOrder.indexOf(action.id as PageId);
      const target = index + action.direction;
      if (index < 0 || target < 0 || target >= 6) return state;
      const pageOrder = [...state.pageOrder];
      [pageOrder[index], pageOrder[target]] = [pageOrder[target], pageOrder[index]];
      return { ...state, pageOrder };
    }
    case 'compile':
      return at('P06') && !state.compilationUnderstood && state.memoryContributions.length === 3 && PAPER_IDS.every((id, i) => state.pageOrder[i] === id) ? { ...state, compilationUnderstood: true } : state;
    case 'startFinal':
      return at('P06') && state.compilationUnderstood && state.coauthorSeen ? { ...state, sceneId: 'P07' } : state;
    case 'chooseFinal': {
      if (!at('P07')) return state;
      if (action.id === 'deferred') return { ...state, finalChoiceId: 'deferred', finalLineMode: 'deferred', finalLineText: '' };
      const option = getFinalOptions(state).find((item) => item.id === action.id);
      return option ? { ...state, finalChoiceId: option.id, finalLineMode: 'fixed', finalLineText: option.text } : state;
    }
    case 'saveFinal':
      return at('P07') && state.finalLineMode ? { ...state, sceneId: 'P08' } : state;
    case 'confirmAuthors':
      return at('P08') && state.coauthorSeen && state.finalLineMode && !state.authorshipConfirmed ? { ...state, authorshipConfirmed: true } : state;
    default:
      return state;
  }
}

export function getFinalOptions(state: State): FinalOption[] {
  const chair = CHAIR_CHOICES.find((item) => item.id === state.chairChoice);
  const rain = contribution(state, 'contribution-rain');
  const revision = contribution(state, 'contribution-revision');
  const result: FinalOption[] = [];
  if (chair && contribution(state, 'contribution-chair')) result.push({ id: 'final-chair', text: chair.final, source: ['P05 椅子实际姿态', chair.note] });
  if (rain) result.push({ id: 'final-rain', text: `今天又想起那句：“${rain.text}”`, source: [...rain.source] });
  if (revision) result.push({ id: 'final-word', text: `我们最后留下的是：“${revision.text}”。今天我还这样读。`, source: [...revision.source] });
  return result;
}

/** Manuscript, revision history and epilogue all consume these exact immutable contributions. */
export function getManuscript(state: State): Page[] {
  const rain = contribution(state, 'contribution-rain');
  const revision = contribution(state, 'contribution-revision');
  const chair = contribution(state, 'contribution-chair');
  const records: { text: string[]; source: string[] }[] = [
    { text: ['给你留一行', '纸上的编号是编排顺序。不同日期的原句、修订和房间短注，保留各自出处。', '页 02：雨声。页 03：修订。页 04：椅子。'], source: ['页 01｜周淮手写编排说明'] },
    { text: rain ? ['十二年前 · 下雨的下午', rain.text, '不覆盖原句。'] : ['十二年前 · 下雨的下午', '［原句待关联：点击日期，经历这个下午］'], source: rain ? [...rain.source] : ['页 02｜有日期的原稿，尚未关联本轮经历'] },
    { text: revision?.revision ? ['七年前 · 傍晚', `原稿：${revision.revision.original}`, `小序版本：${revision.revision.playerVersion}`, `本次共同采用：${revision.text}`, `旁批／说明：${revision.revision.playerNote}`, revision.revision.zhouEditAccepted ? '周淮小修改：夜风 → 晚风（采用）' : '周淮小修改：夜风 → 晚风（保留原方案）'] : ['七年前 · 傍晚', `原稿：${ORIGINAL_LINE}`, '［修订待关联］'], source: revision ? [...revision.source] : ['页 03｜周淮原稿；尚未产生本轮修订'] },
    { text: chair ? ['一年前 · 晴天下午', chair.text, '晚饭以后给朋友回信。'] : ['一年前 · 晴天下午', '［椅子姿态待关联］'], source: chair ? [...chair.source] : ['页 04｜有日期的房间短注，尚未关联本轮动作'] },
    { text: state.coauthorSeen ? ['实体作者栏：周淮　小序', '整理记录：小序', state.authorshipConfirmed ? '作者栏：已由小序亲手确认' : '作者栏：等待小序亲手确认'] : ['封底与书封粘连。可以分开查看。', '出版工作表：作者 周淮（待核）／整理 小序'], source: state.coauthorSeen ? ['页 05｜原有实体双署名；玩家查看封底'] : ['页 05｜封底粘连已可观察，署名尚未查看'] },
    { text: ['这一行留给小序。', '不急。', ...(state.finalLineMode === 'fixed' ? [state.finalLineText] : state.finalLineMode === 'deferred' ? ['［保留一行空白］', '待小序续写'] : ['［一行空白，尚未决定］'])], source: ['页 06｜周淮手写的留行说明', ...(state.finalLineMode ? ['P07｜小序今天的决定', ...(state.finalLineMode === 'fixed' ? (getFinalOptions(state).find((option) => option.id === state.finalChoiceId)?.source ?? []) : ['小序选择暂留空白，没有质量评分'])] : [])] },
  ];
  return PAPER_IDS.map((id, index) => ({ id, number: index + 1, title: PAPER_TITLES[index], ...records[index] }));
}
export function getEpilogueReferences(state: State): Contribution[] {
  return state.memoryContributions.map((item) => ({ ...item, source: [...item.source], ...(item.revision ? { revision: { ...item.revision } } : {}) }));
}

export function serialize(state: State): string {
  return JSON.stringify({ version: SAVE_VERSION, state });
}
type LoadResult = { status: 'empty' | 'valid' | 'recovered'; state: State; message?: string };
const scenes: SceneId[] = ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08'];
function uniqueArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') && new Set(value).size === value.length;
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

/** Rebuild through legal actions, then compare every saved field; forged histories cannot resume. */
function validateState(raw: unknown): State | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const state = raw as State;
  if (state.version !== 1 || !scenes.includes(state.sceneId)) return null;
  if (!state.settings || ['sound', 'typewriter', 'reducedMotion'].some((key) => typeof state.settings[key as keyof Settings] !== 'boolean')) return null;
  if (!uniqueArray(state.collectedPaperIds) || state.collectedPaperIds.some((id) => !PAPER_IDS.includes(id as PageId))) return null;
  if (!uniqueArray(state.pageOrder) || state.pageOrder.length !== 6 || state.pageOrder.some((id) => !PAPER_IDS.includes(id as PageId))) return null;
  if (!uniqueArray(state.paperSidesInspected) || state.paperSidesInspected.some((id) => id !== 'cover:back' && !/^page-[1-6]:(front|back)$/.test(id))) return null;
  if (!uniqueArray(state.visitedMemories) || !uniqueArray(state.cloudCandidateViewed) || !Array.isArray(state.memoryContributions)) return null;
  const booleanKeys = ['coauthorSeen', 'compilationUnderstood', 'basinMoved', 'rainLinked', 'chairTried', 'reminderSet', 'authorshipConfirmed'] as const;
  if (booleanKeys.some((key) => typeof state[key] !== 'boolean')) return null;
  if (state.zhouEdit !== null && typeof state.zhouEdit !== 'boolean') return null;
  let built = newGame(state.settings);
  for (const id of state.collectedPaperIds) built = reduce(built, { type: 'collectPaper', id });
  // Restore inspected-side order exactly, while requiring collected fronts to be represented.
  if (state.collectedPaperIds.some((id) => !state.paperSidesInspected.includes(`${id}:front`))) return null;
  built = { ...built, paperSidesInspected: [] };
  for (const side of state.paperSidesInspected) {
    if (side === 'cover:back') built = reduce(built, { type: 'viewCover' });
    else {
      const [id, face] = side.split(':');
      built = reduce(built, { type: 'inspectPaper', id, side: face as 'front' | 'back' });
    }
  }
  const rank = scenes.indexOf(state.sceneId);
  if (rank >= 1) built = reduce(built, { type: 'startRain' });
  if (state.basinMoved) built = reduce(built, { type: 'moveBasin' });
  if (state.rainChoice) built = reduce(built, { type: 'chooseRain', id: state.rainChoice });
  if (rank >= 2) built = reduce(built, { type: 'finishRain' });
  if (state.rainLinked) built = reduce(built, { type: 'linkRain' });
  for (const id of state.cloudCandidateViewed) built = reduce(built, { type: 'cloudView', id });
  if (state.candidateDraft !== null) built = reduce(built, { type: 'cloudDraft', id: state.candidateDraft });
  if (rank >= 3) built = reduce(built, { type: 'startRevision' });
  if (state.revisionChoice) built = reduce(built, { type: 'chooseWord', id: state.revisionChoice });
  if (state.zhouEdit !== null) built = reduce(built, { type: 'chooseZhouEdit', accept: state.zhouEdit });
  if (rank >= 4) built = reduce(built, { type: 'commitRevision' });
  if (state.chairTried) built = reduce(built, { type: 'tryChair' });
  if (state.chairChoice) built = reduce(built, { type: 'chooseChair', id: state.chairChoice });
  if (state.reminderSet) built = reduce(built, { type: 'setReminder' });
  if (rank >= 5) built = reduce(built, { type: 'finishChair' });
  if (rank >= 5) {
    if (built.sceneId !== 'P06') return null;
    let moves = 0;
    for (let target = 0; target < 6; target++) {
      while (built.pageOrder.indexOf(state.pageOrder[target]) > target) {
        if (++moves > 36) return null;
        const next = reduce(built, { type: 'movePage', id: state.pageOrder[target], direction: -1 });
        if (next === built) return null;
        built = next;
      }
    }
  }
  if (state.compilationUnderstood) built = reduce(built, { type: 'compile' });
  if (rank >= 6) built = reduce(built, { type: 'startFinal' });
  if (state.finalChoiceId !== null) built = reduce(built, { type: 'chooseFinal', id: state.finalChoiceId });
  if (rank >= 7) built = reduce(built, { type: 'saveFinal' });
  if (state.authorshipConfirmed) built = reduce(built, { type: 'confirmAuthors' });
  return stable(built) === stable(state) ? built : null;
}
export function loadSave(raw: string | null | undefined): LoadResult {
  if (!raw) return { status: 'empty', state: newGame() };
  try {
    if (raw.length > 100_000) throw new Error('oversized');
    const envelope = JSON.parse(raw) as { version?: number; state?: unknown };
    if (envelope.version !== SAVE_VERSION) throw new Error('version');
    const state = validateState(envelope.state);
    if (state) return { status: 'valid', state };
  } catch { /* Recovery is explicit and touches only this namespace when the UI saves. */ }
  return { status: 'recovered', state: newGame(), message: UI_TEXT.recovered };
}
