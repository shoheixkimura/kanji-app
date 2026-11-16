#!/usr/bin/env python3
"""中学以上の字の よみ・例語の もとデータを kanjiapi.dev（KANJIDIC2 / JMdict 由来）から集めて保存する。
使い方: python3 tools/fetch_dict.py <級別リストのディレクトリ> <保存先ディレクトリ>
"""
import json, os, sys, urllib.request, urllib.parse, concurrent.futures as cf
here = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, here)
from grades import GRADES
src, out = sys.argv[1], sys.argv[2]
ld = lambda f: json.load(open(os.path.join(src, f + '.json'), encoding='utf-8'))
elem = set(''.join(GRADES[g] for g in (3, 4, 5, 6))) | set(ld('grade.g01')) | set(ld('grade.g02'))
DROP = set('塡剝頰')  # 字体のちがいで二重に入っている字（填・剥・頬のほうを使う）
levels = {7: 'kanken.lv04', 8: 'kanken.lv03', 9: 'kanken.lv02pre', 10: 'kanken.lv02'}
lists = {g: [k for k in ld(f) if k not in elem and k not in DROP] for g, f in levels.items()}
json.dump(lists, open(os.path.join(out, 'lists.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print({g: len(v) for g, v in lists.items()})

def get(kind, k):
    fn = os.path.join(out, kind[0], '%05x.json' % ord(k))
    if os.path.exists(fn) and os.path.getsize(fn) > 2: return True
    url = 'https://kanjiapi.dev/v1/%s/%s' % (kind, urllib.parse.quote(k))
    for _ in range(3):
        try:
            data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'kanji-data-builder'}), timeout=40).read()
            json.loads(data); open(fn, 'wb').write(data); return True
        except Exception as e: err = e
    print('FAIL', kind, k, err); return False

jobs = [(kind, k) for v in lists.values() for k in v for kind in ('kanji', 'words')]
with cf.ThreadPoolExecutor(6) as ex: ok = sum(ex.map(lambda a: get(*a), jobs))
print('fetched', ok, '/', len(jobs))
