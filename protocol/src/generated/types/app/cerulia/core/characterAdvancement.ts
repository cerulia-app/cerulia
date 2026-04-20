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
const id = 'app.cerulia.core.characterAdvancement'

export interface Main {
  $type: 'app.cerulia.core.characterAdvancement'
  characterBranchRef: string
  advancementKind:
    | 'xp-spend'
    | 'milestone'
    | 'retrain'
    | 'respec'
    | 'correction'
    | (string & {})
  deltaPayload: DeltaPayload
  sessionRef?: string
  previousValues?: PreviousValues
  effectiveAt: string
  createdAt: string
  note?: string
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

/** Inline advancement delta payload. Must be a public-safe JSON object. */
export interface DeltaPayload {
  $type?: 'app.cerulia.core.characterAdvancement#deltaPayload'
}

const hashDeltaPayload = 'deltaPayload'

export function isDeltaPayload<V>(v: V) {
  return is$typed(v, id, hashDeltaPayload)
}

export function validateDeltaPayload<V>(v: V) {
  return validate<DeltaPayload & V>(v, id, hashDeltaPayload)
}

/** Previous values snapshot. Must be a public-safe JSON object. */
export interface PreviousValues {
  $type?: 'app.cerulia.core.characterAdvancement#previousValues'
}

const hashPreviousValues = 'previousValues'

export function isPreviousValues<V>(v: V) {
  return is$typed(v, id, hashPreviousValues)
}

export function validatePreviousValues<V>(v: V) {
  return validate<PreviousValues & V>(v, id, hashPreviousValues)
}
