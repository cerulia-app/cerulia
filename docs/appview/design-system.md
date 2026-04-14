# Design System

## 状態

2026-04-14 のリセット時点で、現行 AppView の visual surface はトップページの最小 skeleton のみです。
旧 `/home` や `/characters` を前提にした layout rule は current ではありません。

## 現在の最小方針

- reset 状態が一目で分かること
- desktop / mobile の両方で破綻しないこと
- 再実装前に存在しない UI surface を匂わせないこと

将来の design system は、新しい route tree が固まってから再設計してください。
