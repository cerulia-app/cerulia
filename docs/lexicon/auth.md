# auth namespace

permission-set 定義は auth lexicon にまとめ、app.cerulia.auth* の bundle 名で管理する。

## 基本方針

- permission-set は卓内 role（GM / PL）を表さず、OAuth scope 用の technical bundle だけを表す
- public mode は reader lens であり、auth bundle ではない
- GM も PL も同じ bundle を使う

## bundle 一覧

| bundle | 役割 | 代表 capability |
| --- | --- | --- |
| app.cerulia.authCoreReader | owner 向け authenticated core projection を読む | getCharacterHome、getCharacterBranchView、getCampaignView、getHouseView、listSessions、getSessionView |
| app.cerulia.authCoreWriter | core record を更新する | createCharacterSheet、updateCharacterSheet、rebaseCharacterSheet、createCharacterBranch、updateCharacterBranch、retireCharacterBranch、createSession、updateSession、recordCharacterAdvancement、recordCharacterConversion、createScenario、updateScenario、createCampaign、updateCampaign、createHouse、updateHouse、createRuleProfile、updateRuleProfile、createCharacterSheetSchema |

## endpoint matrix

- `getCharacterHome`: caller 自身の self-home だけを返す owner-only query。`app.cerulia.authCoreReader` 必須
- `getCharacterBranchView`: owner mode は `app.cerulia.authCoreReader`。public / anonymous mode は auth bundle なしの public reader として同じ endpoint の public lens を使う。draft は一覧に出さない
- `getCampaignView`: owner mode は `app.cerulia.authCoreReader`。public / anonymous mode は auth bundle なしの public reader として同じ endpoint の public lens を使う。draft は一覧に出さず、public mode では draft child を返さない
- `getHouseView`: owner mode は `app.cerulia.authCoreReader`。public / anonymous mode は auth bundle なしの public reader として同じ endpoint の public lens を使う。draft は一覧に出さず、public mode では draft child を返さない
- `listSessions`, `getSessionView`: caller 自身の session workbench 用 owner-only query
- `listScenarios`, `getScenarioView`: auth bundle なしで anonymous read を許す
- `getCharacterBranchView`, `getCampaignView`, `getHouseView`: public / anonymous mode は auth bundle なしで public lens read を許す
- `listCharacterSheetSchemas`, `getCharacterSheetSchema`: auth bundle なしで anonymous read を許す
- `listRuleProfiles`, `getRuleProfile`: `app.cerulia.authCoreReader` を要求する。public surface は埋め込み overlay summary を使う
- すべての mutation procedure は `app.cerulia.authCoreWriter` を要求する

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
