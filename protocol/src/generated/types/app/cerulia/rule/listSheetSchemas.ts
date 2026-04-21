/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from '@atproto/xrpc'
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../lexicons'
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from '../../../../util'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.cerulia.rule.listSheetSchemas'

export type QueryParams = {
  rulesetNsid?: string
  limit?: number
  cursor?: string
}
export type InputSchema = undefined

export interface OutputSchema {
  items: SheetSchemaListItem[]
  cursor?: string
}

export interface CallOptions {
  signal?: AbortSignal
  headers?: HeadersMap
}

export interface Response {
  success: boolean
  headers: HeadersMap
  data: OutputSchema
}

export function toKnownErr(e: any) {
  return e
}

export interface SheetSchemaListItem {
  $type?: 'app.cerulia.rule.listSheetSchemas#sheetSchemaListItem'
  schemaRef: string
  baseRulesetNsid: string
  schemaVersion: string
  title: string
}

const hashSheetSchemaListItem = 'sheetSchemaListItem'

export function isSheetSchemaListItem<V>(v: V) {
  return is$typed(v, id, hashSheetSchemaListItem)
}

export function validateSheetSchemaListItem<V>(v: V) {
  return validate<SheetSchemaListItem & V>(v, id, hashSheetSchemaListItem)
}
