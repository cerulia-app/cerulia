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
const id = 'app.cerulia.core.characterBranch'

export interface Main {
  $type: 'app.cerulia.core.characterBranch'
  ownerDid: string
  baseSheetRef: string
  branchKind: 'main' | 'campaign-fork' | 'local-override' | (string & {})
  branchLabel: string
  overridePayload?: OverridePayload
  visibility: 'draft' | 'public' | (string & {})
  revision: number
  createdAt: string
  updatedAt: string
  retiredAt?: string
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

/** Inline override patch payload. Must be a public-safe JSON object. */
export interface OverridePayload {
  $type?: 'app.cerulia.core.characterBranch#overridePayload'
}

const hashOverridePayload = 'overridePayload'

export function isOverridePayload<V>(v: V) {
  return is$typed(v, id, hashOverridePayload)
}

export function validateOverridePayload<V>(v: V) {
  return validate<OverridePayload & V>(v, id, hashOverridePayload)
}
