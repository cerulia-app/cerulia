# AppView テスト計画

## 状態

2026-04-14 のリセットにより、旧 mounted / final-gate 前提のテスト計画は current ではありません。

## 現在の最小検証

- `npm run check`
- `npm run lint`
- `npm run test`
- `npm run build`

現在の `npm run test` は reset 状態の最小 smoke として、placeholder copy の整合だけを確認します。
将来の component / route / e2e 計画は再実装後に再定義してください。
