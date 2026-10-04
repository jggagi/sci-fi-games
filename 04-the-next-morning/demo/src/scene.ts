export interface LaboratorySceneOptions {
  era: 'present' | 'young' | 'middle' | 'recent' | 'morning';
  role: '林予' | '程砚';
  emptyChair: boolean;
  output: 0 | 1 | 2;
  first: 'left' | 'right';
  second: 'left' | 'right';
  connected: boolean;
  reducedMotion: boolean;
}

/** Original, self-contained illustration. Output is a steady display, never a flash. */
export function laboratoryScene(options: LaboratorySceneOptions): string {
  const { era, role, emptyChair, output, first, second, connected, reducedMotion } = options;
  const young = era === 'young';
  const middle = era === 'middle';
  const morning = era === 'morning';
  const eraLabel = {
    present: '现在 · 同一间实验室',
    young: '三十六年前 · 初次合作',
    middle: '二十年前 · 时间与日常',
    recent: '几年前 · 交给下一位研究者',
    morning: '第二天早上',
  }[era];
  const wall = young ? '#d6ded4' : middle ? '#d7d9d0' : '#d9d8cf';
  const wood = young ? '#877360' : '#7c7365';
  const hair = young ? '#3c4440' : middle ? '#60665e' : '#bfc6b7';
  const frame = young ? '#65756c' : '#69746e';
  const activePort = second;
  const outputDescription = output === 0 ? '尚未输入' : `稳态亮度 ${output}`;
  const label = `${eraLabel}。${role}的视角。${emptyChair ? '林予的椅子空着，程砚独自留在工作台旁。' : '林予和程砚在同一张工作台旁。'}旧脉冲盒有左、右两个标记端口，${outputDescription}。窗边有茶杯，桌上留着实际记录。`;
  const portX = (port: 'left' | 'right') => port === 'left' ? 493 : 560;
  const wire = (port: 'left' | 'right', index: number) => {
    const x = portX(port);
    const start = 395 + index * 24;
    const endY = connected ? 306 : 353 + index * 7;
    const endX = connected ? x : x - 22 + index * 14;
    return `<path d="M ${start} 353 C ${start - 31} ${405 + index * 9}, ${x + 8} ${421 + index * 5}, ${endX} ${endY}" fill="none" stroke="#3e4948" stroke-width="6" stroke-linecap="round"/>
      <path d="M ${start} 353 C ${start - 31} ${405 + index * 9}, ${x + 8} ${421 + index * 5}, ${endX} ${endY}" fill="none" stroke="${index === 0 ? '#ba815c' : '#d0baa0'}" stroke-width="3.5" stroke-linecap="round"/>
      <g transform="translate(${endX} ${endY})"><rect x="-5" y="-9" width="10" height="14" rx="2" fill="#454e49"/><rect x="-3" y="-15" width="6" height="7" rx="1" fill="#c2c4b4"/></g>`;
  };
  const figure = (x: number, isLin: boolean) => {
    const shirt = isLin ? '#657870' : '#847765';
    return `<g transform="translate(${x} 180)">
      <path d="M -28 161 L -23 216 L -8 216 L 2 166 M 10 166 L 26 216 L 41 216 L 29 154" fill="#48534f"/>
      <path d="M -33 214 l -7 10 q 19 7 35 0 l -2 -10 M 26 214 l 1 10 q 18 6 30 0 l -16 -10" fill="#414942"/>
      <path d="M -27 63 Q -44 83 -44 119 L -25 160 Q 1 175 34 157 L 27 88 Q 21 64 7 61 Z" fill="${shirt}"/>
      <path d="M -27 82 Q -42 104 -26 131 L ${isLin ? '56 119' : '-68 132'}" fill="none" stroke="${shirt}" stroke-width="22" stroke-linecap="round"/>
      <path d="M ${isLin ? '45 120 L 66 119' : '-65 132 L -83 137'}" fill="none" stroke="#bcaa8e" stroke-width="11" stroke-linecap="round"/>
      <path d="M 23 81 Q 38 103 32 126 L ${isLin ? '13 145' : '-13 143'}" fill="none" stroke="${shirt}" stroke-width="19" stroke-linecap="round"/>
      <path d="M -7 57 L -6 71 Q 2 79 14 68 L 12 54" fill="#baa68a"/>
      <path d="M -19 18 Q -24 37 -10 55 Q 5 67 21 48 L 29 30 Q 28 5 6 4 Q -13 2 -19 18" fill="#c9b99c"/>
      <path d="M -20 36 Q -27 9 -9 0 Q 6 -7 23 5 Q 36 15 27 33 L 19 18 Q 9 22 -5 15 L -13 40 Z" fill="${hair}"/>
      ${isLin ? `<path d="M -19 16 Q -33 24 -28 50 Q -36 49 -30 59 Q -12 64 -13 43" fill="${hair}"/>` : `<path d="M -19 19 Q -28 11 -17 5" fill="none" stroke="${hair}" stroke-width="6"/>`}
      <path d="M 13 35 l 8 1 M 11 45 l 5 1" stroke="#7e7d6b" stroke-width="1.5" stroke-linecap="round"/>
      ${young ? '' : '<path d="M 4 32 h 15 v 8 H 5 Z M 20 34 h 6 M 4 34 l -12 -4" fill="none" stroke="#667268" stroke-width="1.4"/>'}
      <path d="M -10 79 L -6 116 M 11 78 L 4 99 M -24 139 Q -3 146 21 137" fill="none" stroke="#ffffff" stroke-opacity=".14" stroke-width="2"/>
    </g>`;
  };
  const chair = (x: number, empty: boolean) => `<g transform="translate(${x} 290)">
    <path d="M -27 55 L -36 142 M 33 55 L 49 137" stroke="#5f665d" stroke-width="6"/>
    <path d="M -29 64 L 33 64" stroke="#454d47" stroke-width="5"/>
    <path d="M -38 -48 Q -9 -57 19 -46 L 28 36 Q 0 46 -31 37 Z" fill="${empty ? '#738077' : '#7b867b'}" stroke="#535f56" stroke-width="3"/>
    <path d="M -32 37 Q 5 29 39 43 L 42 60 Q 10 72 -29 60 Z" fill="#768077" stroke="#4d5952" stroke-width="3"/>
    <path d="M -26 -32 L 13 -28 M -23 -19 L 14 -16" stroke="#a8aca0" stroke-opacity=".4" stroke-width="2"/>
    ${empty ? '<path d="M -27 -43 q 23 -7 42 -2" stroke="#c8c5b3" stroke-width="2" fill="none"/>' : ''}
  </g>`;
  const oldEquipment = `<g transform="translate(141 231)">
    <path d="M 0 0 H 131 L 147 15 V 86 H 17 L 0 70 Z" fill="#59675e"/>
    <path d="M 0 0 H 131 V 70 H 0 Z" fill="#b7beb0" stroke="#57675d" stroke-width="2"/>
    <rect x="9" y="10" width="77" height="45" rx="8" fill="#364b43"/>
    <path d="M 16 43 H 28 L 34 24 L 39 43 H 54 L 60 29 L 65 43 H 78" fill="none" stroke="#a6b79a" stroke-width="1.7"/>
    <path d="M 16 23 H 79 M 16 33 H 79 M 16 43 H 79 M 29 16 V 49 M 46 16 V 49 M 63 16 V 49" stroke="#97af99" stroke-opacity=".12"/>
    <circle cx="107" cy="24" r="10" fill="#68766a"/><circle cx="107" cy="24" r="4" fill="#d4d7c5"/>
    <circle cx="108" cy="50" r="8" fill="#68766a"/><path d="M 98 50 h 20" stroke="#d4d7c5" stroke-width="2"/>
    <rect x="9" y="61" width="48" height="3" fill="#7a8577"/>
  </g>`;
  const modernEquipment = `<g transform="translate(141 216)">
    <path d="M 7 2 L 137 9 L 127 91 L 0 81 Z" fill="#55645f" stroke="#44554d" stroke-width="3"/>
    <path d="M 15 11 L 126 16 L 119 75 L 8 70 Z" fill="#cad3c4"/>
    <path d="M 24 58 l 12 -10 l 13 4 l 15 -19 l 13 15 l 15 -10 l 16 1" fill="none" stroke="#6a8172" stroke-width="2.5"/>
    <path d="M 22 26 l 40 2 M 22 32 l 27 1 M 21 66 l 88 4" stroke="#93a291" stroke-width="2"/>
    <path d="M 63 88 L 61 110 L 37 115 L 96 118 L 73 109 L 74 89" fill="#606e62"/>
    <path d="M 144 42 L 184 44 L 181 118 L 140 115 Z" fill="#b6beae" stroke="#657467" stroke-width="2"/>
    <path d="M 150 50 l 27 1 M 150 56 l 27 1 M 150 62 l 27 1" stroke="#7f8f7d" stroke-width="2"/>
    <circle cx="167" cy="102" r="3" fill="#688a73"/>
  </g>`;
  const paperOnBoard = young ? `<text x="613" y="126" font-size="13" fill="#596b60">下周 · 工作安排</text>
    <path d="M 613 143 h 96 M 613 163 h 96 M 613 183 h 96 M 635 134 v 64 M 659 134 v 64 M 683 134 v 64" stroke="#a3ada0" stroke-width="1"/>
    <rect x="637" y="145" width="19" height="15" rx="2" fill="#d8d4bb"/>`
    : middle ? `<text x="613" y="126" font-size="13" fill="#596b60">洗衣机维修预约</text>
    <text x="613" y="149" font-size="12" fill="#7d7f6c">下午  /  请留人在家</text>
    <path d="M 614 162 h 90 M 614 174 h 66 M 614 186 h 78" stroke="#a3ada0" stroke-width="1.5"/>
    <path d="M 676 176 q 9 -15 20 -7" fill="none" stroke="#aa8766" stroke-width="1.5"/>`
    : `<text x="613" y="126" font-size="13" fill="#596b60">校准记录 · 待复核</text>
    <path d="M 614 144 h 91 M 614 158 h 76 M 614 172 h 86 M 614 186 h 52" stroke="#a3ada0" stroke-width="1.5"/>
    <path d="M 614 143 l 3 3 l 5 -7 M 614 157 l 3 3 l 5 -7" fill="none" stroke="#758575" stroke-width="1.5"/>`;
  const wallRecord = young
    ? `<g transform="translate(401 61) rotate(-3)"><path d="M 0 0 H 135 V 105 H 0 Z" fill="#e0dfc9" stroke="#a4ab94"/><path d="M 10 -4 h 25 v 11 H 10 M 99 -4 h 25 v 11 H 99" fill="#bec2a6"/><text x="13" y="25" font-size="12" fill="#6e7e6b">初次测量 / 记录页</text><path d="M 13 42 h 104 M 13 57 h 90 M 13 72 h 102 M 13 88 h 55" stroke="#a5ad94" stroke-width="1.5"/></g>`
    : middle
      ? `<g transform="translate(387 53)"><path d="M 0 0 H 170 V 116 H 0 Z" fill="#dfe4d0" stroke="#879b80" stroke-width="4"/><text x="14" y="24" font-size="12" fill="#6e7e6b">需要重新核验的解释</text><path d="M 18 44 h 65 M 18 63 h 109 M 18 82 h 81" stroke="#8f9f84" stroke-width="2"/><path d="M 13 62 l 122 3" stroke="#9a8a70" stroke-width="1.5"/><path d="M 0 120 H 170" stroke="#758771" stroke-width="5"/><path d="M 111 116 h 26" stroke="#526c59" stroke-width="3"/></g>`
      : era === 'recent'
        ? `<g transform="translate(389 57)"><path d="M 0 0 H 170 V 11 H 0 Z" fill="#7c8b76"/><path d="M 16 11 v 96 M 153 11 v 96" stroke="#7d8d76" stroke-width="2"/><path d="M 5 28 h 65 v 77 H 5 Z M 80 30 h 75 v 75 H 80 Z" fill="#e0e2cb" stroke="#a1ad94"/><path d="M 12 42 h 49 M 12 54 h 42 M 12 68 h 49 M 12 82 h 27 M 89 45 h 54 M 89 59 h 45 M 89 73 h 52 M 89 87 h 29" stroke="#a0ad90" stroke-width="1.5"/><path d="M 25 19 v 14 M 105 21 v 14" stroke="#60755e" stroke-width="4"/><text x="85" y="121" text-anchor="middle" font-size="11" fill="#71836b">复核方法 / 沈翎</text></g>`
        : `<g transform="translate(387 65)"><path d="M 0 67 H 174 V 79 H 0 Z" fill="#7b8872"/><path d="M 9 5 H 55 V 66 H 9 Z" fill="#a8ad91" stroke="#7b8b73"/><path d="M 60 0 H 107 V 66 H 60 Z" fill="#b9b8a0" stroke="#7b8b73"/><path d="M 112 10 H 161 V 66 H 112 Z" fill="#9ba68d" stroke="#7b8b73"/><path d="M 22 18 H 43 V 32 H 22 Z M 73 14 H 96 V 28 H 73 Z M 125 25 H 149 V 39 H 125 Z" fill="#d6d9bd"/><path d="M 26 22 h 13 M 77 18 h 15 M 129 29 h 16" stroke="#9aa58b" stroke-width="1.5"/><text x="86" y="98" text-anchor="middle" font-size="11" fill="#71836b">三十六年 / 实际记录</text></g>`;

  return `<svg class="lab-scene" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 520" role="img" aria-label="${label}">
    <title>${eraLabel}</title>
    <desc>${label}这是虚构实验室的原创场景插画，实验操作使用场景下方的可访问控件。</desc>
    <defs>
      <linearGradient id="lab-wall" x2="0" y2="1"><stop stop-color="${wall}"/><stop offset="1" stop-color="#c1c7bb"/></linearGradient>
      <linearGradient id="lab-window" x2="0" y2="1"><stop stop-color="${morning ? '#eed8ab' : young ? '#c9d8c4' : '#d5ddcf'}"/><stop offset="1" stop-color="#efe9d3"/></linearGradient>
      <linearGradient id="lab-light" x1="1" y1="0" x2="0" y2="1"><stop stop-color="#f8e7bf" stop-opacity="${morning ? '.55' : '.24'}"/><stop offset="1" stop-color="#f8e7bf" stop-opacity="0"/></linearGradient>
      <linearGradient id="lab-desk" x2="0" y2="1"><stop stop-color="#a6967f"/><stop offset="1" stop-color="${wood}"/></linearGradient>
      <linearGradient id="lab-screen" x2="0" y2="1"><stop stop-color="#2d413d"/><stop offset="1" stop-color="#45574c"/></linearGradient>
      <pattern id="lab-grain" width="34" height="26" patternUnits="userSpaceOnUse"><path d="M 0 8 h 12 M 23 17 h 11" stroke="#646e5f" stroke-opacity=".035" stroke-width="1"/></pattern>
    </defs>
    <style>
      .lab-scene text { font-family: system-ui, sans-serif; }
      .lab-scene .lab-steam { fill:none; stroke:#f6efd8; stroke-width:2; stroke-linecap:round; opacity:.55; }
      ${reducedMotion ? '' : '.lab-scene .lab-steam { animation:lab-drift 7s ease-in-out infinite; } @keyframes lab-drift { 0%,100% { transform:translateY(0); opacity:.35; } 50% { transform:translateY(-3px); opacity:.65; } }'}
      @media (prefers-reduced-motion:reduce) { .lab-scene .lab-steam { animation:none; } }
    </style>
    <path d="M 0 0 H 1000 V 520 H 0 Z" fill="url(#lab-wall)"/>
    <path d="M 0 338 H 1000 V 520 H 0 Z" fill="#aeb7aa"/>
    <path d="M 0 338 H 1000 M 109 520 L 349 338 M 414 520 L 504 338 M 767 520 L 659 338 M 0 430 H 1000" stroke="#8f9e90" stroke-opacity=".3" stroke-width="1.5"/>
    <path d="M 0 336 H 1000" stroke="#809082" stroke-width="6"/>
    <path d="M 25 0 V 338 M 25 130 H 570" stroke="#7e9081" stroke-opacity=".17" stroke-width="2"/>
    <rect width="1000" height="520" fill="url(#lab-grain)"/>

    <!-- The window, shelves and pinboard remain fixed while their contents age. -->
    <path d="M 747 53 H 962 V 270 H 747 Z" fill="#a9b5a6" stroke="${frame}" stroke-width="10"/>
    <path d="M 759 65 H 950 V 258 H 759 Z" fill="url(#lab-window)"/>
    <path d="M 760 227 Q 810 172 856 197 Q 907 162 949 179 V 258 H 760 Z" fill="#a5b5a0" opacity=".42"/>
    <path d="M 760 243 Q 810 219 857 232 Q 909 201 950 215 V 258 H 760 Z" fill="#8caa94" opacity=".3"/>
    <path d="M 853 63 V 260 M 755 153 H 953" stroke="#839481" stroke-width="7"/>
    <path d="M 759 67 H 950" stroke="#f0ecda" stroke-opacity=".7" stroke-width="3"/>
    <path d="M 736 273 H 971 L 980 283 H 726 Z" fill="#6b7b68"/>
    <path d="M 852 176 H 881" stroke="#566e5f" stroke-width="3" stroke-linecap="round"/>
    <path d="M 945 69 L 925 270 L 639 520 H 73 Z" fill="url(#lab-light)"/>
    <path d="M 924 66 Q 902 173 924 269 H 949 L 956 66 Z" fill="#d0d1bb" opacity=".76"/>
    <path d="M 934 70 Q 915 172 935 267" stroke="#b3bda8" stroke-width="2" fill="none"/>
    <g transform="translate(906 245)"><path d="M -12 0 L 12 0 L 8 25 H -8 Z" fill="#8b8a70"/><path d="M 0 2 Q -16 -21 -10 -35 Q 0 -35 0 -6 Q 4 -43 15 -41 Q 20 -26 0 2 Q -1 -20 -22 -23 Q -24 -10 0 2" fill="#748d6e"/><path d="M 0 0 V 9" stroke="#5d755e" stroke-width="2"/></g>

    <path d="M 62 87 H 351 V 99 H 62 Z" fill="#778272"/>
    <path d="M 83 99 V 114 M 330 99 V 114" stroke="#697968" stroke-width="4"/>
    <g transform="translate(80 42)"><path d="M 0 0 H 18 V 44 H 0 Z" fill="#9a8b73"/><path d="M 21 6 H 37 V 44 H 21 Z" fill="#7d8c79"/><path d="M 40 2 H 54 V 44 H 40 Z" fill="#b7ae93"/><path d="M 60 0 H 73 V 44 H 60 Z" fill="#6c7b6f"/><path d="M 80 8 H 97 V 44 H 80 Z" fill="#b3b99f"/><path d="M 111 9 l 17 -3 l 9 36 l -17 3 Z" fill="#8e8b75"/><path d="M 4 9 H 14 M 25 14 H 33 M 44 10 H 50 M 64 8 H 69 M 84 17 H 92" stroke="#d2cdb7" stroke-width="1.5"/></g>
    <g transform="translate(267 53)"><path d="M 0 0 H 51 V 33 H 0 Z" fill="#c5c7b4" stroke="#7a8974" stroke-width="2"/><path d="M 8 8 h 34 M 8 15 h 27 M 8 22 h 31" stroke="#98a18b" stroke-width="2"/><path d="M 21 32 V 38" stroke="#677664" stroke-width="2"/></g>
    ${wallRecord}
    <path d="M 587 89 H 725 V 217 H 587 Z" fill="#948e72" stroke="#73816d" stroke-width="6"/>
    <path d="M 600 103 L 714 106 L 710 203 L 600 201 Z" fill="#e4e2c9"/>
    <circle cx="657" cy="110" r="3" fill="#997d5f"/>
    ${paperOnBoard}

    <!-- People use restrained poses: neither outcome gets a triumphant composition. -->
    ${chair(346, emptyChair)}
    ${chair(708, false)}
    ${emptyChair ? '' : figure(351, true)}
    ${figure(706, false)}
    <ellipse cx="445" cy="448" rx="302" ry="25" fill="#637669" opacity=".13"/>

    <!-- The workbench keeps the same geometry through every decade. -->
    <path d="M 110 299 L 776 299 L 840 371 L 44 371 Z" fill="url(#lab-desk)" stroke="#6e7463" stroke-width="2"/>
    <path d="M 44 371 H 840 V 388 H 44 Z" fill="${wood}"/>
    <path d="M 58 387 L 65 480 H 81 L 84 388 M 795 388 L 801 478 H 818 L 818 388" fill="#636d5e"/>
    <path d="M 92 409 H 797 M 101 441 H 791" stroke="#636d5e" stroke-width="6"/>
    <path d="M 89 387 L 92 461 M 784 387 L 782 461" stroke="#536352" stroke-width="4"/>
    <path d="M 99 337 L 774 337 M 71 352 L 808 352" stroke="#dbceb0" stroke-opacity=".14" stroke-width="1"/>
    ${young ? oldEquipment : modernEquipment}

    <!-- The original pulse box has labelled physical ports and an unambiguous steady number. -->
    <g transform="translate(437 247)">
      <path d="M 0 0 H 167 L 182 19 V 89 H 15 L 0 71 Z" fill="#58665a"/>
      <path d="M 0 0 H 167 V 71 H 0 Z" fill="${young ? '#afbba6' : '#a5b0a0'}" stroke="#576b5b" stroke-width="2"/>
      <path d="M 167 0 L 182 19 V 89 L 167 71 Z" fill="#697866"/>
      <rect x="15" y="11" width="90" height="38" rx="4" fill="url(#lab-screen)" stroke="#7e8d73" stroke-width="2"/>
      <text x="60" y="40" fill="${output === 0 ? '#a7b59c' : '#edf2ce'}" font-family="monospace" font-size="28" text-anchor="middle">${output === 0 ? '—' : output}</text>
      <text x="124" y="20" fill="#4e6253" font-size="9" letter-spacing="1">PULSE</text>
      <circle cx="121" cy="37" r="6" fill="${output >= 1 ? '#e0d9ac' : '#6c7b65'}" stroke="#65755d" stroke-width="2"/>
      <circle cx="143" cy="37" r="6" fill="${output === 2 ? '#e0d9ac' : '#6c7b65'}" stroke="#65755d" stroke-width="2"/>
      <circle cx="56" cy="58" r="7" fill="#4c5e51" stroke="#c6ceb8" stroke-width="2"/>
      <circle cx="123" cy="58" r="7" fill="#4c5e51" stroke="#c6ceb8" stroke-width="2"/>
      <text x="37" y="62" font-size="10" fill="#405447">左</text><text x="138" y="62" font-size="10" fill="#405447">右</text>
      <path d="M 14 80 h 31 M 58 80 h 57" stroke="#3d5245" stroke-width="2"/>
    </g>
    ${wire(first, 0)}${wire(second, 1)}
    <g transform="translate(398 344)"><path d="M -15 -8 H 34 L 38 5 H -12 Z" fill="#76846f" stroke="#4e6453" stroke-width="2"/><circle cx="-1" cy="-1" r="4" fill="#c0c3a5"/><circle cx="22" cy="-1" r="4" fill="#bca082"/></g>
    ${connected && output !== 0 ? `<path d="M ${portX(activePort)} 294 v -4" stroke="#e4dab4" stroke-width="2"/>` : ''}

    <!-- A notebook, two unlike cups, and an ordinary pen carry the daily continuity. -->
    <g transform="translate(633 315) rotate(4)">
      <path d="M -43 0 Q -14 -5 0 2 Q 23 -6 51 -1 L 66 44 Q 35 40 8 48 Q -13 41 -36 46 Z" fill="#dad9bf" stroke="#888b72" stroke-width="1.5"/>
      <path d="M 0 2 L 8 48" stroke="#92977b" stroke-width="1.5"/>
      <path d="M -31 12 l 22 -1 M -28 20 l 22 -1 M -25 28 l 22 -1 M 11 13 l 28 -2 M 13 21 l 30 -2 M 16 29 l 27 -2" stroke="#a1a68c" stroke-width="1.5"/>
      <path d="M 18 34 l 15 -1" stroke="#747f6b" stroke-width="1.5"/>
      <path d="M 48 2 L 49 28 L 55 31 L 56 1" fill="#b58d67"/>
    </g>
    <path d="M 307 339 L 372 344" stroke="#525f50" stroke-width="4" stroke-linecap="round"/>
    <path d="M 370 343 L 379 345 L 371 346 Z" fill="#d3c7a8"/>
    <path d="M 314 338 L 328 339" stroke="#c2c6ae" stroke-width="2"/>
    <g transform="translate(111 331)"><ellipse cy="12" rx="25" ry="7" fill="#707c68" opacity=".4"/><path d="M -14 -16 L 14 -16 L 11 8 Q 0 17 -11 8 Z" fill="${young ? '#d3d6bc' : '#baa992'}" stroke="#6e7c65" stroke-width="2"/><path d="M 14 -10 C 33 -13 30 7 12 6" fill="none" stroke="#89917a" stroke-width="4"/><ellipse cy="-16" rx="14" ry="4" fill="#657461"/><path d="M -12 -8 H 13" stroke="#839581" stroke-width="2"/></g>
    <g transform="translate(751 330)"><ellipse cy="12" rx="24" ry="7" fill="#707c68" opacity=".3"/><path d="M -13 -19 L 13 -19 L 11 8 Q 0 15 -11 8 Z" fill="#8d9c87" stroke="#657662" stroke-width="2"/><path d="M 13 -13 C 30 -16 29 5 12 3" fill="none" stroke="#74866c" stroke-width="4"/><ellipse cy="-19" rx="13" ry="4" fill="#5a6a57"/><path d="M -9 -4 h 17" stroke="#b6bba0" stroke-width="1.5"/></g>
    ${emptyChair ? '' : '<path class="lab-steam" d="M 107 303 q -7 -8 0 -16 M 115 307 q 7 -8 0 -16"/>'}
    ${young ? '<g transform="translate(93 220)"><path d="M -9 1 h 21 l 3 79 h -27 Z" fill="#88937c" stroke="#657861" stroke-width="2"/><path d="M -5 -7 H 8 V 2 H -5 Z" fill="#626e5a"/><path d="M 13 17 q 17 -1 15 28 l -12 10" fill="none" stroke="#657861" stroke-width="5"/><path d="M -5 12 v 55" stroke="#a6ad92" stroke-width="2"/></g>' : '<g transform="translate(95 236)"><path d="M -8 4 H 14 L 13 64 H -7 Z" fill="#b2bba3" stroke="#77886f" stroke-width="2"/><path d="M -5 -2 H 11 V 5 H -5 Z" fill="#66775e"/><path d="M -3 18 h 10 M -3 24 h 10" stroke="#7d8c70" stroke-width="2"/></g>'}

    <g transform="translate(39 27)"><path d="M 0 0 h 26" stroke="#788878" stroke-width="1.5"/><text x="35" y="4" font-size="12" fill="#65786a" letter-spacing="2">${eraLabel}</text></g>
    <g transform="translate(944 458)"><path d="M 0 0 h -48" stroke="#738671" stroke-width="1"/><text x="0" y="19" font-size="10" text-anchor="end" fill="#647963">虚构实验 · 静态显示</text></g>
    ${emptyChair ? '<g transform="translate(326 417)"><path d="M 0 0 h 52" stroke="#667e6c" stroke-width="1"/><text x="26" y="17" text-anchor="middle" fill="#617565" font-size="11">林予的位置</text></g>' : ''}
  </svg>`;
}
