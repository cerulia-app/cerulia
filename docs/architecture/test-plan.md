# テスト計画

## 状態

2026-04-14 のリセットにより、旧 Go backend と旧 AppView のテスト計画は current ではありません。
削除済みの backend 手順や final gate を現行の検証入口として使わないでください。

## 現在の最小検証

- appview の `npm run check`
- appview の `npm run lint`
- appview の `npm run test`
- appview の `npm run build`

新しいテスト計画は、再実装の境界が固まってから別途定義します。
