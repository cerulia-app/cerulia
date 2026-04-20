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
import type * as AppCeruliaCoreCharacterBranch from '../core/characterBranch.js'
import type * as AppCeruliaCoreCharacterSheet from '../core/characterSheet.js'
import type * as AppCeruliaCoreCharacterAdvancement from '../core/characterAdvancement.js'
import type * as AppCeruliaCoreCharacterConversion from '../core/characterConversion.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.cerulia.character.getBranchView'

export type QueryParams = {
  characterBranchRef: string
}
export type InputSchema = undefined

export interface OutputSchema {
  branch?: AppCeruliaCoreCharacterBranch.Main
  sheet?: AppCeruliaCoreCharacterSheet.Main
  /** Full advancement records. Present in owner mode only. */
  advancements?: AppCeruliaCoreCharacterAdvancement.Main[]
  /** Full conversion records. Present in owner mode only. */
  conversions?: AppCeruliaCoreCharacterConversion.Main[]
  /** Session list items. Present in owner mode only. */
  recentSessions?: SessionListItem[]
  branchSummary?: BranchSummary
  sheetSummary?: SheetSummary
  /** Public-safe session summaries. Present in public/anonymous mode only. */
  recentSessionSummaries?: SessionSummary[]
  /** Public-safe advancement summaries. Present in public/anonymous mode only. */
  advancementSummaries?: AdvancementSummary[]
  /** Public-safe conversion summaries. Present in public/anonymous mode only. */
  conversionSummaries?: ConversionSummary[]
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

/** Public-safe branch display fields. Excludes overridePayload and owner-only linkage. */
export interface BranchSummary {
  $type?: 'app.cerulia.character.getBranchView#branchSummary'
  branchRef: string
  branchLabel: string
  branchKind: 'main' | 'campaign-fork' | 'local-override' | (string & {})
  visibility: 'draft' | 'public' | (string & {})
  revision: number
  updatedAt?: string
}

const hashBranchSummary = 'branchSummary'

export function isBranchSummary<V>(v: V) {
  return is$typed(v, id, hashBranchSummary)
}

export function validateBranchSummary<V>(v: V) {
  return validate<BranchSummary & V>(v, id, hashBranchSummary)
}

/** Public-safe sheet display fields. */
export interface SheetSummary {
  $type?: 'app.cerulia.character.getBranchView#sheetSummary'
  sheetRef: string
  displayName: string
  rulesetNsid: string
  /** Schema-backed public stats only. Omitted when sheetSchemaRef is absent. */
  structuredStats?: StatEntry[]
  portraitBlob?: BlobRef
  profileSummary?: string
}

const hashSheetSummary = 'sheetSummary'

export function isSheetSummary<V>(v: V) {
  return is$typed(v, id, hashSheetSummary)
}

export function validateSheetSummary<V>(v: V) {
  return validate<SheetSummary & V>(v, id, hashSheetSummary)
}

/** Public-safe session summary. Excludes note and characterBranchRef. */
export interface SessionSummary {
  $type?: 'app.cerulia.character.getBranchView#sessionSummary'
  sessionRef: string
  role: 'pl' | 'gm' | (string & {})
  playedAt: string
  scenarioLabel?: string
  hoLabel?: string
  hoSummary?: string
  outcomeSummary?: string
  externalArchiveUris?: string[]
}

const hashSessionSummary = 'sessionSummary'

export function isSessionSummary<V>(v: V) {
  return is$typed(v, id, hashSessionSummary)
}

export function validateSessionSummary<V>(v: V) {
  return validate<SessionSummary & V>(v, id, hashSessionSummary)
}

/** Public-safe advancement summary. Excludes deltaPayload and previousValues. */
export interface AdvancementSummary {
  $type?: 'app.cerulia.character.getBranchView#advancementSummary'
  advancementRef: string
  advancementKind:
    | 'xp-spend'
    | 'milestone'
    | 'retrain'
    | 'respec'
    | 'correction'
    | (string & {})
  effectiveAt: string
  sessionSummary?: AdvancementSessionSummary
}

const hashAdvancementSummary = 'advancementSummary'

export function isAdvancementSummary<V>(v: V) {
  return is$typed(v, id, hashAdvancementSummary)
}

export function validateAdvancementSummary<V>(v: V) {
  return validate<AdvancementSummary & V>(v, id, hashAdvancementSummary)
}

/** Public-safe conversion provenance. Excludes version pins. */
export interface ConversionSummary {
  $type?: 'app.cerulia.character.getBranchView#conversionSummary'
  conversionRef: string
  sourceRulesetNsid: string
  targetRulesetNsid: string
  convertedAt: string
}

const hashConversionSummary = 'conversionSummary'

export function isConversionSummary<V>(v: V) {
  return is$typed(v, id, hashConversionSummary)
}

export function validateConversionSummary<V>(v: V) {
  return validate<ConversionSummary & V>(v, id, hashConversionSummary)
}

export interface SessionListItem {
  $type?: 'app.cerulia.character.getBranchView#sessionListItem'
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

export interface AdvancementSessionSummary {
  $type?: 'app.cerulia.character.getBranchView#advancementSessionSummary'
  sessionRef: string
  role: 'pl' | 'gm' | (string & {})
  playedAt: string
  scenarioLabel?: string
}

const hashAdvancementSessionSummary = 'advancementSessionSummary'

export function isAdvancementSessionSummary<V>(v: V) {
  return is$typed(v, id, hashAdvancementSessionSummary)
}

export function validateAdvancementSessionSummary<V>(v: V) {
  return validate<AdvancementSessionSummary & V>(
    v,
    id,
    hashAdvancementSessionSummary,
  )
}

export interface StatEntry {
  $type?: 'app.cerulia.character.getBranchView#statEntry'
  fieldId: string
  label?: string
  value: StatValue
}

const hashStatEntry = 'statEntry'

export function isStatEntry<V>(v: V) {
  return is$typed(v, id, hashStatEntry)
}

export function validateStatEntry<V>(v: V) {
  return validate<StatEntry & V>(v, id, hashStatEntry)
}

/** Bounded public stat value shape. */
export interface StatValue {
  $type?: 'app.cerulia.character.getBranchView#statValue'
  valueKind: 'integer' | 'string' | 'boolean' | 'enum' | (string & {})
  numberValue?: number
  textValue?: string
  boolValue?: boolean
  enumValue?: string
}

const hashStatValue = 'statValue'

export function isStatValue<V>(v: V) {
  return is$typed(v, id, hashStatValue)
}

export function validateStatValue<V>(v: V) {
  return validate<StatValue & V>(v, id, hashStatValue)
}
