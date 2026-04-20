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
import type * as AppCeruliaCoreScenario from '../core/scenario.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.cerulia.scenario.getView'

export type QueryParams = {
  scenarioRef: string
}
export type InputSchema = undefined

export interface OutputSchema {
  scenario?: AppCeruliaCoreScenario.Main
  scenarioSummary?: ScenarioSummary
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

export interface ScenarioSummary {
  $type?: 'app.cerulia.scenario.getView#scenarioSummary'
  scenarioRef: string
  title: string
  rulesetNsid?: string
  hasRecommendedSheetSchema: boolean
  summary?: string
  sourceCitationUri?: string
}

const hashScenarioSummary = 'scenarioSummary'

export function isScenarioSummary<V>(v: V) {
  return is$typed(v, id, hashScenarioSummary)
}

export function validateScenarioSummary<V>(v: V) {
  return validate<ScenarioSummary & V>(v, id, hashScenarioSummary)
}
