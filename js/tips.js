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

/** 2つの画が どこかで まじわるか（はしが ふれるだけは のぞく） */
function touches(p, q) {
  const X = (a, b, c, d) => {
    const d1 = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const d2 = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
    const d3 = (d[0] - c[0]) * (a[1] - c[1]) - (d[1] - c[1]) * (a[0] - c[0]);
    const d4 = (d[0] - c[0]) * (b[1] - c[1]) - (d[1] - c[1]) * (b[0] - c[0]);
    return d1 * d2 < 0 && d3 * d4 < 0;
  };
  const P = p.pts.slice(2, -2), Q = q.pts.slice(2, -2);
  for (let i = 1; i < P.length; i++) for (let j = 1; j < Q.length; j++) if (X(P[i - 1], P[i], Q[j - 1], Q[j])) return true;
  return false;
}
/** 「つらぬく」画：さいごの画で、ほかの 2画以上と まじわる たて／よこ */
function piercing(targets, S, i) {
  if (i !== S.length - 1 || S.length < 3 || !['V', 'H'].includes(S[i].type)) return false;
  return targets.filter((t, j) => j !== i && touches(t, targets[i])).length >= 2;
}

/** たて・よこの 書き順の「セオリー」。まちがえたら カン君が 説明する */
export const THEORIES = {
  yoko: { no: '①', name: 'まじわったら よこが先', ex: '十・木・土・七・大・寺', text: '「よこ」と「たて」が 十字に まじわる ときは、ほとんど「よこ」が 先！ いちばん よく出る きまりだよ。' },
  tate: { no: '②', name: '田の なかまは たてが先', ex: '田・由・男・町・画', text: 'まじわっていても、「田」の なかまなど、たてを 先に かく とくべつな字が あるよ。この字は「とくべつ組」と おぼえよう！' },
  shime: { no: '③', name: '下で しめる よこは さいご', ex: '王・土・上・正', text: 'いちばん 下で ふたを する「よこ」は、たてを かいた あと。さいごに しめよう！' },
  tsuraT: { no: '④', name: 'つらぬく たては さいご', ex: '中・車・申・半', text: '字の 上から 下まで つきぬける「たて」は、ほかを ぜんぶ かいてから さいごに かくよ。' },
  tsuraY: { no: '⑤', name: 'つらぬく よこは さいご', ex: '女・子・安・字', text: '字を よこに つきぬける「よこ」は、さいごに かくよ。' },
};
// セオリーの お手本（40×40）。[画, 先=1／あと=2／ほか=0]
const FIG = {
  yoko: [['M6 17H34', 1], ['M20 5V36', 2]],
  tate: [['M8 6V34', 0], ['M8 6H32V34', 0], ['M20 6V34', 1], ['M8 20H32', 2], ['M8 34H32', 0]],
  shime: [['M8 7H32', 0], ['M10 20H30', 0], ['M20 7V34', 1], ['M5 34H35', 2]],
  tsuraT: [['M9 11V27', 0], ['M9 11H31V27', 0], ['M9 26H31', 1], ['M20 3V38', 2]],
  tsuraY: [['M18 4L11 21Q20 27 31 36', 0], ['M27 10Q24 26 8 36', 1], ['M4 21H36', 2]],
};
/** セオリーの 図（オレンジ＝先、青＝後） */
export function theoryFig(id) {
  const f = FIG[id]; if (!f) return '';
  let n = 0;
  return `<svg viewBox="0 0 40 40" class="thfig" aria-hidden="true">${f.map(([d, k]) => `<path d="${d}" class="tf${k}"/>`).join('')}${f.map(([d, k]) => {
    n++; if (!k) return '';
    const m = d.match(/M([\d.]+) ([\d.]+)/), x = Math.min(35, Math.max(5, +m[1])), y = Math.min(35, Math.max(5, +m[2]));
    return `<circle cx="${x}" cy="${y}" r="4.2" class="tn${k}"/><text x="${x}" y="${y + 2.4}" class="tt">${k === 1 ? '先' : '後'}</text>`;
  }).join('')}</svg>`;
}

/** 書き順まちがいが どの セオリーか（want=本当の画, wrote=書いてしまった画）。あてはまらなければ null */
export function theoryOf(targets, want, wrote) {
  const S = targets.map(info), a = S[want], b = S[wrote];
  if (piercing(targets, S, wrote)) return b.type === 'V' ? 'tsuraT' : 'tsuraY';
  if (a.type === 'H' && b.type === 'V' && crosses(a, b)) return 'yoko';
  if (a.type === 'V' && b.type === 'H' && crosses(b, a)) return 'tate';
  if (a.type === 'V' && b.type === 'H' && sitsOn(b, a)) return 'shime';
  return null;
}

/** その字の「ワンポイント」。とくべつな順番の字を優先して教える */
export function kanjiTip(targets) {
  const S = targets.map(info);
  let normal = null, bottom = null;
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    const a = S[i], b = S[j];
    if (a.type === 'V' && b.type === 'H' && j - i <= 2 && crosses(b, a)) {
      return { special: true, th: 'tate', strokes: [i, j], text: `セオリー②「田の 中は たてが先」！ ${i + 1}画目の「たて」を 先に かいてから、${j + 1}画目の「よこ」。（田・由・男と おなじ とくべつ組）` };
    }
    if (!normal && a.type === 'H' && b.type === 'V' && crosses(a, b)) normal = [i, j];
    // 王・土のように、よこをつらぬいた「たて」のすぐあとに、下の「よこ」でしめる形だけ
    if (!bottom && a.type === 'V' && b.type === 'H' && j === i + 1 && sitsOn(b, a) && S.slice(0, i).some((h) => h.type === 'H' && crosses(h, a))) bottom = [i, j];
  }
  const last = S.length - 1;
  if (piercing(targets, S, last)) {
    const T = THEORIES[S[last].type === 'V' ? 'tsuraT' : 'tsuraY'];
    return { th: S[last].type === 'V' ? 'tsuraT' : 'tsuraY', strokes: [last - 1, last], text: `セオリー${T.no}「${T.name}」！ ${last + 1}画目の「${S[last].type === 'V' ? 'たて' : 'よこ'}」は さいごに かくよ。（${T.ex.split('・').slice(0, 2).join('・')}と おなじ）` };
  }
  if (bottom) return { th: 'shime', strokes: bottom, text: `セオリー③「下で しめる よこは さいご」！ ${bottom[0] + 1}画目の「たて」を かいてから、${bottom[1] + 1}画目で ふたを するよ。（王・土と おなじ）` };
  if (normal) return { th: 'yoko', strokes: normal, text: `セオリー①「まじわったら よこが先」！ ${normal[0] + 1}画目が よこ、${normal[1] + 1}画目が たて。（十・木と おなじ）` };
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
