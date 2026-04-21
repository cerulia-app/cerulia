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
import type * as AppCeruliaCorePlayerProfile from '../core/playerProfile.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.cerulia.actor.getProfileView'

export type QueryParams = {
  did: string
}
export type InputSchema = undefined

export interface OutputSchema {
  profile?: AppCeruliaCorePlayerProfile.Main
  blueskyFallbackProfile?: FallbackProfile
  profileSummary?: ProfileSummary
  /** Link-only branch rows for public character detail navigation. Present in public/anonymous mode only. */
  publicBranches?: BranchLink[]
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

/** Composed public-safe profile summary. Fallback-hydrated from Bluesky profile when Cerulia override is absent. */
export interface ProfileSummary {
  $type?: 'app.cerulia.actor.getProfileView#profileSummary'
  did: string
  displayName?: string
  description?: string
  avatar?: BlobRef
  banner?: BlobRef
  website?: string
  pronouns?: string
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

const hashProfileSummary = 'profileSummary'

export function isProfileSummary<V>(v: V) {
  return is$typed(v, id, hashProfileSummary)
}

export function validateProfileSummary<V>(v: V) {
  return validate<ProfileSummary & V>(v, id, hashProfileSummary)
}

/** Link-only branch row for public character detail navigation. */
export interface BranchLink {
  $type?: 'app.cerulia.actor.getProfileView#branchLink'
  characterBranchRef: string
  displayName: string
  branchLabel: string
  rulesetNsid: string
}

const hashBranchLink = 'branchLink'

export function isBranchLink<V>(v: V) {
  return is$typed(v, id, hashBranchLink)
}

export function validateBranchLink<V>(v: V) {
  return validate<BranchLink & V>(v, id, hashBranchLink)
}

/** Owner-visible fallback profile fields resolved from app.bsky.actor.profile. */
export interface FallbackProfile {
  $type?: 'app.cerulia.actor.getProfileView#fallbackProfile'
  displayName?: string
  description?: string
  avatar?: BlobRef
  banner?: BlobRef
  website?: string
}

const hashFallbackProfile = 'fallbackProfile'

export function isFallbackProfile<V>(v: V) {
  return is$typed(v, id, hashFallbackProfile)
}

export function validateFallbackProfile<V>(v: V) {
  return validate<FallbackProfile & V>(v, id, hashFallbackProfile)
}
