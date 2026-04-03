# secret-envelope

## 役割

暗号化されたpayloadへの参照と暗号条件を表すrecord。秘匿本文の共通ラッパーとして使う。

## 置き場所

session authority actor のrepo。暗号文本体はblobまたは外部ストレージに置く。

## 主なフィールド

- sessionRef
- audienceRef
- payloadType
- cipherSuite
- keyVersion
- contentRef
- contentDigest
- createdAt

## 更新主体

session authority。

## 参照関係

- audience
- audience-grant
- handout
- message
- roll
- token
- character-state

## 設計上の注意

- secret-envelope 自体はアクセス許可ではない。復号権は audience-grant が担う。
- payloadType を持たせると、handout本文、token secret facet、private state を同じ仕組みで扱える。
- contentRef は blob でも externalUri でもよいが、digest は必ず持たせる。