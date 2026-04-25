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

const is$typed = _is$typed,
  validate = _validate
const id = 'app.cerulia.dev.core.characterSheetSchema'

export interface Main {
  $type: 'app.cerulia.dev.core.characterSheetSchema'
  baseRulesetNsid: string
  schemaVersion: string
  title: string
  authoring?: Authoring
  ownerDid: string
  createdAt: string
  fieldDefs: FieldDefRoot[]
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

/** Optional authoring metadata for schema-backed character creation. This block is not part of character ledger truth; it is input assistance for AppView create flows. */
export interface Authoring {
  $type?: 'app.cerulia.dev.core.characterSheetSchema#authoring'
  creationRules?: CreationRule[]
}

const hashAuthoring = 'authoring'

export function isAuthoring<V>(v: V) {
  return is$typed(v, id, hashAuthoring)
}

export function validateAuthoring<V>(v: V) {
  return validate<Authoring & V>(v, id, hashAuthoring)
}

/** Declarative creation recipe step. Rules may target multiple fields and may depend on other rules for ordering. */
export interface CreationRule {
  $type?: 'app.cerulia.dev.core.characterSheetSchema#creationRule'
  ruleId: string
  label?: string
  /** Rule kind identifier (e.g. dice, fixed, derived). Interpreted by AppView. */
  kind: string
  targetFieldIds: string[]
  dice?: DiceRule
  dependsOnRuleIds?: string[]
}

const hashCreationRule = 'creationRule'

export function isCreationRule<V>(v: V) {
  return is$typed(v, id, hashCreationRule)
}

export function validateCreationRule<V>(v: V) {
  return validate<CreationRule & V>(v, id, hashCreationRule)
}

/** Dice-notation based creation rule payload. Server does not validate RNG; this is client-side authoring guidance. */
export interface DiceRule {
  $type?: 'app.cerulia.dev.core.characterSheetSchema#diceRule'
  expression: string
  notes?: string
}

const hashDiceRule = 'diceRule'

export function isDiceRule<V>(v: V) {
  return is$typed(v, id, hashDiceRule)
}

export function validateDiceRule<V>(v: V) {
  return validate<DiceRule & V>(v, id, hashDiceRule)
}

export interface FieldDefLeaf {
  $type?: 'app.cerulia.dev.core.characterSheetSchema#fieldDefLeaf'
  fieldId: string
  label: string
  fieldType: 'integer' | 'string' | 'boolean' | 'enum' | (string & {})
  valueRange?: ValueRange
  required: boolean
  description?: string
}

const hashFieldDefLeaf = 'fieldDefLeaf'

export function isFieldDefLeaf<V>(v: V) {
  return is$typed(v, id, hashFieldDefLeaf)
}

export function validateFieldDefLeaf<V>(v: V) {
  return validate<FieldDefLeaf & V>(v, id, hashFieldDefLeaf)
}

export interface FieldDefNode {
  $type?: 'app.cerulia.dev.core.characterSheetSchema#fieldDefNode'
  fieldId: string
  label: string
  fieldType:
    | 'integer'
    | 'string'
    | 'boolean'
    | 'enum'
    | 'group'
    | 'array'
    | (string & {})
  children?: FieldDefNode[]
  itemDef?: FieldDefNode
  valueRange?: ValueRange
  required: boolean
  description?: string
  extensible?: boolean
  additionalFieldDef?: FieldDefAdditional
}

const hashFieldDefNode = 'fieldDefNode'

export function isFieldDefNode<V>(v: V) {
  return is$typed(v, id, hashFieldDefNode)
}

export function validateFieldDefNode<V>(v: V) {
  return validate<FieldDefNode & V>(v, id, hashFieldDefNode)
}

export interface FieldDefRoot {
  $type?: 'app.cerulia.dev.core.characterSheetSchema#fieldDefRoot'
  fieldId: string
  label: string
  fieldType:
    | 'integer'
    | 'string'
    | 'boolean'
    | 'enum'
    | 'group'
    | 'array'
    | (string & {})
  children?: FieldDefNode[]
  itemDef?: FieldDefNode
  valueRange?: ValueRange
  required: boolean
  description?: string
  extensible?: boolean
  additionalFieldDef?: FieldDefAdditional
}

const hashFieldDefRoot = 'fieldDefRoot'

export function isFieldDefRoot<V>(v: V) {
  return is$typed(v, id, hashFieldDefRoot)
}

export function validateFieldDefRoot<V>(v: V) {
  return validate<FieldDefRoot & V>(v, id, hashFieldDefRoot)
}

/** Additional child field template. Must not be extensible. */
export interface FieldDefAdditional {
  $type?: 'app.cerulia.dev.core.characterSheetSchema#fieldDefAdditional'
  fieldId: string
  label: string
  fieldType:
    | 'integer'
    | 'string'
    | 'boolean'
    | 'enum'
    | 'group'
    | 'array'
    | (string & {})
  children?: FieldDefNode[]
  itemDef?: FieldDefNode
  valueRange?: ValueRange
  required: boolean
  description?: string
}

const hashFieldDefAdditional = 'fieldDefAdditional'

export function isFieldDefAdditional<V>(v: V) {
  return is$typed(v, id, hashFieldDefAdditional)
}

export function validateFieldDefAdditional<V>(v: V) {
  return validate<FieldDefAdditional & V>(v, id, hashFieldDefAdditional)
}

export interface ValueRange {
  $type?: 'app.cerulia.dev.core.characterSheetSchema#valueRange'
  min?: number
  max?: number
  enumValues?: string[]
}

const hashValueRange = 'valueRange'

export function isValueRange<V>(v: V) {
  return is$typed(v, id, hashValueRange)
}

export function validateValueRange<V>(v: V) {
  return validate<ValueRange & V>(v, id, hashValueRange)
}
