import { samplePath, judge, pathLen } from './matcher.js';
import { freeJudge } from './freejudge.js';
import { tone, audioCfg, setBgm, refreshBgm, resetAudio } from './audio.js';
import { kanjiTip, mistakeTip, theoryOf, theoryFig, THEORIES } from './tips.js';
import { kanSay, kanCutIn } from './kan.js';
import { cloudReady, pullAll, pushProfile } from './cloud.js';

// ───────── 基本設定 ─────────
const LS_KEY = 'kanjiapp.v1';
const INTERVALS = [1, 3, 7, 14, 30, 60, 120]; // 合格が続くたびに伸びる復習間隔（日）
const MASTER_LV = 4;                          // 4回連続合格で「マスター」
const GRADES = [3, 4, 5, 6, 7, 8, 9, 10]; // 7〜9＝中1〜中3、10＝高校（常用漢字ののこり）
const gname = (g) => (g <= 6 ? '小' + g : g <= 9 ? '中' + (g - 6) : '高校');
const byNum = (a, b) => a - b;
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
    if (d && Array.isArray(d.profiles)) { d.profiles.forEach(migrate); return d; }
  } catch { /* 初回 */ }
  return { v: 1, profiles: [], current: null, sound: true, pen: 'auto' };
}
/** 古い記録の形を今の形にそろえる（XP → ゼニー など） */
function migrate(p) {
  if (p.zeni == null) p.zeni = (p.xp || 0) * 10000;
  p.cards = p.cards || {}; p.log = p.log || {}; p.trophies = p.trophies || {};
  return p;
}
function saveLocal() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(DB)); }
  catch (e) { alert('きろくの ほぞんに しっぱいしました: ' + e.message); }
}
function save() { saveLocal(); schedulePush(); }
function newProfile(name, avatar, grades) {
  return {
    id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name, avatar, grades, daily: 10, limit: 10,
    cards: {}, log: {}, trophies: {}, total: 0, zeni: 0, session: null, upd: Date.now(),
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
/** 中学以上の字は「あとで採点」（書き順を まちがえても さいごまで 書ける） */
const isFree = (k) => !!KD[k] && KD[k].g >= 7;
/** 小学校の字を 先に、中学以上の字を あとに（採点のしかたが 1回の出題で 何度も 入れかわらないように） */
const byMode = (q) => q.filter((k) => !isFree(k)).concat(q.filter(isFree));
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function pool(p) { return [...p.grades].sort(byNum).flatMap((g) => GL[g] || []); }
function dueList(p) {
  const t = today();
  // 期限の古い順、同じ日なら不合格だった字（lv0）を先に
  return pool(p).filter((k) => p.cards[k] && p.cards[k].due <= t)
    .sort((a, b) => p.cards[a].due.localeCompare(p.cards[b].due) || p.cards[a].lv - p.cards[b].lv);
}
/** その人だけの「字が出てくる順番」。学年ごとに、人ごとにちがう順でまぜる（どの端末でも同じ順になる） */
const orderCache = {};
function gradeOrder(p, g) {
  const key = p.id + ':' + g;
  if (orderCache[key]) return orderCache[key];
  let h = 2166136261;
  for (const ch of key) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const rnd = () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const a = [...(GL[g] || [])];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return (orderCache[key] = a);
}
function freshList(p) { return [...p.grades].sort(byNum).flatMap((g) => gradeOrder(p, g)).filter((k) => !p.cards[k]); }

/** きょうの出題：復習を優先しつつ、新しい字も最低2字は入れる */
function buildQueue(p) {
  const n = p.daily, due = dueList(p), fresh = freshList(p);
  const nNew = Math.min(fresh.length, Math.max(n - due.length, Math.min(2, n)));
  return byMode(shuffle(due.slice(0, n - nNew).concat(fresh.slice(0, nNew))));
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
  // それでも たりなければ、きょう もう書いた字から（きょう ✕だった字 → 書いてから 時間が たった字）
  if (q.length < n) {
    const t = today(), lastOk = (k) => { const h = p.cards[k].h.filter((x) => x[0] === t); return h.length ? h[h.length - 1][1] : 1; };
    const again = pool(p).filter((k) => p.cards[k] && done.has(k) && !q.includes(k))
      .sort((a, b) => lastOk(a) - lastOk(b) || p.cards[a].h.length - p.cards[b].h.length);
    q = q.concat(again.slice(0, n - q.length));
  }
  return byMode(shuffle(q));
}
/** flaw=true：中学以上の字で、形は 合っているが 書き順・向きが ちがう 合格 */
function record(k, ok, ms, miss, flaw = false) {
  const t = today();
  const c = P.cards[k] || (P.cards[k] = { lv: 0, due: t, n: 0, okc: 0, best: null, h: [] });
  c.n++;
  let iv = 1;
  if (ok) {
    iv = INTERVALS[Math.min(c.lv, INTERVALS.length - 1)];
    c.lv = flaw ? Math.max(c.lv, Math.min(c.lv + 1, MASTER_LV - 1)) : c.lv + 1; // ★マスターは 書き順も かんぺきな ときだけ
    c.okc++;
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
  const s = { passed: 0, mastered: 0, best: Infinity, total: p.total || 0, streak: streak(p), g: {}, rad: {}, pref: 0, big: 0, zeni: p.zeni || 0, cnt: p.cnt || {}, maxCombo: p.maxCombo || 0 };
  for (const g of GRADES) s.g[g] = { passed: 0, mastered: 0, ok: 0, learning: 0, n: (GL[g] || []).length };
  for (const [k, c] of Object.entries(p.cards)) {
    const g = KD[k] && KD[k].g; if (!g) continue;
    if (c.okc > 0) {
      s.passed++; s.g[g].passed++;
      const r = KD[k].r; s.rad[r] = (s.rad[r] || 0) + 1;
      if (PREF_KANJI.includes(k)) s.pref++;
      if (KD[k].s.length >= 15) s.big++;
    }
    if (c.lv >= MASTER_LV) { s.mastered++; s.g[g].mastered++; } else if (c.lv >= 1) s.g[g].ok++; else s.g[g].learning++;
    if (c.best != null && c.best < s.best) s.best = c.best;
  }
  return s;
}

// ───────── ゼニー（ごほうびのお金） ─────────
/** 1234万、3億5000万 のように、千・万・億・兆を漢字で書く */
function fmtZ(n) {
  n = Math.max(0, Math.floor(n));
  if (n < 1000) return String(n);
  const cho = Math.floor(n / 1e12), oku = Math.floor((n % 1e12) / 1e8), man = Math.floor((n % 1e8) / 1e4), sen = Math.floor((n % 1e4) / 1000);
  let s = '';
  if (cho) s += cho.toLocaleString('ja-JP') + '兆';
  if (oku) s += oku + '億';
  if (man && !cho) s += man + '万';
  if (!cho && !oku && man < 100 && sen) s += sen + '千';
  return s;
}
const ZTITLES = [[0, 'かけだし'], [1e7, 'おこづかい長者'], [5e7, '小金もち'], [1e8, '億万長者'], [1e9, '大富豪'], [1e10, 'かん字財閥'], [1e11, 'でんせつの大王']];
const ztitle = (z) => ZTITLES.filter((t) => t[0] <= z).pop()[1];
const addZ = (n) => { P.zeni = (P.zeni || 0) + Math.round(n); };
const prizeOf = (t) => (t.big ? 1e8 : t.secret ? 7770000 : 3000000);
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
  // お金もち
  { id: 'z1000', icon: '💰', name: '1000万ゼニー', desc: '1000万ゼニー ためる', ok: (s) => s.zeni >= 1e7 },
  { id: 'z1oku', icon: '💎', name: '億万長者', desc: '1億ゼニー ためる', ok: (s) => s.zeni >= 1e8 },
  { id: 'z10oku', icon: '🏰', name: '大富豪', desc: '10億ゼニー ためる', ok: (s) => s.zeni >= 1e9 },
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
  { id: 'ko2', icon: '💥', name: 'ダブル ノックアウト', desc: '1日に 2回 カン君を たおす', secret: true, ok: ev('ko2') },
  { id: 'kansleep', icon: '😵', name: 'カン君を ノックアウト', desc: 'すごすぎて カン君が ぶったおれた', secret: true, ok: ev('kansleep') },
  { id: 'erase', icon: '🧽', name: 'けしゴム マスター', desc: '「ぜんぶけす」を つかっても ごうかく', secret: true, ok: ev('erase') },
  ...GRADES.flatMap((g) => [
    { id: `g${g}all`, icon: '🏅', name: `${gname(g)} ぜんぶ ごうかく`, desc: `${gname(g)}の かん字を ぜんぶ 1回 ごうかく`, grade: g, ok: (s) => s.g[g].n > 0 && s.g[g].passed >= s.g[g].n },
    { id: `g${g}master`, icon: '🏆', name: `${gname(g)} かん字マスター`, desc: `${gname(g)}の かん字を ぜんぶ ★マスター`, grade: g, big: true, ok: (s) => s.g[g].n > 0 && s.g[g].mastered >= s.g[g].n },
  ]),
];
function checkTrophies(ctx = {}) {
  const s = stats(P), got = [];
  for (const t of TROPHIES) {
    if (!P.trophies[t.id] && t.ok(s, ctx)) { P.trophies[t.id] = today(); addZ(prizeOf(t)); got.push(t); }
  }
  if (got.length) save();
  return got;
}

// ───────── 効果音・演出 ─────────
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
    <div class="tprize">💰 しょうきん +${fmtZ(prizeOf(t))}ゼニー</div>
    <button class="btn primary">やったー！</button></div>`;
  document.body.appendChild(m);
  $('button', m).onclick = () => { m.remove(); showTrophies(list.slice(1), done); };
}

// ───────── クラウド同期 ─────────
let syncing = false, pushTimer = null, inStudy = false, syncMsg = '', curView = null, pendingReload = false;
const CUT_MS = 2400;
// とびだす演出（カットイン）は 前の字の 画面で じゅんばんに 出しきる。つぎの字では すぐ 書きはじめられる
let cutQ = [], cutCur = null, cutTimer = 0, cutDone = null;
/** wait ミリ秒 まってから 出す。pre は 出す直前に よぶ（音・カン君のセリフ） */
function queueCut(text, mood, pre, wait = 0) { cutQ.push({ text, mood, pre, wait }); if (!cutCur) playCut(); }
function playCut() {
  const x = cutQ.shift();
  if (!x) { cutCur = null; const f = cutDone; cutDone = null; if (f) f(); return; }
  cutCur = { x, el: null };
  if (x.wait) cutTimer = setTimeout(showCut, x.wait); else showCut();
}
function showCut() {
  const x = cutCur.x;
  if (x.pre) x.pre();
  cutCur.el = kanCutIn(x.text, x.mood);
  cutCur.el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); endCut(); });
  cutTimer = setTimeout(endCut, CUT_MS);
}
/** いまの カットインを おわらせて つぎへ（タップで とばすときも）。待ち中なら すぐ 出す */
function endCut() {
  if (!cutCur) return;
  clearTimeout(cutTimer);
  if (!cutCur.el) { showCut(); return; }
  cutCur.el.remove(); cutCur = null; playCut();
}
function clearCuts() { cutQ = []; cutDone = null; clearTimeout(cutTimer); if (cutCur && cutCur.el) cutCur.el.remove(); cutCur = null; }
const cutBusy = () => !!cutCur || cutQ.length > 0;
const cloudOn = () => cloudReady() && !!DB.family;
const pickCard = (a, b) => (!a ? b : !b ? a : a.n !== b.n ? (a.n > b.n ? a : b) : a.due >= b.due ? a : b);
const keysOf = (x, y) => new Set([...Object.keys(x || {}), ...Object.keys(y || {})]);
/** 2台の記録を合流させる。字ごとに「たくさん書いたほう」を採用する */
function mergeProfile(a, b) {
  const m = { ...((a.upd || 0) >= (b.upd || 0) ? a : b), cards: {}, log: {}, trophies: {}, cnt: {}, err: {} };
  for (const k of keysOf(a.cards, b.cards)) m.cards[k] = pickCard((a.cards || {})[k], (b.cards || {})[k]);
  for (const d of keysOf(a.log, b.log)) {
    const x = (a.log || {})[d], y = (b.log || {})[d], w = !x ? y : !y ? x : x.n >= y.n ? x : y;
    m.log[d] = { n: w.n, ok: w.ok };
    if ((x && x.fin) || (y && y.fin)) m.log[d].fin = true;
  }
  for (const id of keysOf(a.trophies, b.trophies)) {
    const x = (a.trophies || {})[id], y = (b.trophies || {})[id];
    m.trophies[id] = !x ? y : !y ? x : x < y ? x : y;
  }
  for (const f of ['cnt', 'err']) for (const k of keysOf(a[f], b[f])) m[f][k] = Math.max((a[f] || {})[k] || 0, (b[f] || {})[k] || 0);
  for (const f of ['total', 'zeni', 'maxCombo']) m[f] = Math.max(a[f] || 0, b[f] || 0);
  m.kanSleep = (a.kanSleep || '') > (b.kanSleep || '') ? a.kanSleep : b.kanSleep;
  const sa = a.session, sb = b.session;
  m.session = !sa ? sb : !sb ? sa : sa.date !== sb.date ? (sa.date > sb.date ? sa : sb) : sa.pos >= sb.pos ? sa : sb;
  return m;
}
async function syncNow() {
  if (!cloudOn() || syncing || inStudy) return false;
  syncing = true;
  try {
    const remote = await pullAll(DB.family), dead = DB.deleted || [], seen = {};
    for (const r of remote) {
      if (!r || !r.id) continue;
      if (dead.includes(r.id)) continue; // この端末では「外した」人。クラウドには残る
      seen[r.id] = JSON.stringify(r);
      const l = DB.profiles.find((p) => p.id === r.id);
      if (l) Object.assign(l, mergeProfile(l, r)); else DB.profiles.push(migrate(r));
    }
    saveLocal();
    for (const p of DB.profiles) if (JSON.stringify(p) !== seen[p.id]) await pushProfile(DB.family, p);
    DB.lastSync = Date.now(); syncMsg = '';
    saveLocal();
    return true;
  } catch (e) { syncMsg = e.message; return false; }
  finally { syncing = false; }
}
function schedulePush() {
  if (!cloudOn() || !P) return;
  clearTimeout(pushTimer);
  const p = P;
  pushTimer = setTimeout(() => { pushProfile(DB.family, p).then(() => { syncMsg = ''; }).catch((e) => { syncMsg = e.message; }); }, 4000);
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { if (cloudOn() && P) { clearTimeout(pushTimer); pushProfile(DB.family, P).catch(() => {}); } }
  else syncNow().then((ok) => { if (ok && (curView === viewProfiles || curView === viewHome)) go(curView); });
});
function applyAudio() { audioCfg.sfx = DB.sound !== false; audioCfg.bgm = DB.bgm !== false; refreshBgm(); }

// ───────── 画面ルーティング ─────────
let cleanup = null;
function go(render, ...args) {
  if (cleanup) { cleanup(); cleanup = null; }
  if (pendingReload && render !== viewStudy) { location.reload(); return; }
  app.onclick = null; app.onchange = null;
  window.scrollTo(0, 0);
  curView = render;
  render(...args);
}
function onAct(map) {
  app.onclick = (e) => {
    const el = e.target.closest('[data-act]');
    if (el && map[el.dataset.act]) map[el.dataset.act](el, e);
  };
}

// ───────── プロフィール選択（かぞくランキング） ─────────
/** その日に はじめて ごうかくした字の 数（＝おぼえた字が ふえた数） */
function gainOn(p, d) {
  let n = 0;
  for (const [k, c] of Object.entries(p.cards)) {
    if (!KD[k]) continue;
    const oks = c.h.filter((h) => h[1]);
    if (oks.length && oks.length >= c.okc && oks[0][0] === d) n++; // 記録が けずられた 古い字は のぞく
  }
  return n;
}
function ranking() {
  return DB.profiles.map((p) => ({ p, s: stats(p) }))
    .sort((a, b) => b.s.passed - a.s.passed || b.s.mastered - a.s.mastered || (b.p.zeni || 0) - (a.p.zeni || 0));
}
/** ランキングの「いきおい」：きょう・きのう おぼえた字の ふえた数 */
function momentum(p) {
  const t = today(), y = addDays(t, -1), a = gainOn(p, t), b = gainOn(p, y);
  const cell = (label, n, d) => `<i class="${n ? 'up' : p.log[d] ? '' : 'none'}">${label} <b>${n ? '+' + n : p.log[d] ? '±0' : 'お休み'}</b></i>`;
  return `<span class="rmom">${a >= 5 && a > b ? '🚀' : a > 0 ? '📈' : '　'}${cell('きょう', a, t)}${cell('きのう', b, y)}</span>`;
}
function viewProfiles() {
  const R = ranking(), top = Math.max(1, R.length ? R[0].s.passed : 0);
  const rows = R.map(({ p, s }, i) => `<button class="rank r${i + 1}" data-act="pick" data-id="${p.id}">
      <span class="rno"><i>${['👑', '🥈', '🥉'][i] || ''}</i><b>${i + 1}</b><small>位</small></span>
      <span class="rav">${p.avatar}</span>
      <span class="rmain"><span class="rname">${esc(p.name)}<small>${[...p.grades].sort(byNum).map(gname).join('・')}</small></span>
        <span class="rbar"><i style="width:${(s.passed / top) * 100}%"></i></span>${momentum(p)}</span>
      <span class="rnum"><b>${s.passed}</b><small>字 おぼえた</small></span>
      <span class="rsub"><span>💰 ${fmtZ(p.zeni || 0)}</span><span>🔥 ${s.streak}日れんぞく</span><span>★マスター ${s.mastered}字</span></span></button>`).join('');
  app.innerHTML = `<div class="page narrow center">
    <h1 class="logo">かん字 かきとり<small>かいて おぼえる</small></h1>
    ${kanSay(DB.profiles.length ? 'だれが やる？ なまえを タップしてね！' : 'はじめまして、カン君だよ！ さいしょに つかう人を とうろくしてね。', 'happy', 'mid')}
    ${DB.profiles.length ? `<h2 class="rtitle">🏆 かぞく ランキング<small>おぼえた かん字の 数で しょうぶ！</small></h2><div class="ranks">${rows}</div>
      <p class="note rlegend">📈 きょう・きのう＝その日に はじめて ごうかくした字の 数　★マスター＝日を あけて 4回 つづけて ごうかくした字</p>` : ''}
    <div class="row"><button class="btn" data-act="add">＋ 人を ついか</button>${cloudReady() && !DB.family ? '<button class="btn" data-act="cloud">☁️ ほかの端末の きろくを よびだす</button>' : ''}</div>
    ${cloudOn() ? `<p class="note">☁️ ${syncMsg ? 'どうきエラー: ' + esc(syncMsg) : DB.lastSync ? 'クラウドと どうきずみ' : 'どうき中…'}　<button class="linkbtn" data-act="resync">いま どうきする</button></p>` : ''}
    <p class="ver">v${VERSION}</p>
  </div>`;
  onAct({
    pick: (el) => { DB.current = el.dataset.id; saveLocal(); P = DB.profiles.find((p) => p.id === DB.current); go(viewHome); },
    add: () => go(viewProfileForm, null),
    cloud: () => go(viewCloudLink),
    resync: async () => { await syncNow(); go(viewProfiles); },
  });
}
/** 人がまだいない端末でも、合言葉を入れて記録をよびだせる画面 */
function viewCloudLink() {
  app.innerHTML = `<div class="page narrow">
    <header class="top"><button class="btn back" data-act="back">← もどる</button><h2>☁️ きろくを よびだす</h2><span></span></header>
    <section class="card">
      <p>ほかの端末で 使っている <b>合言葉</b>を 入れると、同じ人・同じ きろくが この端末にも 出てきます。</p>
      <p class="note">合言葉は、すでに使っている端末の「せってい → ☁️ クラウド同期」に 表示されています。まだ どの端末でも 同期を 始めていない場合は、先に そちらで 合言葉を 作ってください。</p>
      <label class="fld">合言葉<input id="fam" type="text" maxlength="40" placeholder="合言葉を 入れる" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
      <div class="row"><button class="btn primary" data-act="link">よびだす</button></div>
      <p class="note" id="linkmsg"></p>
    </section></div>`;
  onAct({
    back: () => go(viewProfiles),
    link: async () => {
      const code = $('#fam').value.trim();
      if (code.length < 12) return alert('合言葉は 12文字以上です。もういちど たしかめてください。');
      $('#linkmsg').textContent = 'よびだし中…';
      const before = DB.profiles.length;
      DB.family = code; saveLocal();
      const ok = await syncNow();
      if (!ok) { DB.family = ''; saveLocal(); $('#linkmsg').textContent = ''; return alert('同期できませんでした: ' + syncMsg); }
      if (DB.profiles.length === before) {
        const keep = confirm('この合言葉には まだ だれの きろくも ありませんでした。合言葉が 1文字でも ちがうと べつの場所に なります。\n\nこのまま この合言葉で 同期を つづけますか？（「キャンセル」で 入れなおし）');
        if (!keep) { DB.family = ''; saveLocal(); $('#linkmsg').textContent = '合言葉を たしかめて、もういちど 入れてください。'; return; }
      }
      go(viewProfiles);
    },
  });
}
function viewProfileForm(p) {
  const cur = p || { name: '', avatar: AVATARS[DB.profiles.length % AVATARS.length], grades: [4] };
  app.innerHTML = `<div class="page narrow">
    <h2>${p ? 'プロフィールを なおす' : 'あたらしい プロフィール'}</h2>
    <label class="fld">なまえ<input id="pn" type="text" maxlength="12" value="${esc(cur.name)}" placeholder="なまえ" autocomplete="off"></label>
    <div class="fld">アイコン<div class="avs">${AVATARS.map((a) => `<button class="av ${a === cur.avatar ? 'on' : ''}" data-act="av" data-a="${a}">${a}</button>`).join('')}</div></div>
    <div class="fld">べんきょうする 学年<div class="grs">${GRADES.map((g) => `<label class="chk"><input type="checkbox" value="${g}" ${cur.grades.includes(g) ? 'checked' : ''}>${gname(g)}（${GL[g].length}字）</label>`).join('')}</div></div>
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
      if (p) { p.name = name; p.avatar = avatar; p.grades = grades; p.session = null; p.upd = Date.now(); save(); go(viewSettings); }
      else { DB.profiles.push(newProfile(name, avatar, grades)); save(); go(viewProfiles); syncNow(); }
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
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(t, -i), L = P.log[d];
    week.push(`<div class="wd ${L && L.fin ? 'fin' : L ? 'part' : ''} ${i === 0 ? 'today' : ''}"><span>${'日月火水木金土'[parseD(d).getDay()]}</span><b>${L && L.fin ? '💮' : L ? '✏️' : '・'}</b></div>`);
  }
  // この7日間に れんしゅうした字・ごうかくした字
  const from = addDays(t, -6);
  let wk = 0, wkOk = 0;
  for (const c of Object.values(P.cards)) {
    const hs = c.h.filter((h) => h[0] >= from);
    if (hs.length) { wk++; if (hs.some((h) => h[1])) wkOk++; }
  }
  let main, talk;
  if (st.kind === 'new') {
    const q = buildQueue(P);
    if (q.length) {
      main = `<div class="todo">きょうは <b>${q.length}</b>字<small>ふくしゅう ${q.filter((k) => P.cards[k]).length}字 ／ あたらしい字 ${q.filter((k) => !P.cards[k]).length}字</small></div>
         <button class="btn primary huge" data-act="start">はじめる</button>`;
      talk = [`${esc(P.name)}、きょうも いっしょに がんばろう！`, s.streak >= 2 ? `${s.streak}日 れんぞく中！ きょうも つなげよう！` : 'ゆっくりで いいよ。ていねいに かこう！'][s.streak >= 2 ? 1 : 0];
    } else {
      main = `<div class="todo">きょう やる字は ありません 🎉</div><button class="btn" data-act="more">それでも れんしゅうする</button>`;
      talk = 'ぜんぶ おわってる！ すごすぎる！';
    }
  } else if (st.kind === 'resume') {
    main = `<div class="todo">あと <b>${st.left}</b>字</div><button class="btn primary huge" data-act="resume">つづきから</button>`;
    talk = 'おかえり！ つづきから いこう！';
  } else {
    main = `<div class="todo done">💮 きょうのぶんは おわり！</div><div class="row"><button class="btn" data-act="more" data-n="5">もっとやる（＋5字）</button><button class="btn" data-act="more" data-n="10">もっとやる（＋10字）</button></div>`;
    talk = 'きょうも えらい！ また あした まってるよ。';
  }
  let kmood = st.kind === 'done' ? 'happy' : 'normal';
  let kdmg = 0;
  if (P.kanSleep === t) { talk = `ピヨピヨ… ${esc(P.name)}に ボコボコに されて たおれています…（「もっとやる」で もう1回 しょうぶ できるよ）`; kmood = 'ko'; }
  else if (P.kanSleep === addDays(t, -1)) { talk = `いてて… きのうは ${esc(P.name)}に ボコボコに されたよ。きょうこそ まけないぞ！`; kmood = 'fire'; kdmg = 1; }
  const grades = [...P.grades].sort(byNum).map((g) => {
    const x = s.g[g], rest = x.n - x.mastered - x.ok - x.learning;
    return `<div class="gst"><div class="gl">${gname(g)}<small>${Math.round((x.passed / x.n) * 100)}%　${x.passed} ／ ${x.n}字 ごうかく</small></div>
      <div class="seg"><i class="s-star" style="flex:${x.mastered}"></i><i class="s-ok" style="flex:${x.ok}"></i><i class="s-learn" style="flex:${x.learning}"></i><i class="s-rest" style="flex:${rest}"></i></div>
      <div class="gleg"><span><i class="s-star"></i>★マスター <b>${x.mastered}</b></span><span><i class="s-ok"></i>ごうかく <b>${x.ok}</b></span><span><i class="s-learn"></i>がくしゅう中 <b>${x.learning}</b></span><span><i class="s-rest"></i>まだ <b>${rest}</b></span></div></div>`;
  }).join('');
  const R = ranking(), myRank = R.findIndex((r) => r.p === P) + 1;
  app.innerHTML = `<div class="page">
    <header class="top"><button class="who" data-act="switch"><span>${P.avatar}</span>${esc(P.name)}<small>きりかえ</small></button>
      <div class="chips">${R.length > 1 ? `<span class="chip rankc">${['👑', '🥈', '🥉'][myRank - 1] || '🏅'} かぞく ${myRank}位</span>` : ''}<span class="chip fire">🔥 ${s.streak}日れんぞく</span><span class="chip">🏆 ${Object.keys(P.trophies).length}</span></div></header>
    <section class="wallet"><span class="wicon">💰</span><b>${fmtZ(P.zeni || 0)}</b><small>ゼニー</small><span class="wtitle">${ztitle(P.zeni || 0)}</span></section>
    <section class="hero">${kanSay(talk, kmood, '', kdmg)}${main}</section>
    <section class="week">${week.join('')}</section>
    <p class="wsum">この7日間　✏️ <b>${wk}</b>字 れんしゅう　◎ <b>${wkOk}</b>字 ごうかく</p>
    <section class="card">${grades}</section>
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
    more: (el) => { const q = buildExtra(P, +el.dataset.n || 5); if (q.length) begin(q, true); else alert('えらんでいる 学年に 字が ありません。「せってい → 名前・学年を変える」で 学年を えらんでください。'); },
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
  const tip = kanjiTip(targets);
  const limitMs = P.limit * 1000;
  const isNew = !P.cards[k];
  const free = isFree(k); // 中学以上の字：さいごに まとめて 採点
  const c = { wrote: [], mode: 'test', idx: 0, miss: 0, missHere: 0, hinted: false, gaveUp: false, erased: false, drift: [0, 0], nAcc: 0, t0: 0, ms: 0, raf: 0 };
  const tools = `<div class="tools"><button class="btn sm" data-act="undo">↩ 1画もどす</button><button class="btn sm" data-act="clear">🧽 ぜんぶけす</button></div>`;

  app.innerHTML = `<div class="study">
    <header class="sbar"><button class="x" data-act="quit">✕</button><span class="pchip">${P.avatar} ${esc(P.name)}</span>
      <div class="dots">${S.queue.map((q, i) => `<i class="${i < S.pos ? (S.res[i] && S.res[i].ok ? 'ok' : 'ng') : i === S.pos ? 'cur' : ''}"></i>`).join('')}</div>
      <div class="combo ${S.combo >= 2 ? 'on' : ''}" id="combo">🔥 ${S.combo || 0}コンボ</div>
      <button class="snd ${DB.sound !== false ? '' : 'off'}" data-act="sfx">${DB.sound !== false ? '🔊' : '🔇'}</button><button class="snd ${DB.bgm !== false ? '' : 'off'}" data-act="bgm">🎵</button>
      <div class="cnt">${S.pos + 1} / ${S.queue.length}</div></header>
    <div class="smain">
      <section class="prompt">
        <div class="tag">${practice ? '✏️ れんしゅう（きろくには のこりません）' : isNew ? '🆕 あたらしい字' : '🔁 ふくしゅう'}　${gname(D.g)}${free ? '　📝 さいごに まとめて 採点' : ''}</div>
        <div class="timer"><div class="tbar"><i id="tfill"></i></div><span id="tnum">0.0</span><small>びょう</small></div>
        <div class="yomi">${esc(D.y)}</div>
        <ul class="exs" id="exs">${D.ex.map(([w, r]) => `<li><ruby>${esc(maskWord(w, k))}<rt>${esc(r)}</rt></ruby></li>`).join('')}</ul>
        <div id="kanbox"></div>
        <div id="result"></div>
        <div class="sbtns" id="sbtns">${tools}${free ? '<button class="btn sm fin" data-act="fin">✅ かけた</button>' : ''}<button class="btn ghost" data-act="giveup">わからない</button></div>
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

  const pad = $('#pad'), gInk = $('#ink'), gModel = $('#model'), gFx = $('#fx'), curEl = $('#cur');
  let warned = false;
  // カン君のダメージ：すごい成績のたびに たまり、12で ノックアウト（その日は たおれたまま）
  // 1回の出題（きょうのぶん／おかわり）が 1ラウンド。字数に合わせて たおれやすさを 決める
  const KO_AT = Math.max(5, Math.round(S.queue.length * 1.2)), HURT2 = Math.ceil((KO_AT * 2) / 3), HURT1 = Math.ceil(KO_AT / 3);
  const ko = () => !!S.ko;
  const dmg = () => (ko() ? 2 : (S.amaze || 0) >= HURT2 ? 2 : (S.amaze || 0) >= HURT1 ? 1 : 0);
  const say = (t, mood = 'normal') => {
    $('#kanbox').innerHTML = ko() ? kanSay(`ピヨピヨ… ${t}`, 'ko', 'sm') : kanSay(t, dmg() === 2 && ['normal', 'happy', 'think'].includes(mood) ? 'dizzy' : mood, 'sm', dmg());
  };
  const cutIn = (t, mood) => { if (!ko()) { queueCut(t, mood); S.amaze = (S.amaze || 0) + 1; } };
  /** カットインが おわるまで「つぎへ」を おさえる（おすと カットインを とばせる） */
  const holdNext = () => {
    const b = app.querySelector('[data-act="next"]');
    if (!b || !cutBusy()) return;
    b.classList.add('held');
    cutDone = () => { if (b.isConnected) b.classList.remove('held'); };
  };
  // まちがえた セオリーの 説明（同じ セオリーで 3回目からは みじかく）
  const sayTheory = (id, no = c.idx + 1) => {
    const T = THEORIES[id], n = (P.theory && P.theory[id]) || 0;
    const body = n >= 3 ? `また セオリー${T.no}！ <b class="thname">「${T.name}」</b>おぼえてる？`
      : `<b class="thname">セオリー${T.no}「${T.name}」</b>${T.text}<small class="thex">おなじ なかま：${T.ex}</small>`;
    $('#kanbox').innerHTML = kanSay(`<span class="theory">${theoryFig(id)}<span>${no}画目、ちがうよ！<br>${body}</span></span>`, 'think', 'sm theorybox');
    warned = false; // つぎの画を 正しく 書いても、説明は のこしておく
    reveal('#kanbox');
  };
  const setMsg = (t, cls = '') => {
    if (!t) { if (warned) { warned = false; say('そう、その ちょうし！', 'happy'); } return; }
    warned = cls === 'warn'; say(esc(t), warned ? 'sad' : 'normal');
  };
  // スマホなど 上の段が 入りきらないとき、だいじな ところ（けっか・せつめい）が 見えるように スクロール
  const reveal = (sel) => { const pr = $('.prompt'), el = $(sel); if (pr && el && pr.scrollHeight > pr.clientHeight + 2) el.scrollIntoView({ block: 'nearest' }); };
  const setKaku = () => { $('#kaku').textContent = free && c.mode === 'test' ? `${c.idx}画 かいた ／ ${D.s.length}画` : `${Math.min(c.idx + 1, D.s.length)}画目 ／ ${D.s.length}画`; };

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
  inStudy = true;
  cleanup = () => { stopTimer(); clearCuts(); inStudy = false; };

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
    if (free && c.mode === 'test') {
      if (pts.length < 2 || pathLen(pts) < 1.2) return; // タップしただけ
      c.wrote.push(pts); c.idx++;
      gInk.appendChild(inkEl(pts, 'good'));
      SND.stroke(c.idx - 1);
      setKaku();
      if (c.idx >= D.s.length) finishTest(); // 画数ぶん 書いたら 採点
      return;
    }
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
      if (!trace && tip.th && c.idx === tip.strokes[1] + 1 && !c.thMiss && P.theory && P.theory[tip.th]) {
        const T = THEORIES[tip.th];
        warned = false; say(`セオリー${T.no}「${T.name}」 ばっちり！`, 'happy');
      } else setMsg('');
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
    let why = 'ちがうみたい。もういちど！', type = 'shape', th = null;
    if (r.reversed) { why = 'かく むきが ぎゃくだよ'; type = 'rev'; }
    else { const j = targets.findIndex((t, x) => x > c.idx && judge(pts, t, c.drift).ok); if (j > 0) { why = mistakeTip(targets, c.idx, j); type = 'order'; th = theoryOf(targets, c.idx, j); } }
    if (!practice) { P.err = P.err || {}; P.err[type] = (P.err[type] || 0) + 1; }
    if (th) { sayTheory(th); c.thMiss = true; P.theory = P.theory || {}; P.theory[th] = (P.theory[th] || 0) + 1; }
    else setMsg(`${c.idx + 1}画目：${why}`, 'warn');
    if (type === 'order') showHint();
    else if (c.missHere >= 3) { showHint(); setMsg(`${c.idx + 1}画目の ヒントを 見て かこう`, 'warn'); }
  }

  /** 書きかけを消す（all=false なら1画だけ）。まちがいには数えない */
  function erase(all) {
    if (c.mode === 'result' || c.idx === 0) return;
    do { const g = gInk.lastElementChild; if (g) g.remove(); c.idx--; } while (all && c.idx > 0);
    c.wrote.length = c.mode === 'test' ? c.idx : 0;
    c.missHere = 0;
    if (all) { c.drift = [0, 0]; c.nAcc = 0; c.erased = true; }
    setMsg('');
    if (c.mode === 'trace') drawModel('trace'); else gModel.innerHTML = '';
    setKaku();
  }

  /** 書き順・向きが ちがった画に しるし（オレンジ＝書き順、数字は 正しい 画の 番号／青＝向きが ぎゃく） */
  function markFlaws(fj) {
    const inks = [...gInk.children];
    fj.match.forEach((j, i) => {
      const el = inks[i]; if (!el) return;
      const bad = fj.order.includes(i), rv = fj.rev[i];
      if (!bad && !rv) return;
      el.classList.add(bad ? 'o-order' : 'o-rev');
      const p0 = c.wrote[i][0];
      const x = Math.min(102, Math.max(7, p0[0])), y = Math.min(102, Math.max(7, p0[1]));
      gFx.appendChild(svgEl('circle', { cx: x, cy: y, r: 5.2, class: bad ? 'ob-order' : 'ob-rev' }));
      const t = svgEl('text', { x, y: y + 2.4, class: 'ob-t' }); t.textContent = bad ? j + 1 : '↩';
      gFx.appendChild(t);
    });
  }
  function revealWords() {
    $('#exs').innerHTML = D.ex.map(([w, r]) => `<li><ruby>${esc(w).split(k).join(`<em>${k}</em>`)}<rt>${esc(r)}</rt></ruby></li>`).join('');
  }

  function finishTest() {
    stopTimer();
    c.ms = Math.round(performance.now() - c.t0);
    c.mode = 'result';
    const inTime = c.ms <= limitMs, n = D.s.length;
    // 中学以上：書いた画を まとめて 採点。画数ちがい・形ちがいは 不合格、書き順・向きの まちがいは「合格（△）」
    const fj = free && !c.gaveUp ? freeJudge(c.wrote, targets) : null;
    const flaws = fj && fj.shapeOk ? fj.order.length + fj.reversed.filter((i) => !fj.order.includes(i)).length : 0;
    const ok = !c.gaveUp && c.miss === 0 && !c.hinted && inTime && (!fj || fj.shapeOk);
    $('#tnum').textContent = sec(c.ms);
    const prev = P.cards[k];
    const prevBest = prev ? prev.best : null, prevFails = prev ? prev.h.filter((h) => !h[1]).length : 0;
    const wasNg = !!prev && prev.h.length > 0 && !prev.h[prev.h.length - 1][1] && prev.h[prev.h.length - 1][0] < today();
    const neverOk = !!prev && prev.okc === 0;
    const events = [];
    let iv = 0;
    if (!practice) {
      iv = record(k, ok, c.ms, c.gaveUp ? -1 : fj ? flaws : c.miss, flaws > 0);
      P.err = P.err || {};
      if (c.gaveUp) P.err.giveup = (P.err.giveup || 0) + 1;
      else if (fj && !fj.shapeOk) P.err.shape = (P.err.shape || 0) + 1;
      else if (!inTime && c.miss === 0 && !c.hinted) P.err.time = (P.err.time || 0) + 1;
      if (fj && fj.order.length) P.err.order = (P.err.order || 0) + 1;
      if (fj && fj.reversed.length) P.err.rev = (P.err.rev || 0) + 1;
    } else if (S.kind === 'zukan') bump('practice');
    S.res[S.pos] = { k, ok, ms: c.ms, miss: fj ? flaws : c.miss, gaveUp: c.gaveUp };
    revealWords();
    drawModel(c.gaveUp || flaws ? 'anim' : 'over'); // 書き順ちがいは 正しい 書き順を アニメで 見せる
    if (flaws) markFlaws(fj);
    setMsg('');
    $('#kaku').textContent = `${n}画`;
    const res = $('#result');
    let popups = [];
    if (ok) {
      const rank = flaws && rankOf(c.ms, limitMs) === 'S' ? 'A' : rankOf(c.ms, limitMs); // 書き順ちがいは Sランクなし
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
      const gain = practice ? 10000 : Math.round(n * 10000 * { S: 5, A: 3, B: 2 }[rank] * (1 + Math.min(S.combo - 1, 9) * 0.5) * (flaws ? 0.5 : 1)); // 書き順ちがいは はんぶん
      S.z = (S.z || 0) + gain;
      addZ(gain);
      const lv = practice ? 0 : P.cards[k].lv;
      const flawTxt = flaws ? [fj.order.length ? `書き順 ${fj.order.length}画` : '', fj.reversed.length ? `向き ${fj.reversed.length}画` : ''].filter(Boolean).join('・') + ' ちがう' : '';
      res.innerHTML = flaws ? `<div class="res ok flaw"><b>○ ごうかく（書き順 △）</b>
        <span><i class="rk rk-${rank}">${rank}</i> ${sec(c.ms)}びょう　<em class="flawtxt">${flawTxt}</em></span>
        <span class="xp">💰 +${fmtZ(gain)}ゼニー（はんぶん）${S.combo >= 2 ? `　🔥${S.combo}コンボ` : ''}</span>
        <small>${fj.order.length ? 'オレンジの画の 数字が 正しい 書き順。' : ''}${fj.reversed.length ? '青い画は 向きが ぎゃく。' : ''}★マスターは 書き順も かんぺきに なってから${practice ? '' : `　つぎは ${iv}日ご`}</small></div>`
        : `<div class="res ok"><b>◎ ${PRAISE[Math.floor(Math.random() * PRAISE.length)]}</b>
        <span><i class="rk rk-${rank}">${rank}</i> ${sec(c.ms)}びょう${lv === MASTER_LV ? '　★マスター！' : ''}</span>
        <span class="xp">💰 +${fmtZ(gain)}ゼニー${S.combo >= 2 ? `　🔥${S.combo}コンボ` : ''}</span>
        ${newBest ? `<span class="nb">⏱ じこベスト こうしん！（${sec(prevBest)} → ${sec(c.ms)}）</span>` : ''}
        ${practice ? '' : `<small>つぎは ${iv}日ご</small>`}</div>`;
      $('#sbtns').innerHTML = `<button class="btn primary big" data-act="next">${practice && S.pos + 1 >= S.queue.length ? 'おわる' : 'つぎへ'}</button>${practice ? '<button class="btn ghost" data-act="again">もういちど</button>' : ''}`;
      // カン君のリアクション（すごいほど大げさに）
      const hard = n >= 13;
      if (!practice && lv === MASTER_LV) { say('★マスター！！ もう わすれないね！', 'wow'); cutIn(`「${k}」★マスター！！`, 'wow'); }
      else if (hard && rank === 'S') { say(`えええ！？ ${n}画を ${sec(c.ms)}びょう！？`, 'shock'); cutIn(`${n}画を ${sec(c.ms)}びょう！？<small>うそでしょ！？</small>`, 'shock'); }
      else if (S.combo >= 10 && S.combo % 5 === 0) { say(`${S.combo}コンボ！！ もえてきたー！`, 'fire'); cutIn(`${S.combo}コンボ！！<small>だれにも とめられない！</small>`, 'fire'); }
      else if (S.combo === 5) { say('5コンボ！ のってきたね。', 'cool'); cutIn('5コンボ！<small>クールに きめるぜ</small>', 'cool'); }
      else if (gain >= 2000000) { say(`${fmtZ(gain)}ゼニー！？ 大もうけだ！`, 'money'); cutIn(`+${fmtZ(gain)}ゼニー！<small>ザックザク！</small>`, 'money'); }
      else if (newBest) say('じこベスト！ きのうの じぶんに かった！', 'wow');
      else if (S.combo >= 6) say(`${S.combo}コンボ！ とまらない！`, 'fire');
      else if (S.combo >= 3) say(`${S.combo}コンボ！ いい かんじ。`, 'cool');
      else if (hard) say(`${n}画も あるのに かけた！ すごい！`, 'wow');
      else if (rank === 'S') say('はやい！ Sランクだ！', 'wow');
      else say('いいね、その ちょうし！', 'happy');
      // すごい成績は カン君への「こうげき」。たんこぶ → ボコボコで ヨロヨロ → ノックアウト（つぎの日には ふっかつ）
      if (!practice && !ko()) {
        const before = S.amaze0 || 0;
        S.amaze = (S.amaze || 0) + (rank === 'S' ? 2 : 1); // ごうかくで 1ダメージ、Sランクは 2ダメージ
        const now = S.amaze || 0;
        S.amaze0 = now;
        if (now >= KO_AT) {
          S.ko = true; P.kanSleep = today(); events.push('kansleep');
          P.koDay = P.koDay && P.koDay.d === today() ? { d: today(), n: P.koDay.n + 1 } : { d: today(), n: 1 };
          if (P.koDay.n >= 2) events.push('ko2');
          queueCut(`カン君、ノックアウト！！<small>${esc(P.name)}の かち！ つよすぎる…</small>`, 'ko', () => { SND.fail(); say('ま、まいった…', 'ko'); }, cutBusy() ? 0 : 900);
        } else if (before < HURT2 && now >= HURT2) say(`ぐはっ！ ${esc(P.name)}、つよすぎ… も、もう ボコボコ… ヨロヨロ〜`, 'dizzy');
        else if (before < HURT1 && now >= HURT1) say('いてっ！ すごすぎて たんこぶが できた…！', 'shock');
        else if (now >= HURT2 && rank === 'S') say(['ぐふっ…まだ くるの！？', 'ひぃ〜 もう かんべんして…', 'あ、足が ふらふら する…'][now % 3], 'dizzy');
      }
      $('#stamp').innerHTML = `<div class="rankstamp rk-${rank}">${rank}</div>`;
      $('#padwrap').classList.add('win');
      const cb = $('#combo'); cb.textContent = `🔥 ${S.combo}コンボ`; cb.classList.toggle('on', S.combo >= 2); cb.classList.add('bump');
      gInk.querySelectorAll('.good:not(.o-order):not(.o-rev)').forEach((el, i) => { el.style.animationDelay = i * 0.03 + 's'; el.classList.add('shine'); });
      rank === 'S' ? SND.great() : SND.pass();
      confetti((rank === 'S' ? 45 : rank === 'A' ? 18 : 6) + (S.combo >= 5 ? 30 : 0) + (lv === MASTER_LV ? 40 : 0));
      // 書き順ちがいは、カン君が セオリー（なければ 正しい 書き順）を せつめい
      if (flaws && !ko()) {
        const th = fj.first ? theoryOf(targets, fj.first.want, fj.first.wrote) : null;
        if (th) { sayTheory(th, fj.first.want + 1); P.theory = P.theory || {}; P.theory[th] = (P.theory[th] || 0) + 1; }
        else if (fj.first) say(`ごうかく！ でも ${fj.first.want + 1}画目は、オレンジの「${fj.first.want + 1}」の 画だよ。アニメで 正しい 書き順を たしかめよう！`, 'think');
        else say('ごうかく！ でも 青い画は かく むきが ぎゃくだよ。アニメで たしかめよう！', 'think');
      }
      holdNext();
    } else {
      S.combo = 0;
      $('#combo').classList.remove('on');
      SND.fail();
      const why = c.gaveUp ? 'こたえを 見たよ'
        : fj && !fj.countOk ? `画数が ちがうよ（${n}画の字を ${c.wrote.length}画で かいた）${!inTime ? `・じかん ${sec(c.ms)}びょう` : ''}`
        : fj && !fj.shapeOk ? `字の かたちが ちがうよ${!inTime ? `・じかん ${sec(c.ms)}びょう` : ''}`
        : [c.miss ? `まちがい ${c.miss}回` : '', c.hinted && !c.miss ? 'ヒントあり' : '', !inTime ? `じかん ${sec(c.ms)}びょう（${P.limit}びょうまで）` : ''].filter(Boolean).join('・');
      startTrace(`<div class="res ng"><b>もういっぽ！</b><span>${why}</span><small>${practice ? '' : 'あした もういちど 出るよ'}</small></div>`);
    }
    save();
    reveal('#result');
    popups = popups.concat(checkTrophies({ ev: events }));
    if (popups.length) setTimeout(() => showTrophies(popups), 600);
  }

  /** まちがえたら、すぐに お手本を なぞって おぼえる */
  function startTrace(resHtml = '') {
    c.mode = 'trace'; c.idx = 0; c.drift = [0, 0]; c.nAcc = 0;
    gInk.innerHTML = ''; $('#stamp').innerHTML = '';
    $('#result').innerHTML = resHtml;
    $('#sbtns').innerHTML = `${tools}${practice ? '<button class="btn ghost" data-act="again">もういちど</button>' : ''}<button class="btn ghost" data-act="next">とばす</button>`;
    warned = false;
    say(`${c.gaveUp || c.miss >= 3 ? 'うわーん…でも だいじょうぶ！ ' : ''}オレンジの 線を なぞって おぼえよう。<br>💡 ${tip.text}`, c.gaveUp || c.miss >= 3 ? 'cry' : 'think');
    drawModel('trace'); setKaku();
    reveal('#result');
  }
  function finishTrace() {
    c.mode = 'result';
    SND.pass();
    setMsg('');
    bump('trace');
    addZ(50000);
    const popups = checkTrophies();
    say('よく できました！ これで ばっちり。', 'cool');
    $('#result').innerHTML = `<div class="res ok"><b>よく できました</b><span class="xp">💰 +5万ゼニー</span><small>${practice ? '' : 'あした もういちど ちょうせん！'}</small></div>`;
    $('#sbtns').innerHTML = `<button class="btn primary big" data-act="next">${practice && S.pos + 1 >= S.queue.length ? 'おわる' : 'つぎへ'}</button>${practice ? '<button class="btn ghost" data-act="again">もういちど</button>' : ''}`;
    if (popups.length) setTimeout(() => showTrophies(popups), 400);
  }

  const leave = () => go(S.back || viewHome);
  onAct({
    quit: () => (practice ? leave() : go(viewHome)),
    giveup: () => { if (c.mode !== 'test') return; c.gaveUp = true; gInk.innerHTML = ''; finishTest(); },
    fin: () => { if (c.mode !== 'test' || !free || !c.idx) return; finishTest(); },
    undo: () => erase(false),
    clear: () => erase(true),
    sfx: (el) => { DB.sound = DB.sound === false; applyAudio(); saveLocal(); el.textContent = DB.sound ? '🔊' : '🔇'; el.classList.toggle('off', !DB.sound); if (DB.sound) resetAudio(); },
    bgm: (el) => { DB.bgm = DB.bgm === false; applyAudio(); saveLocal(); el.classList.toggle('off', !DB.bgm); },
    again: () => { clearCuts(); go(viewStudy, ctx); },
    next: () => {
      if (c.mode === 'test') return;
      if (cutBusy()) return endCut(); // カットイン中に おしたら、まず カットインを とばす
      S.pos++;
      if (!practice) save();
      if (S.pos < S.queue.length) return go(viewStudy, ctx);
      if (!practice) return finishSession();
      const got = S.kind === 'drill' ? (bump('drill'), save(), checkTrophies()) : [];
      leave();
      if (got.length) setTimeout(() => showTrophies(got), 300);
    },
  });

  const firstFree = free && !S.queue.slice(0, S.pos).some(isFree);
  if (firstFree) say('ここからは 中学の字！ 書き順は さいごに まとめて 採点するよ。まちがえても とまらないから、さいごまで かこう！', 'cool');
  else say(!practice && S.extra && S.pos === 0 && P.kanSleep === today() ? 'ふっかつ！ おかわり しょうぶだ！ こんどは まけないぞ！' : practice ? 'れんしゅうだよ。きろくには のこらないから、気楽に かこう！' : isNew ? 'あたらしい字だよ。よみを 見て かいてみよう！' : 'おぼえてるかな？ 思い出して かこう！');
  setKaku();
  // カットインは 前の字の 画面で おわっているので、すぐ スタート
  c.t0 = performance.now(); tick();
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
  const bonus = first ? 1000000 * Math.min(streak(P), 30) : 300000; // れんぞく日数 × 100万
  S.z = (S.z || 0) + bonus;
  addZ(bonus);
  save();
  const got = checkTrophies({ ev: events });
  if (cloudOn()) { clearTimeout(pushTimer); pushProfile(DB.family, P).catch(() => {}); }
  go(viewSummary, { first, got, bonus });
}

function viewSummary({ first, got, bonus }) {
  const S = P.session, okN = S.res.filter((r) => r.ok).length, st = streak(P);
  const maxCombo = S.res.reduce((a, r) => (r.ok ? [Math.max(a[0], a[1] + 1), a[1] + 1] : [a[0], 0]), [0, 0])[0];
  app.innerHTML = `<div class="page narrow center">
    <div class="stamp">💮</div>
    <h2>${S.extra ? 'おつかれさま！' : 'きょうのぶん おわり！'}</h2>
    ${kanSay(okN === S.res.length ? 'ぜんぶ ごうかく！ かんぺきだ！' : 'おつかれさま！ ✕の字は あした リベンジしよう。', okN === S.res.length ? 'wow' : 'happy', 'mid')}
    <div class="sumrow"><div><b>${okN}</b><small>／${S.res.length} ごうかく</small></div><div><b>🔥${st}</b><small>日れんぞく</small></div>
      <div><b>${maxCombo}</b><small>さいだいコンボ</small></div><div><b>💰${fmtZ(S.z || 0)}</b><small>ゼニー（ボーナス ${fmtZ(bonus)}）</small></div></div>
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
  const grades = [...P.grades].sort(byNum);
  if (!grades.includes(zukanGrade)) zukanGrade = grades[0];
  const g = zukanGrade, s = stats(P).g[g];
  app.innerHTML = `<div class="page">
    <header class="top"><button class="btn back" data-act="home">← もどる</button><h2>かん字ずかん</h2>
      <div class="tabs">${grades.map((x) => `<button class="tab ${x === g ? 'on' : ''}" data-act="tab" data-g="${x}">${gname(x)}</button>`).join('')}</div></header>
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
      <p>${D.s.length}画　${gname(D.g)}</p>
      <p class="ktip">💡 ${kanjiTip(D.s.map(samplePath)).text}</p>
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
const thCache = {};
/** これまでに 出た字のうち、その セオリーが ポイントの字 */
function theoryKanji(id) {
  return Object.keys(P.cards).filter((k) => KD[k] && (thCache[k] !== undefined ? thCache[k] : (thCache[k] = kanjiTip(KD[k].s.map(samplePath)).th || null)) === id);
}
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
    <h3>たて・よこ 書き順の セオリー</h3>
    <section class="card thlist">${Object.entries(THEORIES).map(([id, T]) => { const n = (P.theory || {})[id] || 0, ks = theoryKanji(id);
      return `<div class="throw ${n ? 'miss' : ''}">${theoryFig(id)}<span><b>セオリー${T.no}「${T.name}」</b><small>${T.ex}</small></span><b class="thn">${n ? `✕${n}回` : '—'}</b>${ks.length ? `<button class="btn sm" data-act="drill" data-ks="${ks.join('')}" data-kind="theory">✏️ ${Math.min(ks.length, 8)}字 とっくん</button>` : '<span></span>'}</div>`; }).join('')}
      <p class="note">✕は、そのセオリーで 書き順を まちがえた回数。「とっくん」は、これまでに 出た字の 中から そのセオリーの 字を えらんで れんしゅうします。</p></section>
    <h3>じかんが かかる字（1画あたり）</h3>
    ${slow.length ? `<section class="wgrid">${slow.map((x) => `<button class="wk" data-act="k" data-k="${x.k}"><span>${x.k}</span><small>${sec(x.avg)}s／${KD[x.k].s.length}画</small></button>`).join('')}</section>` : empty}
  </div>`;
  onAct({
    home: () => go(viewHome),
    k: (el) => showKanji(el.dataset.k, viewAnalysis),
    drill: (el) => go(viewStudy, { queue: byMode(shuffle([...el.dataset.ks]).slice(0, el.dataset.kind === 'theory' ? 8 : 10)), pos: 0, res: [], practice: true, kind: el.dataset.kind || 'rad', back: viewAnalysis }),
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
      <p class="note">学年：${[...P.grades].sort(byNum).map(gname).join('・')}</p>
      <div class="row"><button class="btn" data-act="edit">名前・学年を変える</button><button class="btn danger" data-act="del">${cloudOn() ? 'この端末から外す' : 'このプロフィールを消す'}</button></div>
    </section>
    <section class="card">
      <h3>この端末の設定</h3>
      <label class="fld inline">入力<select id="pen">
        <option value="auto" ${DB.pen === 'auto' ? 'selected' : ''}>自動（ペンを使ったら指は無視）</option>
        <option value="pen" ${DB.pen === 'pen' ? 'selected' : ''}>Apple Pencil のみ</option>
        <option value="any" ${DB.pen === 'any' ? 'selected' : ''}>指でも書ける</option></select></label>
      <label class="fld inline">効果音（書く音・合格の音）<select id="sound"><option value="1" ${DB.sound !== false ? 'selected' : ''}>あり</option><option value="0" ${DB.sound !== false ? '' : 'selected'}>なし</option></select></label>
      <label class="fld inline">BGM（音楽）<select id="bgm"><option value="1" ${DB.bgm !== false ? 'selected' : ''}>あり</option><option value="0" ${DB.bgm !== false ? '' : 'selected'}>なし</option></select></label>
      <div class="row"><button class="btn" data-act="fixsnd">🔧 音を なおす（テストの音が鳴ります）</button></div>
      <p class="note">音が消えたら：①画面をどこか1回タップ → ②プレイ中なら右上の 🔊 を2回タップ（オフ→オン） → ③ここの「音を なおす」 → ④それでもだめなら、ホーム画面のアプリを上にスワイプして終了し、開き直してください。<br>iPad の音量・消音（コントロールセンターのベル）・Bluetooth イヤホンのつながり先も確認してください。</p>
    </section>
    <section class="card">
      <h3>☁️ クラウド同期（ほかの iPad と記録を共有）</h3>
      ${!cloudReady() ? '<p class="note">まだ準備中です（Firebase の接続先が未設定）。記録はこの端末の中だけに保存されています。</p>'
    : DB.family ? `<p>同期中です。ほかの端末でも<b>同じ合言葉</b>を入れると、同じ記録が出ます。</p>
        <p class="note">合言葉：<code>${esc(DB.family)}</code><br>${syncMsg ? '⚠️ エラー: ' + esc(syncMsg) : DB.lastSync ? '最後の同期：' + new Date(DB.lastSync).toLocaleString('ja-JP') : 'まだ同期していません'}</p>
        <div class="row"><button class="btn primary" data-act="sync">いま同期する</button><button class="btn" data-act="unlink">同期をやめる</button>${(DB.deleted || []).length ? `<button class="btn" data-act="restore">外した人を戻す（${DB.deleted.length}人）</button>` : ''}</div>
        <p class="note">クラウドの記録は、アプリからは消せません。完全に消すのは、管理者が Firebase の画面から行います。</p>`
    : `<p class="note">家族だけの合言葉を決めて、使う端末すべてに同じものを入れてください。合言葉を知っている人は記録を見られるので、推測されにくいものにしてください。</p>
        <label class="fld">合言葉<input id="fam" type="text" maxlength="40" placeholder="12文字以上" autocomplete="off" autocapitalize="off"></label>
        <div class="row"><button class="btn" data-act="gen">自動で作る</button><button class="btn primary" data-act="link">この合言葉で同期する</button></div>`}
    </section>
    <section class="card">
      <h3>記録のバックアップ（全プロフィール）</h3>
      <p class="note">記録はこの端末のブラウザ内に保存されています。ときどきファイルに書き出しておくと安心です。</p>
      <div class="row"><button class="btn" data-act="export">ファイルに書き出す</button><button class="btn" data-act="import">ファイルから読みこむ</button></div>
      <input type="file" id="file" accept="application/json,.json" hidden>
    </section>
    <div class="row"><button class="btn ghost" data-act="about">バージョン・更新履歴（v${VERSION}）</button></div>
    <p class="note">筆順データ: <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noopener">KanjiVG</a> © Ulrich Apel（CC BY-SA 3.0）。字形は教科書体と細部が異なる場合があります。<br>中学以上のよみ・例語: <a href="https://www.edrdg.org/" target="_blank" rel="noopener">KANJIDIC2 / JMdict</a> © EDRDG（CC BY-SA 4.0）から自動で選んだものです。</p>
  </div>`;
  app.onchange = (e) => {
    const id = e.target.id, v = e.target.value;
    if (id === 'fam') return;
    if (id === 'daily') { P.daily = +v; P.upd = Date.now(); if (P.session && P.session.pos === 0 && !P.session.extra) P.session = null; }
    if (id === 'limit') { P.limit = +v; P.upd = Date.now(); }
    if (id === 'pen') DB.pen = v;
    if (id === 'sound') { DB.sound = v === '1'; applyAudio(); }
    if (id === 'bgm') { DB.bgm = v === '1'; applyAudio(); }
    if (id === 'file' && e.target.files[0]) {
      e.target.files[0].text().then((txt) => {
        const d = JSON.parse(txt);
        if (!d || !Array.isArray(d.profiles)) throw new Error('形式がちがいます');
        if (!confirm(`${d.profiles.length}人分の記録を読みこみ、今の記録と置きかえます。よろしいですか？`)) return;
        d.profiles.forEach(migrate); d.family = DB.family; DB = d; saveLocal(); P = null; go(viewProfiles); syncNow();
      }).catch((err) => alert('読みこめませんでした: ' + err.message));
      return;
    }
    save();
  };
  onAct({
    home: () => go(viewHome),
    edit: () => go(viewProfileForm, P),
    about: () => go(viewAbout),
    fixsnd: () => { DB.sound = true; saveLocal(); applyAudio(); resetAudio(); go(viewSettings); },
    del: () => {
      if (!confirm(cloudOn()
        ? `「${P.name}」を この端末の一覧から外します。クラウドの記録は消えません（完全に消せるのは管理者だけです）。よろしいですか？`
        : `「${P.name}」の記録をすべて消します。元にもどせません。よろしいですか？`)) return;
      (DB.deleted = DB.deleted || []).push(P.id);
      DB.profiles = DB.profiles.filter((p) => p !== P); DB.current = null; P = null; saveLocal(); go(viewProfiles);
    },
    export: () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(DB)], { type: 'application/json' }));
      a.download = `kanji-kiroku-${today()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    },
    import: () => $('#file').click(),
    gen: () => {
      const a = new Uint32Array(3); crypto.getRandomValues(a);
      $('#fam').value = [...a].map((x) => x.toString(36).padStart(6, '0').slice(-5)).join('-');
    },
    link: async () => {
      const code = $('#fam').value.trim();
      if (code.length < 12) return alert('合言葉は12文字以上にしてください（「自動で作る」も使えます）');
      DB.family = code; saveLocal();
      const ok = await syncNow();
      if (!ok) alert('同期できませんでした: ' + syncMsg);
      P = DB.profiles.find((p) => p.id === DB.current) || P;
      go(viewSettings);
    },
    sync: async () => { const ok = await syncNow(); if (!ok && syncMsg) alert('同期できませんでした: ' + syncMsg); go(viewSettings); },
    restore: async () => { DB.deleted = []; saveLocal(); await syncNow(); go(viewSettings); },
    unlink: () => { if (confirm('この端末での同期をやめます。記録は端末にもクラウドにも残ります。')) { DB.family = ''; saveLocal(); go(viewSettings); } },
  });
}

// ───────── バージョン・更新履歴 ─────────
const VERSION = '1.6.0';
const HISTORY = [
  ['1.6.0', '2026-11-23', ['中学以上の字は「さいごに まとめて 採点」に。書き順を まちがえても とまらずに さいごまで 書ける（小学校の字は 今までどおり 1画ずつ）', '書き順・向きだけ ちがうときは「ごうかく（書き順 △）」：Sランクなし・ゼニーはんぶん・★マスターには 数えない。ちがった画に 正しい 番号を 表示し、カン君が セオリーを せつめい', '画数が ちがう・字の かたちが ちがうときは 不合格で、今までどおり なぞり れんしゅうへ', '1回の 出題では 小学校の字を 先に、中学以上の字を あとに 出す']],
  ['1.5.3', '2026-11-23', ['学年の字を ぜんぶ きょう書いたあとでも「もっとやる」が つづけられるように（きょう ✕だった字から もう一度）']],
  ['1.5.2', '2026-11-23', ['スマホ（iPhone など）で 画面が くずれて「つぎへ」が 見えなくなるのを なおした', 'スマホでは 字を書く わくの 大きさを 画面に あわせ、ボタンが いつも 見えるように。せつめいが 入りきらないときは 上の段だけ スクロール', 'ホーム・ランキング・ずかん などの スマホ向けの ならびを ととのえた']],
  ['1.5.1', '2026-11-23', ['アプリの アイコンを あたらしく（字を ゆびで なぞる デザイン）']],
  ['1.5.0', '2026-11-22', ['「もっとやる」に ＋10字の ボタンを追加', '書き順の「たて・よこ」を まちがえたら、カン君が セオリー（①まじわったら よこが先 〜 ⑤つらぬく よこは さいご）を 図つきで 説明。ぶんせきに セオリーべつの まちがい回数と とっくんを追加', 'とびだす演出は 前の字の 画面で 出しきり、つぎの字では すぐ 書けるように（演出はタップで とばせる）', 'ランキングに きょう・きのう おぼえた字の ふえた数（いきおい）を表示。★を「★マスター」と表示', 'iPad で 音が消えにくく（画面を とじて もどったときや 電話のあとに 作り直す）。せっていに「音を なおす」']],
  ['1.4.0', '2026-11-16', ['中学の かん字を追加：中1（313字）・中2（284字）・中3（328字）と、高校（常用漢字ののこり 185字）。小3からあわせて 1896字', 'とびだす演出が 消えてから、つぎの字の 時間を 数えはじめるように']],
  ['1.3.3', '2026-11-16', ['新しい字が出る順番を、あいうえお順から 人ごとにちがう ランダムな順に変更', '1回の出題の中でも、ふくしゅうと新しい字をまぜて出すように']],
  ['1.3.2', '2026-11-16', ['カン君が たおれるまでを 早く（ごうかくで1ダメージ、Sランクで2ダメージ）', '「もっとやる」の5字でも カン君が ふっかつして、もう1回 ノックアウトできるように']],
  ['1.3.1', '2026-11-16', ['人がいない新しい端末でも、最初の画面から合言葉を入れて記録をよびだせるように', '新しい版が出たら自動で読みこみ直すように（古い版が残りつづける問題を修正）', '最初の画面にバージョン番号を表示', 'クラウドの記録はアプリから消せないように（消せるのは管理者だけ）', 'カン君がボコボコになってノックアウトされる演出']],
  ['1.3.0', '2026-11-16', ['ごほうびを XP・レベルから「ゼニー」に変更（これまでのXPは 1XP＝1万ゼニーで引きつぎ）', 'プロフィール選択を「かぞくランキング」に', 'ホームに 学年べつステータスと 7日間の学習数', '案内キャラ「カン君」と、書き順のきまりのアドバイス', 'まちがえたら すぐ なぞり練習に入るように', '効果音とBGMを分け、プレイ中に切りかえ可能に。音が止まったら自動で復旧', 'プレイ中にプレイヤー名を表示', 'カン君の表情を追加（びっくり・星の目・サングラス・号泣・炎・ゼニー）と、とびだす演出', 'すごい成績を出しすぎると、カン君がボコボコになってノックアウトされる（つぎの日には復活）', 'クラウド同期（複数の端末で記録を共有。クラウドの記録を消せるのは管理者だけ）', 'バージョン・更新履歴のページ']],
  ['1.2.0', '2026-11-15', ['小3の200字を追加（小3〜小6 計786字）', '書きかけを消す「1画もどす／ぜんぶけす」', 'ずかんから字をえらんで練習', 'ランク・コンボなどの演出', '部首べつ・画数べつなどの「ぶんせき」と にがて特訓', 'トロフィーを約60種に（ひみつトロフィーなど）', 'アイコンに干支12種ほかを追加']],
  ['1.0.0', '2026-11-15', ['最初の公開。小4〜小6の書き取り、筆順の判定、10秒以内で合格、忘却曲線による復習、プロフィール、ずかん、トロフィー']],
];
function viewAbout() {
  app.innerHTML = `<div class="page narrow">
    <header class="top"><button class="btn back" data-act="back">← もどる</button><h2>バージョン・更新履歴</h2><span></span></header>
    <section class="card"><h3>かん字 かきとり　v${VERSION}</h3>
      <p class="note">記録の保存先：この端末のブラウザ内${cloudOn() ? '＋クラウド（同期中）' : ''}。アプリが新しくなっても、記録はそのまま引きつがれます。</p></section>
    ${HISTORY.map(([v, d, items]) => `<section class="card"><h3>v${v}<small class="hdate">${d}</small></h3><ul class="hist-ul">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>`).join('')}
  </div>`;
  onAct({ back: () => go(viewSettings) });
}

// ───────── 起動 ─────────
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
(async function main() {
  try { await loadData(); }
  catch (e) { app.innerHTML = `<div class="page center"><p>データを 読みこめませんでした。</p><p class="note">${esc(e.message)}</p></div>`; return; }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    // 新しい版が入ったら、自動で読みこみ直す（書き取り中は 終わってから）
    const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) { if (inStudy) pendingReload = true; else location.reload(); } });
    navigator.serviceWorker.register('sw.js').then((reg) => {
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {});
  }
  P = DB.profiles.find((p) => p.id === DB.current) || null;
  applyAudio(); setBgm(true);
  go(viewProfiles);
  syncNow().then((ok) => { if (ok && curView === viewProfiles) go(viewProfiles); });
})();
