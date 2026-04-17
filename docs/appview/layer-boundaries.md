# レイヤー責務と境界

## AppView が各層から読むもの

| 層 | 読む record | 用途 |
| --- | --- | --- |
| character | character-sheet, character-branch | キャラクター表示・編集 |
| advancement | character-advancement | 成長履歴 |
| session | session | セッション履歴 |
| scenario | scenario | シナリオ一覧・詳細 |
| schema | character-sheet-schema | フォーム生成 |
| scope | campaign, house | 長期卓・コミュニティ表示 |
| rules | rule-profile | ルール表示・overlay |

## 境界原則

1. **controlled repo write only**: AppView mutation は caller が control する repo にだけ書く。character / session 系は caller の personal repo、campaign / house / scenario / rule-profile / schema 系も caller 自身が owner として持つ repo に限る
2. **visibility respect**: draft record は一覧や発見導線から隠す。direct link では draft 状態を明示して解決する。visibility toggle の対象は character-branch、session、campaign、house に限り、rule-profile と character-sheet-schema には適用しない
3. **no session runtime**: セッション進行の機能を AppView に持たない
4. **schema validation boundary**: AppView の validation は advisory preflight に限る。書き込み可否の唯一の正本は API の authoritative validation とする
5. **export at AppView**: CCFolia など外部形式へのエクスポートは AppView の責務
6. **session workbench only**: `/sessions` は owner-only workbench に閉じる。public-safe な session 情報は character detail、campaign、house の surface に埋め込む
7. **pending is UI-local**: AppView は submit 後に local な `pending` を表示してよいが、API から `accepted` が返るまで確定保存済みとして扱わない
8. **stable public detail**: public direct detail は、visibility が変わっていない限り、数分程度 stale でも安定して返すことを優先してよい。public から draft への切り替え時は stale public 表示を許さず、最新 visibility で再解決する。owner workbench と save 後確認は authoritative read を優先する
9. **text-first on slow links**: 低速回線ではプロフィールと structured stats を先に出し、portrait などの大きい asset は後から読み込む
10. **character detail remains canonical**: public profile を将来追加しても、canonical shared surface は character detail のままにする。public profile は secondary surface として各 character detail へ導線を束ねるだけに留める
11. **locale at AppView**: locale 解決、UI chrome、system message、navigation label、OGP metadata の多言語化は AppView の責務とする。user-authored content の自動翻訳は AppView の責務に含めない。owner locale override は AppView 側の preference に閉じ、shared record に書かない。OGP metadata は explicit locale が無ければ default locale で安定させる
