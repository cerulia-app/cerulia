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
const id = 'app.cerulia.core.session'

export interface Main {
  $type: 'app.cerulia.core.session'
  scenarioRef?: string
  scenarioLabel?: string
  characterBranchRef?: string
  role: 'pl' | 'gm' | (string & {})
  campaignRef?: string
  playedAt: string
  hoLabel?: string
  hoSummary?: string
  outcomeSummary?: string
  externalArchiveUris?: string[]
  visibility: 'draft' | 'public' | (string & {})
  note?: string
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
