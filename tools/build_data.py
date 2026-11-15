#!/usr/bin/env python3
"""KanjiVG の SVG と yomi_g*.txt から data/g*.json を作る。
使い方: python3 tools/build_data.py <kanjivg/kanji ディレクトリ>
"""
import json, os, re, sys
from grades import GRADES

here = os.path.dirname(os.path.abspath(__file__))
kvg_dir = sys.argv[1]
out_dir = os.path.join(here, "..", "data")
path_re = re.compile(r'<path[^>]*?id="kvg:[0-9a-f]+-s(\d+)"[^>]*?\sd="([^"]+)"', re.S)

for g, chars in GRADES.items():
    rows = {}
    for ln in open(os.path.join(here, f"yomi_g{g}.txt"), encoding="utf-8"):
        p = ln.split()
        if not p: continue
        k, yomi, exs = p[0], p[1], [e.split(":") for e in p[2:]]
        assert k not in rows, f"dup {k}"
        for w, r in exs:
            assert k in w, f"{k}: example {w} lacks kanji"
            assert re.fullmatch(r"[ぁ-んー]+", r), f"{k}: bad reading {r}"
        assert exs, k
        rows[k] = (yomi, exs)
    assert set(rows) == set(chars), (g, set(rows) ^ set(chars))
    out = []
    for k in chars:
        svg = open(os.path.join(kvg_dir, "%05x.svg" % ord(k)), encoding="utf-8").read()
        strokes = sorted(((int(n), d) for n, d in path_re.findall(svg)))
        assert [n for n, _ in strokes] == list(range(1, len(strokes) + 1)), k
        yomi, exs = rows[k]
        out.append({"k": k, "y": yomi, "ex": exs, "s": [d for _, d in strokes]})
    fn = os.path.join(out_dir, f"g{g}.json")
    json.dump(out, open(fn, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(g, len(out), "kanji", sum(len(o["s"]) for o in out), "strokes", os.path.getsize(fn), "bytes")
