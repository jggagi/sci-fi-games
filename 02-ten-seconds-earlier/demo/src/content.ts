export type SceneId = 'M01' | 'M02' | 'M03' | 'M04' | 'M05' | 'M06' | 'M07' | 'M08';
export type AnchorId = 'night' | 'earlier' | 'mitigation' | 'family';
export type Category = 'fact' | 'information' | 'consequence';
export type EvidenceId = 'gate_action' | 'original_warning' | 'amended_report' | 'signature_scene' | 'mitigation_timeline' | 'witness_statement';
export type ReplyId = 'find' | 'space' | 'silent';

export interface Dialogue { speaker: string; text: string }
export interface Scene { id: SceneId; title: string; eyebrow: string; dialogue: Dialogue[]; instruction: string }
export interface Anchor {
  id: AnchorId; title: string; location: string; source: string; baseTime: string;
  minOffset: number; maxOffset: number; description: string;
}
export interface Evidence {
  id: EvidenceId; title: string; category: Category; source: string; time: string;
  description: string; anchorId: AnchorId | 'witness'; requiredOffset: number;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  fact: '行为事实', information: '当时掌握的信息', consequence: '后果与核对资料',
};

export const ANCHORS: Record<AnchorId, Anchor> = {
  night: {
    id: 'night', title: '事故当晚 · 关闭隔离闸', location: '地下枢纽 · 控制室',
    source: '事故重建委托 A-041；历史观察访问记录 H-N01', baseTime: '21:16:40',
    minOffset: -10, maxOffset: 10,
    description: '门体、控制键与两位值班人员在同一时间线上。只观察可见动作与可听声音。',
  },
  earlier: {
    id: 'earlier', title: '四十天前 · 风险报告', location: '地下枢纽 · 控制室',
    source: '事故重建委托 A-041；历史观察访问记录 H-R01；报告 R-17', baseTime: '10:04:12',
    minOffset: -12, maxOffset: 8,
    description: '同一控制室，墙上日程和值班表不同。工程员递报告，建议被修改，唐振声签字。',
  },
  mitigation: {
    id: 'mitigation', title: '当晚 · 危险扩散时间线', location: '地下枢纽 · 分区结构示意',
    source: '事故重建委托 A-041；隔离闸日志 G-2216 与疏散记录 E-09', baseTime: '21:16:50',
    minOffset: 0, maxOffset: 20,
    description: '结构示意只核对扩散时间和另一侧获得的疏散窗口，不模拟遗体或人物思想。',
  },
  family: {
    id: 'family', title: '十八年前 · 生日餐桌', location: '唐雯授权的家庭餐桌',
    source: '唐雯私人检索授权 P-B01；历史观察 F-1830（不是摄像机原片）', baseTime: '18:30:00',
    minOffset: -10, maxOffset: 10,
    description: '原家庭录像从 18:30:00 开始。观察器可在获授权范围内查看它之前真实发生的十秒。',
  },
};

export const EVIDENCE: Evidence[] = [
  {
    id: 'gate_action', title: '隔离闸的控制动作', category: 'fact', anchorId: 'night', requiredOffset: 0,
    source: 'H-N01 · 控制室视听；与 G-2216 控制日志交叉核对', time: '事故当晚 21:16:40',
    description: '唐振声听到“那一侧还有人”，随后亲手按下关闭控制键。动作真实；单凭这个动作不能判断所有前因。',
  },
  {
    id: 'original_warning', title: 'R-17 原始风险报告', category: 'information', anchorId: 'earlier', requiredOffset: -12,
    source: 'R-17 原件；匿名来源保护中，原件可核验；H-R01 递交现场', time: '事故前四十天 10:04:00',
    description: '原件记录结构异常数值，建议停下该段进行核查。工程员已把它递给唐振声并当面说明。',
  },
  {
    id: 'amended_report', title: 'R-17 修改版报告', category: 'fact', anchorId: 'earlier', requiredOffset: 0,
    source: 'R-17-B 存档副本；与 R-17 原件逐栏对照', time: '事故前四十天 10:04:12',
    description: '异常数值没有改变，建议栏从“停运核查”改成“持续观察”。进度压力可以解释决定背景，不能代替核查。',
  },
  {
    id: 'signature_scene', title: '修改建议后的签字现场', category: 'information', anchorId: 'earlier', requiredOffset: 0,
    source: 'H-R01 控制室视听；R-17-B 签名页', time: '事故前四十天 10:04:12',
    description: '工程员说“结果没有变”；唐振声翻看关键页后说“我签字”。说明他当时获得了警告，不能推测他的内心。',
  },
  {
    id: 'mitigation_timeline', title: '减灾窗口与未执行核查', category: 'consequence', anchorId: 'mitigation', requiredOffset: 8,
    source: 'G-2216 闸门日志、E-09 疏散记录、R-17 后续工作清单', time: '事故当晚 21:16:58；此前四十天',
    description: '关闭隔离闸延缓了另一侧危险扩散，争取疏散时间；事故前未实施原建议中的停运核查。具体损害因果和司法责任仍须专项判断。',
  },
  {
    id: 'witness_statement', title: '许宁授权的时间点证言', category: 'consequence', anchorId: 'witness', requiredOffset: 0,
    source: 'W-XN01 · 许宁本次核对许可；仅事故时间点与应急效果核对', time: '调查日 · 已获许可的通话',
    description: '许宁确认弟弟最后一次约定取回工具的联系时间为当晚 21:12:08（只核对时间戳，不含语音全文），以及闸门为另一侧争取时间这一可核对事实。私人语音全文、家庭生活细节不进入材料。',
  },
];

export const EVIDENCE_BY_ID = Object.fromEntries(EVIDENCE.map(item => [item.id, item])) as Record<EvidenceId, Evidence>;
export const CASE_EVIDENCE_IDS: EvidenceId[] = EVIDENCE.map(item => item.id);
export const FAMILY_ACTIONS = [
  { id: 'reach', label: '小唐雯伸手', from: -10, to: -9 },
  { id: 'block', label: '父亲拦住手', from: -8, to: -7 },
  { id: 'bowl', label: '把热碗移近自己', from: -6, to: -5 },
  { id: 'blow', label: '轻轻吹气', from: -4, to: -3 },
  { id: 'spoon', label: '把勺子给回她', from: -2, to: 0 },
] as const;
export type FamilyActionId = typeof FAMILY_ACTIONS[number]['id'];

export const REPLIES: Record<ReplyId, { label: string; response: string }> = {
  find: { label: '我们把那段找出来。', response: '唐雯把私人检索单拉到桌边：“好，就按原来的范围找。”' },
  space: { label: '你不用现在决定以后怎么见他。', response: '唐雯点头：“我现在还不想见他。但我想看看那个生日。”' },
  silent: { label: '安静地把私人检索单放到她面前。', response: '她没有被催着回答。过了一会儿，唐雯说：“生日那个，还能找吗？”' },
};

export const SCENES: Record<SceneId, Scene> = {
  M01: {
    id: 'M01', title: '不要替他写好话', eyebrow: '01 / 委托 · 工作室',
    dialogue: [
      { speaker: '林澈', text: '你希望我查清闸门为什么关闭。' },
      { speaker: '唐雯', text: '还有事故之前。他们为什么一直没有停下来检查。' },
      { speaker: '林澈', text: '这部分可能对你父亲更不利。' },
      { speaker: '唐雯', text: '那就写进去。生日录像和事故没有关系，找到以后，单独给我就行。' },
    ], instruction: '确认两个独立资料范围：事故调查与私人生日检索。匿名报告原件 R-17 可核验；来源保护中。',
  },
  M02: {
    id: 'M02', title: '一只确实按下去的手', eyebrow: '02 / 历史观察 · 事故当晚',
    dialogue: [
      { speaker: '值班员', text: '那一侧还有人！' },
      { speaker: '唐振声', text: '等不到了，关！' },
      { speaker: '林澈', text: '闸是他亲手关的。' },
      { speaker: '唐雯', text: '我知道。你再看前面。' },
    ], instruction: '用播放、逐秒或精确退十秒核对动作。记录线索，再按行为事实、当时掌握的信息、后果归类。三个事故节点可自由交换顺序。',
  },
  M03: {
    id: 'M03', title: '已经知道的事', eyebrow: '03 / 同一控制室 · 四十天前',
    dialogue: [
      { speaker: '工程员', text: '只换监测点不够。至少要把那一段停下来查。' },
      { speaker: '唐振声', text: '现在停，整条线都要重新排。先记观察，别写成停运建议。' },
      { speaker: '工程员', text: '结果没有变。' },
      { speaker: '唐振声', text: '我签字。' },
      { speaker: '唐雯', text: '原版也放进去。别只剩一张签字。' },
    ], instruction: '核验原始警告、修改版、签字现场和减灾时间线。前期失责与当晚减灾分别保留，不能互相覆盖。',
  },
  M04: {
    id: 'M04', title: '被遗漏的人', eyebrow: '04 / 已获同意的证言核对',
    dialogue: [
      { speaker: '许宁', text: '我只同意核对事故有关的时间点和应急效果。那段私人语音，不要整段放进报告。' },
      { speaker: '林澈', text: '你提供的时间戳是当晚 21:12:08，只核对这个时间，对吗？' },
      { speaker: '许宁', text: '对，那是他约我周末取工具的联系时间。其他内容不要记录。那道闸确实帮另一边的人争取了时间，这件事可以写。' },
      { speaker: '林澈', text: '你不介意？' },
      { speaker: '许宁', text: '是真的就写。前面的事也一样。' },
      { speaker: '唐雯', text: '后续材料，我会继续补齐。' },
      { speaker: '许宁', text: '交给调查组就好。你不用向我解释你们家里以前是什么样。' },
    ], instruction: '明确接受有限许可后，记录并归类证言。私人语音全文与家庭细节不在授权范围内。',
  },
  M05: {
    id: 'M05', title: '是我交出去的', eyebrow: '05 / 来源核验 · 她主动披露',
    dialogue: [
      { speaker: '唐雯', text: '你不用先让我好受一点。最开始那份报告，是我交出去的。' },
      { speaker: '林澈', text: '你当时就知道？' },
      { speaker: '唐雯', text: '不全知道。所以才需要查。他后来知道是我了。' },
      { speaker: '唐雯', text: '我不想你先猜我为什么这么做，再决定那份报告该不该信。' },
      { speaker: '唐雯', text: '我知道我没有做错。可是，我是不是连想他一下，都不应该了？' },
    ], instruction: '由唐雯主动给出提交回执 R-17，授权来源核验附页。私人检索仍需她另行授权。',
  },
  M06: {
    id: 'M06', title: '镜头正式开始以后', eyebrow: '06 / 私人授权 · 十八年前',
    dialogue: [
      { speaker: '亲戚', text: '看镜头——生日快乐！' },
      { speaker: '林澈', text: '是这一年吗？你想保存从哪里开始？' },
      { speaker: '唐雯', text: '是。再往前一点。' },
    ], instruction: '从 18:30:00 精确退十秒到 18:29:50，再播放或逐秒看完。生日十秒只属于私人检索，不是免责附件。',
  },
  M07: {
    id: 'M07', title: '两个保存，都是真的', eyebrow: '07 / 导出桌 · 分开保存',
    dialogue: [
      { speaker: '林澈', text: '案件材料保留完整的前期责任和当晚应急行为。私人十秒，只给你，不附在报告里。可以吗？' },
      { speaker: '唐雯', text: '可以。文件名就叫“爸爸”。' },
      { speaker: '林澈', text: '你接下来会去见他吗？' },
      { speaker: '唐雯', text: '还不知道。' },
      { speaker: '林澈', text: '好。' },
    ], instruction: '两份虚拟文件分别确认保存，顺序可交换。提交材料不会判定有罪无罪；保存私人片段不要求原谅。',
  },
  M08: {
    id: 'M08', title: '把声音关小一点', eyebrow: '08 / 可重播的余韵',
    dialogue: [
      { speaker: '唐雯', text: '能再听一次吗？声音小一点就好。' },
      { speaker: '唐振声', text: '烫，等一下。' },
    ], instruction: '走廊里有人经过，生活继续。案件包仍已提交；“爸爸”仍单独保存。可以重播、暂停，或留在工作台。',
  },
};

export function formatTime(anchorId: AnchorId, offset: number): string {
  const [hour, minute, second] = ANCHORS[anchorId].baseTime.split(':').map(Number);
  const total = hour * 3600 + minute * 60 + second + offset;
  return [Math.floor(total / 3600) % 24, Math.floor(total / 60) % 60, total % 60].map(n => String(n).padStart(2, '0')).join(':');
}
