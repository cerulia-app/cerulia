# 秘匿と公開境界の拡張

## 基本方針

secret payload と disclosure workflow は continuity core の必須要件ではない。この文書で扱うのは、optional extension が秘匿 data と後公開を on-platform で扱いたい場合だけである。

`AUTH_TRUSTED_PROXY_HMAC_SECRET` のような transport/auth 用の runtime secret は、この disclosure extension とは別系統で扱う。audience や secret-envelope の payload secret と混同しない。

## core との境界

- core は publication と retire を扱う
- extension は secret payload、audience、grant、reveal、redaction を扱う
- publication retire と secret disclosure は別 workflow にする

## 推奨する record の組み合わせ

- audience
- audience-grant
- secret-envelope
- reveal-event
- redaction-event

handout や token の秘匿 facet を持ちたいときだけ、この組を使う。

## extension の原則

### 1. 平文を core に戻さない

campaign、branch、publication、AppView summary に平文秘匿を混ぜない。

### 2. reveal と publication を混ぜない

publication は continuity artifact の公開入口、reveal は secret payload の後公開である。

`revealMode = publish-publicly` は disclosure audience を public に広げる意味に限り、core publication row の新規作成や publication current head の更新を意味しない。

### 3. redaction と retire を混ぜない

redaction は disclosure / run artifact の既定表示を外す仕組みであり、publication の終了は core の retire で扱う。

### 4. grant revoke と reuse revoke を混ぜない

audience-grant の revoke は復号権、reuse-grant の revoke は将来の継続利用権である。

## いつ extension を採るか

- GM only note を on-platform に残したい
- participant-only disclosure を後から公開したい
- secret handout や hidden token を扱いたい
- live replay と audit を分けたい

これらが不要なら、continuity core だけで十分である。