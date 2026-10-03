import { evaluateTrial } from './experiment';
import { handoffComplete, newState, type State } from './state';

export const SAVE_KEY = 'sci-fi-games:04-the-next-morning:v1';
export interface Preferences { muted: boolean; typewriter: boolean; reducedMotion: boolean; staticPulse: boolean }
export const defaultPreferences = (): Preferences => ({ muted: true, typewriter: false, reducedMotion: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches, staticPulse: true });
export interface Save { state: State; preferences: Preferences }
export type LoadResult = { kind: 'empty' } | { kind: 'valid'; save: Save } | { kind: 'corrupt'; reason: string };
const ids = ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08A', 'D08B'];

export function decodeSave(raw: string | null): LoadResult {
  if (raw === null) return { kind: 'empty' };
  try {
    const parsed = JSON.parse(raw) as Save;
    const s = parsed.state;
    if (!s || s.version !== 1 || !ids.includes(s.sceneId)) throw Error('版本或章节不兼容');
    const template = newState();
    for (const key of Object.keys(template) as (keyof State)[]) {
      if (!(key in s)) throw Error('记录不完整');
      if (typeof template[key] === 'boolean' && typeof s[key] !== 'boolean') throw Error('记录标记损坏');
      if (typeof template[key] === 'string' && (typeof s[key] !== 'string' || (s[key] as string).length > 280)) throw Error('文字记录损坏');
    }
    if (!['', 'local', 'structure', 'scale'].includes(s.questionFocus) || ![0, 1, 2].includes(s.pulse)) throw Error('实验状态损坏');
    evaluateTrial(s.planned);
    if (!Array.isArray(s.trialHistory) || s.trialHistory.length > 5000) throw Error('实验记录损坏');
    s.trialHistory.forEach((t, i) => {
      if (!t || t.id !== `trial-${i + 1}` || !['D02', 'D03', 'D08A', 'D08B'].includes(t.scene) || typeof t.date !== 'string') throw Error('实验编号损坏');
      const output = evaluateTrial(t);
      if (!Array.isArray(t.output) || t.output.length !== 2 || output.some((v, j) => t.output[j] !== v)) throw Error('实验输出不符');
    });
    if (!Array.isArray(s.hypotheses) || s.hypotheses.length > 3) throw Error('假设记录损坏');
    s.hypotheses.forEach(h => {
      if (!h || !['port', 'second', 'timing'].includes(h.model) || !['proposed', 'provisional', 'refuted'].includes(h.status) || typeof h.id !== 'string' || !Array.isArray(h.evidenceIds) || h.evidenceIds.some(id => !s.trialHistory.some(t => t.id === id))) throw Error('假设证据损坏');
    });
    if (!s.handoffItems || Object.keys(s.handoffItems).length !== 3 || !['records', 'conjecture', 'unfinished'].every(id => ['', 'fact', 'conjecture', 'unfinished'].includes(s.handoffItems[id]))) throw Error('交接类别损坏');
    if (!Array.isArray(s.verified) || s.verified.some(id => !['records', 'conjecture', 'unfinished'].includes(id)) || new Set(s.verified).size !== s.verified.length) throw Error('复核记录损坏');
    if (![null, 'archive', 'measure'].includes(s.today) || ![null, 'withdrawn', 'accepted'].includes(s.finalChoice) || ![null, 'withdrawn', 'accepted'].includes(s.pendingChoice)) throw Error('决定记录损坏');
    if (s.pendingChoice && s.sceneId !== 'D07') throw Error('确认章节不一致');
    if (s.finalChoice && (s.pendingChoice || !handoffComplete(s) || !['D07', 'D08A', 'D08B'].includes(s.sceneId))) throw Error('决定与资料不一致');
    if ((s.sceneId === 'D08A' && s.finalChoice !== 'withdrawn') || (s.sceneId === 'D08B' && s.finalChoice !== 'accepted')) throw Error('尾声与角色不一致');
    if (!parsed.preferences || !['muted', 'typewriter', 'reducedMotion', 'staticPulse'].every(k => typeof parsed.preferences[k as keyof Preferences] === 'boolean')) throw Error('设置损坏');
    return { kind: 'valid', save: parsed };
  } catch (error) {
    return { kind: 'corrupt', reason: error instanceof Error ? error.message : '无法读取记录' };
  }
}
export function loadSave(storage: Pick<Storage, 'getItem'>): LoadResult {
  try { return decodeSave(storage.getItem(SAVE_KEY)); } catch { return { kind: 'corrupt', reason: '浏览器不允许读取本地存档' }; }
}
export function saveGame(storage: Pick<Storage, 'setItem'>, save: Save): boolean {
  try { storage.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; }
}
export function clearSave(storage: Pick<Storage, 'removeItem'>): boolean {
  try { storage.removeItem(SAVE_KEY); return true; } catch { return false; }
}
