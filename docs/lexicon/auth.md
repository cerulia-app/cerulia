# auth namespace

permission-set 定義は auth lexicon にまとめ、app.cerulia.auth* の bundle 名で管理する。

## 基本方針

- permission-set は卓内 role（GM / PL）を表さず、OAuth scope 用の technical bundle だけを表す
- public mode は reader lens であり、auth bundle ではない
- GM も PL も同じ bundle を使う

## bundle 一覧

| bundle | 役割 | 代表 capability |
| --- | --- | --- |
| app.cerulia.authCoreReader | core projection を読む | getCharacterHome、getCampaignView、listScenarios |
| app.cerulia.authCoreWriter | core record を更新する | createCharacterSheet、createSession、recordCharacterAdvancement、createCampaign |

## 設計上の注意

- authCoreReader は owner 向けの core read に使う。public mode は anonymous でも返してよいが、visibility: public な record だけを返す
- authCoreWriter は全ての core mutation に使う
- auth bundle 名は role 名に寄せず、technical responsibility を名前に出す

## 避けるべき切り方

- GM 専用 scope、PL 専用 scope を作る
- broad super-scope 1 本で運用する
