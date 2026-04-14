# GCP Cloud Run + Neon + R2 ホスティング / 運用方針

## 状態

2026-04-14 時点で、この文書が前提にしていた Go 実装と運用入口はリポジトリから削除されています。
現状の Cerulia workspace は、appview submodule の最小スケルトンだけを残した reset 状態です。

## 取り扱い

- この文書は historical note としてのみ扱ってください。
- `go run ./cmd/*`、`scripts/*.ps1`、migration、rebuild、smoke といった旧 backend 手順は現状では存在しません。
- 新方針で hosting を再定義するまでは、このファイルを運用 runbook の正本にしません。

## 当面の前提

- 実装の正本は docs 配下の最新方針文書です。
- appview は再実装開始用の最小 SvelteKit 構成だけが残っています。
- backend / batch / migration / restore drill の手順は、新しい実装構造に合わせて別途書き直す必要があります.
