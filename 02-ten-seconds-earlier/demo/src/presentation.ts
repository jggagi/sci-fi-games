import { SCENES, type Dialogue, type SceneId } from './content';

export const SOURCE_INTRO: Dialogue[] = [
  { speaker: '林澈', text: '材料核验已完成。这份摘要，怎么写？' },
  { speaker: '唐雯', text: '先把事实写完整。' },
];
export const MITIGATION_DIALOGUE: Dialogue[] = [
  { speaker: '林澈', text: '闸门日志和疏散记录能核对当晚争取的时间。原建议中的核查没有执行，也要分别记录。' },
  { speaker: '唐雯', text: '两件事都写进去。' },
];

// Captions describe only visible action, sound, or the present-day conversation.
// Time is an offset from the fixed source anchor, never a guessed mental state.
export function frameCaption(kind: string, t: number, sceneId: SceneId): [string, string] {
  if (kind === 'family') {
    if (t < -8) return ['餐桌旁', '小唐雯伸手去拿刚出锅的碗。'];
    if (t < -6) return ['唐振声', '烫，等一下。'];
    if (t < -4) return ['餐桌旁', '他把热碗拉近自己。'];
    if (t < -2) return ['餐桌旁', '他轻轻吹气，小唐雯还等着她的勺子。'];
    if (t < 0) return ['餐桌旁', '他把勺子给回她，另一只手仍扶着碗。'];
    return ['亲戚', t === 0 ? '看镜头——生日快乐！' : '要拍了，看这里。'];
  }
  if (kind === 'night') return t < 0 ? ['值班员', '那一侧还有人！'] : t < 3 ? ['唐振声', '等不到了，关！'] : ['控制室', '隔离闸落下，日志记录关闭动作。'];
  if (kind === 'earlier') return t < -4 ? ['工程员', '至少要把那一段停下来查。'] : t < 0 ? ['唐振声', '先记观察，别写成停运建议。'] : ['唐振声', '我签字。'];
  if (kind === 'mitigation') return ['结构示意', t < 8 ? '对照闸门日志和另一侧疏散时间；等待时间点对齐。' : '关闭闸门争取了疏散窗口。前期未执行的核查仍保留在清单中。'];
  if (kind === 'call') return ['许宁', '是真的就写。前面的事也一样。'];
  if (kind === 'door') return ['唐雯', '能再听一次吗？声音小一点就好。'];
  return ['工作室', sceneId === 'M01' ? '她把袋子从椅子上拿开，给你留出位置。' : '两份清单仍各自放在桌上。'];
}

export function dialogueFor(sceneId: SceneId, anchorId: string | null, disclosed: boolean): Dialogue[] {
  if (sceneId === 'M05' && !disclosed) return SOURCE_INTRO;
  if (sceneId === 'M02' || sceneId === 'M03') return anchorId === 'earlier' ? SCENES.M03.dialogue : anchorId === 'mitigation' ? MITIGATION_DIALOGUE : SCENES.M02.dialogue;
  return SCENES[sceneId].dialogue;
}
