import { samplePath, judge, pathLen } from './matcher.js';

// ───────── 基本設定 ─────────
const LS_KEY = 'kanjiapp.v1';
const INTERVALS = [1, 3, 7, 14, 30, 60, 120]; // 合格が続くたびに伸びる復習間隔（日）
const MASTER_LV = 4;                          // 4回連続合格で「マスター」
const GRADES = [3, 4, 5, 6];
const AVATARS = [
  '🐭', '🐮', '🐯', '🐰', '🐲', '🐍', '🐴', '🐑', '🐵', '🐔', '🐶', '🐗', // 干支
  '🦊', '🐼', '🐧', '🐨', '🦁', '🐸', '🐙', '🦄', '🐳', '🦖', '🐱', '🦉', '🐻', '🐹', '🦈', '🦋', '🐢', '🦕',
  '🚀', '⚽', '🎮', '🎸', '🌈', '🍙', '🍓', '👻', '🤖', '👾', '🥷', '🧙',
];
// 都道府県名で使う字（コレクション系トロフィー用）
const PREF_KANJI = '茨媛岡潟岐熊香佐埼崎滋鹿縄井沖栃奈梨阪阜';
const RNAME = {
  '亻': 'にんべん', '氵': 'さんずい', '木': 'きへん', '言': 'ごんべん', '口': 'くち', '糸': 'いとへん', '宀': 'うかんむり', '扌': 'てへん',
  '⻌': 'しんにょう', '心': 'こころ', '日': 'ひ', '月': 'つき・にくづき', '土': 'つち', '貝': 'かい', '⻖': 'こざとへん', '艹': 'くさかんむり',
  '力': 'ちから', '刂': 'りっとう', '竹': 'たけかんむり', '攵': 'のぶん', '彳': 'ぎょうにんべん', '金': 'かねへん', '广': 'まだれ', '禾': 'のぎへん',
  '尸': 'しかばね', '頁': 'おおがい', '巾': 'はば', '女': 'おんな', '目': 'め', '寸': 'すん', '大': 'だい', '人': 'ひと', '火': 'ひ', '衣': 'ころも',
  '灬': 'れんが', '田': 'た', '山': 'やま', '車': 'くるま', '石': 'いし', '礻': 'しめすへん', '一': 'いち', '⻏': 'おおざと', '見': 'みる', '囗': 'くにがまえ',
  '飠': 'しょくへん', '門': 'もんがまえ', '八': 'はち', '干': 'かん', '示': 'しめす', '皿': 'さら', '又': 'また', '子': 'こ', '十': 'じゅう', '忄': 'りっしんべん',
  '穴': 'あなかんむり', '王': 'おう', '欠': 'あくび', '酉': 'とり', '隹': 'ふるとり', '立': 'たつ', '方': 'ほう', '水': 'みず', '牛': 'うし', '羊': 'ひつじ',
  '行': 'ぎょうがまえ', '戈': 'ほこ', '罒': 'あみがしら', '疒': 'やまいだれ', '雨': 'あめかんむり', '厂': 'がんだれ', '犭': 'けものへん', '衤': 'ころもへん',
  '米': 'こめ', '耳': 'みみ', '虫': 'むし', '走': 'そうにょう', '足': 'あし', '馬': 'うま', '魚': 'うお', '鳥': 'とり', '弓': 'ゆみ', '工': 'たくみ', '止': 'とめる',
  '殳': 'るまた', '羽': 'はね', '食': 'しょく', '手': 'て', '冖': 'わかんむり', '冫': 'にすい', '匚': 'はこがまえ', '儿': 'ひとあし', '卩': 'ふしづくり', '亅': 'はねぼう',
};
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
    if (!Array.isArray(list)) return;
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
  const s = { passed: 0, mastered: 0, best: Infinity, total: p.total || 0, streak: streak(p), g: {}, rad: {}, pref: 0, big: 0, level: levelOf(p.xp || 0), cnt: p.cnt || {}, maxCombo: p.maxCombo || 0 };
  for (const g of GRADES) s.g[g] = { passed: 0, mastered: 0, n: (GL[g] || []).length };
  for (const [k, c] of Object.entries(p.cards)) {
    const g = KD[k] && KD[k].g; if (!g) continue;
    if (c.okc > 0) {
      s.passed++; s.g[g].passed++;
      const r = KD[k].r; s.rad[r] = (s.rad[r] || 0) + 1;
      if (PREF_KANJI.includes(k)) s.pref++;
      if (KD[k].s.length >= 15) s.big++;
    }
    if (c.lv >= MASTER_LV) { s.mastered++; s.g[g].mastered++; }
    if (c.best != null && c.best < s.best) s.best = c.best;
  }
  return s;
}

// ───────── レベル（XP） ─────────
const xpFor = (lv) => 30 * (lv - 1) * lv; // そのレベルに必要な累計XP
const levelOf = (xp) => { let l = 1; while (xpFor(l + 1) <= xp) l++; return l; };
const TITLES = [[1, 'かん字 みならい'], [3, 'かん字 ルーキー'], [5, 'かん字 ファイター'], [8, 'かん字 ハンター'], [12, 'かん字 はかせ'], [16, 'かん字 たつじん'], [20, 'かん字 マスター'], [30, 'かん字 レジェンド'], [40, 'かん字の 神さま']];
const titleOf = (lv) => TITLES.filter((t) => t[0] <= lv).pop()[1];
/** XPを足す。レベルが上がったらポップアップ用のデータを返す */
function addXp(n) {
  const b = levelOf(P.xp || 0);
  P.xp = (P.xp || 0) + n;
  const a = levelOf(P.xp);
  save();
  return a > b ? [{ icon: '🆙', label: 'レベルアップ！', name: `レベル ${a}`, desc: titleOf(a), big: a % 5 === 0 }] : [];
}
const bump = (key, n = 1) => { P.cnt = P.cnt || {}; P.cnt[key] = (P.cnt[key] || 0) + n; return P.cnt[key]; };

// ───────── トロフィー ─────────
const ev = (id) => (s, c) => !!(c.ev && c.ev.includes(id));
const cnt = (key, n) => (s) => (s.cnt[key] || 0) >= n;
const rad = (r, n) => (s) => (s.rad[r] || 0) >= n;
const TROPHIES = [
  // つみあげ
  { id: 'first', icon: '🌱', name: 'はじめの一歩', desc: 'はじめて ごうかくする', ok: (s) => s.passed >= 1 },
  { id: 'p10', icon: '🥉', name: '10字 ごうかく', desc: '10字 ごうかくする', ok: (s) => s.passed >= 10 },
  { id: 'p50', icon: '🥈', name: '50字 ごうかく', desc: '50字 ごうかくする', ok: (s) => s.passed >= 50 },
  { id: 'p100', icon: '🥇', name: '100字 ごうかく', desc: '100字 ごうかくする', ok: (s) => s.passed >= 100 },
  { id: 'p200', icon: '👑', name: '200字 ごうかく', desc: '200字 ごうかくする', ok: (s) => s.passed >= 200 },
  { id: 'p500', icon: '🏯', name: '500字 ごうかく', desc: '500字 ごうかくする', ok: (s) => s.passed >= 500 },
  { id: 'm10', icon: '⭐', name: 'スター10', desc: '★マスターを 10字', ok: (s) => s.mastered >= 10 },
  { id: 'm50', icon: '🌟', name: 'スター50', desc: '★マスターを 50字', ok: (s) => s.mastered >= 50 },
  { id: 'm100', icon: '💫', name: 'スター100', desc: '★マスターを 100字', ok: (s) => s.mastered >= 100 },
  { id: 'w100', icon: '✏️', name: 'えんぴつ 1本ぶん', desc: 'ぜんぶで 100回 かく', ok: (s) => s.total >= 100 },
  { id: 'w500', icon: '🖌️', name: 'ふで 1本ぶん', desc: 'ぜんぶで 500回 かく', ok: (s) => s.total >= 500 },
  { id: 'w1000', icon: '📜', name: 'まきもの 1本ぶん', desc: 'ぜんぶで 1000回 かく', ok: (s) => s.total >= 1000 },
  // れんぞく
  { id: 's3', icon: '🔥', name: '三日ぼうず そつぎょう', desc: '3日 つづける', ok: (s) => s.streak >= 3 },
  { id: 's7', icon: '🗓️', name: '1週間 かいきん', desc: '7日 つづける', ok: (s) => s.streak >= 7 },
  { id: 's14', icon: '🚂', name: 'とまらない きかんしゃ', desc: '14日 つづける', ok: (s) => s.streak >= 14 },
  { id: 's30', icon: '🌋', name: 'もえる 30日', desc: '30日 つづける', ok: (s) => s.streak >= 30 },
  { id: 's100', icon: '🐉', name: 'でんせつの 100日', desc: '100日 つづける', ok: (s) => s.streak >= 100 },
  { id: 'perfect', icon: '💯', name: 'パーフェクト', desc: '1日ぶんを ぜんぶ ごうかく', ok: ev('perfect') },
  { id: 'perfect5', icon: '🎯', name: 'ひゃっぱつ ひゃくちゅう', desc: 'パーフェクトを 5回', ok: cnt('perfect', 5) },
  { id: 'weekend', icon: '🏖️', name: '休みの日も えらい', desc: '土曜と 日曜に やる', ok: cnt('weekend', 2) },
  { id: 'extra', icon: '💪', name: 'おかわり！', desc: '「もっとやる」を さいごまで やる', ok: cnt('extra', 1) },
  { id: 'extra10', icon: '🍚', name: 'おおもり おかわり', desc: '「もっとやる」を 10回', ok: cnt('extra', 10) },
  // はやさ・うでまえ
  { id: 'fast5', icon: '⚡', name: 'はやがき名人', desc: '8画より多い字を 6びょう以内で ごうかく', ok: ev('fast') },
  { id: 'fast3', icon: '🌩️', name: 'いなずま', desc: '12画より多い字を 8びょう以内で ごうかく', ok: ev('inazuma') },
  { id: 'rankS10', icon: '🅂', name: 'Sランク ハンター', desc: 'Sランクを 10回 とる', ok: cnt('S', 10) },
  { id: 'rankS50', icon: '💎', name: 'Sランク コレクター', desc: 'Sランクを 50回 とる', ok: cnt('S', 50) },
  { id: 'combo5', icon: '🎳', name: '5コンボ', desc: '5字 つづけて ごうかく', ok: (s) => s.maxCombo >= 5 },
  { id: 'combo10', icon: '🎆', name: '10コンボ', desc: '10字 つづけて ごうかく', ok: (s) => s.maxCombo >= 10 },
  { id: 'big15', icon: '👹', name: '画数モンスター たいじ', desc: '15画より多い字を ごうかく', ok: (s) => s.big >= 1 },
  { id: 'big15x10', icon: '🗡️', name: 'モンスター スレイヤー', desc: '15画より多い字を 10字 ごうかく', ok: (s) => s.big >= 10 },
  { id: 'revenge', icon: '🧟', name: 'リベンジ せいこう', desc: '✕だった字に つぎの日 かつ', ok: cnt('revenge', 1) },
  { id: 'revenge20', icon: '🦸', name: 'ふっかつの ヒーロー', desc: 'リベンジを 20回 きめる', ok: cnt('revenge', 20) },
  { id: 'trace20', icon: '🖍️', name: 'なぞり しょくにん', desc: 'なぞり れんしゅうを 20回', ok: cnt('trace', 20) },
  { id: 'zukan10', icon: '🔍', name: 'ずかん たんけん', desc: 'ずかんから 10回 れんしゅう', ok: cnt('practice', 10) },
  { id: 'drill', icon: '🥊', name: 'にがて とっくん', desc: 'ぶんせきの とっくんを やりきる', ok: cnt('drill', 1) },
  // レベル
  { id: 'lv5', icon: '🎒', name: 'レベル5', desc: 'レベル5に なる', ok: (s) => s.level >= 5 },
  { id: 'lv10', icon: '🎓', name: 'レベル10', desc: 'レベル10に なる', ok: (s) => s.level >= 10 },
  { id: 'lv20', icon: '🧙', name: 'レベル20', desc: 'レベル20に なる', ok: (s) => s.level >= 20 },
  // コレクション
  { id: 'pref', icon: '🗾', name: '日本一しゅう', desc: '都道府県の字 20字を ぜんぶ ごうかく', grade: 4, ok: (s) => s.pref >= PREF_KANJI.length },
  { id: 'r-sui', icon: '💧', name: 'さんずい 水あそび', desc: '「氵」の字を 10字 ごうかく', ok: rad('氵', 10) },
  { id: 'r-ki', icon: '🌳', name: 'きへんの 森', desc: '「木」の字を 10字 ごうかく', ok: rad('木', 10) },
  { id: 'r-nin', icon: '🧍', name: 'にんべん なかま', desc: '「亻」の字を 10字 ごうかく', ok: rad('亻', 10) },
  { id: 'r-gon', icon: '🗣️', name: 'ごんべん おしゃべり', desc: '「言」の字を 10字 ごうかく', ok: rad('言', 10) },
  { id: 'r-ito', icon: '🧵', name: 'いとへん あみもの', desc: '「糸」の字を 8字 ごうかく', ok: rad('糸', 8) },
  { id: 'r-te', icon: '✋', name: 'てへん ハイタッチ', desc: '「扌」の字を 8字 ごうかく', ok: rad('扌', 8) },
  { id: 'r-kusa', icon: '🌿', name: 'くさかんむり ガーデン', desc: '「艹」の字を 6字 ごうかく', ok: rad('艹', 6) },
  { id: 'r-kai', icon: '🐚', name: 'かいがら あつめ', desc: '「貝」の字を 6字 ごうかく', ok: rad('貝', 6) },
  // ひみつ（とるまで なかみは ないしょ）
  { id: 'lucky7', icon: '🎰', name: 'ラッキーセブン', desc: 'ぴったり 7.7びょうで ごうかく', secret: true, ok: ev('lucky7') },
  { id: 'close', icon: '😅', name: 'ぎりぎり セーフ', desc: 'のこり 0.3びょうで ごうかく', secret: true, ok: ev('close') },
  { id: 'early', icon: '🌅', name: 'はやおき チャンピオン', desc: '朝 7時より前に やりきる', secret: true, ok: ev('early') },
  { id: 'nana', icon: '🪆', name: '七ころび 八おき', desc: '3回 ✕だった字に ついに かつ', secret: true, ok: ev('nana') },
  { id: 'best3', icon: '📈', name: 'きのうの じぶんに かつ', desc: 'じこベストを 1日に 3回 こうしん', secret: true, ok: ev('best3') },
  { id: 'erase', icon: '🧽', name: 'けしゴム マスター', desc: '「ぜんぶけす」を つかっても ごうかく', secret: true, ok: ev('erase') },
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
  stroke: (i = 0) => tone([[523 * 2 ** ((i % 15) / 12), 0.07]]),
  miss: () => tone([[160, 0.18]], 'sawtooth'),
  pass: () => tone([[784, 0.12], [988, 0.12], [1319, 0.3]]),
  great: () => tone([[784, 0.09], [988, 0.09], [1175, 0.09], [1568, 0.4]]),
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
    <div class="tlabel">${t.label || (t.secret ? 'ひみつの トロフィー ゲット！' : 'トロフィー ゲット！')}</div>
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
      <span class="plv">Lv.${s.level}</span><span class="pmeta">🔥${s.streak}日　🏆${Object.keys(p.trophies).length}こ　${s.passed}字</span></button>`;
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
    <section class="lvbar"><b>Lv.${s.level}</b><span>${titleOf(s.level)}</span>
      <div class="bar"><i class="bx" style="width:${(((P.xp || 0) - xpFor(s.level)) / (xpFor(s.level + 1) - xpFor(s.level))) * 100}%"></i></div>
      <small>つぎの レベルまで ${xpFor(s.level + 1) - (P.xp || 0)} XP</small></section>
    <section class="hero">${main}</section>
    <section class="week">${week.join('')}</section>
    <section class="card">${bars}<p class="note">のこり：あたらしい字 ${fresh}字／きょうの ふくしゅう ${due}字</p></section>
    <nav class="navs">
      <button class="btn nav" data-act="zukan">📖<span>かん字ずかん</span></button>
      <button class="btn nav" data-act="rec">🏆<span>きろく・トロフィー</span></button>
      <button class="btn nav" data-act="ana">📊<span>ぶんせき</span></button>
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
    ana: () => go(viewAnalysis),
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

const PRAISE = ['すごい！', 'てんさい！', 'かんぺき！', 'さすが！', 'おみごと！', 'いいね！', 'やったね！', 'かっこいい！', 'キレッキレ！', 'プロの字！'];
const rankOf = (ms, limitMs) => (ms <= limitMs * 0.5 ? 'S' : ms <= limitMs * 0.8 ? 'A' : 'B');

/** ctx を渡すと練習モード（記録・復習予定には影響しない）: {queue,pos,res,practice:true,kind,back} */
function viewStudy(ctx) {
  const S = ctx || P.session;
  const practice = !!S.practice;
  const k = S.queue[S.pos], D = KD[k];
  const targets = D.s.map(samplePath);
  const limitMs = P.limit * 1000;
  const isNew = !P.cards[k];
  const c = { mode: 'test', idx: 0, miss: 0, missHere: 0, hinted: false, gaveUp: false, erased: false, drift: [0, 0], nAcc: 0, t0: 0, ms: 0, raf: 0 };
  const tools = `<div class="tools"><button class="btn sm" data-act="undo">↩ 1画もどす</button><button class="btn sm" data-act="clear">🧽 ぜんぶけす</button></div>`;

  app.innerHTML = `<div class="study">
    <header class="sbar"><button class="x" data-act="quit">✕</button>
      <div class="dots">${S.queue.map((q, i) => `<i class="${i < S.pos ? (S.res[i] && S.res[i].ok ? 'ok' : 'ng') : i === S.pos ? 'cur' : ''}"></i>`).join('')}</div>
      <div class="combo ${S.combo >= 2 ? 'on' : ''}" id="combo">🔥 ${S.combo || 0}コンボ</div>
      <div class="cnt">${S.pos + 1} / ${S.queue.length}</div></header>
    <div class="smain">
      <section class="prompt">
        <div class="tag">${practice ? '✏️ れんしゅう（きろくには のこりません）' : isNew ? '🆕 あたらしい字' : '🔁 ふくしゅう'}　小${D.g}</div>
        <div class="timer"><div class="tbar"><i id="tfill"></i></div><span id="tnum">0.0</span><small>びょう</small></div>
        <div class="yomi">${esc(D.y)}</div>
        <ul class="exs" id="exs">${D.ex.map(([w, r]) => `<li><ruby>${esc(maskWord(w, k))}<rt>${esc(r)}</rt></ruby></li>`).join('')}</ul>
        <div id="msg" class="msg"></div>
        <div id="result"></div>
        <div class="sbtns" id="sbtns">${tools}<button class="btn ghost" data-act="giveup">わからない</button></div>
      </section>
      <section class="padwrap" id="padwrap">
        <svg id="pad" viewBox="0 0 109 109">
          <rect x="1" y="1" width="107" height="107" rx="4" class="pbg"/>
          <line x1="54.5" y1="3" x2="54.5" y2="106" class="pgrid"/><line x1="3" y1="54.5" x2="106" y2="54.5" class="pgrid"/>
          <g id="model"></g><g id="ink"></g><g id="fx"></g><polyline id="cur" class="ink live" points=""/>
        </svg>
        <div class="kaku" id="kaku"></div><div id="stamp"></div>
      </section>
    </div></div>`;

  const pad = $('#pad'), gInk = $('#ink'), gModel = $('#model'), gFx = $('#fx'), curEl = $('#cur'), msg = $('#msg');
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
    gModel.appendChild(svgEl('path', { d: D.s[c.idx], class: 'model m-cur m-anim', pathLength: '1' }));
  }
  // 画を書けたときのキラキラ
  function spark(p, n = 6) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, d = 5 + Math.random() * 8;
      const s = svgEl('circle', { cx: p[0], cy: p[1], r: 1.3, class: 'spark' });
      s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
      s.style.fill = ['#ffb300', '#ff6f91', '#2aa7b8', '#7ccf5f'][i % 4];
      gFx.appendChild(s); setTimeout(() => s.remove(), 520);
    }
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
    for (const v of evs.length ? evs : [e]) drawing.pts.push(pt(v));
    curEl.setAttribute('points', drawing.pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '));
  });
  pad.addEventListener('pointerup', (e) => {
    if (!drawing || e.pointerId !== drawing.id) return;
    const pts = drawing.pts; drawing = null;
    curEl.setAttribute('points', '');
    onStroke(pts);
  });
  pad.addEventListener('pointercancel', (e) => { if (drawing && e.pointerId === drawing.id) { drawing = null; curEl.setAttribute('points', ''); } });

  const inkEl = (pts, cls) => svgEl('polyline', { class: 'ink ' + cls, points: pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') });

  function onStroke(pts) {
    if (c.mode === 'result') return;
    const tgt = targets[c.idx], trace = c.mode === 'trace';
    if (tgt.len >= 12 && pathLen(pts) < 2.5) return; // うっかり触れただけ
    const r = judge(pts, tgt, c.drift, trace);
    if (r.ok) {
      gInk.appendChild(inkEl(pts, 'good'));
      SND.stroke(c.idx);
      spark(pts[pts.length - 1]);
      c.nAcc++;
      const a = 1 / Math.min(c.nAcc, 4); // 書く位置のずれにゆるやかに追従
      c.drift = [c.drift[0] + (r.off[0] * 0.6 - c.drift[0]) * a, c.drift[1] + (r.off[1] * 0.6 - c.drift[1]) * a];
      c.idx++; c.missHere = 0;
      setMsg('');
      if (trace) drawModel('trace'); else if (c.hinted) gModel.innerHTML = '';
      if (c.idx >= D.s.length) return trace ? finishTrace() : finishTest();
      setKaku();
      return;
    }
    // まちがい
    const bad = inkEl(pts, 'bad');
    gFx.appendChild(bad);
    setTimeout(() => bad.remove(), 450);
    SND.miss();
    if (trace) { setMsg('オレンジの線を ● から なぞろう', 'warn'); return; }
    c.miss++; c.missHere++;
    let why = 'ちがうみたい。もういちど！', type = 'shape';
    if (r.reversed) { why = 'かく むきが ぎゃくだよ'; type = 'rev'; }
    else if (targets.some((t, j) => j > c.idx && judge(pts, t, c.drift).ok)) { why = 'かきじゅんが ちがうよ'; type = 'order'; }
    if (!practice) { P.err = P.err || {}; P.err[type] = (P.err[type] || 0) + 1; }
    setMsg(`✕ ${c.idx + 1}画目：${why}`, 'warn');
    if (c.missHere >= 3) { showHint(); setMsg(`${c.idx + 1}画目の ヒントを 見て かこう`, 'warn'); }
  }

  /** 書きかけを消す（all=false なら1画だけ）。まちがいには数えない */
  function erase(all) {
    if (c.mode === 'result' || c.idx === 0) return;
    do { const g = gInk.lastElementChild; if (g) g.remove(); c.idx--; } while (all && c.idx > 0);
    c.missHere = 0;
    if (all) { c.drift = [0, 0]; c.nAcc = 0; c.erased = true; }
    setMsg('');
    if (c.mode === 'trace') drawModel('trace'); else gModel.innerHTML = '';
    setKaku();
  }

  function revealWords() {
    $('#exs').innerHTML = D.ex.map(([w, r]) => `<li><ruby>${esc(w).split(k).join(`<em>${k}</em>`)}<rt>${esc(r)}</rt></ruby></li>`).join('');
  }

  function finishTest() {
    stopTimer();
    c.ms = Math.round(performance.now() - c.t0);
    c.mode = 'result';
    const inTime = c.ms <= limitMs, n = D.s.length;
    const ok = !c.gaveUp && c.miss === 0 && !c.hinted && inTime;
    $('#tnum').textContent = sec(c.ms);
    const prev = P.cards[k];
    const prevBest = prev ? prev.best : null, prevFails = prev ? prev.h.filter((h) => !h[1]).length : 0;
    const wasNg = !!prev && prev.h.length > 0 && !prev.h[prev.h.length - 1][1] && prev.h[prev.h.length - 1][0] < today();
    const neverOk = !!prev && prev.okc === 0;
    const events = [];
    let iv = 0;
    if (!practice) {
      iv = record(k, ok, c.ms, c.gaveUp ? -1 : c.miss);
      P.err = P.err || {};
      if (c.gaveUp) P.err.giveup = (P.err.giveup || 0) + 1;
      else if (!inTime && c.miss === 0 && !c.hinted) P.err.time = (P.err.time || 0) + 1;
    } else if (S.kind === 'zukan') bump('practice');
    S.res[S.pos] = { k, ok, ms: c.ms, miss: c.miss, gaveUp: c.gaveUp };
    revealWords();
    drawModel(c.gaveUp ? 'anim' : 'over');
    setMsg('');
    $('#kaku').textContent = `${n}画`;
    const res = $('#result');
    let popups = [];
    if (ok) {
      const rank = rankOf(c.ms, limitMs);
      S.combo = (S.combo || 0) + 1;
      if (!practice) {
        P.maxCombo = Math.max(P.maxCombo || 0, S.combo);
        if (rank === 'S') bump('S');
        if (n > 8 && c.ms <= 6000) events.push('fast');
        if (n > 12 && c.ms <= 8000) events.push('inazuma');
        if (c.ms >= 7700 && c.ms < 7800) events.push('lucky7');
        if (limitMs - c.ms <= 300) events.push('close');
        if (wasNg) bump('revenge');
        if (neverOk && prevFails >= 3) events.push('nana');
        if (c.erased) events.push('erase');
      }
      const newBest = !practice && prevBest != null && c.ms < prevBest;
      if (newBest) { S.bests = (S.bests || 0) + 1; if (S.bests >= 3) events.push('best3'); }
      const xp = practice ? 2 : 10 + { S: 10, A: 5, B: 0 }[rank] + Math.min(S.combo, 10) * 2;
      S.xp = (S.xp || 0) + xp;
      popups = addXp(xp);
      const lv = practice ? 0 : P.cards[k].lv;
      res.innerHTML = `<div class="res ok"><b>◎ ${PRAISE[Math.floor(Math.random() * PRAISE.length)]}</b>
        <span><i class="rk rk-${rank}">${rank}</i> ${sec(c.ms)}びょう${lv === MASTER_LV ? '　★マスター！' : ''}</span>
        <span class="xp">+${xp} XP${S.combo >= 2 ? `　🔥${S.combo}コンボ` : ''}</span>
        ${newBest ? `<span class="nb">⏱ じこベスト こうしん！（${sec(prevBest)} → ${sec(c.ms)}）</span>` : ''}
        ${practice ? '' : `<small>つぎは ${iv}日ご</small>`}</div>`;
      $('#sbtns').innerHTML = `<button class="btn primary big" data-act="next">${practice && S.pos + 1 >= S.queue.length ? 'おわる' : 'つぎへ'}</button>${practice ? '<button class="btn ghost" data-act="again">もういちど</button>' : ''}`;
      $('#stamp').innerHTML = `<div class="rankstamp rk-${rank}">${rank}</div>`;
      $('#padwrap').classList.add('win');
      const cb = $('#combo'); cb.textContent = `🔥 ${S.combo}コンボ`; cb.classList.toggle('on', S.combo >= 2); cb.classList.add('bump');
      gInk.querySelectorAll('.good').forEach((el, i) => { el.style.animationDelay = i * 0.03 + 's'; el.classList.add('shine'); });
      rank === 'S' ? SND.great() : SND.pass();
      confetti((rank === 'S' ? 45 : rank === 'A' ? 18 : 6) + (S.combo >= 5 ? 30 : 0) + (lv === MASTER_LV ? 40 : 0));
    } else {
      S.combo = 0;
      $('#combo').classList.remove('on');
      SND.fail();
      const why = c.gaveUp ? 'こたえを 見たよ' : [c.miss ? `まちがい ${c.miss}回` : '', c.hinted && !c.miss ? 'ヒントあり' : '', !inTime ? `じかん ${sec(c.ms)}びょう（${P.limit}びょうまで）` : ''].filter(Boolean).join('・');
      res.innerHTML = `<div class="res ng"><b>もういっぽ！</b><span>${why}</span><small>${practice ? 'なぞって おぼえよう' : 'あした もういちど 出るよ'}</small></div>`;
      $('#sbtns').innerHTML = `<button class="btn primary big" data-act="trace">なぞって れんしゅう</button>${practice ? '<button class="btn ghost" data-act="again">もういちど</button>' : ''}<button class="btn ghost" data-act="next">とばす</button>`;
    }
    save();
    popups = popups.concat(checkTrophies({ ev: events }));
    if (popups.length) setTimeout(() => showTrophies(popups), 600);
  }

  function startTrace() {
    c.mode = 'trace'; c.idx = 0; c.drift = [0, 0]; c.nAcc = 0;
    gInk.innerHTML = ''; $('#stamp').innerHTML = '';
    $('#result').innerHTML = '';
    $('#sbtns').innerHTML = `${tools}<button class="btn ghost" data-act="next">とばす</button>`;
    setMsg('オレンジの線を じゅんばんに なぞろう');
    drawModel('trace'); setKaku();
  }
  function finishTrace() {
    c.mode = 'result';
    SND.pass();
    setMsg('');
    bump('trace');
    const popups = addXp(3).concat(checkTrophies());
    $('#result').innerHTML = `<div class="res ok"><b>よく できました</b><span class="xp">+3 XP</span><small>${practice ? '' : 'あした もういちど ちょうせん！'}</small></div>`;
    $('#sbtns').innerHTML = `<button class="btn primary big" data-act="next">${practice && S.pos + 1 >= S.queue.length ? 'おわる' : 'つぎへ'}</button>${practice ? '<button class="btn ghost" data-act="again">もういちど</button>' : ''}`;
    if (popups.length) setTimeout(() => showTrophies(popups), 400);
  }

  const leave = () => go(S.back || viewHome);
  onAct({
    quit: () => (practice ? leave() : go(viewHome)),
    giveup: () => { if (c.mode !== 'test') return; c.gaveUp = true; gInk.innerHTML = ''; finishTest(); },
    undo: () => erase(false),
    clear: () => erase(true),
    trace: startTrace,
    again: () => go(viewStudy, ctx),
    next: () => {
      if (c.mode === 'test') return;
      S.pos++;
      if (!practice) save();
      if (S.pos < S.queue.length) return go(viewStudy, ctx);
      if (!practice) return finishSession();
      const got = S.kind === 'drill' ? (bump('drill'), save(), checkTrophies()) : [];
      leave();
      if (got.length) setTimeout(() => showTrophies(got), 300);
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
  L.fin = true;
  const events = [];
  if (!S.extra && S.res.length >= 5 && S.res.every((r) => r.ok)) { events.push('perfect'); bump('perfect'); }
  if (S.extra) bump('extra');
  if (first && [0, 6].includes(parseD(t).getDay())) bump('weekend');
  if (first && new Date().getHours() < 7) events.push('early');
  const bonus = first ? 30 : 10;
  S.xp = (S.xp || 0) + bonus;
  save();
  const got = addXp(bonus).concat(checkTrophies({ ev: events }));
  go(viewSummary, { first, got, bonus });
}

function viewSummary({ first, got, bonus }) {
  const S = P.session, okN = S.res.filter((r) => r.ok).length, st = streak(P);
  const maxCombo = S.res.reduce((a, r) => (r.ok ? [Math.max(a[0], a[1] + 1), a[1] + 1] : [a[0], 0]), [0, 0])[0];
  app.innerHTML = `<div class="page narrow center">
    <div class="stamp">💮</div>
    <h2>${S.extra ? 'おつかれさま！' : 'きょうのぶん おわり！'}</h2>
    <div class="sumrow"><div><b>${okN}</b><small>／${S.res.length} ごうかく</small></div><div><b>🔥${st}</b><small>日れんぞく</small></div>
      <div><b>${maxCombo}</b><small>さいだいコンボ</small></div><div><b>+${S.xp || 0}</b><small>XP（ボーナス ${bonus}）</small></div></div>
    <div class="sumlist">${S.res.map((r) => `<div class="si ${r.ok ? 'ok' : 'ng'}"><span class="kj">${r.k}</span><span>${r.ok ? '◎' : '✕'}</span><small>${r.gaveUp ? '—' : sec(r.ms) + 's'}</small></div>`).join('')}</div>
    <p class="note">✕の字は あした もういちど 出ます。◎の字は 少しずつ 間を あけて また出ます。</p>
    <button class="btn primary big" data-act="home">ホームへ</button></div>`;
  onAct({ home: () => go(viewHome) });
  if (first) confetti(90);
  SND.great();
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
    <p class="note">字を タップすると かきじゅんを 見たり、その場で れんしゅうしたり できます。まだ 出ていない字は「？」。まいにちの れんしゅうで 字が あらわれて、ごうかくが つづくと 金色の ★マスターに なります。</p>
  </div>`;
  onAct({
    home: () => go(viewHome),
    tab: (el) => { zukanGrade = +el.dataset.g; go(viewZukan); },
    k: (el) => showKanji(el.dataset.k),
  });
}
function showKanji(k, back = viewZukan) {
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
      <div class="row"><button class="btn" data-x="replay">▶ かきじゅん</button><button class="btn primary" data-x="practice">✏️ れんしゅうする</button><button class="btn" data-x="close">とじる</button></div></div></div>`;
  document.body.appendChild(m);
  m.onclick = (e) => {
    const x = e.target.dataset.x;
    if (x === 'close' || e.target === m) m.remove();
    if (x === 'practice') { m.remove(); go(viewStudy, { queue: [k], pos: 0, res: [], practice: true, kind: 'zukan', back }); }
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
    <section class="tgrid">${shown.map((x) => { const d = P.trophies[x.id]; const hide = x.secret && !d;
      return `<div class="tr ${d ? 'on' : ''} ${x.big ? 'big' : ''} ${x.secret ? 'sec' : ''}"><div class="ti">${d ? x.icon : hide ? '❓' : '🔒'}</div><b>${hide ? 'ひみつ' : esc(x.name)}</b><small>${d ? esc(x.desc) + '（' + d.slice(5).replace('-', '/') + '）' : hide ? '？？？' : esc(x.desc)}</small></div>`; }).join('')}</section>
  </div>`;
  onAct({ home: () => go(viewHome) });
}

// ───────── ぶんせき（にがて さがし） ─────────
function viewAnalysis() {
  const cards = Object.entries(P.cards).filter(([k]) => KD[k]);
  const pct = (ok, n) => (n ? Math.round((ok / n) * 100) : 0);
  // にがてな字：まだ立ち直っていない字（lv0）を先に、✕の多い順
  const weak = cards.filter(([, c]) => c.n > c.okc)
    .map(([k, c]) => ({ k, c, f: c.n - c.okc }))
    .sort((a, b) => (a.c.lv ? 1 : 0) - (b.c.lv ? 1 : 0) || b.f - a.f || a.c.okc / a.c.n - b.c.okc / b.c.n);
  // おそい字：合格したときの平均タイムが長い順
  const slow = cards.map(([k, c]) => { const t = c.h.filter((h) => h[1]).map((h) => h[2]); return { k, avg: t.length ? t.reduce((a, b) => a + b, 0) / t.length : 0, per: 0 }; })
    .filter((x) => x.avg).map((x) => ({ ...x, per: x.avg / KD[x.k].s.length })).sort((a, b) => b.per - a.per).slice(0, 10);
  const group = (keyOf) => {
    const G = {};
    for (const [k, c] of cards) {
      const key = keyOf(k), g = G[key] || (G[key] = { key, n: 0, ok: 0, ks: [], t: 0, tn: 0 });
      g.n += c.n; g.ok += c.okc; g.ks.push(k);
      for (const h of c.h) if (h[1]) { g.t += h[2]; g.tn++; }
    }
    return Object.values(G);
  };
  const rads = group((k) => KD[k].r || '？').filter((g) => g.n >= 2).sort((a, b) => a.ok / a.n - b.ok / b.n || b.n - a.n);
  const bucket = (n) => (n <= 6 ? '1〜6画' : n <= 9 ? '7〜9画' : n <= 12 ? '10〜12画' : n <= 15 ? '13〜15画' : '16画〜');
  const order = ['1〜6画', '7〜9画', '10〜12画', '13〜15画', '16画〜'];
  const kaku = group((k) => bucket(KD[k].s.length)).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  const E = P.err || {}, eTotal = ['order', 'rev', 'shape', 'time', 'giveup'].reduce((a, x) => a + (E[x] || 0), 0);
  const eRow = (id, label, tip) => `<div class="erow"><span>${label}<small>${tip}</small></span><div class="bar"><i class="be" style="width:${eTotal ? ((E[id] || 0) / eTotal) * 100 : 0}%"></i></div><b>${E[id] || 0}回</b></div>`;
  const row = (g, label, sub) => { const p = pct(g.ok, g.n); return `<button class="rrow ${p < 70 ? 'weak' : ''}" data-act="drill" data-ks="${g.ks.join('')}">
      <span class="rc">${label}</span><span class="rn">${sub}<small>${g.ks.slice(0, 12).join(' ')}</small></span>
      <div class="bar"><i class="${p < 70 ? 'bw' : 'b1'}" style="width:${p}%"></i></div><b>${p}%</b><small>${g.tn ? sec(g.t / g.tn) + 's' : '—'}</small></button>`; };
  const empty = '<p class="note">まだ データが ありません。まいにちの れんしゅうを すると ここに 出てきます。</p>';
  const weakRad = rads.filter((g) => pct(g.ok, g.n) < 70).slice(0, 3);
  app.innerHTML = `<div class="page">
    <header class="top"><button class="btn back" data-act="home">← もどる</button><h2>📊 ${esc(P.name)}の ぶんせき</h2><span></span></header>
    ${cards.length ? `<section class="card advice"><b>🔎 いまの ようす</b>
      <p>${weak.length ? `にがてな字は <b>${weak.length}字</b>。` : 'にがてな字は ありません。すばらしい！'}
      ${weakRad.length ? `とくに ${weakRad.map((g) => `「${g.key}」${RNAME[g.key] ? '（' + RNAME[g.key] + '）' : ''}`).join('・')}の 字で まちがいが 多めです。` : ''}
      ${eTotal ? `まちがいで いちばん 多いのは「${[['order', 'かきじゅん'], ['rev', 'かく むき'], ['shape', '字の かたち'], ['time', 'じかんぎれ'], ['giveup', 'おもい出せない']].sort((a, b) => (E[b[0]] || 0) - (E[a[0]] || 0))[0][1]}」です。` : ''}</p>
      ${weak.length ? `<button class="btn primary" data-act="drill" data-ks="${weak.slice(0, 10).map((w) => w.k).join('')}" data-kind="drill">🥊 にがて とっくん（${Math.min(10, weak.length)}字）</button>` : ''}</section>` : ''}
    <h3>にがてな字</h3>
    ${weak.length ? `<section class="wgrid">${weak.slice(0, 24).map((w) => `<button class="wk ${w.c.lv ? '' : 'hot'}" data-act="k" data-k="${w.k}"><span>${w.k}</span><small>✕${w.f}／${w.c.n}回</small></button>`).join('')}</section>` : empty}
    <h3>部首べつ（にがてな じゅん）</h3>
    ${rads.length ? `<section class="rlist">${rads.slice(0, 14).map((g) => row(g, g.key, RNAME[g.key] || '')).join('')}</section><p class="note">ぎょうを タップすると、その 部首の字だけ れんしゅうできます。右の びょうは ごうかくした ときの 平均タイム。</p>` : empty}
    <h3>画数べつ</h3>
    ${kaku.length ? `<section class="rlist">${kaku.map((g) => row(g, '✍️', g.key)).join('')}</section>` : empty}
    <h3>まちがいの タイプ</h3>
    ${eTotal ? `<section class="card">${eRow('order', 'かきじゅん', '画の じゅんばんが ちがう')}${eRow('rev', 'かく むき', '下から上、右から左 など')}${eRow('shape', '字の かたち', '画の かたちや ばしょが ちがう')}${eRow('time', 'じかんぎれ', '正しく かけたが おそい')}${eRow('giveup', 'おもい出せない', '「わからない」を おした')}</section>` : empty}
    <h3>じかんが かかる字（1画あたり）</h3>
    ${slow.length ? `<section class="wgrid">${slow.map((x) => `<button class="wk" data-act="k" data-k="${x.k}"><span>${x.k}</span><small>${sec(x.avg)}s／${KD[x.k].s.length}画</small></button>`).join('')}</section>` : empty}
  </div>`;
  onAct({
    home: () => go(viewHome),
    k: (el) => showKanji(el.dataset.k, viewAnalysis),
    drill: (el) => go(viewStudy, { queue: shuffle([...el.dataset.ks]).slice(0, 10), pos: 0, res: [], practice: true, kind: el.dataset.kind || 'rad', back: viewAnalysis }),
  });
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
