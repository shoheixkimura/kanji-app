// 筆画の照合。座標はすべて KanjiVG の 109×109 空間。
const NS = 'http://www.w3.org/2000/svg';
const N = 24;
let probe = null;

/** KanjiVG の path(d) を等間隔の点列にする */
export function samplePath(d) {
  if (!probe) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 109 109');
    svg.style.cssText = 'position:absolute;left:-9999px;top:0;width:109px;height:109px;visibility:hidden';
    probe = document.createElementNS(NS, 'path');
    svg.appendChild(probe);
    document.body.appendChild(svg);
  }
  probe.setAttribute('d', d);
  const len = probe.getTotalLength();
  const pts = [];
  for (let i = 0; i < N; i++) {
    const p = probe.getPointAtLength((len * i) / (N - 1));
    pts.push([p.x, p.y]);
  }
  return { pts, len, c: centroid(pts) };
}

export function pathLen(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
}

function centroid(pts) {
  let x = 0, y = 0;
  for (const p of pts) { x += p[0]; y += p[1]; }
  return [x / pts.length, y / pts.length];
}

function resample(pts, n) {
  if (pts.length === 1) return Array.from({ length: n }, () => pts[0]);
  const total = pathLen(pts);
  if (total === 0) return Array.from({ length: n }, () => pts[0]);
  const out = [pts[0]];
  const step = total / (n - 1);
  let acc = 0, target = step;
  for (let i = 1; i < pts.length && out.length < n - 1; i++) {
    const a = pts[i - 1], b = pts[i];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (seg > 0 && acc + seg >= target && out.length < n - 1) {
      const t = (target - acc) / seg;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      target += step;
    }
    acc += seg;
  }
  while (out.length < n) out.push(pts[pts.length - 1]);
  return out;
}

/** 手ぶれで長さが水増しされないよう、近すぎる点を間引く */
function thin(pts, gap = 2) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const l = out[out.length - 1];
    if (Math.hypot(pts[i][0] - l[0], pts[i][1] - l[1]) >= gap) out.push(pts[i]);
  }
  const e = pts[pts.length - 1], l = out[out.length - 1];
  if (e !== l && Math.hypot(e[0] - l[0], e[1] - l[1]) >= gap / 2) out.push(e);
  return out;
}

function shapeDiff(u, cu, t, ct, reverse) {
  let s = 0;
  for (let i = 0; i < N; i++) {
    const p = u[reverse ? N - 1 - i : i];
    s += Math.hypot(p[0] - cu[0] - (t[i][0] - ct[0]), p[1] - cu[1] - (t[i][1] - ct[1]));
  }
  return s / N;
}

/**
 * 1画を判定する。
 * raw: ユーザーの点列, tgt: samplePath の結果, drift: これまでの書き位置のずれ, loose: なぞり練習用のゆるめ判定
 * 戻り値 { ok, reversed, off:[dx,dy] }
 */
export function judge(raw, tgt, drift = [0, 0], loose = false) {
  const k = loose ? 1.35 : 1;
  raw = thin(raw);
  const lenU = pathLen(raw);
  const u = resample(raw, N);
  const cu = centroid(u);
  const off = [cu[0] - tgt.c[0], cu[1] - tgt.c[1]];
  const offD = Math.hypot(off[0] - drift[0], off[1] - drift[1]);
  const res = { ok: false, reversed: false, off };

  if (tgt.len < 12) { // 点などの短い画：位置と長さだけ見る
    res.ok = offD <= 20 * k && lenU <= 34;
    return res;
  }
  if (offD > 23 * k) return res;
  if (lenU < 0.4 * tgt.len || lenU > 2.2 * tgt.len + 8) return res;

  const lim = Math.min(16, Math.max(6, 4 + 0.15 * tgt.len)) * k;
  const fwd = shapeDiff(u, cu, tgt.pts, tgt.c, false);

  // 始点→終点の向き
  const t0 = tgt.pts[0], t1 = tgt.pts[N - 1];
  const tv = [t1[0] - t0[0], t1[1] - t0[1]], uv = [u[N - 1][0] - u[0][0], u[N - 1][1] - u[0][1]];
  const tl = Math.hypot(tv[0], tv[1]), ul = Math.hypot(uv[0], uv[1]);
  let dirOk = true;
  if (tl > 6) dirOk = ul > 0 && (tv[0] * uv[0] + tv[1] * uv[1]) / (tl * ul) >= 0.45;

  if (fwd <= lim && dirOk) { res.ok = true; return res; }
  if (shapeDiff(u, cu, tgt.pts, tgt.c, true) <= lim) res.reversed = true;
  return res;
}

/**
 * 「あとで採点」用：書いた1画が 手本の1画に どれくらい 近いか。
 * 合わなければ null、合えば { cost（小さいほど近い）, reversed（向きが ぎゃく）, off }
 * 合う・合わないの きじゅんは judge と おなじ（向きぎゃくも「合う」に ふくめる）
 */
export function pairCost(raw, tgt, drift = [0, 0]) {
  raw = thin(raw);
  const lenU = pathLen(raw);
  const u = resample(raw, N);
  const cu = centroid(u);
  const off = [cu[0] - tgt.c[0], cu[1] - tgt.c[1]];
  const offD = Math.hypot(off[0] - drift[0], off[1] - drift[1]);
  if (tgt.len < 12) return offD <= 20 && lenU <= 34 ? { cost: offD / 20, reversed: false, off } : null;
  if (offD > 23) return null;
  if (lenU < 0.4 * tgt.len || lenU > 2.2 * tgt.len + 8) return null;
  const lim = Math.min(16, Math.max(6, 4 + 0.15 * tgt.len));
  const fwd = shapeDiff(u, cu, tgt.pts, tgt.c, false);
  const t0 = tgt.pts[0], t1 = tgt.pts[N - 1];
  const tv = [t1[0] - t0[0], t1[1] - t0[1]], uv = [u[N - 1][0] - u[0][0], u[N - 1][1] - u[0][1]];
  const tl = Math.hypot(tv[0], tv[1]), ul = Math.hypot(uv[0], uv[1]);
  let dirOk = true;
  if (tl > 6) dirOk = ul > 0 && (tv[0] * uv[0] + tv[1] * uv[1]) / (tl * ul) >= 0.45;
  if (fwd <= lim && dirOk) return { cost: fwd / lim + offD / 23, reversed: false, off };
  const rev = shapeDiff(u, cu, tgt.pts, tgt.c, true);
  if (rev <= lim) return { cost: rev / lim + offD / 23 + 0.3, reversed: true, off };
  return null;
}
