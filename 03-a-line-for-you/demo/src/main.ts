import './styles.css';
import { newGame, reduce, getManuscript, getFinalOptions, getRevision, loadSave, serialize, SAVE_KEY, type State, type Action } from './model';
import { SCENES, RAIN_OPTIONS, WORD_OPTIONS, CHAIR_OPTIONS, CLOUD_CANDIDATES } from './content';
import { narrativeDialogue } from './narrative';
import { roomMarkup, type RoomView } from './room';

const app = document.querySelector<HTMLDivElement>('#app')!;
const escape = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
let raw: string | null = null;
try { raw = localStorage.getItem(SAVE_KEY); } catch { /* The room still works without storage. */ }
const loaded = loadSave(raw);
let state: State = loaded.state;
let playing = false;
let modal: 'manuscript' | 'settings' | 'cover' | 'restart' | null = null;
let roomFocus: RoomView['focus'] = 'desk';
let zoom = false;
let openSources = new Set<string>();
let hintLevel = 0;
let activeCandidate: string | null = null;
let authorsChecked = false;
let notice = loaded.status === 'recovered' ? '存档损坏或版本不符。可以重新开始；其他故事的存档没有受到影响。' : '';
let roomNotice = '';
let returnFocus = '';
let typingTimer: ReturnType<typeof setInterval> | undefined;
let audioContext: AudioContext | null = null;
let rainSource: AudioBufferSourceNode | null = null;
let rainGain: GainNode | null = null;
let rainFilter: BiquadFilterNode | null = null;

function button(label: string, id: string, action?: Action, options: { disabled?: boolean; primary?: boolean; className?: string; extra?: string } = {}) {
  return `<button type="button" data-testid="${id}" ${action ? `data-action='${escape(JSON.stringify(action))}'` : ''} class="${options.primary ? 'primary' : 'secondary'} ${options.className ?? ''}" ${options.disabled ? 'disabled' : ''} ${options.extra ?? ''}>${escape(label)}</button>`;
}
function persist() {
  try { localStorage.setItem(SAVE_KEY, serialize(state)); notice = ''; }
  catch { notice = '浏览器无法保存到本机。当前仍可玩；关闭此页后进度可能丢失。'; }
}
function act(action: Action) {
  const previous = state.sceneId;
  state = reduce(state, action);
  if (previous !== state.sceneId) { roomNotice = ''; roomFocus = 'desk'; }
  persist();
  render(previous !== state.sceneId);
  syncAudio();
}
function openModal(next: typeof modal) {
  const active = document.activeElement as HTMLElement;
  returnFocus = active?.dataset.testid ? `[data-testid="${active.dataset.testid}"]` : active?.dataset.room ? `[data-room="${active.dataset.room}"]` : '';
  modal = next;
  render();
}
function closeModal() {
  modal = null;
  render();
  if (returnFocus) app.querySelector<HTMLElement>(returnFocus)?.focus();
}
function syncAudio() {
  const rainy = ['P01', 'P02', 'P03', 'P06', 'P07', 'P08'].includes(state.sceneId);
  if (!playing || !state.settings.sound || !rainy) {
    if (rainSource) { rainSource.stop(); rainSource.disconnect(); rainSource = null; }
    return;
  }
  try {
    audioContext ??= new AudioContext();
    void audioContext.resume();
    if (rainSource) { if (rainFilter) rainFilter.frequency.value = state.basinMoved ? 1600 : 950; return; }
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 3, audioContext.sampleRate);
    const channel = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < channel.length; i++) { last = (last + Math.random() * .04 - .02) / 1.02; channel[i] = last * 2; }
    const filter = audioContext.createBiquadFilter(); rainFilter = filter; filter.type = 'lowpass'; filter.frequency.value = state.basinMoved ? 1600 : 950;
    rainGain = audioContext.createGain(); rainGain.gain.value = .22;
    rainSource = audioContext.createBufferSource(); rainSource.buffer = buffer; rainSource.loop = true;
    rainSource.connect(filter); filter.connect(rainGain); rainGain.connect(audioContext.destination); rainSource.start();
  } catch { notice = '声音未能启用。窗外雨线与文字提示仍然可用。'; }
}
function choices(items: ReadonlyArray<{ id: string; text: string; description?: string }>, prefix: string, action: string, selected: string | null, disabled = false) {
  return `<div class="choice-grid">${items.map(item => button(item.text, `${prefix}-${item.id}`, { type: action, id: item.id } as Action, { disabled, className: `choice ${selected === item.id ? 'selected' : ''}`, extra: `aria-pressed="${selected === item.id}"` }) + (item.description ? `<p class="source-note">${escape(item.description)}</p>` : '')).join('')}</div>`;
}
function coverButton() { return button(state.coauthorSeen ? '重看封底署名' : '分开粘连的封底', 'view-cover'); }
function paperText() {
  return getManuscript(state).map(page => `<article class="manuscript-page" data-testid="manuscript-${page.id}"><div class="eyebrow">纸页 ${String(page.number).padStart(2, '0')} / 06</div><h3>${escape(page.title)}</h3>${page.text.map(line => `<p class="poem-line">${escape(line)}</p>`).join('')}<details ${openSources.has(page.id) ? 'open' : ''}><summary data-testid="flip-${page.id}" data-flip="${page.id}"> ${state.collectedPaperIds.includes(page.id) ? '翻看背面' : '拿起纸页并翻看背面'} · 出处${state.paperSidesInspected.includes(`${page.id}:back`) ? ' · 已核对' : ''}</summary><div class="provenance">${page.source.map(line => `<p>${escape(line)}</p>`).join('')}</div></details></article>`).join('');
}
function sceneActions() {
  switch (state.sceneId) {
    case 'P01': return `<p class="status-note">出版工作表 · 作者：${state.coauthorSeen ? '周淮、小序（署名已见，编排待核）' : '周淮（待核）'} · 整理：小序</p><p>把六张散页放进托盘。页码在纸角，封底有一道粘连的边。</p><div class="paper-grid">${state.pageOrder.map(id => button(`纸页 ${id.split('-')[1]}${state.collectedPaperIds.includes(id) ? ' · 已入托盘' : ' → 放入托盘'}`, `collect-${id}`, { type: 'collectPaper', id }, { disabled: state.collectedPaperIds.includes(id), className: 'paper-card' })).join('')}</div><p class="source-note">托盘 ${state.collectedPaperIds.length} / 6 · 第 2 页标注「十二年前 · 雨」。先关联来源，不替空缺补写。</p>${coverButton()}${button('查看十二年前的日期', 'start-rain', { type: 'startRain' }, { disabled: state.collectedPaperIds.length !== 6, primary: true })}`;
    case 'P02': return `<p>窗缝漏进的水正打在盆边。把盆移到落水正下方，再听一会儿。</p>${button(state.basinMoved ? '接水盆已移好 · 滴答清楚' : '将接水盆移到滴水下方', 'move-basin', { type: 'moveBasin' }, { disabled: state.basinMoved })}<p class="status-note" aria-live="polite">${state.basinMoved ? '雨声反馈：滴——答。每一次落水之间有了间隔。' : '雨声反馈：沙沙，急促的滴水打在盆沿。'}</p><h3>你觉得这声音像什么？</h3>${choices(RAIN_OPTIONS, 'rain', 'chooseRain', state.rainChoice, !!state.rainChoice || !state.basinMoved)}${state.rainChoice ? `<div class="revision-sheet"><p>周淮把你说的整句写下来：</p><blockquote>${escape(RAIN_OPTIONS.find(x => x.id === state.rainChoice)?.text)}</blockquote><p class="source-note">原句保留。不是从候选里替你挑一句。</p></div>` : ''}${button('把这个下午关联到手稿', 'finish-rain', { type: 'finishRain' }, { disabled: !state.rainChoice || !state.basinMoved, primary: true })}`;
    case 'P03': return `<div class="revision-sheet"><span class="eyebrow">纸页 02 · 共同对话</span><blockquote>${escape(getManuscript(state)[1]?.text.join('\n'))}</blockquote><p class="source-note">${escape(getManuscript(state)[1]?.source.join(' · '))}</p></div>${button(state.rainLinked ? '共同对话出处已关联' : '标注：这句当时是我说的', 'link-rain', { type: 'linkRain' }, { disabled: state.rainLinked })}<details ${activeCandidate ? 'open' : ''}><summary data-testid="open-cloud">诗云 · 看三个预写候选</summary><p class="source-note">诗云能包含这些表达。这里可以比较与暂存；实际发生的下午仍保留。</p>${CLOUD_CANDIDATES.map(x => button(x.text, `cloud-${x.id}`, { type: 'cloudView', id: x.id }, { className: `choice ${activeCandidate === x.id ? 'selected' : ''}` })).join('')}${activeCandidate ? `<p class="status-note">正在比较：${escape(CLOUD_CANDIDATES.find(x => x.id === activeCandidate)?.text)}</p>${button('暂存为比较候选', 'cloud-draft', { type: 'cloudDraft', id: activeCandidate })}` : ''}${state.candidateDraft ? `<p class="source-note">候选已单独暂存。原稿没有覆盖。</p>` : ''}</details>${button('不改此页，查看七年前的修订', 'start-revision', { type: 'startRevision' }, { disabled: !state.rainLinked, primary: true })}`;
    case 'P04': return `<div class="revision-sheet"><span class="eyebrow">原稿 · 周淮</span><p class="poem-line">${escape(getManuscript(state)[2].text.find(line => line.startsWith('原稿：'))?.slice(3))}</p></div><h3>提出你的修订</h3>${choices(WORD_OPTIONS, 'word', 'chooseWord', state.revisionChoice)}${state.revisionChoice ? `<div class="revision-sheet"><p class="poem-line">你的版本：${escape(getRevision(state)?.playerVersion)}</p><p class="source-note">${state.zhouEdit !== null ? `准备共同采用：${escape(getRevision(state)?.adopted)}` : '周淮提议将「夜风」改成「晚风」，由你决定。'}</p>${button('采用「晚风」', 'zhou-accept', { type: 'chooseZhouEdit', accept: true }, { className: state.zhouEdit === true ? 'selected' : '', extra: `aria-pressed="${state.zhouEdit === true}"` })}${button('保留「夜风」', 'zhou-keep', { type: 'chooseZhouEdit', accept: false }, { className: state.zhouEdit === false ? 'selected' : '', extra: `aria-pressed="${state.zhouEdit === false}"` })}<p class="source-note">你可以继续比较。点击下方标记后，本次共同采用的版本才会留下贡献记录。</p></div>` : ''}${button('标记：本次共同采用', 'commit-revision', { type: 'commitRevision' }, { disabled: !state.revisionChoice || state.zhouEdit === null, primary: true })}`;
    case 'P05': return `<p>椅子挡住了一次开窗。先挪开试试，看看房间怎样变化。</p>${button(state.chairTried ? '椅子已试放在书桌边' : '把椅子移到书桌边试试', 'try-chair', { type: 'tryChair' }, { disabled: state.chairTried })}${state.chairTried ? `<p class="source-note">试过桌边以后，再决定椅子的位置。</p>${choices(CHAIR_OPTIONS, 'chair', 'chooseChair', state.chairChoice)}` : ''}${state.chairChoice ? `<p class="status-note">${escape(CHAIR_OPTIONS.find(x => x.id === state.chairChoice)?.text)} · 准备采用这个摆放。回到今天时记录最终姿态。</p><p class="source-note">把这个普通提醒留在今日安排里。</p>${button(state.reminderSet ? '提醒已记下：晚饭后回信' : '记下普通提醒：晚饭后回信', 'set-reminder', { type: 'setReminder' }, { disabled: state.reminderSet })}` : ''}${button('回到今天，整理这几页', 'finish-chair', { type: 'finishChair' }, { disabled: !state.chairChoice || !state.reminderSet, primary: true })}`;
    case 'P06': return `<p>用纸角的页码排列 1 → 6，再核对日期和修订符号。可以用向前／向后按钮，不需要拖拽。</p><div class="tray">${state.pageOrder.map((id, i) => { const p = getManuscript(state).find(x => x.id === id)!; return `<article class="paper-card"><div class="eyebrow">纸页 ${p.number} · ${escape(p.title)}</div><p>${escape(p.text[0] ?? '')}</p><div class="page-controls">${button('向前', `page-${id}-up`, { type: 'movePage', id, direction: -1 }, { disabled: state.compilationUnderstood || i === 0, className: 'small-button' })}${button('向后', `page-${id}-down`, { type: 'movePage', id, direction: 1 }, { disabled: state.compilationUnderstood || i === 5, className: 'small-button' })}</div></article>`; }).join('')}</div>${button('给我一步提示', 'hint')}<p class="hint" role="status" aria-live="polite">${hintLevel === 0 ? '提示随时可用，排序不以文学理解评分。' : hintLevel === 1 ? '先找到纸页 1，用「向前」把它放到最前面。' : hintLevel === 2 ? '页码就是顺序：1 编排说明，2 雨声原句，3 修订，4 椅子，5 作者与整理，6 最后一行。' : '从左到右依次放 1、2、3、4、5、6。每个按钮只移动一格，内容和来源不会改变。'}</p>${button(state.compilationUnderstood ? '六页已拼接 · 三段来源已核对' : '核对并拼接六页', 'compile', { type: 'compile' }, { disabled: state.compilationUnderstood, primary: true })}${!state.compilationUnderstood && state.pageOrder.join(',') !== 'page-1,page-2,page-3,page-4,page-5,page-6' ? `<p class="source-note">顺序尚未对齐。按页角编号调整后再拼接。</p>` : ''}${state.compilationUnderstood ? `<div class="revision-sheet"><p class="source-note">三段本轮经历已与纸页核对。可以重读原句、修订和摆放记录。</p>${coverButton()}</div>` : coverButton()}${button('留给今天的一行', 'start-final', { type: 'startFinal' }, { disabled: !state.compilationUnderstood || !state.coauthorSeen, primary: true })}`;
    case 'P07': return `<p>先看看房间，再决定今天想说什么。窗外正在下雨，没有标准答案。</p><div class="final-options">${getFinalOptions(state).map(x => button(x.text, x.id, { type: 'chooseFinal', id: x.id }, { className: `choice ${state.finalChoiceId === x.id ? 'selected' : ''}`, extra: `aria-pressed="${state.finalChoiceId === x.id}"` })).join('')}${button('暂留空白 · 待小序续写', 'final-deferred', { type: 'chooseFinal', id: 'deferred' }, { className: `choice ${state.finalLineMode === 'deferred' ? 'selected' : ''}`, extra: `aria-pressed="${state.finalLineMode === 'deferred'}"` })}</div>${state.finalLineMode ? `<p class="status-note">${state.finalLineMode === 'deferred' ? '保留一行空白。不急。' : escape(state.finalLineText)}</p>` : ''}${button('保存这一行的决定', 'save-final', { type: 'saveFinal' }, { disabled: !state.finalLineMode, primary: true })}`;
    case 'P08': return state.authorshipConfirmed ? `<div class="epilogue" data-testid="epilogue"><span class="eyebrow">已保存 · 房间仍在这里</span><h2>周淮　小序</h2><p class="poem-line">${state.finalLineMode === 'deferred' ? '＿＿＿＿＿＿＿＿＿＿' : escape(state.finalLineText)}</p><p class="source-note">作者：周淮、小序。整理记录：小序。${state.finalLineMode === 'deferred' ? '最后一行：待小序续写。' : ''}</p>${button('重读保存的手稿', 'epilogue-manuscript') }<p>你还可以去窗边，看看椅子，或重新翻开修订页。这里不催你离开。</p><div class="provenance">${state.memoryContributions.map(c => `<p>${escape(c.text)}</p>`).join('')}</div></div>` : `<div class="signature"><span class="eyebrow">同一份保存面板 · 待亲手确认</span><h2>作者：周淮、小序</h2><p>整理记录：小序</p><p>最后一行：${state.finalLineMode === 'deferred' ? '留白 · 待小序续写' : escape(state.finalLineText)}</p><p class="source-note">来源：纸本封底双署名；三段实际贡献与修订记录已核对。</p><label class="check-row"><input type="checkbox" data-testid="confirm-authorship" ${authorsChecked ? 'checked' : ''}>我确认共同作者栏为「周淮、小序」，保留整理记录。</label>${button('确认作者并保存手稿', 'save-authors', { type: 'confirmAuthors' }, { disabled: !authorsChecked, primary: true })}</div>`;
  }
}
function modalMarkup() {
  if (!modal) return '';
  const title = { manuscript: '手稿与出处', settings: '阅读与声音', cover: '与封底粘连的书封', restart: '重新开始？' }[modal];
  const body = modal === 'manuscript' ? `<p class="source-note">当前可核对的版本。还未经历的页只标注「待关联」，不会替你补写。</p>${button(zoom ? '恢复阅读大小' : '放大纸页', 'paper-zoom', undefined, { extra: `aria-pressed="${zoom}"` })}<div class="manuscript ${zoom ? 'zoomed' : ''}">${paperText()}</div>` : modal === 'cover' ? `<div class="manuscript-page signature"><span class="eyebrow">纸本 · 书封背面</span><h2>周淮　小序</h2><p class="poem-line">这一行留给小序。</p><p>不急。</p><div class="provenance">已查看真实署名。三段作品的编排仍由共同经历来核对。</div></div>` : modal === 'settings' ? `<div class="settings-grid"><label class="check-row"><input type="checkbox" data-testid="setting-sound" ${state.settings.sound ? 'checked' : ''}>启用合成雨声（当前${state.settings.sound ? '有声' : '静音'}）</label><label class="check-row"><input type="checkbox" data-testid="setting-typewriter" ${state.settings.typewriter ? 'checked' : ''}>逐字显示对白（关闭即可立即显示全文）</label><label class="check-row"><input type="checkbox" data-testid="setting-motion" ${state.settings.reducedMotion ? 'checked' : ''}>减弱动态</label><p class="source-note">雨声也通过窗上雨线与文字反馈呈现。全部声音在设备上生成。</p></div>` : `<p>只替换《给你留一行》这轮的本地进度与贡献。其他故事的存档保留。</p>${button('确认重新开始', 'restart-confirm', undefined, { primary: true })}`;
  return `<div class="modal-overlay"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-header"><h2 id="modal-title">${title}</h2>${button('关闭', 'close-modal')}</header><div class="modal-body">${body}</div></section></div>`;
}
function render(sceneChanged = false) {
  if (typingTimer) clearInterval(typingTimer);
  const focusedId = (document.activeElement as HTMLElement)?.dataset.testid;
  const focusedRoom = (document.activeElement as HTMLElement)?.dataset.room;
  const modalScroll = app.querySelector<HTMLElement>('.modal')?.scrollTop ?? 0;
  const scene = SCENES[state.sceneId];
  const view: RoomView = { sceneId: state.sceneId, chairChoice: state.chairChoice, chairTried: state.chairTried, basinMoved: state.basinMoved, focus: roomFocus, reducedMotion: state.settings.reducedMotion };
  const lines = narrativeDialogue(state);
  app.innerHTML = `<div class="app-shell ${state.settings.reducedMotion ? 'reduced-motion' : ''}" ${modal ? 'inert' : ''}><header class="topbar"><a class="brand" href="#" aria-label="给你留一行">给你留一行<span>A LINE FOR YOU</span></a><div class="chapter">${playing ? `${state.sceneId} / ${escape(scene.date)}` : '一间房 · 两个作者'}</div><nav class="toolbar" aria-label="阅读工具">${playing ? button('手稿', 'open-manuscript') : ''}${button(state.settings.sound ? '声音 · 开' : '声音 · 关', 'toggle-sound')}${button('设置', 'open-settings')}${playing ? button('重开', 'restart-game') : ''}</nav></header><main class="game-layout" data-scene="${playing ? state.sceneId : 'opening'}"><section class="room-panel" aria-label="书房场景"><div class="room-frame">${roomMarkup(view)}</div><div class="room-caption"><span class="badge">${playing ? escape(scene.date) : '现在'}</span><p data-testid="room-feedback" aria-live="polite">${escape(roomNotice || (['P02','P01','P03','P06','P07','P08'].includes(state.sceneId) ? '窗外有雨。杯子、纸页和椅子都还在。' : state.sceneId === 'P04' ? '傍晚，灯已经亮了。桌上有两份不同的修订。' : '下午的光落在椅面。窗户需要留出打开的地方。'))}</p></div></section><section class="narrative-panel">${playing ? `<header class="scene-heading" tabindex="-1" data-testid="scene-heading"><div class="eyebrow">${escape(scene.date)} · ${state.sceneId}</div><h1>${escape(scene.title)}</h1><p class="source-note">${escape(scene.description)}</p></header><div class="dialogue">${lines.map(line => `<p class="dialogue-line" data-dialogue="${line.id}"><span class="speaker">${escape(line.speaker)}</span><span class="spoken">${escape(line.text)}</span></p>`).join('')}</div><div class="action-area">${sceneActions()}</div>` : `<div class="opening-card"><div class="eyebrow">离线叙事游戏 · 完整 demo</div><h1>给你留一行</h1><p>你是小序，一名连接移动底座与桌面操作臂的家用 AI。</p><p>与你相伴的诗人周淮最近去世。今天，你和编辑沈青整理他留下的六张纸页。</p><p>你记得一起生活的那些下午。尚未看过的，是他怎样把它们放在一起。</p><p class="source-note">观察房间，移动物件，翻页、排列、修订，再保存自己的决定。没有好坏结局。进度只存在本机。</p>${loaded.status === 'valid' ? button(`继续 · ${state.sceneId}`, 'continue-game', undefined, { primary: true }) : ''}${button(loaded.status === 'valid' ? '开始新的一轮' : '开始整理', 'start-new', undefined, { primary: loaded.status !== 'valid' })}<p class="source-note">内容提示：失去长期同伴与日常哀伤。鼠标、触控或 Tab / Enter 均可操作。</p></div>`}</section></main><footer class="footer"><span>小序 · AI 移动底座在线</span><span>${notice ? escape(notice) : playing ? '本机自动保存 · 不急' : '原创场景与诗句 · 无需联网'}</span></footer></div>${modalMarkup()}`;
  document.body.style.overflow = modal ? 'hidden' : '';
  if (modal) {
    const dialog = app.querySelector<HTMLElement>('.modal')!;
    const previousControl = focusedId ? dialog.querySelector<HTMLElement>(`[data-testid="${focusedId}"]`) : null;
    (previousControl ?? dialog.querySelector<HTMLElement>('[data-testid="close-modal"]'))?.focus({ preventScroll: true });
    dialog.scrollTop = modalScroll;
  }
  else if (sceneChanged) { app.querySelector<HTMLElement>('[data-testid="scene-heading"]')?.focus(); window.scrollTo({ top: 0, behavior: 'instant' }); }
  else if (focusedId) app.querySelector<HTMLElement>(`[data-testid="${focusedId}"]`)?.focus();
  else if (focusedRoom) app.querySelector<HTMLElement>(`[data-room="${focusedRoom}"]`)?.focus();
  if (playing && state.settings.typewriter && !modal) {
    const last = app.querySelector<HTMLElement>('.dialogue-line:last-child .spoken');
    if (last) { const full = last.textContent!; let n = 0; last.textContent = ''; typingTimer = setInterval(() => { last.textContent = full.slice(0, ++n); if (n >= full.length) clearInterval(typingTimer); }, 26); }
  }
}
app.addEventListener('click', event => {
  const el = (event.target as HTMLElement).closest<HTMLElement>('button, [data-room], summary[data-flip]');
  if (!el || el.hasAttribute('disabled')) return;
  const id = el.dataset.testid;
  if (el.dataset.flip) {
    event.preventDefault();
    const pageId = el.dataset.flip;
    if (state.sceneId === 'P01' && !state.collectedPaperIds.includes(pageId as State['pageOrder'][number])) act({ type: 'collectPaper', id: pageId });
    if (openSources.has(pageId)) openSources.delete(pageId); else openSources.add(pageId);
    act({ type: 'inspectPaper', id: pageId, side: 'back' });
    app.querySelector<HTMLElement>(`[data-testid="flip-${pageId}"]`)?.focus();
    return;
  }
  if (el.dataset.room) {
    roomFocus = el.dataset.room as RoomView['focus'];
    const pages = getManuscript(state);
    roomNotice = roomFocus === 'window' ? (['P04','P05'].includes(state.sceneId) ? state.sceneId === 'P04' ? '小序移到窗边。天色正在暗下去，桌灯亮着。' : '小序移到窗边。晴天下午，光落在椅面，窗外没有雨。' : state.basinMoved ? '小序移到窗边。接水盆留在滴水下方，滴答分明。' : '小序移到窗边。雨线在玻璃上相接，窗缝有细细的水声。') : roomFocus === 'chair' ? state.chairChoice ? state.sceneId === 'P05' ? CHAIR_OPTIONS.find(x => x.id === state.chairChoice)?.description ?? '' : pages[3].text.join(' ') : '椅面有一道浅浅的磨痕。关于它的位置，还没有关联到今天的手稿。' : roomFocus === 'cup' ? ['P02', 'P04', 'P05'].includes(state.sceneId) ? '杯子里留着半杯水。周淮还要拿它吃晚饭。' : '杯子倒扣着。你把底座停在旁边，没有替它找一段话。' : '小序回到书桌。纸页的原句、修订和出处都可以重新核对。';
    render();
    if (roomFocus === 'desk' && playing) openModal('manuscript');
    return;
  }
  if (id === 'start-new') { if (loaded.status === 'valid') { openModal('restart'); return; } state = newGame(state.settings); playing = true; persist(); render(true); syncAudio(); return; }
  if (id === 'continue-game') { playing = true; render(true); syncAudio(); return; }
  if (id === 'restart-confirm') { state = newGame(state.settings); playing = true; modal = null; authorsChecked = false; openSources = new Set(); hintLevel = 0; activeCandidate = null; roomNotice = ''; roomFocus = 'desk'; persist(); syncAudio(); render(true); return; }
  if (id === 'restart-game') { openModal('restart'); return; }
  if (id === 'open-settings') { openModal('settings'); return; }
  if (id === 'open-manuscript' || id === 'epilogue-manuscript') { openModal('manuscript'); return; }
  if (id === 'close-modal') { closeModal(); return; }
  if (id === 'paper-zoom') { zoom = !zoom; render(); return; }
  if (id === 'toggle-sound') { act({ type: 'updateSettings', settings: { sound: !state.settings.sound } }); return; }
  if (id === 'view-cover') { act({ type: 'viewCover' }); openModal('cover'); return; }
  if (id === 'hint') { hintLevel++; render(); return; }
  if (el.dataset.action) {
    const action = JSON.parse(el.dataset.action) as Action;
    if (action.type === 'cloudView') activeCandidate = action.id;
    if (action.type === 'compile' && state.pageOrder.join(',') !== 'page-1,page-2,page-3,page-4,page-5,page-6') { hintLevel = Math.max(1, hintLevel); render(); return; }
    act(action);
  }
});
app.addEventListener('change', event => {
  const el = event.target as HTMLInputElement;
  if (el.dataset.testid === 'confirm-authorship') { authorsChecked = el.checked; render(); app.querySelector<HTMLElement>('[data-testid="confirm-authorship"]')?.focus(); }
  else if (el.dataset.testid?.startsWith('setting-')) {
    const setting = el.dataset.testid === 'setting-sound' ? 'sound' : el.dataset.testid === 'setting-motion' ? 'reducedMotion' : 'typewriter';
    act({ type: 'updateSettings', settings: { [setting]: el.checked } });
    app.querySelector<HTMLElement>(`[data-testid="${el.dataset.testid}"]`)?.focus();
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && modal) { event.preventDefault(); closeModal(); }
  if (event.key === 'Tab' && modal) {
    const list = Array.from(app.querySelectorAll<HTMLElement>('.modal button:not([disabled]), .modal input, .modal summary, .modal [tabindex="0"]'));
    const index = list.indexOf(document.activeElement as HTMLElement);
    if (event.shiftKey && index <= 0) { event.preventDefault(); list.at(-1)?.focus(); }
    else if (!event.shiftKey && index === list.length - 1) { event.preventDefault(); list[0]?.focus(); }
  }
});
render();
