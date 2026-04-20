import { describe, expect, test } from 'bun:test'

import { decodeById, decodeTyped, tryDecodeById } from './parser.js'
import { validateById } from './validator.js'

describe('codec parser/validator', () => {
  test('validateById succeeds for a valid character sheet record', () => {
    const record = {
      $type: 'app.cerulia.core.characterSheet',
      ownerDid: 'did:plc:exampleownerdid1234567890',
      rulesetNsid: 'app.cerulia.ruleset.coc7',
      displayName: 'Kurosawa Reiji',
      version: 1,
      createdAt: '2026-04-18T00:00:00.000Z',
      updatedAt: '2026-04-18T00:00:00.000Z',
    }

    const result = validateById(record, 'app.cerulia.core.characterSheet', 'main', true)
    expect(result.success).toBe(true)
  })

  test('decodeTyped throws for invalid payload', () => {
    const invalidRecord = {
      $type: 'app.cerulia.core.characterSheet',
      ownerDid: 'invalid-did',
      rulesetNsid: 'not.an.nsid',
      displayName: 'broken',
      version: 1,
      createdAt: 'not-datetime',
      updatedAt: 'not-datetime',
    }

    expect(() => decodeTyped(invalidRecord as never)).toThrow()
  })

  test('decodeById returns validated payload', () => {
    const payload = {
      resultKind: 'accepted',
      emittedRecordRefs: ['at://did:plc:exampleownerdid1234567890/app.cerulia.core.session/3lcabcde12345'],
    }

    const decoded = decodeById<typeof payload>(payload, 'app.cerulia.defs', 'mutationAck')
    expect(decoded.resultKind).toBe('accepted')
  })

  test('tryDecodeById returns failure for malformed mutationAck', () => {
    const result = tryDecodeById(
      {},
      'app.cerulia.defs',
      'mutationAck',
      false,
    )

    expect(result.success).toBe(false)
  })

  test('validateById rejects character-sheet-schema array-of-array fieldDefs', () => {
    const invalidSchema = {
      $type: 'app.cerulia.core.characterSheetSchema',
      baseRulesetNsid: 'app.cerulia.ruleset.coc7',
      schemaVersion: '1.0.0',
      title: 'Invalid nested array schema',
      ownerDid: 'did:plc:exampleownerdid1234567890',
      createdAt: '2026-04-18T00:00:00.000Z',
      fieldDefs: [
        {
          fieldId: 'skills',
          label: 'Skills',
          fieldType: 'array',
          required: false,
          itemDef: {
            fieldId: 'nested',
            label: 'Nested',
            fieldType: 'array',
            required: false,
          },
        },
      ],
    }

    const result = validateById(
      invalidSchema,
      'app.cerulia.core.characterSheetSchema',
      'main',
      true,
    )

    expect(result.success).toBe(false)
  })

  test('validateById rejects scalar field with children', () => {
    const invalidSchema = {
      $type: 'app.cerulia.core.characterSheetSchema',
      baseRulesetNsid: 'app.cerulia.ruleset.coc7',
      schemaVersion: '1.0.0',
      title: 'Invalid scalar children schema',
      ownerDid: 'did:plc:exampleownerdid1234567890',
      createdAt: '2026-04-18T00:00:00.000Z',
      fieldDefs: [
        {
          fieldId: 'hp',
          label: 'HP',
          fieldType: 'integer',
          required: true,
          children: [
            {
              fieldId: 'illegal-child',
              label: 'Illegal',
              fieldType: 'integer',
              required: false,
            },
          ],
        },
      ],
    }

    const result = validateById(
      invalidSchema,
      'app.cerulia.core.characterSheetSchema',
      'main',
      true,
    )

    expect(result.success).toBe(false)
  })

  test('validateById rejects non-array field with itemDef', () => {
    const invalidSchema = {
      $type: 'app.cerulia.core.characterSheetSchema',
      baseRulesetNsid: 'app.cerulia.ruleset.coc7',
      schemaVersion: '1.0.0',
      title: 'Invalid itemDef schema',
      ownerDid: 'did:plc:exampleownerdid1234567890',
      createdAt: '2026-04-18T00:00:00.000Z',
      fieldDefs: [
        {
          fieldId: 'name',
          label: 'Name',
          fieldType: 'string',
          required: true,
          itemDef: {
            fieldId: 'illegal-item',
            label: 'Illegal',
            fieldType: 'string',
            required: false,
          },
        },
      ],
    }

    const result = validateById(
      invalidSchema,
      'app.cerulia.core.characterSheetSchema',
      'main',
      true,
    )

    expect(result.success).toBe(false)
  })

  test('validateById rejects additionalFieldDef on non-extensible group', () => {
    const invalidSchema = {
      $type: 'app.cerulia.core.characterSheetSchema',
      baseRulesetNsid: 'app.cerulia.ruleset.coc7',
      schemaVersion: '1.0.0',
      title: 'Invalid additionalFieldDef parent',
      ownerDid: 'did:plc:exampleownerdid1234567890',
      createdAt: '2026-04-18T00:00:00.000Z',
      fieldDefs: [
        {
          fieldId: 'section',
          label: 'Section',
          fieldType: 'group',
          required: false,
          additionalFieldDef: {
            fieldId: 'extra',
            label: 'Extra',
            fieldType: 'string',
            required: false,
          },
        },
      ],
    }

    const result = validateById(
      invalidSchema,
      'app.cerulia.core.characterSheetSchema',
      'main',
      true,
    )

    expect(result.success).toBe(false)
  })

  test('validateById rejects invalid createSheetSchema input fieldDefs', () => {
    const invalidInput = {
      baseRulesetNsid: 'app.cerulia.ruleset.coc7',
      schemaVersion: '1.0.0',
      title: 'Invalid create input',
      fieldDefs: [
        {
          fieldId: 'name',
          label: 'Name',
          fieldType: 'string',
          required: true,
          itemDef: {
            fieldId: 'illegal-item',
            label: 'Illegal',
            fieldType: 'string',
            required: false,
          },
        },
      ],
    }

    const result = validateById(
      invalidInput,
      'app.cerulia.rule.createSheetSchema',
      'main',
      true,
    )

    expect(result.success).toBe(false)
  })

  test('validateById rejects session.create without exactly-one scenario identity', () => {
    const invalidInput = {
      role: 'pl',
      playedAt: '2026-04-18T00:00:00.000Z',
      characterBranchRef: 'at://did:plc:exampleownerdid1234567890/app.cerulia.core.characterBranch/3lcabcde12345',
    }

    const result = validateById(
      invalidInput,
      'app.cerulia.session.create',
      'main',
      true,
    )

    expect(result.success).toBe(false)
  })

  test('validateById rejects session.create with role=pl and no characterBranchRef', () => {
    const invalidInput = {
      role: 'pl',
      playedAt: '2026-04-18T00:00:00.000Z',
      scenarioLabel: 'Missing branch test scenario',
    }

    const result = validateById(
      invalidInput,
      'app.cerulia.session.create',
      'main',
      true,
    )

    expect(result.success).toBe(false)
  })

  test('validateById rejects session.update with both scenarioRef and scenarioLabel', () => {
    const invalidInput = {
      sessionRef: 'at://did:plc:exampleownerdid1234567890/app.cerulia.core.session/3lcabcde12345',
      scenarioRef: 'at://did:plc:examplescenario/app.cerulia.core.scenario/3lcxyz12345',
      scenarioLabel: 'Conflicting scenario label',
    }

    const result = validateById(
      invalidInput,
      'app.cerulia.session.update',
      'main',
      true,
    )

    expect(result.success).toBe(false)
  })
})
