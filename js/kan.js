// 案内キャラクター「カン君」。すみのしずくから生まれた、ふでの子。
const star = (cx, cy, r, fill = '#ffd93b') => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * 0.45 : r;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * q).toFixed(1) + ' ' + (cy + Math.sin(a) * q).toFixed(1);
  }
  return `<path d="${d}z" fill="${fill}" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>`;
};
const EYES = {
  normal: '<ellipse cx="38" cy="58" rx="7" ry="9" fill="#fff"/><ellipse cx="62" cy="58" rx="7" ry="9" fill="#fff"/><circle cx="39.5" cy="59.5" r="4" fill="#23222b"/><circle cx="63.5" cy="59.5" r="4" fill="#23222b"/><circle cx="41" cy="57.5" r="1.4" fill="#fff"/><circle cx="65" cy="57.5" r="1.4" fill="#fff"/>',
  happy: '<path d="M31 60q7-10 14 0M55 60q7-10 14 0" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>',
  sad: '<ellipse cx="38" cy="60" rx="6.5" ry="8" fill="#fff"/><ellipse cx="62" cy="60" rx="6.5" ry="8" fill="#fff"/><circle cx="38" cy="62.5" r="3.6" fill="#23222b"/><circle cx="62" cy="62.5" r="3.6" fill="#23222b"/><path d="M30 49l12 4M70 49l-12 4" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>',
  think: '<ellipse cx="38" cy="58" rx="7" ry="9" fill="#fff"/><ellipse cx="62" cy="58" rx="7" ry="9" fill="#fff"/><circle cx="40.5" cy="55" r="4" fill="#23222b"/><circle cx="64.5" cy="55" r="4" fill="#23222b"/>',
  // 目が星
  wow: star(37, 57, 11) + star(63, 57, 11),
  // 目玉とびだし
  shock: '<circle cx="35" cy="52" r="13" fill="#fff" stroke="#23222b" stroke-width="1.5"/><circle cx="65" cy="52" r="13" fill="#fff" stroke="#23222b" stroke-width="1.5"/><circle cx="35" cy="52" r="2.6" fill="#23222b"/><circle cx="65" cy="52" r="2.6" fill="#23222b"/><path d="M22 34l8 6M78 34l-8 6" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  // サングラス
  cool: '<path d="M24 52h52v6c0 8-5 12-12 12s-11-4-12-10h-4c-1 6-5 10-12 10s-12-4-12-12z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/><path d="M30 56l8 0M58 56l8 0" stroke="#7fd4ff" stroke-width="2.4" stroke-linecap="round"/>',
  // 号泣
  cry: '<path d="M30 56q8 7 16 0M54 56q8 7 16 0" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/><path class="tear" d="M31 61c-3 12-4 22-3 34h9c1-12 0-22 2-33z" fill="#6ec6ff"/><path class="tear" d="M69 61c3 12 4 22 3 34h-9c-1-12 0-22-2-33z" fill="#6ec6ff"/>',
  // 目が燃えている
  fire: '<path d="M38 68c-9 0-11-8-7-14 1 3 3 4 4 3-1-6 2-10 6-13 0 5 6 8 6 15 0 5-4 9-9 9z" fill="#ff5a1f"/><path d="M38 66c-4 0-6-4-4-7 2 2 4 0 4-4 3 3 5 5 5 8 0 2-2 3-5 3z" fill="#ffd93b"/><path d="M62 68c-9 0-11-8-7-14 1 3 3 4 4 3-1-6 2-10 6-13 0 5 6 8 6 15 0 5-4 9-9 9z" fill="#ff5a1f"/><path d="M62 66c-4 0-6-4-4-7 2 2 4 0 4-4 3 3 5 5 5 8 0 2-2 3-5 3z" fill="#ffd93b"/><path d="M27 46l14 5M73 46l-14 5" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  // 目が ぐるぐる（おどろきつかれ）
  dizzy: '<circle cx="37" cy="57" r="10" fill="#fff"/><circle cx="63" cy="57" r="10" fill="#fff"/><path d="M37 57m-1 0a1 1 0 1 1 2 1a3 3 0 1 1-5-2a5 5 0 1 1 8 4a7 7 0 1 1-11-5" fill="none" stroke="#23222b" stroke-width="1.6" stroke-linecap="round"/><path d="M63 57m-1 0a1 1 0 1 1 2 1a3 3 0 1 1-5-2a5 5 0 1 1 8 4a7 7 0 1 1-11-5" fill="none" stroke="#23222b" stroke-width="1.6" stroke-linecap="round"/>',
  // ねている
  sleep: '<path d="M30 59q7 5 14 0M56 59q7 5 14 0" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>',
  // 目がゼニー
  money: '<circle cx="37" cy="57" r="11" fill="#ffd93b" stroke="#b47a00" stroke-width="2"/><circle cx="63" cy="57" r="11" fill="#ffd93b" stroke="#b47a00" stroke-width="2"/><text x="37" y="62" text-anchor="middle" font-size="14" font-weight="900" fill="#8a5d00">Z</text><text x="63" y="62" text-anchor="middle" font-size="14" font-weight="900" fill="#8a5d00">Z</text>',
};
const MOUTH = {
  normal: '<path d="M44 72q6 6 12 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  happy: '<path d="M42 70q8 13 16 0z" fill="#ff7a8a" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>',
  sad: '<path d="M44 76q6-5 12 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  think: '<circle cx="51" cy="74" r="3.2" fill="none" stroke="#fff" stroke-width="2.6"/>',
  wow: '<path d="M38 71q12 20 24 0z" fill="#ff7a8a" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>',
  shock: '<ellipse cx="50" cy="82" rx="9" ry="13" fill="#7a1f2b" stroke="#fff" stroke-width="2.4"/><ellipse cx="50" cy="89" rx="5" ry="4" fill="#ff7a8a"/>',
  cool: '<path d="M43 78q8 5 15-3" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  cry: '<path d="M40 82q10-12 20 0q-10 6-20 0z" fill="#7a1f2b" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>',
  fire: '<path d="M40 78h20l-3 6H43z" fill="#fff"/><path d="M45 78v6M50 78v6M55 78v6" stroke="#34304a" stroke-width="1.2"/>',
  dizzy: '<path d="M39 78q3-5 6 0t6 0t6 0t4 0" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>',
  sleep: '<ellipse cx="50" cy="76" rx="4" ry="5" fill="#7a1f2b" stroke="#fff" stroke-width="2"/><circle class="snot" cx="62" cy="72" r="7" fill="#bfe6ff" opacity=".8" stroke="#fff" stroke-width="1.2"/>',
  money: '<path d="M40 72q10 12 20 0z" fill="#ff7a8a" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/><path d="M47 77q3 9 7 0z" fill="#ff4d6d"/>',
};
// 顔のまわりの かざり
const EXTRA = {
  wow: star(10, 30, 6) + star(92, 38, 5) + star(86, 12, 4, '#ff9aa8'),
  shock: '<path d="M8 22l10 8M4 44l12 2M92 22l-10 8M96 44l-12 2" stroke="#ff5a1f" stroke-width="3.4" stroke-linecap="round"/><path d="M82 60q5 8 0 12q-5-4 0-12z" fill="#6ec6ff"/>',
  cool: star(88, 24, 5, '#7fd4ff'),
  fire: '<path d="M50 -4c8 9 16 14 16 26H34c0-12 8-17 16-26z" fill="#ff5a1f"/><path d="M50 6c4 5 8 8 8 15H42c0-7 4-10 8-15z" fill="#ffd93b"/>',
  dizzy: '<path d="M80 54q5 8 0 12q-5-4 0-12z" fill="#6ec6ff"/><path d="M18 22q4-6 8 0t8 0" fill="none" stroke="#ffd93b" stroke-width="2.4" stroke-linecap="round"/>' + star(86, 22, 5),
  sleep: '<g class="zzz" fill="#7fb6ff" font-weight="900"><text x="72" y="30" font-size="13">z</text><text x="80" y="18" font-size="17">z</text><text x="89" y="4" font-size="22">Z</text></g><path d="M30 34c6-12 34-12 40 0c-10-6-30-6-40 0z" fill="#7fb6ff"/><circle cx="72" cy="26" r="5" fill="#fff"/>',
  money: '<circle cx="12" cy="26" r="6" fill="#ffd93b" stroke="#b47a00" stroke-width="1.5"/><circle cx="90" cy="34" r="5" fill="#ffd93b" stroke="#b47a00" stroke-width="1.5"/><circle cx="84" cy="10" r="4" fill="#ffd93b" stroke="#b47a00" stroke-width="1.5"/>',
};
export function kanSvg(mood = 'normal') {
  const m = EYES[mood] ? mood : 'normal';
  return `<svg viewBox="0 -8 100 116" class="kansvg kan-${m}" aria-hidden="true">
    <ellipse cx="50" cy="103" rx="24" ry="4" fill="rgba(0,0,0,.12)"/>
    <g class="kanbody">
    <path d="M50 6c4 9 13 13 13 22H37c0-9 9-13 13-22z" fill="#ff8a3d"/>
    ${EXTRA[m] || ''}
    <rect x="35" y="25" width="30" height="8" rx="4" fill="#f6b100"/>
    <path d="M50 30c22 0 36 16 36 37 0 20-15 33-36 33S14 87 14 67c0-21 14-37 36-37z" fill="#34304a"/>
    <path d="M24 56c3-9 9-15 17-18" fill="none" stroke="#5c5780" stroke-width="4" stroke-linecap="round"/>
    <circle cx="26" cy="74" r="5.5" fill="#ff9aa8" opacity=".75"/><circle cx="74" cy="74" r="5.5" fill="#ff9aa8" opacity=".75"/>
    ${EYES[m]}${MOUTH[m]}
    <ellipse cx="38" cy="100" rx="8" ry="4.5" fill="#34304a"/><ellipse cx="62" cy="100" rx="8" ry="4.5" fill="#34304a"/>
    </g>
  </svg>`;
}
/** ふきだしつきのカン君 */
export function kanSay(text, mood = 'normal', cls = '') {
  return `<div class="kan ${cls}"><div class="kanchar">${kanSvg(mood)}</div><div class="kanbub"><b>カン君</b><span>${text}</span></div></div>`;
}
/** 画面に大きく とびだす カン君（すごいことが おきたとき） */
export function kanCutIn(text, mood = 'wow') {
  const el = document.createElement('div');
  el.className = 'cutin cut-' + mood;
  el.innerHTML = `<div class="cutband"><div class="cutkan">${kanSvg(mood)}</div><div class="cuttext">${text}</div></div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2300);
}
