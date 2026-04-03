# ruleset-manifest

## 役割

ある rulesetNsid に対して、どの structured action をどの executable contract で解決するかを pin する record。session が使う機械裁定の基底版になる。

## 置き場所

ruleset maintainer の repo、または library repo。

## 主なフィールド

- rulesetNsid
- manifestVersion
- actionSchemaRefs
- outputSchemaRefs
- resolverRef
- resolverVersion
- capabilityKinds
- publishedAt
- retiredAt

## 更新主体

ruleset maintainer、または ruleset library の管理主体。

## 参照関係

- session
- rule-profile
- ruling-event

## 設計上の注意

- session は rulesetNsid だけでなく rulesetManifestRef も持ち、その卓で使う executable contract を固定する。
- rulesetManifestRef は mutable current-head alias ではなく、公開後は意味が変わらない immutable contract pin として扱う。contract や replay 意味論を変える変更は、既存 record を上書きせず必ず新しい ruleset-manifest record と新しい ref を発行する。
- ordered ruleProfileRefs はこの manifest の上に重ねる overlay として扱い、manifest の contract を互換なしに壊してはならない。
- actionSchemaRefs と outputSchemaRefs は ruleset 固有 namespace への参照でよく、core schema に universal DSL を押し込まない。
- character-conversion は source / target の解釈 pin として rulesetManifestRef を参照してよいが、cross-ruleset の mapping contract 自体はこの record に押し込まない。
- resolverRef は実行系の場所や識別子を指すための中立 field とし、特定の配布形態に固定しない。
- retiredAt は future selection を止めるために使ってよいが、既に pin 済みの campaign / session / conversion / episode の意味を後から再解釈してはならない。resolverVersion が変わって replay の意味が変わるなら、新しい manifest を公開して session 側で pin を切り替える。