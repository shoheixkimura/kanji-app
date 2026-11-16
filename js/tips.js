// 書き順のきまり。画のかたちと位置から、その字にあてはまるアドバイスを作る。
// targets は matcher.samplePath の結果の配列（109×109 空間）。

function info(t) {
  const a = t.pts[0], b = t.pts[t.pts.length - 1];
  const dx = b[0] - a[0], dy = b[1] - a[1], chord = Math.hypot(dx, dy);
  const straight = chord / t.len > 0.88;
  let type = 'O';
  if (straight && dx > 0 && Math.abs(dx) > 2.5 * Math.abs(dy)) type = 'H';       // よこ
  else if (straight && dy > 0 && Math.abs(dy) > 2.5 * Math.abs(dx)) type = 'V';  // たて
  else if (dy > 4 && dx < -4 && t.len > 14) type = 'L';                          // 左はらい
  else if (dy > 4 && dx > 4 && t.len > 14) type = 'R';                           // 右はらい
  return { type, a, b, c: t.c, len: t.len };
}
/** よこ画 h と たて画 v が「まじわる」（つきぬける）か */
function crosses(h, v) {
  const hy = (h.a[1] + h.b[1]) / 2, vx = (v.a[0] + v.b[0]) / 2;
  return vx > h.a[0] + 3 && vx < h.b[0] - 3 && hy > v.a[1] + 3 && hy < v.b[1] - 3;
}
/** たて画 v の下のはしが、よこ画 h にくっついているか（王・土の いちばん下） */
function sitsOn(h, v) {
  const hy = (h.a[1] + h.b[1]) / 2, vx = (v.a[0] + v.b[0]) / 2;
  return vx > h.a[0] + 3 && vx < h.b[0] - 3 && Math.abs(v.b[1] - hy) <= 4;
}

/** その字の「ワンポイント」。とくべつな順番の字を優先して教える */
export function kanjiTip(targets) {
  const S = targets.map(info);
  let normal = null, bottom = null;
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    const a = S[i], b = S[j];
    if (a.type === 'V' && b.type === 'H' && j - i <= 2 && crosses(b, a)) {
      return { special: true, strokes: [i, j], text: `この字は とくべつ！ ${i + 1}画目の「たて」を 先に かいてから、${j + 1}画目の「よこ」。田や 生の なかまは たてが 先だよ。` };
    }
    if (!normal && a.type === 'H' && b.type === 'V' && crosses(a, b)) normal = [i, j];
    // 王・土のように、よこをつらぬいた「たて」のすぐあとに、下の「よこ」でしめる形だけ
    if (!bottom && a.type === 'V' && b.type === 'H' && j === i + 1 && sitsOn(b, a) && S.slice(0, i).some((h) => h.type === 'H' && crosses(h, a))) bottom = [i, j];
  }
  if (bottom) return { strokes: bottom, text: `下の「よこ」は さいご！ ${bottom[0] + 1}画目の「たて」を かいてから、${bottom[1] + 1}画目で ふたを するよ。（王・土と おなじ）` };
  if (normal) return { strokes: normal, text: `「よこ」と「たて」が まじわる ときは、よこが 先！ ${normal[0] + 1}画目が よこ、${normal[1] + 1}画目が たて。（十・木と おなじ）` };
  for (let i = 0; i < S.length - 1; i++) {
    if (S[i].type === 'L' && S[i + 1].type === 'R') return { strokes: [i, i + 1], text: `「左はらい」が 先、「右はらい」が あと！ ${i + 1}画目 → ${i + 2}画目。（人・文と おなじ）` };
  }
  return { strokes: [], text: 'きほんは「上から 下へ」「左から 右へ」。ひとつずつ じゅんばんに かこう。' };
}

/** 書き順をまちがえたときのアドバイス。want=本当の画, wrote=書いてしまった画（番号） */
export function mistakeTip(targets, want, wrote) {
  const S = targets.map(info), a = S[want], b = S[wrote];
  if (a.type === 'H' && b.type === 'V' && crosses(a, b)) return '「よこ」と「たて」が まじわる ときは、よこが 先だよ！';
  if (a.type === 'V' && b.type === 'H' && crosses(b, a)) return 'この字は とくべつ。「たて」を 先に かいてから「よこ」！（田や 生の なかま）';
  if (a.type === 'V' && b.type === 'H' && sitsOn(b, a)) return '下の「よこ」は さいご。先に「たて」を かこう！';
  if (a.type === 'L' && b.type === 'R') return '「左はらい」が 先、「右はらい」が あとだよ！';
  if (a.c[1] < b.c[1] - 8) return '「上から 下へ」かくよ。上の 画が 先！';
  if (a.c[0] < b.c[0] - 8) return '「左から 右へ」かくよ。左の 画が 先！';
  if (Math.abs(a.c[0] - 54.5) < 8 && Math.abs(b.c[0] - 54.5) > 14) return 'まん中を 先に かいてから、左 → 右だよ。（小・水と おなじ）';
  return 'じゅんばんが ちがうよ。オレンジの 線が つぎの 画！';
}
