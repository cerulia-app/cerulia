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
