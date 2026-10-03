import { beats, type SceneId } from './content';

export const SAVE_KEY = 'sci-fi-games:01-tomorrow-again:v1';
export type Meal = 'porridge' | 'flatbread';
export type Hair = 'tidy' | 'leave';
export type Framing = 'left' | 'center' | 'right';
export interface VisualVariant {
  mealChoice: Meal | null;
  routeOrder: 'observationFirst' | 'lookoutFirst' | null;
  framing: Framing;
  hairChoice: Hair | null;
  stationAction: 'repair' | 'report' | null;
}
export interface CapturedFrame {
  frameId: string;
  kind: string;
  sourceScene: SceneId;
  sourceNodeId: string;
  actionId: string;
  variant: VisualVariant;
  createdOrder: number;
  title: string;
  description: string;
  quote: string;
}
export interface GameState {
  version: 1;
  runId: string;
  started: boolean;
  nodeId: string;
  visitedScenes: SceneId[];
  choices: Record<string, string>;
  mealChoice: Meal | null;
  routeOrder: VisualVariant['routeOrder'];
  hairChoice: Hair | null;
  framing: Framing;
  stationAction: VisualVariant['stationAction'];
  consent: boolean;
  calibrated: boolean;
  breakfastCentered: boolean;
  helpedStool: boolean;
  observationPoints: number[];
  mirrorBagDown: boolean;
  mirrorWiped: boolean;
  portraitConsent: boolean;
  portraitSaved: boolean;
  saveAcknowledged: boolean;
  channelClosed: boolean;
  finished: boolean;
  nextRoute: 'river' | 'station' | 'blank' | null;
  endingFrameId: string | null;
  capturedFrames: CapturedFrame[];
  mySelections: string[];
  wenxiaMarks: string[];
  albumOrder: string[];
  albumFilter: 'mine' | 'wenxia' | 'all';
  inspectedFrames: string[];
  albumReordered: boolean;
  events: { type: 'capture' | 'acknowledged' | 'channelClosed'; frameId?: string }[];
  settings: { typewriter: boolean; reducedMotion: boolean; muted: boolean };
  lastNotice: string;
}
export type Action =
  | { type: 'start' }
  | { type: 'choose'; nodeId: string; choiceId: string }
  | { type: 'filter'; filter: GameState['albumFilter'] }
  | { type: 'inspect'; frameId: string }
  | { type: 'reorder'; frameId: string; direction: -1 | 1 }
  | { type: 'view'; framing: Framing }
  | { type: 'photograph' }
  | { type: 'setting'; key: keyof GameState['settings']; value: boolean };

export function createInitialState(runId = 'journey'): GameState {
  return {
    version: 1, runId, started: false, nodeId: 'T01.00', visitedScenes: [], choices: {},
    mealChoice: null, routeOrder: null, hairChoice: null, framing: 'center', stationAction: null,
    consent: false, calibrated: false, breakfastCentered: false, helpedStool: false,
    observationPoints: [], mirrorBagDown: false, mirrorWiped: false, portraitConsent: false,
    portraitSaved: false, saveAcknowledged: false, channelClosed: false, finished: false,
    nextRoute: null, endingFrameId: null, capturedFrames: [], mySelections: [], wenxiaMarks: [], albumOrder: [],
    albumFilter: 'mine', inspectedFrames: [], albumReordered: false, events: [],
    settings: { typewriter: false, reducedMotion: false, muted: true }, lastNotice: '',
  };
}

const frameText: Record<string, [string, string, string]> = {
  breakfast_hands: ['桌面中央', '握着餐具的手，餐具已经移到桌面中央。', '碗别放桌子边上。'],
  hill_shadow: ['下坡之前', '山坡草地上，顾远的长影停在旧观测点旁。', '先别走。'],
  lake_reflection: ['栏杆上的暮色', '金属板上的模糊衣袖与肩，湖面仍在远处。', '先别动。'],
  lake_clear: ['湖的颜色', '避开栏杆的清晰湖景。', '等一下，我把栏杆避开。'],
  rock_line: ['断开的纹理', '刻度尺靠着岩石，三个实际观测点连成一条线。', '好，就是那里。'],
  window_sleeve: ['车窗与袖口', '长廊车窗映出很浅的肩影，备用外套的袖口在近处。', '袖口不一样。'],
  station_view: ['旧站长廊', '已经处理或登记的检修灯，柱列与候车椅。', '这盏检修灯又闪了。'],
  upright_stool: ['扶正的凳子', '早餐摊倒下的凳子被顾远亲手扶正。', '风把旁边的空凳子吹倒了。'],
  portrait: ['镜前', '顾远在擦净的镜面里，完整的脸第一次留在共同的行程中。', '原来你长这样。'],
  epilogue_mirror: ['今天，留给自己', '窗口关闭后，顾远再次把自己放进镜面构图。', '本机保存；没有发送新的消息。'],
  epilogue_sky: ['站外的天色', '窗口关闭后，顾远为自己拍下旧站外的普通天色。', '本机保存；没有发送新的消息。'],
};

function expectedFrameId(runId: string, kind: string, framing: Framing): string {
  return `${runId}:${kind}${['lake_clear', 'epilogue_sky'].includes(kind) ? `:${framing}` : ''}`;
}

function capture(s: GameState, kind: string, actionId: string, shared: boolean, mine: boolean) {
  const frameId = expectedFrameId(s.runId, kind, s.framing);
  if (kind.startsWith('epilogue_')) s.endingFrameId = frameId;
  if (s.capturedFrames.some(f => f.frameId === frameId)) return;
  let [title, description, quote] = frameText[kind];
  if (kind === 'breakfast_hands' && s.mealChoice === 'flatbread') {
    quote = '餐盘别放桌子边上。';
    description = '握着筷子的手，面饼的餐盘已经移到桌面中央。';
  } else if (kind === 'breakfast_hands') description = '握着勺子的手，热粥的碗已经移到桌面中央。';
  const frame: CapturedFrame = {
    frameId, kind, sourceScene: beats[s.nodeId].scene, sourceNodeId: s.nodeId, actionId,
    variant: { mealChoice: s.mealChoice, routeOrder: s.routeOrder, framing: s.framing,
      hairChoice: s.hairChoice, stationAction: s.stationAction },
    createdOrder: s.capturedFrames.length, title, description, quote,
  };
  s.capturedFrames.push(frame);
  s.albumOrder.push(frameId);
  if (mine) s.mySelections.push(frameId);
  if (shared && s.consent && !s.channelClosed) s.wenxiaMarks.push(frameId);
  s.events.push({ type: 'capture', frameId });
  s.lastNotice = shared ? `闻夏标记了画面 · 已保存「${title}」` : `本机已保存「${title}」`;
}

export function albumReady(s: GameState): boolean {
  const keys = ['breakfast_hands', 'hill_shadow', 'lake_reflection'];
  return s.albumFilter === 'wenxia' && s.albumReordered && keys.every(kind => {
    const f = s.capturedFrames.find(frame => frame.kind === kind);
    return !!f && s.wenxiaMarks.includes(f.frameId) && s.inspectedFrames.includes(f.frameId);
  });
}

function applyEffect(s: GameState, effect: string, actionId: string): boolean {
  const [name, value] = effect.split(':');
  switch (name) {
    case 'calibrate': s.calibrated = true; break;
    case 'consent': if (!s.calibrated) return false; s.consent = true; break;
    case 'meal': s.mealChoice = value as Meal; break;
    case 'breakfast_center':
      if (!s.consent || !s.mealChoice) return false;
      s.breakfastCentered = true; capture(s, 'breakfast_hands', actionId, true, false); break;
    case 'stool': s.helpedStool = true; capture(s, 'upright_stool', actionId, true, false); break;
    case 'route': s.routeOrder = value as GameState['routeOrder']; break;
    case 'observe': {
      const point = Number(value);
      if (point !== s.observationPoints.length + 1) {
        s.lastNotice = '不是最亮那条。看旁边断开的纹理，再对准刻度尺上的下一个点。';
        return false;
      }
      s.observationPoints.push(point);
      if (point === 3) capture(s, 'rock_line', actionId, false, true);
      break;
    }
    case 'hill_shadow':
      if (s.observationPoints.length !== 3) return false;
      capture(s, 'hill_shadow', actionId, true, false); break;
    case 'lake_view': s.framing = value as Framing; break;
    case 'lake_reflection': capture(s, 'lake_reflection', actionId, true, false); break;
    case 'lake_clear': capture(s, 'lake_clear', actionId, false, true); break;
    case 'station':
      s.stationAction = value as GameState['stationAction']; capture(s, 'station_view', actionId, false, true); break;
    case 'window_sleeve': capture(s, 'window_sleeve', actionId, true, false); break;
    case 'album_ready':
      if (!albumReady(s)) {
        s.lastNotice = '打开行程相册，切到「闻夏标记」，放大桌面、山影、栏杆三张旧图，再用「往前移」重排一张。';
        return false;
      }
      break;
    case 'mirror_bag': s.mirrorBagDown = true; break;
    case 'mirror_wipe': if (!s.mirrorBagDown) return false; s.mirrorWiped = true; break;
    case 'hair': if (!s.mirrorWiped) return false; s.hairChoice = value as Hair; break;
    case 'portrait_consent': if (!s.hairChoice) return false; s.portraitConsent = true; break;
    case 'portrait_save':
      if (!s.portraitConsent || s.channelClosed) return false;
      capture(s, 'portrait', actionId, true, true); s.portraitSaved = true; s.saveAcknowledged = true;
      if (!s.events.some(e => e.type === 'acknowledged')) s.events.push({ type: 'acknowledged', frameId: `${s.runId}:portrait` });
      break;
    case 'channel_close':
      if (!s.saveAcknowledged) return false;
      s.channelClosed = true; s.events.push({ type: 'channelClosed' }); s.lastNotice = '窗口关闭 · 已收到的保存确认保留在相册。'; break;
    case 'epilogue':
      if (!s.channelClosed) return false;
      capture(s, `epilogue_${value}`, actionId, false, true); break;
    case 'next_route': s.nextRoute = value as GameState['nextRoute']; break;
    case 'finish':
      if (!s.capturedFrames.some(f => f.kind.startsWith('epilogue_'))) return false;
      s.finished = true; break;
    case 'tomorrow': break;
    default: throw new Error(`Unknown story effect: ${effect}`);
  }
  return true;
}

export function reducer(state: GameState, action: Action): GameState {
  const s: GameState = structuredClone(state);
  if (action.type === 'start') {
    if (state.started) return state;
    s.started = true; s.visitedScenes = ['T01']; return s;
  }
  if (action.type === 'setting') { s.settings[action.key] = action.value; return s; }
  if (!s.started) return state;
  if (action.type === 'filter') { s.albumFilter = action.filter; return s; }
  if (action.type === 'inspect') {
    if (!s.capturedFrames.some(f => f.frameId === action.frameId)) return state;
    if (!s.inspectedFrames.includes(action.frameId)) s.inspectedFrames.push(action.frameId);
    return s;
  }
  if (action.type === 'reorder') {
    const from = s.albumOrder.indexOf(action.frameId);
    const visible = s.albumOrder.filter(id => s.albumFilter === 'all' || (s.albumFilter === 'mine' ? s.mySelections : s.wenxiaMarks).includes(id));
    const visibleIndex = visible.indexOf(action.frameId);
    if (visibleIndex < 0) return state;
    const targetId = visible[visibleIndex + action.direction];
    if (from < 0 || !targetId) return state;
    const to = s.albumOrder.indexOf(targetId);
    [s.albumOrder[from], s.albumOrder[to]] = [s.albumOrder[to], s.albumOrder[from]];
    s.albumReordered = true; return s;
  }
  if (action.type === 'view') {
    if (!['T04', 'T08'].includes(beats[s.nodeId].scene)) return state;
    s.framing = action.framing; return s;
  }
  if (action.type === 'photograph') {
    const scene = beats[s.nodeId].scene;
    if (scene === 'T04' && s.nodeId !== 'T04.10') capture(s, 'lake_clear', 'camera.lake.save', false, true);
    else if (scene === 'T08' && s.channelClosed) capture(s, s.framing === 'left' ? 'epilogue_mirror' : 'epilogue_sky', 'camera.epilogue.save', false, true);
    else return state;
    return s;
  }
  if (action.type !== 'choose' || s.finished || action.nodeId !== s.nodeId) return state;
  const beat = beats[s.nodeId];
  const choice = beat.choices.find(c => c.id === action.choiceId);
  if (!choice || !beats[choice.next]) return state;
  s.lastNotice = '';
  if (choice.effect && !applyEffect(s, choice.effect, choice.id)) return s;
  s.choices[choice.id] = choice.effect || 'continued';
  s.nodeId = choice.next;
  const scene = beats[s.nodeId].scene;
  if (!s.visitedScenes.includes(scene)) s.visitedScenes.push(scene);
  if (scene === 'T06' && beat.scene !== 'T06') s.albumFilter = 'mine';
  return s;
}

/** Strictly validate the local document. Never merge another game's data. */
export function decodeSave(raw: string): GameState {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('存档不是有效对象');
  const s = value as GameState;
  const initial = createInitialState();
  for (const key of Object.keys(initial) as (keyof GameState)[]) {
    if (!(key in s) || (initial[key] !== null && typeof s[key] !== typeof initial[key])) throw new Error(`存档字段缺失：${key}`);
  }
  if (s.version !== 1 || !Object.hasOwn(beats, s.nodeId) || !/^[\w-]{1,80}$/.test(s.runId)) throw new Error('存档版本或位置不正确');
  for (const key of ['visitedScenes', 'capturedFrames', 'mySelections', 'wenxiaMarks', 'albumOrder', 'inspectedFrames', 'observationPoints', 'events'] as const) {
    if (!Array.isArray(s[key])) throw new Error(`存档列表损坏：${key}`);
  }
  if (s.mealChoice !== null && !['porridge', 'flatbread'].includes(s.mealChoice)) throw new Error('早餐记录损坏');
  if (s.hairChoice !== null && !['tidy', 'leave'].includes(s.hairChoice)) throw new Error('镜前记录损坏');
  if (s.routeOrder !== null && !['observationFirst', 'lookoutFirst'].includes(s.routeOrder)) throw new Error('路线损坏');
  if (s.stationAction !== null && !['repair', 'report'].includes(s.stationAction)) throw new Error('检修记录损坏');
  if (s.nextRoute !== null && !['river', 'station', 'blank'].includes(s.nextRoute)) throw new Error('明日路线损坏');
  if (!['left', 'center', 'right'].includes(s.framing) || !['mine', 'wenxia', 'all'].includes(s.albumFilter)) throw new Error('构图或筛选损坏');
  if (!s.settings || ['typewriter', 'reducedMotion', 'muted'].some(k => typeof s.settings[k as keyof GameState['settings']] !== 'boolean')) throw new Error('设置损坏');
  if (!s.choices || typeof s.choices !== 'object' || Array.isArray(s.choices)) throw new Error('动作历史损坏');
  const ids = new Set<string>();
  for (let index = 0; index < s.capturedFrames.length; index++) {
    const f = s.capturedFrames[index];
    if (!f || !Object.hasOwn(frameText, f.kind) || !f.variant || f.frameId !== expectedFrameId(s.runId, f.kind, f.variant.framing) || ids.has(f.frameId) || f.createdOrder !== index || !Object.hasOwn(beats, f.sourceNodeId) || beats[f.sourceNodeId].scene !== f.sourceScene || typeof f.actionId !== 'string' || !['left', 'center', 'right'].includes(f.variant.framing) || typeof f.title !== 'string' || typeof f.description !== 'string' || typeof f.quote !== 'string') throw new Error('照片来源损坏');
    if (!['porridge', 'flatbread'].includes(f.variant.mealChoice || '') || (f.variant.routeOrder !== null && !['observationFirst', 'lookoutFirst'].includes(f.variant.routeOrder)) || (f.variant.hairChoice !== null && !['tidy', 'leave'].includes(f.variant.hairChoice)) || (f.variant.stationAction !== null && !['repair', 'report'].includes(f.variant.stationAction))) throw new Error('照片视觉变体损坏');
    if (!s.choices[f.actionId] && !['camera.lake.save', 'camera.epilogue.save'].includes(f.actionId)) throw new Error('照片动作缺失');
    const sourceChoice = beats[f.sourceNodeId].choices.find(c => c.id === f.actionId);
    const expectedEffect: Record<string, string> = {
      breakfast_hands: 'breakfast_center', hill_shadow: 'hill_shadow', lake_reflection: 'lake_reflection',
      lake_clear: 'lake_clear', rock_line: 'observe:3', window_sleeve: 'window_sleeve',
      station_view: `station:${f.variant.stationAction}`, upright_stool: 'stool', portrait: 'portrait_save',
      epilogue_mirror: 'epilogue:mirror', epilogue_sky: 'epilogue:sky',
    };
    const cameraValid = f.actionId === 'camera.lake.save' && f.sourceScene === 'T04' && f.kind === 'lake_clear'
      || f.actionId === 'camera.epilogue.save' && f.sourceScene === 'T08' && f.kind.startsWith('epilogue_');
    if (!cameraValid && sourceChoice?.effect !== expectedEffect[f.kind]) throw new Error('照片动作与场景不一致');
    ids.add(f.frameId);
  }
  for (const refs of [s.mySelections, s.wenxiaMarks, s.albumOrder, s.inspectedFrames]) {
    if (new Set(refs).size !== refs.length || refs.some(id => !ids.has(id))) throw new Error('相册引用损坏');
  }
  if (s.endingFrameId !== null && (typeof s.endingFrameId !== 'string' || !s.capturedFrames.some(f => f.frameId === s.endingFrameId && f.kind.startsWith('epilogue_')))) throw new Error('尾声照片引用损坏');
  if (s.albumOrder.length !== ids.size || new Set(s.visitedScenes).size !== s.visitedScenes.length || s.visitedScenes.some(id => !/^T0[1-8]$/.test(id)) || s.observationPoints.length > 3 || s.observationPoints.some((p, i) => p !== i + 1)) throw new Error('行程顺序损坏');
  const knownChoices = new Map(Object.values(beats).flatMap(beat => beat.choices.map(choice => [choice.id, choice.effect || 'continued'] as const)));
  if (Object.entries(s.choices).some(([id, effect]) => knownChoices.get(id) !== effect)) throw new Error('操作历史损坏');
  for (const event of s.events) {
    if (!event || !['capture', 'acknowledged', 'channelClosed'].includes(event.type) || (event.type !== 'channelClosed' && (!event.frameId || !ids.has(event.frameId)))) throw new Error('确认记录损坏');
  }
  if (s.channelClosed && (s.events.findIndex(e => e.type === 'acknowledged') < 0 || s.events.findIndex(e => e.type === 'channelClosed') <= s.events.findIndex(e => e.type === 'acknowledged'))) throw new Error('确认顺序损坏');
  if (s.channelClosed && (!s.saveAcknowledged || !s.portraitSaved) || s.saveAcknowledged && !ids.has(`${s.runId}:portrait`) || s.wenxiaMarks.length > 0 && !s.consent || s.mirrorWiped && !s.mirrorBagDown) throw new Error('保存顺序损坏');
  const sceneNumber = Number(beats[s.nodeId].scene.slice(1));
  const expectedScenes = Array.from({ length: s.started ? sceneNumber : 0 }, (_, index) => `T0${index + 1}`);
  if (s.visitedScenes.join(',') !== expectedScenes.join(',')) throw new Error('场景进度损坏');
  const requiredFrames = [
    [3, 'breakfast_hands'], [4, 'hill_shadow'], [5, 'lake_reflection'], [6, 'window_sleeve'],
  ] as const;
  if (requiredFrames.some(([scene, kind]) => sceneNumber >= scene && (!ids.has(`${s.runId}:${kind}`) || !s.wenxiaMarks.includes(`${s.runId}:${kind}`)))) throw new Error('关键行程记录缺失');
  if (sceneNumber >= 2 && (!s.consent || !s.calibrated) || sceneNumber >= 3 && (!s.breakfastCentered || !s.mealChoice) || sceneNumber >= 4 && s.observationPoints.length !== 3 || sceneNumber >= 7 && (!s.albumReordered || !['breakfast_hands', 'hill_shadow', 'lake_reflection'].every(kind => s.inspectedFrames.includes(`${s.runId}:${kind}`))) || sceneNumber === 8 && !s.channelClosed || s.finished !== (s.nodeId === 'T08.05')) throw new Error('关键动作进度损坏');
  const stepNumber = Number(s.nodeId.slice(4, 6));
  if (sceneNumber === 7 && (stepNumber >= 1 && !s.mirrorBagDown || stepNumber >= 2 && !s.mirrorWiped || stepNumber >= 5 && !s.hairChoice || stepNumber >= 7 && !s.portraitConsent || stepNumber >= 8 && !s.saveAcknowledged) || s.hairChoice !== null && !s.mirrorWiped || s.portraitSaved && (!s.portraitConsent || !s.hairChoice)) throw new Error('镜前进度损坏');
  if (!s.started && (s.nodeId !== 'T01.00' || s.capturedFrames.length || Object.keys(s.choices).length)
    || sceneNumber === 1 && (stepNumber >= 2 && !s.calibrated || stepNumber >= 7 && !s.consent)
    || sceneNumber === 2 && (stepNumber >= 2 && !s.mealChoice || stepNumber >= 4 && (!s.breakfastCentered || !ids.has(`${s.runId}:breakfast_hands`)))
    || sceneNumber === 3 && s.observationPoints.length !== Math.max(0, Math.min(3, stepNumber - 2))
    || sceneNumber === 4 && stepNumber >= 2 && !ids.has(`${s.runId}:lake_reflection`)
    || sceneNumber === 5 && (stepNumber >= 4 && !s.stationAction || stepNumber >= 6 && !ids.has(`${s.runId}:window_sleeve`))
    || sceneNumber === 6 && stepNumber >= 1 && (!s.albumReordered || !['breakfast_hands', 'hill_shadow', 'lake_reflection'].every(kind => s.inspectedFrames.includes(`${s.runId}:${kind}`)))) throw new Error('当前对白前置动作缺失');
  return s;
}
