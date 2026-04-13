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
# auth namespace

permission-set 定義は dedicated な auth lexicon にまとめ、app.cerulia.auth* の flat な bundle 名で管理する。

## 基本方針

- permission-set は GM、PL のような卓内 role を表さず、OAuth scope 用の technical bundle だけを表す
- 定義は core / rpc に散らさず、auth lexicon に集約する
- client は必要な bundle を組み合わせて要求し、1 つの broad super-scope に依存しない
- public mode は reader lens であり、auth bundle ではない

## 推奨 bundle 一覧

| bundle | 役割 | 代表 capability |
| --- | --- | --- |
| app.cerulia.authCoreReader | core projection を読む | getCharacterHome、getCampaignView、listPublications |
| app.cerulia.authCoreWriter | core record を更新する | createCampaign、attachRuleProfile、retireRuleProfile、importCharacterSheet、createCharacterBranch、updateCharacterBranch、retireCharacterBranch、recordCharacterAdvancement、recordCharacterConversion、createSession、createSessionParticipation |
| app.cerulia.authCorePublicationOperator | core publication を更新する | publishSubject、retirePublication |

## Lexicon-ready permission-set skeleton

service bundle は次の形を正本にする。

```json
{
  "lexicon": 1,
  "id": "app.cerulia.authCoreReader",
  "defs": {
    "main": {
      "type": "permission-set",
      "permissions": [
        {
          "type": "permission",
          "resource": "rpc",
          "inheritAud": true,
          "lxm": [
            "app.cerulia.rpc.getCharacterHome",
            "app.cerulia.rpc.getCampaignView",
            "app.cerulia.rpc.listPublications"
          ]
        }
      ]
    }
  }
}
```

## 設計上の注意

- authCoreReader は owner 向けの core read に使う。campaign view は public mode を持つが、character home と branch-scoped list は owner-only とする
- public mode は anonymous でも返してよいが、返す内容は active な public publication current head に裏づけられた block だけに限る
- publishSubject と retirePublication は core publication の canonical path なので authCorePublicationOperator に切る
- auth bundle 名は role 名に寄せず、technical responsibility を名前に出す

## 避けるべき切り方

- GM 専用 scope、PL 専用 scope を作る
- core / rpc に permission-set 定義を散らす
- broad super-scope 1 本で運用する
- archive 側 operation を product auth bundle に混ぜる
