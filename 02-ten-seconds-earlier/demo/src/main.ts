import './style.css';
import { ANCHORS, EVIDENCE, EVIDENCE_BY_ID, CATEGORY_LABELS, SCENES, REPLIES, formatTime, type AnchorId, type Category, type EvidenceId, type ReplyId } from './content';
import { createInitialState, reduceGame, missingEvidence, caseFile, privateFile, serializeSave, restoreSave, SAVE_KEY, type GameState, type Action } from './state';
import { renderScene } from './scenes';
import { dialogueFor, frameCaption } from './presentation';

const app = document.querySelector<HTMLDivElement>('#app')!;
let state: GameState = createInitialState();
let started = false;
let saved: GameState | null = null;
let recovery = '';
let saveError = '';
let uiNotice = '';
let selectedFile: 'case' | 'private' | null = null;
let replaying = false;
let summaryChoice = '';
let witnessChecked = false;
let privateChecked = false;
let frameTimer: ReturnType<typeof setInterval> | undefined;
let decorTime = 0;
let lastPlaybackTick=performance.now();
let lastDecorTick=performance.now();
let renderVersion=0;
const typedScenes=new Set<string>();
let audioContext: AudioContext | undefined;
let ambientGain: GainNode | undefined;

const esc = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function button(label: string, action: string, css = '', attrs = '') { return `<button class="${css}" data-action="${action}" ${attrs}>${label}</button>`; }
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const result = restoreSave(raw);
      // restoreSave reports invalid data without touching any other game's storage.
      if (!result.recovered) saved = result.state;
      else recovery = result.reason || '本故事存档损坏，可以重新开始。';
    }
  } catch { recovery = '浏览器暂时无法读取存档。可以开始新调查；其他游戏存档不会被改动。'; }
}
function persist() {
  try { localStorage.setItem(SAVE_KEY, serializeSave(state)); saveError = ''; }
  catch { saveError = '此浏览器无法写入本地存档。本次仍可继续，刷新后可能无法恢复。'; }
}
function dispatch(action: Action, stageOnly = false) {
  const previousScene = state.sceneId;
  const wasPlaying=state.playing;
  state = reduceGame(state, action);
  if((!wasPlaying&&state.playing)||['PLAY_PAUSE','REPLAY_PRIVATE','SEEK','STEP','BACK_TEN'].includes(action.type)) lastPlaybackTick=performance.now();
  uiNotice = '';
  if (state.sceneId !== previousScene) { replaying = false; selectedFile = null; }
  persist();
  if (stageOnly && previousScene === state.sceneId) updateFrame();
  else render(previousScene !== state.sceneId);
}
function header() {
  return `<header class="site-header"><div class="brand"><span class="brand-mark" aria-hidden="true">↶</span><strong>历史调查室</strong><span class="muted">/ 再往前十秒</span></div><div class="header-actions"><span class="mono">LOCAL ARCHIVE · 02</span>${started ? button('重开调查','restart','quiet small') : ''}</div></header>`;
}
function settings() {
  return `<details class="panel settings" id="settings"><summary>体验设置</summary><div class="setting-options"><label><input type="checkbox" data-setting="muted" ${state.settings.muted ? 'checked':''}>静音</label><label><input type="checkbox" data-setting="typewriter" ${state.settings.typewriter ? 'checked':''}>打字效果</label><label><input type="checkbox" data-setting="reducedMotion" ${state.settings.reducedMotion ? 'checked':''}>减弱动态</label></div><p class="muted">字幕始终可读；关闭打字会立即显示完整对白。原创轻环境音，无语音配音。减弱动态停止工作室装饰动作，逐秒操作仍保留关键动作。</p></details>`;
}
function renderHome() {
  app.innerHTML = `${header()}<main class="home"><div class="home-grid"><section><div class="eyebrow">AN INVESTIGATION IN TWO ARCHIVES</div><h1>再往前<br>十秒</h1><p class="intro">过去可以看见。<br>但有些事，不能替人决定。</p><p class="muted">你是事故重建员林澈。唐雯带来一份事故委托，<br>和一段与案件无关的生日影像检索请求。</p>${recovery ? `<p class="save-error" role="alert">${esc(recovery)}</p>` : ''}<div class="home-actions">${saved ? button('继续调查','continue','primary') : ''}${button('新建调查','new',saved ? '' : 'primary')}</div><p class="muted">本地浏览器调查短篇 · 无账号 · 自动存档<br>内容提示：致人死亡的事故、家庭疏离。无伤害特写。</p></section><div class="stage"><div class="stage-label"><span>工作室 · 两份不同的委托</span><span>OBSERVATION / NOT JUDGEMENT</span></div>${renderScene('studio',4,true)}</div></div><div class="home-footer"><p>用有限地点与时间节点重建事实，再用同一套时间控件回到一个生日之前。案件材料和私人记忆各自保存，始终分开。</p><span class="mono">SFG — 02<br>离线原创 SVG 演出</span></div>${settings()}</main>`;
}
function currentKind() {
  if (state.sceneId === 'M06' || replaying) return 'family' as const;
  if (state.sceneId === 'M02' || state.sceneId === 'M03') return state.activeTimeAnchor || 'night';
  if (state.sceneId === 'M04') return 'call' as const;
  if (state.sceneId === 'M08') return 'door' as const;
  return 'studio' as const;
}
function historical() { return ['M02','M03','M06'].includes(state.sceneId) || replaying; }
function anchor() { return ANCHORS[state.activeTimeAnchor || 'night']; }
function subtitle() { return frameCaption(currentKind(),state.playheadOffsetSeconds,state.sceneId); }
function stage() {
  const timed = historical(); const a = anchor();
  const kind = currentKind();
  const seconds = timed ? state.playheadOffsetSeconds - a.minOffset : decorTime;
  const [who,text] = subtitle();
  return `<div class="stage" id="stage"><div class="stage-label"><span id="stage-location">${timed ? esc(a.location) : kind === 'call' ? '工作室 · 证言通话' : '观察工作室'}</span><strong class="mono" data-testid="time-display">${timed ? formatTime(a.id,state.playheadOffsetSeconds) : '本次调查'}</strong></div><div id="scene-art" data-testid="history-scene" aria-label="${esc(subtitle().join('：'))}">${renderScene(kind,seconds,state.settings.reducedMotion)}</div><div class="subtitle" aria-live="off"><span class="speaker" id="subtitle-speaker">${esc(who)}</span><span id="subtitle-text">${esc(text)}</span></div></div>${timed ? `<p class="source-line">来源：${esc(a.source)}<br>${esc(a.description)}</p>${timeControls()}` : `<p class="source-line">过去不会改变。记录动作、当时可获得的信息和后果；观察器不读取思想。</p>`}`;
}
function timeControls() {
  const a = anchor();
  return `<section class="time-controls" aria-label="历史时间控制"><div class="timeline"><span class="mono">${formatTime(a.id,a.minOffset)}</span><input aria-label="时间轴" type="range" min="${a.minOffset}" max="${a.maxOffset}" value="${state.playheadOffsetSeconds}" step="1" data-action="seek"><span class="mono">${formatTime(a.id,a.maxOffset)}</span></div><div class="row">${button(state.playing ? '暂停':'播放','play','primary')}${button('前一秒','back')}${button('后一秒','forward')}${button('精确回退十秒','ten')}</div><p class="muted" style="margin:0">键盘：← / → 逐秒　空格 播放 / 暂停　R 退十秒</p></section>`;
}
function sceneDialogue() {
  const lines=dialogueFor(state.sceneId,state.activeTimeAnchor,state.sourceReceiptDisclosed);
  const key=state.sceneId+'-'+state.activeTimeAnchor+'-'+state.sourceReceiptDisclosed;
  const animate=state.settings.typewriter&&!state.settings.reducedMotion&&!typedScenes.has(key);
  if(animate)typedScenes.add(key);
  return `<div class="dialogue">${lines.map(line=>`<p><b>${esc(line.speaker)}</b>${animate ? `<span class="sr-only">${esc(line.text)}</span><span class="line" aria-hidden="true" data-typing="${esc(line.text)}"></span>` : `<span class="line">${esc(line.text)}</span>`}</p>`).join('')}</div>`;
}
function evidenceCards() {
  const seen = EVIDENCE.filter(e=>state.evidenceSeen.includes(e.id));
  return `<section class="panel"><div class="panel-heading"><h2>证据整理</h2><span class="muted">${state.evidenceVerified.length} / 6 已核验</span></div><p class="muted">收集后按来源归类。分类核验仅检查事实类型，不给人物评分。</p>${seen.length ? seen.map(e=>`<details class="evidence-card" data-testid="evidence-${e.id}" ${state.evidenceVerified.includes(e.id) ? '' : 'open'}><summary><strong>${esc(e.title)}</strong><em class="${state.evidenceVerified.includes(e.id) ? 'verified':'unverified'}">${state.evidenceVerified.includes(e.id) ? '✓ 已核验':'待归类'}</em></summary><div class="body"><p>${esc(e.description)}</p><p class="source-line">${esc(e.source)}<br>${esc(e.time)}</p><select aria-label="归类：${esc(e.title)}" data-category="${e.id}"><option value="">选择事实类型</option>${Object.entries(CATEGORY_LABELS).map(([key,label])=>`<option value="${key}" ${state.evidenceCategories[e.id] === key ? 'selected':''}>${label}</option>`).join('')}</select>${button('核验：'+esc(e.title),'verify','small',`data-evidence="${e.id}"`)}</div></details>`).join('') : '<p class="note">尚未记录线索。选择查询节点，观看动作，再点击收集。</p>'}</section>`;
}
function queries() {
  return `<section class="panel"><div class="panel-heading"><h2>有限查询节点</h2><span class="muted">案件授权 A-041</span></div><div class="query-list">${(['night','earlier','mitigation'] as AnchorId[]).map(id=>button(id==='night' ? '查询：事故当晚' : id==='earlier' ? '查询：四十天前' : '查询：应急效果','query',state.activeTimeAnchor===id ? 'active':'',`data-anchor="${id}"`)).join('')}</div><p class="muted" style="margin:12px 0 0">每个节点都有固定来源；重复访问不重复添加证据。</p></section>`;
}
function collectControls() {
  const items = EVIDENCE.filter(e=>e.anchorId === state.activeTimeAnchor);
  return `<div class="panel" style="margin-top:18px"><h3>当前节点可记录</h3><div class="collection">${items.map(e=>button('收集：'+esc(e.title),'collect','',`data-evidence="${e.id}" data-testid="collect-${e.id}"`)).join('')}</div><p class="muted">${items.map(e=>`${esc(e.title)}：至少核对至 ${formatTime(state.activeTimeAnchor!,e.requiredOffset)}`).join('<br>')}</p></div>`;
}
function storyPanel() {
  let body='';
  switch(state.sceneId) {
    case 'M01': body=`<div class="split-scope"><div class="scope"><strong>案件 A-041</strong><p>关闭闸门：21:16:40<br>风险报告：R-17<br>原件可核验，来源保护中</p></div><div class="scope private"><strong>私人 P-B01</strong><p>生日录像：18:30:00<br>仅家庭检索，稍后另行授权<br>不进入事故证据库</p></div></div>${sceneDialogue()}<div class="story-actions">${button('接受双范围委托','start','primary')}</div>`; break;
    case 'M02': case 'M03': body=`${sceneDialogue()}<p class="note">${esc(SCENES[state.sceneId].instruction)}</p><div class="story-actions">${button('完成现场调查','advance','primary')}</div>`; break;
    case 'M04': body=`${sceneDialogue()}<div class="call-permission"><h3>许宁的许可范围</h3><p>可记录：事故相关时间点、应急效果核对。<br>不记录：私人语音全文、弟弟的其他生活资料。</p><label><input type="checkbox" id="witness-consent" ${witnessChecked||state.witnessConsent ? 'checked':''} ${state.witnessConsent ? 'disabled':''}>仅记录案件相关时间点与应急效果</label></div>${state.witnessConsent ? '<p class="verified">✓ 有限许可已记录 W-XN01</p>' : button('接受证言许可','witness-consent','primary')}<div class="story-actions">${button('收集证言','witness-collect','', 'data-testid="collect-witness_statement"')}${button('证言核对完成','advance','primary')}</div>`; break;
    case 'M05': body=`${sceneDialogue()}${!state.sourceReceiptDisclosed ? `<div class="choice-grid">${button('当晚处置及前期责任分别列明','summary-one')}${button('先列当晚处置，再整理前期失责','summary-two')}</div>${summaryChoice ? `<p class="note">${esc(summaryChoice)}</p><div class="story-actions">${button('唐雯出示回执','reveal','primary')}</div>` : ''}` : `<div class="receipt"><div class="eyebrow">来源核验附页 · 她主动给出</div><div class="mono">R-17 / TW-041</div><p>“最开始那份报告，是我交出去的。”<br>唐雯同意将回执列入来源核验附页。许可不包含其他私人资料。</p></div><div class="choice-grid">${Object.entries(REPLIES).map(([id,reply])=>button(esc(reply.label),'reply','',`data-reply="${id}"`)).join('')}</div>${state.replyId ? `<p class="note">${esc(REPLIES[state.replyId].response)}</p>${button('授权家庭查询','family-authorize','primary')}` : ''}`}`; break;
    case 'M06': body=`${sceneDialogue()}<p class="note">${esc(SCENES.M06.instruction)}</p><div class="clip-info"><b>私人范围 · 18:29:50–18:30:00</b>从正式录像之前开始，看看她想留下什么。${state.privateSegmentStart ? '<br>✓ 片段起点已定位' : '<br>先用同一套控件回到 18:29:50。'}</div><div class="story-actions">${button('定下这十秒','advance','primary')}</div>`;break;
    case 'M07': body=`${sceneDialogue()}<p class="note">${esc(SCENES.M07.instruction)}</p><div class="story-actions">${button('重播十秒','replay')}${button('走到门口','advance','primary')}</div>`; break;
    case 'M08': body=`${sceneDialogue()}<p class="note">唐振声仍在世，调查仍在继续。唐雯还没有决定以后怎样见他；两个文件都保留，不替她决定原谅。</p><div class="story-actions">${button('再听一次','replay','primary')}${replaying ? button('返回工作台','desk') : ''}${button('保存并留在工作台','stay')}</div>`; break;
  }
  const title = state.sceneId === 'M05' && !state.sourceReceiptDisclosed ? '把事实写完整' : '桌边的对话';
  return `<section class="panel"><div class="panel-heading"><h2>${title}</h2><span class="muted">${state.sceneId === 'M04' ? '通话中':'唐雯在场'}</span></div>${body}</section>`;
}
function files() {
  const caseData=caseFile(state); const privateData=privateFile(state);
  return `<section class="files-grid" aria-label="两个独立保存"><div class="panel file-panel"><div class="eyebrow">CASE / A-041</div><h2>案件资料包</h2><span class="file-status ${state.caseSubmitted ? 'saved':''}">${state.caseSubmitted ? '✓ 已提交 · 仅一次':'尚未提交'}</span><ul>${EVIDENCE.map(e=>`<li>${esc(e.title)}${state.evidenceVerified.includes(e.id) ? ' ✓':''}</li>`).join('')}<li>唐雯主动披露的来源核验附页</li></ul><p class="muted">包括前期失责和当晚减灾。私人片段不在附件中；此处提交材料，不给判罚结论。</p>${button('核对并提交案件','submit-case','primary')}${button('查看案件文件','view-case','quiet')}<div data-testid="case-file" data-file-content="${esc(JSON.stringify(caseData))}" class="virtual-file" ${selectedFile==='case' ? '' : 'hidden'}><h3>A-041 · 调查材料</h3><p>六项来源记录 ${caseData.submitted ? '已提交' : '待提交'}，保留前期责任与当晚处置。</p>${caseData.evidence.map(e=>`<details class="file-record"><summary>${esc(e.title)} · ${esc(CATEGORY_LABELS[e.category])}</summary><p>${esc(e.description)}</p><p class="source-line">${esc(e.time)}<br>${esc(e.source)}</p></details>`).join('')}<p>${esc(caseData.sourceAppendix?.disclosure || '来源核验附页待确认')} · R-17</p><p>${esc(caseData.witnessPermission || '证言许可待确认')}</p><p class="muted">${esc(caseData.limits)}</p></div></div><div class="panel file-panel private"><div class="eyebrow">PRIVATE / P-B01</div><h2>私人片段 · 爸爸</h2><span class="file-status ${state.privateClipSaved ? 'saved':''}">${state.privateClipSaved ? '✓ 已保存 · 单独交付':'尚未保存'}</span><p>十八年前，18:29:50–18:30:00。<br>只给唐雯，不附在报告里。</p><p class="muted">来源是已授权的历史观察。原家庭录像没有拍到这十秒。文件名由唐雯确定为“爸爸”。</p><label><input type="checkbox" id="private-consent" ${state.privateClipSaved ? 'disabled':''} ${privateChecked||state.privateExportConsent ? 'checked':''}>同意私人保存：仅这十秒，只给唐雯</label>${button('保存私人片段','save-private','warm')}${button('查看私人文件','view-private','quiet')}<div data-testid="private-file" data-file-content="${esc(JSON.stringify(privateData))}" class="virtual-file" ${selectedFile==='private' ? '' : 'hidden'}><h3>爸爸</h3><p>私人历史片段 · 10 秒<br>十八年前 18:29:50–18:30:00<br>交付对象：唐雯</p><p class="source-line">${esc(privateData.segment?.source || '尚未定位片段')}</p><p>${esc(privateData.permission || '尚未确认私人交付许可')}</p>${button('在这里重播','replay','small')}</div><p class="muted" style="margin:14px 0 0">保存不表示原谅，也不要求去见父亲。</p></div></section>`;
}
function render(sceneChanged=false) {
  const version=++renderVersion;
  const oldFocus=(document.activeElement as HTMLElement)?.dataset;
  const wasSettingsOpen = Boolean(document.querySelector<HTMLDetailsElement>('#settings')?.open);
  if (!started) { renderHome(); bind(); return; }
  const n=Number(state.sceneId.slice(1));
  const title=state.sceneId==='M05'&&!state.sourceReceiptDisclosed ? '把事实写完整' : SCENES[state.sceneId].title;
  app.innerHTML=`${header()}<main><div class="chapter-head"><div><span class="chapter-number" data-testid="scene-id">${state.sceneId}</span><span class="eyebrow"> / ${state.sceneId==='M05'&&!state.sourceReceiptDisclosed ? '来源核验' : esc(SCENES[state.sceneId].eyebrow.split('/')[1]||'')}</span><h1 tabindex="-1" id="chapter-title">${title}</h1></div><div class="progress" aria-label="第 ${n} 场，共八场">${Array.from({length:8},(_,i)=>`<span class="${i<n?'done':''}"></span>`).join('')}</div></div>${saveError ? `<div class="save-error" role="alert">${esc(saveError)}</div>`:''}<div class="notice" role="status" ${state.notice||uiNotice?'':'hidden'}>${esc(uiNotice||state.notice)}</div><div class="game-grid"><section>${stage()}${['M02','M03'].includes(state.sceneId) ? collectControls():''}${['M07','M08'].includes(state.sceneId) ? '' : settings()}</section><aside>${['M02','M03'].includes(state.sceneId) ? queries():''}${storyPanel()}${['M02','M03','M04'].includes(state.sceneId) ? evidenceCards():''}</aside></div>${['M07','M08'].includes(state.sceneId)?files()+settings():''}<footer class="site-footer"><span>自动存档 · 仅本故事命名空间 · 事实不替代关系的决定</span><span class="mono">林澈 / OBSERVER</span></footer></main>`;
  app.classList.toggle('reduced',state.settings.reducedMotion);
  if (wasSettingsOpen) document.querySelector<HTMLDetailsElement>('#settings')!.open=true;
  bind();
  app.querySelectorAll<HTMLElement>('[data-typing]').forEach(el=>{const full=el.dataset.typing!;let length=0;const timer=setInterval(()=>{if(version!==renderVersion||!el.isConnected){clearInterval(timer);return;}el.textContent=full.slice(0,++length);if(length===full.length)clearInterval(timer);},22);});
  if (sceneChanged) { document.querySelector<HTMLElement>('#chapter-title')?.focus(); window.scrollTo({top:0,behavior:'instant'}); }
  else if (oldFocus?.action === 'verify' && oldFocus.evidence && state.evidenceVerified.includes(oldFocus.evidence as EvidenceId)) document.querySelector<HTMLElement>(`[data-testid=evidence-${oldFocus.evidence}] summary`)?.focus({preventScroll:true});
  else if (oldFocus?.action) { const candidates=[...document.querySelectorAll<HTMLElement>('[data-action]')]; candidates.find(el=>el.dataset.action===oldFocus.action && el.dataset.evidence===oldFocus.evidence && el.dataset.anchor===oldFocus.anchor && el.dataset.reply===oldFocus.reply)?.focus({preventScroll:true}); }
  else if (oldFocus?.setting) document.querySelector<HTMLElement>(`[data-setting="${oldFocus.setting}"]`)?.focus({preventScroll:true});
}
function updateFrame() {
  const art=document.querySelector('#scene-art');
  if (!art) return;
  const a=anchor(); const [who,text]=subtitle();
  const notice=document.querySelector<HTMLElement>('.notice'); if(notice){notice.textContent=uiNotice||state.notice;notice.hidden=!(uiNotice||state.notice);}
  const clip=document.querySelector<HTMLElement>('.clip-info'); if(clip&&state.privateSegmentStart===-10)clip.innerHTML='<b>私人范围 · 18:29:50–18:30:00</b>✓ 片段起点已定位'+(state.privateClipViewed?'<br>✓ 五个动作已看完，可以定下这十秒。':'<br>继续播放或逐秒看完五个动作。');
  art.setAttribute('aria-label',subtitle().join('：'));
  art.innerHTML=renderScene(currentKind(),historical() ? state.playheadOffsetSeconds-a.minOffset:decorTime,state.settings.reducedMotion);
  const time=document.querySelector('[data-testid=time-display]'); if(time) time.textContent=historical()?formatTime(a.id,state.playheadOffsetSeconds):'本次调查';
  document.querySelector('#subtitle-speaker')!.textContent=who;
  document.querySelector('#subtitle-text')!.textContent=text;
  const range=document.querySelector<HTMLInputElement>('input[data-action=seek]'); if(range) range.value=String(state.playheadOffsetSeconds);
  const play=document.querySelector<HTMLButtonElement>('button[data-action=play]'); if(play) play.textContent=state.playing?'暂停':'播放';
}
function ambient() {
  if (!audioContext) {
    audioContext=new AudioContext(); const oscillator=audioContext.createOscillator();
    oscillator.type='sine'; oscillator.frequency.value=93;
    ambientGain=audioContext.createGain(); ambientGain.gain.value=0;
    oscillator.connect(ambientGain); ambientGain.connect(audioContext.destination); oscillator.start();
  }
  void audioContext.resume();
  ambientGain!.gain.setTargetAtTime(state.settings.muted ? 0 : state.sceneId==='M08' ? .008 : .016,audioContext.currentTime,.3);
}
function bind() {
  app.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach(el=>el.addEventListener('click',()=>handle(el)));
  app.querySelectorAll<HTMLInputElement>('[data-setting]').forEach(el=>el.addEventListener('change',()=>{dispatch({type:'SETTING',key:el.dataset.setting as keyof GameState['settings'],value:el.checked}); if(audioContext) ambient();}));
  app.querySelector<HTMLInputElement>('input[data-action=seek]')?.addEventListener('input',e=>dispatch({type:'SEEK',offset:Number((e.target as HTMLInputElement).value)},true));
  app.querySelector<HTMLInputElement>('#witness-consent')?.addEventListener('change',e=>witnessChecked=(e.target as HTMLInputElement).checked);
  app.querySelector<HTMLInputElement>('#private-consent')?.addEventListener('change',e=>privateChecked=(e.target as HTMLInputElement).checked);
}
function handle(el: HTMLButtonElement) {
  switch(el.dataset.action) {
    case 'new': if(saved&&!confirm('重新开始本故事？将覆盖本故事存档，其他存档不受影响。'))return; state=createInitialState();typedScenes.clear(); started=true; saved=null; recovery=''; persist();render(true);break;
    case 'continue': if(saved){state=saved;started=true;render(true);}break;
    case 'restart': if(confirm('重新开始本故事？将覆盖本故事存档，其他存档不受影响。')){state=createInitialState();typedScenes.clear();replaying=false;summaryChoice='';witnessChecked=false;privateChecked=false;persist();render(true);}break;
    case 'start':dispatch({type:'START'});break;
    case 'query':replaying=false;dispatch({type:'QUERY',anchorId:el.dataset.anchor as AnchorId});break;
    case 'play':ambient();dispatch({type:'PLAY_PAUSE'});break;
    case 'back':dispatch({type:'STEP',seconds:-1},true);break;
    case 'forward':dispatch({type:'STEP',seconds:1},true);break;
    case 'ten':dispatch({type:'BACK_TEN'});break;
    case 'collect':dispatch({type:'COLLECT',evidenceId:el.dataset.evidence as EvidenceId});break;
    case 'verify':{
      const id=el.dataset.evidence as EvidenceId;const category=app.querySelector<HTMLSelectElement>(`select[data-category=${id}]`)!.value;
      if (!category) {uiNotice='先选择事实类型，再核验。';state={...state,notice:''};render();return;}
      dispatch({type:'CLASSIFY',evidenceId:id,category:category as Category});break;
    }
    case 'advance':dispatch({type:'ADVANCE'});break;
    case 'witness-consent':dispatch({type:'CONSENT_WITNESS',accepted:witnessChecked});break;
    case 'witness-collect':dispatch({type:'COLLECT',evidenceId:'witness_statement'});break;
    case 'summary-one':summaryChoice='摘要分别列明当晚处置与前期责任，事实没有删减。';render();break;
    case 'summary-two':summaryChoice='唐雯：“你不用先让我好受一点。”她把完整的材料留在桌上。';render();break;
    case 'reveal':dispatch({type:'REVEAL_SOURCE'});break;
    case 'reply':dispatch({type:'REPLY',replyId:el.dataset.reply as ReplyId});break;
    case 'family-authorize':dispatch({type:'AUTHORIZE_FAMILY'});break;
    case 'submit-case':dispatch({type:'SUBMIT_CASE'});break;
    case 'save-private':state=reduceGame(state,{type:'CONSENT_PRIVATE',accepted:privateChecked||state.privateExportConsent});dispatch({type:'SAVE_PRIVATE'});break;
    case 'view-case':selectedFile=selectedFile==='case'?null:'case';render();break;
    case 'view-private':selectedFile=selectedFile==='private'?null:'private';render();break;
    case 'replay':replaying=true;dispatch({type:'REPLAY_PRIVATE'});ambient();break;
    case 'desk':replaying=false;state={...state,playing:false,notice:'回到工作台。案件已提交，私人文件已保存；仍可再次重播。'};persist();render();break;
    case 'stay':replaying=false;state={...state,playing:false,notice:'已保存。工作台和两个文件都在这里，随时可以再听一次。'};persist();render();break;
  }
}
document.addEventListener('keydown',e=>{
  if (!started||!historical()||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
  const tag=(e.target as HTMLElement)?.tagName;
  if(['INPUT','SELECT','TEXTAREA'].includes(tag))return;
  if (e.key==='ArrowLeft') {e.preventDefault();dispatch({type:'STEP',seconds:-1},true);}
  if (e.key==='ArrowRight') {e.preventDefault();dispatch({type:'STEP',seconds:1},true);}
  if (e.key===' ' && !['BUTTON','SUMMARY'].includes(tag)){e.preventDefault();ambient();dispatch({type:'PLAY_PAUSE'});}
  if (e.key.toLowerCase()==='r'){e.preventDefault();dispatch({type:'BACK_TEN'});}
});
load();render();
frameTimer=setInterval(()=>{
  if (!started)return;
  const now=performance.now();
  if(document.hidden){lastPlaybackTick=now;return;}
  if (state.playing&&historical()&&now-lastPlaybackTick>=1000) {lastPlaybackTick=now;dispatch({type:'TICK'},true);}
  else if (!historical()&&!state.settings.reducedMotion&&now-lastDecorTick>=1000) {lastDecorTick=now;decorTime=(decorTime+1)%21;updateFrame();}
},100);
window.addEventListener('pagehide',()=>{if(started)persist();clearInterval(frameTimer);});
