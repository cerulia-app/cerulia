# AppView 層 UI 設計

Cerulia の AppView は PL 向けのキャラクター管理・セッション記録・共有サービスの UI である。

## Product Thesis

- **PL-first**: 全ての体験は PL の視点から設計する。GM 専用画面は作らない
- **キャラクター作成が最初の価値**: どのシステムでもキャラクターを作れることが最初の魅力
- **plain words**: public surface では内部語を使わず、「キャラクターを作る」「遊んだ記録を残す」「見せる」で伝える
- **public entry**: 共有リンクからキャラクターが見えることが発見経路

## 主要 surface

| surface | 役割 |
| --- | --- |
| public top | Cerulia の価値説明と始め方、公開キャラクターへの入口 |
| signed-in home | キャラクター一覧、最近のセッション、続きの作業 |
| character detail | キャラクターの詳細、stats、立ち絵、セッション履歴、成長履歴 |
| character create | ルールシステム選択 → schema 取得 → フィールド入力 → ダイスロール → 作成 |
| session record | セッション経験の記録（シナリオ、キャラクター、日付、結果） |
| scenario catalog | シナリオの検索・一覧・登録 |
| campaign view | 長期卓のセッション一覧と rule overlay |
| profile public view | 他人のキャラクター一覧（visibility: public のみ） |

## 文書一覧

- [デザインシステム](design-system.md)
- [サービスビジョン](service-vision.md)
- [トップページ設計](top-page.md)
- [必要機能一覧](features.md)
- [遷移構造](navigation.md)
- [UI/UX 要件](ui-ux-requirements.md)
- [レイヤー責務と境界](layer-boundaries.md)
- [SvelteKit ベース AppView 実装計画](implementation-plan.md)
- [AppView テスト計画](test-plan.md)
# AppView 層 UI 設計

このディレクトリは、Cerulia の AppView を system console ではなく、character continuity を end-user が見通しよく扱う Character Continuity Workbench として定義するための文書群である。public entry では、作る、続ける、持ち運ぶ、見せるを一つの流れとして短く伝え、sign-in 後はその workbench へ戻す。

Cerulia 自体は continuity service だが、AppView ではそれを generic な character builder SaaS でも、session-centric な live play tool でもない Character Continuity Workbench として見せる。いまの版、引き継ぎ元、公開中の版を同じ service language で読めることを front の主約束にする。

## Product Thesis

- public value first: public top は Character Continuity Workbench の約束と始め方を示す public entry shell にする
- character continuity first after sign-in: sign-in 後の既定価値は session lobby ではなく、Character Continuity Workbench に置く
- continuity-native: 作成、成長、分岐、変換、公開は同じ continuity graph の上で説明される
- plain words first: public surface では「いまの版」「引き継ぎ元」「公開中の版」を先に使い、内部語は補助説明に下げる
- public-readable: publication library は公開中の版を読む canonical surface として成立させる
- lens-separated: public と owner の lens を route と copy で混ぜない

## 主要 surface

| surface                   | 役割                                                                                       | 主に依存する層            |
| ------------------------- | ------------------------------------------------------------------------------------------ | ------------------------- |
| public top                | Character Continuity Workbench の約束、始め方、公開面への入口を短く返す public entry shell | projection、publication   |
| signed-in home            | 続きを見る、作る、公開準備へ最短で戻る Character Continuity Workbench                      | projection、AppView shell |
| character studio / detail | new sheet、import、branch、convert、current edition、公開準備をまとめて扱う主画面          | projection、publication   |
| campaign workspace        | shared continuity と公開方針を読む shared workspace                                        | projection、publication   |
| publication library       | 公開中の版を読む canonical library 兼、owner が公開面を管理する面                  | projection、publication   |

## 文書一覧

- [サービスビジョン](service-vision.md)
- [デザインシステム](design-system.md)
- [レイヤー責務と境界](layer-boundaries.md)
- [トップページ設計](top-page.md)
- [必要機能一覧](features.md)
- [遷移構造](navigation.md)
- [UI/UX 要件](ui-ux-requirements.md)
- [SvelteKit ベース AppView 実装計画](implementation-plan.md)
- [AppView テスト計画](test-plan.md)

## ここで固定すること

- AppView の主概念を Character Continuity Workbench、視覚トーンを daylight workbench に分けること
- AppView を service として見たときの product thesis
- public top では service value first、signed-in home では character continuity first に切り替えること
- public top の first viewport を一般語だけで成立させること
- public top を entry shell、publication library を canonical public reading surface とする整理
- surface ごとの authoritative boundary と navigation の優先順位
- デザインシステム、service language、navigation label の最低基準

## ここで固定しないこと

- transport schema の細部
- recommendation system や social feed の将来仕様
- archive 側 workflow の UI
- ruleset ごとの詳細な sheet editor widget
