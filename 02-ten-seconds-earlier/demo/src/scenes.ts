/** Original, self-contained paper-cut illustrations. No remote assets or SVG scripts.
 * Every frame is a pure function of the observation time, including the hands,
 * gate, reports, bowl and spoon. Pausing therefore preserves an inspectable frame.
 */
export type SceneKind = 'studio' | 'night' | 'earlier' | 'mitigation' | 'call' | 'family' | 'door';

const C = {
  ink: '#102c39', deep: '#071b27', panel: '#173d48', teal: '#6daea8', mint: '#a9d2c0',
  amber: '#eebc72', cream: '#eee5cc', skin: '#dca785', warm: '#b88168', paper: '#d7d9bd',
  red: '#dc8771', muted: '#6c8a8b', line: '#2b545e', hair: '#24343b', white: '#f8f0db',
};
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, p: number) => a + (b - a) * clamp(p);
const phase = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const n = (x: number) => Number(x.toFixed(2));

function arm(points: string, width = 15, color = C.skin): string {
  return `<path d="${points}" fill="none" stroke="${C.deep}" stroke-width="${width + 4}" stroke-linecap="round" stroke-linejoin="round"/><path d="${points}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function head(x: number, y: number, who: 'tang' | 'father' | 'child' | 'engineer' | 'xu', rotation = 0, facingLeft = false): string {
  const female = who === 'tang' || who === 'xu';
  const child = who === 'child';
  const hair = who === 'father' ? '#445359' : C.hair;
  const size = child ? 0.79 : 1;
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rotation)}) scale(${facingLeft ? -size : size} ${size})">
    ${female ? `<path d="M-28-9 Q-35-43 0-46 Q40-44 30 11 L37 35-36 32Z" fill="${hair}"/>` : ''}
    <path d="M-22-22 Q-18-42 8-34 Q29-29 26-3 L20 22 Q2 38-17 18Z" fill="${C.skin}" stroke="${C.deep}" stroke-width="3"/>
    <path d="M-23-7 Q-33-41 2-43 Q34-41 28-15 L20-23 12-17 0-26-20-17Z" fill="${hair}"/>
    ${who === 'father' ? `<path d="M-22-22-15-29 M20-26 25-18" stroke="${C.paper}" stroke-width="5"/><path d="M-12 4 0 4 M8 4 21 4 M0 4 8 4" stroke="${C.ink}" stroke-width="2.2"/><rect x="-16" y="-3" width="17" height="12" rx="4" fill="none" stroke="${C.ink}" stroke-width="2"/><rect x="7" y="-3" width="17" height="12" rx="4" fill="none" stroke="${C.ink}" stroke-width="2"/>` : `<path d="M-11 2-7 2 M11 2 15 2" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`}
    <path d="M6 7 8 13 3 13 M-2 22 Q5 25 12 21" fill="none" stroke="${C.warm}" stroke-width="2" stroke-linecap="round"/>
    ${child ? `<circle cx="-28" cy="-21" r="11" fill="${C.hair}"/><path d="M-24-26-28-14" stroke="${C.amber}" stroke-width="5"/>` : ''}
    <path d="M-9 30-9 42 13 42 14 28" fill="${C.skin}"/>
  </g>`;
}

function torso(x: number, y: number, color: string, size = 1): string {
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${size})"><path d="M-11-5-40 7 Q-51 32-48 81 L-45 121 47 121 47 73 Q52 32 33 9 L13-5Z" fill="${color}" stroke="${C.deep}" stroke-width="3"/><path d="M-11-5 0 18 13-5 M-31 57-28 112 M30 64 30 112" fill="none" stroke="${C.deep}" stroke-width="2" opacity=".5"/></g>`;
}

function cup(x: number, y: number, small = false): string {
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${small ? '.75' : '1'})"><ellipse cy="12" rx="21" ry="7" fill="${C.deep}" opacity=".4"/><path d="M-14-22-11 11 Q0 19 11 11 L14-22Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/><path d="M14-14 Q30-14 26-2 Q22 6 12 3" fill="none" stroke="${C.cream}" stroke-width="5"/><ellipse cy="-22" rx="14" ry="5" fill="${C.amber}" stroke="${C.ink}" stroke-width="2"/></g>`;
}

function report(x: number, y: number, rotation = 0, amended = false): string {
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rotation)})"><path d="M-32-41 23-41 32-31 32 43-32 43Z" fill="${amended ? C.cream : C.paper}" stroke="${C.ink}" stroke-width="2"/><path d="M23-41 23-31 32-31" fill="none" stroke="${C.muted}"/><path d="M-22-28 9-28 M-22-20 20-20 M-22-9 20-9 M-22-2 20-2" stroke="${C.muted}" stroke-width="2.5"/><path d="M-22 11 21 11 M-22 18 10 18" stroke="${amended ? C.amber : C.red}" stroke-width="4"/><path d="M-22 30-7 30" stroke="${C.muted}" stroke-width="2"/>${amended ? `<path d="M0 29 4 22 9 34 12 27 21 30" fill="none" stroke="${C.ink}" stroke-width="2"/>` : ''}</g>`;
}

function roomBase(warm = false): string {
  return `<rect width="960" height="520" fill="${C.deep}"/>
    <path d="M0 0H960V351L0 387Z" fill="${warm ? '#294148' : C.ink}"/>
    <path d="M0 387 960 351 960 520H0Z" fill="${warm ? '#36494b' : '#19353d'}"/>
    <path d="M0 458 960 406 M160 381 76 520 M450 370 434 520 M740 359 848 520" stroke="${C.line}" stroke-width="2" opacity=".6"/>
    <path d="M33 35H925V354L33 385Z" fill="none" stroke="${C.line}" stroke-width="2"/>
    <rect x="51" y="57" width="492" height="248" rx="3" fill="${warm ? '#31504f' : C.panel}" stroke="${C.line}" stroke-width="3"/>
    <path d="M215 57V305 M379 57V305 M51 181H543" stroke="${C.line}" stroke-width="3"/>
    <path d="M39 399 913 365" stroke="${C.teal}" stroke-width="2" opacity=".35"/>
    <ellipse cx="485" cy="498" rx="310" ry="12" fill="${C.deep}" opacity=".35"/>`;
}

function clock(x: number, y: number, family = false): string {
  return `<g transform="translate(${x} ${y})"><circle r="27" fill="${C.cream}" stroke="${C.ink}" stroke-width="4"/><circle r="22" fill="none" stroke="${C.muted}" stroke-width="1"/><path d="M0-18V-14 M18 0H14 M0 18V14 M-18 0H-14 M0 0 0-11 M0 0 13 0" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>${family ? '<path d="M0 0-12 1" stroke="#b88168" stroke-width="1.2"/>' : ''}<circle r="3" fill="${C.ink}"/></g>`;
}

function studio(t: number, reduced: boolean, video = false): string {
  const moveBag = phase(t, 0, 6);
  const water = phase(t, 7, 14);
  const bx = lerp(571, 756, moveBag);
  const bagY = lerp(363, 410, moveBag);
  const hx = lerp(662, 537, water);
  const hy = lerp(338, 343, water);
  const motion = reduced ? 0 : Math.sin(t * .35) * 1.7;
  return `${roomBase(true)}
    <rect x="79" y="87" width="251" height="196" rx="3" fill="${C.deep}" stroke="${C.teal}" stroke-width="3"/>
    <path d="M103 250 132 159 159 176 184 117 221 153 253 135 305 227" fill="none" stroke="${C.teal}" stroke-width="3"/>
    <path d="M103 262H306 M103 102V262" stroke="${C.line}" stroke-width="2"/>
    <circle cx="184" cy="117" r="5" fill="${C.amber}"/>
    <path d="M348 87H478V280H348Z" fill="${C.panel}" stroke="${C.line}" stroke-width="2"/>
    <path d="M365 108H459 M365 118H443 M365 143H459 M365 168H454 M365 194H459 M365 220H452 M365 246H459" stroke="${C.muted}" stroke-width="2" opacity=".65"/>
    ${clock(871, 95)}
    <rect x="576" y="278" width="137" height="187" rx="30" fill="#1c3039" stroke="${C.line}" stroke-width="4"/>
    <path d="M591 455 581 503 M694 455 706 498" stroke="${C.deep}" stroke-width="10"/>
    ${torso(652, 245 + motion, '#678f89')}${head(652, 204 + motion, 'tang', -4)}
    ${arm(`M684 ${270 + motion} Q713 312 ${n(lerp(668, bx - 20, moveBag))} ${n(lerp(355, 345, moveBag))}`, 14)}
    ${arm(`M619 ${273 + motion} Q606 309 ${n(hx)} ${n(hy - 13)}`, 14)}
    <path d="M155 353 727 324 844 421 186 452Z" fill="#947b5f" stroke="${C.deep}" stroke-width="4"/>
    <path d="M186 452V477L845 447V421Z" fill="#5a5146"/>
    <path d="M226 472 217 519 M801 449 814 514" stroke="${C.deep}" stroke-width="13"/>
    <path d="M187 371 416 357 439 405 204 419Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>
    <path d="M223 384 330 378 M223 394 381 385 M223 403 354 394" stroke="${C.muted}" stroke-width="3"/>
    <path d="M483 353 644 345 670 390 506 402Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>
    <path d="M519 367 607 361 M523 377 621 371" stroke="${C.amber}" stroke-width="3"/>
    <rect x="385" y="280" width="129" height="87" rx="7" fill="${C.deep}" stroke="${C.muted}" stroke-width="3"/>
    <rect x="396" y="290" width="106" height="60" rx="2" fill="#224952"/>
    <path d="M409 335H491 M449 299V340" stroke="${C.teal}" stroke-width="2" opacity=".8"/><circle cx="449" cy="320" r="13" fill="none" stroke="${C.amber}" stroke-width="2"/>
    <path d="M437 369 480 367 471 359 443 360Z" fill="${C.muted}"/>
    ${cup(315, 351)}${cup(hx, hy)}
    <g transform="translate(${n(bx)} ${n(bagY)})"><path d="M-32-13-25 49H37L43-13Z" fill="#946950" stroke="${C.deep}" stroke-width="3"/><path d="M-18-9Q-14-53 18-51 Q38-51 32-9" fill="none" stroke="${C.amber}" stroke-width="6"/><path d="M-22 6 32 6 M-11-12-6 46" stroke="#c39467" stroke-width="2"/><rect x="10" y="15" width="17" height="13" rx="2" fill="${C.amber}"/></g>
    <path d="M78 324 108 278 128 324Z" fill="${C.amber}"/><path d="M103 279 108 211 157 177" stroke="${C.deep}" stroke-width="7"/><path d="M135 172 176 162 187 184 151 198Z" fill="${C.muted}"/><path d="M146 191 213 349 92 363Z" fill="url(#lamp)" opacity=".45"/>
    ${video ? callScreen(t, reduced) : ''}`;
}

function callScreen(t: number, reduced: boolean): string {
  const m = reduced ? 0 : Math.sin(t * .35) * 1.3;
  return `<rect x="474" y="72" width="394" height="243" rx="12" fill="${C.deep}" stroke="${C.teal}" stroke-width="3"/>
    <rect x="487" y="85" width="368" height="216" rx="5" fill="#40564f"/>
    <path d="M494 237H849V300H494Z" fill="#2b403e"/>
    <path d="M504 103H592V213H504Z" fill="#708271"/>
    <path d="M515 115H581 M515 134H581 M515 153H581 M515 172H581 M515 191H581" stroke="${C.paper}" stroke-width="3" opacity=".4"/>
    <path d="M794 115 808 85 822 116 M808 108V248" fill="none" stroke="${C.mint}" stroke-width="4"/>
    ${torso(703, 194 + m, '#886f63', .85)}${head(703, 160 + m, 'xu', 3)}
    ${arm(`M674 ${214 + m} Q636 243 640 ${269 + m}`, 12)}
    <path d="M610 259 679 249 694 286 621 294Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/><path d="M625 271 671 264 M629 279 667 273" stroke="${C.muted}" stroke-width="2"/>
    <circle cx="838" cy="100" r="5" fill="${C.mint}"/>
    <path d="M517 288V277 M524 288V268 M531 288V278 M538 288V270" stroke="${C.mint}" stroke-width="3"/>`;
}

function controlRoom(t: number, early: boolean, reduced: boolean): string {
  const close = phase(t, 11, 17);
  const press = phase(t, 7, 10);
  const handX = early ? lerp(611, 580, phase(t, 7, 12)) : lerp(628, 674, press);
  const handY = early ? lerp(285, 293, phase(t, 7, 12)) : lerp(281, 313, press);
  const receive = phase(t, 0, 8);
  const signed = phase(t, 12, 19);
  const glow = early ? 0 : reduced ? .55 : .4 + Math.sin(t * .35) * .12;
  return `${roomBase(early)}
    <path d="M60 123 543 109 543 66H60Z" fill="${early ? '#a0b4a0' : '#325768'}" opacity=".6"/>
    <path d="M75 137 146 136 173 103 243 126 278 118 315 145 357 103 415 127 483 128 526 153" fill="none" stroke="${early ? C.cream : C.teal}" stroke-width="3"/>
    <path d="M71 202H240V279H71Z" fill="${C.deep}" stroke="${C.muted}" stroke-width="2"/>
    <path d="M91 259 111 220 138 232 155 215 179 244 215 226" fill="none" stroke="${C.teal}" stroke-width="3"/>
    <rect x="277" y="204" width="109" height="82" fill="${early ? C.paper : '#204551'}" stroke="${C.deep}" stroke-width="3"/>
    ${early ? `<path d="M291 217H372 M291 229H364 M291 245H372 M291 257H352 M291 271H373" stroke="${C.muted}" stroke-width="2"/><path d="M328 206V283" stroke="${C.muted}" stroke-width="1"/>` : `<path d="M290 221H373 M291 250 312 242 330 258 350 239 372 261" fill="none" stroke="${C.amber}" stroke-width="3"/>`}
    ${clock(600, 101)}
    <rect x="753" y="65" width="165" height="302" rx="3" fill="${C.deep}" stroke="${C.muted}" stroke-width="6"/>
    <rect x="767" y="79" width="137" height="276" fill="${early ? '#657776' : '#23303a'}"/>
    <path d="M779 353 842 250 892 354" fill="${early ? '#53645e' : '#3e4140'}"/>
    <path d="M785 78V349 M888 78V349" stroke="${C.line}" stroke-width="6"/>
    <g opacity="${glow}"><path d="M821 205 789 354H902L864 205Z" fill="url(#hazard)"/></g>
    <clipPath id="gate-clip"><rect x="767" y="79" width="137" height="276"/></clipPath>
    <g clip-path="url(#gate-clip)"><g transform="translate(0 ${early ? -277 : n(lerp(-277, 0, close))})"><path d="M768 79H903V355H768Z" fill="#53666a" stroke="${C.deep}" stroke-width="4"/><path d="M771 103H900 M771 132H900 M771 161H900 M771 190H900 M771 219H900 M771 248H900 M771 277H900 M771 306H900 M771 335H900" stroke="${C.deep}" stroke-width="4"/><path d="M772 347H900" stroke="${C.amber}" stroke-width="8"/></g></g>
    <rect x="784" y="37" width="101" height="13" rx="2" fill="${early ? C.teal : C.amber}"/>
    <path d="M836 378V394" stroke="${C.amber}" stroke-width="4"/>
    <rect x="438" y="291" width="147" height="172" rx="27" fill="#182c36" stroke="${C.line}" stroke-width="4"/>
    <path d="M458 455 438 493 M563 457 586 493" stroke="${C.deep}" stroke-width="10"/>
    ${early ? `${torso(414, 237, '#8a9e90')}${head(414, 195, 'engineer', 9)}${arm(`M442 258 Q468 264 ${n(lerp(468, 553, receive))} ${n(lerp(294, 274, receive))}`, 14)}${arm('M390 260 Q368 310 385 337', 13)}` : `${torso(390, 254, '#608b8d')}${head(390, 212, 'engineer', 7)}${arm(`M416 279 Q450 302 ${n(lerp(450, 482, phase(t, 1, 5)))} ${n(lerp(327, 291, phase(t, 1, 5)))}`, 14)}${arm('M360 280 Q337 307 321 328', 14)}`}
    ${torso(621, 241, '#677877')}${head(621, 199, 'father', early ? 7 : 11)}
    ${arm(`M649 270 Q654 292 ${n(handX)} ${n(handY)}`, 16)}
    ${arm(early ? 'M594 268 Q566 279 547 279' : 'M593 268 Q566 306 559 337', 15)}
    <path d="M245 338 681 310 737 410 290 447Z" fill="#405b5e" stroke="${C.deep}" stroke-width="5"/>
    <path d="M290 447V477L739 439V410Z" fill="#233d46"/>
    <path d="M306 475 303 517 M703 443 710 499" stroke="${C.deep}" stroke-width="12"/>
    <path d="M291 352 441 344 469 390 312 403Z" fill="${C.deep}" stroke="${C.muted}" stroke-width="3"/>
    <path d="M313 380 347 356 378 378 412 353 439 379" fill="none" stroke="${C.teal}" stroke-width="2"/>
    <path d="M492 336 570 330 589 365 510 375Z" fill="${C.deep}" stroke="${C.muted}" stroke-width="2"/>
    <path d="M511 347H553 M520 358H565" stroke="${C.teal}" stroke-width="3"/>
    <path d="M616 324 683 318 707 355 637 362Z" fill="${C.deep}" stroke="${C.muted}" stroke-width="2"/>
    <ellipse cx="674" cy="331" rx="13" ry="8" fill="${!early && t >= 10 ? C.amber : C.red}" stroke="${C.ink}" stroke-width="3"/>
    <path d="M650 346 676 345" stroke="${C.muted}" stroke-width="3"/>
    ${!early && t >= 7 ? arm(`M649 270 Q654 292 ${n(handX)} ${n(handY + 13)}`, 16) : ''}
    ${early ? `${report(lerp(469, 552, receive), lerp(281, 279, receive), lerp(-24, -9, receive))}${report(596, 347, -11, signed >= .8)}${t >= 12 ? `${arm(`M649 269 Q648 309 ${n(lerp(619, 611, signed))} ${n(lerp(329, 350, signed))}`, 15)}<path d="M${n(lerp(619, 611, signed))} ${n(lerp(329, 350, signed))} l-16 19" stroke="${C.deep}" stroke-width="4" stroke-linecap="round"/>` : ''}` : ''}
    <path d="M74 410 177 400 182 416 79 427Z" fill="${C.amber}" opacity=".35"/>`;
}

function mitigation(t: number, reduced: boolean): string {
  const spread = phase(t, 0, 14);
  const safe = phase(t, 7, 18);
  const dots = Array.from({ length: 5 }, (_, i) => {
    const x = lerp(614 + i * 19, 750 + i * 22, safe);
    const y = 278 + (i % 2) * 39;
    return `<g transform="translate(${n(x)} ${y})"><circle cy="-12" r="7" fill="${C.mint}"/><path d="M-7 0 7 0 11 17-11 17Z" fill="${C.mint}"/><path d="M-5 18-6 27 M5 18 6 27" stroke="${C.mint}" stroke-width="4" stroke-linecap="round"/></g>`;
  }).join('');
  const shift = reduced ? 0 : Math.sin(t * .18) * 2;
  return `${roomBase()}
    <path d="M95 106H865V410H95Z" fill="#12343e" stroke="${C.teal}" stroke-width="3"/>
    <path d="M130 175H497V344H130Z M541 175H829V344H541Z" fill="#244952" stroke="${C.muted}" stroke-width="2"/>
    <path d="M130 214H497 M541 214H829 M130 300H497 M541 300H829" stroke="${C.line}" stroke-width="3"/>
    <path d="M151 243H471V277H151Z M561 243H807V277H561Z" fill="#18363e"/>
    <path d="M174 190V331 M277 190V331 M380 190V331 M584 190V331 M687 190V331 M790 190V331" stroke="${C.muted}" stroke-width="7" opacity=".45"/>
    <clipPath id="spread-clip"><rect x="131" y="176" width="366" height="166"/></clipPath>
    <g clip-path="url(#spread-clip)"><ellipse cx="${n(lerp(140, 338, spread))}" cy="${n(259 + shift)}" rx="${n(lerp(50, 188, spread))}" ry="96" fill="url(#hazard)"/><path d="M150 259 232 221 281 279 339 225 399 289 480 251" fill="none" stroke="${C.amber}" stroke-width="3" opacity=".65"/></g>
    <path d="M501 173H540V346H501Z" fill="#617473" stroke="${C.deep}" stroke-width="4"/>
    <path d="M507 180V338 M518 180V338 M531 180V338" stroke="${C.deep}" stroke-width="3"/>
    <path d="M500 356H540" stroke="${C.amber}" stroke-width="6"/>
    ${dots}
    <path d="M633 367H778 M763 356 778 367 763 378" fill="none" stroke="${C.mint}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="519" cy="139" r="16" fill="${C.amber}"/><path d="M511 139 517 144 528 132" fill="none" stroke="${C.ink}" stroke-width="3"/>
    <path d="M151 139H379 M599 139H806" stroke="${C.muted}" stroke-width="4"/>
    <path d="M146 440H813 M146 429V449 M359 431V449 M574 431V449 M813 429V449" stroke="${C.teal}" stroke-width="2"/>
    <circle cx="${n(lerp(147, 812, phase(t, 0, 20)))}" cy="440" r="7" fill="${C.amber}"/>`;
}

function bowl(x: number, y: number, steamOpacity: number): string {
  return `<g data-object="bowl" transform="translate(${n(x)} ${n(y)})"><ellipse cy="17" rx="48" ry="10" fill="${C.deep}" opacity=".3"/><path d="M-39-7 Q-34 34 0 35 Q35 32 39-7Z" fill="${C.teal}" stroke="${C.deep}" stroke-width="3"/><path d="M-26 19Q0 32 27 17" fill="none" stroke="${C.mint}" stroke-width="3"/><ellipse cy="-7" rx="39" ry="13" fill="${C.cream}" stroke="${C.deep}" stroke-width="3"/><ellipse cy="-7" rx="31" ry="8" fill="${C.amber}"/><path d="M-15-7Q-1-13 15-6" stroke="${C.white}" stroke-width="2" fill="none"/>
    <g opacity="${n(steamOpacity)}" stroke="${C.cream}" stroke-width="3" fill="none" stroke-linecap="round"><path d="M-21-26Q-30-38-21-49 Q-12-59-19-69"/><path d="M0-28Q10-40 2-51 Q-5-61 3-74"/><path d="M20-26Q30-34 24-45 Q16-56 23-65"/></g></g>`;
}

function spoon(x: number, y: number, rotation: number): string {
  return `<g data-object="spoon" transform="translate(${n(x)} ${n(y)}) rotate(${n(rotation)})"><path d="M0 1V-41" stroke="${C.deep}" stroke-width="7" stroke-linecap="round"/><path d="M0 1V-41" stroke="${C.cream}" stroke-width="4" stroke-linecap="round"/><ellipse cy="-48" rx="8" ry="13" fill="${C.paper}" stroke="${C.deep}" stroke-width="2"/><path d="M-4-53Q-7-47-3-42" fill="none" stroke="${C.white}" stroke-width="2"/></g>`;
}

function family(t: number, reduced: boolean): string {
  const reaching = phase(t, 0, 2);
  const blocked = phase(t, 2, 3);
  const moving = phase(t, 4, 6);
  const blowing = t >= 6 && t < 8;
  const returning = phase(t, 8, 10);
  const celebrate = phase(t, 10, 16);
  const bx = lerp(493, 580, moving);
  const by = lerp(352, 344, moving);
  const childX = t < 4 ? lerp(413, 464, reaching) : lerp(464, 436, phase(t, 4, 6));
  const childY = t < 4 ? lerp(338, 327, reaching) : lerp(327, 329, phase(t, 4, 6));
  const fatherBlockX = t < 4 ? lerp(597, 475, blocked) : lerp(475, bx + 31, moving);
  const fatherBlockY = t < 4 ? lerp(293, 322, blocked) : lerp(322, by + 4, moving);
  const spoonX = t < 2 ? 519 : t < 8 ? lerp(519, 548, phase(t, 2, 6)) : lerp(548, 435, returning);
  const spoonY = t < 2 ? 326 : t < 8 ? lerp(326, 293, phase(t, 2, 6)) : lerp(293, 329, returning);
  const spoonRotation = t < 2 ? 34 : t < 8 ? lerp(34, -14, phase(t, 2, 6)) : lerp(-14, -8, returning);
  const lean = t < 6 ? lerp(0, -13, phase(t, 4, 6)) : t < 8 ? -13 : lerp(-13, 0, returning);
  const bob = reduced ? 0 : Math.sin(t * .8) * .7;
  return `<rect width="960" height="520" fill="#263d42"/>
    <path d="M0 0H960V382L0 419Z" fill="#43645f"/>
    <path d="M0 419 960 382 960 520H0Z" fill="#526057"/>
    <path d="M0 471 960 423 M218 410 154 520 M508 400 514 520 M802 388 913 520" stroke="#788171" stroke-width="2" opacity=".5"/>
    <rect x="52" y="49" width="244" height="231" rx="3" fill="#203e49" stroke="#789487" stroke-width="7"/>
    <path d="M58 229 107 189 158 208 193 141 230 195 291 176V274H58Z" fill="#31585c"/>
    <path d="M174 51V278 M54 165H291" stroke="#789487" stroke-width="6"/>
    <path d="M44 29 86 41 77 300 28 326Z M270 41 312 27 337 315 286 297Z" fill="#8c9480"/>
    <path d="M50 52 59 297 M291 52 314 301" stroke="#b5b69b" stroke-width="3" opacity=".5"/>
    <rect x="362" y="54" width="195" height="119" rx="4" fill="#a39a79" stroke="${C.ink}" stroke-width="7"/>
    <path d="M375 159 412 109 443 139 479 93 539 159Z" fill="#647a6c"/>
    <circle cx="502" cy="86" r="13" fill="${C.amber}"/>
    ${clock(827, 97, true)}
    <path d="M472 0V62" stroke="${C.ink}" stroke-width="5"/><path d="M438 65Q475 45 512 65 L534 91H416Z" fill="${C.amber}" stroke="${C.ink}" stroke-width="3"/><path d="M426 92 571 376 303 386Z" fill="url(#lamp)" opacity=".36"/>
    <path d="M95 305 116 267H254L269 374H106Z" fill="#2e4d49"/>
    ${torso(172, 224, '#a18a6d', .81)}${head(172, 191, 'xu', 7)}
    ${arm(`M192 248Q218 272 ${n(lerp(224, 239, celebrate))} ${n(lerp(299, 240, celebrate))}`, 12)}${cup(lerp(224, 239, celebrate), lerp(299, 240, celebrate), true)}
    <path d="M725 285 745 245H871L890 378H737Z" fill="#2e4d49"/>
    ${torso(806, 208, '#819384', .81)}${head(806, 174, 'engineer', -7)}
    ${arm(`M782 232 Q756 268 ${n(lerp(747, 719, celebrate))} ${n(lerp(289, 230, celebrate))}`, 12)}${cup(lerp(747, 719, celebrate), lerp(289, 230, celebrate), true)}
    <rect x="319" y="291" width="111" height="190" rx="23" fill="#355750" stroke="${C.ink}" stroke-width="4"/>
    ${torso(372, 288, '#c98e71', .81)}${head(372, 258 + bob, 'child', lerp(12, 0, celebrate))}
    <rect x="593" y="242" width="129" height="239" rx="24" fill="#355750" stroke="${C.ink}" stroke-width="4"/>
    ${torso(643, 246, '#88998a')}${head(643 + lean, 205 - lean * .35, 'father', lean, true)}
    <path d="M170 334 745 312 907 452 251 489Z" fill="#b19877" stroke="${C.ink}" stroke-width="4"/>
    <path d="M251 489V514L907 478V452Z" fill="#817357"/>
    <path d="M253 496 241 520 M869 480 883 520" stroke="${C.ink}" stroke-width="13"/>
    <path d="M187 338 759 317 875 444 269 477Z" fill="#d5c4a0"/>
    <path d="M196 364 785 342 M222 395 815 371 M251 429 848 406 M294 465 856 440" stroke="#b5b897" stroke-width="2" opacity=".8"/>
    <path d="M242 339 324 474 M373 332 438 469 M509 326 559 462 M647 321 690 457 M765 332 810 448" stroke="#b5b897" stroke-width="2" opacity=".8"/>
    <ellipse cx="703" cy="409" rx="60" ry="19" fill="${C.paper}" stroke="${C.ink}" stroke-width="3"/><path d="M659 407Q703 385 746 406 Q734 424 682 420Z" fill="#658c71"/><path d="M675 402 688 412 M712 400 733 412" stroke="${C.amber}" stroke-width="5"/>
    <ellipse cx="310" cy="389" rx="36" ry="12" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/><ellipse cx="310" cy="387" rx="25" ry="8" fill="#ac9d76"/>
    <ellipse cx="520" cy="446" rx="49" ry="13" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/><path d="M477 424H562V445Q519 462 477 446Z" fill="#b28466" stroke="${C.ink}" stroke-width="2"/><ellipse cx="520" cy="423" rx="43" ry="12" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/><path d="M509 421V395 M530 421V395" stroke="${C.amber}" stroke-width="4"/><path d="M509 391Q502 382 509 377 Q516 384 509 391 M530 391Q523 382 530 377 Q537 384 530 391" fill="${C.amber}"/>
    ${cup(815, 407, true)}
    <g data-object="child-hand" data-x="${n(childX)}" data-y="${n(childY)}">${arm(`M398 307Q425 307 ${n(childX)} ${n(childY)}`, 12)}</g>
    ${arm('M350 313 Q334 334 350 356', 12)}
    <g data-object="father-hand" data-x="${n(fatherBlockX)}" data-y="${n(fatherBlockY)}">${arm(`M610 273 Q576 300 ${n(fatherBlockX)} ${n(fatherBlockY)}`, 16)}</g>
    ${bowl(bx, by, lerp(.78, .2, phase(t, 6, 14)))}
    ${t >= 4 ? arm(`M${n(fatherBlockX)} ${n(fatherBlockY)} l-15 8`, 13) : ''}
    ${t < 10 ? arm(`M672 274 Q664 305 ${n(spoonX)} ${n(spoonY)}`, 14) : arm('M672 274 Q669 315 645 345', 14)}
    ${spoon(spoonX, spoonY, spoonRotation)}
    ${t >= 10 ? `<circle cx="435" cy="329" r="7" fill="${C.skin}" stroke="${C.deep}" stroke-width="2"/>` : ''}
    ${blowing ? `<g data-object="breath" stroke="${C.white}" stroke-width="2.7" fill="none" stroke-linecap="round" opacity=".8"><path d="M616 232Q592 255 582 286"/><path d="M622 235Q602 260 595 289"/><path d="M628 238Q613 265 610 288"/></g>` : ''}
    ${t >= 10 ? `<g transform="translate(873 338)"><path d="M-28-13H20V21H-28Z" fill="${C.ink}" stroke="${C.muted}" stroke-width="3"/><path d="M20-6 35-13V19L20 10Z" fill="${C.ink}"/><circle cx="-9" cy="3" r="10" fill="${C.teal}" stroke="${C.deep}" stroke-width="3"/><circle cx="13" cy="-8" r="3" fill="${C.red}"/><path d="M-8 22-24 73 M-8 22 11 70 M-8 22-6 74" stroke="${C.ink}" stroke-width="4"/></g>` : ''}
    <rect width="960" height="520" fill="#eab969" opacity=".035"/>`;
}

function door(t: number, reduced: boolean): string {
  const walk = phase(t, 0, 16);
  const tx = lerp(598, 740, walk);
  const m = reduced ? 0 : Math.sin(t * .45) * 2;
  return `${roomBase(true)}
    <path d="M604 38H887V396L604 417Z" fill="#58746b" stroke="${C.deep}" stroke-width="7"/>
    <path d="M620 56 848 66V367L620 391Z" fill="#789080"/>
    <path d="M625 235 848 222 848 367 625 389Z" fill="#6b7c6d"/>
    <path d="M733 59 688 372 M850 175 617 194" stroke="#b0b99c" stroke-width="2" opacity=".45"/>
    <path d="M779 114H819V197H779Z" fill="#556e63" stroke="#b0b99c" stroke-width="2"/>
    <path d="M630 397 822 365 891 414 684 449Z" fill="#4f655c"/>
    <path d="M860 55 929 31V412L860 370Z" fill="#263f43" stroke="${C.deep}" stroke-width="5"/>
    <path d="M878 61 912 50V336L878 315Z" fill="#344f50" stroke="${C.line}" stroke-width="2"/>
    <path d="M877 215 903 204" stroke="${C.amber}" stroke-width="5" stroke-linecap="round"/>
    <path d="M${n(tx - 23)} 388 ${n(tx - 34)} 469 ${n(tx - 56)} 473 M${n(tx + 20)} 388 ${n(tx + 28)} 467 ${n(tx + 12)} 476" fill="none" stroke="${C.deep}" stroke-width="20" stroke-linecap="round"/>
    ${torso(tx, 256 + m, '#658d86')}${head(tx, 214 + m, 'tang', -6)}
    <path d="M${n(tx - 37)} 319 ${n(tx - 45)} 428 ${n(tx + 48)} 422 ${n(tx + 35)} 306Z" fill="#58736f" stroke="${C.deep}" stroke-width="3"/>
    ${arm(`M${n(tx - 36)} ${n(279 + m)} Q${n(tx - 65)} 326 ${n(tx - 58)} 364`, 14)}
    <g transform="translate(${n(tx - 56)} 397)"><path d="M-26-12-20 45 29 43 35-15Z" fill="#946950" stroke="${C.deep}" stroke-width="3"/><path d="M-14-9 Q-16-46 13-44 Q36-41 26-12" fill="none" stroke="${C.amber}" stroke-width="5"/></g>
    ${arm(`M${n(tx + 34)} ${n(283 + m)} Q${n(tx + 50)} 315 ${n(tx + 11)} 339`, 14)}
    <path d="M${n(tx - 5)} 328  ${n(tx + 32)} 323 ${n(tx + 33)} 344 ${n(tx - 3)} 350Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>
    <path d="M78 395 376 378 407 468 110 485Z" fill="#8e785c" stroke="${C.ink}" stroke-width="3"/>
    <path d="M127 418 257 411 269 439 137 447Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/><path d="M291 409 358 405 369 430 300 435Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="2"/>
    <path d="M145 432H234 M309 421H346" stroke="${C.muted}" stroke-width="3"/>
    <path d="M81 110H405V272H81Z" fill="${C.deep}" stroke="${C.muted}" stroke-width="3"/><path d="M99 254 133 181 189 209 227 146 276 199 343 154 387 235" fill="none" stroke="${C.teal}" stroke-width="3"/>
    ${clock(530, 102)}`;
}

const DESCRIPTIONS: Record<SceneKind, string> = {
  studio: '观察工作室。唐雯移开座位上的袋子，把一杯水递到桌边。两份资料留在桌面两侧。',
  night: '事故当晚的控制室。唐振声伸手按下控制键，隔离闸随后从上方向下关闭。值班员在一旁示意。',
  earlier: '四十天前的同一控制室。工程员递交报告，唐振声翻看，随后在另一份报告上签字。门体保持打开。',
  mitigation: '地下交通枢纽结构示意。危险扩散在隔离闸一侧受到阻挡，另一侧的人员向出口移动。',
  call: '工作室中的通话画面。许宁坐在自己的桌前，手旁只有获许可核对的材料。',
  family: '家庭餐桌。小唐雯伸手拿热碗，父亲拦住她，把碗移到自己面前吹气，再将勺子交回。之后家人举杯，摄像机开始录像。',
  door: '唐雯带着包和私人文件走向工作室门口。桌上案件材料与私人文件依然分别放置，走廊保持明亮。',
};

export function renderScene(kind: SceneKind, seconds: number, reduced: boolean): string {
  const t = clamp(Number.isFinite(seconds) ? seconds : 0, 0, 20);
  const action = kind === 'family' ? (t < 2 ? 'reach' : t < 4 ? 'block' : t < 6 ? 'move-bowl' : t < 8 ? 'blow' : t < 10 ? 'return-spoon' : 'recording')
    : kind === 'night' ? (t < 7 ? 'gate-open' : t < 11 ? 'press-control' : t < 17 ? 'gate-closing' : 'gate-closed')
    : kind === 'earlier' ? (t < 8 ? 'receive-report' : t < 12 ? 'read-report' : 'sign-report') : kind;
  const familyAction = t < 2 ? '小唐雯正伸手拿热碗。' : t < 4 ? '父亲伸出手，拦住小唐雯的手。' : t < 6 ? '父亲把热碗移到自己面前。' : t < 8 ? '父亲俯身向热碗轻轻吹气。' : t < 10 ? '父亲将勺子交回小唐雯手里，仍扶着碗。' : '家人举杯，实际家庭摄像机开始录像。';
  const body = kind === 'studio' ? studio(t, reduced)
    : kind === 'call' ? studio(t, reduced, true)
    : kind === 'night' ? controlRoom(t, false, reduced)
    : kind === 'earlier' ? controlRoom(t, true, reduced)
    : kind === 'mitigation' ? mitigation(t, reduced)
    : kind === 'family' ? family(t, reduced)
    : door(t, reduced);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 520" role="img" aria-labelledby="scene-title scene-description" data-scene="${kind}" data-seconds="${n(t)}" data-action="${action}">
    <title id="scene-title">${kind === 'family' ? '授权家庭历史画面' : kind === 'earlier' || kind === 'night' ? '枢纽控制室历史画面' : kind === 'mitigation' ? '危险扩散时间与结构示意' : '观察工作室'}</title>
    <desc id="scene-description">${kind === 'family' ? familyAction : DESCRIPTIONS[kind]}</desc>
    <defs><linearGradient id="lamp" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${C.amber}" stop-opacity=".55"/><stop offset="1" stop-color="${C.amber}" stop-opacity="0"/></linearGradient><radialGradient id="hazard"><stop stop-color="${C.amber}" stop-opacity=".76"/><stop offset="1" stop-color="${C.red}" stop-opacity=".08"/></radialGradient><filter id="paper-grain"><feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".07"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter></defs>
    <g>${body}</g><rect width="960" height="520" fill="${C.paper}" filter="url(#paper-grain)" opacity=".07" pointer-events="none"/>
    <path d="M22 44V22H44 M916 22H938V44 M22 476V498H44 M916 498H938V476" fill="none" stroke="${C.mint}" stroke-width="2" opacity=".55"/>
  </svg>`;
}
