# character-episode

## 役割

ある character-branch が、どの continuity 文脈を通って何を持ち帰ったかを要約する summary record。growth fact の authoritative source にはならず、branch と advancement と optional な run provenance を結ぶ link として使う。

## 置き場所

branch owner の repo を基本にする。campaign が continuity summary を索引したい場合は、campaign 側で参照や集約を持ってよい。

## 主なフィールド

- characterBranchRef
- campaignRef
- sourceRunRef
- scenarioLabel
- rulesetManifestRef
- effectiveRuleProfileRefs
- outcomeSummary
- advancementRefs
- supersedesRef
- recordedByDid
- createdAt
- requestId

## 更新主体

branch owner、または branch owner が認めた continuity steward。

## 参照関係

- character-branch
- campaign
- character-advancement
- publication

## 設計上の注意

- character-episode は summary / link record であり、XP 消費や能力値変更の authoritative source を持たない。growth fact は character-advancement に残す。
- campaignRef は任意とし、campaign に属する continuity summary である場合だけ持つ。
- sourceRunRef は optional extension が structured run を持つときだけ使う provenance ref であり、session を core root に戻さない。
- ruleset をまたぐ変換 provenance は character-episode に押し込まず、character-conversion に残す。episode は変換後の continuity summary を持ってよいが、変換 ledger 自体にならない。
- 変換済み branch の summary で campaignRef を持つ場合、対応する current character-conversion.targetCampaignRef があればその値と一致しなければならない。conversion path の canonical provenance は character-conversion に残し、episode は summary mirror に留める。
- effectiveRuleProfileRefs は ordered snapshot とし、episode 作成時点の continuity rule chain をそのまま保存する。
- sourceRunRef が extension session を指す場合、campaignRef はその session の campaign provenance と矛盾してはならず、rulesetManifestRef と effectiveRuleProfileRefs もその run が pin した contract と整合していなければならない。
- advancementRefs も ordered list とし、その episode から見た growth / correction の確定順を保存する。
- advancementRefs に入る各 advancement は、必ずこの episode の characterBranchRef と同じ branch を指していなければならない。
- 通常は chapter 区切り、milestone、公開用要約の確定時に 1 回以上書く。optional extension が structured run を持つ場合は run close 時に書いてよい。
- scenarioLabel は軽い要約 field として持ってよい。reusable な scenario record を導入する場合は、別 field で参照してもよい。
- outcomeSummary は player-facing な run summary を想定し、監査専用 detail は含めない。
- episode の訂正は既存 record を直接編集せず、同じ characterBranchRef を指す supersedesRef 付きの新規 episode か、参照先の advancement correction で扱う。