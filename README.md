# かん字 かきとり

小学3年〜中学（常用漢字）の漢字を、iPad と Apple Pencil で書いて覚える Web アプリ。
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

中学以上の字の学年分けは、公式の配当がないため漢検の級（4級＝中1、3級＝中2、準2級＝中3、2級＝高校）にならっています。
級別の一覧は npm パッケージ [kanji](https://www.npmjs.com/package/kanji)（MPL-2.0）を参照しました。
中学以上の `tools/yomi_g7〜g10.txt`（よみ・例語）は、[KANJIDIC2 / JMdict](https://www.edrdg.org/)（© EDRDG、CC BY-SA 4.0）を
[kanjiapi.dev](https://kanjiapi.dev/) 経由で取得し、`tools/gen_yomi.py` で自動的に選んだものです。
