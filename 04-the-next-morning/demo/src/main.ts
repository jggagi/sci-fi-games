import './style.css';
import { scenes, dialogue, questions, conditions, help, handoffCards, type SceneId } from './content';
import { evaluateTrial, type TrialInput } from './experiment';
import { canAdvance, hasComparison, hasTimeEvidence, handoffComplete, newState, reduceState, sceneTrials, type Action, type Category, type State } from './state';
import { clearSave, defaultPreferences, loadSave, saveGame, type Preferences } from './storage';
import { laboratoryScene } from './scene';

const app = document.querySelector<HTMLDivElement>('#app')!;
let state: State = newState();
let preferences: Preferences = defaultPreferences();
const browserStorage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
  removeItem: (key: string) => window.localStorage.removeItem(key),
};
let loaded = loadSave(browserStorage);
if (loaded.kind === 'valid') preferences = loaded.save.preferences;
let playing = false;
let settingsOpen = false;
let restartOpen = false;
let conditionsRead = false;
let hintLevel = 0;
let notice = '';
let storageFailed = false;
let lastScene: SceneId | null = null;
const typed = new Set<string>();
let timers: number[] = [];
const escape = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const portName = (s: string) => s === 'left' ? '左' : '右';
const categoryNames: Record<Category, string> = { fact: '核验事实', conjecture: '猜想（含反例）', unfinished: '未完成项' };
function button(id: string, label: string, disabled = false, kind = ''): string {
  return `<button type="button" data-testid="${id}" class="${kind}" ${disabled ? 'disabled' : ''}>${label}</button>`;
}
function persist(): void {
  if (!playing) return;
  storageFailed = !saveGame(browserStorage, { state, preferences });
  if (!storageFailed) loaded = { kind: 'valid', save: { state, preferences } };
}
function act(action: Action, rerender = true): void {
  const from = state.sceneId;
  state = reduceState(state, action);
  if (state.sceneId !== from) { hintLevel = 0; notice = ''; }
  persist();
  if (rerender) render();
}
function lineHtml(lines: { speaker: string; text: string; id?: string }[], prefix: string): string {
  return lines.map((line, i) => `<p class="line"><span class="speaker">${escape(line.speaker)}</span><span class="spoken" data-line="${line.id || `${prefix}-${i}`}" data-full="${escape(line.text)}">${escape(line.text)}</span></p>`).join('');
}
const exchangeTerms = () => `<div class="terms"><p class="section-label">资格说明 · 虚构交换</p>${conditions.map(s => `<p>${escape(s)}</p>`).join('')}</div>`;
function settings(): string {
  return `<dialog id="settings-dialog" aria-labelledby="settings-title"><h2 id="settings-title">阅读与操作</h2>
    <label class="setting"><input type="checkbox" data-testid="option-muted" ${preferences.muted ? 'checked' : ''}> 静音</label>
    <label class="setting"><input type="checkbox" data-testid="option-typewriter" ${preferences.typewriter ? 'checked' : ''}> 打字效果（可立即显示）</label>
    <label class="setting"><input type="checkbox" data-testid="option-motion" ${preferences.reducedMotion ? 'checked' : ''}> 减弱动态</label>
    <label class="setting"><input type="checkbox" data-testid="option-static" ${preferences.staticPulse ? 'checked' : ''}> 静态脉冲显示</label>
    <p class="muted">间隔由装置执行，不需等待、抢按或拖拽。数字、文字与灯同时呈现输出。</p>
    ${button('settings-close', '返回', false, 'primary')}</dialog>`;
}
function records(): string {
  return `<section class="records" aria-labelledby="records-title"><div class="section-heading"><h2 id="records-title">实验记录</h2><span>${state.trialHistory.length.toString().padStart(2, '0')} 轮 · 原始记录保留</span></div>
    ${state.trialHistory.length ? `<div class="table-scroll" tabindex="0" aria-label="可滚动的实验记录"><table data-testid="trial-history"><caption class="sr-only">每一轮均重置。输出为第一和第二脉冲亮度。</caption><thead><tr><th scope="col">时期 / 轮次</th><th scope="col">输入</th><th scope="col">间隔</th><th scope="col">输出</th></tr></thead><tbody>${state.trialHistory.map(t => `<tr data-testid="trial-row"><th scope="row">${escape(t.date)}<small>#${t.id.split('-')[1]}</small></th><td>${portName(t.first)} → ${portName(t.second)}</td><td>${t.interval} 单位</td><td><b>1 → ${t.output[1]}</b></td></tr>`).join('')}</tbody></table></div>` : '<p class="empty-note">记录本还没有这一页。两次输入之后，完整的一轮会留在这里。</p>'}
  </section>`;
}
function hypotheses(): string {
  const labels = { port: '右端口天然更强', second: '只要是第二次输入，就会更亮', timing: '次脉冲的响应取决于两次输入的间隔，端口无关' };
  return `<section class="hypotheses"><h2>解释卡</h2>${state.hypotheses.length ? state.hypotheses.map(h => `<article class="hypothesis ${h.status}"><span class="tag">${h.status === 'refuted' ? '被实际反例否定' : '暂存 · 仅适用于已测范围'}</span><p>${labels[h.model]}</p><small>证据：${h.evidenceIds.map(id => `#${id.split('-')[1]}`).join('、') || '等待观察'}</small></article>`).join('') : '<p class="muted">先做一轮，再提出解释。记录与解释会分开放。</p>'}</section>`;
}
function experiment(): string {
  const scene = state.sceneId;
  const permitted = (scene === 'D02' || scene === 'D03') || (state.wireConnected && (scene === 'D08A' || state.today === 'measure'));
  const locked = state.pulse !== 0;
  const output = state.pulse ? evaluateTrial(state.planned)[state.pulse === 1 ? 0 : 1] : 0;
  return `<section class="experiment" aria-labelledby="experiment-title"><div class="section-heading"><h2 id="experiment-title">两次输入，一轮试验</h2><span class="tag">虚构装置</span></div>
    <p class="muted">间隔以装置的离散单位设置。第二次按下时，盒子按设定安排输入；点击速度不影响结果。</p>
    <div class="trial-settings"><label>第一脉冲端口<select data-testid="first-port" ${locked ? 'disabled' : ''}><option value="left" ${state.planned.first === 'left' ? 'selected' : ''}>左端口</option><option value="right" ${state.planned.first === 'right' ? 'selected' : ''}>右端口</option></select></label>
      <label>第二脉冲端口<select data-testid="second-port" ${locked ? 'disabled' : ''}><option value="left" ${state.planned.second === 'left' ? 'selected' : ''}>左端口</option><option value="right" ${state.planned.second === 'right' ? 'selected' : ''}>右端口</option></select></label>
      <label>两次输入间隔<select data-testid="interval" ${locked || scene === 'D02' ? 'disabled' : ''}>${[1, 2, 3, 4].map(i => `<option value="${i}" ${state.planned.interval === i ? 'selected' : ''}>${i} 单位</option>`).join('')}</select></label></div>
    <div class="pulse-display ${preferences.staticPulse || preferences.reducedMotion ? 'static' : 'animated'}" data-testid="pulse-output" role="status" aria-live="polite"><span class="output-light level-${output}"></span><div><span class="section-label">${state.pulse === 0 ? '每轮重置 · 无历史输入' : state.pulse === 1 ? '第一脉冲 · 已输入' : '第二脉冲 · 本轮已记录'}</span><strong>${output === 0 ? '等待输入' : `亮度 ${output}`}</strong></div><span class="readout">${output === 0 ? '—' : `0${output}`}</span></div>
    <div class="button-row">${button('pulse-first', '① 发出第一脉冲', state.pulse !== 0 || !permitted, 'primary')}${button('pulse-second', '② 发出第二脉冲', state.pulse !== 1 || !permitted, 'primary')}${button('trial-reset', state.pulse === 1 ? '放弃本轮并重置' : '重置，开始新一轮', state.pulse === 0)}</div>
    <p class="micro-note">每轮只包含两次输入。设定在输入后锁定；可重置重做，完整记录不会被删除。</p>
  </section>`;
}
function handoff(): string {
  return `<section class="handoff"><h2>把范围交给沈翎</h2><p>把实际资料放进对应类别。分类描述证据状态，不评价人生选择。</p>${handoffCards.map(card => `<article class="handoff-card"><h3>${card.title}</h3><p>${card.body}</p>${card.id === 'records' ? `<p class="actual-data">已测 ${state.trialHistory.length} 轮 · 记录 #1–#${state.trialHistory.length}，随资料交接</p>` : ''}<label>归档类别<select data-testid="handoff-${card.id}"><option value="">选择类别</option>${Object.entries(categoryNames).map(([k, name]) => `<option value="${k}" ${state.handoffItems[card.id] === k ? 'selected' : ''}>${name}</option>`).join('')}</select></label>${state.handoffItems[card.id] ? `<p class="classification ${state.handoffItems[card.id] === card.category ? 'valid' : ''}">${state.handoffItems[card.id] === card.category ? '已标明范围' : `这份资料属于「${categoryNames[card.category]}」。请按实际完成情况重放，尚未核验的解释不能变成事实。`}</p>` : ''}</article>`).join('')}<p class="empty-note">终极原因 / 答案：<b>空栏，尚未获得。</b></p></section>`;
}
function sceneControls(): string {
  const trials = sceneTrials(state);
  switch (state.sceneId) {
    case 'D01': return `<section><p class="section-label">先写下关注点</p><div class="question-options">${questions.map((q, i) => { const id = ['local', 'structure', 'scale'][i]; return `${button(`focus-${id}`, q.label, false, state.questionFocus === id ? 'selected' : '')}${state.questionFocus === id ? `<p class="choice-description">${q.description}</p>` : ''}`; }).join('')}</div>${exchangeTerms()}<label class="setting"><input type="checkbox" data-testid="conditions-read" ${conditionsRead ? 'checked' : ''}> 我已读到生命代价与撤回条件</label>${button('connect-box', state.connected ? '旧盒子已接好 · 当年的日期浮现' : '给旧脉冲盒接上电', !conditionsRead || !state.questionFocus, 'primary')}</section>`;
    case 'D02': return `${experiment()}<section class="experiment-task"><h2>为下一轮留下解释</h2>${!trials.length ? '<p>先按下两次输入。今天只试短间隔，先不猜远处的原因。</p>' : !state.hypotheses.length ? `<p>这一轮可能支持不止一种解释。选一个暂存，再自己改变端口检验它。</p><div class="button-row">${button('propose-port', '提出假设：右端口天然更强')}${button('propose-second', '提出假设：第二次总会更亮')}</div>` : `<p>${hasComparison(state) ? '端口对照已留在记录中。修订时把旧卡和反例一起保留。' : '重置一轮，改变至少一个端口；保持间隔不变，与原记录比较。'}</p>${button('revise-second', state.shortRevision ? '已修订：要考虑前面那次输入' : '修订解释：先考虑输入历史', !hasComparison(state) || state.shortRevision, 'primary')}`}</section>`;
    case 'D03': return `${experiment()}<section class="experiment-task"><h2>改变一个条件</h2><p>保持端口，测试还没写下的间隔。要知道边界在哪里，至少对照 2、3、4 单位。</p><div class="evidence-checks">${[2, 3, 4].map(i => `<span class="${trials.some(t => t.interval === i) ? 'done' : ''}">${trials.some(t => t.interval === i) ? '✓ 已测' : '○ 待测'} ${i} 单位</span>`).join('')}</div>${button('revise-timing', state.timingRevision ? '已加入时间条件 · 局部模型修订完成' : '用长间隔反例修订模型', !hasTimeEvidence(state) || state.timingRevision, 'primary')}${state.timingRevision ? '<p class="model-note">本盒子的局部模型：首脉冲 1；次脉冲间隔 &lt;3 单位为 2，≥3 单位为 1。端口无关，每轮重置。这不是原因的解释。</p>' : ''}</section>`;
    case 'D04': return `<section><h2>别把方法和猜想绑在一起</h2><table class="comparison-data"><caption>沈翎提供 · 另一台虚构装置的已标注数据</caption><thead><tr><th>测量范围</th><th>观察</th></tr></thead><tbody><tr><td>1–2 单位</td><td>第二次响应增强</td></tr><tr><td>3–4 单位</td><td>增强不再出现</td></tr><tr><td>结构不同</td><td>仍有相似边界</td></tr></tbody></table><p class="muted">这是外部角色的已核验资料，区别于你亲手产生的盒子记录；它反驳「换掉旧盒子的端口结构，增强就会消失」，并未证明普遍定律。</p><div class="button-row">${button('retain-method', state.oldMethodRetained ? '✓ 校准步骤：可继续使用' : '保留旧校准方法', state.oldMethodRetained)}${button('reject-explanation', state.oldExplanationRejected ? '✓ 旧解释：被反例否定' : '把旧解释标为被反例否定', state.oldExplanationRejected)}</div><label class="text-label">把开放问题写准确一点<textarea data-testid="question-revision" maxlength="280" rows="3" placeholder="相似的时间边界来自什么？我们还需要什么证据？">${escape(state.questionRevision)}</textarea></label><div class="button-row">${button('use-question', '使用这个问题草稿')}${button('save-question', state.questionSaved ? '问题已保存' : '保存问题与范围', !state.questionRevision.trim() || state.questionSaved, 'primary')}</div></section>`;
    case 'D05': return `<section>${!state.withdrawalReceiptSeen ? `<div class="archive-box"><span>程砚的档案 · 经本人允许</span><h2>同一只纸盒</h2><p>测量笔记下面，还有两份相邻的文件。</p>${button('open-archive', '翻开资格文件与回执', false, 'primary')}</div>` : `<div class="receipt" data-testid="withdrawal-receipt"><p class="section-label">初次开放答疑 · 原始文件</p><h2>资格确认 / 主动撤回回执</h2><dl><dt>姓名</dt><dd>程砚</dd><dt>资格状态</dt><dd>已入选</dd><dt>后续登记</dt><dd>本人主动提出撤回 · 已受理</dd><dt>日期</dt><dd>首次共同实验之后<br>第二天实验之前</dd></dl><div class="receipt-stamp">撤回受理</div><p>文件没有写他为何回来，也没有代替他解释这一生。</p></div><div class="button-row">${button('ask-assumption', '我一直以为你没拿到资格', state.conversationAcknowledged)}${button('ask-clarity', '为什么没和我说清楚？', state.conversationAcknowledged, 'primary')}</div>`}</section>`;
    case 'D06': return `<section><div class="button-row">${button('ask-regret', '当面问：后悔过吗？', state.regretHeard, 'primary')}${button('hear-wish', '那你现在希望我怎么办？', !state.regretHeard || state.wishHeard)}</div>${state.wishHeard ? handoff() : '<p class="muted">先听完整个回答，再回到工作台整理资料。</p>'}</section>`;
    case 'D07': return `<section>${exchangeTerms()}<div class="question-summary"><p class="section-label">提交的问题与范围</p><p>${escape(state.questionRevision)}</p><small>手头只有局部规律与已交接记录；终极原因仍未解答。</small></div>${state.finalChoice ? `<div class="confirmed" data-testid="final-confirmed"><h2>${state.finalChoice === 'withdrawn' ? '本次资格已撤回' : '接受交换已确认'}</h2>${lineHtml(dialogue[state.finalChoice], state.finalChoice)}${button('next-morning', '走到第二天早上', false, 'primary')}</div>` : state.pendingChoice ? `<div class="final-confirm" role="region" aria-labelledby="confirm-title"><p class="section-label">最后确认 · 没有倒计时</p><h2 id="confirm-title">${state.pendingChoice === 'withdrawn' ? '确认撤回本次资格？' : '确认接受以生命为代价的交换？'}</h2><p>${state.pendingChoice === 'withdrawn' ? '你将继续在实验室研究。撤回不会使未解答的问题自动得到答案。' : '林予将获得故事中的答案，生命不会保留，答案不会传回。第二天的玩家角色将是程砚。'}</p><div class="button-row">${button('confirm-final', '我确认这个决定', false, 'primary')}${button('cancel-final', '返回，还未确认')}${button('review-handoff', '回看交接资料')}</div></div>` : `<div class="final-options">${button('choose-withdrawn', '撤回本次资格')}${button('choose-accepted', '保留资格，接受交换')}</div>${button('review-handoff', '回看交接资料')}`}</section>`;
    case 'D08A': return `<section><h2>这轮先测三单位间隔</h2><div class="button-row">${button('wire-measurement', state.wireConnected ? '✓ 测量输入线已递过去' : '递过测量接线 · 输入端口', state.wireConnected, 'primary')}${button('wire-power', '拿起供电线 · 电源端', state.wireConnected)}</div>${!state.wireConnected ? '<p class="muted">本次需要将脉冲送入测量端口。两根线用途在标签上。</p>' : experiment()}${trials.some(t => t.interval === 3) ? `<div class="whiteboard"><p class="section-label">白板 · 旧解释仍可撤销</p><p>${state.boardRevised ? '<s>只要是第二次输入，就会更亮。</s>' : '只要是第二次输入，就会更亮。'}</p><p>三单位的这一轮已成为反例，记录保留。擦去的是解释。</p><label class="text-label">留下更准确的新问题<textarea data-testid="board-question" maxlength="280" rows="3">${escape(state.questionOnBoard)}</textarea></label><div class="button-row">${button('use-board-question', '复用之前修改过的问题')}${button('revise-board', state.boardRevised ? '白板已修订 · 记录不变' : '擦去旧解释，写下新问题', !state.questionOnBoard.trim() || state.boardRevised, 'primary')}</div></div>${state.boardRevised ? `<p>程砚：「这次你记？」重置装置，再亲手开始下一轮。</p>${button('finish-epilogue', '把这一页留在桌上', !state.nextStarted || state.epilogueAction, 'primary')}` : ''}` : ''}</section>`;
    case 'D08B': return `<section><h2>以程砚的身份核对资料</h2>${handoffCards.map(card => `<article class="handoff-card"><span class="tag">${categoryNames[card.category]}</span><h3>${card.title}</h3><p>${card.body}</p>${card.id === 'records' ? `<p>林予已留下 ${state.trialHistory.filter(t => t.scene !== 'D08B').length} 轮实际记录。原始输出不变。</p>` : ''}${button(`verify-${card.id}`, state.verified.includes(card.id) ? '✓ 已核对，类别保留' : '核对这份资料与原类别', state.verified.includes(card.id))}</article>`).join('')}<div class="answer-blank" data-testid="answer-blank"><p class="section-label">终极问题 · 答案栏</p><span>________________</span><p>林予没有传回答案。此栏保持空白，不能填写。</p></div>${button('wire-self', state.wireConnected ? '✓ 自己接好测量输入线' : '从空着的那侧拿回接线，自己接好', state.wireConnected, 'primary')}${state.verified.length === 3 && state.wireConnected ? `<h3>今天做多少，由你决定</h3><div class="button-row">${button('today-archive', '今天只归档', state.epilogueAction, state.today === 'archive' ? 'selected' : '')}${button('today-measure', '今天做一次测量', state.epilogueAction, state.today === 'measure' ? 'selected' : '')}</div>${state.today === 'measure' ? experiment() : ''}${state.today ? button('finish-epilogue', state.today === 'archive' ? '合上已核对的资料夹' : '把新测量留在空栏旁边', state.epilogueAction || (state.today === 'measure' && !trials.length), 'primary') : ''}` : '<p class="muted">先逐项核对，再把接线接好。今天可以停在归档。</p>'}</section>`;
  }
}
function narrative(): string {
  const scene = scenes[state.sceneId];
  let lines = scene.lines;
  if (state.sceneId === 'D05' && !state.withdrawalReceiptSeen) lines = lines.slice(0, 2);
  let extra = '';
  if (state.sceneId === 'D02') {
    if (sceneTrials(state).length) extra += lineHtml(dialogue.d02Observed, 'd02Observed');
    if (state.shortRevision) extra += lineHtml([...dialogue.d02Revised, ...dialogue.d02Closing], 'd02Closing');
  }
  if (state.sceneId === 'D03') {
    if (sceneTrials(state).some(t => t.interval >= 3)) extra += lineHtml(dialogue.d03Observed, 'd03Observed');
    if (state.timingRevision) extra += lineHtml(dialogue.d03Revised, 'd03Revised');
  }
  if (state.sceneId === 'D04' && state.oldMethodRetained && state.oldExplanationRejected) extra += lineHtml(dialogue.d04Filed, 'd04Filed');
  if (state.sceneId === 'D05' && state.conversationAcknowledged) extra += lineHtml(dialogue.d05Asked, 'd05Asked');
  if (state.sceneId === 'D06' && state.regretHeard) extra += lineHtml(dialogue.d06Regret, 'd06Regret');
  if (state.sceneId === 'D06' && state.wishHeard) extra += lineHtml(dialogue.d06Wish, 'd06Wish');
  if (state.sceneId === 'D08A' && state.boardRevised) extra += lineHtml(dialogue.morningA, 'morningA');
  if (state.sceneId === 'D08B' && state.verified.length === 3) extra += lineHtml(dialogue.morningB, 'morningB');
  return `<aside class="narrative"><p class="section-label">人物与笔记</p><p class="scene-description">${scene.description}</p><div class="dialogue">${lineHtml(lines, scene.id)}${extra}</div>${preferences.typewriter ? button('show-dialogue', '立即显示全部对白') : ''}${['D02', 'D03'].includes(state.sceneId) ? hypotheses() : ''}<details class="conditions-details"><summary>随时复查交换条件</summary>${exchangeTerms()}</details></aside>`;
}
function menu(): string {
  return `<main class="opening" id="main-content"><div class="opening-copy"><p class="section-label">04 / 科学探索叙事</p><h1>第二天<br><span>早上</span></h1><p class="opening-subtitle">一间实验室，几次反例。<br>和还没有写完的第二天。</p><div class="opening-actions">${loaded.kind === 'valid' ? `${button('continue', `继续 · ${scenes[loaded.save.state.sceneId].eyebrow}`, false, 'primary')}${button('start-new', '从头开始')}` : loaded.kind === 'corrupt' ? `<div class="recovery" role="alert"><h2>这份存档无法读取</h2><p>${escape(loaded.reason)}。可以清除本故事的损坏存档后重开，其他故事的资料会保留。</p>${button('recover-save', '恢复：清除本故事损坏存档', false, 'primary')}${notice ? `<p role="status">${escape(notice)}</p>` : ''}</div>` : button('start-new', '打开实验室', false, 'primary')}</div><p class="content-note">内容提示：以生命为代价的虚构交换、人生选择与失去同伴。<br>本作是平行改编 demo；实验是虚构玩具模型。</p><p class="micro-note">本地运行 · 自动存档 · 鼠标 / 键盘 / 触控<br>Tab 移动焦点，Enter 或空格操作，方向键调整选项。</p></div><div class="opening-image">${laboratoryScene({ era: 'present', role: '林予', emptyChair: false, output: 0, first: 'left', second: 'right', connected: false, reducedMotion: preferences.reducedMotion })}<span class="image-caption">窗边那台盒子，还能用。</span></div></main>`;
}
function game(): string {
  const scene = scenes[state.sceneId];
  const role = state.sceneId === 'D08B' ? '程砚' : '林予';
  const output = state.pulse ? evaluateTrial(state.planned)[state.pulse === 1 ? 0 : 1] : 0;
  const number = ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08A', 'D08B'].indexOf(state.sceneId) + 1;
  return `<main class="game" data-scene="${state.sceneId}" id="main-content"><div class="chapter-header"><div><p class="section-label">${scene.eyebrow}</p><h1 tabindex="-1" id="scene-heading">${scene.title}</h1></div><span class="chapter-number">${String(Math.min(number, 8)).padStart(2, '0')}<small> / 08</small></span></div><div class="workspace"><div class="visual-column"><figure class="laboratory">${laboratoryScene({ era: scene.era, role, emptyChair: state.sceneId === 'D08B', output, first: state.planned.first, second: state.planned.second, connected: state.connected || state.wireConnected, reducedMotion: preferences.reducedMotion })}<figcaption><span>${scene.location}</span><span data-testid="player-role">你是${role}</span></figcaption></figure><div class="interaction-panel">${sceneControls()}${notice ? `<p class="notice" role="status">${escape(notice)}</p>` : ''}${['D02', 'D03'].includes(state.sceneId) ? `<div class="help"><p class="section-label">需要一点帮助时</p>${hintLevel ? help[state.sceneId as 'D02' | 'D03'].slice(0, hintLevel).map((h, i) => `<p>${i + 1}. ${h}</p>`).join('') : '<p>提示可以逐条打开。第一次试验前，不会替你写好解释。</p>'}${button('more-help', hintLevel ? '再展开一条提示' : '展开第一条提示', hintLevel >= 4)}</div>` : ''}${['D01', 'D02', 'D03', 'D04', 'D05', 'D06'].includes(state.sceneId) ? `<div class="advance">${button('next-scene', state.sceneId === 'D06' ? '交接范围已确认，去看自己的决定' : '收好这一页，继续', !canAdvance(state), 'primary')}${!canAdvance(state) ? '<p class="micro-note">先完成这一页的操作，记录会自动保存。</p>' : ''}</div>` : ''}${state.epilogueAction ? `<div class="epilogue-complete" data-testid="epilogue-complete"><p class="section-label">这一页，留在这里</p><h2>${state.sceneId === 'D08A' ? '下一轮已经开始。' : '答案的空栏仍然在。'}</h2><p>${state.sceneId === 'D08A' ? '你仍是林予。问题与旧记录都保留，装置还可以继续操作。' : `你是程砚。今天${state.today === 'archive' ? '完成了归档' : '亲手增加了一轮测量'}，没有替林予填入未传回的答案。`}</p>${button('return-menu', '暂时离开实验室')}</div>` : ''}</div></div>${narrative()}</div>${state.trialHistory.length || ['D02', 'D03'].includes(state.sceneId) ? records() : ''}</main>`;
}
function render(): void {
  const oldFocus = document.activeElement as HTMLElement | null;
  const focusId = oldFocus?.dataset.testid;
  const sceneChanged = playing && state.sceneId !== lastScene;
  timers.forEach(clearTimeout); timers = [];
  app.innerHTML = `<a href="#main-content" class="skip-link">跳到实验操作</a><header class="topbar"><a class="brand" href="#" data-testid="brand-home"><span class="dawn-mark" aria-hidden="true">◒</span> 第二天早上<small>THE NEXT MORNING</small></a><nav aria-label="游戏工具"><span class="save-status" role="status">${storageFailed ? '本地存档失败，请保持页面打开' : playing ? '记录已保存在本机' : '独立叙事 demo'}</span>${button('settings-open', '阅读设置')}${playing ? button('restart', '重新开始') : ''}</nav></header>${playing ? game() : menu()}<footer><span>虚构实验 / 未解答的问题仍然开放</span><span>第二天早上 · 本地 demo</span></footer>${settings()}<dialog id="restart-dialog" aria-labelledby="restart-title"><h2 id="restart-title">从这一页重新开始？</h2><p>将覆盖本故事的进度与实验记录。其他故事的存档不会改变。</p><div class="button-row">${button('restart-confirm', '确认重开', false, 'primary')}${button('restart-cancel', '保留这份记录')}</div></dialog>`;
  document.body.classList.toggle('reduced-motion', preferences.reducedMotion);
  if (settingsOpen) document.querySelector<HTMLDialogElement>('#settings-dialog')!.showModal();
  if (restartOpen) document.querySelector<HTMLDialogElement>('#restart-dialog')!.showModal();
  if (sceneChanged && !settingsOpen && !restartOpen) {
    lastScene = state.sceneId;
    document.querySelector<HTMLElement>('#scene-heading')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (focusId) document.querySelector<HTMLElement>(`[data-testid="${focusId}"]`)?.focus({ preventScroll: true });
  if (preferences.typewriter && !preferences.reducedMotion && playing && !settingsOpen) {
    document.querySelectorAll<HTMLElement>('.spoken').forEach(el => {
      const id = el.dataset.line!;
      if (typed.has(id)) return;
      typed.add(id);
      const full = el.dataset.full!;
      el.setAttribute('aria-label', full);
      el.textContent = '';
      for (let i = 1; i <= full.length; i++) timers.push(window.setTimeout(() => { el.textContent = full.slice(0, i); }, i * 22));
    });
  }
}
function gentleSound(): void {
  if (preferences.muted) return;
  try {
    const context = new AudioContext();
    const tone = context.createOscillator(); const gain = context.createGain();
    tone.type = 'sine'; tone.frequency.value = 220; gain.gain.setValueAtTime(0.018, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
    tone.connect(gain).connect(context.destination); tone.start(); tone.stop(context.currentTime + 0.13);
    tone.onended = () => { void context.close(); };
  } catch { /* Numbers and text always carry the entire result. */ }
}
app.addEventListener('click', event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-testid]');
  if (!target || (target instanceof HTMLButtonElement && target.disabled)) return;
  const id = target.dataset.testid!;
  if (id === 'brand-home') { event.preventDefault(); playing = false; render(); return; }
  if (id === 'settings-open') { settingsOpen = true; render(); return; }
  if (id === 'settings-close') { settingsOpen = false; render(); document.querySelector<HTMLElement>('[data-testid="settings-open"]')?.focus(); return; }
  if (id === 'restart' || (id === 'start-new' && loaded.kind === 'valid')) { restartOpen = true; render(); return; }
  if (id === 'restart-cancel') { restartOpen = false; render(); document.querySelector<HTMLElement>(`[data-testid="${playing ? 'restart' : 'start-new'}"]`)?.focus(); return; }
  if (id === 'recover-save') {
    if (clearSave(browserStorage)) { loaded = { kind: 'empty' }; render(); } else { notice = '浏览器禁止清除存档；可在允许本地存储后重试。'; render(); }
    return;
  }
  if (id === 'start-new' || id === 'restart-confirm') {
    state = newState(); playing = true; restartOpen = false; conditionsRead = false; lastScene = null; typed.clear(); hintLevel = 0; notice = ''; persist(); render(); return;
  }
  if (id === 'continue' && loaded.kind === 'valid') { state = structuredClone(loaded.save.state); playing = true; lastScene = null; persist(); render(); return; }
  if (id === 'return-menu') { playing = false; render(); return; }
  if (!playing) return;
  const simple: Record<string, Action> = {
    'connect-box': { type: 'connect' }, 'propose-port': { type: 'propose', model: 'port' }, 'propose-second': { type: 'propose', model: 'second' },
    'revise-second': { type: 'revise-short' }, 'revise-timing': { type: 'revise-time' }, 'retain-method': { type: 'retain-method' }, 'reject-explanation': { type: 'reject-explanation' },
    'save-question': { type: 'save-question' }, 'open-archive': { type: 'archive' }, 'ask-clarity': { type: 'ask' }, 'ask-assumption': { type: 'ask' },
    'ask-regret': { type: 'regret' }, 'hear-wish': { type: 'wish' }, 'choose-withdrawn': { type: 'choose', choice: 'withdrawn' }, 'choose-accepted': { type: 'choose', choice: 'accepted' },
    'cancel-final': { type: 'cancel-choice' }, 'review-handoff': { type: 'review-handoff' }, 'next-morning': { type: 'morning' },
    'wire-measurement': { type: 'wire' }, 'wire-self': { type: 'wire' }, 'today-archive': { type: 'today', value: 'archive' }, 'today-measure': { type: 'today', value: 'measure' },
    'revise-board': { type: 'revise-board' }, 'finish-epilogue': { type: 'finish' },
  };
  if (id.startsWith('focus-')) act({ type: 'focus', value: id.slice(6) });
  else if (id.startsWith('verify-')) act({ type: 'verify', id: id.slice(7) });
  else if (id === 'pulse-first' || id === 'pulse-second') { gentleSound(); act({ type: 'pulse', index: id === 'pulse-first' ? 1 : 2, from: state.sceneId }); }
  else if (id === 'trial-reset') act({ type: 'reset', from: state.sceneId });
  else if (id === 'next-scene') act({ type: 'advance', from: state.sceneId });
  else if (id === 'confirm-final' && state.pendingChoice) act({ type: 'confirm', choice: state.pendingChoice });
  else if (id === 'more-help') { hintLevel = Math.min(4, hintLevel + 1); render(); }
  else if (id === 'wire-power') { notice = '这是供电线，旧盒子已有电。本次测量要递过标着「测量输入」的接线；可以重新选择。'; render(); }
  else if (id === 'use-question') act({ type: 'question', value: '在已测的 1–4 单位范围内，端口无关的时间边界为何出现？其他结构的相似边界需要哪些独立证据？' });
  else if (id === 'use-board-question') act({ type: 'board', value: state.questionRevision });
  else if (id === 'show-dialogue') { timers.forEach(clearTimeout); document.querySelectorAll<HTMLElement>('.spoken').forEach(el => { el.textContent = el.dataset.full!; }); }
  else if (simple[id]) act(simple[id]);
});
app.addEventListener('change', event => {
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  const id = target.dataset.testid;
  if (id === 'conditions-read') { conditionsRead = (target as HTMLInputElement).checked; render(); }
  else if (id?.startsWith('option-')) {
    const keys: Record<string, keyof Preferences> = { 'option-muted': 'muted', 'option-typewriter': 'typewriter', 'option-motion': 'reducedMotion', 'option-static': 'staticPulse' };
    preferences[keys[id]] = (target as HTMLInputElement).checked; persist(); render();
  } else if (['first-port', 'second-port', 'interval'].includes(id || '')) {
    const value: TrialInput = {
      first: (app.querySelector<HTMLSelectElement>('[data-testid="first-port"]')!.value as TrialInput['first']),
      second: (app.querySelector<HTMLSelectElement>('[data-testid="second-port"]')!.value as TrialInput['second']),
      interval: Number(app.querySelector<HTMLSelectElement>('[data-testid="interval"]')!.value) as TrialInput['interval'],
    }; act({ type: 'configure', value });
  } else if (id?.startsWith('handoff-')) act({ type: 'classify', id: id.slice(8), category: target.value as Category | '' });
});
app.addEventListener('input', event => {
  const target = event.target as HTMLTextAreaElement;
  const id = target.dataset.testid;
  if (id === 'question-revision' || id === 'board-question') {
    act({ type: id === 'question-revision' ? 'question' : 'board', value: target.value }, false);
    const saveButton = app.querySelector<HTMLButtonElement>(`[data-testid="${id === 'question-revision' ? 'save-question' : 'revise-board'}"]`);
    if (saveButton) { saveButton.disabled = !target.value.trim(); saveButton.textContent = id === 'question-revision' ? '保存问题与范围' : '擦去旧解释，写下新问题'; }
  }
});
app.addEventListener('cancel', event => {
  event.preventDefault();
  const returnTo = settingsOpen ? 'settings-open' : playing ? 'restart' : 'start-new';
  settingsOpen = false; restartOpen = false; render();
  document.querySelector<HTMLElement>(`[data-testid="${returnTo}"]`)?.focus();
}, true);
render();
