/**
 * GENERATED CODE - DO NOT MODIFY
 */
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
const id = 'app.cerulia.core.playerProfile'

export interface Main {
  $type: 'app.cerulia.core.playerProfile'
  ownerDid: string
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
  createdAt: string
  updatedAt: string
  [k: string]: unknown
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain, true)
}

export {
  type Main as Record,
  isMain as isRecord,
  validateMain as validateRecord,
}
