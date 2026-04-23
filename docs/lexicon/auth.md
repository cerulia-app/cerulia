# auth namespace

permission-set 定義は auth lexicon にまとめ、app.cerulia.dev.auth* の bundle 名で管理する。

`app.cerulia.auth*` の bare namespace は互換 alias として受け入れるが、文書上の canonical source-of-truth は `app.cerulia.dev.auth*` に固定する。

## 基本方針

- permission-set は卓内 role（GM / PL）を表さず、OAuth scope 用の technical bundle だけを表す
- public mode は reader lens であり、auth bundle ではない
- GM も PL も同じ bundle を使う

## bundle 一覧

| bundle | 役割 | 代表 capability |
| --- | --- | --- |
| app.cerulia.dev.authCoreReader | owner 向け authenticated core projection を読む | getCharacterHome、getCharacterBranchView、getPlayerProfileView、getCampaignView、getHouseView、listSessions、getSessionView |
| app.cerulia.dev.authCoreWriter | core record を更新する | createCharacterSheet、updateCharacterSheet、rebaseCharacterSheet、createCharacterBranch、updateCharacterBranch、retireCharacterBranch、createSession、updateSession、recordCharacterAdvancement、recordCharacterConversion、createScenario、updateScenario、updatePlayerProfile、createCampaign、updateCampaign、createHouse、updateHouse、createRuleProfile、updateRuleProfile、createCharacterSheetSchema |

## endpoint matrix

- `getCharacterHome`: caller 自身の self-home だけを返す owner-only query。`app.cerulia.dev.authCoreReader` 必須
- `getCharacterBranchView`: owner mode は `app.cerulia.dev.authCoreReader`。public / anonymous mode は auth bundle なしの public reader として同じ endpoint の public lens を使う。draft は一覧に出さない
- `getPlayerProfileView`: owner mode は `app.cerulia.dev.authCoreReader`。public / anonymous mode は auth bundle なしで DID 直解決を許す。shared root は character detail のまま保つ
- `getCampaignView`: owner mode は `app.cerulia.dev.authCoreReader`。public / anonymous mode は auth bundle なしの public reader として同じ endpoint の public lens を使う。draft は一覧に出さず、public mode では draft child を返さない
- `getHouseView`: owner mode は `app.cerulia.dev.authCoreReader`。public / anonymous mode は auth bundle なしの public reader として同じ endpoint の public lens を使う。draft は一覧に出さず、public mode では draft child を返さない
- `listSessions`: caller 自身の session workbench 用 owner-only query
- `getSessionView`: owner mode は `app.cerulia.dev.authCoreReader`。public / anonymous mode は auth bundle なしの direct ref read を許す
- `getPlayerProfileView`: caller 自身の profile 編集前確認と public summary の両方に使う
- `listScenarios`, `getScenarioView`: auth bundle なしで anonymous read を許す
- `getCharacterBranchView`, `getCampaignView`, `getHouseView`: public / anonymous mode は auth bundle なしで public lens read を許す
- `listCharacterSheetSchemas`, `getCharacterSheetSchema`: auth bundle なしで anonymous read を許す
- `listRuleProfiles`, `getRuleProfile`: `app.cerulia.dev.authCoreReader` を要求する。public surface は埋め込み overlay summary を使う
- すべての mutation procedure は `app.cerulia.dev.authCoreWriter` を要求する

`updatePlayerProfile` は singleton record に対する owner-only mutation であり、callerDid 自身の repo にしか書かない。

## mutation authorization matrix

- character-sheet / character-branch / character-advancement / character-conversion / session: owner-only
- campaign / house / scenario / rule-profile / character-sheet-schema: owner-only
- `authCoreWriter` は transport bundle であり、個別 procedure の owner 判定を省略しない

## 設計上の注意

- authCoreReader は owner 向けの read bundle。public mode は endpoint ごとに anonymous read 可否を明示し、visibility: public な record だけを返す
- authCoreWriter は全ての core mutation に使う
- auth bundle 名は role 名に寄せず、technical responsibility を名前に出す

## 避けるべき切り方

- GM 専用 scope、PL 専用 scope を作る
- broad super-scope 1 本で運用する
