/** 原创演出文字；科学装置是故事内的确定性玩具模型，不是真实物理理论。 */
export type SceneId = 'D01' | 'D02' | 'D03' | 'D04' | 'D05' | 'D06' | 'D07' | 'D08A' | 'D08B';

export interface SceneContent {
  id: SceneId;
  era: 'present' | 'young' | 'middle' | 'recent' | 'morning';
  eyebrow: string;
  title: string;
  location: string;
  description: string;
  lines: { id: string; speaker: string; text: string }[];
}

export const scenes: Record<SceneId, SceneContent> = {
  D01: {
    id: 'D01', era: 'present', eyebrow: '现在 · 林予', title: '要问得准确一点',
    location: '同一间实验室 · 午后',
    description: '墙上的白板换过几次，靠窗的旧脉冲盒一直没丢。程砚拿起一根接线，眯着眼找标签。桌上是两只不同年代的茶杯，和刚收到的资格说明。',
    lines: [
      { id: 'd01-question', speaker: '程砚', text: '你把问题写下来了吗？' },
      { id: 'd01-versions', speaker: '林予', text: '有三个版本。字最少的那个，意思反而最不清楚。' },
      { id: 'd01-title', speaker: '程砚', text: '那先别选最像论文标题的。先记下你到底在意哪一件事。' },
      { id: 'd01-his-question', speaker: '林予', text: '你当时想问什么？' },
      { id: 'd01-same-question', speaker: '程砚', text: '差不多也是那个问题。只是问得很大。' },
      { id: 'd01-did-not-go', speaker: '林予', text: '后来也没去。' },
      { id: 'd01-agree', speaker: '程砚', text: '嗯。后来没去。' },
      { id: 'd01-old-box', speaker: '林予', text: '先接上这只旧盒子吧。第一次看见输出变了的时候，我们还没有第二张桌子。' },
    ],
  },
  D02: {
    id: 'D02', era: 'young', eyebrow: '三十六年前 · 林予', title: '再按一次',
    location: '同一间实验室 · 刚开始合作',
    description: '一张挤满仪器的工作台，一块还很干净的白板。端口贴着手写的“左”和“右”。记录笔只有一支，此刻压在程砚的袖子下面。你们还只是合作者。',
    lines: [
      { id: 'd02-pen', speaker: '林予', text: '我的笔呢？' },
      { id: 'd02-pen-reply', speaker: '程砚', text: '如果你是说刚才我借的那支……找到了。' },
      { id: 'd02-measure', speaker: '林予', text: '先记输入，再记输出。这次不要等到收拾桌子时才凭印象补。' },
      { id: 'd02-controls', speaker: '程砚', text: '两次输入算一轮。你定端口，我看记录。盒子自己安排间隔，不用抢着按。' },
    ],
  },
  D03: {
    id: 'D03', era: 'middle', eyebrow: '二十年前 · 林予', title: '昨天的解释不够了',
    location: '同一间实验室 · 仪器换了一代',
    description: '输出灯旁多了数字读数，记录笔终于不止一支。桌角压着洗衣机维修预约，两人的茶杯碰得掉了釉。旧盒子的输入端口仍然叫“左”和“右”。',
    lines: [
      { id: 'd03-appointment', speaker: '林予', text: '你说你下午去接人。' },
      { id: 'd03-instrument', speaker: '程砚', text: '我说的是接仪器。维修师傅不是约在家里吗？' },
      { id: 'd03-which', speaker: '林予', text: '那我们现在缺的到底是哪一个？先写下来，别又都以为对方会去。' },
      { id: 'd03-check', speaker: '程砚', text: '写了。现在回到盒子：以前只试过很近的两次输入。今天把间隔也记进表里。' },
      { id: 'd03-test', speaker: '林予', text: '昨天的解释如果真能用，就该经得住换个条件。' },
    ],
  },
  D04: {
    id: 'D04', era: 'recent', eyebrow: '几年前 · 林予', title: '把方法和解释分开',
    location: '同一间实验室 · 新的记录台',
    description: '沈翎带来另一种结构的虚构装置记录。她沿用了你们的校准步骤，也把更宽的测量范围标得很清楚。旧接线旁是新的归档夹。',
    lines: [
      { id: 'd04-method', speaker: '沈翎', text: '步骤用的是你们那一版。我改了记录间隔，也重做了校准。' },
      { id: 'd04-explanation', speaker: '林予', text: '所以我们那条“增强只能由旧盒子的并列端口结构产生，换个结构就会消失”的解释，还是不成立。' },
      { id: 'd04-scope', speaker: '沈翎', text: '在这份记录的范围内不成立。其他装置也有相似的时间边界，但这还不能说明终极原因。' },
      { id: 'd04-no-face', speaker: '程砚', text: '好，写清范围。不要替我们留面子。校准步骤能用，猜想该改，就分开放。' },
      { id: 'd04-local', speaker: '林予', text: '我们找到的是这只盒子的局部规则。知道怎样重复一个现象，和知道为什么会有它，还隔着很远。' },
      { id: 'd04-tomorrow', speaker: '沈翎', text: '明天能来取完整记录吗？时间不方便的话，我再约。' },
      { id: 'd04-ask-first', speaker: '程砚', text: '我得先问林予。她整理哪些，我们就交哪些。' },
    ],
  },
  D05: {
    id: 'D05', era: 'present', eyebrow: '现在 · 林予', title: '是没去，不是没能去',
    location: '实验室 · 旧档案盒',
    description: '为了核验初次开放答疑时的测量范围，你需要看旧档案。程砚将自己的纸盒放到桌上，打开扣子。回执的日期在你们初次共同实验之后、下一次实验之前。',
    lines: [
      { id: 'd05-permission', speaker: '程砚', text: '这是我的档案。可以看，包括下面的资格文件。' },
      { id: 'd05-check', speaker: '林予', text: '我只想先对一下当时的测量日期。' },
      { id: 'd05-receipt', speaker: '记录', text: '资格确认与主动撤回回执收在一起。姓名：程砚。撤回由本人提出，已受理。' },
      { id: 'd05-selected', speaker: '林予', text: '你入选了。' },
      { id: 'd05-yes', speaker: '程砚', text: '嗯。' },
      { id: 'd05-there', speaker: '林予', text: '你都走到那里了？' },
      { id: 'd05-desk', speaker: '程砚', text: '到登记处了。后来撤回，没有接受交换。' },
      { id: 'd05-not-go', speaker: '林予', text: '你一直说没去。' },
      { id: 'd05-not-go-reply', speaker: '程砚', text: '后来确实没去。但那句话没有把这件事说清楚。' },
    ],
  },
  D06: {
    id: 'D06', era: 'present', eyebrow: '现在 · 林予', title: '不是一张要偿还的账单',
    location: '实验室外 · 小走廊',
    description: '走廊比室内安静。远处一盏常亮的灯，门缝里仍能看见实验台。没有最后一餐，也没有替你写好的决定。',
    lines: [
      { id: 'd06-still-want', speaker: '林予', text: '我今天还是很想知道。知道那个我们总也说不清楚的原因。' },
      { id: 'd06-know', speaker: '程砚', text: '我知道。我也没有不想。' },
      { id: 'd06-two-things', speaker: '林予', text: '那我得把两件事分开问。你有没有后悔过；还有，你现在希望我怎么办。' },
    ],
  },
  D07: {
    id: 'D07', era: 'present', eyebrow: '现在 · 林予', title: '问题与时间',
    location: '实验室 · 确认前',
    description: '研究资料已经按核验记录、猜想与未完成项交接。资格说明重新摊在桌上。你可以回看，没有倒计时，也没有实验成绩替你作决定。',
    lines: [
      { id: 'd07-own-choice', speaker: '林予', text: '这次由我确认。不是替哪一次过去的决定打分。' },
      { id: 'd07-confirm', speaker: '程砚', text: '你可以先检查记录。确认以前，都还可以回来。' },
      { id: 'd07-distinction', speaker: '记录', text: '提交的是仍未解答的科学问题与适用范围。脉冲盒的可检验局部规则已归档；它不是终极问题的答案。' },
    ],
  },
  D08A: {
    id: 'D08A', era: 'morning', eyebrow: '第二天早上 · 你仍是林予', title: '递过去一根线',
    location: '同一间实验室 · 新的晨光',
    description: '工作台与昨天几乎一样。没有庆祝。程砚把记录表推到你这边，留出写字的位置。两根线都有清楚的标签，旧盒子还等着下一轮输入。',
    lines: [
      { id: 'd08a-yesterday', speaker: '程砚', text: '昨天那个办法不对。' },
      { id: 'd08a-know', speaker: '林予', text: '我知道。我还是想知道。' },
      { id: 'd08a-cable', speaker: '程砚', text: '那先把这轮的输入线递过来。今天记间隔，也记没能解释的地方。' },
      { id: 'd08a-not-reward', speaker: '林予', text: '撤回不会让盒子替我们给答案。还是得一个条件一个条件地试。' },
    ],
  },
  D08B: {
    id: 'D08B', era: 'morning', eyebrow: '第二天早上 · 你现在是程砚', title: '还没有人回答的那一栏',
    location: '同一间实验室 · 另一把椅子空着',
    description: '视角已经切换为程砚。林予接受了交换，没有回来，也没有答案传回。你把一根线放到空着的那一侧，停一下，自己重新接好。沈翎来取约定的资料。',
    lines: [
      { id: 'd08b-today', speaker: '沈翎', text: '今天还做吗？' },
      { id: 'd08b-scope', speaker: '程砚', text: '先把她交代的范围核一遍。已经测过的归档，猜想照旧标着猜想。' },
      { id: 'd08b-empty', speaker: '沈翎', text: '答案那一栏呢？' },
      { id: 'd08b-no-answer', speaker: '程砚', text: '留空。她没有传回。不能因为她去了，就把我们希望的东西填进去。' },
      { id: 'd08b-may-stop', speaker: '程砚', text: '今天可以只归档，也可以测一轮。我还没决定。先把线放好。' },
    ],
  },
};

/** 操作后展示；不预写任何玩家未实际产生的端口结果。 */
export const dialogue: Record<string, { speaker: string; text: string }[]> = {
  d02Observed: [
    { speaker: '林予', text: '输出变了。是端口的缘故，还是因为这是第二次输入？' },
    { speaker: '程砚', text: '先留一个解释，再挑一轮最可能让它出错的试验。记录不会因为我们改口就消失。' },
  ],
  d02Revised: [
    { speaker: '林予', text: '这组反例让“右侧天然更强”站不住了。端口不同，不能单独解释变化。' },
    { speaker: '程砚', text: '至少在今天试过的范围里，得考虑前面那次输入。把被否定的解释也留下。' },
  ],
  d02Closing: [
    { speaker: '记录', text: '程砚把两人的记录夹进同一本笔记。下周日程有一个他没解释的空白。' },
    { speaker: '林予', text: '你明天来吗？我想把间隔拉长试试。' },
    { speaker: '程砚', text: '来。你别先把线都拔了。' },
  ],
  d03Observed: [
    { speaker: '林予', text: '把这一轮和短间隔的记录并排看。以前那张模型卡，还能解释两边吗？' },
    { speaker: '程砚', text: '如果解释不了，就改卡，不改记录。时间也是我们亲手改变的一个条件。' },
  ],
  d03Revised: [
    { speaker: '林予', text: '只记“之前按过”不够。得记那次输入距离现在有多久。' },
    { speaker: '程砚', text: '有了可重复的局部规则，还不能说我们知道它为什么这样。' },
    { speaker: '林予', text: '你白板上那句话，只是把现象换了个说法。' },
    { speaker: '程砚', text: '我知道不够。我想先整理给别人复核，不是说原因已经找到了。' },
    { speaker: '林予', text: '那就把这点写进结论。下午还得有人回家等维修。' },
    { speaker: '程砚', text: '我回去。明天换个办法，再试一次。' },
  ],
  d04Filed: [
    { speaker: '沈翎', text: '校准步骤收进可复用方法；旧解释收进被反例否定的猜想。两个文件不互相抵消。' },
    { speaker: '林予', text: '把问题写窄一点，才看得清我们还不知道什么。不是白做，也不是终于证明我们对了。' },
  ],
  d05Asked: [
    { speaker: '林予', text: '我一直以为你没拿到资格。为什么没和我说清楚？' },
    { speaker: '程砚', text: '你那时没往下问，我也没有接着说。后来就一直说“没去”。现在看，是没说清楚。那不是落选，是我主动撤回。' },
    { speaker: '林予', text: '我没有往下问，不等于你可以一直省掉这一段。' },
    { speaker: '程砚', text: '是。你现在问，我应该把它讲完整。' },
    { speaker: '林予', text: '为什么回来？' },
    { speaker: '程砚', text: '你说第二天把间隔拉长。' },
    { speaker: '林予', text: '就因为那个？' },
    { speaker: '程砚', text: '不只那个。我还想再做一点，还想看看接下来的日子。当时不知道后来会是我们俩。' },
    { speaker: '记录', text: '那根没有拔掉的线仍是一次普通的工作安排。它不是预先知道一生的承诺。' },
  ],
  d06Regret: [
    { speaker: '林予', text: '后悔过吗？' },
    { speaker: '程砚', text: '有。' },
    { speaker: '程砚', text: '有几年，实验怎么做都不对。我会想，要是当时去了，至少能知道。' },
    { speaker: '林予', text: '你没有跟我说过。' },
    { speaker: '程砚', text: '也说过一点。说得像在抱怨仪器。那样省事，但你听不出我在说什么。' },
  ],
  d06Wish: [
    { speaker: '林予', text: '那我现在——' },
    { speaker: '程砚', text: '我当然希望明天你还在。这是我的愿望。' },
    { speaker: '程砚', text: '但不要为了替我证明当年选得对，就照着我选一次。那不是一张要你偿还的账单。' },
    { speaker: '林予', text: '我会自己决定。先把资料分好：测过的、猜的、还没有做的，都得写清楚。' },
  ],
  withdrawn: [
    { speaker: '回执', text: '林予，本次资格已由本人撤回。决定已确认。' },
    { speaker: '林予', text: '我还是想知道。' },
    { speaker: '程砚', text: '我知道。' },
    { speaker: '林予', text: '明天先试间隔那一组。' },
  ],
  accepted: [
    { speaker: '回执', text: '林予，问题与范围已提交，本人确认接受交换。生命代价不可撤销。' },
    { speaker: '林予', text: '记录就交到这里。剩下的空栏，不要替我补。' },
    { speaker: '叙述', text: '在虚构交换中，林予获得了超越既有模型的解释。那份理解没有传回。这一幕不提供公式，也不声称解答了现实的宇宙问题。' },
    { speaker: '叙述', text: '此后是第二天早上。你将成为留下来的程砚。' },
  ],
  morningA: [
    { speaker: '林予', text: '白板上的旧解释擦掉，记录保留。下一问要更准确，不能把看见边界当作知道原因。' },
    { speaker: '程砚', text: '这次你记？' },
    { speaker: '林予', text: '我记。下一轮，从第一次输入开始。' },
    { speaker: '记录', text: '没有终极答案落在桌上。新的实测记录添在旧记录后面，明天仍然是一个可以改办法的日子。' },
  ],
  morningB: [
    { speaker: '沈翎', text: '核验记录、猜想、未完成项，我会按原来的类别收。' },
    { speaker: '程砚', text: '好。未完成的就是未完成，不要用一个漂亮的结论盖住它。' },
    { speaker: '记录', text: '程砚亲手核对留下的资料。终极问题的答案一栏仍然空着。今天的归档或测量，都是他自己的劳动，无法抵消另一把空椅子。' },
  ],
};

export const questions: { id: string; label: string; description: string }[] = [
  {
    id: 'local-mechanism', label: '这只装置为什么这样响应？',
    description: '先关注可检验的局部机制：输入改变了什么，哪些条件会改变输出。这个关注点不会替你决定是否接受交换。',
  },
  {
    id: 'shared-structure', label: '几种实验之间有什么共同结构？',
    description: '关注不同虚构装置的相似与差异。重复现象可以给出线索，还不足以证明统一的解释。',
  },
  {
    id: 'shared-scale', label: '为什么不同装置出现相似的尺度？',
    description: '关注更远的原因。盒子的间隔规则只是局部证据，这个科学问题仍然开放。',
  },
];

export const conditions: string[] = [
  '这是故事内的虚构机会：排险者可以回答你提出的科学问题，交换的代价是生命。',
  '接受交换前可以撤回资格、检查问题与资料。最终确认没有倒计时；确认接受交换后不可撤回。',
  '没有事后存活、复活或偷偷把答案传回的办法。留下者只能得到你已经完成并交接的记录。',
  '实验记录与假设修订不会产生人生评分，不会自动选择结局。两种决定均由你单独确认。',
];

export const help: { D02: string[]; D03: string[] } = {
  D02: [
    '先看记录中的输入与输出。下一轮只改一个条件，会比较容易分清哪件事可能起作用。',
    '如果怀疑端口，你可以交换两次输入的顺序，或让两次都走同一个端口。所有记录都能回看。',
    '寻找能让自己解释出错的结果。只看符合解释的那一轮，还不能区分“端口”和“先后输入”。',
    '短间隔下，试试左→左或右→左。若“右侧天然更强”解释不了实际记录，就把它标为被反例否定，再提出包含输入历史的解释。',
  ],
  D03: [
    '先选一个还没试过的间隔，再执行两次输入。这里的“单位”是虚构装置的离散间隔；设定后由装置安排，无需真实等待或抢按。',
    '保持端口不变，分别测试较短和较长的间隔。比较输出时，也把间隔那一栏一起读。',
    '间隔1、2与间隔3、4可以形成一组对照。“之前按过”是否足以解释它们？',
    '这个虚构盒子的局部模型是：每轮首脉冲为1；次脉冲间隔小于3单位为2，达到3单位为1。端口无关，每轮重置。这描述了重复观察，不是终极原因。',
  ],
};

export const handoffCards: {
  id: 'records' | 'conjecture' | 'unfinished';
  title: string;
  body: string;
  category: 'fact' | 'conjecture' | 'unfinished';
}[] = [
  {
    id: 'records', title: '已核验的实测记录', category: 'fact',
    body: '交接玩家实际完成的两次输入记录、端口、间隔与输出，以及仍可复用的校准步骤。只对记录覆盖的范围负责；旧实验不会因之后的选择变成新的结果。',
  },
  {
    id: 'conjecture', title: '有边界的猜想', category: 'conjecture',
    body: '保留提出与修订过的解释、反例和适用范围。被否定的旧解释标明原因；不同装置的相似时间尺度仍是线索，不归入已证明事实。',
  },
  {
    id: 'unfinished', title: '尚未完成的工作', category: 'unfinished',
    body: '更宽范围的重复测量、独立复核与终极原因仍待完成。把任务写清楚，答案栏留空。接受交换也不会让未传回的理解自动写进这些资料。',
  },
];
