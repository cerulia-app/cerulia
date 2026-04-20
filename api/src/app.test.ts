import { describe, expect, test } from 'bun:test'
import { createApiApp } from './app.js'
import { resolveHeaderAuthContext } from './auth.js'
import { AUTH_SCOPES, COLLECTIONS, SELF_RKEY, XRPC_PREFIX } from './constants.js'
import { ApiError } from './errors.js'
import { paginate } from './pagination.js'
import { parseAtUri } from './refs.js'
import { MemoryRecordStore } from './store/memory.js'

const DID = 'did:plc:alice'

function authHeaders(
  did = DID,
  scopes = [AUTH_SCOPES.reader, AUTH_SCOPES.writer],
): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-cerulia-did': did,
    'x-cerulia-scopes': scopes.join(','),
  }
}

function createTestApp() {
  const store = new MemoryRecordStore()
  const app = createApiApp({
    store,
    authResolver: resolveHeaderAuthContext,
  })

  return {
    app,
    store,
  }
}

async function postJson(
  app: ReturnType<typeof createApiApp>,
  path: string,
  body: unknown,
  headers = authHeaders(),
) {
  return app.request(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

async function getJson(
  app: ReturnType<typeof createApiApp>,
  path: string,
  headers?: Record<string, string>,
) {
  return app.request(path, {
    headers,
  })
}

function expectAccepted(data: { resultKind: string; emittedRecordRefs?: string[] }) {
  expect(data.resultKind).toBe('accepted')
  expect(data.emittedRecordRefs).toBeArray()
  expect(data.emittedRecordRefs?.length).toBeGreaterThan(0)
}

describe('createApiApp', () => {
  test('returns a health response', async () => {
    const app = createApiApp()
    const response = await app.request('/_health')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  test('rejects malformed AT URIs', () => {
    expect(() => parseAtUri('at://not-a-did/app.cerulia.core.session/test')).toThrow(ApiError)
    expect(() => parseAtUri('at://did:plc:alice/not a nsid/test')).toThrow(ApiError)
    expect(() => parseAtUri('at://did:plc:alice/app.cerulia.core.session/with/slash')).toThrow(ApiError)
  })

  test('rejects malformed pagination input', () => {
    expect(() => paginate([1, 2, 3], '10abc', undefined)).toThrow(ApiError)
    expect(() => paginate([1, 2, 3], undefined, '2x')).toThrow(ApiError)
  })

  test('rejects an invalid sheet schema definition', async () => {
    const { app } = createTestApp()
    const response = await postJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
      {
        baseRulesetNsid: 'app.cerulia.rules.coc7',
        schemaVersion: '1.0.0',
        title: 'Broken Schema',
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
              itemDef: {
                fieldId: 'value',
                label: 'Value',
                fieldType: 'integer',
                required: false,
              },
            },
          },
        ],
      },
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'InvalidRequest',
    })
  })

  test('supports the core character, session, and public profile flows', async () => {
    const { app, store } = createTestApp()
    const writerHeaders = authHeaders()
    const readerHeaders = authHeaders(DID, [AUTH_SCOPES.reader])

    const schemaResponse = await postJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
      {
        baseRulesetNsid: 'app.cerulia.rules.coc7',
        schemaVersion: '1.0.0',
        title: 'CoC 7 Test Schema',
        fieldDefs: [
          {
            fieldId: 'power',
            label: 'POW',
            fieldType: 'integer',
            required: true,
            valueRange: { min: 0, max: 100 },
          },
        ],
      },
      writerHeaders,
    )
    const schemaAck = await schemaResponse.json()
    expectAccepted(schemaAck)
    const schemaRef = schemaAck.emittedRecordRefs[0]

    const createSheetResponse = await postJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.character.createSheet`,
      {
        rulesetNsid: 'app.cerulia.rules.coc7',
        sheetSchemaRef: schemaRef,
        displayName: 'Alice Investigator',
        stats: { power: 0 },
        initialBranchVisibility: 'public',
      },
      writerHeaders,
    )
    const createSheetAck = await createSheetResponse.json()
    expectAccepted(createSheetAck)
    const [sheetRef, branchRef] = createSheetAck.emittedRecordRefs

    const sessionCreateResponse = await postJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.session.create`,
      {
        role: 'pl',
        playedAt: '2026-04-20T09:00:00.000Z',
        scenarioLabel: 'The Haunting',
        characterBranchRef: branchRef,
        visibility: 'public',
      },
      writerHeaders,
    )
    const sessionAck = await sessionCreateResponse.json()
    expectAccepted(sessionAck)
    const sessionRef = sessionAck.emittedRecordRefs[0]

    store.seedRecord(
      `at://${DID}/${COLLECTIONS.characterAdvancement}/z-last`,
      {
        $type: COLLECTIONS.characterAdvancement,
        characterBranchRef: branchRef,
        advancementKind: 'milestone',
        deltaPayload: { power: 2 },
        effectiveAt: '2026-04-20T10:00:00.000Z',
        createdAt: '2026-04-20T10:00:00.000Z',
      },
      '2026-04-20T10:00:00.000Z',
      '2026-04-20T10:00:00.000Z',
    )
    store.seedRecord(
      `at://${DID}/${COLLECTIONS.characterAdvancement}/a-first`,
      {
        $type: COLLECTIONS.characterAdvancement,
        characterBranchRef: branchRef,
        advancementKind: 'milestone',
        deltaPayload: { power: 1 },
        effectiveAt: '2026-04-20T10:00:00.000Z',
        createdAt: '2026-04-20T11:00:00.000Z',
      },
      '2026-04-20T11:00:00.000Z',
      '2026-04-20T11:00:00.000Z',
    )

    store.seedRecord(
      `at://${DID}/${COLLECTIONS.blueskyProfile}/${SELF_RKEY}`,
      {
        displayName: 'Alice',
        website: 'https://example.com/?token=secret',
      },
      '2026-04-20T08:00:00.000Z',
      '2026-04-20T08:00:00.000Z',
    )

    const homeResponse = await getJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.character.getHome`,
      readerHeaders,
    )
    expect(homeResponse.status).toBe(200)
    const homeData = await homeResponse.json()
    expect(homeData.ownerDid).toBe(DID)
    expect(homeData.branches).toHaveLength(1)
    expect(homeData.recentSessions).toHaveLength(1)
    expect(homeData.recentSessions[0].sessionRef).toBe(sessionRef)

    const branchViewResponse = await getJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.character.getBranchView?characterBranchRef=${encodeURIComponent(branchRef)}`,
    )
    expect(branchViewResponse.status).toBe(200)
    const branchView = await branchViewResponse.json()
    expect(branchView.branchSummary.branchRef).toBe(branchRef)
    expect(branchView.sheetSummary.displayName).toBe('Alice Investigator')
    expect(branchView.sheetSummary.structuredStats[0].value.numberValue).toBe(2)

    const sessionViewResponse = await getJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.session.getView?sessionRef=${encodeURIComponent(sessionRef)}`,
    )
    expect(sessionViewResponse.status).toBe(200)
    const sessionView = await sessionViewResponse.json()
    expect(sessionView.sessionSummary.scenarioLabel).toBe('The Haunting')

    const actorViewResponse = await getJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.actor.getProfileView?did=${encodeURIComponent(DID)}`,
    )
    expect(actorViewResponse.status).toBe(200)
    const actorView = await actorViewResponse.json()
    expect(actorView.profileSummary.displayName).toBe('Alice')
    expect(actorView.profileSummary.website).toBeUndefined()
    expect(actorView.publicBranches).toHaveLength(1)
    expect(actorView.publicBranches[0].characterBranchRef).toBe(branchRef)

    const secondCreateResponse = await postJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.character.createSheet`,
      {
        rulesetNsid: 'app.cerulia.rules.coc7',
        sheetSchemaRef: schemaRef,
        displayName: 'Second Investigator',
        stats: { power: 5 },
        initialBranchVisibility: 'public',
      },
      writerHeaders,
    )
    const secondCreateAck = await secondCreateResponse.json()
    expectAccepted(secondCreateAck)
    const [, secondBranchRef] = secondCreateAck.emittedRecordRefs

    const conversionResponse = await postJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.character.recordConversion`,
      {
        sourceSheetRef: sheetRef,
        sourceBranchRef: secondBranchRef,
        sourceRulesetNsid: 'app.cerulia.rules.coc7',
        targetSheetRef: sheetRef,
        targetBranchRef: branchRef,
        targetRulesetNsid: 'app.cerulia.rules.coc7',
        convertedAt: '2026-04-20T12:00:00.000Z',
      },
      writerHeaders,
    )
    expect(conversionResponse.status).toBe(200)
    expect(await conversionResponse.json()).toMatchObject({
      resultKind: 'rejected',
      reasonCode: 'invalid-schema-link',
    })
  })

  test('supports scenario, house, campaign, and rule profile flows', async () => {
    const { app } = createTestApp()
    const ownerHeaders = authHeaders()
    const readerHeaders = authHeaders(DID, [AUTH_SCOPES.reader])

    const schemaResponse = await postJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
      {
        baseRulesetNsid: 'app.cerulia.rules.coc7',
        schemaVersion: '1.0.0',
        title: 'Scenario Schema',
        fieldDefs: [
          {
            fieldId: 'power',
            label: 'POW',
            fieldType: 'integer',
            required: true,
          },
        ],
      },
      ownerHeaders,
    )
    const schemaAck = await schemaResponse.json()
    const schemaRef = schemaAck.emittedRecordRefs[0]

    const houseCreateResponse = await postJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.house.create`,
      {
        title: 'Arkham Club',
        visibility: 'public',
      },
      ownerHeaders,
    )
    const houseAck = await houseCreateResponse.json()
    expectAccepted(houseAck)
    const houseRef = houseAck.emittedRecordRefs[0]

    const ruleCreateResponse = await postJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.rule.createProfile`,
      {
        baseRulesetNsid: 'app.cerulia.rules.coc7',
        profileTitle: 'Club Overlay',
        scopeKind: 'house-shared',
        scopeRef: houseRef,
        rulesPatchUri: 'https://example.com/rules/club-overlay',
      },
      ownerHeaders,
    )
    const ruleAck = await ruleCreateResponse.json()
    expectAccepted(ruleAck)
    const ruleProfileRef = ruleAck.emittedRecordRefs[0]

    const houseUpdateResponse = await postJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.house.update`,
      {
        houseRef,
        defaultRuleProfileRefs: [ruleProfileRef],
      },
      ownerHeaders,
    )
    expect((await houseUpdateResponse.json()).resultKind).toBe('accepted')

    const ruleUpdateResponse = await postJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.rule.updateProfile`,
      {
        ruleProfileRef,
        profileTitle: 'Club Overlay v2',
      },
      ownerHeaders,
    )
    expect((await ruleUpdateResponse.json()).resultKind).toBe('accepted')

    const campaignCreateResponse = await postJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.campaign.create`,
      {
        title: 'Masks Campaign',
        rulesetNsid: 'app.cerulia.rules.coc7',
        houseRef,
        visibility: 'public',
      },
      ownerHeaders,
    )
    const campaignAck = await campaignCreateResponse.json()
    expectAccepted(campaignAck)
    const campaignRef = campaignAck.emittedRecordRefs[0]

    const publicSessionResponse = await postJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.session.create`,
      {
        role: 'gm',
        playedAt: '2026-04-21T09:00:00.000Z',
        scenarioLabel: 'Masks Intro',
        campaignRef,
        externalArchiveUris: ['https://example.com/archive/masks-intro'],
        visibility: 'public',
      },
      ownerHeaders,
    )
    const publicSessionAck = await publicSessionResponse.json()
    expect(publicSessionAck.resultKind).toBe('accepted')
    const publicSessionRef = publicSessionAck.emittedRecordRefs[0]

    const draftSessionResponse = await postJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.session.create`,
      {
        role: 'gm',
        playedAt: '2026-04-22T09:00:00.000Z',
        scenarioLabel: 'Masks Draft',
        campaignRef,
        visibility: 'draft',
      },
      ownerHeaders,
    )
    expect((await draftSessionResponse.json()).resultKind).toBe('accepted')

    const scenarioCreateResponse = await postJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.scenario.create`,
      {
        title: 'Shadows of Arkham',
        rulesetNsid: 'app.cerulia.rules.coc7',
        recommendedSheetSchemaRef: schemaRef,
        sourceCitationUri: 'https://example.com/scenario/shadows-of-arkham',
        summary: 'A spoiler-safe introduction.',
      },
      ownerHeaders,
    )
    const scenarioAck = await scenarioCreateResponse.json()
    expectAccepted(scenarioAck)
    const scenarioRef = scenarioAck.emittedRecordRefs[0]

    const scenarioUpdateResponse = await postJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.scenario.update`,
      {
        scenarioRef,
        summary: 'Updated summary.',
      },
      ownerHeaders,
    )
    expect((await scenarioUpdateResponse.json()).resultKind).toBe('accepted')

    const scenarioListResponse = await getJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.scenario.list?rulesetNsid=${encodeURIComponent('app.cerulia.rules.coc7')}`,
    )
    const scenarioList = await scenarioListResponse.json()
    expect(scenarioList.items).toHaveLength(1)
    expect(scenarioList.items[0].scenarioRef).toBe(scenarioRef)
    expect(scenarioList.items[0].hasRecommendedSheetSchema).toBe(true)

    const scenarioViewResponse = await getJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.scenario.getView?scenarioRef=${encodeURIComponent(scenarioRef)}`,
    )
    const scenarioView = await scenarioViewResponse.json()
    expect(scenarioView.scenarioSummary.summary).toBe('Updated summary.')
    expect(scenarioView.scenarioSummary.hasRecommendedSheetSchema).toBe(true)

    const ruleListResponse = await getJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.rule.listProfiles`,
      readerHeaders,
    )
    const ruleList = await ruleListResponse.json()
    expect(ruleList.items).toHaveLength(1)
    expect(ruleList.items[0].profileTitle).toBe('Club Overlay v2')

    const ruleViewResponse = await getJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.rule.getProfile?ruleProfileRef=${encodeURIComponent(ruleProfileRef)}`,
      readerHeaders,
    )
    const ruleView = await ruleViewResponse.json()
    expect(ruleView.ruleProfile.scopeRef).toBe(houseRef)

    const campaignViewResponse = await getJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.campaign.getView?campaignRef=${encodeURIComponent(campaignRef)}`,
    )
    const campaignView = await campaignViewResponse.json()
    expect(campaignView.campaignSummary.title).toBe('Masks Campaign')
    expect(campaignView.sessionSummaries).toHaveLength(1)
    expect(campaignView.sessionSummaries[0].externalArchiveUris).toBeUndefined()
    expect(campaignView.ruleOverlaySummary.ruleProfiles).toHaveLength(1)
    expect(campaignView.ruleOverlaySummary.ruleProfiles[0].profileTitle).toBe('Club Overlay v2')

    const publicSessionViewResponse = await getJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.session.getView?sessionRef=${encodeURIComponent(publicSessionRef)}`,
    )
    const publicSessionView = await publicSessionViewResponse.json()
    expect(publicSessionView.sessionSummary.externalArchiveUris).toEqual([
      'https://example.com/archive/masks-intro',
    ])

    const houseViewResponse = await getJson(
      app,
      `${XRPC_PREFIX}/app.cerulia.house.getView?houseRef=${encodeURIComponent(houseRef)}`,
    )
    const houseView = await houseViewResponse.json()
    expect(houseView.houseSummary.title).toBe('Arkham Club')
    expect(houseView.campaignSummaries).toHaveLength(1)
    expect(houseView.sessionSummaries).toHaveLength(1)
    expect(houseView.sessionSummaries[0].sessionRef).toBe(publicSessionRef)
    expect(houseView.sessionSummaries[0].externalArchiveUris).toBeUndefined()
  })
})