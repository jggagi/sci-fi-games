import type { SceneId } from './content';
import type { GameState, CapturedFrame, VisualVariant } from './model';

/** Original SVG assets. Snapshots depend only on the record, never the later game state. */
interface View extends VisualVariant {
  scene: SceneId;
  kind: string;
  node: string;
  calibrated: boolean;
  centered: boolean;
  stool: boolean;
  points: number;
  bag: boolean;
  wiped: boolean;
  snapshot: boolean;
  camera: boolean;
}
const ink = '#193c3a';
const orange = '#c27e51';
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function viewFor(scene: SceneId, state: GameState, frame: CapturedFrame | undefined, camera: boolean): View {
  if (frame) {
    const mirror = frame.kind === 'portrait' || frame.kind === 'epilogue_mirror';
    return { ...frame.variant, scene: mirror ? 'T07' : frame.sourceScene, kind: frame.kind,
      node: frame.sourceNodeId, calibrated: true, centered: true,
      stool: frame.kind === 'upright_stool' || frame.kind === 'breakfast_hands',
      points: 3, bag: true, wiped: mirror, snapshot: true, camera: false };
  }
  const place = state.nodeId === 'T04.10' || state.nodeId === 'T05.09' ? 'T01' : scene;
  return { scene: place, kind: '', node: state.nodeId, mealChoice: state.mealChoice,
    routeOrder: state.routeOrder, framing: state.framing, hairChoice: state.hairChoice,
    stationAction: state.stationAction, calibrated: state.calibrated, centered: state.breakfastCentered,
    stool: state.helpedStool, points: state.observationPoints.length, bag: state.mirrorBagDown,
    wiped: state.mirrorWiped, snapshot: false, camera };
}

function definitions(id: string) {
  return `<defs>
    <linearGradient id="${id}-sky" x2="0" y2="1"><stop stop-color="#f0e4cb"/><stop offset="1" stop-color="#b9c5b0"/></linearGradient>
    <linearGradient id="${id}-wall" x2="1" y2="1"><stop stop-color="#e3d9bf"/><stop offset="1" stop-color="#a9b4a0"/></linearGradient>
    <linearGradient id="${id}-wood" x2="0" y2="1"><stop stop-color="#b08862"/><stop offset="1" stop-color="#5f6b53"/></linearGradient>
    <linearGradient id="${id}-lake" x2="0" y2="1"><stop stop-color="#b9bd97"/><stop offset=".52" stop-color="#759890"/><stop offset="1" stop-color="#335c58"/></linearGradient>
    <linearGradient id="${id}-glass" x2="1" y2="1"><stop stop-color="#acc6b5"/><stop offset=".5" stop-color="#678d7e"/><stop offset="1" stop-color="#42685f"/></linearGradient>
    <linearGradient id="${id}-metal" x2="1" y2="1"><stop stop-color="#d1cfb3"/><stop offset=".36" stop-color="#8aa298"/><stop offset=".6" stop-color="#ccd0b4"/><stop offset="1" stop-color="#6b877c"/></linearGradient>
    <linearGradient id="${id}-fog" x2="0" y2="1"><stop stop-color="#dce0c8" stop-opacity=".95"/><stop offset="1" stop-color="#c0cbbb" stop-opacity=".82"/></linearGradient>
    <radialGradient id="${id}-glow"><stop stop-color="#ffedc2" stop-opacity=".8"/><stop offset="1" stop-color="#ffedc2" stop-opacity="0"/></radialGradient>
    <pattern id="${id}-paper" width="11" height="11" patternUnits="userSpaceOnUse"><circle cx="1" cy="2" r=".55" fill="${ink}" opacity=".12"/><path d="M6 7h2" stroke="#f8efda" stroke-width=".8" opacity=".22"/></pattern>
    <pattern id="${id}-tiles" width="83" height="69" patternUnits="userSpaceOnUse"><path d="M0 0H83V69" fill="none" stroke="#557c6b" stroke-width="1.2" opacity=".28"/></pattern>
    <filter id="${id}-blur"><feGaussianBlur stdDeviation="8"/></filter>
    <clipPath id="${id}-mirror"><path d="M374 69H807V393H374Z"/></clipPath>
  </defs>`;
}

function reeds(x: number, y: number, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="#294e43" stroke-width="4" stroke-linecap="round"><path d="M0 0Q-8-62-28-111M7 0Q22-76 33-133M-12 0Q-38-48-60-65M20 0Q52-56 66-91M-3 0Q-5-99 6-147"/><path d="M-28-110l-5-27M33-133l5-29M6-147l2-25" stroke="#655f43" stroke-width="9"/></g>`;
}

function hills(id: string, evening = false) {
  return `<rect width="1200" height="680" fill="url(#${id}-sky)"/><path d="M0 205Q160 188 251 207T491 183 750 206 1030 173 1200 185" fill="none" stroke="#faf0d9" stroke-width="7" opacity=".45"/>
    <circle cx="${evening ? 825 : 911}" cy="${evening ? 177 : 112}" r="${evening ? 48 : 36}" fill="#f6dcab"/>
    <path d="M0 284L96 260 194 289 309 243 399 276 526 210 663 249 790 205 935 252 1062 208 1200 245V680H0Z" fill="#a7b5a0"/>
    <path d="M0 358L171 279 271 325 374 300 495 340 641 264 777 296 913 262 1042 315 1200 284V680H0Z" fill="#748e7b"/>
    <path d="M0 465Q142 328 293 366T596 376 858 329 1200 408V680H0Z" fill="#4c7761"/>
    <path d="M0 539Q257 418 456 469T867 449 1200 520V680H0Z" fill="#718569"/>`;
}

function field(v: View, id: string) {
  const wx = v.calibrated || v.scene === 'T06' ? 676 : 978;
  return `<rect width="1200" height="680" fill="url(#${id}-wall)"/>
    <path d="M0 47H1200M0 361H1200" stroke="#909e8a" stroke-width="2"/><path d="M0 373H1200V419H0Z" fill="#668574"/><path d="M0 373H1200" stroke="#294c44" stroke-width="7"/>
    <g transform="translate(${wx} 69)"><rect x="-14" y="-14" width="457" height="321" rx="3" fill="#305a4f"/><rect width="428" height="293" fill="url(#${id}-sky)"/>
      <path d="M0 127Q85 74 165 102T330 98 428 107V293H0Z" fill="#89a085"/><path d="M0 185Q125 166 170 180T428 174V293H0Z" fill="#598b80"/>
      <path d="M52 293Q94 224 257 204T428 206" fill="none" stroke="#d8d2ae" stroke-width="35"/>
      <path d="M50 255L90 166M79 201L39 167M85 184L132 158M348 249L331 151M335 185L291 151" fill="none" stroke="#2e5a47" stroke-width="8"/>
      <path d="M55 134Q105 89 150 131T87 169Z M283 131Q327 89 371 126T331 160Z" fill="#506e50"/>
      <path d="M214 0V293M0 147H428" stroke="#305a4f" stroke-width="9"/><path d="M13 9H207M227 9H417" stroke="#faf1d4" stroke-width="4" opacity=".8"/>
    </g><path d="M${wx} 363L${wx - 334} 510H1057L1112 363Z" fill="#f2dfab" opacity=".17"/>
    <rect x="86" y="90" width="369" height="238" rx="3" fill="#507166"/><rect x="97" y="100" width="345" height="213" fill="#d9d5b8"/>
    <path d="M116 270Q163 245 170 196T272 196 403 130M153 116L189 300M227 110L256 300M104 186H430M112 240H426" fill="none" stroke="#8eaa94" stroke-width="2"/>
    <path d="M152 249Q190 249 207 212T279 187 353 156" fill="none" stroke="${orange}" stroke-width="5" stroke-dasharray="8 5"/><circle cx="152" cy="249" r="7" fill="${ink}"/><circle cx="353" cy="156" r="7" fill="${ink}"/>
    <path d="M273 91V67M282 66h-18" stroke="#42584b" stroke-width="5"/>
    <g transform="translate(548 230)"><circle r="39" fill="#9dab95" stroke="#325448" stroke-width="5"/><circle r="6" fill="#325448"/><path d="M0 0Q-46-15-16-34T0 0Q41-20 33 14T0 0Q0 43-23 23T0 0" fill="#6d8475"/><path d="M0 42V116M-38 117H38" stroke="#325448" stroke-width="9"/></g>
    <path d="M0 472L963 392 1200 505V680H0Z" fill="url(#${id}-wood)"/><path d="M0 497L972 415M0 570L1037 456M0 645L1112 497" stroke="#dfc098" stroke-width="2" opacity=".32"/>
    <path d="M184 459L576 420 740 515 343 581Z" fill="#e4d9ba" stroke="#b4b094" stroke-width="2"/><path d="M240 490L534 452M266 506L557 469M298 523L528 494M570 454L650 503" stroke="#719080" stroke-width="2" stroke-dasharray="5 5"/><path d="M330 561L464 487 580 509" fill="none" stroke="${orange}" stroke-width="4"/>
    <g transform="translate(373 396)"><ellipse cx="30" cy="112" rx="59" ry="13" fill="#34493c" opacity=".24"/><path d="M0 0H72L67 103Q35 116 4 103Z" fill="#d1d0ad" stroke="#3a5c50" stroke-width="4"/><ellipse cx="36" cy="1" rx="36" ry="8" fill="#587167"/><path d="M16 23V84" stroke="#f2e7c7" stroke-width="10" opacity=".6"/><rect x="1" y="-9" width="70" height="13" rx="5" fill="#33574c"/></g>
    <g transform="translate(782 455) rotate(9)"><rect width="212" height="85" rx="16" fill="#244b45"/><rect x="14" y="12" width="128" height="48" rx="5" fill="#8da99b"/><path d="M28 37H39L45 23 53 49 61 32H122" fill="none" stroke="#d5e0c6" stroke-width="3"/><circle cx="178" cy="35" r="12" fill="${orange}"/><path d="M21 73H80M103 73H191" stroke="#709389" stroke-width="4"/><path d="M194 68Q279 100 270 191" fill="none" stroke="#263f36" stroke-width="8"/></g>
    <path d="M998 534Q1064 492 1139 533L1171 680H963Z" fill="#2b5148"/><path d="M1032 548Q1061 484 1114 543" fill="none" stroke="#1c3d37" stroke-width="13"/><path d="M991 590H1145" stroke="#b59363" stroke-width="7"/>
    ${v.scene === 'T06' ? '<path d="M71 500L220 474 337 576 171 617Z" fill="#bdc8ad"/><path d="M97 514L218 495M125 539L245 517M153 564L271 540" stroke="#6d8f7c" stroke-width="3"/><rect x="48" y="525" width="67" height="28" rx="3" transform="rotate(-9 48 525)" fill="#c27e51"/>' : ''}`;
}

function meal(id: string, flatbread: boolean, x: number, y: number, scale = 1, hand = false) {
  const dish = flatbread
    ? `<ellipse rx="125" ry="39" fill="#dad9b9" stroke="#537669" stroke-width="6"/><ellipse cy="-6" rx="103" ry="30" fill="#ece4c4"/><path d="M-79-7Q-80-35-30-29L68-26Q102-13 81 12L-66 17Z" fill="#d5ad69" stroke="#a97543" stroke-width="3"/><path d="M-54-16L52 9M-21-24L67 0M-61 7L4-22" stroke="#b8864d" stroke-width="3"/><g fill="#9d7040"><circle cx="-42" cy="-9" r="2"/><circle cx="13" cy="-15" r="2"/><circle cx="46" cy="2" r="2"/><circle cx="-13" cy="5" r="2"/></g>`
    : `<ellipse cy="26" rx="96" ry="25" fill="#455d4c" opacity=".24"/><path d="M-105-6Q-86 77 0 71Q88 77 105-6Z" fill="#d9debd" stroke="#4b7366" stroke-width="5"/><ellipse cy="-6" rx="105" ry="36" fill="#f1e8c6" stroke="#4b7366" stroke-width="5"/><ellipse cy="-6" rx="86" ry="24" fill="#d8ca98"/><g fill="#f6e7ba"><ellipse cx="-42" cy="-9" rx="13" ry="4"/><ellipse cx="16" cy="1" rx="18" ry="4"/><ellipse cx="45" cy="-12" rx="11" ry="4"/></g><path d="M-61 30Q0 46 57 30" fill="none" stroke="#8ca393" stroke-width="3"/>`;
  return `<g transform="translate(${x} ${y}) scale(${scale})" data-meal-object="${flatbread ? 'flatbread' : 'porridge'}">${dish}
    <g class="art-steam" fill="none" stroke="#f6edd3" stroke-width="5" stroke-linecap="round" opacity=".52"><path d="M-37-46Q-65-69-42-93T-42-135M2-40Q27-72 1-98T6-145M42-39Q70-59 47-83T53-119"/></g>
    ${hand ? `<path d="M244 192L129 130 119 58 82 19Q62 11 52 23L58 45 89 67 90 94Q47 71 37 95Q28 116 79 145L146 207Z" fill="#c69d76" stroke="#775f48" stroke-width="3"/><path d="M219 175L140 118 110 180 172 225 276 254Z" fill="${orange}" stroke="#855b40" stroke-width="3"/><path d="M153 129L129 177" stroke="#e1c9a3" stroke-width="8"/>
      ${flatbread ? '<g data-utensil="chopsticks"><path d="M64 37L-52-30M70 28L-46-43" stroke="#72563e" stroke-width="6" stroke-linecap="round"/><path d="M87 67L65 39M82 86L61 55" stroke="#926e52" stroke-width="3"/></g>' : '<g data-utensil="spoon"><path d="M73 34L-7-31" stroke="#7f9788" stroke-width="8" stroke-linecap="round"/><ellipse cx="-17" cy="-39" rx="24" ry="11" transform="rotate(38 -17 -39)" fill="#a9b7a0" stroke="#547565" stroke-width="3"/><path d="M69 44L89 62M62 58L85 78" stroke="#926e52" stroke-width="3"/></g>'}` : ''}
  </g>`;
}

function breakfast(v: View, id: string) {
  const centered = v.centered || v.snapshot;
  const stoolUp = v.stool || (!v.snapshot && !/^T02\.0[78]/.test(v.node));
  return `<rect width="1200" height="680" fill="url(#${id}-sky)"/><path d="M0 296Q191 217 372 277T798 223 1200 263V680H0Z" fill="#9aa888"/><path d="M834 313L1004 287 1200 341V680H725Z" fill="#c6c4a6"/><path d="M1060 325L939 680" stroke="#f3e2bc" stroke-width="5"/>
    <path d="M93 0V459M1093 0V458" stroke="#31584d" stroke-width="23"/><path d="M0 0H1200V71H0Z" fill="#355d51"/><path d="M0 73L129 126 248 73 369 126 488 73 608 126 726 73 847 126 966 73 1096 126 1200 73" fill="#b37b51"/><path d="M0 59H1200" stroke="#dac69f" stroke-width="5"/>
    <rect x="123" y="128" width="642" height="211" fill="#a4bca6" stroke="#31584d" stroke-width="10"/><rect x="135" y="140" width="617" height="188" fill="url(#${id}-glass)"/>
    <g fill="#cfdbc2" opacity=".22"><path d="M160 153Q240 135 217 270L278 328H164Z"/><path d="M479 144Q506 212 452 252L441 328H607Q571 242 629 141Z"/></g><path d="M439 134V337" stroke="#406359" stroke-width="12"/><path d="M146 293H746" stroke="#d3d7b9" stroke-width="4" opacity=".6"/>
    <g transform="translate(491 275)"><path d="M-54 8L-41-68H63L76 8Z" fill="#45655a"/><ellipse cx="12" cy="-68" rx="52" ry="11" fill="#aab7a0"/><path d="M-36-77H60" stroke="#d9d0ab" stroke-width="9"/><path d="M-51-43H-74M68-43H90" stroke="#35534a" stroke-width="10"/><g class="art-steam" fill="none" stroke="#e1e4c8" stroke-width="9" opacity=".6"><path d="M-13-82Q-48-111-11-144T-21-193M28-86Q66-116 28-145T33-196"/></g></g>
    <rect x="825" y="143" width="185" height="152" rx="3" fill="#e2d6b4" stroke="#637860" stroke-width="5"/><path d="M852 179H980M852 203H963M852 228H929" stroke="#688675" stroke-width="5"/><path d="M861 261L895 247 884 276Z" fill="${orange}"/>
    <path d="M19 385L867 353 1045 680H0Z" fill="url(#${id}-wood)"/><path d="M30 433L897 403M0 520L948 503M0 625L999 605" stroke="#d5b68c" stroke-width="3" opacity=".38"/><path d="M0 406L870 374" stroke="#6d6349" stroke-width="12"/>
    <g transform="translate(201 358)"><path d="M0 0H70L64 89H8Z" fill="#d8d6b3" stroke="#6a806b" stroke-width="4"/><ellipse cx="35" rx="35" ry="9" fill="#6d7051"/><path d="M65 19Q101 17 94 57L69 61" fill="none" stroke="#d8d6b3" stroke-width="10"/></g>
    <g transform="translate(91 394)"><rect width="57" height="59" rx="10" fill="#805e3e"/><rect x="12" y="-13" width="32" height="20" rx="3" fill="#d4c29b"/><path d="M14 22H43" stroke="#c3a272" stroke-width="5"/></g>
    ${!v.mealChoice ? meal(id, false, 456, 434, .74) + meal(id, true, 811, 434, .72) : meal(id, v.mealChoice === 'flatbread', centered ? 564 : 335, centered ? 491 : 559, 1, centered)}
    <g transform="translate(1021 479) rotate(${stoolUp ? 0 : 66})" data-stool="${stoolUp ? 'upright' : 'fallen'}"><path d="M-53 20L-74 136M45 20L75 136M-47 37H47" fill="none" stroke="#5a6750" stroke-width="14"/><ellipse cy="8" rx="72" ry="22" fill="#aa8d60" stroke="#5a6750" stroke-width="6"/><path d="M-40 6H46" stroke="#c4ae7f" stroke-width="3"/></g>`;
}

function hill(v: View, id: string) {
  const close = v.kind === 'rock_line' || (!v.snapshot && /^T03\.0[2-6]$/.test(v.node));
  const shadow = v.kind === 'hill_shadow' || (!v.snapshot && /^T03\.0[7-9]$/.test(v.node));
  const grasses = '<g stroke="#a9b085" stroke-width="3" fill="none"><path d="M81 610l-13-32M93 612l8-42M133 573l-5-31M1034 528l13-31M1093 614l-6-47M1137 591l16-29M948 577l-6-39M194 636l21-37"/></g>';
  if (close) return `${hills(id)}<path d="M91 680L268 266 587 111 853 181 1019 680Z" fill="#748276" stroke="#445f54" stroke-width="7"/><path d="M268 266L471 283 587 111M471 283L613 480 853 181M613 480L1019 680M471 283L315 614" fill="none" stroke="#8d9986" stroke-width="5"/>
    <path d="M341 472L432 367 403 312 496 287 536 226 636 197" fill="none" stroke="#d3c19b" stroke-width="8"/><path d="M492 442L478 389 420 313M446 302L524 265 564 225M594 217L636 197" fill="none" stroke="#304f45" stroke-width="11" stroke-linecap="round"/><path d="M744 119L836 657" stroke="#c8c4a0" stroke-width="13"/>
    <g transform="translate(652 180) rotate(11)"><rect width="47" height="357" rx="4" fill="#d9d3b0" stroke="#526c5b" stroke-width="3"/>${Array.from({ length: 19 }, (_, i) => `<path d="M0 ${12 + i * 18}H${i % 3 === 0 ? 28 : 15}" stroke="#56705f" stroke-width="2"/>`).join('')}<path d="M31 13V344" stroke="#c19559" stroke-width="2"/></g>
    ${v.points >= 1 ? `<circle cx="492" cy="442" r="12" fill="${orange}" stroke="#f0dfbb" stroke-width="4"/>` : ''}
    ${v.points >= 2 ? `<path d="M492 442L420 313" stroke="${orange}" stroke-width="5" stroke-dasharray="8 5"/><circle cx="420" cy="313" r="12" fill="${orange}" stroke="#f0dfbb" stroke-width="4"/>` : ''}
    ${v.points >= 3 ? `<path d="M420 313L636 197" stroke="${orange}" stroke-width="5" stroke-dasharray="8 5"/><circle cx="636" cy="197" r="12" fill="${orange}" stroke="#f0dfbb" stroke-width="4"/>` : ''}
    <path d="M832 680L772 564Q741 529 756 507Q770 493 787 508L825 546 839 492Q844 469 862 478L884 522 961 680Z" fill="#c49d76" stroke="#785f49" stroke-width="3"/><path d="M848 574L960 550 1015 680H870Z" fill="${orange}"/><path d="M853 572L879 650" stroke="#e2c39b" stroke-width="9"/>${grasses}`;
  return `${hills(id, shadow)}<path d="M663 680Q466 537 504 442T764 335" fill="none" stroke="#c5ba91" stroke-width="85"/><path d="M586 568L449 547M567 532L458 514M568 500L471 485M584 466L488 452" stroke="#8d9579" stroke-width="8"/>
    <path d="M198 422L223 304 345 260 431 358 389 467Z" fill="#879281" stroke="#4a6756" stroke-width="5"/><path d="M245 383L307 323 358 354M284 447L293 385" fill="none" stroke="#c5ba94" stroke-width="5"/>
    <path d="M858 298L1055 314M880 266V359M1013 276V369" stroke="#304f43" stroke-width="9"/><path d="M890 316L877 376M1007 325L1026 391" stroke="#45614d" stroke-width="8"/>
    ${shadow ? '<g data-shadow="true"><path d="M542 679L476 535 523 377Q509 348 514 334Q523 309 542 320Q566 327 558 349L580 367 632 482 618 525 593 414 575 432 569 520 609 680Z" fill="#224c3e" opacity=".78"/><path d="M401 680L437 618Q470 601 491 631L517 680M624 680L647 614Q683 609 703 643L724 680" fill="#29473d"/><path d="M428 645L476 649M649 641L694 646" stroke="#8f9a7a" stroke-width="7"/></g>' : '<g transform="translate(574 453)"><path d="M-48 0V-96M48 0V-96" stroke="#5b725a" stroke-width="7"/><path d="M-65-100H68L50-63H-64Z" fill="#c8c3a0" stroke="#53715b" stroke-width="3"/><path d="M-48-82H25" stroke="#7e977c" stroke-width="4"/></g>'}
    ${grasses}${reeds(55, 680, .66)}`;
}

function lake(v: View, id: string) {
  const offset = v.framing === 'left' ? 115 : v.framing === 'right' ? -115 : 0;
  return `<rect width="1200" height="680" fill="url(#${id}-sky)"/><g transform="translate(${offset} 0)"><circle cx="824" cy="178" r="47" fill="#f1cd94"/><ellipse cx="824" cy="217" rx="190" ry="141" fill="url(#${id}-glow)"/>
    <path d="M-140 316L97 260 263 286 417 252 640 312 850 229 982 268 1160 232 1360 276V403H-140Z" fill="#91a38c"/><path d="M-140 344L89 294 295 329 460 293 620 348 828 289 1039 324 1360 280V416H-140Z" fill="#547b68"/>
    <path d="M-140 365Q101 348 267 370T613 363 992 372 1360 342V680H-140Z" fill="url(#${id}-lake)"/><path d="M767 379H877M728 397H908M700 419H935M669 447H964M640 476H992M622 509H1020" stroke="#e8c88e" stroke-width="6" opacity=".5"/>
    <path d="M-100 402H154M211 423H323M998 393H1247M208 466H482M1019 476H1320M86 517H337" stroke="#c6d0b1" stroke-width="3" opacity=".45"/><path d="M-36 560Q162 490 279 523T478 536" fill="none" stroke="#466a50" stroke-width="26"/>
    <path d="M35 522L63 239M59 332L-13 252M63 286L155 220M62 412L173 306" fill="none" stroke="#2c5443" stroke-width="21"/><path d="M-122 236Q-35 151 53 195T205 209Q238 262 165 278T35 288-122 268Z" fill="#506e4f"/><path d="M-5 194Q48 165 91 204M84 212Q145 180 181 222" fill="none" stroke="#879476" stroke-width="10" opacity=".5"/>${reeds(1179, 635, .85)}</g>
    ${v.kind === 'lake_clear' || v.camera || v.node === 'T04.04c' ? `<path d="M0 665Q230 617 427 642T792 638 1200 615V680H0Z" fill="#3b624e"/>${reeds(58, 680, .47)}` : `<path d="M0 534L1200 498V680H0Z" fill="#4e6853"/><path d="M0 530L1200 495" stroke="#8a9a7e" stroke-width="18"/><path d="M109 679L120 428M1059 680L1048 396" stroke="#294e43" stroke-width="22"/><path d="M0 437L1200 400" stroke="#d0c4a0" stroke-width="18"/><path d="M0 449L1200 412" stroke="#536c59" stroke-width="8"/>
      <g data-reflection="sleeve-shoulder"><path d="M371 474L787 461 803 596 382 610Z" fill="url(#${id}-metal)" stroke="#294f46" stroke-width="8"/><g filter="url(#${id}-blur)" opacity=".5"><path d="M568 593L553 539 585 510 663 519 713 588Z" fill="#355f51"/><path d="M650 550L697 513 744 536 768 589 706 595Z" fill="#b48660"/><path d="M455 557L555 537 585 606 467 604Z" fill="#466457"/></g><path d="M398 488L754 478M401 498L747 488M436 592L700 584" stroke="#e3dfc2" stroke-width="2" opacity=".5"/><g fill="#3b5b4e"><circle cx="393" cy="491" r="5"/><circle cx="765" cy="480" r="5"/><circle cx="401" cy="592" r="5"/><circle cx="785" cy="580" r="5"/></g></g>
      <path d="M1069 680L1007 607 1022 569 1110 619 1168 680Z" fill="${orange}"/><path d="M1045 610L1080 589" stroke="#d4bf94" stroke-width="10"/>${reeds(53, 680, .67)}`}`;
}

function lamp(v: View) {
  const reported = v.stationAction === 'report';
  return `<g data-lamp="${v.stationAction || 'pending'}"><path d="M841 91V130" stroke="#263f39" stroke-width="8"/><path d="M805 128H877L899 165H783Z" fill="#b5bd9c" stroke="#3d5c4f" stroke-width="5"/><ellipse cx="841" cy="166" rx="56" ry="13" fill="${reported ? '#54705e' : '#e8ce8e'}"/><path d="M793 152H886" stroke="#e0d4b0" stroke-width="3"/>
    ${!reported ? '<path d="M815 177L766 253H928L865 177Z" fill="#efdc9f" opacity=".12"/>' : '<path d="M883 127l28 55-28 30-24-55Z" fill="#c7925a"/><path d="M881 151l12 28M877 183l4 7" stroke="#3b5747" stroke-width="4"/>'}${v.stationAction === 'repair' ? '<path d="M867 87H892V124H867Z" fill="#7b9780" stroke="#d4d5ad" stroke-width="3"/>' : ''}</g>`;
}

function station(v: View, id: string, dusk = false) {
  const window = v.kind === 'window_sleeve' || (!v.snapshot && /^T05\.0[5-8]$/.test(v.node));
  const offset = dusk && v.framing === 'right' ? -70 : 0;
  return `<rect width="1200" height="680" fill="url(#${id}-sky)"/><g transform="translate(${offset} 0)"><path d="M0 263L375 186 758 228 1200 173V435H0Z" fill="#8ea38a"/><path d="M0 318L282 271 538 303 864 270 1200 310V472H0Z" fill="#587c63"/>
    <path d="M0 479L1200 352V680H0Z" fill="#c8bea0"/><path d="M0 648L1200 379M0 681L1200 402" stroke="#486252" stroke-width="12"/><path d="M-85 680L1100 434M144 680L1151 452M379 680L1200 475" stroke="#8d987d" stroke-width="4"/>
    <path d="M0 0H1200V71L0 254Z" fill="#31594e"/><path d="M0 88L1200 21M0 167L1200 59" stroke="#6d8270" stroke-width="13"/><path d="M0 229L1200 63" stroke="#d6caa6" stroke-width="17"/>
    <path d="M54 192L104 184V626L54 651Z" fill="#52745e"/><path d="M296 158L334 152V513L296 530Z" fill="#64826a"/><path d="M499 128L527 124V447L499 459Z" fill="#779079"/><path d="M679 103L700 100V398L679 407Z" fill="#7e957c"/><path d="M869 77L887 74V354L869 361Z" fill="#8a9d82"/><path d="M1041 56L1054 53V318L1041 324Z" fill="#8a9d82"/><path d="M55 271L100 262M297 221L330 215M499 181L526 176M680 153L698 151" stroke="#b8c3a0" stroke-width="7"/>
    <path d="M148 413L543 353 629 437 199 540Z" fill="#b89b6c" stroke="#4d6c55" stroke-width="7"/><path d="M158 431L552 370M170 457L571 393M183 486L590 416" stroke="#d0b17d" stroke-width="5"/><path d="M188 539L184 612M561 455L591 496" stroke="#365849" stroke-width="16"/><path d="M182 521L590 430" stroke="#3b5e4c" stroke-width="10"/>
    <rect x="229" y="275" width="131" height="152" rx="3" fill="#d8d5b6" stroke="#50725e" stroke-width="7"/><path d="M244 308H345M248 332H337M248 352H326" stroke="#718d74" stroke-width="4"/><path d="M255 390L294 370 331 389" fill="none" stroke="${orange}" stroke-width="4"/>${lamp(v)}
    <path d="M785 680L784 354 1200 297V680Z" fill="#355a4f"/><path d="M799 395L1200 343V570L800 637Z" fill="url(#${id}-glass)"/><path d="M952 374V611M1125 352V579" stroke="#243f37" stroke-width="13"/><path d="M806 400L1193 349M814 607L1178 551" stroke="#c5d0ac" stroke-width="4" opacity=".55"/>
    <path d="M812 546Q867 458 920 520T1057 483 1200 480" fill="none" stroke="#d3d3b2" stroke-width="29" opacity=".13"/><g data-reflection="window-sleeve" opacity="${window ? '.34' : '.16'}" filter="url(#${id}-blur)"><path d="M845 637L846 553 897 520 956 536 999 611Z" fill="#213f37"/><path d="M929 579L1002 546 1079 605 1077 651Z" fill="#6c8171"/></g><path d="M1210 130L1110 244M1155 85L995 310" stroke="#f1e4c4" stroke-width="15" opacity=".12"/>
    ${window ? `<path d="M1119 680L973 613 986 561 1067 572 1200 628V680Z" fill="#486b5c" stroke="#284a3f" stroke-width="4"/><path d="M988 557L975 610" stroke="#c5b686" stroke-width="15"/><path d="M981 574L940 538Q919 529 910 545Q905 561 931 579L980 600Z" fill="#c4a07a" stroke="#80684f" stroke-width="3"/>` : ''}
    ${dusk ? '<circle cx="1025" cy="210" r="31" fill="#e8ca97"/><path d="M0 680L354 591 580 680Z" fill="#2a4c40" opacity=".2"/>' : ''}</g>`;
}

function portrait(v: View) {
  const tidy = v.hairChoice === 'tidy';
  const smile = v.hairChoice === 'leave';
  return `<g data-portrait="true" data-hair="${tidy ? 'tidy' : 'leave'}"><path d="M430 421L446 322Q459 292 519 284H671Q732 291 751 332L766 421Z" fill="#335b52"/><path d="M539 281L597 316 653 281 672 395H524Z" fill="#bd855b"/>
    <path d="M541 274L514 290 548 355 579 327M650 274L678 291 644 354 616 327" fill="#627c6b" stroke="#294b41" stroke-width="3"/><path d="M575 314L591 421M632 314L643 421" stroke="#d2b386" stroke-width="4"/>
    <path d="M565 220L561 284Q592 319 633 283L628 218Z" fill="#b98c68"/><path d="M565 242Q593 264 632 244V265Q591 283 565 265Z" fill="#8d7658" opacity=".4"/>
    <ellipse cx="523" cy="190" rx="17" ry="29" fill="#c5a17b" stroke="#8e795d" stroke-width="3"/><ellipse cx="673" cy="190" rx="15" ry="28" fill="#c5a17b" stroke="#8e795d" stroke-width="3"/>
    <path d="M526 160Q522 104 585 93Q650 88 672 142L663 214Q643 264 600 267Q559 268 536 222Z" fill="#d0ad85" stroke="#8d765c" stroke-width="3"/><path d="M646 143L662 177 654 222Q641 247 621 251L625 233 638 209Z" fill="#b5956e" opacity=".55"/>
    <path d="M529 180Q514 129 549 99Q573 75 620 86Q676 91 679 141L670 187 655 151 624 128Q595 151 544 145L538 186Z" fill="#2e4138"/><path d="M548 112Q584 90 624 104M572 126Q607 114 647 124" fill="none" stroke="#526353" stroke-width="5" stroke-linecap="round"/>
    ${tidy ? '<path d="M525 139Q510 130 520 113Q528 105 545 101L548 123Z" fill="#2e4138"/><path d="M520 124L540 116" stroke="#516151" stroke-width="3"/>' : '<path d="M535 139Q510 136 496 109L525 120 515 94Q542 96 551 120Z" fill="#2e4138"/><path d="M513 116L537 127" stroke="#516151" stroke-width="3"/>'}
    <path d="M547 173Q562 166 578 174M613 173Q629 167 644 174" fill="none" stroke="#485046" stroke-width="5" stroke-linecap="round"/><path d="M547 189Q562 181 578 188M615 188Q629 181 643 189" fill="none" stroke="#4a5145" stroke-width="3" stroke-linecap="round"/><ellipse cx="566" cy="187" rx="3.5" ry="5" fill="#263d35"/><ellipse cx="626" cy="186" rx="3.5" ry="5" fill="#263d35"/>
    <path d="M548 197Q563 202 578 198M614 198Q630 202 643 197" fill="none" stroke="#ae9272" stroke-width="3"/><path d="M598 185L591 216 604 218" fill="none" stroke="#a08363" stroke-width="3" stroke-linecap="round"/>
    <path d="${smile ? 'M580 236Q599 248 619 234' : 'M581 237Q598 240 615 236'}" fill="none" stroke="#836b53" stroke-width="3" stroke-linecap="round"/><path d="M558 220l7 3M553 225l9 3M641 220l6-2" stroke="#9a9273" stroke-width="3" opacity=".7"/>
    <path d="M683 333L721 348M449 352L477 345M682 377L729 393" stroke="#7f967c" stroke-width="3"/><path d="M482 326L469 416" stroke="#b08a5d" stroke-width="9"/></g>`;
}

function mirror(v: View, id: string) {
  return `<rect width="1200" height="680" fill="url(#${id}-wall)"/><rect y="55" width="1200" height="448" fill="url(#${id}-tiles)"/><path d="M0 60H1200M0 493H1200" stroke="#65856d" stroke-width="12"/>
    <rect x="76" y="87" width="191" height="277" fill="#426c5b"/><rect x="89" y="100" width="165" height="251" fill="url(#${id}-sky)"/><path d="M89 262L164 195 253 225V351H89Z" fill="#7f9f83"/><path d="M173 100V351M89 225H254" stroke="#426c5b" stroke-width="8"/><path d="M275 151L1051 481H646L273 265Z" fill="#f5dfa5" opacity=".12"/>
    <path d="M355 51H825V407H355Z" fill="#305a4e"/><path d="M374 69H807V393H374Z" fill="url(#${id}-glass)"/>
    <g clip-path="url(#${id}-mirror)"><path d="M384 69L691 393H443L374 300V69Z" fill="#d6dbc0" opacity=".2"/><path d="M445 393V82H773V393" fill="none" stroke="#90ab97" stroke-width="5" opacity=".3"/>
      ${v.wiped ? portrait(v) : `<path d="M438 423L471 291Q590 247 716 292L754 423Z" fill="#536e5e" filter="url(#${id}-blur)" opacity=".6"/><rect x="374" y="69" width="433" height="325" fill="url(#${id}-fog)"/><path d="M407 146Q510 106 758 146M406 248Q521 278 766 233M412 342Q598 313 773 354" stroke="#edf0d8" stroke-width="20" opacity=".38" fill="none"/>`}
      <path d="M754 91L792 112M774 83L805 99" stroke="#edf0d3" stroke-width="3" opacity=".45"/></g>
    <path d="M787 393L807 366V393Z" fill="#829a82"/><path d="M787 393L807 366" stroke="#d9dcc0" stroke-width="3"/><path d="M348 50H830M351 412H832" stroke="#a1b49a" stroke-width="5"/>
    <rect x="467" y="27" width="235" height="21" rx="9" fill="#3e6253"/><rect x="479" y="29" width="211" height="15" rx="7" fill="#e5d5ad"/>
    <rect x="907" y="200" width="117" height="130" rx="9" fill="#d7d9b7" stroke="#6c8970" stroke-width="4"/><rect x="922" y="213" width="84" height="72" rx="6" fill="#e3e0bf"/><path d="M931 271H993" stroke="#8caa8b" stroke-width="4"/><path d="M945 281L938 362 992 351 983 281Z" fill="#ede7c7"/>
    <path d="M65 469L1041 457 1200 577V680H0V499Z" fill="#a5b398" stroke="#63816a" stroke-width="5"/><path d="M58 510L1110 495M0 613H1200" stroke="#e4dfbe" stroke-width="5" opacity=".6"/>
    <ellipse cx="595" cy="532" rx="197" ry="62" fill="#d9dabc" stroke="#748e74" stroke-width="7"/><ellipse cx="595" cy="528" rx="154" ry="39" fill="#9caf94"/><path d="M484 525Q600 553 711 520" fill="none" stroke="#bfcbae" stroke-width="6"/>
    <path d="M591 498V451Q591 421 634 426V445H616V498Z" fill="#829c86" stroke="#375f4e" stroke-width="5"/><path d="M609 429V406H640" fill="none" stroke="#375f4e" stroke-width="8" stroke-linecap="round"/><path d="M626 447V475" stroke="#c6d2b4" stroke-width="3"/><ellipse cx="594" cy="550" rx="10" ry="4" fill="#486b55"/>
    <g fill="#789b87" opacity=".8"><ellipse cx="427" cy="475" rx="19" ry="5"/><ellipse cx="805" cy="521" rx="24" ry="6"/><ellipse cx="840" cy="540" rx="9" ry="3"/></g>
    ${v.bag ? '<path d="M166 463Q223 439 299 457L336 560 142 564Z" fill="#355b4c" stroke="#26493e" stroke-width="5"/><path d="M187 470Q185 410 251 423L277 466" fill="none" stroke="#27493e" stroke-width="15"/><path d="M160 514H311" stroke="#bfa475" stroke-width="9"/><path d="M266 452L330 593" stroke="#b39463" stroke-width="11"/>' : '<path d="M25 680L66 617 147 680Z" fill="#345849"/><path d="M43 680L77 615" stroke="#bd9c6b" stroke-width="11"/>'}
    ${v.wiped ? '<path d="M984 680L850 612 864 556 938 560 1085 680Z" fill="#476959"/><path d="M868 555L852 611" stroke="#c7b58a" stroke-width="12"/><path d="M858 569L824 547Q804 537 796 553Q793 570 811 580L854 601Z" fill="#c9a47b" stroke="#8c7356" stroke-width="3"/><path d="M767 577L832 562 850 603 788 616Z" fill="#e5dfc0"/>' : ''}`;
}

const labels: Record<SceneId, string> = {
  T01: '外勤站。折好的线路图、保温杯和充电设备，右侧窗外是河岸步道。',
  T02: '早餐摊。棚檐下的玻璃升着蒸汽，木桌伸到眼前，路边有一张凳子。',
  T03: '山坡。远山层层退开，观测岩石和阶梯小路在草地上。',
  T04: '黄昏湖岸。树和芦苇围着湖面，栏杆金属板中是模糊的袖肩反光。',
  T05: '旧车站。柱列通向站台，候车椅、检修灯和旧车窗仍在使用。',
  T06: '第三日的外勤站。行程资料放在木桌上，窗外仍是河岸。',
  T07: '旧车站洗手台。包和纸在手边，带缺角的镜子映着窗口的光。',
  T08: '傍晚的旧站长廊。柱列通向普通的天色，玻璃仍映着沿途的光。',
};

export function sceneArt(scene: SceneId, state: GameState, frame?: CapturedFrame, presentation: 'scene' | 'camera' = 'scene'): string {
  const v = viewFor(scene, state, frame, presentation === 'camera');
  const id = `art-${frame ? frame.frameId.replace(/[^a-zA-Z0-9_-]/g, '-') : `${v.scene}-${presentation}`}`;
  let drawing: string;
  if (v.scene === 'T01' || v.scene === 'T06') drawing = field(v, id);
  else if (v.scene === 'T02') drawing = breakfast(v, id);
  else if (v.scene === 'T03') drawing = hill(v, id);
  else if (v.scene === 'T04') drawing = lake(v, id);
  else if (v.scene === 'T05') drawing = station(v, id);
  else if (v.scene === 'T07') drawing = mirror(v, id);
  else if (!v.snapshot && (v.camera && v.framing === 'left' || v.node === 'T08.01a')) drawing = mirror({ ...v, bag: true, wiped: true }, id);
  else drawing = station(v, id, true);
  const label = frame ? frame.description : v.scene === 'T07' && v.wiped ? '镜面擦净后，第一次完整看见虚构主角顾远。深色外套，普通而有点疲惫的脸。' : labels[v.scene];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 680" role="img" aria-label="${escape(label)}" data-art-scene="${v.scene}" data-frame-kind="${v.kind}" data-meal="${v.mealChoice || ''}" data-hair="${v.hairChoice || ''}" data-framing="${v.framing}"><title>${escape(label)}</title>${definitions(id)}<g${v.snapshot ? ' class="art-snapshot"' : ''}>${drawing}</g><rect width="1200" height="680" fill="url(#${id}-paper)" opacity=".32" pointer-events="none"/><path d="M0 679H1200" stroke="${ink}" stroke-width="2" opacity=".3"/></svg>`;
}
