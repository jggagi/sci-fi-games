import type { GameState } from './state';

/** Original, self-contained illustrations. No network assets or hidden game state. */
const INK = '#244657';

function stars(): string {
  return Array.from({ length: 58 }, (_, i) => {
    const x = (i * 173 + 31) % 1000;
    const y = (i * 89 + 17) % 520;
    const r = i % 9 === 0 ? 1.8 : 0.8;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#c3e8ef" opacity="${i % 3 === 0 ? '.68' : '.28'}"/>`;
  }).join('');
}

function defs(): string {
  return `<defs>
    <linearGradient id="art-space" x2=".8" y2="1"><stop stop-color="#081826"/><stop offset="1" stop-color="#244956"/></linearGradient>
    <linearGradient id="art-metal" x2="0" y2="1"><stop stop-color="#547984"/><stop offset="1" stop-color="#1b3441"/></linearGradient>
    <linearGradient id="art-wall" x2="1" y2="1"><stop stop-color="#334d56"/><stop offset="1" stop-color="#162c37"/></linearGradient>
    <linearGradient id="art-glass" x2=".8" y2="1"><stop stop-color="#3d7987" stop-opacity=".20"/><stop offset="1" stop-color="#06151f" stop-opacity=".04"/></linearGradient>
    <linearGradient id="art-earth" x2=".4" y2="1"><stop stop-color="#99ccd0"/><stop offset=".26" stop-color="#3c7f8c"/><stop offset="1" stop-color="#17344d"/></linearGradient>
    <linearGradient id="art-floor" x2="0" y2="1"><stop stop-color="#56646a"/><stop offset="1" stop-color="#1c3039"/></linearGradient>
    <linearGradient id="art-cardboard" x2="0" y2="1"><stop stop-color="#cfac72"/><stop offset="1" stop-color="#95693f"/></linearGradient>
    <linearGradient id="art-room" x2="1" y2="1"><stop stop-color="#534f4d"/><stop offset="1" stop-color="#283946"/></linearGradient>
    <radialGradient id="art-glow"><stop stop-color="#ffd486" stop-opacity=".46"/><stop offset=".3" stop-color="#ffcd77" stop-opacity=".2"/><stop offset="1" stop-color="#ffce82" stop-opacity="0"/></radialGradient>
    <radialGradient id="art-horizon"><stop stop-color="#9bd4d7" stop-opacity=".55"/><stop offset="1" stop-color="#9bd4d7" stop-opacity="0"/></radialGradient>
    <clipPath id="art-window"><rect x="88" y="40" width="824" height="367" rx="45"/></clipPath>
    <clipPath id="art-mirror"><ellipse cx="697" cy="225" rx="226" ry="198"/></clipPath>
    <clipPath id="art-living-window"><rect x="601" y="51" width="335" height="257" rx="28"/></clipPath>
    <clipPath id="art-cabin-window"><path d="M179 31H821L946 318H54Z"/></clipPath>
  </defs>`;
}

function frame(title: string, description: string, body: string): string {
  return `<svg class="scene-art" data-scene-art="${title}" viewBox="0 0 1000 560" role="img" aria-labelledby="art-title art-desc" xmlns="http://www.w3.org/2000/svg">
    <title id="art-title">${title}</title><desc id="art-desc">${description}</desc>${defs()}
    <rect width="1000" height="560" fill="#152d3a"/>${body}
    <rect x="1" y="1" width="998" height="558" rx="12" fill="none" stroke="#a0b8be" stroke-opacity=".12"/>
  </svg>`;
}

function mirror(): string {
  const panels = Array.from({ length: 9 }, (_, row) => Array.from({ length: 12 }, (_, col) => {
    const x = 458 + col * 41;
    const y = 22 + row * 47;
    return `<path d="M${x} ${y}h38l-6 42h-38Z" fill="${(row + col) % 4 === 0 ? '#6795a0' : '#406b7b'}" fill-opacity=".58" stroke="#accbd1" stroke-opacity=".36" stroke-width=".7"/>`;
  }).join('')).join('');
  return `<g transform="rotate(-19 697 225)">
    <ellipse cx="697" cy="225" rx="233" ry="204" fill="#1d4659" stroke="#adc9d0" stroke-opacity=".55" stroke-width="3"/>
    <g clip-path="url(#art-mirror)">${panels}<path d="M460 330L890 83" stroke="#b6d7d9" stroke-opacity=".27" stroke-width="12"/><path d="M464 340L894 93" stroke="#dce7cc" stroke-opacity=".35" stroke-width="2"/></g>
    <ellipse cx="697" cy="225" rx="231" ry="202" fill="none" stroke="#bdcfcb" stroke-opacity=".43" stroke-width="1"/>
    <path d="M493 370L869 73M458 173L935 284" stroke="#173340" stroke-width="8"/>
    <circle cx="697" cy="225" r="16" fill="#284956" stroke="#a7bfc3"/><circle cx="697" cy="225" r="5" fill="#efb768"/>
  </g>`;
}

function toolBox(x: number, y: number, scale = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M26 8V0h46v8" fill="none" stroke="#c1ad86" stroke-width="6"/><rect width="103" height="58" rx="8" fill="#c69d60" stroke="#e0bf85" stroke-width="2"/><path d="M0 19h103" stroke="#725d45" stroke-width="4"/><rect x="23" y="14" width="10" height="18" rx="2" fill="#dcceac"/><rect x="74" y="14" width="10" height="18" rx="2" fill="#dcceac"/><path d="M12 47h25M60 43h25" stroke="#96744d" stroke-width="2"/></g>`;
}

function lamp(x: number, y: number, on: boolean, size = 1): string {
  return `<g data-art-lamp="${on ? 'on' : 'off'}" transform="translate(${x} ${y}) scale(${size})">
    ${on ? '<ellipse class="art-shimmer" cy="17" rx="103" ry="85" fill="url(#art-glow)"/>' : ''}
    <path d="M0 13v37m-16 0h32" fill="none" stroke="#a7b6b3" stroke-width="6" stroke-linecap="round"/>
    <path d="M-23 9l9-20h28L23 9Z" fill="#69838a" stroke="#b6c6c5" stroke-width="2"/>
    <ellipse cy="9" rx="23" ry="5" fill="${on ? '#ffdc94' : '#3a505b'}"/>
    ${on ? '<path d="M-12 16h24" stroke="#fbd796" stroke-width="2" stroke-linecap="round"/>' : ''}
  </g>`;
}

function cup(x: number, y: number, scale = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M23 8c18-3 18 22 0 22" fill="none" stroke="#ced6c7" stroke-width="5"/><path d="M0 3h28l-3 34H4Z" fill="#bbc9c2" stroke="#e8e7cb" stroke-width="1.4"/><ellipse cx="14" cy="3" rx="14" ry="4" fill="#47584e"/><path d="M7 13h14" stroke="#7f9d94" stroke-width="2"/></g>`;
}

function person(x: number, y: number, scale = 1, father = false): string {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M-19 79l-6 46m36-46 8 46" fill="none" stroke="#182c35" stroke-width="15" stroke-linecap="round"/>
    <path d="M-22 42c3-20 43-21 46 0l-5 46h-37Z" fill="${father ? '#879087' : '#547b89'}" stroke="#aac0bb" stroke-opacity=".35" stroke-width="2"/>
    <path d="M-21 42l-15 35m57-35 12 34" fill="none" stroke="${father ? '#8a9289' : '#628c98'}" stroke-width="11" stroke-linecap="round"/>
    <path d="M-9 27v7h19v-7" fill="#baae92"/><circle cy="14" r="17" fill="#beb498"/>
    <path d="M-16 13c-3-21 34-24 33-1l-7-7-24 5Z" fill="${father ? '#d2d4c7' : '#263d43'}"/>
    ${father ? '<path d="M-13 19h26" stroke="#526769" stroke-width="1.8"/>' : ''}
  </g>`;
}

function corridor(state: GameState): string {
  const lit = state.inspectionLampOn;
  const connected = state.lampPort === 'P2';
  return frame(state.sceneId === 'S01' ? '返站 · 轨道巨镜' : '维修廊 · 正常运行',
    `巨大的分片镜面悬在维修廊外。自动维护单元正常工作。近处放着旧工具箱和杯子。检修灯${lit ? '亮着' : '关闭'}。`,
    `<rect width="1000" height="430" fill="url(#art-space)"/>${stars()}
    <g class="art-drift">${mirror()}<path d="M-170 395Q175 94 429 385" fill="none" stroke="#2d697b" stroke-width="43" opacity=".42"/><path d="M-170 383Q175 82 429 373" fill="none" stroke="#8dced0" stroke-width="2" opacity=".35"/></g>
    <path d="M0 0h1000v32H0ZM0 0h47v404H0Zm960 0h40v440h-40Z" fill="#233d48"/>
    <path d="M0 424L1000 363v197H0Z" fill="url(#art-floor)"/>
    <path d="M0 452l1000-53M92 560l100-148m221 148 56-164m340 164-16-180" stroke="#8ea5a7" stroke-opacity=".25" stroke-width="2"/>
    <path d="M0 383L1000 326m-902 51v75m244-89v67m247-85v60m255-74v47" fill="none" stroke="#7e9da6" stroke-width="10"/>
    <path d="M0 381L1000 324" stroke="#c6d7d5" stroke-opacity=".65" stroke-width="2"/>
    <g class="art-pulse" transform="translate(746 245)"><path d="M-40 4-57-26m20 55-19 20M32-4l31-25m-34 58 28 21" stroke="#9fb8b8" stroke-width="7"/><rect x="-39" y="-8" width="82" height="43" rx="13" fill="#d0dcd0" stroke="#8aafb6" stroke-width="3"/><circle cx="-9" cy="11" r="9" fill="#3f717d"/><path d="m-14 11 4 4 8-9" fill="none" stroke="#cce9c5" stroke-width="2"/><text x="8" y="15" fill="#244d5d" font-size="11" font-family="monospace">AUTO</text><circle cx="32" cy="3" r="3" fill="#afcca1"/></g>
    <g transform="translate(481 410)"><path d="M0 2h150v98H0Z" fill="#25404d" stroke="#78949d" stroke-width="3"/><rect x="12" y="14" width="79" height="49" rx="4" fill="#12313b" stroke="#698b95"/><path d="m25 30 5 5 11-14m-16 28 5 5 11-14" stroke="#acdcc5" stroke-width="3" fill="none"/><path d="M52 28h27M52 47h27" stroke="#84b8bd" stroke-width="3"/><circle cx="110" cy="31" r="9" fill="#2a4c5a" stroke="#b4c1b2"/><circle cx="133" cy="31" r="9" fill="#2a4c5a" stroke="#b4c1b2"/><text x="103" y="54" font-size="11" fill="#d5dfd3" font-family="monospace">P1</text><text x="126" y="54" font-size="11" fill="#d5dfd3" font-family="monospace">P2</text><path d="M${connected ? 133 : 110} 32C154 28 151-33 171-34" stroke="#d5b073" stroke-width="4" fill="none"/></g>
    ${lamp(658, 376, lit, .8)}${toolBox(112, 431, 1.2)}${cup(260, 436, .7)}
    ${person(354, 334, 1.12, true)}
    <path d="M775 490h164v12H775Zm18 12v38m126-38v38" fill="none" stroke="#7b9598" stroke-width="8"/>
    <rect x="790" y="469" width="104" height="21" rx="7" fill="#526c79"/><path d="M810 467v-18h62v18" fill="none" stroke="#98b4b4" stroke-width="4"/>
    <path d="M50 74v123m0 17v11" stroke="#a4ccd0" stroke-width="2" opacity=".35"/>
    <text x="70" y="74" fill="#a7c4c8" font-size="13" letter-spacing="5" font-family="monospace">04 / MAINTENANCE</text>`);
}

/** The same original sheet is revealed by clipping; clues never swap to another asset. */
function drawingSheet(state: GameState, prefix: string, forceFull = false): string {
  const fold = forceFull || state.drawingUnfolded ? 3 : state.drawingFold;
  const width = [170, 332, 498, 660][fold];
  const selected = state.childhoodDestination;
  return `<defs><clipPath id="${prefix}-paper-clip"><rect x="2" y="2" width="${width - 4}" height="416" rx="4"/></clipPath></defs>
    <g data-artifact="old-drawing" data-fold="${fold}" clip-path="url(#${prefix}-paper-clip)">
      <path d="M6 4 649 9l7 398-650 9Z" fill="#e5d7aa" stroke="#bcae88" stroke-width="3"/>
      <path d="M20 19 631 22l4 372-615 4Z" fill="#efe1b8" opacity=".54"/>
      <path d="M164 6v407M328 8v403M492 7v403M8 209l642-2" stroke="#a9966e" stroke-opacity=".34" stroke-width="1.5"/>
      <path d="M167 7v406M331 8v401M495 9v400M8 211l640-2" stroke="#faf0d1" stroke-opacity=".65"/>
      <g fill="none" stroke="#5a8ba8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M37 97c-7-19 10-29 22-24 2-18 32-21 37-4 21-7 35 7 30 25-5 11-23 8-32 8H46Z"/><path d="m50 117-5 13m34-15-5 14m31-13-5 13"/>
        <path d="M46 270c-15-8-14-30 0-38-7 19 3 31 16 34-5 5-9 6-16 4Zm53-5c-15-8-14-30 0-38-7 19 3 31 16 34-5 5-9 6-16 4Zm50 5c-15-8-14-30 0-38-7 19 3 31 16 34-5 5-9 6-16 4Z"/>
        <path d="M151 113c84-39 89-34 160-19m-167 167c92 26 89-39 154-14" stroke-dasharray="5 8" stroke-width="2"/>
      </g>
      <g fill="${INK}" font-family="KaiTi,STKaiti,serif" font-size="21"><text x="22" y="161" transform="rotate(-4 22 161)">会下雨的星球</text><text x="27" y="303" font-size="17" transform="rotate(3 27 303)">能看见三个月亮</text><text x="65" y="326" font-size="17">的地方</text></g>
      <g fill="none" stroke="#536f84" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m254 235 31-78 194 6 92 80-77 26-209-13Z"/><path d="m288 174 65 6 12 50-87-1Zm115 10 50-2 48 47-91 4Z"/><path d="m261 244-24 26-31-34 30-19Zm304-6 41-19-14 43-26-12Z"/><path d="M322 253l-4 24m148-16 4 21"/>
        <circle cx="442" cy="198" r="12"/><path d="m437 210-6 17m15-16 10 15m-13-2h-10m11 2h15"/>
        <path d="M299 200v21m-7-11h15"/>
        <path d="M351 158 388 93l26 66M356 150l40-4"/>
      </g>
      <g fill="${INK}" font-family="KaiTi,STKaiti,serif" font-size="28">
        <text x="429" y="122" transform="rotate(5 429 122)">我当船长</text><text x="258" y="308" transform="rotate(-5 258 308)">爸爸修船</text><text x="333" y="369" font-size="34" transform="rotate(2 333 369)">星期六出发</text>
      </g>
      <g stroke="#896847" fill="none" stroke-width="2"><path d="M509 287q27-7 35-34"/><path d="m537 256 9-6 1 12"/></g><text x="466" y="310" font-family="KaiTi,STKaiti,serif" font-size="19" fill="#896847" transform="rotate(-3 466 310)">先装灯</text>
      <path d="M543 216h13v14h-13Z" fill="#d3ac61" stroke="#876b48" stroke-width="2"/>
      <path d="M213 62l9 4m373 279 10-7M31 376l8-3" stroke="#b7a07c" stroke-width="2" opacity=".55"/>
      ${selected ? `<path d="${selected === 'rain' ? 'M20 169q67 18 140-3' : 'M23 335q73 11 144-4'}" stroke="#c79855" stroke-width="3" fill="none" stroke-dasharray="4 4"/>` : ''}
    </g>
    <path d="M${width - 9} 4v408" stroke="#a28b66" stroke-opacity=".3" stroke-width="2"/>`;
}

export function renderDrawing(state: GameState): string {
  const visible = state.drawingUnfolded || state.drawingFold === 3;
  return `<svg class="drawing-art" viewBox="0 0 660 420" role="img" aria-labelledby="drawing-title drawing-desc" xmlns="http://www.w3.org/2000/svg"><title id="drawing-title">同一张旧画 · ${visible ? '完全展开' : '正在展开'}</title><desc id="drawing-desc">${visible ? '一艘歪歪的船，旁边写着爸爸修船、我当船长、星期六出发。另一种笔迹写着先装灯。左边是会下雨的星球和能看见三个月亮的地方。' : '纸的已展开部分能看见童稚地名。折痕与铅笔笔迹仍在原处。'}</desc>${drawingSheet(state, 'drawing')}</svg>`;
}

function living(state: GameState): string {
  const full = state.drawingUnfolded || state.drawingFold === 3;
  const drawingScale = full ? .6 : .66;
  const drawingX = full ? 304 : state.drawingFold === 2 ? 295 : 351;
  return frame('生活舱 · 同一张纸',
    `储物柜里有旧工具、工作照片、地面返程票和空白申请表。工作台上的旧画${full ? '已经完全展开' : '保留着折痕，正在逐步展开'}。一盆植物、鞋和杯子留在生活空间里。`,
    `<rect width="1000" height="560" fill="url(#art-wall)"/>
    <g clip-path="url(#art-living-window)"><rect x="601" y="51" width="335" height="257" fill="url(#art-space)"/>${stars()}<g transform="translate(380 -50) scale(.65)">${mirror()}</g></g>
    <rect x="601" y="51" width="335" height="257" rx="28" fill="url(#art-glass)" stroke="#76959d" stroke-width="10"/><path d="M629 67h223" stroke="#9ec4c9" stroke-opacity=".3" stroke-width="2"/>
    <path d="M0 62h282v306H0" fill="#233f4a" stroke="#69848a" stroke-width="4"/><path d="M17 147h248M17 248h248" stroke="#93aaa7" stroke-width="6"/>
    <rect x="35" y="72" width="72" height="66" rx="3" fill="#bdc7b3"/><rect x="43" y="80" width="56" height="45" fill="#345f70"/><path d="m48 112 17-19 28 17" fill="none" stroke="#a4bec1" stroke-width="3"/><circle cx="81" cy="93" r="5" fill="#c1d4c5"/>
    <path d="M145 77v59m15-59v59m15-51v49" stroke="#a4a695" stroke-width="10"/><rect x="144" y="92" width="44" height="5" fill="#d0bc8e"/>
    <rect x="34" y="166" width="144" height="71" rx="6" fill="#496273" stroke="#80999f"/><path d="M55 184h104m-97 17h93m-91 17h53" stroke="#869d9f" stroke-width="2"/><rect x="194" y="170" width="47" height="65" rx="2" fill="#9b9e87"/>
    <g transform="translate(55 274)"><path d="M0 24C12 4 22 8 25 22l31 6v15H0Zm76 0C88 4 98 8 101 22l31 6v15H76Z" fill="#aba58c" stroke="#d0c7a8" stroke-width="2"/><path d="M4 36h48m27 0h47" stroke="#536873" stroke-width="3"/></g>
    <path d="M0 386h1000v174H0Z" fill="url(#art-floor)"/><path d="M0 432h1000" stroke="#809597" stroke-opacity=".24"/>
    <path d="M260 333 875 327 983 473 193 492Z" fill="#8b8d7d" stroke="#c6bf9c" stroke-width="3"/><path d="M193 492h790v22H193Z" fill="#4e665f"/><path d="M233 511v49m711-47v47" stroke="#718781" stroke-width="21"/>
    <path d="M226 454h721M322 339l-20 127M842 336l48 120" stroke="#d7cba5" stroke-opacity=".12" stroke-width="2"/>
    ${toolBox(219, 356, .77)}${cup(829, 350, 1.03)}
    <g transform="translate(${drawingX} 262) rotate(-5) scale(${drawingScale})">${drawingSheet(state, 'scene-paper')}</g>
    <g transform="translate(777 394) rotate(8)"><rect width="83" height="53" rx="3" fill="#d7dfcf" stroke="#b4c4bd"/><path d="M12 14h56M12 35h25m10 0h16" stroke="#607f80" stroke-width="2"/><text x="12" y="27" font-size="10" fill="#486977">地面 · 回程票</text></g>
    <g transform="translate(861 389) rotate(12)"><rect width="66" height="85" rx="3" fill="#c3d6d3"/><path d="M9 16h45M9 27h24M9 48h48M9 62h48" stroke="#7a9d9f" stroke-width="1.6"/><rect x="10" y="31" width="44" height="10" fill="none" stroke="#7a9d9f"/></g>
    <g transform="translate(419 98)"><path d="M-37 30h76L24 81h-44Z" fill="#c09c67" stroke="#d4b17c" stroke-width="2"/><path d="M1 34V-43m0 38c-31 1-43-30-42-39 23-5 39 18 42 39Zm0-13c22-10 34-36 33-48-27 3-34 34-33 48Zm0 34c27 4 46-13 49-27-28-8-45 8-49 27Zm0-8c-31 10-45-4-49-21 31-6 42 9 49 21Z" fill="#a7bba0" stroke="#718f78" stroke-width="2"/></g>
    <g transform="translate(88 416)"><rect width="77" height="105" rx="10" fill="#476271" stroke="#93a8a9" stroke-width="3"/><path d="M22 2v-21h32V2M15 11v81M62 11v81" fill="none" stroke="#b3bdb0" stroke-width="4"/><circle cx="16" cy="109" r="5" fill="#162c36"/><circle cx="61" cy="109" r="5" fill="#162c36"/></g>
    <path d="M326 94h29M340 80v28" stroke="#c1cbb3" stroke-opacity=".38" stroke-width="2"/>${lamp(563, 263, true, .65)}`);
}

function observation(): string {
  return frame('观景舱 · 空白的申请', '宽大的观察窗外是巨镜和正常运行的维护单元。窗边两个人站着，一盏暖灯照着工具箱。控制台的申请姓名格还是空白。',
    `<rect width="1000" height="560" fill="url(#art-wall)"/>
    <g clip-path="url(#art-window)"><rect x="88" y="40" width="824" height="367" fill="url(#art-space)"/>${stars()}<g class="art-drift" transform="translate(-38 -48) scale(1.12)">${mirror()}</g><path d="M140 323l123-70M144 327l-4 12" stroke="#81aab5" stroke-width="1" opacity=".6"/><circle cx="263" cy="252" r="3" fill="#cde5d6"/></g>
    <rect x="88" y="40" width="824" height="367" rx="45" fill="url(#art-glass)" stroke="#8ba6aa" stroke-width="13"/><path d="M503 44v357M111 356h778" stroke="#5d7e8b" stroke-width="8"/><path d="M120 60h285" stroke="#bdd3d0" stroke-opacity=".38" stroke-width="2"/>
    <path d="M0 438 1000 424v136H0Z" fill="url(#art-floor)"/><path d="M0 466 1000 450m-411 110-36-136M178 560l78-127" stroke="#9faeac" stroke-opacity=".2" stroke-width="2"/>
    <path d="M111 401h233v13H111Zm20 13v45m193-45v45" stroke="#758f94" stroke-width="8" fill="none"/>
    <rect x="105" y="390" width="244" height="19" rx="8" fill="#688d97"/>
    ${person(459, 285, 1.26, true)}${person(543, 292, 1.22)}${toolBox(362, 432, .76)}${lamp(128, 431, true, .66)}
    <path d="M731 346h204l49 157H687Z" fill="#324e5b" stroke="#89a6a9" stroke-width="3"/>
    <path d="M745 363h173l22 89H718Z" fill="#142d39" stroke="#597f8e" stroke-width="3"/>
    <path d="M761 383h119m-121 14h59" stroke="#9cbfbd" stroke-width="3"/><path d="M751 416h137v20H751Z" stroke="#7aa8b0" stroke-width="1.5" fill="none"/><path d="M761 427h11" stroke="#d9d9b6" stroke-width="2"/>
    <rect x="759" y="465" width="73" height="5" rx="2" fill="#a8c5bd"/>
    <text x="123" y="105" fill="#b7d1d0" font-size="12" letter-spacing="4" font-family="monospace">OBSERVATION / 03</text>`);
}

function childhood(state: GameState): string {
  const on = state.childhoodLampOn;
  const placed = state.childhoodLampPlaced;
  const destination = state.childhoodDestination;
  return frame('童年 · 纸箱船',
    `这是明确标记的童年回忆。纸箱做成船，胶带贴着折角。小手电${placed ? '放在船头' : '还在桌边'}，灯${on ? '亮着' : '未点亮'}。${destination === 'rain' ? '想象中的目的地是雨星球。' : destination === 'threeMoons' ? '想象中的目的地是三个月亮。' : '两种童年目的地尚未选择。'}`,
    `<rect width="1000" height="560" fill="url(#art-room)"/>
    <rect x="46" y="36" width="289" height="295" rx="5" fill="#163147" stroke="#8699a0" stroke-width="13"/><path d="M48 173h286M191 36v295" stroke="#84959b" stroke-width="9"/>
    <g fill="#d3d6bb" opacity=".78"><circle cx="114" cy="92" r="14"/>${destination === 'threeMoons' ? '<circle cx="242" cy="80" r="21"/><circle cx="275" cy="124" r="10"/>' : ''}</g>
    ${destination !== 'threeMoons' ? '<g stroke="#8ab3bc" stroke-opacity=".48" stroke-width="2"><path d="m80 72-9 21m68 32-9 21m118-75-9 21m24 92-9 21m-57 26-9 21m-93-22-9 21m69 43-9 21m85-26-9 21"/></g>' : ''}
    <path d="M0 391h1000v169H0Z" fill="#8d775b"/><path d="M0 442h1000M0 512h1000m-796-121v51m469 0v70m-564 0v48m752-169v51" stroke="#d1ad78" stroke-opacity=".28" stroke-width="2"/>
    <path d="M387 27h213" stroke="#8e9a92" stroke-width="2"/><path d="M398 28l37 25 35-25 38 25 37-25 36 25 18-25" fill="#a69b75" stroke="#c4b695" stroke-width="2"/>
    <path d="M804 100h123v148H804Z" fill="#7e8170" stroke="#b8ba9a" stroke-width="5"/><path d="M828 226l12-47 30 5 13 42M833 179l22-24 16 29" fill="none" stroke="#c7c6a5" stroke-width="3"/>
    <g transform="translate(220 281)"><path d="M-14 117 36 38l39 58 17 60" stroke="#24343c" stroke-width="22" fill="none" stroke-linecap="round"/><path d="M-7 38c10-23 48-30 64-9l22 70-60 9Z" fill="#8f9685" stroke="#bbc1a1" stroke-width="2"/><path d="M49 47 94 78l45 4" stroke="#a9aa8a" stroke-width="14" fill="none" stroke-linecap="round"/><circle cx="14" cy="7" r="23" fill="#c7b899"/><path d="M-7 3c-4-30 45-28 43 2L21-7Z" fill="#3a4140"/></g>
    <path d="M328 324 615 263 788 331 829 465 356 489Z" fill="url(#art-cardboard)" stroke="#e0c18e" stroke-width="3"/>
    <path d="M328 324 420 292 454 442 356 489Z" fill="#b48654" stroke="#d9b07b" stroke-width="3"/><path d="M454 442 788 331 829 465 356 489Z" fill="#bb945e" stroke="#d8b57b" stroke-width="2"/>
    <path d="M424 290 616 260 679 267 679 312 443 345Z" fill="#d6b57e" stroke="#e8cf9f" stroke-width="3"/><path d="M788 332 848 293 860 412 816 429" fill="#af844f" stroke="#d4ad72" stroke-width="3"/>
    <path d="M427 313 448 432M644 459l-27-150M798 388l16 50" stroke="#d5c4a0" stroke-width="19" opacity=".84"/><path d="M427 313 448 432M644 459l-27-150M798 388l16 50" stroke="#a99b7b" stroke-width="1" opacity=".58"/>
    <ellipse cx="525" cy="416" rx="31" ry="27" fill="#5c797f" stroke="#e4c793" stroke-width="8"/><ellipse cx="710" cy="399" rx="31" ry="27" fill="#5c797f" stroke="#e4c793" stroke-width="8"/><path d="M509 425 539 404m156 4 29-21" stroke="#a6bbab" stroke-width="2" opacity=".5"/>
    <path d="M507 308c-2-27 45-38 58-15l7 45-72 13Z" fill="#668d97"/><circle cx="531" cy="264" r="25" fill="#d5c5a3"/><path d="M506 260c-1-36 53-35 51-2l-19-14-21 9Z" fill="#3c4646"/><path d="M511 312 476 336m82-27 39 12" stroke="#d3c09a" stroke-width="13" stroke-linecap="round"/>
    ${placed ? `<g transform="translate(719 324) rotate(-15)">${on ? '<ellipse class="art-shimmer" cx="28" cy="4" rx="173" ry="120" fill="url(#art-glow)"/>' : ''}<rect x="-21" y="-8" width="42" height="17" rx="4" fill="#477e82" stroke="#b9ccb4" stroke-width="2"/><path d="M21-11v22l12-5V-6Z" fill="${on ? '#ffda87' : '#ccd0b2'}"/>${on ? '<path d="M34-7 92-25v53L34 7Z" fill="#ffd58a" fill-opacity=".19"/>' : ''}</g>` : '<g transform="translate(903 417) rotate(-15)"><rect x="-21" y="-8" width="42" height="17" rx="4" fill="#477e82" stroke="#b9ccb4" stroke-width="2"/><path d="M21-11v22l12-5V-6Z" fill="#ccd0b2"/></g>'}
    <g transform="translate(54 428)"><rect width="117" height="55" rx="2" fill="#e5d4a7"/><path d="m13 33 25-20 26 15 23-12 16 24" stroke="#789592" stroke-width="2" fill="none"/></g>
    <path d="M912 465l34 12m-45-2 23 11m-61-28 27 7" stroke="#d5af7b" stroke-width="6" stroke-linecap="round"/>
    <text x="54" y="365" fill="#d5d6bd" font-size="15" letter-spacing="5">童年 · 客厅</text>`);
}

function control(state: GameState): string {
  return frame('控制台 · 重新填写', '旧纸完整保留，旁边是现在的申请界面。窗外是轨道设施；这次的目的地需要由成年玩家重新填写并确认。',
    `<rect width="1000" height="560" fill="url(#art-wall)"/>
    <g clip-path="url(#art-window)"><rect x="88" y="40" width="824" height="367" fill="url(#art-space)"/>${stars()}<g transform="translate(123 -26) scale(.86)">${mirror()}</g></g>
    <rect x="88" y="40" width="824" height="367" rx="45" fill="url(#art-glass)" stroke="#8ba6aa" stroke-width="10"/>
    <path d="M0 429h1000v131H0Z" fill="url(#art-floor)"/><path d="M73 311h845l66 225H10Z" fill="#3f5962" stroke="#8caaa9" stroke-width="3"/>
    <path d="M554 327h316l37 135H532Z" fill="#173440" stroke="#7b9da5" stroke-width="4"/><path d="M586 351h234m-239 18h102" stroke="#98c4c4" stroke-width="3"/>
    <rect x="578" y="392" width="246" height="37" rx="4" fill="none" stroke="#84adb1" stroke-width="2"/><path d="M592 412h13" stroke="#e2dcb6" stroke-width="2"/>
    ${state.adultPlan ? '<path d="m781 409 8 8 14-18" fill="none" stroke="#d4d4ad" stroke-width="3"/>' : ''}
    <g transform="translate(85 312) rotate(-3) scale(.65)">${drawingSheet(state, 'scene-paper', true)}</g>
    <path d="M17 536h966v24H17Z" fill="#263e48"/>
    <path d="M565 490h110m14 0h50" stroke="#a5c7c3" stroke-width="6" stroke-linecap="round"/>
    ${cup(921, 412, .9)}${lamp(522, 298, true, .66)}${toolBox(673, 487, .58)}`);
}

function cabin(state: GameState): string {
  const home = state.adultPlan === 'not_now' || state.sceneId === 'S07C';
  const short = state.adultPlan === 'short_trial' || state.sceneId === 'S07B';
  const on = state.endingLampOn;
  const activated = state.routeActivated;
  const title = home ? '返程舱 · 画没有作废' : short ? '近程舱 · 先去一次' : '长程舱 · 第一航段';
  return frame(title,
    `舱内灯${on ? '亮着' : '关闭'}。${home ? '窗外逐渐出现地表，父亲的行李放稳在身边。' : short ? `近程试航舱外仍能看见轨道巨镜和地球弧线，${activated ? '航段刚刚开始' : '正在做出发准备'}。` : `长程${activated ? '第一航段刚刚开始' : '仍在第一航段准备'}，窗外是轨道站，尚未完成星际旅行。`}旧画${state.drawingStored ? '已妥善收好，仍然可以查看' : '放在舱内侧边，等待玩家收好'}。`,
    `<rect width="1000" height="560" fill="#263c48"/>
    <g clip-path="url(#art-cabin-window)"><rect x="35" y="20" width="930" height="325" fill="url(#art-space)"/>${stars()}
    ${home ? '<g class="art-drift"><ellipse cx="536" cy="488" rx="617" ry="328" fill="url(#art-earth)"/><ellipse cx="536" cy="469" rx="626" ry="315" fill="none" stroke="#c0dddd" stroke-opacity=".6" stroke-width="4"/><path d="M145 308c80-30 110-17 177 1 73 18 118-10 176-35 58-25 120-6 164 21 27 17 62 31 133 13" fill="none" stroke="#b4d8d5" stroke-width="19" stroke-opacity=".23"/><path d="M121 345c60-28 94-10 122 4m413-11c25-19 70-15 108 7" fill="none" stroke="#d3e5d8" stroke-width="10" stroke-opacity=".27"/></g>' : `<g class="${activated ? 'art-drift' : ''}" transform="translate(${short ? 204 : 365} -26) scale(${short ? '.48' : '.35'})">${mirror()}</g><path d="M-11 327Q231 171 422 332" fill="none" stroke="#74aab8" stroke-width="8" opacity=".58"/><path d="M0 336Q231 184 427 341" fill="none" stroke="#8bc4c8" stroke-width="2" opacity=".42"/><g transform="translate(360 182)"><path d="M0 0h186m-91-27v56" stroke="#7897a1" stroke-width="3"/><rect x="58" y="-12" width="64" height="24" rx="4" fill="#567683" stroke="#9cbbbe"/><circle cx="185" cy="0" r="4" fill="#e4b573"/><path d="M20-9v18m20-18v18m104-18v18m20-18v18" stroke="#8eb5be" stroke-width="8"/></g>`}
    <path d="M260 55h93m39 0h31" stroke="#adcfcc" stroke-opacity=".17" stroke-width="2"/></g>
    <path d="M0 0H1000V355H0Z M179 31H821L946 318H54Z" fill="#324b59" fill-rule="evenodd"/>
    <path d="M178 31 54 318h892L822 31Z" fill="url(#art-glass)" stroke="#8daeb3" stroke-width="6"/>
    <path d="M496 31v284M140 314l45-94M861 314l-47-94" stroke="#597b8c" stroke-width="9"/>
    <path d="M0 373h1000v187H0Z" fill="url(#art-floor)"/>
    ${home ? `<path d="M122 377h372v21H122Zm26 21v140m317-140v140" stroke="#5d7a85" stroke-width="12" fill="none"/><rect x="130" y="332" width="356" height="48" rx="11" fill="#7f9697"/><path d="M164 335V238h104v97m35 0v-97h103v97" fill="#4f7483" stroke="#8ca7aa" stroke-width="5"/>
      <g transform="${state.bagSecured ? 'translate(364 457) rotate(90) scale(.75)' : 'translate(790 416)'}"><rect width="77" height="101" rx="10" fill="#577b87" stroke="#91b0b2" stroke-width="3"/><path d="M21 2v-23h34V2M15 12v77M63 12v77" stroke="#b2c4bb" stroke-width="4" fill="none"/><circle cx="16" cy="105" r="5" fill="#162c36"/><circle cx="61" cy="105" r="5" fill="#162c36"/>${state.bagSecured ? '<path d="M-4 31h85" stroke="#dacb9c" stroke-width="5"/>' : ''}</g>
      ${person(243, 294, 1.15, true)}
      <g transform="translate(525 386) rotate(-6)"><path d="M0 0h191v118H0Z" fill="#507780" stroke="#aec5b9" stroke-width="2"/><path d="M0 0h70l10-12h77l9 12" fill="#688b8d"/><g transform="translate(13 6) scale(.245)">${drawingSheet(state, 'scene-paper', true)}</g>${state.drawingStored ? '<path d="M0 75h191v43H0Z" fill="#688a8b" stroke="#aac3b6" stroke-width="2"/>' : ''}</g>
      ${lamp(684, 357, on, .73)}${cup(721, 453, .8)}` : `<path d="M71 333h858l56 178H15Z" fill="#3a5766" stroke="#8cacb2" stroke-width="3"/><path d="M330 349h325l32 125H301Z" fill="#102c38" stroke="#698f9e" stroke-width="3"/>
      <path d="M365 378h83m34 0h97m-223 18h119m24 0h87" stroke="#8bb9be" stroke-width="3"/><circle cx="496" cy="433" r="23" fill="none" stroke="#678f9d" stroke-width="2"/><path d="m483 433 8 8 18-22" stroke="#c8d6ba" stroke-width="3" fill="none"/>
      <rect x="638" y="373" width="39" height="65" rx="4" fill="#335863"/><path d="M648 388h19m-19 12h19m-19 12h19" stroke="#b1c4bd" stroke-width="2"/>
      <g transform="translate(757 310) rotate(8) scale(.29)">${drawingSheet(state, 'scene-paper', true)}</g>
      ${state.drawingStored ? '<path d="M747 437h207v21H747Z" fill="#64838b" stroke="#9eb8b6" stroke-width="2"/>' : ''}
      ${lamp(223, 351, on, .85)}${cup(87, 422, .95)}
      <path d="M360 531v-32c0-53 271-53 271 0v32" fill="#193641" stroke="#547a85" stroke-width="6"/>
      <text x="371" y="459" fill="#aac8cb" font-family="monospace" font-size="12" letter-spacing="3">${short ? `LOCAL TRIAL / ${activated ? '01' : 'READY'}` : `LEG 01 / ${activated ? 'DEPARTING' : 'PREPARATION'}`}</text>`}
    <path d="M0 543h1000v17H0Z" fill="#1c333f"/><path d="M31 540h161m601 0h159" stroke="#d5ba80" stroke-opacity=".54" stroke-width="2"/>`);
}

export function renderArt(state: GameState): string {
  switch (state.sceneId) {
    case 'S01':
    case 'S02': return corridor(state);
    case 'S03':
    case 'S05':
    case 'S05_TRUTH': return living(state);
    case 'S04': return observation();
    case 'CHILDHOOD': return childhood(state);
    case 'S06': return control(state);
    case 'S07A':
    case 'S07B':
    case 'S07C':
    case 'S08': return cabin(state);
    default: return corridor(state);
  }
}
