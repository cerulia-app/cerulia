# reveal-event

## 役割

optional disclosure extension が、秘匿だった run artifact を、いつ、誰が、どの範囲へ公開したかを表す record。core publication retire/correction とは別の履歴である。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- sessionRef
- subjectRef
- fromAudienceRef
- toAudienceRef
- revealMode
- requestId
- performedByDid
- revealedAt
- note

## 更新主体

session authority。

## 参照関係

- handout
- message
- roll
- token
- character-state
- secret-envelope

## 設計上の注意

- reveal は「前は見えなかった」という履歴価値があるため、単なる更新で済ませない。
- core publication は continuity artifact の公開入口を扱い、reveal-event は secret disclosure の後公開だけを扱う。
- 全体公開だけでなく、GM only から参加者全体へ、参加者全体から観戦者へ、のような段階公開も表せるようにする。
- requestId は revealSubject と service log を相関づける共通 field とする。
- 投影層は reveal-event を見て表示優先順位を切り替える。
- subjectRef は handout、message、roll、token、character-state、secret-envelope のような秘匿を持つ subject 全般を受けられるようにする。
- 同じ subject に後から redaction-event が積まれた場合、通常 view ではその redaction を優先し、audit view では両方の履歴を残す。