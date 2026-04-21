/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../lexicons'
import { type $Typed, is$typed as _is$typed, type OmitKey } from '../../../util'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.cerulia.defs'

/** Mutation result acknowledgement. Returned by all mutation procedures. */
export interface MutationAck {
  $type?: 'app.cerulia.defs#mutationAck'
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
