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
const id = 'app.cerulia.dev.defs'

/** Exact-version pin for a record. The uri identifies the durable record path and cid identifies the exact record content. */
export interface ExactRecordPin {
  $type?: 'app.cerulia.dev.defs#exactRecordPin'
  uri: string
  cid: string
}

const hashExactRecordPin = 'exactRecordPin'

export function isExactRecordPin<V>(v: V) {
  return is$typed(v, id, hashExactRecordPin)
}

export function validateExactRecordPin<V>(v: V) {
  return validate<ExactRecordPin & V>(v, id, hashExactRecordPin)
}

/** Mutation result acknowledgement. Returned by all mutation procedures. */
export interface MutationAck {
  $type?: 'app.cerulia.dev.defs#mutationAck'
  /** Outcome of the mutation attempt. */
  resultKind: 'accepted' | 'rejected' | 'rebase-needed' | (string & {})
  /** Persistent record refs emitted on accepted. Present only when resultKind=accepted and at least one record was written. */
  emittedRecordRefs?: string[]
  /** Machine-readable stable failure category. */
  reasonCode?:
    | 'forbidden-owner-mismatch'
    | 'invalid-required-field'
    | 'invalid-exactly-one'
    | 'invalid-schema-link'
    | 'invalid-public-uri'
    | 'repair-needed'
    | 'rebase-required'
    | 'terminal-state-readonly'
    | (string & {})
  /** Support and log correlation request identifier. */
  correlationId?: string
  /** Human-readable short explanation. */
  message?: string
}

const hashMutationAck = 'mutationAck'

export function isMutationAck<V>(v: V) {
  return is$typed(v, id, hashMutationAck)
}

export function validateMutationAck<V>(v: V) {
  return validate<MutationAck & V>(v, id, hashMutationAck)
}
