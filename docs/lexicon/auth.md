# auth namespace

permission-set 定義は auth lexicon にまとめ、app.cerulia.auth* の bundle 名で管理する。

## 基本方針

- permission-set は卓内 role（GM / PL）を表さず、OAuth scope 用の technical bundle だけを表す
- public mode は reader lens であり、auth bundle ではない
- GM も PL も同じ bundle を使う

## bundle 一覧

| bundle | 役割 | 代表 capability |
| --- | --- | --- |
| app.cerulia.authCoreReader | owner / maintainer 向け core projection を読む | getCharacterHome、getCharacterBranchView、getCampaignView、getHouseView、listSessions、getSessionView、listCharacterSheetSchemas、getCharacterSheetSchema |
| app.cerulia.authCoreWriter | core record を更新する | createCharacterSheet、updateCharacterSheet、rebaseCharacterSheet、createCharacterBranch、updateCharacterBranch、retireCharacterBranch、createSession、updateSession、recordCharacterAdvancement、recordCharacterConversion、createScenario、updateScenario、createCampaign、updateCampaign、createHouse、updateHouse、createRuleProfile、updateRuleProfile、createCharacterSheetSchema |

## endpoint matrix

- `getCharacterHome`: caller 自身の self-home だけを返す owner-only query。`app.cerulia.authCoreReader` 必須
- `getCharacterBranchView`: owner は `app.cerulia.authCoreReader`。signed-in public viewer と anonymous は direct ref があれば visibility に関係なく detail を読めるが、draft は一覧に出さない
- `getCampaignView`: owner / maintainer は `app.cerulia.authCoreReader`。signed-in public viewer と anonymous は direct ref があれば visibility に関係なく detail を読める。draft は一覧に出さず、public mode では draft child を返さない
- `getHouseView`: owner / maintainer は `app.cerulia.authCoreReader`。signed-in public viewer と anonymous は direct ref があれば visibility に関係なく detail を読める。draft は一覧に出さず、public mode では draft child を返さない
- `listSessions`, `getSessionView`: caller 自身の session workbench 用 owner-only query
- `listScenarios`, `getScenarioView`: anonymous read を許す
- `listCharacterSheetSchemas`, `getCharacterSheetSchema`: anonymous read を許す
- すべての mutation procedure は `app.cerulia.authCoreWriter` を要求する

## mutation authorization matrix

- character-sheet / character-branch / character-advancement / character-conversion / session: owner-only
- campaign / house / scenario / rule-profile: owner または maintainerDids に含まれる actor
- character-sheet-schema: owner または maintainerDids に含まれる actorが新しい version pin を発行する
- `authCoreWriter` は transport bundle であり、個別 procedure の owner / maintainer 判定を省略しない

## 設計上の注意

- authCoreReader は owner / maintainer 向けの read bundle。public mode は endpoint ごとに anonymous read 可否を明示し、visibility: public な record だけを返す
- authCoreWriter は全ての core mutation に使う
- auth bundle 名は role 名に寄せず、technical responsibility を名前に出す

## 避けるべき切り方

- GM 専用 scope、PL 専用 scope を作る
- broad super-scope 1 本で運用する
