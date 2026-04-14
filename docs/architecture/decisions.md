# 主要判断と代替案

Cerulia の設計における主要な判断を記録する。

## 1. Cerulia は PL の個人アプリである

採用: PL（プレイヤー）が自分のキャラクターを作り、セッション経験を記録し、共有する個人アプリとして設計する。GM 専用の機能や record は作らない。GM は「GM として参加した PL」である。

理由: 既存の TRPG ツールはキャラシ作成・共有・経歴記録がバラバラで相互運用できない。PL の個人体験を中心に据えることで、GM が Cerulia を使っていなくても価値が成立する。

## 2. product root はキャラクター

採用: character の作成・履歴・共有を root にする。

理由: Cerulia の価値はキャラクターを作り、遊んだ歴史を記録し、共有することにある。session を root にすると run-centric に戻る。

## 3. scope は house / campaign の 2 層

採用: house（コミュニティ）と campaign（長期卓シリーズ）を scope として並べる。world は廃止。

理由: house はコミュニティ、campaign はセッションシリーズで責務が違う。world はキャラクター経験記録に直接関係しないため、world の canonSummary と defaultRuleProfileRefs は house に吸収する。

## 4. キャラクターは sheet + branch + advancement の 3 層

採用: sheet、branch、advancement で character lineage を表す。sheet 作成時に default branch が自動ペア生成される。

理由: ownership、分岐、成長の 3 層があれば character lineage は成立する。branch なしの character は存在しない（単発卓が多数派のため、最初から branch が必要）。

補足: 公開 / 非公開の正本は branch.visibility とする。createCharacterSheet は default branch に初期 visibility を seed し、shared surface の解決は branch.visibility だけを見る。default branch の kind は `main` に固定する。

## 5. 全 record は原則公開

採用: AT Protocol 上に書かれた record は原則公開。特別な「公開手続き」は不要。visibility: draft|public で AppView の表示を制御する。

理由: AT Protocol の repo は原則公開データである。この性質を活かし、publication のような重厚な公開管理 record は導入しない。「書かれたら公開」が既定。作成途中のキャラクターを一覧から隠したい場合は visibility: draft で AppView が制御する。

補足: draft は AT Protocol レベルでは公開 record である。Cerulia AppView では一覧や発見導線からは隠すが、direct link では draft 状態を明示して表示する。

## 6. publication は不要

採用: publication record を廃止する。projection が全 record から一覧を自動生成し、PL による手動の curate は不要とする。

理由: AT Protocol 上の record は書いた時点で公開されている。共有したいときは Bluesky でリンクを貼るか、AppView 上で見せるだけで十分。重厚な append-only publication ledger は、ユーザーの実際の体験に合わない。

## 7. session は PL が自分で書く

採用: session は PL が自分の repo に書く post-run record。GM 専用の session record は存在しない。GM として参加した場合は role: gm で記録する。

理由: Cerulia は PL の個人アプリであり、GM が Cerulia を使っていなくても PL 単独で「このシナリオをどのキャラで遊んだか」を記録できる。他の参加者とのリンクは、各自が自分で session を書くことで projection が成立させる。

## 8. session = シナリオ完走

採用: 1 session = 1 シナリオの完走。未完走の卓は session にしない。

理由: session はキャラクターの経験として確定した事実の記録である。途中経過は外部記録（externalArchiveUris や note）で補う。

## 9. 他人について書かない

採用: 他人の DID や characterBranchRef を自分の record に書かない。

理由: 本人の opt-in なしに公開 graph を作ってしまうのを避ける。全 record が原則公開であるため、他人を一方的にリンクするリスクが高い。他のプレイヤーとのリンクは、各自が自分で session を書くことで成立する。

## 10. 越境利用はシステムで管理しない

採用: キャラクターの持ち出しや再利用の許可・禁止をシステムで裁定しない。reuse-grant は廃止。

理由: TRPG はコミュニケーションのゲームであり、ありとあらゆる可能性を考慮して厳格なルールを定めるべきではない。

## 11. import 概念の廃止

採用: importCharacterSheet を廃止し、createCharacterSheet に統一する。branch.importedFrom / syncMode / sourceRevision も削除する。

理由: 外部サービスからの取り込みは create で十分。元のリンクなど補足情報が必要なら note で記録する。

## 12. ruleset-manifest は廃止する

採用: ruleset-manifest は product-core から廃止する。MVP では rulesetNsid（文字列識別子）と character-sheet-schema で十分とし、generic create flow は rulesetNsid ごとの schema 一覧から明示選択する。

理由: PL は「CoC 7版」を選び、そこから使いたい schema を選びたいだけである。ruleset と manifest を分けることで Cerulia の理解が深くなるわけではなく、transport と作成導線が複雑になる。

補足: scenario から character 作成へ deterministic に遷移したい場合だけ、scenario は `recommendedSheetSchemaRef` を持つ。rulesetNsid だけしか無い scenario は browse 用であり、「このシナリオから作る」導線を持たない。

## 13. scenario は誰でも登録できる

採用: scenario record は誰でも登録でき、ownerDid は登録者を表す（必ずしもシナリオの作者ではない）。市販シナリオも登録対象。

理由: 基本的には作者が公開すべきだが、未登録のシナリオは PL が自分のセッション記録のために登録できるべき。

## 14. rules overlay は 2 層

採用: house default は campaign 作成時の seed source にとどめる。live な effective overlay の正本は campaign.sharedRuleProfileRefs だけに置く。

理由: world の responsibilities は十分に小さく、house.canonSummary と house.defaultRuleProfileRefs で自然に吸収できる。runtime で house と campaign を二重に畳み込むより、campaign 側に単一の live source を持つ方が実装も説明も安定する。

## 15. キャラクター変更はセッション単位で履歴保持

採用: character-advancement に previousValues を持たせ、変更前の値を保持する。sessionRef で「どのセッションで何が変わったか」を追える。

理由: append-only immutable ledger は個人アプリとしては過剰だが、セッション単位の変更履歴は PL にとって価値がある。

## 16. correction は直接編集

採用: record の訂正は直接編集を基本とする。supersede chain は導入しない。

理由: 個人アプリとして、誤りの修正に「新しい record を積む」手続きは過剰。ただし character-advancement のセッション単位の履歴は保持する。

補足: schema pin の差し替えは通常編集と分け、明示 rebase として扱う。UI と transport では rejected と rebase-needed を区別する。

## 17. dispute workflow は product scope 外

採用: 争いの workflow は product-core に入れない。

理由: Cerulia は moderation machine ではない。必要なら将来検討するが、現行の前提にはしない。

## 18. fieldDefs は再帰構造を許す

採用: character-sheet-schema の fieldDefs にグループ（section）と配列（list of objects）を許す。加えて、明示された extension point では追加 field を許容する。

理由: CoC の技能リスト、D&D の呪文スロットなど、TRPG のキャラクターシートには再帰的な構造が必要であり、さらに CoC6 汎用のような schema では追加技能や追加項目を受け止める余地が必要である。ただし core に universal DSL は押し込まない。

## 19. stats は schema 準拠

採用: sheetSchemaRef がある場合、character-sheet.stats は fieldDefs に準拠する構造化 payload。schema が extension point を宣言している場合、その追加 field は valid とみなす。AppView の validation は advisory preflight に限り、API が唯一の authoritative validation を行う。

理由: 型付きのキャラクターシートは Cerulia の差別化ポイント。UX の即時性は AppView の preflight で担保し、正本への書き込み可否は API の authoritative validation で固定する。

補足: AppView の primary create flow は schema-backed を前提にする。sheetSchemaRef を持たない schema-less sheet は legacy/import/recovery の safety valve に限り、public/shared surface では structured stats を出さない。

## 20. 優先度: キャラクター作成 > セッション記録 > 共有

採用: キャラクター作成体験を最も重要な機能として位置づける。

理由: ユーザーは共有されたキャラクターを見て Cerulia を知り、自分のキャラクターを作ることで価値を感じる。どのシステムでもキャラクターを一つのサービスで作れることが最初の魅力。

## 21. session surface は owner-only workbench

採用: `/sessions` は owner-only の workbench とし、一覧・inline detail・再編集で閉じる。共有 surface に session 専用 route は作らない。

理由: shared surface の root は character detail であり、session は PL の自己記録である。public-safe な session 情報は character detail や campaign / house projection に畳み込めば十分。

## 22. campaign / house / scenario は mutable

採用: campaign、house、scenario は create-only ではなく mutable record とし、対応する update procedure を持つ。

理由: title、summary、maintainerDids、外部リンクなどの修正需要が自然にある。updatedAt を持つ以上、transport 契約も更新経路を持つべきである。

## 23. character-conversion は same-owner に限定する

採用: character-conversion は source / target が同一 owner の場合だけ product-core で扱う。cross-owner conversion は scope 外に置く。

理由: 他人の branch を provenance として持ち出す consent primitive を product-core に入れないため。same-owner であれば provenance を安全に閉じられる。
