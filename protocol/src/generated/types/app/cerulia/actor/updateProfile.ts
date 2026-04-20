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
import type * as AppCeruliaDefs from '../defs.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.cerulia.actor.updateProfile'

export type QueryParams = {}

export interface InputSchema {
  blueskyProfileRef?: string
  displayNameOverride?: string
  descriptionOverride?: string
  avatarOverrideBlob?: BlobRef
  bannerOverrideBlob?: BlobRef
  websiteOverride?: string
  pronounsOverride?: string
  roleDistribution?: number
  playFormats?: ('text' | 'semi-text' | 'voice' | 'offline' | (string & {}))[]
  tools?: string[]
  ownedRulebooks?: string
  playableTimeSummary?: string
  preferredScenarioStyles?: string[]
  playStyles?: string[]
  boundaries?: string[]
  skills?: string[]
}

export type OutputSchema = AppCeruliaDefs.MutationAck

export interface CallOptions {
  signal?: AbortSignal
  headers?: HeadersMap
  qp?: QueryParams
  encoding?: 'application/json'
}

export interface Response {
  success: boolean
  headers: HeadersMap
  data: OutputSchema
}

export function toKnownErr(e: any) {
  return e
}
