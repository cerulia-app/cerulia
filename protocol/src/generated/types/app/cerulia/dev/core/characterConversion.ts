/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../../lexicons'
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from '../../../../../util'
import type * as AppCeruliaDevDefs from '../defs.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.cerulia.dev.core.characterConversion'

export interface Main {
  $type: 'app.cerulia.dev.core.characterConversion'
  characterBranchRef: string
  sourceSheetPin: AppCeruliaDevDefs.ExactRecordPin
  sourceRulesetNsid: string
  targetSheetPin: AppCeruliaDevDefs.ExactRecordPin
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
