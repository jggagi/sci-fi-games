import type { State } from './model';
import { SCENES, RAIN_OPTIONS, WORD_OPTIONS, REVISION_FINISH, EARLY_REVEAL_DIALOGUE, type Dialogue } from './content';

/** Stage-aware dialogue: a fact is spoken only after the player's corresponding action. */
export function narrativeDialogue(state: State): Dialogue[] {
  const scene = SCENES[state.sceneId];
  let lines = [...scene.dialogue];
  if (state.sceneId === 'P02' && state.rainChoice) {
    lines.push(...(RAIN_OPTIONS.find(x => x.id === state.rainChoice)?.response ?? []));
  }
  if (state.sceneId === 'P04' && state.revisionChoice) {
    const explanation = WORD_OPTIONS.find(x => x.id === state.revisionChoice)?.description;
    if (explanation) lines.push({ id: `P04.${state.revisionChoice}.explanation`, speaker: '小序', text: explanation });
    if (state.zhouEdit !== null) lines.push(...REVISION_FINISH);
  }
  if (state.sceneId === 'P05') lines = lines.slice(0, state.chairChoice ? 5 : state.chairTried ? 3 : 2);
  if (state.sceneId === 'P06') {
    lines = !state.compilationUnderstood ? [] : state.coauthorSeen
      ? [EARLY_REVEAL_DIALOGUE, ...scene.dialogue.slice(1)] : scene.dialogue.slice(0, 1);
  }
  if (state.sceneId === 'P08') {
    lines = state.authorshipConfirmed ? [scene.dialogue[1], state.finalLineMode === 'deferred'
      ? { id: 'P08.xu.deferred', speaker: '小序', text: '一行就好。' }
      : { id: 'P08.shen.fixed', speaker: '沈青', text: '保留正常行距，也记下今天的日期。' }]
      : scene.dialogue.slice(0, 1);
  }
  return lines;
}
