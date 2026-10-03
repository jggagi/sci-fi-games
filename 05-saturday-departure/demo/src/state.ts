import { getSceneContent } from './content.ts';

export type SceneId = 'S01' | 'S02' | 'S03' | 'S04' | 'S05' | 'CHILDHOOD' | 'S05_TRUTH' | 'S06' | 'S07A' | 'S07B' | 'S07C' | 'S08';
export type ArtifactId = 'drawing' | 'ticket' | 'application' | 'retirement' | 'conditions';
export type PlanId = 'long_voyage' | 'short_trial' | 'not_now';
export type ChildhoodDestination = 'rain' | 'threeMoons';
export type EndingPreparation = 'schedule' | 'kit';
export interface Settings { muted: boolean; typing: boolean; reducedMotion: boolean }

export interface GameState {
  version: 1;
  sceneId: SceneId;
  dialogueIndex: number;
  arrivalChoice: null | 'bag' | 'reply';
  toolboxOpened: boolean;
  automationReportVerified: boolean;
  lampPort: null | 'P1' | 'P2';
  inspectionLampOn: boolean;
  lampChecked: boolean;
  toolHandoffDone: boolean;
  artifactsSeen: ArtifactId[];
  drawingFold: 0 | 1 | 2 | 3;
  drawingUnfolded: boolean;
  earlyInference: boolean;
  childhoodLampPlaced: boolean;
  childhoodLampOn: boolean;
  childhoodDestination: null | ChildhoodDestination;
  fatherPreferenceUnderstood: boolean;
  invitationUnderstood: boolean;
  adultPlan: null | PlanId;
  applicantName: string;
  adultDestination: string;
  planConfirmed: boolean;
  inspectionDelivered: boolean;
  endingPrep: EndingPreparation[];
  drawingStored: boolean;
  contactDecision: null | 'save' | 'skip';
  projectContactSaved: boolean;
  bagSecured: boolean;
  endingResponse: null | 'own' | 'work';
  endingLampOn: boolean;
  routeActivated: boolean;
  endingObserved: boolean;
  settings: Settings;
}

export type Action =
  | { type: 'advanceDialogue' }
  | { type: 'chooseArrival'; choice: 'bag' | 'reply' }
  | { type: 'openToolbox' }
  | { type: 'verifyReport'; displacementUnit: 'mrad' | 'mm'; temperatureUnit: 'C' | 'K' }
  | { type: 'connectLamp'; port: 'P1' | 'P2' }
  | { type: 'toggleInspectionLamp' }
  | { type: 'handoffTool' }
  | { type: 'viewArtifact'; artifact: ArtifactId }
  | { type: 'inferDrawing' }
  | { type: 'unfoldDrawing' }
  | { type: 'placeChildhoodLamp' }
  | { type: 'toggleChildhoodLamp' }
  | { type: 'chooseChildhoodDestination'; destination: ChildhoodDestination }
  | { type: 'deliverInspection' }
  | { type: 'editPlan'; plan: PlanId | null; name: string; destination: string }
  | { type: 'confirmPlan' }
  | { type: 'prepareEnding'; item: EndingPreparation }
  | { type: 'storeDrawing' }
  | { type: 'chooseContact'; save: boolean }
  | { type: 'secureBag' }
  | { type: 'chooseEndingResponse'; response: 'own' | 'work' }
  | { type: 'toggleEndingLamp' }
  | { type: 'activateRoute' }
  | { type: 'observeWindow' }
  | { type: 'setSetting'; key: keyof Settings; value: boolean }
  | { type: 'nextScene' };

export const SCENE_IDS: SceneId[] = ['S01', 'S02', 'S03', 'S04', 'S05', 'CHILDHOOD', 'S05_TRUTH', 'S06', 'S07A', 'S07B', 'S07C', 'S08'];
export const ARTIFACT_IDS: ArtifactId[] = ['drawing', 'ticket', 'application', 'retirement', 'conditions'];
export const PLAN_IDS: PlanId[] = ['long_voyage', 'short_trial', 'not_now'];
const rank: Record<SceneId, number> = { S01: 0, S02: 1, S03: 2, S04: 3, S05: 4, CHILDHOOD: 5, S05_TRUTH: 6, S06: 7, S07A: 8, S07B: 8, S07C: 8, S08: 9 };
const planScene: Record<PlanId, SceneId> = { long_voyage: 'S07A', short_trial: 'S07B', not_now: 'S07C' };

export function newGame(): GameState {
  return {
    version: 1, sceneId: 'S01', dialogueIndex: 0, arrivalChoice: null, toolboxOpened: false,
    automationReportVerified: false, lampPort: null, inspectionLampOn: false, lampChecked: false,
    toolHandoffDone: false, artifactsSeen: [], drawingFold: 0, drawingUnfolded: false,
    earlyInference: false, childhoodLampPlaced: false, childhoodLampOn: false, childhoodDestination: null,
    fatherPreferenceUnderstood: false, invitationUnderstood: false, adultPlan: null, applicantName: '',
    adultDestination: '', planConfirmed: false, inspectionDelivered: false, endingPrep: [], drawingStored: false,
    contactDecision: null, projectContactSaved: false, bagSecured: false, endingResponse: null,
    endingLampOn: false, routeActivated: false, endingObserved: false,
    settings: { muted: true, typing: false, reducedMotion: false },
  };
}

function lastDialogueIndex(state: GameState): number {
  return Math.max(0, getSceneContent(state).lines.length - 1);
}
function inspectionComplete(state: GameState): boolean {
  return state.automationReportVerified && state.lampChecked && state.toolHandoffDone;
}
function hasArtifacts(state: GameState, artifacts: ArtifactId[]): boolean {
  return artifacts.every((artifact) => state.artifactsSeen.includes(artifact));
}
function validApplication(state: GameState): boolean {
  return state.adultPlan !== null && state.applicantName.trim().length > 0 && state.applicantName.trim().length <= 40
    && state.adultDestination.trim().length > 0 && state.adultDestination.trim().length <= 120;
}
function endingReady(state: GameState): boolean {
  if (!state.planConfirmed || !state.drawingStored) return false;
  if (state.adultPlan === 'not_now') return state.bagSecured && state.contactDecision !== null;
  return state.endingPrep.includes('schedule') && state.endingPrep.includes('kit') && state.endingResponse !== null;
}

/** Progress gates describe actual completed actions, never an inferred wish. */
export function canAdvance(state: GameState): boolean {
  if (state.dialogueIndex < lastDialogueIndex(state)) return false;
  switch (state.sceneId) {
    case 'S01': return state.arrivalChoice !== null && state.toolboxOpened;
    case 'S02': return inspectionComplete(state);
    case 'S03': return state.drawingFold >= 1 && hasArtifacts(state, ['drawing', 'ticket', 'application', 'retirement']);
    case 'S04': return state.artifactsSeen.includes('conditions');
    case 'S05': return state.drawingUnfolded;
    case 'CHILDHOOD': return state.childhoodLampPlaced && state.childhoodLampOn && state.childhoodDestination !== null;
    case 'S05_TRUTH': return true;
    case 'S06': return state.inspectionDelivered && state.planConfirmed;
    case 'S07A': case 'S07B': case 'S07C': return endingReady(state) && state.routeActivated && state.endingLampOn;
    case 'S08': return false;
  }
}

function patch(state: GameState, changes: Partial<GameState>): GameState {
  const result = { ...state, ...changes };
  // Conditional dialogue can change after an inference. Keep the visible index valid.
  result.dialogueIndex = Math.min(result.dialogueIndex, lastDialogueIndex(result));
  return result;
}

/** Immutable, scene-scoped actions. Invalid or duplicate confirmations are no-ops. */
export function reduce(state: GameState, action: Action): GameState {
  const scene = state.sceneId;
  const ending = scene === 'S07A' || scene === 'S07B' || scene === 'S07C';
  switch (action.type) {
    case 'advanceDialogue': return state.dialogueIndex < lastDialogueIndex(state) ? patch(state, { dialogueIndex: state.dialogueIndex + 1 }) : state;
    case 'chooseArrival': return scene === 'S01' && state.arrivalChoice === null ? patch(state, { arrivalChoice: action.choice }) : state;
    case 'openToolbox': return scene === 'S01' && !state.toolboxOpened ? patch(state, { toolboxOpened: true }) : state;
    case 'verifyReport': return scene === 'S02' && !state.automationReportVerified && action.displacementUnit === 'mrad' && action.temperatureUnit === 'C' ? patch(state, { automationReportVerified: true }) : state;
    case 'connectLamp': return scene === 'S02' && state.automationReportVerified && !state.lampChecked ? patch(state, { lampPort: action.port, inspectionLampOn: false }) : state;
    case 'toggleInspectionLamp': return scene === 'S02' && state.lampPort === 'P2' ? patch(state, { inspectionLampOn: !state.inspectionLampOn, lampChecked: true }) : state;
    case 'handoffTool': return scene === 'S02' && !state.toolHandoffDone ? patch(state, { toolHandoffDone: true }) : state;
    case 'viewArtifact': {
      if (scene === 'CHILDHOOD' || !ARTIFACT_IDS.includes(action.artifact) || state.artifactsSeen.includes(action.artifact)) return state;
      if (action.artifact === 'conditions' && rank[scene] < rank.S04) return state;
      if (action.artifact === 'drawing' && rank[scene] < rank.S03) return state;
      if ((action.artifact === 'ticket' || action.artifact === 'application') && scene === 'S01' && !state.toolboxOpened) return state;
      return patch(state, { artifactsSeen: [...state.artifactsSeen, action.artifact] });
    }
    case 'inferDrawing': return (scene === 'S03' || scene === 'S04' || scene === 'S05') && state.drawingFold >= 1 && !state.earlyInference ? patch(state, { earlyInference: true }) : state;
    case 'unfoldDrawing': {
      if (!state.artifactsSeen.includes('drawing')) return state;
      const maximum = scene === 'S03' ? 1 : scene === 'S05' ? 3 : 0;
      if (state.drawingFold >= maximum) return state;
      const fold = (state.drawingFold + 1) as GameState['drawingFold'];
      return patch(state, { drawingFold: fold, drawingUnfolded: fold === 3 });
    }
    case 'placeChildhoodLamp': return scene === 'CHILDHOOD' && !state.childhoodLampPlaced ? patch(state, { childhoodLampPlaced: true }) : state;
    case 'toggleChildhoodLamp': return scene === 'CHILDHOOD' && state.childhoodLampPlaced ? patch(state, { childhoodLampOn: !state.childhoodLampOn }) : state;
    case 'chooseChildhoodDestination': return scene === 'CHILDHOOD' && state.childhoodLampOn && state.childhoodDestination === null ? patch(state, { childhoodDestination: action.destination }) : state;
    case 'deliverInspection': return scene === 'S06' && inspectionComplete(state) && !state.inspectionDelivered ? patch(state, { inspectionDelivered: true }) : state;
    case 'editPlan': return scene === 'S06' && !state.planConfirmed ? patch(state, { adultPlan: action.plan, applicantName: action.name.slice(0, 140), adultDestination: action.destination.slice(0, 240) }) : state;
    case 'confirmPlan': return scene === 'S06' && !state.planConfirmed && state.inspectionDelivered && state.fatherPreferenceUnderstood && state.invitationUnderstood && validApplication(state) ? patch(state, { planConfirmed: true, applicantName: state.applicantName.trim(), adultDestination: state.adultDestination.trim() }) : state;
    case 'prepareEnding': return (scene === 'S07A' || scene === 'S07B') && !state.endingPrep.includes(action.item) ? patch(state, { endingPrep: [...state.endingPrep, action.item] }) : state;
    case 'storeDrawing': return ending && state.drawingUnfolded && !state.drawingStored ? patch(state, { drawingStored: true }) : state;
    case 'chooseContact': return scene === 'S07C' && state.contactDecision === null ? patch(state, { contactDecision: action.save ? 'save' : 'skip', projectContactSaved: action.save }) : state;
    case 'secureBag': return scene === 'S07C' && !state.bagSecured ? patch(state, { bagSecured: true }) : state;
    case 'chooseEndingResponse': return (scene === 'S07A' || scene === 'S07B') && state.endingResponse === null ? patch(state, { endingResponse: action.response }) : state;
    case 'toggleEndingLamp': return ending || scene === 'S08' ? patch(state, { endingLampOn: !state.endingLampOn }) : state;
    case 'activateRoute': return ending && !state.routeActivated && state.endingLampOn && endingReady(state) ? patch(state, { routeActivated: true }) : state;
    case 'observeWindow': return (ending || scene === 'S08') && !state.endingObserved ? patch(state, { endingObserved: true }) : state;
    case 'setSetting': return state.settings[action.key] === action.value ? state : patch(state, { settings: { ...state.settings, [action.key]: action.value } });
    case 'nextScene': {
      if (!canAdvance(state)) return state;
      const next: Partial<Record<SceneId, SceneId>> = { S01: 'S02', S02: 'S03', S03: 'S04', S04: 'S05', S05: 'CHILDHOOD', CHILDHOOD: 'S05_TRUTH', S05_TRUTH: 'S06', S06: state.adultPlan ? planScene[state.adultPlan] : undefined, S07A: 'S08', S07B: 'S08', S07C: 'S08' };
      const nextScene = next[scene];
      if (!nextScene) return state;
      return patch(state, { sceneId: nextScene, dialogueIndex: 0, ...(scene === 'S05_TRUTH' ? { fatherPreferenceUnderstood: true, invitationUnderstood: true } : {}) });
    }
  }
}

function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function enumValue(value: unknown, values: readonly unknown[]): boolean { return values.includes(value); }
function uniqueArray(value: unknown, values: readonly unknown[]): boolean { return Array.isArray(value) && value.every((item) => values.includes(item)) && new Set(value).size === value.length; }

/** Save data is untrusted. Reject unsupported or contradictory progress rather than guessing choices. */
export function isGameState(value: unknown): value is GameState {
  if (!record(value)) return false;
  const initial = newGame();
  const expectedKeys = Object.keys(initial);
  if (Object.keys(value).length !== expectedKeys.length || !expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key))) return false;
  for (const [key, defaultValue] of Object.entries(initial)) {
    if (typeof defaultValue === 'boolean' && typeof value[key] !== 'boolean') return false;
  }
  if (value.version !== 1 || !enumValue(value.sceneId, SCENE_IDS) || !Number.isInteger(value.dialogueIndex) || (value.dialogueIndex as number) < 0) return false;
  if (!enumValue(value.arrivalChoice, [null, 'bag', 'reply']) || !enumValue(value.lampPort, [null, 'P1', 'P2'])) return false;
  if (!uniqueArray(value.artifactsSeen, ARTIFACT_IDS) || !uniqueArray(value.endingPrep, ['schedule', 'kit'])) return false;
  if (!enumValue(value.drawingFold, [0, 1, 2, 3]) || !enumValue(value.childhoodDestination, [null, 'rain', 'threeMoons'])) return false;
  if (!enumValue(value.adultPlan, [null, ...PLAN_IDS]) || typeof value.applicantName !== 'string' || value.applicantName.length > 140 || typeof value.adultDestination !== 'string' || value.adultDestination.length > 240) return false;
  if (!enumValue(value.contactDecision, [null, 'save', 'skip']) || !enumValue(value.endingResponse, [null, 'own', 'work'])) return false;
  if (!record(value.settings) || Object.keys(value.settings).length !== 3 || !['muted', 'typing', 'reducedMotion'].every((key) => typeof (value.settings as Record<string, unknown>)[key] === 'boolean')) return false;
  const state = value as unknown as GameState;
  const stage = rank[state.sceneId];
  if (state.dialogueIndex > lastDialogueIndex(state)) return false;
  if (state.drawingUnfolded !== (state.drawingFold === 3) || (state.drawingFold > 0 && !state.artifactsSeen.includes('drawing'))) return false;
  if (state.earlyInference && state.drawingFold < 1) return false;
  if ((state.inspectionLampOn || state.lampChecked) && state.lampPort !== 'P2') return false;
  if (state.inspectionLampOn && !state.lampChecked) return false;
  if (state.lampPort !== null && !state.automationReportVerified) return false;
  if (state.childhoodLampOn && !state.childhoodLampPlaced) return false;
  if (state.childhoodDestination !== null && !state.childhoodLampPlaced) return false;
  if (state.fatherPreferenceUnderstood !== state.invitationUnderstood) return false;
  if (state.projectContactSaved !== (state.contactDecision === 'save')) return false;
  if (state.inspectionDelivered && !inspectionComplete(state)) return false;
  if (state.planConfirmed && (!validApplication(state) || !state.inspectionDelivered || !state.invitationUnderstood)) return false;
  if (state.routeActivated && !endingReady(state)) return false;
  if (stage > 0 && (state.arrivalChoice === null || !state.toolboxOpened)) return false;
  if (stage > 1 && !inspectionComplete(state)) return false;
  if (stage > 2 && (state.drawingFold < 1 || !hasArtifacts(state, ['drawing', 'ticket', 'application', 'retirement']))) return false;
  if (stage > 3 && !state.artifactsSeen.includes('conditions')) return false;
  if (stage > 4 && !state.drawingUnfolded) return false;
  if (stage > 5 && (!state.childhoodLampPlaced || !state.childhoodLampOn || state.childhoodDestination === null)) return false;
  if (stage > 6 && !state.invitationUnderstood) return false;
  if (stage > 7 && (!state.planConfirmed || state.adultPlan === null)) return false;
  if ((state.sceneId === 'S07A' || state.sceneId === 'S07B' || state.sceneId === 'S07C') && state.adultPlan !== null && state.sceneId !== planScene[state.adultPlan]) return false;
  if (stage > 8 && (!state.routeActivated || !endingReady(state))) return false;
  // Prevent forged future progress in a valid-looking opening save.
  if (stage < 1 && (state.automationReportVerified || state.lampPort !== null || state.inspectionLampOn || state.lampChecked || state.toolHandoffDone)) return false;
  if (stage < 2 && (state.drawingFold !== 0 || state.earlyInference || state.artifactsSeen.includes('drawing'))) return false;
  if (stage < 3 && state.artifactsSeen.includes('conditions')) return false;
  if (stage < 4 && state.drawingFold > 1) return false;
  if (stage < 5 && (state.childhoodLampPlaced || state.childhoodLampOn || state.childhoodDestination !== null)) return false;
  if (stage < 7 && (state.fatherPreferenceUnderstood || state.invitationUnderstood || state.adultPlan !== null || state.applicantName !== '' || state.adultDestination !== '' || state.planConfirmed || state.inspectionDelivered)) return false;
  if (stage < 8 && (state.endingPrep.length > 0 || state.drawingStored || state.contactDecision !== null || state.projectContactSaved || state.bagSecured || state.endingResponse !== null || state.endingLampOn || state.routeActivated || state.endingObserved)) return false;
  if (state.adultPlan === 'not_now' && (state.endingPrep.length > 0 || state.endingResponse !== null)) return false;
  if (state.adultPlan !== 'not_now' && (state.contactDecision !== null || state.projectContactSaved || state.bagSecured)) return false;
  return true;
}
