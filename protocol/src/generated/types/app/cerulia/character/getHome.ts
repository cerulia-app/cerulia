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
const id = 'app.cerulia.character.getHome'

export type QueryParams = {}
export type InputSchema = undefined

export interface OutputSchema {
  ownerDid: string
  branches: BranchListItem[]
  recentSessions?: SessionListItem[]
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

export interface BranchListItem {
  $type?: 'app.cerulia.character.getHome#branchListItem'
  branchRef: string
  branchLabel: string
  baseSheetRef: string
  branchKind: 'main' | 'campaign-fork' | 'local-override' | (string & {})
  visibility: 'draft' | 'public' | (string & {})
  revision: number
  updatedAt?: string
}

const hashBranchListItem = 'branchListItem'

export function isBranchListItem<V>(v: V) {
  return is$typed(v, id, hashBranchListItem)
}

export function validateBranchListItem<V>(v: V) {
  return validate<BranchListItem & V>(v, id, hashBranchListItem)
}

export interface SessionListItem {
  $type?: 'app.cerulia.character.getHome#sessionListItem'
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
