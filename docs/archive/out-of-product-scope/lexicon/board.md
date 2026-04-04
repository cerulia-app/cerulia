# 盤面 namespace

盤面は app.cerulia.board.* として独立させる。理由は、更新頻度、競合規則、payload の複雑さが core より明らかに高いからである。

## 推奨 NSID 一覧

| NSID | primary type | record-key | 用途 |
| --- | --- | --- | --- |
| app.cerulia.board.scene | record | stable | マップとレイヤーの定義 |
| app.cerulia.board.token | record | stable | 盤面オブジェクトの識別子 |
| app.cerulia.board.boardOp | record | tid | 確定済み盤面操作 |
| app.cerulia.board.boardSnapshot | record | tid | 復元用 snapshot |

## 実装固定ルール

- app.cerulia.board.boardOp の `operation` は inline closed union として扱い、separate な payload field は持たない。
- 盤面座標は float を使わず integer board space に固定する。
- layer は scene.layerConfig にぶら下がる stable な `layerKey` で指定する。
- scene 単位の visibility は scene.visibility の stable default と、board-op の `setSceneVisibility` から投影する current 値の二段で扱う。

## board-op main schema

`app.cerulia.board.boardOp` の main record は次の field contract に固定する。

| field | type | required | notes |
| --- | --- | --- | --- |
| sessionRef | app.cerulia.defs#sessionRef | yes | governing run |
| sceneRef | app.cerulia.defs#sceneRef | yes | revision 空間の単位 |
| actorDid | app.cerulia.defs#did | yes | 要求を出した actor |
| opSeq | integer | yes | accepted 後の確定 revision |
| expectedRevision | integer | yes | caller が最後に見ていた revision |
| requestId | app.cerulia.defs#requestId | yes | service log 相関と idempotency |
| operation | closed union | yes | 下表の 7 variant に固定 |
| createdAt | app.cerulia.defs#datetime | yes | authority が受理した時刻 |

Lexicon-ready な shape は次のとおりである。

```json
{
	"lexicon": 1,
	"id": "app.cerulia.board.boardOp",
	"defs": {
		"main": {
			"type": "record",
			"key": "tid",
			"record": {
				"type": "object",
				"required": [
					"sessionRef",
					"sceneRef",
					"actorDid",
					"opSeq",
					"expectedRevision",
					"requestId",
					"operation",
					"createdAt"
				],
				"properties": {
					"sessionRef": { "type": "ref", "ref": "app.cerulia.defs#sessionRef" },
					"sceneRef": { "type": "ref", "ref": "app.cerulia.defs#sceneRef" },
					"actorDid": { "type": "ref", "ref": "app.cerulia.defs#did" },
					"opSeq": { "type": "integer", "minimum": 1 },
					"expectedRevision": { "type": "integer", "minimum": 0 },
					"requestId": { "type": "ref", "ref": "app.cerulia.defs#requestId" },
					"operation": {
						"type": "union",
						"closed": true,
						"refs": [
							"#moveToken",
							"#createToken",
							"#removeToken",
							"#updateTokenFacet",
							"#setSceneVisibility",
							"#drawCommittedStroke",
							"#clearLayer"
						]
					},
					"createdAt": { "type": "ref", "ref": "app.cerulia.defs#datetime" }
				}
			}
		}
	}
}
```

## operation variant schema

`operation` union の variant は次の最小 field set に固定する。

| variant | required fields | optional fields | notes |
| --- | --- | --- | --- |
| moveToken | tokenId: string, x: integer, y: integer | layerKey: string | token の同一性と移動先だけで replay できる |
| createToken | tokenId: string, x: integer, y: integer | layerKey: string | stable token record を盤面上へ materialize する |
| removeToken | tokenId: string | - | 削除対象が一意なら十分 |
| updateTokenFacet | tokenId: string, facetKind: app.cerulia.defs#tokenFacetKind | publicFacet, secretFacetEnvelopeRef, controllerDids[], visibilityMode | facetKind は shared enum に固定する |
| setSceneVisibility | visibility: app.cerulia.defs#visibility | - | sceneRef は outer envelope で分かる |
| drawCommittedStroke | layerKey: string, points: array<object{x,y}> | - | point は integer pair に固定 |
| clearLayer | layerKey: string | - | layer 単位の全消去 |

`updateTokenFacet` は 1 variant のまま保ち、facetKind と matching field の invariant を次で固定する。

- `facetKind = public-facet` のとき `publicFacet` を必須にし、他の value field は禁止する。
- `facetKind = secret-facet-envelope` のとき `secretFacetEnvelopeRef` を必須にし、他の value field は禁止する。
- `facetKind = controller-dids` のとき `controllerDids` を必須にし、他の value field は禁止する。
- `facetKind = visibility-mode` のとき `visibilityMode` を必須にし、他の value field は禁止する。

variant refs の実体 schema は次に固定する。

```json
{
	"moveToken": {
		"type": "object",
		"required": ["tokenId", "x", "y"],
		"properties": {
			"tokenId": { "type": "string", "format": "record-key" },
			"x": { "type": "integer" },
			"y": { "type": "integer" },
			"layerKey": { "type": "string" }
		}
	},
	"createToken": {
		"type": "object",
		"required": ["tokenId", "x", "y"],
		"properties": {
			"tokenId": { "type": "string", "format": "record-key" },
			"x": { "type": "integer" },
			"y": { "type": "integer" },
			"layerKey": { "type": "string" }
		}
	},
	"removeToken": {
		"type": "object",
		"required": ["tokenId"],
		"properties": {
			"tokenId": { "type": "string", "format": "record-key" }
		}
	},
	"tokenPublicFacet": {
		"type": "object",
		"properties": {
			"label": { "type": "string" },
			"assetRef": { "type": "ref", "ref": "app.cerulia.defs#assetRef" },
			"badgeText": { "type": "string" },
			"sizeHint": { "type": "string" }
		}
	},
	"updateTokenFacet": {
		"type": "object",
		"required": ["tokenId", "facetKind"],
		"properties": {
			"tokenId": { "type": "string", "format": "record-key" },
			"facetKind": { "type": "ref", "ref": "app.cerulia.defs#tokenFacetKind" },
			"publicFacet": { "type": "ref", "ref": "#tokenPublicFacet" },
			"secretFacetEnvelopeRef": { "type": "ref", "ref": "app.cerulia.defs#secretEnvelopeRef" },
			"controllerDids": {
				"type": "array",
				"items": { "type": "ref", "ref": "app.cerulia.defs#did" },
				"minLength": 1
			},
			"visibilityMode": { "type": "ref", "ref": "app.cerulia.defs#visibility" }
		}
	},
	"setSceneVisibility": {
		"type": "object",
		"required": ["visibility"],
		"properties": {
			"visibility": { "type": "ref", "ref": "app.cerulia.defs#visibility" }
		}
	},
	"point": {
		"type": "object",
		"required": ["x", "y"],
		"properties": {
			"x": { "type": "integer" },
			"y": { "type": "integer" }
		}
	},
	"drawCommittedStroke": {
		"type": "object",
		"required": ["layerKey", "points"],
		"properties": {
			"layerKey": { "type": "string" },
			"points": {
				"type": "array",
				"items": { "type": "ref", "ref": "#point" },
				"minLength": 2
			}
		}
	},
	"clearLayer": {
		"type": "object",
		"required": ["layerKey"],
		"properties": {
			"layerKey": { "type": "string" }
		}
	}
}
```

## board view output shape

`app.cerulia.rpc.getBoardView` は participant / operator の 2 lens を持ち、同じ canonical board state から mode ごとに畳み込んで返す。

| field | type | required | notes |
| --- | --- | --- | --- |
| sessionRef | app.cerulia.defs#sessionRef | yes | governing run |
| sceneRef | app.cerulia.defs#sceneRef | yes | current scene |
| mode | string | yes | participant / operator |
| revision | integer | yes | latest accepted revision |
| snapshotRevision | integer | no | current snapshot に取り込まれた最終 opSeq |
| snapshotRef | app.cerulia.defs#boardSnapshotRef | no | canonical snapshot がある場合のみ |
| scene | object | yes | participant mode は sceneRef, title, visibility の redacted summary。operator mode では editable layer 情報を追加してよい |
| tokens | array | yes | participant mode は visible token の tokenId, tokenRef, x, y, layerKey, visibilityMode, publicFacet summary に留める。operator mode では controllerDids や secretFacetEnvelopeRef のような編集向け field を追加してよい |
| recentOps | array | no | sinceRevision 指定時だけ返してよい |

- participant mode は hidden token、未公開 handout、secret facet payload、controller-only metadata を返してはならない。
- operator mode でも disclosure grant を無視して secret payload 平文を直接返してはならない。必要なら secretEnvelopeRef までに留める。

## revision の扱い

- expectedRevision は、要求者が最後に見ていた確定済み盤面 revision を指す。
- 受理された board-op の opSeq は、その操作を取り込んだ後の確定済み盤面 revision として扱う。
- board-snapshot の snapshotRevision は、その snapshot に取り込まれた最後の opSeq に一致させる。
- board-snapshot の fromOpSeq は、直前 checkpoint 以後に畳み込んだ最初の opSeq を指す。
- 投影層は snapshot 以降の op を適用して最新盤面を再構成する。
- revision は (sessionRef, sceneRef) ごとに独立して増える。
- opSeq は authority が accepted op にだけ割り当てる単調増加値であり、reject では消費しない。
- 同じ (sessionRef, sceneRef, snapshotRevision) に対して canonical snapshot は 1 件だけ持ち、再生成時は既存 checkpoint を置き換える。

この前提にすると、競合検出と再接続復元の両方を単純化できる。