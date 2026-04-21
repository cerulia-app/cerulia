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
const id = 'app.cerulia.scenario.list'

export type QueryParams = {
  rulesetNsid?: string
  limit?: number
  cursor?: string
}
export type InputSchema = undefined

export interface OutputSchema {
  items: ScenarioListItem[]
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

export interface ScenarioListItem {
  $type?: 'app.cerulia.scenario.list#scenarioListItem'
  scenarioRef: string
  title: string
  rulesetNsid?: string
  hasRecommendedSheetSchema: boolean
  summary?: string
}

const hashScenarioListItem = 'scenarioListItem'

export function isScenarioListItem<V>(v: V) {
  return is$typed(v, id, hashScenarioListItem)
}

export function validateScenarioListItem<V>(v: V) {
  return validate<ScenarioListItem & V>(v, id, hashScenarioListItem)
}
