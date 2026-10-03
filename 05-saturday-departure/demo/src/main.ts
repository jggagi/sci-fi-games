import './style.css';
import { newGame, reduce, canAdvance, type GameState, type Action, type PlanId, type ArtifactId } from './state';
import { SAVE_KEY, loadGame, saveGame, clearGame } from './storage';
import { getSceneContent, ARTIFACTS, PLAN_OPTIONS, CHILDHOOD_OPTIONS, DRAWING_TRANSCRIPT, INSPECTION_REPORT, RESPONSES } from './content';
import { renderArt, renderDrawing } from './art';
import { EnvironmentAudio } from './audio';

const app = document.querySelector<HTMLDivElement>('#app')!;
const loaded = loadGame();
let state = loaded.state ?? newGame();
if (!loaded.state) state.settings.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let active = false;
let saved = loaded.status === 'valid';
let storageFailed = loaded.status === 'unavailable';
let corrupt = loaded.status === 'corrupt';
let modal: ArtifactId | 'settings' | 'restart' | 'plan' | 'inspection' | null = null;
let opener = '';
let notice = '';
let typingTimer: ReturnType<typeof setInterval> | undefined;
let typingRemaining = false;
const audio = new EnvironmentAudio();
const report = INSPECTION_REPORT;
function reaction(id: string) { const r = RESPONSES[id]; return r ? `${r.speaker}：「${r.text}」` : ''; }
const actions = new Map<string, Action>();
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function button(id: string, label: string, action?: Action, options: { disabled?: boolean; primary?: boolean; small?: boolean } = {}) {
  if (action) actions.set(id, action);
  return `<button type="button" data-testid="${id}" ${options.disabled ? 'disabled' : ''} class="${options.primary ? 'primary' : ''} ${options.small ? 'small' : ''}">${label}</button>`;
}
function check(done: boolean, text: string) {
  return `<span class="check ${done ? 'done' : ''}"><span aria-hidden="true">${done ? '✓' : '○'}</span> ${text}</span>`;
}
function artifact(id: ArtifactId) {
  return button(`artifact-${id}`, `${state.artifactsSeen.includes(id) ? '✓ ' : ''}${ARTIFACTS[id].title}`, { type: 'viewArtifact', artifact: id }, { small: true });
}
function persist() {
  if (!active) return;
  saved = saveGame(state);
  storageFailed = !saved;
}
function dispatch(action: Action, repaint = true) {
  const previous = state;
  state = reduce(state, action);
  if (state === previous) {
    if (action.type === 'connectLamp' && action.port !== 'P2') notice = 'P1 是旧线位。按新标准把指示线移到 P2；自动维护继续正常工作。';
    if (action.type === 'verifyReport') notice = '报告标明角偏差用 mrad、舱内温度用 °C。请按报告核对，不需要修理维护单元。';
  } else {
    notice = '';
    if (action.type === 'inferDrawing') notice = reaction('inferDrawing');
    if (action.type === 'connectLamp') notice = reaction(action.port === 'P2' ? 'connectLamp' : 'wrongLamp');
    if (action.type === 'deliverInspection') notice = reaction('verifyFinal');
    if (action.type === 'chooseContact') notice = reaction(action.save ? 'contactSave' : 'contactSkip');
    if (action.type === 'chooseEndingResponse') notice = reaction(action.response === 'own' ? 'endingOwn' : 'endingWork');
    if (action.type === 'prepareEnding' && action.item === 'schedule' && state.adultPlan) notice = `${PLAN_OPTIONS[state.adultPlan].duration} ${PLAN_OPTIONS[state.adultPlan].communication}`;
    if (action.type === 'observeWindow') notice = !state.routeActivated ? '站港仍在窗外，出发清单还在准备。可以先看看，再确认这次安排。' : state.adultPlan === 'not_now' ? '窗外地表的轮廓越来越清楚。父亲指了指那片方向：回去先走走。' : state.adultPlan === 'short_trial' ? '巨镜正缓缓改变角度。一次近程观测，有它自己的完整视野。' : '站上的光点仍在窗边。远处很远，你们才刚进入转移第一段。';
    if (action.type === 'handoffTool') notice = '陈遥：「接住了。我早就会了。」陈建平笑着松开了手。';
    if (action.type === 'toggleInspectionLamp' || action.type === 'toggleChildhoodLamp' || action.type === 'toggleEndingLamp') audio.lamp();
    if (action.type === 'chooseChildhoodDestination') notice = CHILDHOOD_OPTIONS[action.destination].response;
    if (action.type === 'confirmPlan') notice = '许棠：「收到陈遥本人的确认。按你选的安排处理；没有替你加上其他行程。」';
  }
  persist();
  if (repaint) render(previous.sceneId !== state.sceneId);
}

function planDetails(plan: PlanId) {
  const p = PLAN_OPTIONS[plan];
  return `<dl class="plan-details"><div><dt>航段 / 安排</dt><dd>${escape(p.destination)}</dd></div><div><dt>时间</dt><dd>${escape(p.duration)}</dd></div><div><dt>职责</dt><dd>${escape(p.duties)}</dd></div><div><dt>返程与撤回</dt><dd>${escape(p.returnPolicy)}</dd></div><div><dt>通信</dt><dd>${escape(p.communication)}</dd></div></dl>`;
}

function interactionPanel() {
  switch (state.sceneId) {
    case 'S01': return `<h2>先把包放下</h2><div class="button-row">${button('choose-arrival-bag', '放下包，收起终端', { type: 'chooseArrival', choice: 'bag' }, { disabled: state.arrivalChoice !== null })}${button('choose-arrival-reply', '回复「已到站，按流程验收」', { type: 'chooseArrival', choice: 'reply' }, { disabled: state.arrivalChoice !== null })}</div>${state.arrivalChoice ? `<p class="feedback">${state.arrivalChoice === 'bag' ? '终端收进包里。父亲把工具箱往你这边挪了挪。' : '工作回复已发出。你收起终端，父亲等你把手空出来。'}</p>` : ''}${button('open-toolbox', state.toolboxOpened ? '工具箱已打开' : '打开工具箱 · 查看权限', { type: 'openToolbox' }, { disabled: state.toolboxOpened })}${state.toolboxOpened ? '<p>验收权限：镜面报告、灯位迁移、舱内固定点。只有这三项；不承担飞船改建。工具另外交接。箱盖夹袋里放着两份真实资料。</p><div class="button-row">' + artifact('ticket') + artifact('application') + '</div>' : ''}`;
    case 'S02': return `<h2>两项检验与工具交接</h2><section class="task"><h3>01 / 核对自动维护报告</h3><p>自动维护已完成校准，运行正常。角偏差 <strong>${report.displacement} mrad</strong>（容差 ≤ ${report.displacementTolerance.toFixed(2)}）；舱内温度 <strong>${report.temperature} °C</strong>（${report.temperatureMin}–${report.temperatureMax}）。</p><div class="field-row"><label>角偏差单位<select data-testid="displacement-unit" id="displacement-unit" ${state.automationReportVerified ? 'disabled' : ''}><option value="">请选择</option><option value="mrad" ${state.automationReportVerified ? 'selected' : ''}>mrad · 毫弧度</option><option value="mm">mm · 毫米</option></select></label><label>温度单位<select data-testid="temperature-unit" id="temperature-unit" ${state.automationReportVerified ? 'disabled' : ''}><option value="">请选择</option><option value="C" ${state.automationReportVerified ? 'selected' : ''}>°C · 摄氏度</option><option value="K">K · 开尔文</option></select></label></div>${button('verify-report', state.automationReportVerified ? '✓ 报告已核对 · 正常' : '核对单位与容差', undefined, { disabled: state.automationReportVerified })}</section><section class="task"><h3>02 / 移动指示线，试亮检修灯</h3><p>新标准标明 P2 为检修灯位；P1 是旧线位。选择接点即可，不需要拖拽。</p><div class="button-row">${button('connect-P1', 'P1 · 旧线位', { type: 'connectLamp', port: 'P1' }, { disabled: state.lampChecked || !state.automationReportVerified })}${button('connect-P2', state.lampPort === 'P2' ? '✓ P2 已接好' : '接到 P2 · 新灯位', { type: 'connectLamp', port: 'P2' }, { disabled: state.lampChecked || !state.automationReportVerified })}${button('toggle-inspection-lamp', state.inspectionLampOn ? '关掉检修灯' : '打开检修灯', { type: 'toggleInspectionLamp' }, { disabled: state.lampPort !== 'P2' })}</div>${check(state.lampChecked, '检修灯已实际试亮')}</section><section class="task"><h3>交接 / 接住父亲递来的工具</h3>${button('handoff-tool', state.toolHandoffDone ? '✓ 工具已交接' : '接住扳手，扣好保险绳', { type: 'handoffTool' }, { disabled: state.toolHandoffDone })}</section>`;
    case 'S03': return `<h2>柜子里，哪些要带回家？</h2><p>同一本折起的航线册，老纸与新的项目资料分开放着。先看可见的铅笔字，再展开一道折痕。</p><div class="button-row">${artifact('drawing')}${artifact('ticket')}${artifact('application')}${artifact('retirement')}</div>${button('unfold-drawing', state.drawingFold >= 1 ? '✓ 第一折已摊平' : '把旧册平放，展开第一折', { type: 'unfoldDrawing' }, { disabled: state.drawingFold >= 1 || !state.artifactsSeen.includes('drawing') })}${button('infer-drawing', state.earlyInference ? '已经说出你的推断' : '「这像是我小时候画的？」', { type: 'inferDrawing' }, { disabled: state.earlyInference || state.drawingFold < 1 })}<p class="hint">继续前：看过旧册、返程票、空白申请和父亲的生活便笺，并展开第一折。</p>`;
    case 'S04': return `<h2>了解真实的选择</h2><p>许棠会直接处理你的申请。三种安排均可；没有人替你报名。</p>${artifact('conditions')}<div class="plan-previews">${Object.entries(PLAN_OPTIONS).map(([id, p]) => `<details><summary>${escape(p.title)}</summary>${planDetails(id as PlanId)}</details>`).join('')}</div><p class="hint">这里只了解条件，还没有提交申请。童年画里的航点不进入新表。</p>`;
    case 'S05': return `<h2>沿着已经看见的折痕</h2><p>不要撕开。每次展开一折，纸上原来被盖住的字就露出来。</p>${button('unfold-drawing', state.drawingFold === 3 ? '✓ 旧画已完全展开' : `展开第 ${state.drawingFold + 1} 折`, { type: 'unfoldDrawing' }, { primary: true, disabled: state.drawingUnfolded })}${state.drawingUnfolded ? artifact('drawing') : ''}${check(state.drawingUnfolded, '同一张旧画，无新增证据')}`;
    case 'CHILDHOOD': return `<h2>童年 · 纸箱驾驶室</h2><p>这是一段被旧画唤起的回忆。先把小手电放进船头，再亲手开灯。</p>${button('place-childhood-lamp', state.childhoodLampPlaced ? '✓ 小手电已放好' : '把小手电放进纸箱船头', { type: 'placeChildhoodLamp' }, { disabled: state.childhoodLampPlaced })}${button('toggle-childhood-lamp', state.childhoodLampOn ? '关掉纸箱灯' : '打开纸箱灯', { type: 'toggleChildhoodLamp' }, { disabled: !state.childhoodLampPlaced })}<p>陈建平：「船长，往哪儿？」</p><div class="button-row">${Object.entries(CHILDHOOD_OPTIONS).map(([id, p]) => button(`destination-${id}`, `${state.childhoodDestination === id ? '✓ ' : ''}${escape(p.title)}`, { type: 'chooseChildhoodDestination', destination: id as 'rain' | 'threeMoons' }, { disabled: !state.childhoodLampOn || state.childhoodDestination !== null })).join('')}</div><p class="hint">这个选择只标记旧画里的回忆，不填写成年申请。</p>`;
    case 'S05_TRUTH': return `<h2>纸箱早不在了，图还在</h2>${artifact('drawing')}${artifact('application')}<p class="quiet">一会儿不说话也可以。没有倒计时。</p>`;
    case 'S06': return `<h2>这次，由你来填写</h2><p>最后检查：舱内固定点已扣合；载荷标识 60 kg，额定 80 kg。核对锁止与载荷，再交付今天的记录。</p>${button('deliver-inspection', state.inspectionDelivered ? '✓ 三项验收记录已交付' : '核对固定点锁止，交付三项验收', { type: 'deliverInspection' }, { disabled: state.inspectionDelivered })}<form id="plan-form"><fieldset ${state.planConfirmed ? 'disabled' : ''}><legend>本次成年计划 · 无默认选择</legend><div class="plan-choices">${Object.entries(PLAN_OPTIONS).map(([id, p]) => `<label class="plan-choice"><input type="radio" name="adult-plan" data-testid="plan-${id}" value="${id}" ${state.adultPlan === id ? 'checked' : ''}><span>${escape(p.title)}</span></label>`).join('')}</div><label>申请人本人姓名<input data-testid="applicant-name" id="applicant-name" name="applicantName" type="text" maxlength="40" autocomplete="off" placeholder="请重新填写，例如：陈遥" value="${escape(state.applicantName)}"></label><label>我写下的当前目的地 / 本次安排<input data-testid="adult-destination" id="adult-destination" name="destination" type="text" maxlength="120" autocomplete="off" placeholder="例如地月 L2、近地试航或本次回家" value="${escape(state.adultDestination)}"></label></fieldset>${state.adultPlan ? `<div class="selected-plan">${planDetails(state.adultPlan)}<p class="hint">${state.adultPlan === 'not_now' ? '仅记录本次不加入与返程安排。没有未来日期或再来承诺。' : '确认只提交以上本次计划；后续航段另行同意。'}核准航段以以上项目条件为准；你填写的是本人对这次安排的记录。确认前可以改填或撤回。</p></div>` : '<p class="hint">先选本次安排，再用自己的姓名填写当前目的地。童年目的地不会代填。</p>'}${button('confirm-plan', state.planConfirmed ? '✓ 本人已明确确认 · 计划已锁定' : '确认本次计划 · 由我本人提交', { type: 'confirmPlan' }, { primary: true, disabled: state.planConfirmed || !validForm() })}</form>`;
    case 'S07A': case 'S07B': return `<h2>第一段出发准备</h2><p class="route-label">${escape(state.adultDestination)} · ${state.sceneId === 'S07A' ? '长程观测 / 离站第一段' : '近程试航 / 36 小时安排'}</p><div class="checklist">${button('prepare-schedule', `${state.endingPrep.includes('schedule') ? '✓ ' : ''}核对航段、通信与返程窗口`, { type: 'prepareEnding', item: 'schedule' }, { disabled: state.endingPrep.includes('schedule') })}${button('prepare-kit', `${state.endingPrep.includes('kit') ? '✓ ' : ''}固定随身包，检查个人装备`, { type: 'prepareEnding', item: 'kit' }, { disabled: state.endingPrep.includes('kit') })}${button('store-drawing', state.drawingStored ? '✓ 旧画已放在不遮挡仪表的侧边' : '把旧画固定在驾驶台侧边', { type: 'storeDrawing' }, { disabled: state.drawingStored })}</div><p>向已经回家的父亲说：</p><div class="button-row">${button('response-own', `${state.endingResponse === 'own' ? '✓ ' : ''}「这次是我自己选的。」`, { type: 'chooseEndingResponse', response: 'own' }, { disabled: state.endingResponse !== null })}${button('response-work', `${state.endingResponse === 'work' ? '✓ ' : ''}「这次不是去上班。」`, { type: 'chooseEndingResponse', response: 'work' }, { disabled: state.endingResponse !== null })}</div>${endingControls()}<p class="hint">先固定物件、核对准备、回应通话，再开灯并确认当前航段。旅程只走到第一段。</p>`;
    case 'S07C': return `<h2>这次回家</h2><p>项目由其他已自行确认的成员继续。你与父亲使用各自的真实返程票，不需要作出未来承诺。</p>${button('store-drawing', state.drawingStored ? '✓ 旧画已收进自己的文件夹' : '把旧画收进自己的文件夹', { type: 'storeDrawing' }, { disabled: state.drawingStored })}${button('secure-bag', state.bagSecured ? '✓ 父亲的包已固定在座椅下' : '把父亲的包挪到更稳的位置', { type: 'secureBag' }, { disabled: state.bagSecured })}<p>要保存项目公开联系方式吗？这不等于预约或承诺。</p><div class="button-row">${button('contact-save', `${state.contactDecision === 'save' ? '✓ ' : ''}保存公开联系方式`, { type: 'chooseContact', save: true }, { disabled: state.contactDecision !== null })}${button('contact-skip', `${state.contactDecision === 'skip' ? '✓ ' : ''}这次不保存`, { type: 'chooseContact', save: false }, { disabled: state.contactDecision !== null })}</div>${endingControls()}<p class="hint">收好旧画、固定包、决定是否保存联系方式，再开灯确认返程。</p>`;
    case 'S08': return `<h2>星期六出发</h2><p class="route-label">${escape(state.adultDestination)}</p><p>${state.adultPlan === 'not_now' ? '地表慢慢近了。父亲惦记着楼下新修的路，你的旧画在文件夹里。' : state.adultPlan === 'short_trial' ? '一次完整的近程体验已经开始。返程窗口还在计划里，旧画就在手边。' : '远处仍然很远。第一段正在开始，观测与返航还需要时间。'}</p><div class="button-row">${artifact('drawing')}${button('review-plan', '查看这次的新计划')}${button('review-inspection', '查看已交付的验收单')}</div>${button('toggle-ending-lamp', state.endingLampOn ? '关掉舱内灯' : '再打开舱内灯', { type: 'toggleEndingLamp' })}${button('observe-window', state.endingObserved ? '继续看看窗外' : '看看窗外，停留一会儿', { type: 'observeWindow' })}<p class="quiet">故事已完整结束。可以自由停留、查看旧画，或稍后继续这里的存档。</p><p class="credits">平行改编短篇 demo · 原创程序图形与合成环境声<br>没有评分，也没有需要领取的最佳结局。</p>`;
  }
}
function validForm() { return Boolean(state.adultPlan && state.applicantName.trim() && state.adultDestination.trim() && state.inspectionDelivered); }
function endingControls() {
  const ready = state.drawingStored && (state.adultPlan === 'not_now' ? state.bagSecured && state.contactDecision !== null : state.endingPrep.length === 2 && state.endingResponse !== null);
  return `<div class="ending-controls">${button('toggle-ending-lamp', state.endingLampOn ? '关掉舱内灯' : '打开舱内灯', { type: 'toggleEndingLamp' })}${button('activate-route', state.routeActivated ? '✓ 当前航段已确认' : state.adultPlan === 'not_now' ? '确认本次返程安排' : '确认当前航段 · 开始第一段', { type: 'activateRoute' }, { primary: true, disabled: state.routeActivated || !ready || !state.endingLampOn })}${button('observe-window', '看看窗外', { type: 'observeWindow' })}</div>`;
}

function renderModal() {
  if (!modal) return '';
  let body = '';
  let title = '';
  if (modal === 'settings') {
    title = '阅读与声音';
    body = `<p>所有对白与通话都有文字。声音不包含额外剧情信息。</p><label class="setting"><input type="checkbox" data-testid="settings-mute" data-setting="muted" ${state.settings.muted ? 'checked' : ''}>关闭声音</label><label class="setting"><input type="checkbox" data-testid="settings-reduced-motion" data-setting="reducedMotion" ${state.settings.reducedMotion ? 'checked' : ''}>减弱动态（关闭窗外漂移与灯光动画）</label><label class="setting"><input type="checkbox" data-testid="settings-typewriter" data-setting="typing" ${state.settings.typing ? 'checked' : ''}>逐字显示（关闭即显示完整对白）</label><p class="hint">Tab 切换焦点；Enter / 空格操作按钮；Esc 关闭窗口。折纸与接线不需要拖拽。</p>`;
  } else if (modal === 'restart') {
    title = '重新开始这一个故事？';
    body = `<p>会替换《星期六出发》的存档。其他故事的存档不会改变。</p><div class="button-row">${button('restart-confirm', '确认重开', undefined, { primary: true })}${button('restart-cancel', '保留当前进度')}</div>`;
  } else if (modal === 'plan') {
    title = '现在的选择';
    body = `<p>本人填写：${escape(state.applicantName)}</p><p>本次目的地 / 安排：<strong>${escape(state.adultDestination)}</strong></p>${state.adultPlan ? planDetails(state.adultPlan) : ''}<p>本人已确认。${state.adultPlan === 'not_now' ? '未加入项目；没有未来预约或承诺。' : '只提交了本次计划，后续航段需要另外决定。'}</p>`;
  } else if (modal === 'inspection') {
    title = '本次交接记录';
    body = `<p>✓ 自动维护：定位及校准正常；角偏差 ${report.displacement} mrad，温度 ${report.temperature} °C。</p><p>✓ P2 检修灯：由你接好，并实际试亮。</p><p>✓ 舱内固定点：扣合锁止；60 kg 载荷在额定 80 kg 内。</p><p>工具交接完成，保险绳固定，扳手收妥。</p><p>已交付许棠。主结构与团队原本已经筹备完成，这不是一天从零修出的飞船。</p>`;
  } else {
    title = ARTIFACTS[modal].title;
    body = `${modal === 'drawing' ? `<div class="drawing-view">${renderDrawing(state)}</div>` : ''}${(modal === 'drawing' && state.drawingUnfolded ? DRAWING_TRANSCRIPT : ARTIFACTS[modal].text).map(text => `<p>${escape(text)}</p>`).join('')}${modal === 'conditions' ? Object.keys(PLAN_OPTIONS).map(id => `<h3>${escape(PLAN_OPTIONS[id as PlanId].title)}</h3>${planDetails(id as PlanId)}`).join('') : ''}`;
  }
  return `<dialog id="modal" aria-labelledby="modal-title"><div class="modal-header"><h2 id="modal-title">${escape(title)}</h2>${button('close-dialog', '关闭', undefined, { small: true })}</div><div class="modal-body">${body}</div></dialog>`;
}

function render(sceneChanged = false) {
  if (typingTimer) clearInterval(typingTimer);
  typingRemaining = false;
  const focusId = (document.activeElement as HTMLElement | null)?.dataset.testid;
  actions.clear();
  document.documentElement.dataset.motion = state.settings.reducedMotion ? 'reduced' : 'full';
  const scene = getSceneContent(state);
  if (!active) {
    app.innerHTML = `<main class="welcome"><div class="welcome-art">${renderArt(newGame())}</div><div class="welcome-shade"></div><nav class="welcome-nav"><span class="brand">轨道站 / 家庭档案 05</span>${button('settings-open', '阅读与声音', undefined, { small: true })}</nav><section class="welcome-copy"><p class="eyebrow">一段关于旧画与重新选择的叙事探索</p><h1>星期六<br><span>出发</span><i aria-hidden="true">。</i></h1><p class="welcome-intro">父亲要退休了。你回到轨道站，帮他交清最后几项工作。<br>工具箱里，有一张一直没有扔掉的旧画。</p><div class="button-row">${saved && !corrupt ? button('continue-game', '继续上次的故事', undefined, { primary: true }) : ''}${button('new-game', saved ? '重新开始' : '开始故事', undefined, { primary: !saved })}</div>${corrupt ? `<div class="recovery" data-testid="save-recovery"><p>这份存档损坏或版本不兼容，尚未覆盖原记录。可以确认后恢复为新游戏；其他故事不受影响。</p>${button('recover-save', '恢复为新游戏')}</div>` : ''}${storageFailed ? '<p role="status">浏览器存储不可用。仍可游玩；刷新可能丢失进度。</p>' : ''}<p class="welcome-help">鼠标 / 键盘 / 触控 · 自动保存 · 默认静音<br>内容提示：退休、童年回忆与家庭对话。无需联网。</p></section><p class="welcome-footer">SCI-FI GAMES &nbsp; / &nbsp; SATURDAY DEPARTURE</p></main>${renderModal()}`;
  } else {
    const line = scene.lines[state.dialogueIndex];
    const done = state.dialogueIndex >= scene.lines.length - 1;
    app.innerHTML = `<header class="topbar"><a class="wordmark" href="#" data-testid="title-home">星期六出发<span>05 / 叙事探索</span></a><div class="top-actions"><span class="save-status" role="status">${storageFailed ? '存储不可用 · 请勿刷新' : '已自动保存'}</span>${button('settings-open', '阅读与声音', undefined, { small: true })}${button('restart-open', '重开', undefined, { small: true })}</div></header><main class="game" data-scene="${state.sceneId}"><div class="chapter-heading"><div><p class="eyebrow">${escape(scene.kicker)}</p><h1 id="scene-title" tabindex="-1">${escape(scene.title)}</h1></div><p class="chapter-goal">${escape(scene.goal)}</p></div><div class="play-layout"><section class="stage-column" aria-label="场景与物件"><div class="stage">${renderArt(state)}<div class="stage-caption"><span>${state.sceneId === 'CHILDHOOD' ? '过去 / 纸箱驾驶室' : '现在 / ' + escape(scene.title)}</span><span>${state.sceneId === 'S08' ? '可以停留' : '没有倒计时'}</span></div></div><div class="fieldnotes"><p class="eyebrow">随身记录 / 过去与现在分别保存</p><div class="note-row">${check(state.automationReportVerified, '维护正常')}${check(state.lampChecked, '灯位已检')}${check(state.toolHandoffDone, '工具交接')}</div><div class="note-row"><span>旧画：${state.drawingUnfolded ? '已展开' : state.drawingFold ? '展开一折' : '仍折着'}${state.drawingStored ? ' · 已留存' : ''}</span><span>成年计划：${state.planConfirmed && state.adultPlan ? escape(PLAN_OPTIONS[state.adultPlan].title) : '尚未确认'}</span></div>${state.childhoodDestination ? `<p class="hint">童年画上的指向：${escape(CHILDHOOD_OPTIONS[state.childhoodDestination].title)}。这不是成年申请。</p>` : ''}</div></section><section class="story-column" aria-label="对白与操作"><div class="dialogue-card"><div class="dialogue-top"><span class="speaker">${escape(line?.speaker ?? '旁白')}</span><span class="line-counter">${state.dialogueIndex + 1} / ${scene.lines.length}</span></div><p class="dialogue-text" data-testid="dialogue-text" aria-live="polite" aria-atomic="true">${escape(line?.text ?? '')}</p>${button('dialogue-next', done ? '这段话已读完' : '继续对话 →', { type: 'advanceDialogue' }, { disabled: done, small: true })}</div><section class="interactions">${interactionPanel()}</section>${notice ? `<p class="notice" role="status">${escape(notice)}</p>` : ''}${state.sceneId !== 'S08' ? `<div class="scene-navigation">${button('scene-next', nextLabel(), { type: 'nextScene' }, { disabled: !canAdvance(state), primary: true })}${!canAdvance(state) ? `<p class="hint">${done ? '完成本页标出的操作后继续。进度随时自动保存。' : '请先读完这一段对话；操作也可以先做。'}</p>` : ''}</div>` : ''}</section></div></main><footer class="game-footer"><span>陈遥 / 本次选择由本人确认</span><span>${state.settings.muted ? '声音关闭' : '声音开启'} · ${state.settings.reducedMotion ? '动态减弱' : '缓慢动态'} · 字幕始终开启</span></footer>${renderModal()}`;
    if (state.settings.typing && line && !modal) {
      const node = app.querySelector<HTMLElement>('.dialogue-text')!;
      node.setAttribute('aria-label', line.text);
      node.textContent = '';
      let index = 0;
      typingRemaining = true;
      typingTimer = setInterval(() => {
        index += 2;
        node.textContent = line.text.slice(0, index);
        if (index >= line.text.length) { clearInterval(typingTimer); typingRemaining = false; }
      }, 35);
    }
  }
  if (modal) {
    const dialog = app.querySelector<HTMLDialogElement>('#modal')!;
    dialog.showModal();
    dialog.addEventListener('cancel', event => { event.preventDefault(); closeModal(); });
    if (focusId && app.querySelector<HTMLElement>(`[data-testid="${focusId}"]`)) app.querySelector<HTMLElement>(`[data-testid="${focusId}"]`)?.focus();
  } else if (sceneChanged) {
    app.querySelector<HTMLElement>('#scene-title')?.focus();
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (focusId) app.querySelector<HTMLElement>(`[data-testid="${focusId}"]`)?.focus({ preventScroll: true });
}

function nextLabel() {
  switch (state.sceneId) {
    case 'S01': return '带上工具，去维修廊 →';
    case 'S02': return '交接完成，整理储物柜 →';
    case 'S03': return '去观景舱，听项目说明 →';
    case 'S04': return '回到工作台，看完旧画 →';
    case 'S05': return '想起纸箱里的那盏灯 →';
    case 'CHILDHOOD': return '回到现在 →';
    case 'S05_TRUTH': return '打开这次的新申请 →';
    case 'S06': return '按我确认的安排继续 →';
    default: return '再看一次灯 →';
  }
}
function openModal(value: typeof modal, trigger: string) { modal = value; opener = trigger; render(); }
function closeModal() { modal = null; const restore = opener; render(); app.querySelector<HTMLElement>(`[data-testid="${restore}"]`)?.focus(); }
function beginFresh() {
  const settings = state.settings;
  clearGame();
  state = newGame();
  state.settings = { ...settings };
  active = true;
  corrupt = false;
  modal = null;
  notice = '';
  persist();
  void audio.setMuted(state.settings.muted).catch(() => {});
  render(true);
}

app.addEventListener('click', event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-testid]');
  if (!target || (target as HTMLButtonElement).disabled) return;
  const id = target.dataset.testid!;
  if (id === 'title-home') { event.preventDefault(); active = false; render(); return; }
  if (id === 'new-game') { if (saved || corrupt) openModal('restart', id); else beginFresh(); return; }
  if (id === 'continue-game') { active = true; void audio.setMuted(state.settings.muted).catch(() => {}); render(true); return; }
  if (id === 'recover-save') { openModal('restart', id); return; }
  if (id === 'restart-open') { openModal('restart', id); return; }
  if (id === 'restart-confirm') { beginFresh(); return; }
  if (id === 'restart-cancel' || id === 'close-dialog') { closeModal(); return; }
  if (id === 'settings-open') { openModal('settings', id); return; }
  if (id === 'review-plan') { openModal('plan', id); return; }
  if (id === 'review-inspection') { openModal('inspection', id); return; }
  if (id === 'verify-report') {
    const displacementUnit = app.querySelector<HTMLSelectElement>('#displacement-unit')!.value;
    const temperatureUnit = app.querySelector<HTMLSelectElement>('#temperature-unit')!.value;
    if (!displacementUnit || !temperatureUnit) { notice = '请分别选择两个报告单位。'; render(); return; }
    dispatch({ type: 'verifyReport', displacementUnit: displacementUnit as 'mrad' | 'mm', temperatureUnit: temperatureUnit as 'C' | 'K' });
    return;
  }
  if (id === 'dialogue-next' && typingRemaining) {
    clearInterval(typingTimer); typingRemaining = false;
    app.querySelector<HTMLElement>('.dialogue-text')!.textContent = getSceneContent(state).lines[state.dialogueIndex].text;
    return;
  }
  const action = actions.get(id);
  if (action) {
    if (action.type === 'viewArtifact') { dispatch(action, false); openModal(action.artifact, id); }
    else dispatch(action);
  }
});
app.addEventListener('submit', event => event.preventDefault());
app.addEventListener('change', event => {
  const input = event.target as HTMLInputElement;
  if (input.dataset.setting) {
    dispatch({ type: 'setSetting', key: input.dataset.setting as keyof GameState['settings'], value: input.checked });
    if (input.dataset.setting === 'muted') void audio.setMuted(input.checked).catch(() => { notice = '浏览器暂时不能开启声音；所有对白仍可阅读。'; render(); });
  } else if (input.name === 'adult-plan') updateForm(true);
});
app.addEventListener('input', event => {
  const input = event.target as HTMLInputElement;
  if (input.id === 'applicant-name' || input.id === 'adult-destination') updateForm(false);
});
function updateForm(repaint: boolean) {
  const plan = app.querySelector<HTMLInputElement>('input[name="adult-plan"]:checked')?.value as PlanId | undefined;
  const name = app.querySelector<HTMLInputElement>('#applicant-name')!.value;
  const destination = app.querySelector<HTMLInputElement>('#adult-destination')!.value;
  dispatch({ type: 'editPlan', plan: plan ?? null, name, destination }, repaint);
  if (!repaint) {
    const button = app.querySelector<HTMLButtonElement>('[data-testid="confirm-plan"]');
    if (button) button.disabled = state.planConfirmed || !validForm();
  }
}

// The storage key is documented but no game state or jump API is exposed on window.
document.documentElement.dataset.saveNamespace = SAVE_KEY;
render();
