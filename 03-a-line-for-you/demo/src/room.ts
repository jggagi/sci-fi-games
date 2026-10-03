export interface RoomView {
  sceneId: string;
  chairChoice: 'chair_window' | 'chair_angled' | null;
  chairTried: boolean;
  basinMoved: boolean;
  focus: 'desk' | 'window' | 'chair' | 'cup';
  reducedMotion: boolean;
}

/** Original room illustration. Player-authored text stays in accessible DOM pages. */
export function roomMarkup(state: RoomView): string {
  const past = ['P02', 'P04', 'P05'].includes(state.sceneId);
  const evening = state.sceneId === 'P04';
  const recent = state.sceneId === 'P05';
  const rainy = !evening && !recent;
  const chairAtDesk = recent && state.chairTried && !state.chairChoice;
  const angled = state.chairChoice === 'chair_angled';
  const chairX = chairAtDesk ? 520 : angled ? 373 : 338;
  const chairY = chairAtDesk ? 442 : 448;
  const robotPositions: Record<RoomView['focus'], [number, number]> = {
    desk: [625, 568], window: [192, 551], chair: [428, 574], cup: [742, 542],
  };
  const [robotX, robotY] = robotPositions[state.focus];
  const roomTone = evening ? 'evening' : past ? 'past' : 'present';
  const basinX = state.basinMoved ? 193 : 251;
  const chairDescription = chairAtDesk ? '椅子暂时移到了书桌边' : angled ? '椅子斜放，留出了开窗的通道' : '椅子放在窗边，通道略窄';
  const periodDescription = evening ? '七年前的傍晚，灯亮着，周淮在桌旁读稿' : recent ? '一年前的午后，植物长高了，周淮在整理房间' : past ? '十二年前的雨天，书桌还很空，周淮在窗边' : '现在的房间，杯子倒扣，书页留在桌面';
  const rainLines = Array.from({ length: 23 }, (_, i) => {
    const x = 116 + ((i * 71) % 313);
    const y = 104 + ((i * 53) % 250);
    return `<path class="rain-streak rain-streak-${i % 4}" d="M${x} ${y} l-5 24"/>`;
  }).join('');
  const bookColors = ['#74776a', '#b5815f', '#c8b792', '#8a9288', '#b4a7a0', '#c6bc9f'];
  const books = Array.from({ length: evening ? 17 : past && !recent ? 13 : 20 }, (_, i) => {
    const row = i < 10 ? 0 : 1;
    const j = i % 10;
    const h = 48 + ((i * 7) % 18);
    return `<g transform="translate(${783 + j * 12}, ${row ? 237 : 154})"><rect y="${-h}" width="10" height="${h}" rx="1" fill="${bookColors[i % 6]}"/><path d="M2 ${-h + 8} h6 M2 -9 h6" stroke="#f3e9d5" stroke-width="1" opacity=".55"/></g>`;
  }).join('');
  const papers = Array.from({ length: past && !recent ? 2 : 6 }, (_, i) => `<g transform="translate(${608 + i * 13} ${395 - i * 2}) rotate(${i % 2 ? 5 : -7})"><rect width="93" height="56" rx="1" fill="${i === 5 ? '#f3ead5' : '#e8ddc3'}" stroke="#c4b49a" stroke-width="1"/><path d="M12 14 h50 M12 22 h65 M12 30 h53 M12 38 h59" stroke="#96856e" stroke-width="1.3" opacity=".65"/>${i === 5 ? '<path d="M12 47 h64" stroke="#9c614e" stroke-width="1" stroke-dasharray="2 4"/>' : ''}</g>`).join('');
  const person = !past ? '' : evening ? `
    <g class="zhou-huai" transform="translate(555 304)">
      <ellipse cx="26" cy="221" rx="61" ry="13" fill="#39392f" opacity=".12"/>
      <path d="M0 134 Q-3 104 5 75 Q25 64 48 82 L57 133 Z" fill="#858877"/>
      <path d="M11 136 L16 199 L27 200 L32 144 L46 196 L58 195 L42 132" fill="#515751"/>
      <path d="M12 198 l-9 12 q1 7 24 4 l1-15 M46 195 l4 15 q5 5 22 0 l-14-16" fill="#3e4845"/>
      <path d="M4 83 Q-11 104 18 116 L63 100" fill="none" stroke="#858877" stroke-width="15" stroke-linecap="round"/>
      <path d="M55 88 L78 114" fill="none" stroke="#858877" stroke-width="14" stroke-linecap="round"/>
      <path d="M62 100 l12-5 M78 114 l9-1" stroke="#d2ae8c" stroke-width="9" stroke-linecap="round"/>
      <rect x="60" y="90" width="39" height="32" rx="1" fill="#e8ddc3" transform="rotate(9 60 90)"/>
      <path d="M24 63 v15" stroke="#d2ae8c" stroke-width="13"/>
      <ellipse cx="25" cy="49" rx="18" ry="23" fill="#d2ae8c"/>
      <path d="M7 48 Q1 21 25 24 Q46 24 44 47 L38 34 Q24 31 11 42" fill="#4f5650"/>
      <path d="M35 50 h13 M36 48 v6" fill="none" stroke="#596256" stroke-width="2"/>
    </g>` : `
    <g class="zhou-huai" transform="translate(${recent ? 507 : 443} ${recent ? 256 : 260})">
      <ellipse cx="26" cy="249" rx="52" ry="13" fill="#39392f" opacity=".12"/>
      <path d="M6 83 Q24 70 47 86 L52 162 L-3 162 Z" fill="${recent ? '#788473' : '#869080'}"/>
      <path d="M3 162 L10 238 H24 L30 175 L40 236 H54 L49 160" fill="#535e57"/>
      <path d="M10 236 l-10 12 q0 7 25 4 v-16 M40 236 l2 14 q4 5 23 0 l-11-14" fill="#3e4845"/>
      <path d="M8 89 Q-2 114 -8 145 L${recent ? 25 : -36} 152" fill="none" stroke="${recent ? '#788473' : '#869080'}" stroke-width="16" stroke-linecap="round"/>
      <path d="M47 90 Q62 117 65 151" fill="none" stroke="${recent ? '#788473' : '#869080'}" stroke-width="16" stroke-linecap="round"/>
      <path d="M${recent ? 25 : -36} 152 l-6 3 M65 151 l-2 8" stroke="#d2ae8c" stroke-width="10" stroke-linecap="round"/>
      <path d="M25 68 v15" stroke="#d2ae8c" stroke-width="14"/>
      <ellipse cx="26" cy="51" rx="19" ry="24" fill="#d2ae8c"/>
      <path d="M8 52 Q-1 26 21 25 Q46 23 45 52 L39 37 Q23 32 12 44" fill="${recent ? '#72746a' : '#4f5650'}"/>
      <path d="M36 50 h12 M36 49 v6" stroke="#596256" stroke-width="2"/>
    </g>`;
  return `<div class="room-stage ${roomTone}${state.reducedMotion ? ' is-reduced-motion' : ''}" data-period="${past ? 'past' : 'present'}">
  <svg class="room-illustration" viewBox="0 0 1000 680" role="img" aria-label="${periodDescription}。${chairDescription}。${state.basinMoved ? '接水盆已挪到清楚的落水处' : '接水盆在窗边'}。小序的移动底座停在${{ desk: '书桌', window: '窗边', chair: '椅子', cup: '杯子' }[state.focus]}旁。" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="room-wall" x2="0" y2="1"><stop stop-color="${evening ? '#c4b596' : past ? '#e8ddc5' : '#d8d0ba'}"/><stop offset="1" stop-color="${evening ? '#b2a68f' : past ? '#d8c9ad' : '#c6bea9'}"/></linearGradient>
      <linearGradient id="room-sky" x2="0" y2="1"><stop stop-color="${evening ? '#506b78' : past ? '#a7c0bb' : '#8ea9ae'}"/><stop offset="1" stop-color="${evening ? '#9badaa' : past ? '#d0dbca' : '#becbc7'}"/></linearGradient>
      <linearGradient id="room-floor" x2="0" y2="1"><stop stop-color="#b4a48b"/><stop offset="1" stop-color="#c6b89c"/></linearGradient>
      <radialGradient id="lamp-glow"><stop stop-color="#ffe8b0" stop-opacity=".7"/><stop offset="1" stop-color="#ffe8b0" stop-opacity="0"/></radialGradient>
      <pattern id="wall-grain" width="41" height="37" patternUnits="userSpaceOnUse"><circle cx="6" cy="8" r=".7" fill="#766d5c" opacity=".12"/><circle cx="29" cy="25" r=".6" fill="#fff" opacity=".22"/></pattern>
      <clipPath id="window-clip"><rect x="108" y="88" width="328" height="279" rx="2"/></clipPath>
    </defs>
    <rect width="1000" height="680" fill="url(#room-wall)"/>
    <rect width="1000" height="458" fill="url(#wall-grain)"/>
    <path d="M0 458 H1000 V680 H0 Z" fill="url(#room-floor)"/>
    <path d="M0 463 H1000" stroke="#8e806c" stroke-width="9"/>
    <path d="M0 472 H1000 M0 509 H1000 M0 555 H1000 M0 611 H1000 M186 472 l-55 208 M477 472 l-5 208 M736 472 l55 208 M70 509 v46 M580 555 v56 M294 611 v69 M875 509 v46" fill="none" stroke="#a29278" stroke-width="1.5" opacity=".6"/>
    <path d="M99 370 L437 370 L792 680 H113 Z" fill="#f5ecd0" opacity="${evening ? '.035' : past ? '.22' : '.12'}"/>
    <ellipse cx="541" cy="587" rx="338" ry="44" fill="#696454" opacity=".06"/>
    <!-- Window: distant roofs, reflected glass, weather and a worn sill. -->
    <rect x="94" y="73" width="356" height="310" rx="3" fill="#8c8773"/>
    <rect x="101" y="81" width="342" height="294" fill="#d3cbb5"/>
    <g clip-path="url(#window-clip)">
      <rect x="108" y="88" width="328" height="279" fill="url(#room-sky)"/>
      <path d="M98 258 l61-25 65 23 75-32 70 29 76-20 V380 H98" fill="#70898a" opacity=".28"/>
      <path d="M96 326 V282 L170 261 L211 282 V320 M240 335 V285 L305 263 L365 286 V332 M359 321 V299 L448 274 V370 H96" fill="#839993" opacity=".55"/>
      <path d="M138 280 v39 M156 275 v45 M176 280 v42 M278 281 v44 M299 275 v48 M321 282 v46 M399 293 v49" stroke="#c6d1c5" stroke-width="5" opacity=".7"/>
      <path d="M109 109 l100-20 226 116 V252 Z" fill="#fff9e6" opacity=".09"/>
      ${rainy ? `<g class="rain" fill="none" stroke="#edf5e8" stroke-width="1.5" opacity=".58">${rainLines}</g>` : ''}
      <path d="M107 363 q83-6 170 0 t160-1" fill="none" stroke="#dfe8d9" stroke-width="2" opacity=".5"/>
    </g>
    <path d="M271 83 V376 M102 230 H443" fill="none" stroke="#d4ccb7" stroke-width="12"/>
    <path d="M271 86 V373 M107 230 H436" fill="none" stroke="#aaa48f" stroke-width="2"/>
    <path d="M255 256 v22" stroke="#787d6e" stroke-width="5" stroke-linecap="round"/>
    <path d="M87 382 H459 L454 395 H93 Z" fill="#a89e86"/>
    <path d="M107 383 H432" stroke="#d7cdb4" stroke-width="2"/>
    <path d="M415 79 q9 130 13 295 L472 395 Q457 211 469 74 Z" fill="#c2b79b"/>
    <path d="M431 88 q11 111 10 265 M447 86 q0 96 7 239" fill="none" stroke="#a89d85" stroke-width="2" opacity=".6"/>
    <path d="M84 67 H478" stroke="#777b6c" stroke-width="6" stroke-linecap="round"/>
    <!-- Shelf, books, a simple original print and a house plant. -->
    <rect x="765" y="83" width="159" height="213" rx="2" fill="#99896e"/>
    <rect x="775" y="92" width="139" height="65" fill="#7f745e"/>
    <rect x="775" y="170" width="139" height="70" fill="#7f745e"/>
    ${books}
    <path d="M768 162 H921 M768 245 H921" stroke="#b5a286" stroke-width="9"/>
    <rect x="795" y="260" width="41" height="22" fill="#c7b89c"/>
    <path d="M800 266 h29 M800 271 h18" stroke="#9e8b6d" stroke-width="1.3"/>
    <circle cx="889" cy="267" r="13" fill="#b9b49b"/>
    <path d="M882 268 q7-13 14 0" stroke="#788978" stroke-width="2" fill="none"/>
    <rect x="555" y="110" width="114" height="135" rx="1" fill="#a39178"/>
    <rect x="564" y="119" width="96" height="117" fill="#eee4cd"/>
    <path d="M594 209 q28-29 41-64 M610 189 l-16-26 M620 172 l21-8" fill="none" stroke="#87967c" stroke-width="2"/>
    <ellipse cx="628" cy="154" rx="9" ry="17" transform="rotate(28 628 154)" fill="#b6aa81"/>
    <ellipse cx="593" cy="169" rx="8" ry="14" transform="rotate(-29 593 169)" fill="#9eaa88"/>
    <path d="M591 217 h42" stroke="#aa9d80" stroke-width="1"/>
    <g transform="translate(905 382)">
      <ellipse cy="168" rx="41" ry="10" fill="#746d56" opacity=".15"/>
      <path d="M-29 107 h58 l-9 58 h-40 Z" fill="#a48263"/>
      <path d="M-26 108 h52" stroke="#c09b79" stroke-width="7"/>
      <path d="M0 106 Q-18 61 -8 ${recent || !past ? '-4' : '25'} M0 105 Q26 48 22 26 M0 106 Q-30 88 -30 65" fill="none" stroke="#64795f" stroke-width="3"/>
      <ellipse cx="-11" cy="${recent || !past ? 17 : 41}" rx="11" ry="26" transform="rotate(-29 -11 22)" fill="#7e9270"/>
      <ellipse cx="16" cy="54" rx="11" ry="28" transform="rotate(25 16 54)" fill="#6b8669"/>
      <ellipse cx="-26" cy="77" rx="10" ry="23" transform="rotate(-45 -26 77)" fill="#89996f"/>
      ${recent || !past ? '<ellipse cx="8" cy="-4" rx="9" ry="24" transform="rotate(27 8 -4)" fill="#7c8e68"/>' : ''}
    </g>
    <!-- Clear evidence of ordinary life; no memorial portrait. -->
    <rect x="18" y="367" width="37" height="42" rx="3" fill="#beb59f"/>
    <circle cx="28" cy="380" r="2" fill="#817e6d"/><circle cx="44" cy="380" r="2" fill="#817e6d"/>
    <path d="M39 409 v73 q0 16 30 16 h28" fill="none" stroke="#898674" stroke-width="3"/>
    <g transform="translate(${basinX} 428)">
      <ellipse cy="52" rx="49" ry="10" fill="#756f5d" opacity=".14"/>
      <path d="M-42 8 Q-38 48 0 49 Q38 48 42 8" fill="#7e9392" stroke="#617c7d" stroke-width="2"/>
      <ellipse cy="8" rx="42" ry="10" fill="#b1c4bd" stroke="#617c7d" stroke-width="2"/>
      <ellipse cy="9" rx="31" ry="6" fill="#8da9a7"/>
      ${rainy ? '<ellipse class="basin-ripple" cx="-5" cy="8" rx="12" ry="3" fill="none" stroke="#dce8de" stroke-width="1.4"/><path d="M-5 -28 v8 M-6 -9 v7" class="water-drop" stroke="#a5c2c0" stroke-width="2.5" stroke-linecap="round"/>' : ''}
    </g>
    <!-- The chair has visibly distinct positions without requiring dragging. -->
    <g class="room-chair${angled ? ' is-angled' : ''}" transform="translate(${chairX} ${chairY}) ${angled ? 'skewY(-9)' : ''}">
      <ellipse cx="14" cy="95" rx="64" ry="13" fill="#5e5d4c" opacity=".14"/>
      <path d="M-32 -53 L-36 73 M42 -45 L46 75" stroke="#786b52" stroke-width="8" stroke-linecap="round"/>
      <path d="M-32 -52 Q3-63 42-45 L39-12 Q2-26-33-18 Z" fill="#a8926d" stroke="#786b52" stroke-width="2"/>
      <path d="M-24 -42 L32 -37 M-25 -33 L32 -27" stroke="#8c795d" stroke-width="2"/>
      <path d="M-35 10 L29 1 L61 23 L-11 38 Z" fill="#b49c75" stroke="#786b52" stroke-width="3"/>
      <path d="M-10 38 L-15 97 M59 24 L58 86" stroke="#786b52" stroke-width="8" stroke-linecap="round"/>
      <path d="M-20 83 L43 73 M-9 66 L56 54" stroke="#968060" stroke-width="3"/>
      <path d="M-27 14 L28 7" stroke="#c5af88" stroke-width="2"/>
    </g>
    ${person}
    <!-- Desk, familiar pages, cup, clock and a lamp. -->
    <g>
      <ellipse cx="718" cy="557" rx="153" ry="25" fill="#69614d" opacity=".12"/>
      <path d="M563 437 L567 561 H583 L591 445 M826 430 L830 555 H847 L848 430" fill="#8d7859"/>
      <path d="M578 470 H836 V507 H578 Z" fill="#a28b67"/>
      <path d="M587 476 H827 V500 H587 Z" fill="#bba27b" stroke="#8a775b" stroke-width="1"/>
      <path d="M703 486 H720" stroke="#7c6e56" stroke-width="3" stroke-linecap="round"/>
      <path d="M531 399 L800 375 L869 422 L584 452 Z" fill="#c0a781" stroke="#8d7859" stroke-width="2"/>
      <path d="M531 399 V412 L584 465 L869 435 V422 L584 452 Z" fill="#9d8461"/>
      <path d="M574 433 L839 410 M582 440 L795 418" stroke="#8f795a" stroke-width="1" opacity=".4"/>
      ${papers}
      <path d="M589 387 L625 385 L656 397 L618 400 Z" fill="#7c8171"/>
      <path d="M619 390 l29 10" stroke="#ded0ad" stroke-width="3"/>
      <path d="M748 387 l35-4" stroke="#605f52" stroke-width="3" stroke-linecap="round"/>
      <path d="M748 387 l-8 1" stroke="#bc9570" stroke-width="3"/>
      <ellipse cx="808" cy="412" rx="20" ry="5" fill="#766d54" opacity=".16"/>
      ${past ? '<path d="M795 385 h25 l-3 27 h-19 Z" fill="#ded5ba" stroke="#aa9e82" stroke-width="1.5"/><ellipse cx="807.5" cy="385" rx="12.5" ry="4" fill="#9b8b72"/><path d="M821 390 q14 0 10 11 q-3 6-12 4" fill="none" stroke="#d5cbae" stroke-width="4"/>' : '<path d="M796 413 l3-27 h19 l4 27 Z" fill="#ded5ba" stroke="#aa9e82" stroke-width="1.5"/><ellipse cx="809" cy="386" rx="9" ry="3" fill="#cec2a3"/><path d="M821 398 q15 0 10 10 q-3 5-10 3" fill="none" stroke="#d5cbae" stroke-width="4"/>'}
      <path d="M760 370 l3-27 36 9-2 28 Z" fill="#ece1c5" stroke="#97856a" stroke-width="1.4"/>
      <path d="M765 351 l26 6 M766 359 l22 6 M768 369 l18 5" stroke="#b4a182" stroke-width="1.2"/>
      <ellipse cx="693" cy="376" rx="25" ry="7" fill="#777c69"/>
      <path d="M693 376 L693 339 L716 297" stroke="#747b68" stroke-width="7" fill="none" stroke-linecap="round"/>
      <circle cx="694" cy="339" r="5" fill="#bcb493"/>
      <path d="M694 299 Q710 280 732 300 L746 323 L689 320 Z" fill="#808670" stroke="#636e5d" stroke-width="2"/>
      <ellipse cx="717" cy="320" rx="26" ry="5" fill="${evening ? '#f4d595' : '#c7c6a8'}"/>
      ${evening ? '<ellipse cx="700" cy="378" rx="91" ry="75" fill="url(#lamp-glow)"/>' : ''}
    </g>
    <!-- Xiao Xu: camera head, a short manipulation arm and a mobile charging base. -->
    <g class="xiaoxu" transform="translate(${robotX} ${robotY})">
      <ellipse cx="0" cy="30" rx="40" ry="10" fill="#596355" opacity=".19"/>
      <path d="M-25 13 q-5 9 0 19 M25 13 q5 9 0 19" stroke="#586557" stroke-width="9" stroke-linecap="round"/>
      <path d="M-28 5 Q-32-12 0-14 Q32-12 28 5 L27 23 Q0 34-27 23 Z" fill="#e1deca" stroke="#7f8b78" stroke-width="2"/>
      <ellipse cy="4" rx="28" ry="9" fill="#bbc4af" stroke="#7f8b78" stroke-width="2"/>
      <path d="M0 0 V-45" stroke="#aab7a4" stroke-width="10"/>
      <rect x="-20" y="-68" width="40" height="26" rx="9" fill="#d5ddca" stroke="#7e8b77" stroke-width="2"/>
      <rect x="-13" y="-62" width="26" height="13" rx="6" fill="#5d766d"/>
      <circle cx="-5" cy="-55" r="3.3" fill="#d8e6ca"/><circle cx="6" cy="-55" r="3.3" fill="#d8e6ca"/>
      <path d="M8-33 L30-38 L43-57" stroke="#a7b39c" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="30" cy="-38" r="4" fill="#7e8b77"/>
      <path d="M42-57 l-3-8 M43-57 l9-3" stroke="#6d7e6c" stroke-width="3" stroke-linecap="round"/>
      <path d="M-10 20 h20" stroke="#7a977c" stroke-width="3" stroke-linecap="round"/>
    </g>
    <path d="M40 638 H118" stroke="#a79a7f" stroke-width="2"/><circle cx="128" cy="638" r="2" fill="#a79a7f"/>
  </svg>
  <div class="room-hotspots" aria-label="探索房间">
    ${(['window', 'chair', 'desk', 'cup'] as const).map((place) => `<button type="button" class="room-hotspot hotspot-${place}${state.focus === place ? ' is-active' : ''}" data-room="${place}" data-testid="room-${place}" aria-label="${{ window: '查看窗边和接水盆', chair: '查看椅子', desk: '查看书桌手稿', cup: '查看杯子' }[place]}" aria-pressed="${state.focus === place}"><span class="hotspot-dot" aria-hidden="true"></span><span class="hotspot-label">${{ window: '窗与雨', chair: '椅子', desk: '手稿', cup: '杯子' }[place]}</span></button>`).join('')}
  </div>
  <div class="room-legend"><span class="room-weather"><span aria-hidden="true">${rainy ? '〰' : '◌'}</span> ${rainy ? '雨落在窗上' : evening ? '傍晚 · 台灯亮着' : '午后 · 窗边有光'}</span><span>${past ? '过去 · 周淮在房间里' : '现在 · 小序的书房'}</span></div>
  </div>`;
}
