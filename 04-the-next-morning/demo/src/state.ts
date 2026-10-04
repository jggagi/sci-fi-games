import { assessHypothesis, evaluateTrial, type Hypothesis, type Output, type TrialInput } from './experiment';
import type { SceneId } from './content';

export type Category = 'fact' | 'conjecture' | 'unfinished';
export type Choice = 'withdrawn' | 'accepted';
export interface Trial extends TrialInput { id: string; scene: SceneId; date: string; output: Output }
export interface HypothesisEntry { id: string; model: Hypothesis; evidenceIds: string[]; status: 'proposed' | 'provisional' | 'refuted' }
export interface State {
  version: 1; sceneId: SceneId; questionFocus: string; questionRevision: string;
  connected: boolean; planned: TrialInput; pulse: 0 | 1 | 2; trialHistory: Trial[];
  hypotheses: HypothesisEntry[]; shortRevision: boolean; timingRevision: boolean;
  oldMethodRetained: boolean; oldExplanationRejected: boolean; questionSaved: boolean;
  withdrawalReceiptSeen: boolean; conversationAcknowledged: boolean;
  regretHeard: boolean; wishHeard: boolean; handoffItems: Record<string, Category | ''>;
  pendingChoice: Choice | null; finalChoice: Choice | null;
  wireConnected: boolean; verified: string[]; today: 'archive' | 'measure' | null;
  questionOnBoard: string; boardRevised: boolean; nextStarted: boolean; epilogueAction: boolean;
}
export const dateLabels: Record<SceneId, string> = {
  D01: '现在', D02: '三十六年前', D03: '二十年前', D04: '几年前', D05: '现在',
  D06: '现在', D07: '现在', D08A: '第二天早上 · 林予', D08B: '第二天早上 · 程砚',
};
export function newState(): State {
  return {
    version: 1, sceneId: 'D01', questionFocus: '', questionRevision: '', connected: false,
    planned: { first: 'left', second: 'right', interval: 1 }, pulse: 0, trialHistory: [], hypotheses: [],
    shortRevision: false, timingRevision: false, oldMethodRetained: false, oldExplanationRejected: false,
    questionSaved: false, withdrawalReceiptSeen: false, conversationAcknowledged: false,
    regretHeard: false, wishHeard: false, handoffItems: { records: '', conjecture: '', unfinished: '' },
    pendingChoice: null, finalChoice: null, wireConnected: false, verified: [], today: null,
    questionOnBoard: '', boardRevised: false, nextStarted: false, epilogueAction: false,
  };
}
export function sceneTrials(s: State, scene = s.sceneId): Trial[] { return s.trialHistory.filter(t => t.scene === scene); }
export function hasComparison(s: State): boolean {
  const trials = sceneTrials(s, 'D02');
  return trials.length >= 2 && trials.some(t => t.first !== trials[0].first || t.second !== trials[0].second);
}
export function hasTimeEvidence(s: State): boolean { return [2, 3, 4].every(i => sceneTrials(s, 'D03').some(t => t.interval === i)); }
export function handoffComplete(s: State): boolean {
  return s.handoffItems.records === 'fact' && s.handoffItems.conjecture === 'conjecture' && s.handoffItems.unfinished === 'unfinished';
}
export function canAdvance(s: State): boolean {
  switch (s.sceneId) {
    case 'D01': return !!s.questionFocus && s.connected;
    case 'D02': return s.shortRevision;
    case 'D03': return s.timingRevision;
    case 'D04': return s.oldMethodRetained && s.oldExplanationRejected && s.questionSaved;
    case 'D05': return s.withdrawalReceiptSeen && s.conversationAcknowledged;
    case 'D06': return s.regretHeard && s.wishHeard && handoffComplete(s);
    default: return false;
  }
}
export type Action =
  | { type: 'focus'; value: string } | { type: 'connect' }
  | { type: 'configure'; value: TrialInput } | { type: 'pulse'; index: 1 | 2; from: SceneId }
  | { type: 'reset'; from: SceneId } | { type: 'propose'; model: 'port' | 'second' }
  | { type: 'revise-short' } | { type: 'revise-time' }
  | { type: 'retain-method' } | { type: 'reject-explanation' }
  | { type: 'question'; value: string } | { type: 'save-question' }
  | { type: 'archive' } | { type: 'ask' } | { type: 'regret' } | { type: 'wish' }
  | { type: 'classify'; id: string; category: Category | '' }
  | { type: 'advance'; from: SceneId } | { type: 'choose'; choice: Choice }
  | { type: 'cancel-choice' } | { type: 'confirm'; choice: Choice }
  | { type: 'review-handoff' } | { type: 'morning' }
  | { type: 'wire' } | { type: 'verify'; id: string } | { type: 'today'; value: 'archive' | 'measure' }
  | { type: 'board'; value: string } | { type: 'revise-board' } | { type: 'finish' };

const experimentScenes = ['D02', 'D03', 'D08A', 'D08B'];
const sequence: SceneId[] = ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07'];
function updateHypotheses(s: State): void {
  s.hypotheses = s.hypotheses.map(h => {
    const observations = s.trialHistory.filter(t => h.model !== 'timing' || t.scene !== 'D02');
    const counterexamples = observations.filter(t => !assessHypothesis(h.model, t));
    return { ...h, evidenceIds: (counterexamples.length ? counterexamples : observations).map(t => t.id), status: counterexamples.length ? 'refuted' : 'provisional' };
  });
}
/** Scene-specific actions and source-scene checks make stale/double clicks harmless. */
export function reduceState(current: State, action: Action): State {
  const s = structuredClone(current);
  const scene = s.sceneId;
  switch (action.type) {
    case 'focus': if (scene === 'D01' && ['local', 'structure', 'scale'].includes(action.value)) s.questionFocus = action.value; break;
    case 'connect': if (scene === 'D01' && s.questionFocus) s.connected = true; break;
    case 'configure':
      if (experimentScenes.includes(scene) && s.pulse === 0) {
        evaluateTrial(action.value);
        if (scene !== 'D02' || action.value.interval === 1) s.planned = { ...action.value };
      } break;
    case 'pulse': {
      if (scene !== action.from || !experimentScenes.includes(scene)) break;
      if ((scene === 'D08A' || scene === 'D08B') && !s.wireConnected) break;
      if (scene === 'D08B' && s.today !== 'measure') break;
      if (action.index === 1 && s.pulse === 0) {
        s.pulse = 1;
        if (scene === 'D08A' && s.boardRevised) s.nextStarted = true;
      } else if (action.index === 2 && s.pulse === 1) {
        s.pulse = 2;
        s.trialHistory.push({ ...s.planned, id: `trial-${s.trialHistory.length + 1}`, scene, date: dateLabels[scene], output: evaluateTrial(s.planned) });
        updateHypotheses(s);
      }
      break;
    }
    case 'reset': if (scene === action.from && experimentScenes.includes(scene)) s.pulse = 0; break;
    case 'propose':
      if (scene === 'D02' && sceneTrials(s).length && !s.hypotheses.length) {
        s.hypotheses.push({ id: 'hypothesis-initial', model: action.model, evidenceIds: [], status: 'proposed' }); updateHypotheses(s);
      } break;
    case 'revise-short':
      if (scene === 'D02' && s.hypotheses.length && hasComparison(s) && !s.shortRevision) {
        s.shortRevision = true;
        if (!s.hypotheses.some(h => h.model === 'second')) s.hypotheses.push({ id: 'hypothesis-second', model: 'second', evidenceIds: [], status: 'provisional' });
        updateHypotheses(s);
      } break;
    case 'revise-time':
      if (scene === 'D03' && hasTimeEvidence(s) && !s.timingRevision) {
        s.timingRevision = true; s.hypotheses.push({ id: 'hypothesis-timing', model: 'timing', evidenceIds: [], status: 'provisional' }); updateHypotheses(s);
      } break;
    case 'retain-method': if (scene === 'D04') s.oldMethodRetained = true; break;
    case 'reject-explanation': if (scene === 'D04') s.oldExplanationRejected = true; break;
    case 'question': if (scene === 'D04') { s.questionRevision = action.value.slice(0, 280); s.questionSaved = false; } break;
    case 'save-question': if (scene === 'D04' && s.questionRevision.trim()) s.questionSaved = true; break;
    case 'archive': if (scene === 'D05') s.withdrawalReceiptSeen = true; break;
    case 'ask': if (scene === 'D05' && s.withdrawalReceiptSeen) s.conversationAcknowledged = true; break;
    case 'regret': if (scene === 'D06') s.regretHeard = true; break;
    case 'wish': if (scene === 'D06' && s.regretHeard) s.wishHeard = true; break;
    case 'classify':
      if (scene === 'D06' && s.wishHeard && ['records', 'conjecture', 'unfinished'].includes(action.id)) s.handoffItems[action.id] = action.category; break;
    case 'advance':
      if (scene === action.from && canAdvance(s)) {
        s.sceneId = sequence[sequence.indexOf(scene) + 1]; s.pulse = 0;
        if (s.sceneId === 'D03') s.planned = { ...s.planned, interval: 2 };
      } break;
    case 'choose': if (scene === 'D07' && !s.finalChoice && handoffComplete(s)) s.pendingChoice = action.choice; break;
    case 'cancel-choice': if (!s.finalChoice) s.pendingChoice = null; break;
    case 'confirm':
      if (scene === 'D07' && !s.finalChoice && s.pendingChoice === action.choice && handoffComplete(s)) {
        s.finalChoice = action.choice; s.pendingChoice = null;
      } break;
    case 'review-handoff': if (scene === 'D07' && !s.finalChoice) { s.sceneId = 'D06'; s.pendingChoice = null; } break;
    case 'morning':
      if (scene === 'D07' && s.finalChoice) { s.sceneId = s.finalChoice === 'withdrawn' ? 'D08A' : 'D08B'; s.pulse = 0; s.planned = { ...s.planned, interval: 3 }; } break;
    case 'wire': if (scene === 'D08A' || scene === 'D08B') s.wireConnected = true; break;
    case 'verify': if (scene === 'D08B' && ['records', 'conjecture', 'unfinished'].includes(action.id) && !s.verified.includes(action.id)) s.verified.push(action.id); break;
    case 'today': if (scene === 'D08B' && !s.epilogueAction && s.verified.length === 3 && s.wireConnected) s.today = action.value; break;
    case 'board': if (scene === 'D08A') { s.questionOnBoard = action.value.slice(0, 280); s.boardRevised = false; } break;
    case 'revise-board':
      if (scene === 'D08A' && s.questionOnBoard.trim() && sceneTrials(s).some(t => t.interval === 3)) s.boardRevised = true; break;
    case 'finish':
      if ((scene === 'D08A' && s.boardRevised && s.nextStarted) || (scene === 'D08B' && s.verified.length === 3 && s.wireConnected && (s.today === 'archive' || (s.today === 'measure' && sceneTrials(s).length > 0)))) s.epilogueAction = true;
      break;
  }
  return s;
}
