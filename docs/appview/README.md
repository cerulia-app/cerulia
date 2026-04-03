# AppView層UI設計

このディレクトリは、Cerulia の AppView を system console ではなく、character continuity を end-user が見通しよく扱う service surface として定義するための文書群である。公開入口では、作る、続ける、持ち運ぶ、見せるを一つの流れとして短く伝え、sign-in 後は character continuity に戻る workbench を返す。

この前提により、AppView は generic な character builder SaaS でも、session-centric な live play tool でもなくなる。Cerulia は、いまの版、引き継ぎ元、公開中の版を同じ service language で読める continuity service layer として振る舞う。

## Product Thesis

- public value first: public top は glossary や巨大な一覧ではなく、サービスの約束と始め方を示す public entry shell にする。
- character continuity first after sign-in: sign-in 後の既定価値は session lobby ではなく、続きを見る、作る、持ち運ぶ、公開する workbench に置く。
- continuity-native: 作成、成長、分岐、変換、公開は同じ continuity graph の上で説明される。
- plain words first: public surface では「いまの版」「引き継ぎ元」「公開中の版」を先に使い、内部語は補助説明に下げる。
- public-readable: public top は入口、publication library は公開中の版を読む canonical surface として成立させる。
- session-secondary: session、board、replay、governance は contextual surface であり、product root を置き換えない。
- mode-explicit: public、owner-steward、participant、governance、audit の lens を常に分ける。

## 主要 surface

| surface | 役割 | 主に依存する層 |
| --- | --- | --- |
| public top | サービスの約束、始め方、公開面への入口を短く返す public entry shell | projection、publication、session-publication |
| signed-in home | 続きを見る、作る、公開準備へ最短で戻る personal workbench | projection、AppView shell |
| character studio / detail | new sheet、import、branch、convert、current edition、公開準備をまとめて扱う主画面 | projection、publication |
| campaign workspace | 共有 continuity と公開方針を読む shared workspace | projection、publication |
| publication library | 公開中の版を読む canonical library 兼、owner-steward が公開面を管理する面 | projection、publication |
| session run shell | access preflight を経て structured run へ入る contextual surface | session、membership、authority |
| board workspace | scene / token の確定操作と揮発同期の表示 | board、realtime |
| replay / disclosure | public replay と participant replay を切り替えて読む面 | replay、secret disclosure |
| governance console | authority transfer、membership moderation、appeal、audit を扱う高密度 surface | authority、governance、audit |

## 文書一覧

- [サービスビジョン](service-vision.md)
- [SvelteKitベースAppView実装計画](implementation-plan.md)
- [デザインシステム](design-system.md)
- [レイヤー責務と境界](layer-boundaries.md)
- [トップページ設計](top-page.md)
- [必要機能一覧](features.md)
- [遷移構造](navigation.md)
- [UI/UX要件](ui-ux-requirements.md)
- [AppViewテスト計画](test-plan.md)

## ここで固定すること

- AppView を service として見たときの product thesis
- public top では service value first、signed-in home では character continuity first に切り替えること
- public top の first viewport を一般語だけで成立させること
- public top を entry shell、publication library を canonical public reading surface とする整理
- surface ごとの authoritative boundary と navigation の優先順位
- UI が守るべき secrecy / auditability / recovery の基本要件
- デザインシステム、service language、navigation label の最低基準

## ここで固定しないこと

- transport schema の細部
- realtime transport の実装方式
- recommendation system や social feed の将来仕様
- ruleset ごとの詳細な sheet editor widget