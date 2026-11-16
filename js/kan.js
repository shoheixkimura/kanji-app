// 案内キャラクター「カン君」。すみのしずくから生まれた、ふでの子。
const EYES = {
  normal: '<ellipse cx="38" cy="58" rx="7" ry="9" fill="#fff"/><ellipse cx="62" cy="58" rx="7" ry="9" fill="#fff"/><circle cx="39.5" cy="59.5" r="4" fill="#23222b"/><circle cx="63.5" cy="59.5" r="4" fill="#23222b"/><circle cx="41" cy="57.5" r="1.4" fill="#fff"/><circle cx="65" cy="57.5" r="1.4" fill="#fff"/>',
  happy: '<path d="M31 60q7-10 14 0M55 60q7-10 14 0" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>',
  sad: '<ellipse cx="38" cy="60" rx="6.5" ry="8" fill="#fff"/><ellipse cx="62" cy="60" rx="6.5" ry="8" fill="#fff"/><circle cx="38" cy="62.5" r="3.6" fill="#23222b"/><circle cx="62" cy="62.5" r="3.6" fill="#23222b"/><path d="M30 49l12 4M70 49l-12 4" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>',
  think: '<ellipse cx="38" cy="58" rx="7" ry="9" fill="#fff"/><ellipse cx="62" cy="58" rx="7" ry="9" fill="#fff"/><circle cx="40.5" cy="55" r="4" fill="#23222b"/><circle cx="64.5" cy="55" r="4" fill="#23222b"/>',
};
const MOUTH = {
  normal: '<path d="M44 72q6 6 12 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  happy: '<path d="M42 70q8 13 16 0z" fill="#ff7a8a" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>',
  sad: '<path d="M44 76q6-5 12 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  think: '<circle cx="51" cy="74" r="3.2" fill="none" stroke="#fff" stroke-width="2.6"/>',
};
export function kanSvg(mood = 'normal') {
  const m = EYES[mood] ? mood : 'normal';
  return `<svg viewBox="0 0 100 108" class="kansvg kan-${m}" aria-hidden="true">
    <ellipse cx="50" cy="103" rx="24" ry="4" fill="rgba(0,0,0,.12)"/>
    <path d="M50 6c4 9 13 13 13 22H37c0-9 9-13 13-22z" fill="#ff8a3d"/>
    <rect x="35" y="25" width="30" height="8" rx="4" fill="#f6b100"/>
    <path d="M50 30c22 0 36 16 36 37 0 20-15 33-36 33S14 87 14 67c0-21 14-37 36-37z" fill="#34304a"/>
    <path d="M24 56c3-9 9-15 17-18" fill="none" stroke="#5c5780" stroke-width="4" stroke-linecap="round"/>
    <circle cx="28" cy="72" r="5.5" fill="#ff9aa8" opacity=".75"/><circle cx="72" cy="72" r="5.5" fill="#ff9aa8" opacity=".75"/>
    ${EYES[m]}${MOUTH[m]}
    <ellipse cx="38" cy="100" rx="8" ry="4.5" fill="#34304a"/><ellipse cx="62" cy="100" rx="8" ry="4.5" fill="#34304a"/>
  </svg>`;
}
/** ふきだしつきのカン君 */
export function kanSay(text, mood = 'normal', cls = '') {
  return `<div class="kan ${cls}"><div class="kanchar">${kanSvg(mood)}</div><div class="kanbub"><b>カン君</b><span>${text}</span></div></div>`;
}
