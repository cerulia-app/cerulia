# Cloudflare Workers + SQLite-first ホスティング方針

## 目的

Cerulia backend の current な deploy 方針を定義する。
service 名は runtime 都合ではなく責務で固定し、deploy target はその後段で選ぶ。

## deploy 単位

- `api`: canonical write/read authority
- `projection`: optional な read-model / discovery service
- `appview`: UI surface

`protocol` は deployable service ではない。

## self-host の最小構成

最小 self-host 構成は `appview + api` とする。

- `api` は Bun 上で動かす
- storage は file-backed SQLite を使う
- direct-link detail と owner workbench はこの構成で成立させる

この構成では catalog、discovery、横断検索の一部を持たないことを許容する。

## 拡張構成

discoverability が必要な場合だけ `projection` を追加する。

- `projection` は別 service としてデプロイする
- `projection` は独自の SQLite derived store を持つ
- `projection` は replay / rebuild 可能であることを前提にする

## Workers 方針

- Cloudflare Workers は当面の deploy target とする
- Workers 固有 API は adapter 層に閉じ込める
- service boundary、domain rule、contract は Workers 非依存に保つ
- Worker adapter では live public-agent lookup を canonical path に使わない。destination を pre-connect pin できる transport が入るまでは、canonical public reads は injected source か self-host 側の pinned adapter に委ねる
- `api` Worker の public / anonymous direct read は cache-backed に限る。cold remote hydration は Bun/self-host 側の pinned adapter が担う

## SQLite 方針

- `api` は operational store として SQLite を持つ
- `projection` は derived store として別 SQLite を持つ
- Workers では D1 を SQLite adapter として扱う
- self-host では file-backed SQLite を使う

SQLite を正本にするのであって、Cloudflare 固有 DB を正本にするわけではない。

## 運用原則

- `projection` のデータは再構築可能であること
- canonical write/read の可用性を `projection` に依存させないこと
- migration は `api` と `projection` で独立して管理すること
- backup / restore の優先対象は `api` 側の operational store と canonical record 参照経路であること
- Workers projection adapter は D1 catalog を保持できるが、live repo ingest は injected canonical source 前提とする
- injected source が無い projection Worker は cached catalog を serve するだけで、startup rebuild と internal ingest route は有効化しない

## 今後の runbook で固定する項目

- 起動手順
- health / ready check
- migration / rollback
- backup / restore
- Workers binding と local env の対応表