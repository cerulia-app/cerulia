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
const id = 'app.cerulia.core.characterSheet'

export interface Main {
  $type: 'app.cerulia.core.characterSheet'
  /** DID of the player who owns this character. */
  ownerDid: string
  /** Reference to the character-sheet-schema this sheet conforms to. Required for active records; schema-less is legacy/import/recovery only. */
  sheetSchemaRef?: string
  /** Root NSID of the ruleset this character belongs to. */
  rulesetNsid: string
  /** Public-safe character name. */
  displayName: string
  /** Portrait image blob uploaded to the owner's repo. */
  portraitBlob?: BlobRef
  /** Public-safe character introduction text. */
  profileSummary?: string
  /** Structured stats payload conforming to fieldDefs when sheetSchemaRef is present; free-form JSON for legacy/import/recovery otherwise. */
  stats?: { [_ in string]: unknown }
  /** Monotonically increasing version counter. Starts at 1 on create. */
  version: number
  /** UTC datetime when the record was created. */
  createdAt: string
  /** UTC datetime when the record was last updated. */
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
