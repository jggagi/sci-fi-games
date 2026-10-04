import './style.css';
import { beats, scenes, type Choice } from './content';
import { sceneArt } from './art';
import { SAVE_KEY, createInitialState, decodeSave, reducer, albumReady, type Action, type CapturedFrame } from './model';

const app = document.querySelector<HTMLDivElement>('#app')!;
const announcement = document.createElement('div');
announcement.className = 'sr-only';
announcement.setAttribute('role', 'status');
announcement.setAttribute('aria-live', 'polite');
announcement.setAttribute('aria-atomic', 'true');
document.body.append(announcement);
let announcedNode = '';
// randomUUID is absent over ordinary LAN HTTP; IDs are local record keys only.
const newRunId = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID()
  : Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
let state = createInitialState(newRunId());
let hasSave = false;
let corrupt = false;
let storageError = '';
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) { state = decodeSave(raw); hasSave = state.started; }
} catch { corrupt = true; }
let playing = false;
let overlay: 'none' | 'album' | 'settings' | 'camera' | 'map' | 'restart' = 'none';
let selectedFrame: string | null = null;
let returnFocus = 'album';
let audioContext: AudioContext | null = null;
let typingTimer = 0;
let typedNode = '';
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]!));
const button = (label: string, focus: string, attrs = '', cls = '') => `<button type="button" class="${cls}" data-focus="${focus}" ${attrs}>${label}</button>`;

function persist() {
  if (corrupt) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); hasSave = state.started; storageError = ''; }
  catch { storageError = '本地保存不可用。你仍可玩完本次行程；刷新会丢失进度。'; }
}
function playTone() {
  if (state.settings.muted) return;
  try {
    audioContext ||= new AudioContext();
    void audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = state.channelClosed ? 330 : 520;
    gain.gain.setValueAtTime(0.025, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + 0.15);
  } catch { /* Every sound also has a visible text equivalent. */ }
}
function dispatch(action: Action, focus?: string) {
  const previousNode = state.nodeId;
  const frameCount = state.capturedFrames.length;
  state = reducer(state, action);
  persist();
  if (state.capturedFrames.length > frameCount || action.type === 'setting' && action.key === 'muted' && !action.value) playTone();
  render(focus || (state.nodeId !== previousNode ? `choice:${beats[state.nodeId].choices[0]?.id}` : undefined));
}
function openOverlay(next: typeof overlay) {
  returnFocus = (document.activeElement as HTMLElement)?.dataset.focus || next;
  overlay = next; selectedFrame = null; render(next === 'album' ? 'filter:mine' : 'close');
}
function closeOverlay() {
  overlay = 'none'; selectedFrame = null; render(returnFocus);
}

function toolbar() {
  return `<nav class="tools" aria-label="行程工具">
    ${button('<span aria-hidden="true">▦</span> 行程相册', 'album', 'data-open="album"')}
    ${button('<span aria-hidden="true">⌁</span> 路线地图', 'map', 'data-open="map"')}
    ${button('<span aria-hidden="true">◎</span> 拍照工具', 'camera', 'data-open="camera"')}
    ${button('设置', 'settings', 'data-open="settings"')}
  </nav>`;
}

function header() {
  return `<header class="topbar"><a class="brand" href="#" data-home aria-label="回到标题，进度自动保存"><span class="brand-mark" aria-hidden="true">◎</span> 明天还去吗</a><span class="edition">一段三日的地表行程</span>${playing ? toolbar() : button('设置', 'settings', 'data-open="settings"')}</header>`;
}

function titleScreen() {
  return `${header()}<main class="start-view">
    <div class="start-art">${sceneArt('T01', createInitialState())}<div class="start-coordinate">地表外勤站 / 06:40<br><span>GROUND FIELD STATION</span></div></div>
    <section class="start-copy" aria-labelledby="game-title"><p class="eyebrow">FIRST LIGHT · THREE DAYS</p><h1 id="game-title">明天<br>还去吗<span>？</span></h1>
    <p class="intro">设备看向世界。<br>你负责带她出门，她挑想留下的画面。</p>
    <p class="premise">闻夏留在深层地航舱。生命支持仍在运转，她也继续工作。中继线路将在第三日退出服务——这次行程使用最后三个稳定窗口。</p>
    <div class="start-actions">${hasSave ? button('继续行程', 'continue', 'data-continue', 'primary') : ''}${button(hasSave ? '重新开始' : corrupt ? '恢复为新行程' : '开始行程', 'start', 'data-start', hasSave ? '' : 'primary')}</div>
    ${corrupt ? '<p class="warning" role="alert">存档损坏，原记录尚未覆盖。确认恢复后仅重置本故事的存档。</p>' : ''}
    <p class="input-guide">点选物件 · Tab 切换焦点，Enter 操作<br>虚构人物与本机相册，无需联网或设备权限。</p>
    </section></main><footer class="footer">独立试玩 / 全字幕 / 无强制等待${storageError ? `<span role="alert">${escape(storageError)}</span>` : ''}</footer>`;
}

function choiceButtons(choices: Choice[]) {
  return choices.map(c => button(escape(c.label), `choice:${c.id}`, `data-choice="${c.id}"`, c.secondary ? 'secondary' : 'primary')).join('');
}

function ending() {
  const frame = state.capturedFrames.find(f => f.frameId === state.endingFrameId);
  return `${header()}<main class="ending"><div class="ending-art">${sceneArt('T08', state, frame)}</div><section><p class="eyebrow">本机已保存 · 行程由你结束</p><h1>明天还去吗</h1><p>${state.nextRoute === 'river' ? '明日路线：河岸步道。没有受托人。' : state.nextRoute === 'station' ? '明日路线：旧车站。没有受托人。' : '明日的路线暂时留空。'}</p><p class="end-note">窗口按约定关闭。她还有那组数据要重算。</p>${button('再看一遍相册', 'album', 'data-open="album"', 'primary')}${button('回到标题', 'title', 'data-title')}</section></main>`;
}

function gameScreen() {
  if (state.finished) return ending();
  const beat = beats[state.nodeId];
  const scene = scenes[beat.scene];
  const dailyWindowClosed = ['T04.10', 'T05.09'].includes(beat.id);
  const caption = beat.scene === 'T08' ? '窗口关闭 · 本机摄影仍可使用' : dailyWindowClosed ? '本日窗口结束 · 设备收纳中' : beat.scene === 'T06' || beat.scene === 'T07' ? '最后稳定窗口 · 正常连接' : '稳定窗口 · 正常连接';
  return `${header()}<main class="game" data-scene="${beat.scene}" data-node="${beat.id}">
    <div class="scene-heading"><div><span class="eyebrow">${scene.day}</span><h1>${dailyWindowClosed ? '河岸外勤站' : scene.place}</h1></div><span class="channel ${state.channelClosed || dailyWindowClosed ? 'closed' : ''}"><i aria-hidden="true"></i>${caption}</span></div>
    <section class="scene-view" aria-label="${dailyWindowClosed ? '河岸外勤站' : scene.place}，第一人称视点">
      <div class="scene-art" data-art>${sceneArt(beat.scene, state)}</div>
      <div class="view-corners" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
      <span class="scene-coordinate">${scene.title}<br><small>${scene.day}</small></span>
      ${beat.choices.filter(c => c.hotspot).map(c => `<button class="hotspot" data-choice="${c.id}" data-focus="hotspot:${c.id}" aria-label="${escape(c.label)}" style="left:${c.hotspot!.x}%;top:${c.hotspot!.y}%"><span aria-hidden="true">＋</span>${escape(c.hotspot!.label || c.label)}</button>`).join('')}
      <div class="photo-count" aria-label="已保存${state.capturedFrames.length}张真实画面">▧ ${String(state.capturedFrames.length).padStart(2, '0')} 画面</div>
    </section>
    <section class="conversation" aria-label="全字幕与操作">
      <div class="conversation-label"><span class="speaker">${beat.speaker}</span><span class="voice-line" aria-hidden="true">﹏﹏﹏</span><span>${state.channelClosed ? '本地' : '双向语音'}</span></div>
      <p class="dialogue" id="current-dialogue" data-dialogue>${escape(beat.text)}</p>
      ${beat.hint ? `<p class="hint">${escape(beat.hint)}</p>` : ''}
      <div class="choices" aria-describedby="current-dialogue">${choiceButtons(beat.choices)}</div>
      <div class="notice" role="status">${escape(storageError || state.lastNotice || '进度自动保存在本机。你可以随时打开行程相册。')}</div>
    </section>
    <div class="film-strip" aria-label="最近保存的画面">${state.capturedFrames.slice(-3).map(f => `<button data-frame="${f.frameId}" data-focus="strip:${f.frameId}" aria-label="查看${escape(f.title)}"><span class="tiny-art">${sceneArt(f.sourceScene, state, f)}</span><span>${escape(f.title)}</span><small>${state.wenxiaMarks.includes(f.frameId) ? '闻夏标记 · 已保存' : '顾远收藏 · 本机'}</small></button>`).join('') || '<span class="film-empty">画面会从你的动作中留下。</span>'}</div>
  </main><footer class="footer">${state.channelClosed ? '没有新的返向消息。已保存的画面仍在。' : '视点面向外界；返向信道提供语音与小型数据。'}<span>Tab / Enter 点选 · Esc 关闭工具</span></footer>`;
}

function frameDetail(frame: CapturedFrame) {
  const shared = state.wenxiaMarks.includes(frame.frameId);
  return `<div class="frame-detail" data-frame-id="${frame.frameId}"><div class="large-photo">${sceneArt(frame.sourceScene, state, frame)}</div><h3>${escape(frame.title)}</h3><p>${escape(frame.description)}</p><blockquote>「${escape(frame.quote)}」</blockquote><p class="photo-meta">${scenes[frame.sourceScene].day} · ${shared ? '闻夏标记 · 已保存' : '顾远收藏 · 本机保存'}<br>${frame.kind === 'breakfast_hands' ? (frame.variant.mealChoice === 'porridge' ? '热粥 · 移到中央' : '面饼 · 移到中央') : frame.kind.includes('mirror') || frame.kind === 'portrait' ? (frame.variant.hairChoice === 'tidy' ? '整理过头发' : '头发左边仍然翘着') : '原构图保留'}</p>${button('回到照片列表', 'back-to-list', 'data-list', 'primary')}</div>`;
}

function albumContents() {
  const filtered = state.albumOrder.filter(id => state.albumFilter === 'all' || (state.albumFilter === 'mine' ? state.mySelections : state.wenxiaMarks).includes(id));
  const selected = state.capturedFrames.find(f => f.frameId === selectedFrame);
  if (selected) return frameDetail(selected);
  return `<p class="modal-intro">同一份行程，两个人留下的画面。点开看原构图，用移动按钮调整排列。</p>
    <div class="filter-tabs" role="group" aria-label="相册筛选">${([['mine','顾远收藏'], ['wenxia','闻夏标记'], ['all','全部画面']] as const).map(([key, label]) => button(label, `filter:${key}`, `data-filter="${key}" aria-pressed="${state.albumFilter === key}"`, state.albumFilter === key ? 'active' : '')).join('')}</div>
    ${beats[state.nodeId].scene === 'T06' ? `<p class="album-task">整理行程集：${state.albumFilter === 'wenxia' ? '✓ 已切换闻夏标记' : '切换闻夏标记'} · 已看关键画面 ${['breakfast_hands', 'hill_shadow', 'lake_reflection'].filter(kind => state.inspectedFrames.includes(`${state.runId}:${kind}`)).length}/3 · ${state.albumReordered ? '✓ 已重排' : '用往前移重排一张'}</p>` : ''}
    <div class="photo-grid">${filtered.map((id, index) => {
      const frame = state.capturedFrames.find(f => f.frameId === id)!;
      return `<article class="photo-card" data-photo-kind="${frame.kind}" data-frame-id="${id}"><button class="photo-open" data-inspect="${id}" data-focus="inspect:${id}"><span class="photo-image">${sceneArt(frame.sourceScene, state, frame)}</span><span class="photo-number">${String(index + 1).padStart(2, '0')}</span><strong>${escape(frame.title)}</strong><small>${scenes[frame.sourceScene].day} · ${state.wenxiaMarks.includes(id) ? '闻夏标记 · 已保存' : '顾远收藏'}</small></button><div class="reorder-buttons">${button('← 往前移', `reorder:${id}:-1`, `data-reorder="${id}" data-direction="-1" aria-label="${escape(frame.title)}往前移" ${index === 0 ? 'disabled' : ''}`)}${button('往后移 →', `reorder:${id}:1`, `data-reorder="${id}" data-direction="1" aria-label="${escape(frame.title)}往后移" ${index === filtered.length - 1 ? 'disabled' : ''}`)}</div></article>`;
    }).join('') || '<p class="empty-album">还没有这一类画面。行程继续时，真实动作会留下记录。</p>'}</div>
    ${beats[state.nodeId].scene === 'T06' && beats[state.nodeId].choices.some(c => c.effect === 'album_ready') ? button(albumReady(state) ? '整理好了，回到对话' : '先回到对话', 'album-done', 'data-close', 'primary') : ''}`;
}

function cameraContents() {
  const scene = beats[state.nodeId].scene;
  const enabled = scene === 'T04' && state.nodeId !== 'T04.10' || scene === 'T08';
  return `<p class="modal-intro">沿用同一个照片工具。没有评分，构图由你选择。</p><div class="camera-preview">${sceneArt(scene, state, undefined, 'camera')}</div>
    <div class="camera-controls" role="group" aria-label="构图方向">${([['left','向左看'], ['center','看向中央'], ['right','向右看']] as const).map(([key,label]) => button(label, `view:${key}`, `data-view="${key}" aria-pressed="${state.framing === key}" ${!enabled ? 'disabled' : ''}`)).join('')}</div>
    ${enabled ? button(state.channelClosed ? '为自己保存这张照片' : '保存我的照片', 'shutter', 'data-shutter', 'primary') : '<p class="hint">这处画面由物件操作构图。请回到场景完成动作；湖岸与尾声可自由拍摄。</p>'}
    <p class="notice" role="status">${escape(state.lastNotice || (state.channelClosed ? '本机保存，不发送新的共享消息。' : '共享标记会单独显示通知。'))}</p>`;
}

function modal() {
  if (overlay === 'none') return '';
  const titles = { album: '行程相册', settings: '体验设置', camera: '拍照工具', map: '三日路线', restart: '重新开始行程？' };
  let body = '';
  if (overlay === 'album') body = albumContents();
  else if (overlay === 'camera') body = cameraContents();
  else if (overlay === 'settings') body = `<p class="modal-intro">所有对白均有字幕。动态和音效不承担必要线索。</p><div class="setting-list">${([
    ['typewriter','打字效果','关闭后整句立即呈现；开启时也可立即推进。'],
    ['reducedMotion','减弱动态','关闭场景漂移、蒸汽和界面淡入。'],
    ['muted','静音','默认静音；取消后只播放原创短提示音。'],
  ] as const).map(([key,label,desc]) => `<label><span><strong>${label}</strong><small>${desc}</small></span><input type="checkbox" data-setting="${key}" data-focus="setting:${key}" ${state.settings[key] ? 'checked' : ''}></label>`).join('')}</div><p class="input-guide">键盘 Tab / Shift+Tab 切换焦点，Enter / 空格操作按钮，Esc 关闭工具。鼠标和触控均可直接点选。</p>${hasSave ? button('重新开始', 'restart', 'data-restart') : ''}`;
  else if (overlay === 'map') body = `<div class="route-map"><svg viewBox="0 0 600 260" role="img" aria-label="三日路线：外勤站经早餐摊、山坡、湖岸至旧车站。旧站镜子在洗手台。"><path d="M50 210Q150 160 220 70T360 120 540 80" fill="none" stroke="#59746d" stroke-width="4" stroke-dasharray="8 8"/>${[[50,210,'外勤站'],[145,153,'早餐摊'],[220,70,'旧观测点'],[360,120,'湖岸'],[540,80,'旧车站']].map(([x,y,t]) => `<circle cx="${x}" cy="${y}" r="8" fill="#b96d47"/><text x="${Number(x)-25}" y="${Number(y)-18}" fill="#234142" font-size="18">${t}</text>`).join('')}</svg></div><ol class="map-days"><li><strong>第一日</strong> 早餐 → 山坡观测 → 黄昏湖岸</li><li><strong>第二日</strong> 旧车站长廊 · 备用外套</li><li><strong>第三日</strong> 外勤站整理 → 旧站洗手台${state.visitedScenes.includes('T05') ? ' · 镜子已登记' : ''}</li></ol><p>线路按工程安排退出服务。闻夏的生命支持与舱内工作独立运行。</p>`;
  else body = `<p>这会替换《明天还去吗》的本机进度与相册。其他游戏的存档不受影响。</p><div class="choices">${button('确认重新开始', 'confirm-restart', 'data-confirm-restart', 'primary')}${button('保留当前行程', 'keep', 'data-close')}</div>`;
  return `<div class="modal-backdrop"><section class="modal ${overlay}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-header"><div><p class="eyebrow">FIELD RECORDS</p><h2 id="modal-title">${titles[overlay]}</h2></div>${button('关闭', 'close', 'data-close', 'close-button')}</div>${body}</section></div>`;
}

function render(focus?: string) {
  clearInterval(typingTimer);
  const oldFocus = focus || (document.activeElement as HTMLElement)?.dataset.focus;
  document.documentElement.classList.toggle('reduced-motion', state.settings.reducedMotion);
  app.innerHTML = (playing ? gameScreen() : titleScreen()) + modal();
  bind();
  if (playing && overlay === 'none' && !state.finished && announcedNode !== state.nodeId) {
    announcedNode = state.nodeId;
    const beat = beats[state.nodeId];
    requestAnimationFrame(() => { announcement.textContent = `${beat.speaker}：${beat.text}`; });
  }
  if (oldFocus) app.querySelector<HTMLElement>(`[data-focus="${CSS.escape(oldFocus)}"]`)?.focus({ preventScroll: true });
  if (overlay !== 'none' && !app.querySelector('.modal')?.contains(document.activeElement)) app.querySelector<HTMLButtonElement>('.modal button')?.focus();
  if (playing && overlay === 'none' && state.settings.typewriter && !state.settings.reducedMotion && !state.finished && typedNode !== state.nodeId) {
    typedNode = state.nodeId;
    const line = app.querySelector<HTMLElement>('[data-dialogue]')!;
    const full = beats[state.nodeId].text;
    line.setAttribute('aria-label', full);
    let count = 0;
    line.textContent = '';
    typingTimer = window.setInterval(() => { line.textContent = full.slice(0, ++count); if (count >= full.length) clearInterval(typingTimer); }, 12);
  }
}

function bind() {
  const on = (selector: string, handler: (el: HTMLElement) => void) => app.querySelectorAll<HTMLElement>(selector).forEach(el => el.addEventListener('click', () => handler(el)));
  on('[data-start]', () => {
    if (hasSave || corrupt) openOverlay('restart');
    else { playing = true; dispatch({ type: 'start' }, `choice:${beats[state.nodeId].choices[0]?.id}`); }
  });
  on('[data-continue]', () => { playing = true; render(`choice:${beats[state.nodeId].choices[0]?.id}`); });
  on('[data-title]', () => { playing = false; overlay = 'none'; render('continue'); });
  on('[data-home]', () => { playing = false; overlay = 'none'; render('continue'); });
  on('[data-open]', el => openOverlay(el.dataset.open as typeof overlay));
  on('[data-close]', closeOverlay);
  on('[data-restart]', () => { overlay = 'restart'; render('keep'); });
  on('[data-confirm-restart]', () => {
    const settings = state.settings;
    state = createInitialState(newRunId()); state.settings = settings;
    corrupt = false; playing = true; overlay = 'none'; selectedFrame = null;
    dispatch({ type: 'start' }, `choice:${beats[state.nodeId].choices[0]?.id}`);
  });
  const nodeId = state.nodeId;
  on('[data-choice]', el => dispatch({ type: 'choose', nodeId, choiceId: el.dataset.choice! }));
  on('[data-filter]', el => dispatch({ type: 'filter', filter: el.dataset.filter as typeof state.albumFilter }, `filter:${el.dataset.filter}`));
  on('[data-inspect]', el => {
    selectedFrame = el.dataset.inspect!;
    dispatch({ type: 'inspect', frameId: selectedFrame }, 'back-to-list');
  });
  on('[data-frame]', el => { returnFocus = el.dataset.focus!; overlay = 'album'; selectedFrame = el.dataset.frame!; dispatch({ type: 'inspect', frameId: selectedFrame }, 'back-to-list'); });
  on('[data-list]', () => { const id = selectedFrame; selectedFrame = null; render(`inspect:${id}`); });
  on('[data-reorder]', el => dispatch({ type: 'reorder', frameId: el.dataset.reorder!, direction: Number(el.dataset.direction) as -1 | 1 }, el.dataset.focus));
  on('[data-view]', el => dispatch({ type: 'view', framing: el.dataset.view as typeof state.framing }, el.dataset.focus));
  on('[data-shutter]', () => dispatch({ type: 'photograph' }, 'shutter'));
  app.querySelectorAll<HTMLInputElement>('[data-setting]').forEach(el => el.addEventListener('change', () => dispatch({ type: 'setting', key: el.dataset.setting as keyof typeof state.settings, value: el.checked }, el.dataset.focus)));
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && overlay !== 'none') { e.preventDefault(); closeOverlay(); }
  if (e.key === 'Tab' && overlay !== 'none') {
    const targets = [...app.querySelectorAll<HTMLElement>('.modal button:not(:disabled), .modal input')];
    const first = targets[0], last = targets[targets.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  }
});
render();
