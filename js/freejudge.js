// 中学以上の字の「あとで採点」。書いた順番は 気にせず、書いた画と 手本の画を 1対1に 組み合わせてから、
// 形・画数・書き順・向きを まとめて 判定する。小学校の字の 判定（1画ずつ）は matcher.judge のまま 変えない。
import { pairCost } from './matcher.js';

const BIG = 1e6;

/** 画数の かんたんな わく（書いた点ぜんぶ）の まん中 */
function boxMid(list) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const pts of list) for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [(x0 + x1) / 2, (y0 + y1) / 2];
}

/** いちばん 合計コストが 小さい 組み合わせ（ハンガリー法）。a[i][j] は 正方行列 */
function hungarian(a) {
  const n = a.length, u = new Array(n + 1).fill(0), v = new Array(n + 1).fill(0), p = new Array(n + 1).fill(0), way = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0;
    const minv = new Array(n + 1).fill(Infinity), used = new Array(n + 1).fill(false);
    do {
      used[j0] = true; const i0 = p[j0]; let delta = Infinity, j1 = 0;
      for (let j = 1; j <= n; j++) if (!used[j]) {
        const cur = a[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= n; j++) if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const row = new Array(n).fill(-1);
  for (let j = 1; j <= n; j++) if (p[j]) row[p[j] - 1] = j - 1;
  return row;
}

/**
 * written: 書いた画（点列）の 配列（書いた順）、targets: 手本（samplePath の結果）
 * 戻り値:
 *  match[i] = 書いた i画目が 手本の 何画目か（合わなければ -1）、rev[i] = 向きが ぎゃく
 *  countOk（画数が 同じ）、shapeOk（ぜんぶ 組み合わせられた）、
 *  order = 書き順が ちがう 書いた画の 番号、reversed = 向きが ぎゃくの 番号、
 *  first = さいしょの 書き順ちがい { want: 本当は 書くべき 画, wrote: 書いてしまった 画 }
 */
export function freeJudge(written, targets) {
  const n = written.length, m = targets.length, size = Math.max(n, m);
  const res = { match: new Array(n).fill(-1), rev: new Array(n).fill(false), countOk: n === m, shapeOk: false, order: [], reversed: [], first: null };
  if (!n) return res;
  const wm = boxMid(written), tm = boxMid(targets.map((t) => t.pts));
  let drift = [wm[0] - tm[0], wm[1] - tm[1]];
  let best = null;
  for (let pass = 0; pass < 2; pass++) {
    const C = written.map((w) => targets.map((t) => pairCost(w, t, drift)));
    const a = Array.from({ length: size }, (_, i) => Array.from({ length: size }, (_, j) => (i < n && j < m && C[i][j] ? C[i][j].cost : BIG)));
    const row = hungarian(a);
    best = { C, row };
    // 組み合わせた 画から ずれを はかり直して、もう1回
    const offs = row.slice(0, n).map((j, i) => (j < m && C[i][j] ? C[i][j].off : null)).filter(Boolean);
    if (!offs.length) break;
    drift = [offs.reduce((s, o) => s + o[0], 0) / offs.length, offs.reduce((s, o) => s + o[1], 0) / offs.length];
  }
  const { C, row } = best;
  for (let i = 0; i < n; i++) {
    const j = row[i];
    if (j >= 0 && j < m && C[i][j]) { res.match[i] = j; res.rev[i] = C[i][j].reversed; }
  }
  res.shapeOk = res.countOk && res.match.every((j) => j >= 0);
  if (res.shapeOk) {
    for (let i = 0; i < n; i++) {
      if (res.match[i] !== i) { res.order.push(i); if (!res.first) res.first = { want: i, wrote: res.match[i] }; }
      if (res.rev[i]) res.reversed.push(i);
    }
  }
  return res;
}
