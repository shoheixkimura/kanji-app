import { samplePath, judge, pathLen } from './matcher.js';

// ───────── 基本設定 ─────────
const LS_KEY = 'kanjiapp.v1';
const INTERVALS = [1, 3, 7, 14, 30, 60, 120]; // 合格が続くたびに伸びる復習間隔（日）
const MASTER_LV = 4;                          // 4回連続合格で「マスター」
const GRADES = [4, 5, 6];
const AVATARS = ['🦊', '🐼', '🐧', '🐯', '🐰', '🐨', '🦁', '🐸', '🐙', '🦄', '🐳', '🦖'];
const NS = 'http://www.w3.org/2000/svg';

const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ───────── 日付 ─────────
const dbgDate = new URLSearchParams(location.search).get('date');
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => dbgDate || fmt(new Date());
const parseD = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return fmt(d); };
const dayDiff = (a, b) => Math.round((parseD(a) - parseD(b)) / 86400000);

// ───────── 保存 ─────────
let DB = loadDB();
let P = null; // 現在のプロフィール
function loadDB() {
  try {
    const d = JSON.parse(localStorage.getItem(LS_KEY));
    if (d && Array.isArray(d.profiles)) return d;
  } catch { /* 初回 */ }
  return { v: 1, profiles: [], current: null, sound: true, pen: 'auto' };
}
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(DB)); }
  catch (e) { alert('きろくの ほぞんに しっぱいしました: ' + e.message); }
}
function newProfile(name, avatar, grades) {
  return {
    id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name, avatar, grades, daily: 10, limit: 10,
    cards: {}, log: {}, trophies: {}, total: 0, session: null,
  };
}

// ───────── 漢字データ ─────────
const KD = {}; // 字 → {k,y,ex,s,g}
const GL = {}; // 学年 → [字]
async function loadData() {
  await Promise.all(GRADES.map(async (g) => {
    const list = await (await fetch(`data/g${g}.json`)).json();
    GL[g] = list.map((o) => o.k);
    for (const o of list) { o.g = g; KD[o.k] = o; }
  }));
}

// ───────── 学習ロジック（忘却曲線） ─────────
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function pool(p) { return [...p.grades].sort().flatMap((g) => GL[g] || []); }
function dueList(p) {
  const t = today();
  // 期限の古い順、同じ日なら不合格だった字（lv0）を先に
  return pool(p).filter((k) => p.cards[k] && p.cards[k].due <= t)
    .sort((a, b) => p.cards[a].due.localeCompare(p.cards[b].due) || p.cards[a].lv - p.cards[b].lv);
}
function freshList(p) { return pool(p).filter((k) => !p.cards[k]); }

/** きょうの出題：復習を優先しつつ、新しい字も最低2字は入れる */
function buildQueue(p) {
  const n = p.daily, due = dueList(p), fresh = freshList(p);
  const nNew = Math.min(fresh.length, Math.max(n - due.length, Math.min(2, n)));
  return shuffle(due.slice(0, n - nNew)).concat(fresh.slice(0, nNew));
}
/** 「もっとやる」：新しい字 → 残りの復習 → 近日中に復習予定の字 */
function buildExtra(p, n = 5) {
  const done = new Set(Object.keys(p.cards).filter((k) => p.cards[k].h.some((h) => h[0] === today())));
  let q = freshList(p).slice(0, n);
  if (q.length < n) q = q.concat(dueList(p).filter((k) => !done.has(k)).slice(0, n - q.length));
  if (q.length < n) {
    const soon = pool(p).filter((k) => p.cards[k] && !done.has(k) && !q.includes(k))
      .sort((a, b) => (p.cards[a].due < p.cards[b].due ? -1 : 1));
    q = q.concat(soon.slice(0, n - q.length));
  }
  return q;
}
function record(k, ok, ms, miss) {
  const t = today();
  const c = P.cards[k] || (P.cards[k] = { lv: 0, due: t, n: 0, okc: 0, best: null, h: [] });
  c.n++;
  let iv = 1;
  if (ok) {
    iv = INTERVALS[Math.min(c.lv, INTERVALS.length - 1)];
    c.lv++; c.okc++;
    if (c.best == null || ms < c.best) c.best = ms;
  } else {
    c.lv = 0; // 不合格 → 翌日もう一度、間隔は最初から
  }
  c.due = addDays(t, iv);
  c.h.push([t, ok ? 1 : 0, ms, miss]);
  if (c.h.length > 12) c.h.shift();
  const L = P.log[t] || (P.log[t] = { n: 0, ok: 0 });
  L.n++; if (ok) L.ok++;
  P.total = (P.total || 0) + 1;
  save();
  return iv;
}
function streak(p) {
  let d = today();
  if (!(p.log[d] && p.log[d].fin)) d = addDays(d, -1);
  let n = 0;
  while (p.log[d] && p.log[d].fin) { n++; d = addDays(d, -1); }
  return n;
}
function stats(p) {
  const s = { passed: 0, mastered: 0, best: Infinity, total: p.total || 0, streak: streak(p), g: {} };
  for (const g of GRADES) s.g[g] = { passed: 0, mastered: 0, n: (GL[g] || []).length };
  for (const [k, c] of Object.entries(p.cards)) {
    const g = KD[k] && KD[k].g; if (!g) continue;
    if (c.okc > 0) { s.passed++; s.g[g].passed++; }
    if (c.lv >= MASTER_LV) { s.mastered++; s.g[g].mastered++; }
    if (c.best != null && c.best < s.best) s.best = c.best;
  }
  return s;
}

// ───────── トロフィー ─────────
const TROPHIES = [
  { id: 'first', icon: '🌱', name: 'はじめの一歩', desc: 'はじめて ごうかくする', ok: (s) => s.passed >= 1 },
  { id: 'p10', icon: '🥉', name: '10字 ごうかく', desc: '10字 ごうかくする', ok: (s) => s.passed >= 10 },
  { id: 'p50', icon: '🥈', name: '50字 ごうかく', desc: '50字 ごうかくする', ok: (s) => s.passed >= 50 },
  { id: 'p100', icon: '🥇', name: '100字 ごうかく', desc: '100字 ごうかくする', ok: (s) => s.passed >= 100 },
  { id: 'p200', icon: '👑', name: '200字 ごうかく', desc: '200字 ごうかくする', ok: (s) => s.passed >= 200 },
  { id: 'm10', icon: '⭐', name: 'スター10', desc: '★マスターを 10字', ok: (s) => s.mastered >= 10 },
  { id: 'm50', icon: '🌟', name: 'スター50', desc: '★マスターを 50字', ok: (s) => s.mastered >= 50 },
  { id: 'm100', icon: '💫', name: 'スター100', desc: '★マスターを 100字', ok: (s) => s.mastered >= 100 },
  { id: 'fast5', icon: '⚡', name: 'はやがき名人', desc: '5びょう以内で ごうかく', ok: (s) => s.best <= 5000 },
  { id: 'fast3', icon: '🚀', name: 'いなずま', desc: '3びょう以内で ごうかく', ok: (s) => s.best <= 3000 },
  { id: 'perfect', icon: '💯', name: 'パーフェクト', desc: '1日ぶんを ぜんぶ ごうかく', ok: (s, c) => !!c.perfect },
  { id: 's3', icon: '🔥', name: '3日れんぞく', desc: '3日 つづける', ok: (s) => s.streak >= 3 },
  { id: 's7', icon: '🔥', name: '1週間れんぞく', desc: '7日 つづける', ok: (s) => s.streak >= 7 },
  { id: 's14', icon: '🔥', name: '2週間れんぞく', desc: '14日 つづける', ok: (s) => s.streak >= 14 },
  { id: 's30', icon: '🌋', name: '30日れんぞく', desc: '30日 つづける', ok: (s) => s.streak >= 30 },
  { id: 's100', icon: '🐉', name: '100日れんぞく', desc: '100日 つづける', ok: (s) => s.streak >= 100 },
  { id: 'w100', icon: '✏️', name: '100回 かいた', desc: 'ぜんぶで 100回 かく', ok: (s) => s.total >= 100 },
  { id: 'w500', icon: '🖌️', name: '500回 かいた', desc: 'ぜんぶで 500回 かく', ok: (s) => s.total >= 500 },
  { id: 'w1000', icon: '📜', name: '1000回 かいた', desc: 'ぜんぶで 1000回 かく', ok: (s) => s.total >= 1000 },
  ...GRADES.flatMap((g) => [
    { id: `g${g}all`, icon: '🏅', name: `小${g} ぜんぶ ごうかく`, desc: `小${g}の かん字を ぜんぶ 1回 ごうかく`, grade: g, ok: (s) => s.g[g].n > 0 && s.g[g].passed >= s.g[g].n },
    { id: `g${g}master`, icon: '🏆', name: `小${g} かん字マスター`, desc: `小${g}の かん字を ぜんぶ ★マスター`, grade: g, big: true, ok: (s) => s.g[g].n > 0 && s.g[g].mastered >= s.g[g].n },
  ]),
];
function checkTrophies(ctx = {}) {
  const s = stats(P), got = [];
  for (const t of TROPHIES) {
    if (!P.trophies[t.id] && t.ok(s, ctx)) { P.trophies[t.id] = today(); got.push(t); }
  }
  if (got.length) save();
  return got;
}

// ───────── 効果音・演出 ─────────
let AC = null;
function tone(seq, type = 'triangle') {
  if (!DB.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    let t = AC.currentTime;
    for (const [f, d] of seq) {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d);
      t += d * 0.75;
    }
  } catch { /* 音が出せない環境 */ }
}
const SND = {
  stroke: () => tone([[880, 0.05]]),
  miss: () => tone([[160, 0.18]], 'sawtooth'),
  pass: () => tone([[784, 0.12], [988, 0.12], [1319, 0.3]]),
  fail: () => tone([[392, 0.2], [294, 0.35]]),
  trophy: () => tone([[523, 0.14], [659, 0.14], [784, 0.14], [1047, 0.2], [784, 0.12], [1047, 0.5]]),
};
function confetti(n = 60) {
  const box = document.createElement('div'); box.className = 'confetti';
  const bits = ['🎉', '✨', '⭐', '🎊', '💮', '🌸'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.textContent = bits[i % bits.length];
    s.style.left = Math.random() * 100 + '%';
    s.style.fontSize = 18 + Math.random() * 26 + 'px';
    s.style.animationDuration = 1.6 + Math.random() * 1.8 + 's';
    s.style.animationDelay = Math.random() * 0.6 + 's';
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 4500);
}
function showTrophies(list, done) {
  if (!list.length) { done && done(); return; }
  const t = list[0];
  SND.trophy(); confetti(t.big ? 140 : 60);
  const m = document.createElement('div');
  m.className = 'modal trophy-modal';
  m.innerHTML = `<div class="tcard ${t.big ? 'big' : ''}">
    <div class="tlabel">トロフィー ゲット！</div>
    <div class="ticon">${t.icon}</div>
    <div class="tname">${esc(t.name)}</div>
    <div class="tdesc">${esc(t.desc)}</div>
    <button class="btn primary">やったー！</button></div>`;
  document.body.appendChild(m);
  $('button', m).onclick = () => { m.remove(); showTrophies(list.slice(1), done); };
}

// ───────── 画面ルーティング ─────────
let cleanup = null;
function go(render, ...args) {
  if (cleanup) { cleanup(); cleanup = null; }
  app.onclick = null; app.onchange = null;
  window.scrollTo(0, 0);
  render(...args);
}
function onAct(map) {
  app.onclick = (e) => {
    const el = e.target.closest('[data-act]');
    if (el && map[el.dataset.act]) map[el.dataset.act](el, e);
  };
}

// ───────── プロフィール選択 ─────────
function viewProfiles() {
  const list = DB.profiles.map((p) => {
    const s = stats(p);
    return `<button class="pcard" data-act="pick" data-id="${p.id}">
      <span class="pav">${p.avatar}</span><span class="pname">${esc(p.name)}</span>
      <span class="pmeta">🔥${s.streak}日　🏆${Object.keys(p.trophies).length}こ　${s.passed}字</span></button>`;
  }).join('');
  app.innerHTML = `<div class="page center">
    <h1 class="logo">かん字 かきとり<small>かいて おぼえる</small></h1>
    <p class="lead">${DB.profiles.length ? 'だれが やる？' : 'さいしょに つかう人を とうろくしてね'}</p>
    <div class="pgrid">${list}<button class="pcard add" data-act="add"><span class="pav">＋</span><span class="pname">ついか</span></button></div>
  </div>`;
  onAct({
    pick: (el) => { DB.current = el.dataset.id; save(); P = DB.profiles.find((p) => p.id === DB.current); go(viewHome); },
    add: () => go(viewProfileForm, null),
  });
}
function viewProfileForm(p) {
  const cur = p || { name: '', avatar: AVATARS[DB.profiles.length % AVATARS.length], grades: [4] };
  app.innerHTML = `<div class="page narrow">
    <h2>${p ? 'プロフィールを なおす' : 'あたらしい プロフィール'}</h2>
    <label class="fld">なまえ<input id="pn" type="text" maxlength="12" value="${esc(cur.name)}" placeholder="なまえ" autocomplete="off"></label>
    <div class="fld">アイコン<div class="avs">${AVATARS.map((a) => `<button class="av ${a === cur.avatar ? 'on' : ''}" data-act="av" data-a="${a}">${a}</button>`).join('')}</div></div>
    <div class="fld">べんきょうする 学年<div class="grs">${GRADES.map((g) => `<label class="chk"><input type="checkbox" value="${g}" ${cur.grades.includes(g) ? 'checked' : ''}>小${g}（${GL[g].length}字）</label>`).join('')}</div></div>
    <div class="row"><button class="btn" data-act="cancel">やめる</button><button class="btn primary" data-act="ok">けってい</button></div>
  </div>`;
  let avatar = cur.avatar;
  onAct({
    av: (el) => { avatar = el.dataset.a; app.querySelectorAll('.av').forEach((b) => b.classList.toggle('on', b === el)); },
    cancel: () => go(p ? viewSettings : viewProfiles),
    ok: () => {
      const name = $('#pn').value.trim();
      const grades = [...app.querySelectorAll('.grs input:checked')].map((i) => +i.value);
      if (!name) return alert('なまえを 入れてね');
      if (!grades.length) return alert('学年を 1つ えらんでね');
      if (p) { p.name = name; p.avatar = avatar; p.grades = grades; p.session = null; save(); go(viewSettings); }
      else { DB.profiles.push(newProfile(name, avatar, grades)); save(); go(viewProfiles); }
    },
  });
}

// ───────── ホーム ─────────
function sessionState() {
  const s = P.session;
  if (!s || s.date !== today()) return { kind: 'new' };
  if (s.pos < s.queue.length) return { kind: 'resume', left: s.queue.length - s.pos };
  return { kind: 'done' };
}
function viewHome() {
  const s = stats(P), st = sessionState(), t = today();
  const due = dueList(P).length, fresh = freshList(P).length;
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(t, -i), L = P.log[d];
    week.push(`<div class="wd ${L && L.fin ? 'fin' : L ? 'part' : ''} ${i === 0 ? 'today' : ''}"><span>${'日月火水木金土'[parseD(d).getDay()]}</span><b>${L && L.fin ? '💮' : L ? '✏️' : '・'}</b></div>`);
  }
  let main;
  if (st.kind === 'new') {
    const q = buildQueue(P);
    main = q.length
      ? `<div class="todo">きょうは <b>${q.length}</b>字<small>ふくしゅう ${q.filter((k) => P.cards[k]).length}字 ／ あたらしい字 ${q.filter((k) => !P.cards[k]).length}字</small></div>
         <button class="btn primary huge" data-act="start">はじめる</button>`
      : `<div class="todo">きょう やる字は ありません 🎉</div><button class="btn" data-act="more">それでも れんしゅうする</button>`;
  } else if (st.kind === 'resume') {
    main = `<div class="todo">あと <b>${st.left}</b>字</div><button class="btn primary huge" data-act="resume">つづきから</button>`;
  } else {
    main = `<div class="todo done">💮 きょうのぶんは おわり！<small>また あした</small></div><button class="btn" data-act="more">もっとやる（＋5字）</button>`;
  }
  const bars = [...P.grades].sort().map((g) => {
    const x = s.g[g];
    return `<div class="gbar"><div class="gl">小${g}<small>ごうかく ${x.passed} ／ ★ ${x.mastered} ／ ${x.n}字</small></div>
      <div class="bar"><i class="b1" style="width:${(x.passed / x.n) * 100}%"></i><i class="b2" style="width:${(x.mastered / x.n) * 100}%"></i></div></div>`;
  }).join('');
  app.innerHTML = `<div class="page">
    <header class="top"><button class="who" data-act="switch"><span>${P.avatar}</span>${esc(P.name)}<small>きりかえ</small></button>
      <div class="chips"><span class="chip fire">🔥 ${s.streak}日れんぞく</span><span class="chip">🏆 ${Object.keys(P.trophies).length}</span></div></header>
    <section class="hero">${main}</section>
    <section class="week">${week.join('')}</section>
    <section class="card">${bars}<p class="note">のこり：あたらしい字 ${fresh}字／きょうの ふくしゅう ${due}字</p></section>
    <nav class="navs">
      <button class="btn nav" data-act="zukan">📖<span>かん字ずかん</span></button>
      <button class="btn nav" data-act="rec">🏆<span>きろく・トロフィー</span></button>
      <button class="btn nav" data-act="set">⚙️<span>せってい</span></button>
    </nav></div>`;
  const begin = (queue, extra) => { P.session = { date: today(), queue, pos: 0, res: [], extra: !!extra }; save(); go(viewStudy); };
  onAct({
    switch: () => go(viewProfiles),
    start: () => begin(buildQueue(P)),
    resume: () => go(viewStudy),
    more: () => { const q = buildExtra(P); if (q.length) begin(q, true); else alert('れんしゅうできる字が ありません'); },
    zukan: () => go(viewZukan),
    rec: () => go(viewRecords),
    set: () => go(viewSettings),
  });
}

// ───────── 書き取り ─────────
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}
const maskWord = (w, k) => w.split(k).join('◯');
const sec = (ms) => (ms / 1000).toFixed(1);

function viewStudy() {
  const S = P.session;
  const k = S.queue[S.pos], D = KD[k];
  const targets = D.s.map(samplePath);
  const limitMs = P.limit * 1000;
  const isNew = !P.cards[k];
  const c = { mode: 'test', idx: 0, miss: 0, missHere: 0, hinted: false, gaveUp: false, drift: [0, 0], nAcc: 0, t0: 0, ms: 0, raf: 0 };

  app.innerHTML = `<div class="study">
    <header class="sbar"><button class="x" data-act="quit">✕</button>
      <div class="dots">${S.queue.map((q, i) => `<i class="${i < S.pos ? (S.res[i] && S.res[i].ok ? 'ok' : 'ng') : i === S.pos ? 'cur' : ''}"></i>`).join('')}</div>
      <div class="cnt">${S.pos + 1} / ${S.queue.length}</div></header>
    <div class="smain">
      <section class="prompt">
        <div class="tag">${isNew ? '🆕 あたらしい字' : '🔁 ふくしゅう'}　小${D.g}</div>
        <div class="timer"><div class="tbar"><i id="tfill"></i></div><span id="tnum">0.0</span><small>びょう</small></div>
        <div class="yomi">${esc(D.y)}</div>
        <ul class="exs" id="exs">${D.ex.map(([w, r]) => `<li><ruby>${esc(maskWord(w, k))}<rt>${esc(r)}</rt></ruby></li>`).join('')}</ul>
        <div id="msg" class="msg"></div>
        <div id="result"></div>
        <div class="sbtns" id="sbtns"><button class="btn ghost" data-act="giveup">わからない</button></div>
      </section>
      <section class="padwrap">
        <svg id="pad" viewBox="0 0 109 109">
          <rect x="1" y="1" width="107" height="107" rx="4" class="pbg"/>
          <line x1="54.5" y1="3" x2="54.5" y2="106" class="pgrid"/><line x1="3" y1="54.5" x2="106" y2="54.5" class="pgrid"/>
          <g id="model"></g><g id="ink"></g><polyline id="cur" class="ink live" points=""/>
        </svg>
        <div class="kaku" id="kaku"></div>
      </section>
    </div></div>`;

  const pad = $('#pad'), gInk = $('#ink'), gModel = $('#model'), curEl = $('#cur'), msg = $('#msg');
  const setMsg = (t, cls = '') => { msg.textContent = t; msg.className = 'msg ' + cls; };
  const setKaku = () => { $('#kaku').textContent = `${Math.min(c.idx + 1, D.s.length)}画目 ／ ${D.s.length}画`; };

  // タイマー
  const tick = () => {
    const el = performance.now() - c.t0;
    $('#tnum').textContent = sec(el);
    const f = $('#tfill');
    f.style.width = Math.max(0, 100 - (el / limitMs) * 100) + '%';
    f.parentElement.parentElement.classList.toggle('over', el > limitMs);
    c.raf = requestAnimationFrame(tick);
  };
  const stopTimer = () => { cancelAnimationFrame(c.raf); c.raf = 0; };
  cleanup = stopTimer;

  // お手本の表示
  function drawModel(kind) {
    gModel.innerHTML = '';
    if (kind === 'none') return;
    D.s.forEach((d, i) => {
      let cls = 'm-over';
      if (kind === 'trace') cls = i < c.idx ? 'm-done' : i === c.idx ? 'm-cur' : 'm-rest';
      const p = svgEl('path', { d, class: 'model ' + cls });
      if (kind === 'anim') { p.setAttribute('pathLength', '1'); p.classList.add('m-anim'); p.style.animationDelay = i * 0.28 + 's'; }
      gModel.appendChild(p);
    });
    if (kind === 'trace' && c.idx < D.s.length) {
      const s = targets[c.idx].pts[0];
      gModel.appendChild(svgEl('circle', { cx: s[0], cy: s[1], r: 2.6, class: 'm-start' }));
    }
  }
  function showHint() {
    c.hinted = true;
    gModel.innerHTML = '';
    const p = svgEl('path', { d: D.s[c.idx], class: 'model m-cur m-anim', pathLength: '1' });
    gModel.appendChild(p);
  }

  // 入力（Apple Pencil を検出したら指・手のひらは無視）
  let penSeen = false, drawing = null;
  const pt = (e) => { const r = pad.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 109, ((e.clientY - r.top) / r.height) * 109]; };
  const accept = (e) => {
    if (e.pointerType === 'pen') { penSeen = true; return true; }
    if (e.pointerType === 'touch') return DB.pen === 'any' || (DB.pen === 'auto' && !penSeen);
    return true;
  };
  pad.addEventListener('pointerdown', (e) => {
    if (c.mode === 'result' || drawing || !accept(e)) return;
    e.preventDefault();
    try { pad.setPointerCapture(e.pointerId); } catch { /* 合成イベント */ }
    drawing = { id: e.pointerId, pts: [pt(e)] };
    curEl.setAttribute('points', drawing.pts[0].join(','));
  });
  pad.addEventListener('pointermove', (e) => {
    if (!drawing || e.pointerId !== drawing.id) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const ev of evs.length ? evs : [e]) drawing.pts.push(pt(ev));
    curEl.setAttribute('points', drawing.pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '));
  });
  const end = (e) => {
    if (!drawing || e.pointerId !== drawing.id) return;
    const pts = drawing.pts; drawing = null;
    curEl.setAttribute('points', '');
    onStroke(pts);
  };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', (e) => { if (drawing && e.pointerId === drawing.id) { drawing = null; curEl.setAttribute('points', ''); } });

  function addInk(pts, cls) {
    const el = svgEl('polyline', { class: 'ink ' + cls, points: pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') });
    gInk.appendChild(el);
    return el;
  }

  function onStroke(pts) {
    if (c.mode === 'result') return;
    const tgt = targets[c.idx], trace = c.mode === 'trace';
    if (tgt.len >= 12 && pathLen(pts) < 2.5) return; // うっかり触れただけ
    const r = judge(pts, tgt, c.drift, trace);
    if (r.ok) {
      addInk(pts, 'good');
      SND.stroke();
      c.nAcc++;
      const w = 0.6 / Math.min(c.nAcc, 4); // 書く位置のずれにゆるやかに追従
      c.drift = [c.drift[0] + (r.off[0] * 0.6 - c.drift[0]) * w / 0.6, c.drift[1] + (r.off[1] * 0.6 - c.drift[1]) * w / 0.6];
      c.idx++; c.missHere = 0;
      setMsg('');
      if (trace) drawModel('trace'); else if (c.hinted) gModel.innerHTML = '';
      if (c.idx >= D.s.length) return trace ? finishTrace() : finishTest();
      setKaku();
      return;
    }
    // まちがい
    const bad = addInk(pts, 'bad');
    setTimeout(() => bad.remove(), 450);
    SND.miss();
    if (trace) { setMsg('オレンジの線を ● から なぞろう', 'warn'); return; }
    c.miss++; c.missHere++;
    let why = 'ちがうみたい。もういちど！';
    if (r.reversed) why = 'かく むきが ぎゃくだよ';
    else if (targets.some((t, j) => j > c.idx && judge(pts, t, c.drift).ok)) why = 'かきじゅんが ちがうよ';
    setMsg(`✕ ${c.idx + 1}画目：${why}`, 'warn');
    if (c.missHere >= 3) { showHint(); setMsg(`${c.idx + 1}画目の ヒントを 見て かこう`, 'warn'); }
  }

  function revealWords() {
    $('#exs').innerHTML = D.ex.map(([w, r]) => `<li><ruby>${esc(w).split(k).join(`<em>${k}</em>`)}<rt>${esc(r)}</rt></ruby></li>`).join('');
  }

  function finishTest() {
    stopTimer();
    c.ms = Math.round(performance.now() - c.t0);
    c.mode = 'result';
    const inTime = c.ms <= limitMs;
    const ok = !c.gaveUp && c.miss === 0 && !c.hinted && inTime;
    $('#tnum').textContent = sec(c.ms);
    const iv = record(k, ok, c.ms, c.gaveUp ? -1 : c.miss);
    S.res[S.pos] = { k, ok, ms: c.ms, miss: c.miss, gaveUp: c.gaveUp };
    save();
    revealWords();
    drawModel(c.gaveUp ? 'anim' : 'over');
    setMsg('');
    $('#kaku').textContent = `${D.s.length}画`;
    const res = $('#result');
    if (ok) {
      SND.pass();
      const lv = P.cards[k].lv;
      res.innerHTML = `<div class="res ok"><b>◎ ごうかく！</b><span>${sec(c.ms)}びょう${lv === MASTER_LV ? '　★マスター！' : ''}</span><small>つぎは ${iv}日ご</small></div>`;
      $('#sbtns').innerHTML = `<button class="btn primary big" data-act="next">つぎへ</button>`;
      if (lv === MASTER_LV) confetti(30);
    } else {
      SND.fail();
      const why = c.gaveUp ? 'こたえを 見たよ' : [c.miss ? `まちがい ${c.miss}回` : '', c.hinted && !c.miss ? 'ヒントあり' : '', !inTime ? `じかん ${sec(c.ms)}びょう（${P.limit}びょうまで）` : ''].filter(Boolean).join('・');
      res.innerHTML = `<div class="res ng"><b>もういっぽ！</b><span>${why}</span><small>あした もういちど 出るよ</small></div>`;
      $('#sbtns').innerHTML = `<button class="btn primary big" data-act="trace">なぞって れんしゅう</button><button class="btn ghost" data-act="next">とばす</button>`;
    }
    const got = checkTrophies();
    if (got.length) setTimeout(() => showTrophies(got), 500);
  }

  function startTrace() {
    c.mode = 'trace'; c.idx = 0; c.drift = [0, 0]; c.nAcc = 0;
    gInk.innerHTML = '';
    $('#result').innerHTML = '';
    $('#sbtns').innerHTML = `<button class="btn ghost" data-act="next">とばす</button>`;
    setMsg('オレンジの線を じゅんばんに なぞろう');
    drawModel('trace'); setKaku();
  }
  function finishTrace() {
    c.mode = 'result';
    SND.pass();
    setMsg('');
    $('#result').innerHTML = `<div class="res ok"><b>よく できました</b><small>あした もういちど ちょうせん！</small></div>`;
    $('#sbtns').innerHTML = `<button class="btn primary big" data-act="next">つぎへ</button>`;
  }

  onAct({
    quit: () => go(viewHome),
    giveup: () => { if (c.mode !== 'test') return; c.gaveUp = true; gInk.innerHTML = ''; finishTest(); },
    trace: startTrace,
    next: () => {
      if (c.mode === 'test') return;
      S.pos++; save();
      if (S.pos < S.queue.length) go(viewStudy); else finishSession();
    },
  });

  setKaku();
  c.t0 = performance.now();
  tick();
}

function finishSession() {
  const S = P.session, t = today();
  const L = P.log[t] || (P.log[t] = { n: 0, ok: 0 });
  const first = !L.fin;
  L.fin = true; save();
  const perfect = !S.extra && S.res.length >= 5 && S.res.every((r) => r.ok);
  const got = checkTrophies({ perfect });
  go(viewSummary, { first, got });
}

function viewSummary({ first, got }) {
  const S = P.session, okN = S.res.filter((r) => r.ok).length, st = streak(P);
  app.innerHTML = `<div class="page narrow center">
    <div class="stamp">💮</div>
    <h2>${S.extra ? 'おつかれさま！' : 'きょうのぶん おわり！'}</h2>
    <div class="sumrow"><div><b>${okN}</b><small>／${S.res.length} ごうかく</small></div><div><b>🔥${st}</b><small>日れんぞく</small></div></div>
    <div class="sumlist">${S.res.map((r) => `<div class="si ${r.ok ? 'ok' : 'ng'}"><span class="kj">${r.k}</span><span>${r.ok ? '◎' : '✕'}</span><small>${r.gaveUp ? '—' : sec(r.ms) + 's'}</small></div>`).join('')}</div>
    <p class="note">✕の字は あした もういちど 出ます。◎の字は 少しずつ 間を あけて また出ます。</p>
    <button class="btn primary big" data-act="home">ホームへ</button></div>`;
  onAct({ home: () => go(viewHome) });
  if (first) confetti(80);
  SND.pass();
  if (got.length) setTimeout(() => showTrophies(got), 700);
}

// ───────── かん字ずかん ─────────
const lvClass = (c) => (!c ? 'l-new' : c.lv >= MASTER_LV ? 'l-star' : c.lv === 0 ? 'l0' : 'l' + c.lv);
let zukanGrade = null;
function viewZukan() {
  const grades = [...P.grades].sort();
  if (!grades.includes(zukanGrade)) zukanGrade = grades[0];
  const g = zukanGrade, s = stats(P).g[g];
  app.innerHTML = `<div class="page">
    <header class="top"><button class="btn back" data-act="home">← もどる</button><h2>かん字ずかん</h2>
      <div class="tabs">${grades.map((x) => `<button class="tab ${x === g ? 'on' : ''}" data-act="tab" data-g="${x}">小${x}</button>`).join('')}</div></header>
    <div class="zhead"><div class="ring" style="--p:${(s.passed / s.n) * 100}"><b>${s.passed}</b><small>／${s.n}</small></div>
      <div><div class="zt">ごうかく ${s.passed}字　★マスター ${s.mastered}字</div>
      <div class="legend"><i class="l-new"></i>まだ <i class="l0"></i>れんしゅう中 <i class="l1"></i><i class="l2"></i><i class="l3"></i>ごうかく1〜3回 <i class="l-star"></i>★マスター</div></div></div>
    <div class="zgrid">${GL[g].map((k) => { const c = P.cards[k]; return `<button class="zk ${lvClass(c)}" data-act="k" data-k="${k}">${c ? k : '<span>？</span>'}${c && c.lv >= MASTER_LV ? '<u>★</u>' : ''}</button>`; }).join('')}</div>
    <p class="note">まだ 出ていない字は「？」。れんしゅうすると 字が あらわれて、ごうかくが つづくと 金色の ★マスターに なります。</p>
  </div>`;
  onAct({
    home: () => go(viewHome),
    tab: (el) => { zukanGrade = +el.dataset.g; go(viewZukan); },
    k: (el) => showKanji(el.dataset.k),
  });
}
function showKanji(k) {
  const D = KD[k], c = P.cards[k];
  const m = document.createElement('div'); m.className = 'modal';
  const hist = c ? c.h.map((h) => `<span class="h ${h[1] ? 'ok' : 'ng'}" title="${h[0]}">${h[1] ? '◎' : '✕'}<small>${h[3] < 0 ? '—' : sec(h[2])}</small></span>`).join('') : '';
  m.innerHTML = `<div class="kcard">
    <svg viewBox="0 0 109 109" class="kanim"><rect x="1" y="1" width="107" height="107" rx="4" class="pbg"/>
      <line x1="54.5" y1="3" x2="54.5" y2="106" class="pgrid"/><line x1="3" y1="54.5" x2="106" y2="54.5" class="pgrid"/>
      ${D.s.map((d, i) => `<path d="${d}" pathLength="1" class="model m-play" style="animation-delay:${i * 0.45}s"/>`).join('')}</svg>
    <div class="kinfo"><div class="yomi sm">${esc(D.y)}</div>
      <ul class="exs">${D.ex.map(([w, r]) => `<li><ruby>${esc(w)}<rt>${esc(r)}</rt></ruby></li>`).join('')}</ul>
      <p>${D.s.length}画　小${D.g}</p>
      ${c ? `<p>ごうかく ${c.okc}回 ／ ${c.n}回${c.best != null ? `　ベスト ${sec(c.best)}びょう` : ''}</p>
        <p>${c.lv >= MASTER_LV ? '★マスター　' : ''}つぎは ${dayDiff(c.due, today()) <= 0 ? 'きょう' : dayDiff(c.due, today()) + '日ご'}</p><div class="hist">${hist}</div>` : '<p>まだ れんしゅうしていません</p>'}
      <div class="row"><button class="btn" data-x="replay">▶ かきじゅん</button><button class="btn primary" data-x="close">とじる</button></div></div></div>`;
  document.body.appendChild(m);
  m.onclick = (e) => {
    const x = e.target.dataset.x;
    if (x === 'close' || e.target === m) m.remove();
    if (x === 'replay') { const svg = $('.kanim', m); svg.replaceWith(svg.cloneNode(true)); }
  };
}

// ───────── きろく・トロフィー ─────────
function viewRecords() {
  const s = stats(P), t = today();
  const end = addDays(t, 6 - parseD(t).getDay());
  const cells = [];
  for (let i = 41; i >= 0; i--) {
    const d = addDays(end, -i), L = P.log[d], fut = d > t;
    cells.push(`<div class="cd ${fut ? 'fut' : L && L.fin ? 'fin' : L ? 'part' : ''} ${d === t ? 'today' : ''}"><small>${parseD(d).getDate() === 1 ? parseD(d).getMonth() + 1 + '/1' : parseD(d).getDate()}</small><b>${L && L.fin ? '💮' : L ? '✏️' : ''}</b>${L ? `<i>${L.ok}/${L.n}</i>` : ''}</div>`);
  }
  const shown = TROPHIES.filter((x) => !x.grade || P.grades.includes(x.grade));
  const days = Object.values(P.log).filter((L) => L.fin).length;
  app.innerHTML = `<div class="page">
    <header class="top"><button class="btn back" data-act="home">← もどる</button><h2>${P.avatar} ${esc(P.name)}の きろく</h2><span></span></header>
    <section class="statrow">
      <div class="stat"><b>🔥 ${s.streak}</b><small>日れんぞく</small></div>
      <div class="stat"><b>${days}</b><small>日 がんばった</small></div>
      <div class="stat"><b>${s.passed}</b><small>字 ごうかく</small></div>
      <div class="stat"><b>★ ${s.mastered}</b><small>字 マスター</small></div>
      <div class="stat"><b>${s.total}</b><small>回 かいた</small></div>
      <div class="stat"><b>${s.best === Infinity ? '—' : sec(s.best)}</b><small>びょう ベスト</small></div>
    </section>
    <h3>まいにちの つみあげ</h3>
    <section class="cal"><div class="ch">${[...'日月火水木金土'].map((x) => `<span>${x}</span>`).join('')}</div><div class="cg">${cells.join('')}</div></section>
    <h3>トロフィー（${Object.keys(P.trophies).length} ／ ${shown.length}）</h3>
    <section class="tgrid">${shown.map((x) => { const d = P.trophies[x.id]; return `<div class="tr ${d ? 'on' : ''} ${x.big ? 'big' : ''}"><div class="ti">${d ? x.icon : '🔒'}</div><b>${esc(x.name)}</b><small>${d ? d.slice(5).replace('-', '/') + ' ゲット' : esc(x.desc)}</small></div>`; }).join('')}</section>
  </div>`;
  onAct({ home: () => go(viewHome) });
}

// ───────── せってい ─────────
function viewSettings() {
  const opt = (arr, cur, f = (x) => x) => arr.map((x) => `<option value="${x}" ${x === cur ? 'selected' : ''}>${f(x)}</option>`).join('');
  app.innerHTML = `<div class="page narrow">
    <header class="top"><button class="btn back" data-act="home">← もどる</button><h2>せってい（おうちの人むけ）</h2><span></span></header>
    <section class="card">
      <h3>${P.avatar} ${esc(P.name)}</h3>
      <label class="fld inline">1日の字数<select id="daily">${opt([5, 8, 10, 12, 15, 20], P.daily, (x) => x + '字')}</select></label>
      <label class="fld inline">合格タイム<select id="limit">${opt([8, 10, 12, 15, 20, 30], P.limit, (x) => x + '秒以内')}</select></label>
      <p class="note">学年：${[...P.grades].sort().map((g) => '小' + g).join('・')}</p>
      <div class="row"><button class="btn" data-act="edit">名前・学年を変える</button><button class="btn danger" data-act="del">このプロフィールを消す</button></div>
    </section>
    <section class="card">
      <h3>この端末の設定</h3>
      <label class="fld inline">入力<select id="pen">
        <option value="auto" ${DB.pen === 'auto' ? 'selected' : ''}>自動（ペンを使ったら指は無視）</option>
        <option value="pen" ${DB.pen === 'pen' ? 'selected' : ''}>Apple Pencil のみ</option>
        <option value="any" ${DB.pen === 'any' ? 'selected' : ''}>指でも書ける</option></select></label>
      <label class="fld inline">効果音<select id="sound"><option value="1" ${DB.sound ? 'selected' : ''}>あり</option><option value="0" ${DB.sound ? '' : 'selected'}>なし</option></select></label>
    </section>
    <section class="card">
      <h3>記録のバックアップ（全プロフィール）</h3>
      <p class="note">記録はこの端末のブラウザ内に保存されています。ときどきファイルに書き出しておくと安心です。</p>
      <div class="row"><button class="btn" data-act="export">ファイルに書き出す</button><button class="btn" data-act="import">ファイルから読みこむ</button></div>
      <input type="file" id="file" accept="application/json,.json" hidden>
    </section>
    <p class="note">筆順データ: <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noopener">KanjiVG</a> © Ulrich Apel（CC BY-SA 3.0）。字形は教科書体と細部が異なる場合があります。</p>
  </div>`;
  app.onchange = (e) => {
    const id = e.target.id, v = e.target.value;
    if (id === 'daily') { P.daily = +v; if (P.session && P.session.pos === 0 && !P.session.extra) P.session = null; }
    if (id === 'limit') P.limit = +v;
    if (id === 'pen') DB.pen = v;
    if (id === 'sound') DB.sound = v === '1';
    if (id === 'file' && e.target.files[0]) {
      e.target.files[0].text().then((txt) => {
        const d = JSON.parse(txt);
        if (!d || !Array.isArray(d.profiles)) throw new Error('形式がちがいます');
        if (!confirm(`${d.profiles.length}人分の記録を読みこみ、今の記録と置きかえます。よろしいですか？`)) return;
        DB = d; save(); P = null; go(viewProfiles);
      }).catch((err) => alert('読みこめませんでした: ' + err.message));
      return;
    }
    save();
  };
  onAct({
    home: () => go(viewHome),
    edit: () => go(viewProfileForm, P),
    del: () => {
      if (!confirm(`「${P.name}」の記録をすべて消します。元にもどせません。よろしいですか？`)) return;
      DB.profiles = DB.profiles.filter((p) => p !== P); DB.current = null; P = null; save(); go(viewProfiles);
    },
    export: () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(DB)], { type: 'application/json' }));
      a.download = `kanji-kiroku-${today()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    },
    import: () => $('#file').click(),
  });
}

// ───────── 起動 ─────────
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
(async function main() {
  try { await loadData(); }
  catch (e) { app.innerHTML = `<div class="page center"><p>データを 読みこめませんでした。</p><p class="note">${esc(e.message)}</p></div>`; return; }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  P = DB.profiles.find((p) => p.id === DB.current) || null;
  go(viewProfiles);
})();
