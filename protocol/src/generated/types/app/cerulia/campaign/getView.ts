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
import type * as AppCeruliaCoreCampaign from '../core/campaign.js'
import type * as AppCeruliaCoreRuleProfile from '../core/ruleProfile.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.cerulia.campaign.getView'

export type QueryParams = {
  campaignRef: string
}
export type InputSchema = undefined

export interface OutputSchema {
  campaign?: AppCeruliaCoreCampaign.Main
  /** Session list items. Present in owner mode only. */
  sessions?: SessionListItem[]
  /** Full rule profile records. Present in owner mode only. */
  ruleOverlay?: AppCeruliaCoreRuleProfile.Main[]
  campaignSummary?: CampaignSummary
  /** Public-safe session summaries. Present in public/anonymous mode only. */
  sessionSummaries?: SessionSummary[]
  ruleOverlaySummary?: RuleOverlaySummary
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

export interface SessionListItem {
  $type?: 'app.cerulia.campaign.getView#sessionListItem'
  sessionRef: string
  role: 'pl' | 'gm' | (string & {})
  playedAt: string
  scenarioLabel?: string
  characterBranchRef?: string
  visibility: 'draft' | 'public' | (string & {})
}

const hashSessionListItem = 'sessionListItem'

export function isSessionListItem<V>(v: V) {
  return is$typed(v, id, hashSessionListItem)
}

export function validateSessionListItem<V>(v: V) {
  return validate<SessionListItem & V>(v, id, hashSessionListItem)
}

/** Public-safe campaign display fields. */
export interface CampaignSummary {
  $type?: 'app.cerulia.campaign.getView#campaignSummary'
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
  $type?: 'app.cerulia.campaign.getView#sessionSummary'
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

/** Public-safe rule overlay summary. Excludes raw rule-profile payload. */
export interface RuleOverlaySummary {
  $type?: 'app.cerulia.campaign.getView#ruleOverlaySummary'
  ruleProfiles?: RuleProfileLink[]
}

const hashRuleOverlaySummary = 'ruleOverlaySummary'

export function isRuleOverlaySummary<V>(v: V) {
  return is$typed(v, id, hashRuleOverlaySummary)
}

export function validateRuleOverlaySummary<V>(v: V) {
  return validate<RuleOverlaySummary & V>(v, id, hashRuleOverlaySummary)
}

export interface RuleProfileLink {
  $type?: 'app.cerulia.campaign.getView#ruleProfileLink'
  ruleProfileRef: string
  profileTitle: string
}

const hashRuleProfileLink = 'ruleProfileLink'

export function isRuleProfileLink<V>(v: V) {
  return is$typed(v, id, hashRuleProfileLink)
}

export function validateRuleProfileLink<V>(v: V) {
  return validate<RuleProfileLink & V>(v, id, hashRuleProfileLink)
}
