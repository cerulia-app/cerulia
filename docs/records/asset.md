# asset

## 役割

画像、マップ、添付資料、音声などのメディア参照を表すrecord。blob か外部URIかを統一的に扱うためのmetadataになる。

## 置き場所

所有者repo、またはsession authority repo。公開資産は個人repoでもよいが、卓専用資産はauthority側に寄せた方が扱いやすい。

## 主なフィールド

- ownerDid
- mediaType
- size
- digest
- blobRef
- externalUri
- purpose
- createdAt

## 更新主体

asset の所有者。

## 参照関係

- scene
- handout
- secret-envelope

## 設計上の注意

- asset は本体ではなく参照metadataとして扱う。
- 小さな公開画像はblob、大きな秘匿資料は外部ストレージ参照に逃がしてもよい。
- digest を持つと、外部URIでも内容一致確認がしやすい。