import type { ValidationResult } from '@atproto/lexicon'
import { validateById, validateTyped } from './validator.js'

export function decodeTyped<T extends { $type: string }>(value: T): T {
  const result = validateTyped(value)
  if (!result.success) {
    throw result.error
  }

  return result.value as T
}

export function decodeById<T>(
  value: unknown,
  lexiconId: string,
  defId = 'main',
  enforceLexiconType = false,
): T {
  const result = validateById(value, lexiconId, defId, enforceLexiconType)
  if (!result.success) {
    throw result.error
  }

  return result.value as T
}

export function tryDecodeById<T>(
  value: unknown,
  lexiconId: string,
  defId = 'main',
  enforceLexiconType = false,
): ValidationResult<T> {
  return validateById(
    value,
    lexiconId,
    defId,
    enforceLexiconType,
  ) as ValidationResult<T>
}
