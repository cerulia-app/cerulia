import {
  ValidationError,
  type ValidationResult,
} from '@atproto/lexicon'
import { validate } from '../generated/lexicons.js'

const CHARACTER_SHEET_SCHEMA_ID = 'app.cerulia.core.characterSheetSchema'
const CREATE_SHEET_SCHEMA_ID = 'app.cerulia.rule.createSheetSchema'
const CREATE_SESSION_ID = 'app.cerulia.session.create'
const UPDATE_SESSION_ID = 'app.cerulia.session.update'

type FieldDefLike = {
  fieldType?: string
  children?: unknown
  itemDef?: unknown
  extensible?: unknown
  additionalFieldDef?: unknown
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateFieldDefNode(
  node: unknown,
  depth: number,
  path: string,
): string | null {
  if (!isObject(node)) {
    return `${path} must be an object`
  }

  if (depth > 3) {
    return `${path} exceeds max depth 3`
  }

  const fieldDef = node as FieldDefLike
  const fieldType = fieldDef.fieldType

  const children = Array.isArray(fieldDef.children) ? fieldDef.children : null
  const hasChildren = children !== null
  const hasItemDef = isObject(fieldDef.itemDef)

  if (hasChildren && fieldType !== 'group' && fieldType !== 'array') {
    return `${path}.children is only allowed on group or array fields`
  }

  if (hasItemDef && fieldType !== 'array') {
    return `${path}.itemDef is only allowed on array fields`
  }

  if (fieldDef.extensible === true && fieldType !== 'group') {
    return `${path}.extensible is only allowed on group fields`
  }

  if (isObject(fieldDef.additionalFieldDef)) {
    if (fieldType !== 'group' || fieldDef.extensible !== true) {
      return `${path}.additionalFieldDef is only allowed on extensible group fields`
    }

    if ((fieldDef.additionalFieldDef as FieldDefLike).extensible === true) {
      return `${path}.additionalFieldDef must not be extensible`
    }
  }

  if (fieldType === 'array' && isObject(fieldDef.itemDef)) {
    const itemType = (fieldDef.itemDef as FieldDefLike).fieldType
    if (itemType === 'array') {
      return `${path}.itemDef must not be array (array-of-array is forbidden)`
    }
  }

  if (hasChildren) {
    for (let i = 0; i < children.length; i += 1) {
      const err = validateFieldDefNode(
        children[i],
        depth + 1,
        `${path}.children[${i}]`,
      )
      if (err) {
        return err
      }
    }
  }

  if (hasItemDef) {
    const err = validateFieldDefNode(
      fieldDef.itemDef,
      depth + 1,
      `${path}.itemDef`,
    )
    if (err) {
      return err
    }
  }

  if (isObject(fieldDef.additionalFieldDef)) {
    const err = validateFieldDefNode(
      fieldDef.additionalFieldDef,
      depth + 1,
      `${path}.additionalFieldDef`,
    )
    if (err) {
      return err
    }
  }

  return null
}

export function validateCharacterSheetSchemaFieldDefs(
  value: unknown,
): string | null {
  if (!isObject(value)) {
    return 'characterSheetSchema record must be an object'
  }

  const fieldDefs = value.fieldDefs
  if (!Array.isArray(fieldDefs)) {
    return 'fieldDefs must be an array'
  }

  for (let i = 0; i < fieldDefs.length; i += 1) {
    const err = validateFieldDefNode(fieldDefs[i], 1, `fieldDefs[${i}]`)
    if (err) {
      return err
    }
  }

  return null
}

function applyExtraValidation(
  value: unknown,
  lexiconId: string,
  defId: string,
): ValidationResult | null {
  if (lexiconId === CHARACTER_SHEET_SCHEMA_ID && defId === 'main') {
    const err = validateCharacterSheetSchemaFieldDefs(value)
    if (err) {
      return {
        success: false,
        error: new ValidationError(err),
      }
    }
  }

  if (lexiconId === CREATE_SHEET_SCHEMA_ID && defId === 'main') {
    const err = validateCharacterSheetSchemaFieldDefs(value)
    if (err) {
      return {
        success: false,
        error: new ValidationError(err),
      }
    }
  }

  if (lexiconId === CREATE_SESSION_ID && defId === 'main') {
    const err = validateSessionInput(value, true)
    if (err) {
      return {
        success: false,
        error: new ValidationError(err),
      }
    }
  }

  if (lexiconId === UPDATE_SESSION_ID && defId === 'main') {
    const err = validateSessionInput(value, false)
    if (err) {
      return {
        success: false,
        error: new ValidationError(err),
      }
    }
  }

  return null
}

function validateSessionInput(
  value: unknown,
  requireScenarioExactlyOne: boolean,
): string | null {
  if (!isObject(value)) {
    return 'session input must be an object'
  }

  const hasScenarioRef = typeof value.scenarioRef === 'string' && value.scenarioRef.length > 0
  const hasScenarioLabel = typeof value.scenarioLabel === 'string' && value.scenarioLabel.length > 0

  if (requireScenarioExactlyOne) {
    if (hasScenarioRef === hasScenarioLabel) {
      return 'session input must include exactly one of scenarioRef or scenarioLabel'
    }
  } else if (hasScenarioRef && hasScenarioLabel) {
    return 'session update must not include both scenarioRef and scenarioLabel'
  }

  if (value.role === 'pl') {
    const hasBranch = typeof value.characterBranchRef === 'string' && value.characterBranchRef.length > 0
    if (!hasBranch) {
      return 'session input with role=pl requires characterBranchRef'
    }
  }

  return null
}

export function validateTyped<T extends { $type: string }>(
  value: T,
): ValidationResult {
  const result = validate(value, value.$type, 'main', true)
  if (!result.success) {
    return result
  }

  return applyExtraValidation(value, value.$type, 'main') ?? result
}

export function validateById(
  value: unknown,
  lexiconId: string,
  defId = 'main',
  enforceLexiconType = false,
): ValidationResult {
  const result = enforceLexiconType
    ? validate(value, lexiconId, defId, true)
    : validate(value, lexiconId, defId)

  if (!result.success) {
    return result
  }

  return applyExtraValidation(value, lexiconId, defId) ?? result
}
