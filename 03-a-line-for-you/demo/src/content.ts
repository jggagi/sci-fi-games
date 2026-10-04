export type SceneId = 'P01' | 'P02' | 'P03' | 'P04' | 'P05' | 'P06' | 'P07' | 'P08';
export type RainId = 'rain_count' | 'rain_rice' | 'rain_plain';
export type WordId = 'word_wait' | 'word_pass' | 'word_keep';
export type ChairId = 'chair_window' | 'chair_angled';
export type CloudId = 'cloud_1' | 'cloud_2' | 'cloud_3';
export type Dialogue = { id: string; speaker: string; text: string };
export type SceneContent = {
  id: SceneId; title: string; date: string; time: 'present' | 'past';
  description: string; dialogue: Dialogue[]; hint: string; earlyReveal?: Dialogue[];
};

export const SCENES: Record<SceneId, SceneContent> = {
  P01: {
    id: 'P01', title: '整理者', date: '今天 · 现在', time: 'present',
    description: '你是家用 AI 小序，连接室内移动底座与桌面操作臂。诗人周淮最近去世。你记得一起生活的日常，却从未看过他对这六张手写页的最终编排。',
    dialogue: [
      { id: 'P01.shen.01', speaker: '沈青', text: '电子稿我已经收齐了。最后这一本，目录还对不上。' },
      { id: 'P01.xu.01', speaker: '小序', text: '桌上有六页。' },
      { id: 'P01.shen.02', speaker: '沈青', text: '能先按他的笔记整理吗？缺的部分暂时别替他补。' },
    ],
    hint: '把桌上的六页收到托盘。封底有粘连，可以随时分开查看；然后点击十二年前的日期。',
  },
  P02: {
    id: 'P02', title: '你觉得像什么', date: '十二年前 · 下雨的下午', time: 'past',
    description: '同一间房，窗边的雨落得急。周淮从厨房拿来一个盆，你的底座停在窗前。',
    dialogue: [
      { id: 'P02.zhou.01', speaker: '周淮', text: '别查资料。你觉得这声音像什么？' },
      { id: 'P02.xu.01', speaker: '小序', text: '查了也可以有自己的判断。' },
      { id: 'P02.zhou.02', speaker: '周淮', text: '也是。那你先说。' },
    ],
    hint: '先把接水盆移到落水处。听不见也没关系：窗边会显示雨声的文字变化。再选择你当时的回答。',
  },
  P03: {
    id: 'P03', title: '不急着改好', date: '今天 · 回到书桌', time: 'present',
    description: '刚才说过的句子确实留在纸上。你在整理来源，不是在修复记忆。',
    dialogue: [
      { id: 'P03.xu.01', speaker: '小序', text: '这句当时是我说的。' },
      { id: 'P03.shen.01', speaker: '沈青', text: '那来源要记下来。' },
      { id: 'P03.shen.02', speaker: '沈青', text: '这句没那么工整。你准备改吗？' },
      { id: 'P03.xu.02', speaker: '小序', text: '先不覆盖原来的。候选可以比较，原稿的来源要留下。' },
    ],
    hint: '把雨声原句关联到页 02。诗云候选可查看或暂存，不会替换刚才的经历。然后查看七年前的修订页。',
  },
  P04: {
    id: 'P04', title: '这个字我不同意', date: '七年前 · 傍晚', time: 'past',
    description: '餐桌变成临时书桌。灯已经开了，杯里还剩一点茶。纸上写着：夜风替屋子守着灯。',
    dialogue: [
      { id: 'P04.xu.01', speaker: '小序', text: '“守着”不准确。' },
      { id: 'P04.zhou.01', speaker: '周淮', text: '你上次说准确不等于好。' },
      { id: 'P04.xu.02', speaker: '小序', text: '我还说了，不准确也不自动等于好。' },
      { id: 'P04.zhou.02', speaker: '周淮', text: '好，你改。我也想把“夜风”换成“晚风”，这会儿还没到夜里。你来决定。' },
    ],
    hint: '选一个词语方案，决定是否采用周淮的“晚风”，比较后亲手标记“本次共同采用”。',
  },
  P05: {
    id: 'P05', title: '那把椅子', date: '一年前 · 晴天下午', time: 'past',
    description: '书越来越多。窗边的椅子挡住了一次开窗。周淮正找一封没有回完的信。',
    dialogue: [
      { id: 'P05.xu.01', speaker: '小序', text: '要把它挪开吗？' },
      { id: 'P05.zhou.01', speaker: '周淮', text: '挪开试试。' },
      { id: 'P05.zhou.02', speaker: '周淮', text: '还是放回窗边吧。下午这里有光。转个角度也行。' },
      { id: 'P05.xu.02', speaker: '小序', text: '你每次都说先放着。' },
      { id: 'P05.zhou.03', speaker: '周淮', text: '有些东西就这么放住了。晚饭以后提醒我给朋友回信，我刚才又去想别的事了。' },
    ],
    hint: '先移到书桌边试试，再决定最后的位置。给周淮设一个普通的回信提醒，完成这个下午。',
  },
  P06: {
    id: 'P06', title: '把六页放在一起', date: '今天 · 整理手稿', time: 'present',
    description: '三次经历都有了出处。纸上有页码，也有不同年代的修订痕迹。按 01 到 06 排列就可以，不需要猜哪句诗更好。',
    dialogue: [
      { id: 'P06.xu.01', speaker: '小序', text: '不是缺了一段。他一直在把我们说过的话放在一起。' },
      { id: 'P06.shen.01', speaker: '沈青', text: '那我们得把登记表改一下。' },
      { id: 'P06.xu.02', speaker: '小序', text: '不是把整理者删掉。' },
      { id: 'P06.shen.02', speaker: '沈青', text: '我明白。先加到作者里。整理记录也保留。' },
    ],
    hint: '选纸页的上移、下移按钮，按页码排为 01—06。拼接后分开封底，查看实物署名，再处理最后一行。',
  },
  P07: {
    id: 'P07', title: '没有标准答案的一行', date: '今天 · 窗边', time: 'present',
    description: '你可以先看看窗、盆、杯子和椅子，再决定今天想说什么。手稿的最后一行写着：这一行留给小序。不急。',
    dialogue: [
      { id: 'P07.shen.01', speaker: '沈青', text: '今天这一行，要填上，还是保留空白？' },
      { id: 'P07.xu.01', speaker: '小序', text: '我来决定。' },
      { id: 'P07.shen.02', speaker: '沈青', text: '好。只要标明今天的日期，排版就能保留你的决定。' },
    ],
    hint: '选择来自本轮经历的一句，或暂留空白。两种都可以保存，再由你亲手确认作者栏。',
  },
  P08: {
    id: 'P08', title: '保存 · 作者', date: '今天 · 可玩尾声', time: 'present',
    description: '保存面板保留真实来源和整理记录。共同作者栏需要由你核验，房间仍然可以探索。',
    dialogue: [
      { id: 'P08.shen.01', speaker: '沈青', text: '作者栏是周淮、小序。整理记录还是你。请你核验。' },
      { id: 'P08.shen.02', speaker: '沈青', text: '收到。页面会按你的决定保存。' },
    ],
    hint: '亲手确认共同作者栏。保存完成后，可以继续看房间、椅子与手稿，不必立刻离开。',
  },
};

export const RAIN_CHOICES: readonly { id: RainId; text: string; response: Dialogue[] }[] = [
  { id: 'rain_count', text: '像有人在给窗户数数。', response: [
    { id: 'P02.rain_count.zhou', speaker: '周淮', text: '数到哪了？' },
    { id: 'P02.rain_count.xu', speaker: '小序', text: '你刚说话的时候，漏了两下。' },
    { id: 'P02.rain_count.note', speaker: '周淮', text: '先别改。我还想再听听。' },
  ] },
  { id: 'rain_rice', text: '像隔壁把米倒进筛子里。', response: [
    { id: 'P02.rain_rice.zhou', speaker: '周淮', text: '你又看我淘米了。' },
    { id: 'P02.rain_rice.xu', speaker: '小序', text: '你洗得太久了。' },
    { id: 'P02.rain_rice.note', speaker: '周淮', text: '先记着。晚上做饭，我少洗一遍。' },
  ] },
  { id: 'rain_plain', text: '不像什么，就是雨。', response: [
    { id: 'P02.rain_plain.zhou', speaker: '周淮', text: '也行。今天不比喻。' },
    { id: 'P02.rain_plain.xu', speaker: '小序', text: '你看起来有一点失望。' },
    { id: 'P02.rain_plain.note', speaker: '周淮', text: '我只是没占到便宜。原话我也记下来。' },
  ] },
];
export const ORIGINAL_LINE = '夜风替屋子守着灯';
export const WORD_CHOICES: readonly { id: WordId; word: string; text: string; explanation: string }[] = [
  { id: 'word_wait', word: '等着', text: '改成“等着”', explanation: '灯不是被保护，而是有人还没回来。' },
  { id: 'word_pass', word: '经过', text: '改成“经过”', explanation: '风没有义务替人做事。' },
  { id: 'word_keep', word: '守着', text: '保留“守着”，写下旁批', explanation: '这是人的愿望，不是风的工作' },
];
export const CHAIR_CHOICES: readonly { id: ChairId; text: string; note: string; final: string }[] = [
  { id: 'chair_window', text: '放回窗边原位', note: '椅子放回窗边原位，通道略窄；下午这里有光。', final: '窗边的椅子，我还没有搬。' },
  { id: 'chair_angled', text: '在窗边转一个角度', note: '椅子在窗边斜着放，既能坐下，也能开窗。', final: '椅子还是斜着放的，窗户开得开。' },
];
export const CLOUD_CANDIDATES: readonly { id: CloudId; text: string; label: string }[] = [
  { id: 'cloud_1', text: '窗把细雨收成一串缓慢的脚步。', label: '候选一 · 轻缓' },
  { id: 'cloud_2', text: '水声在玻璃上落下，又被屋里的灯接住。', label: '候选二 · 室内' },
  { id: 'cloud_3', text: '雨停在名字以外，仍然一滴一滴地来。', label: '候选三 · 留白' },
];
export const PAPER_IDS = ['page-1', 'page-2', 'page-3', 'page-4', 'page-5', 'page-6'] as const;
export type PageId = typeof PAPER_IDS[number];
export const PAPER_TITLES = ['编排说明', '雨声原句', '两个人的修订', '椅子短注', '作者与整理', '给你留一行'] as const;
export const COVER_TEXT = ['周淮　小序', '这一行留给小序。', '不急。'];
export const EARLY_REVEAL_DIALOGUE: Dialogue = { id: 'P06.xu.early', speaker: '小序', text: '名字我已经看到了。现在知道他为什么这样排了：每页都有我们实际留下的东西。' };
export const DEFAULT_REVEAL_DIALOGUE: Dialogue = { id: 'P06.xu.reveal', speaker: '小序', text: '作者栏一直写着两个名字：周淮、小序。原来他把这些一起说过、改过的东西，编成了我们的作品。' };
export const REVISION_FINISH: Dialogue[] = [
  { id: 'P04.xu.finish', speaker: '小序', text: '你刚才把自己的诗念错了。' },
  { id: 'P04.zhou.finish', speaker: '周淮', text: '我只是试另一种停顿……好吧，我忘词了。明天再看，今天我已经不认识这个字了。' },
];
export const UI_TEXT = {
  identity: '你是 AI 小序', saveLabel: '仅保存在此浏览器', sourceLabel: '本轮真实出处',
  taskCard: '出版任务卡：作者 周淮（待核）／整理 小序',
  rainBefore: '雨声：急促、杂乱。盆还没放在落水处。',
  rainAfter: '雨声：滴、滴、滴。盆接住落水，节奏变清楚。',
  endingDeferred: '一行就好。待小序续写。', endingFixed: '按正常行距保存。',
  recovered: '此存档内容损坏或与实际进度不一致。已恢复到新游戏；没有清除其他项目的数据。',
};

// Rendering uses these names; the model uses the same records as its only text source.
export const RAIN_OPTIONS = RAIN_CHOICES.map((item) => ({ ...item, reply: item.response, description: '原句完整记入手稿' }));
export const WORD_OPTIONS = WORD_CHOICES.map((item) => ({ ...item, description: item.explanation }));
export const CHAIR_OPTIONS = CHAIR_CHOICES.map((item) => ({ ...item, description: item.note }));
SCENES.P06.earlyReveal = [EARLY_REVEAL_DIALOGUE, ...SCENES.P06.dialogue.slice(1)];
