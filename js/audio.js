// 効果音とBGM。iPadで音が止まったら自動で作り直す。
export const audioCfg = { sfx: true, bgm: true };

let AC = null, sfxG = null, bgmG = null;
let broken = false, lastCT = -1, stuck = 0;
let bgmWanted = false, nextT = 0, step = 0;

function make() {
  try { if (AC) AC.close().catch(() => {}); } catch { /* 既に閉じている */ }
  AC = new (window.AudioContext || window.webkitAudioContext)();
  sfxG = AC.createGain(); sfxG.gain.value = 1; sfxG.connect(AC.destination);
  bgmG = AC.createGain(); bgmG.gain.value = 0.55; bgmG.connect(AC.destination);
  nextT = 0; broken = false; stuck = 0; lastCT = -1;
}

/** 画面にさわるたびに呼ぶ。止まっていたら再開、こわれていたら作り直す */
export function ensureAudio() {
  try {
    // 消音スイッチ（サイレントモード）でも鳴るようにする（対応しているSafariのみ）
    if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
  } catch { /* 非対応 */ }
  try {
    if (!AC || AC.state === 'closed' || broken) make();
    if (AC.state !== 'running') AC.resume().catch(() => { broken = true; });
  } catch { /* 音が出せない環境 */ }
}
for (const t of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(t, ensureAudio, true);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && AC && AC.state !== 'running') AC.resume().catch(() => { broken = true; }); });

// 見はり番：鳴っているはずなのに時計が進んでいなければ「こわれた」と判断し、次にさわったとき作り直す
setInterval(() => {
  if (!AC || document.visibilityState !== 'visible') return;
  if (AC.state === 'running') {
    if (AC.currentTime === lastCT) { if (++stuck >= 2) broken = true; } else stuck = 0;
    lastCT = AC.currentTime;
  } else if (AC.state === 'interrupted' || AC.state === 'suspended') {
    AC.resume().catch(() => { broken = true; });
  }
  schedule();
}, 1500);

function note(dest, f, t, d, type, vol) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(dest); o.start(t); o.stop(t + d + 0.02);
}

/** 効果音：[[周波数, 長さ秒], ...] を順に鳴らす */
export function tone(seq, type = 'triangle') {
  if (!audioCfg.sfx) return;
  try {
    ensureAudio();
    let t = AC.currentTime + 0.005;
    for (const [f, d] of seq) { note(sfxG, f, t, d, type, 0.16); t += d * 0.75; }
  } catch { /* 音が出せない環境 */ }
}

// ── BGM：ペンタトニックの ゆるいループ（自動演奏） ──
const HZ = (semi) => 261.63 * 2 ** (semi / 12);
const P5 = [0, 2, 4, 7, 9, 12, 14, 16, 19]; // ドレミソラ…
// 0〜8 は P5 の番号、-1 は休み。8分音符 × 64
const MEL = [
  4, -1, 5, 4, 3, -1, 2, -1, 3, -1, 4, 3, 2, -1, 0, -1,
  2, -1, 3, 2, 0, -1, 2, 3, 4, -1, -1, 3, 2, -1, -1, -1,
  4, -1, 5, 4, 3, -1, 5, -1, 6, -1, 5, 4, 3, -1, 2, -1,
  3, -1, 2, 0, 2, -1, 3, 2, 0, -1, -1, -1, 0, -1, -1, -1,
];
const BASS = [0, 0, 9, 9, 5, 5, 7, 7, 0, 0, 9, 9, 5, 7, 0, 0]; // 半小節ごとの根音（半音）
function schedule() {
  if (!bgmWanted || !audioCfg.bgm || !AC || AC.state !== 'running') return;
  const spb = 60 / 96 / 2;
  if (nextT < AC.currentTime) nextT = AC.currentTime + 0.06;
  while (nextT < AC.currentTime + 1.8) {
    const i = step % 64, m = MEL[i];
    if (m >= 0) note(bgmG, HZ(P5[m]), nextT, spb * 1.9, 'sine', 0.07);
    if (i % 4 === 0) note(bgmG, HZ(BASS[(i / 4) | 0] - 24), nextT, spb * 3.6, 'triangle', 0.09);
    if (i % 4 === 2) note(bgmG, HZ(BASS[(i / 4) | 0] - 12 + 7), nextT, spb * 1.2, 'sine', 0.035);
    nextT += spb; step++;
  }
}
export function setBgm(on) { bgmWanted = on; if (on) schedule(); }
export function refreshBgm() { if (!audioCfg.bgm && bgmG) { try { bgmG.gain.cancelScheduledValues(0); bgmG.gain.value = 0; } catch { /* */ } nextT = 0; } else if (bgmG) { bgmG.gain.value = 0.55; schedule(); } }
