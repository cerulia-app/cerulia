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
import type * as AppCeruliaCoreHouse from '../core/house.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.cerulia.house.getView'

export type QueryParams = {
  houseRef: string
}
export type InputSchema = undefined

export interface OutputSchema {
  house?: AppCeruliaCoreHouse.Main
  /** Campaign list items. Present in owner mode only. */
  campaigns?: CampaignListItem[]
  /** Session list items. Present in owner mode only. */
  sessions?: SessionListItem[]
  houseSummary?: HouseSummary
  /** Public-safe campaign summaries. Present in public/anonymous mode only. */
  campaignSummaries?: CampaignSummary[]
  /** Public-safe session summaries. Present in public/anonymous mode only. */
  sessionSummaries?: SessionSummary[]
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

export interface CampaignListItem {
  $type?: 'app.cerulia.house.getView#campaignListItem'
  campaignRef: string
  title: string
  rulesetNsid: string
  visibility: 'draft' | 'public' | (string & {})
  updatedAt?: string
}

const hashCampaignListItem = 'campaignListItem'

export function isCampaignListItem<V>(v: V) {
  return is$typed(v, id, hashCampaignListItem)
}

export function validateCampaignListItem<V>(v: V) {
  return validate<CampaignListItem & V>(v, id, hashCampaignListItem)
}

export interface SessionListItem {
  $type?: 'app.cerulia.house.getView#sessionListItem'
  sessionRef: string
  role: 'pl' | 'gm' | (string & {})
  playedAt: string
  scenarioLabel?: string
  visibility: 'draft' | 'public' | (string & {})
}

const hashSessionListItem = 'sessionListItem'

export function isSessionListItem<V>(v: V) {
  return is$typed(v, id, hashSessionListItem)
}

export function validateSessionListItem<V>(v: V) {
  return validate<SessionListItem & V>(v, id, hashSessionListItem)
}

/** Public-safe house display fields. */
export interface HouseSummary {
  $type?: 'app.cerulia.house.getView#houseSummary'
  houseRef: string
  title: string
  visibility: 'draft' | 'public' | (string & {})
  canonSummary?: string
  externalCommunityUri?: string
}

const hashHouseSummary = 'houseSummary'

export function isHouseSummary<V>(v: V) {
  return is$typed(v, id, hashHouseSummary)
}

export function validateHouseSummary<V>(v: V) {
  return validate<HouseSummary & V>(v, id, hashHouseSummary)
}

/** Public-safe campaign display fields. */
export interface CampaignSummary {
  $type?: 'app.cerulia.house.getView#campaignSummary'
  campaignRef: string
  title: string
  rulesetNsid: string
  visibility: 'draft' | 'public' | (string & {})
  updatedAt?: string
}

const hashCampaignSummary = 'campaignSummary'

export function isCampaignSummary<V>(v: V) {
  return is$typed(v, id, hashCampaignSummary)
}

export function validateCampaignSummary<V>(v: V) {
  return validate<CampaignSummary & V>(v, id, hashCampaignSummary)
}

/** Public-safe session summary. Excludes note and characterBranchRef. */
export interface SessionSummary {
  $type?: 'app.cerulia.house.getView#sessionSummary'
  sessionRef: string
  role: 'pl' | 'gm' | (string & {})
  playedAt: string
  scenarioLabel?: string
  hoLabel?: string
  hoSummary?: string
  outcomeSummary?: string
}

const hashSessionSummary = 'sessionSummary'

export function isSessionSummary<V>(v: V) {
  return is$typed(v, id, hashSessionSummary)
}

export function validateSessionSummary<V>(v: V) {
  return validate<SessionSummary & V>(v, id, hashSessionSummary)
}
