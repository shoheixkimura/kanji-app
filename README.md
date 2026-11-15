# かん字 かきとり

小学4〜6年の漢字を、iPad と Apple Pencil で書いて覚える Web アプリ。
筆順を1画ずつ照合し、合格した字は間隔をあけて、不合格の字は翌日にもう一度出題します。
記録は端末のブラウザ内にだけ保存されます。

## データの作り直し

```bash
git clone --depth 1 https://github.com/KanjiVG/kanjivg.git /tmp/kanjivg
python3 tools/build_data.py /tmp/kanjivg/kanji
```

よみ・例語は `tools/yomi_g4.txt` などを編集します。

## ライセンス

`data/*.json` の筆順データは [KanjiVG](https://kanjivg.tagaini.net/)（© Ulrich Apel）に由来し、
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) で提供されます。
