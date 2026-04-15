# AppView 層 UI 設計

Cerulia の AppView は PL 向けのキャラクター管理・セッション記録・共有サービスの UI である。

## 文書の読み方

このディレクトリには、reset 後の current runtime note と、再実装に向けた target MVP spec が同居している。読むときは次で分ける。

| 区分 | 文書 | 役割 |
| --- | --- | --- |
| current runtime | `top-page.md`、`design-system.md`、`navigation.md` の current section、`ui-ux-requirements.md` の current section、`test-plan.md` の current section | 今動いている最小 skeleton の説明 |
| target MVP | この README、`overview.md`、`service-vision.md`、`features.md`、`layer-boundaries.md`、`navigation.md` の target section、`ui-ux-requirements.md` の target section、`test-plan.md` の target section | 再実装で目指す surface と境界 |
| historical note | `implementation-plan.md` | reset 前計画の退避。current spec としては使わない |

## Product Thesis

- **PL-first**: 全ての体験は PL の視点から設計する。GM 専用画面は作らない
- **キャラクター作成が最初の価値**: どのシステムでもキャラクターを作れることが最初の魅力
- **plain words**: public surface では内部語を使わず、「キャラクターを作る」「遊んだ記録を残す」「見せる」で伝える
- **public entry**: 共有リンクの canonical surface は character detail。public profile は secondary later に留め、MVP に置かない
- **locale-aware**: public / owner の UI copy と system message は多言語対応を前提に設計する
- **GM share minimum**: 共有された character detail の first view で、プロフィール、ステータス、立ち絵がそろうことを重視する

## MVP canonical flow

1. 他人から共有された character detail を見て価値を理解する
2. サインインして自分の character を作る
3. セッション後に session と advancement を記録する
4. 次の卓で同じ character を再共有する

## 主要 surface

| surface | 役割 |
| --- | --- |
| public top | Cerulia の価値説明と始め方、公開キャラクターへの入口 |
| signed-in home | 継続作業、最近のセッション、次にやること |
| character detail | キャラクターの詳細、stats、立ち絵、公開セッション履歴、成長履歴、conversion provenance。schema-less の場合は公開 structured stats を省略する |
| character create | ルールシステム選択 → schema 選択 → フィールド入力 + ダイスロール → 確認 → 作成。通常の新規作成は schema-backed を前提にする |
| session record | 完走後のセッション経験を 1 件記録するフォーム。record role として `pl` / `gm` を選ぶ |
| sessions | owner-only workbench。自分の session 一覧、inline detail、再編集導線 |
| scenario catalog | シナリオの検索・一覧・登録 |
| public profile | post-MVP の secondary public surface。プレイヤー単位の自己紹介と公開 character への導線を束ねるが、canonical shared root にはしない |
| campaign view | secondary surface。長期卓のセッション一覧と rule overlay |
| house detail | secondary surface。house metadata と activity summary |

## 文書一覧

- [デザインシステム](design-system.md)
- [AppView 概要](overview.md)
- [共有画面ワイヤーフレーム](character-detail-wireframes.md)
- [サービスビジョン](service-vision.md)
- [トップページ設計](top-page.md)
- [必要機能一覧](features.md)
- [遷移構造](navigation.md)
- [UI/UX 要件](ui-ux-requirements.md)
- [レイヤー責務と境界](layer-boundaries.md)
- [SvelteKit ベース AppView 実装計画](implementation-plan.md)
- [AppView テスト計画](test-plan.md)
