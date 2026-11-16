#!/usr/bin/env python3
"""fetch_dict.py で集めたデータから、中学以上の yomi_g7〜g10.txt を作る（あとから手で直してよい）。
使い方: python3 tools/gen_yomi.py <級別リストのディレクトリ> <fetch_dict の保存先>
"""
import json, os, re, sys
here = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, here)
from grades import GRADES
src, dat = sys.argv[1], sys.argv[2]
ld = lambda f: json.load(open(os.path.join(src, f + '.json'), encoding='utf-8'))
lists = {int(g): v for g, v in json.load(open(os.path.join(dat, 'lists.json'), encoding='utf-8')).items()}
easy = set(''.join(GRADES[g] for g in (3, 4, 5, 6))) | set(ld('grade.g01')) | set(ld('grade.g02'))
joyo = easy | set(k for v in lists.values() for k in v)
KANJI = re.compile(r'[一-鿿々]'); HIRA = re.compile(r'[ぁ-んー]+'); WORD = re.compile(r'[一-鿿々ぁ-ん]+')
BAD = re.compile(r'\b(sex|sexual|prostitut|rape|obscen|lewd|genital|penis|vagina|brothel|erotic|porn|masturb|whore|slut|orgasm|semen|testic|anus|incest|molest|pervert|narcotic|stimulant|methamph|opium|heroin|cocaine|marijuana|suicide|corpse|murder|slaughter)', re.I)
PRI = {'ichi1': 30, 'news1': 20, 'spec1': 20, 'ichi2': 10, 'news2': 8, 'spec2': 8, 'gai1': 4}
kata2hira = lambda s: ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)

def score(pr):
    s = sum(PRI.get(p, 0) for p in pr)
    nf = [int(p[2:]) for p in pr if p.startswith('nf')]
    return s + (49 - min(nf) if nf else 0)

def pick(k):
    info = json.load(open(os.path.join(dat, 'k', '%05x.json' % ord(k)), encoding='utf-8'))
    words = json.load(open(os.path.join(dat, 'w', '%05x.json' % ord(k)), encoding='utf-8'))
    kuns = [r.replace('-', '') for r in info['kun_readings']]
    kun_full = [r.replace('.', '') for r in kuns]
    on_hira = [kata2hira(o) for o in info['on_readings']]
    cands = {}
    for e in words:
        if any(BAD.search(g) for m in e['meanings'] for g in m['glosses']): continue
        for v in e['variants']:
            w, r = v['written'], v['pronounced']
            if k not in w or not WORD.fullmatch(w) or not HIRA.fullmatch(r) or not 1 <= len(w) <= 5: continue
            if w == k and r not in kun_full and r not in on_hira: continue  # 当て読み（粗＝ほぼ など）は使わない
            others = [c for c in KANJI.findall(w) if c != k]
            if any(c not in joyo for c in others): continue
            sc = score(v['priorities'])
            if all(c in easy for c in others): sc += 12       # ほかの字が小学校の字なら読みやすい
            if len(w) == 2 and len(KANJI.findall(w)) == 2: sc += 6
            base = w.startswith(k) and len(w) > 1 and not KANJI.search(w[1:]) and r in kun_full
            if base: sc += 30                                  # 握る・詳しい のような基本の形
            if w == k and r in kun_full: sc += 22              # 1字でことばになるもの
            kind = 'kun' if (base or w == k or HIRA.search(w)) else 'on'
            if w not in cands or cands[w][0] < sc: cands[w] = (sc, r, kind, bool(v['priorities']))
    ranked = sorted(cands.items(), key=lambda x: -x[1][0])
    ex = []
    for want in ('on', 'kun'):
        for w, (sc, r, kind, pri) in ranked:
            if kind == want and pri and all(w != x[0] for x in ex): ex.append((w, r)); break  # よく使われることばだけ
    for w, (sc, r, kind, pri) in ranked:
        if len(ex) >= 2: break
        if pri and all(w != x[0] and x[0] not in w and w not in x[0] for x in ex): ex.append((w, r))
    if not ex:  # よく使われることばが1つもない字：やさしい字との2字熟語でおぎなう
        for w, (sc, r, kind, pri) in ranked:
            if kind == 'on' and len(w) == 2 and sc >= 18: ex.append((w, r)); break
    if not ex:
        r = kun_full[0] if kun_full else kata2hira(info['on_readings'][0])
        ex = [(k, r)]
    # 見出しのよみ：例語に出てくる読みを優先
    rs = [r for _, r in ex]
    on_rs = [r for w, r in ex if cands.get(w, (0, '', 'kun'))[2] == 'on'] or ([rs[0]] if ex[0][0] == k else [])
    ons = [o for o in info['on_readings'] if any(kata2hira(o) in r for r in on_rs)]
    ks = [f for s_, f in zip(kuns, kun_full) if any(r.startswith(s_.split('.')[0]) for r in rs)]
    seen, kk = set(), []
    for f in ks:
        if f not in seen: seen.add(f); kk.append(f)
    if not ons and not kk: ons = info['on_readings'][:1]
    y = '・'.join(ons[:2] + kk[:2]) or kata2hira(rs[0])
    return y, ex

for g, ks in lists.items():
    with open(os.path.join(here, 'yomi_g%d.txt' % g), 'w', encoding='utf-8') as f:
        for k in ks:
            y, ex = pick(k)
            f.write('%s %s %s\n' % (k, y, ' '.join('%s:%s' % e for e in ex)))
    print(g, len(ks))
