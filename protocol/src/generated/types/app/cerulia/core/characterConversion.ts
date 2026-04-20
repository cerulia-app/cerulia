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
const id = 'app.cerulia.core.characterConversion'

export interface Main {
  $type: 'app.cerulia.core.characterConversion'
  sourceSheetRef: string
  sourceSheetVersion: number
  sourceBranchRef: string
  sourceRulesetNsid: string
  targetSheetRef: string
  targetSheetVersion: number
  targetBranchRef: string
  targetRulesetNsid: string
  conversionContractRef?: string
  convertedAt: string
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
