/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type LexiconDoc,
  Lexicons,
  ValidationError,
  type ValidationResult,
} from '@atproto/lexicon'
import { type $Typed, is$typed, maybe$typed } from './util.js'

export const schemaDict = {
  AppCeruliaActorGetProfileView: {
    lexicon: 1,
    id: 'app.cerulia.actor.getProfileView',
    defs: {
      main: {
        type: 'query',
        description:
          'Get player profile owner/public projection. Owner mode returns raw profile record. Public/anonymous mode returns composed profile summary and branch links only.',
        parameters: {
          type: 'params',
          required: ['did'],
          properties: {
            did: {
              type: 'string',
              format: 'did',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            properties: {
              profile: {
                type: 'ref',
                ref: 'lex:app.cerulia.core.playerProfile',
                description:
                  'Full player profile record. Present in owner mode only.',
              },
              blueskyFallbackProfile: {
                type: 'ref',
                ref: 'lex:app.cerulia.actor.getProfileView#fallbackProfile',
                description:
                  'Bluesky fallback profile fields for owner-side comparison. Present in owner mode only.',
              },
              profileSummary: {
                type: 'ref',
                ref: 'lex:app.cerulia.actor.getProfileView#profileSummary',
                description:
                  'Composed public-safe profile summary. Present in public/anonymous mode only.',
              },
              publicBranches: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.actor.getProfileView#branchLink',
                },
                description:
                  'Link-only branch rows for public character detail navigation. Present in public/anonymous mode only.',
              },
            },
          },
        },
      },
      profileSummary: {
        type: 'object',
        description:
          'Composed public-safe profile summary. Fallback-hydrated from Bluesky profile when Cerulia override is absent.',
        required: ['did'],
        properties: {
          did: {
            type: 'string',
            format: 'did',
          },
          displayName: {
            type: 'string',
            maxLength: 640,
          },
          description: {
            type: 'string',
            maxLength: 3000,
          },
          avatar: {
            type: 'blob',
          },
          banner: {
            type: 'blob',
          },
          website: {
            type: 'string',
            format: 'uri',
          },
          pronouns: {
            type: 'string',
            maxLength: 100,
          },
          roleDistribution: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
          },
          playFormats: {
            type: 'array',
            items: {
              type: 'string',
              knownValues: ['text', 'semi-text', 'voice', 'offline'],
            },
          },
          tools: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          ownedRulebooks: {
            type: 'string',
            maxLength: 3000,
          },
          playableTimeSummary: {
            type: 'string',
            maxLength: 3000,
          },
          preferredScenarioStyles: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          playStyles: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          boundaries: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          skills: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
      branchLink: {
        type: 'object',
        description:
          'Link-only branch row for public character detail navigation.',
        required: [
          'characterBranchRef',
          'displayName',
          'branchLabel',
          'rulesetNsid',
        ],
        properties: {
          characterBranchRef: {
            type: 'string',
            format: 'at-uri',
          },
          displayName: {
            type: 'string',
            maxLength: 640,
          },
          branchLabel: {
            type: 'string',
            maxLength: 640,
          },
          rulesetNsid: {
            type: 'string',
            format: 'nsid',
          },
        },
      },
      fallbackProfile: {
        type: 'object',
        description:
          'Owner-visible fallback profile fields resolved from app.bsky.actor.profile.',
        properties: {
          displayName: {
            type: 'string',
            maxLength: 640,
          },
          description: {
            type: 'string',
            maxLength: 3000,
          },
          avatar: {
            type: 'blob',
          },
          banner: {
            type: 'blob',
          },
          website: {
            type: 'string',
            format: 'uri',
          },
        },
      },
    },
  },
  AppCeruliaActorUpdateProfile: {
    lexicon: 1,
    id: 'app.cerulia.actor.updateProfile',
    defs: {
      main: {
        type: 'procedure',
        description: 'Update player profile.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            properties: {
              blueskyProfileRef: {
                type: 'string',
                format: 'at-uri',
              },
              displayNameOverride: {
                type: 'string',
                maxLength: 640,
              },
              descriptionOverride: {
                type: 'string',
                maxLength: 3000,
              },
              avatarOverrideBlob: {
                type: 'blob',
              },
              bannerOverrideBlob: {
                type: 'blob',
              },
              websiteOverride: {
                type: 'string',
                format: 'uri',
              },
              pronounsOverride: {
                type: 'string',
                maxLength: 100,
              },
              roleDistribution: {
                type: 'integer',
                minimum: 0,
                maximum: 100,
              },
              playFormats: {
                type: 'array',
                items: {
                  type: 'string',
                  knownValues: ['text', 'semi-text', 'voice', 'offline'],
                },
              },
              tools: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
              ownedRulebooks: {
                type: 'string',
                maxLength: 3000,
              },
              playableTimeSummary: {
                type: 'string',
                maxLength: 3000,
              },
              preferredScenarioStyles: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
              playStyles: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
              boundaries: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
              skills: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaAuthCoreReader: {
    lexicon: 1,
    id: 'app.cerulia.authCoreReader',
    defs: {
      main: {
        type: 'token',
        description:
          'OAuth scope bundle granting authenticated read access to core projections for the owner.',
      },
    },
  },
  AppCeruliaAuthCoreWriter: {
    lexicon: 1,
    id: 'app.cerulia.authCoreWriter',
    defs: {
      main: {
        type: 'token',
        description:
          'OAuth scope bundle granting write access to all core records.',
      },
    },
  },
  AppCeruliaCampaignCreate: {
    lexicon: 1,
    id: 'app.cerulia.campaign.create',
    defs: {
      main: {
        type: 'procedure',
        description: 'Create campaign.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['title', 'rulesetNsid'],
            properties: {
              title: {
                type: 'string',
                maxLength: 640,
              },
              rulesetNsid: {
                type: 'string',
                format: 'nsid',
              },
              houseRef: {
                type: 'string',
                format: 'at-uri',
              },
              sharedRuleProfileRefs: {
                type: 'array',
                items: {
                  type: 'string',
                  format: 'at-uri',
                },
              },
              visibility: {
                type: 'string',
                knownValues: ['draft', 'public'],
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaCampaignGetView: {
    lexicon: 1,
    id: 'app.cerulia.campaign.getView',
    defs: {
      main: {
        type: 'query',
        description:
          'Get campaign owner/public projection. Owner mode returns raw record fields. Public/anonymous mode returns summary fields only.',
        parameters: {
          type: 'params',
          required: ['campaignRef'],
          properties: {
            campaignRef: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            properties: {
              campaign: {
                type: 'ref',
                ref: 'lex:app.cerulia.core.campaign',
                description:
                  'Full campaign record. Present in owner mode only.',
              },
              sessions: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.campaign.getView#sessionListItem',
                },
                description: 'Session list items. Present in owner mode only.',
              },
              ruleOverlay: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.core.ruleProfile',
                },
                description:
                  'Full rule profile records. Present in owner mode only.',
              },
              campaignSummary: {
                type: 'ref',
                ref: 'lex:app.cerulia.campaign.getView#campaignSummary',
                description:
                  'Public-safe campaign summary. Present in public/anonymous mode only.',
              },
              sessionSummaries: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.campaign.getView#sessionSummary',
                },
                description:
                  'Public-safe session summaries. Present in public/anonymous mode only.',
              },
              ruleOverlaySummary: {
                type: 'ref',
                ref: 'lex:app.cerulia.campaign.getView#ruleOverlaySummary',
                description:
                  'Public-safe rule overlay summary. Present in public/anonymous mode only.',
              },
            },
          },
        },
      },
      sessionListItem: {
        type: 'object',
        required: ['sessionRef', 'role', 'playedAt', 'visibility'],
        properties: {
          sessionRef: {
            type: 'string',
            format: 'at-uri',
          },
          role: {
            type: 'string',
            knownValues: ['pl', 'gm'],
          },
          playedAt: {
            type: 'string',
            format: 'datetime',
          },
          scenarioLabel: {
            type: 'string',
            maxLength: 640,
          },
          characterBranchRef: {
            type: 'string',
            format: 'at-uri',
          },
          visibility: {
            type: 'string',
            knownValues: ['draft', 'public'],
          },
        },
      },
      campaignSummary: {
        type: 'object',
        description: 'Public-safe campaign display fields.',
        required: ['campaignRef', 'title', 'rulesetNsid', 'visibility'],
        properties: {
          campaignRef: {
            type: 'string',
            format: 'at-uri',
          },
          title: {
            type: 'string',
            maxLength: 640,
          },
          rulesetNsid: {
            type: 'string',
            format: 'nsid',
          },
          visibility: {
            type: 'string',
            knownValues: ['draft', 'public'],
          },
          updatedAt: {
            type: 'string',
            format: 'datetime',
          },
        },
      },
      sessionSummary: {
        type: 'object',
        description:
          'Public-safe session summary. Excludes note and characterBranchRef.',
        required: ['sessionRef', 'role', 'playedAt'],
        properties: {
          sessionRef: {
            type: 'string',
            format: 'at-uri',
          },
          role: {
            type: 'string',
            knownValues: ['pl', 'gm'],
          },
          playedAt: {
            type: 'string',
            format: 'datetime',
          },
          scenarioLabel: {
            type: 'string',
            maxLength: 640,
          },
          hoLabel: {
            type: 'string',
            maxLength: 640,
          },
          hoSummary: {
            type: 'string',
            maxLength: 3000,
          },
          outcomeSummary: {
            type: 'string',
            maxLength: 3000,
          },
        },
      },
      ruleOverlaySummary: {
        type: 'object',
        description:
          'Public-safe rule overlay summary. Excludes raw rule-profile payload.',
        properties: {
          ruleProfiles: {
            type: 'array',
            items: {
              type: 'ref',
              ref: 'lex:app.cerulia.campaign.getView#ruleProfileLink',
            },
          },
        },
      },
      ruleProfileLink: {
        type: 'object',
        required: ['ruleProfileRef', 'profileTitle'],
        properties: {
          ruleProfileRef: {
            type: 'string',
            format: 'at-uri',
          },
          profileTitle: {
            type: 'string',
            maxLength: 640,
          },
        },
      },
    },
  },
  AppCeruliaCampaignUpdate: {
    lexicon: 1,
    id: 'app.cerulia.campaign.update',
    defs: {
      main: {
        type: 'procedure',
        description: 'Update campaign.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['campaignRef'],
            properties: {
              campaignRef: {
                type: 'string',
                format: 'at-uri',
              },
              title: {
                type: 'string',
                maxLength: 640,
              },
              houseRef: {
                type: 'string',
                format: 'at-uri',
              },
              rulesetNsid: {
                type: 'string',
                format: 'nsid',
              },
              sharedRuleProfileRefs: {
                type: 'array',
                items: {
                  type: 'string',
                  format: 'at-uri',
                },
              },
              visibility: {
                type: 'string',
                knownValues: ['draft', 'public'],
              },
              archivedAt: {
                type: 'string',
                format: 'datetime',
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaCharacterCreateBranch: {
    lexicon: 1,
    id: 'app.cerulia.character.createBranch',
    defs: {
      main: {
        type: 'procedure',
        description: 'Create character branch.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['baseSheetRef', 'branchKind', 'branchLabel'],
            properties: {
              baseSheetRef: {
                type: 'string',
                format: 'at-uri',
              },
              branchKind: {
                type: 'string',
                knownValues: ['campaign-fork', 'local-override'],
              },
              branchLabel: {
                type: 'string',
                maxLength: 640,
              },
              overridePayload: {
                type: 'unknown',
              },
              visibility: {
                type: 'string',
                knownValues: ['draft', 'public'],
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaCharacterCreateSheet: {
    lexicon: 1,
    id: 'app.cerulia.character.createSheet',
    defs: {
      main: {
        type: 'procedure',
        description: 'Create character sheet.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['rulesetNsid', 'sheetSchemaRef', 'displayName'],
            properties: {
              rulesetNsid: {
                type: 'string',
                format: 'nsid',
              },
              sheetSchemaRef: {
                type: 'string',
                format: 'at-uri',
              },
              displayName: {
                type: 'string',
                maxLength: 640,
              },
              portraitBlob: {
                type: 'blob',
              },
              profileSummary: {
                type: 'string',
                maxLength: 3000,
              },
              stats: {
                type: 'unknown',
              },
              initialBranchVisibility: {
                type: 'string',
                knownValues: ['draft', 'public'],
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaCharacterGetBranchView: {
    lexicon: 1,
    id: 'app.cerulia.character.getBranchView',
    defs: {
      main: {
        type: 'query',
        description:
          'Get character branch owner/public projection. Owner mode returns raw record fields. Public/anonymous mode returns summary fields only.',
        parameters: {
          type: 'params',
          required: ['characterBranchRef'],
          properties: {
            characterBranchRef: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            properties: {
              branch: {
                type: 'ref',
                ref: 'lex:app.cerulia.core.characterBranch',
                description: 'Full branch record. Present in owner mode only.',
              },
              sheet: {
                type: 'ref',
                ref: 'lex:app.cerulia.core.characterSheet',
                description: 'Full sheet record. Present in owner mode only.',
              },
              advancements: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.core.characterAdvancement',
                },
                description:
                  'Full advancement records. Present in owner mode only.',
              },
              conversions: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.core.characterConversion',
                },
                description:
                  'Full conversion records. Present in owner mode only.',
              },
              recentSessions: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.character.getBranchView#sessionListItem',
                },
                description: 'Session list items. Present in owner mode only.',
              },
              branchSummary: {
                type: 'ref',
                ref: 'lex:app.cerulia.character.getBranchView#branchSummary',
                description:
                  'Public-safe branch summary. Present in public/anonymous mode only.',
              },
              sheetSummary: {
                type: 'ref',
                ref: 'lex:app.cerulia.character.getBranchView#sheetSummary',
                description:
                  'Public-safe sheet summary. Present in public/anonymous mode only.',
              },
              recentSessionSummaries: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.character.getBranchView#sessionSummary',
                },
                description:
                  'Public-safe session summaries. Present in public/anonymous mode only.',
              },
              advancementSummaries: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.character.getBranchView#advancementSummary',
                },
                description:
                  'Public-safe advancement summaries. Present in public/anonymous mode only.',
              },
              conversionSummaries: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.character.getBranchView#conversionSummary',
                },
                description:
                  'Public-safe conversion summaries. Present in public/anonymous mode only.',
              },
            },
          },
        },
      },
      branchSummary: {
        type: 'object',
        description:
          'Public-safe branch display fields. Excludes overridePayload and owner-only linkage.',
        required: [
          'branchRef',
          'branchLabel',
          'branchKind',
          'visibility',
          'revision',
        ],
        properties: {
          branchRef: {
            type: 'string',
            format: 'at-uri',
          },
          branchLabel: {
            type: 'string',
            maxLength: 640,
          },
          branchKind: {
            type: 'string',
            knownValues: ['main', 'campaign-fork', 'local-override'],
          },
          visibility: {
            type: 'string',
            knownValues: ['draft', 'public'],
          },
          revision: {
            type: 'integer',
            minimum: 1,
          },
          updatedAt: {
            type: 'string',
            format: 'datetime',
          },
        },
      },
      sheetSummary: {
        type: 'object',
        description: 'Public-safe sheet display fields.',
        required: ['sheetRef', 'displayName', 'rulesetNsid'],
        properties: {
          sheetRef: {
            type: 'string',
            format: 'at-uri',
          },
          displayName: {
            type: 'string',
            maxLength: 640,
          },
          rulesetNsid: {
            type: 'string',
            format: 'nsid',
          },
          structuredStats: {
            type: 'array',
            items: {
              type: 'ref',
              ref: 'lex:app.cerulia.character.getBranchView#statEntry',
            },
            description:
              'Schema-backed public stats only. Omitted when sheetSchemaRef is absent.',
          },
          portraitBlob: {
            type: 'blob',
          },
          profileSummary: {
            type: 'string',
            maxLength: 3000,
          },
        },
      },
      sessionSummary: {
        type: 'object',
        description:
          'Public-safe session summary. Excludes note and characterBranchRef.',
        required: ['sessionRef', 'role', 'playedAt'],
        properties: {
          sessionRef: {
            type: 'string',
            format: 'at-uri',
          },
          role: {
            type: 'string',
            knownValues: ['pl', 'gm'],
          },
          playedAt: {
            type: 'string',
            format: 'datetime',
          },
          scenarioLabel: {
            type: 'string',
            maxLength: 640,
          },
          hoLabel: {
            type: 'string',
            maxLength: 640,
          },
          hoSummary: {
            type: 'string',
            maxLength: 3000,
          },
          outcomeSummary: {
            type: 'string',
            maxLength: 3000,
          },
          externalArchiveUris: {
            type: 'array',
            items: {
              type: 'string',
              format: 'uri',
            },
          },
        },
      },
      advancementSummary: {
        type: 'object',
        description:
          'Public-safe advancement summary. Excludes deltaPayload and previousValues.',
        required: ['advancementRef', 'advancementKind', 'effectiveAt'],
        properties: {
          advancementRef: {
            type: 'string',
            format: 'at-uri',
          },
          advancementKind: {
            type: 'string',
            knownValues: [
              'xp-spend',
              'milestone',
              'retrain',
              'respec',
              'correction',
            ],
          },
          effectiveAt: {
            type: 'string',
            format: 'datetime',
          },
          sessionSummary: {
            type: 'ref',
            ref: 'lex:app.cerulia.character.getBranchView#advancementSessionSummary',
          },
        },
      },
      conversionSummary: {
        type: 'object',
        description:
          'Public-safe conversion provenance. Excludes version pins.',
        required: [
          'conversionRef',
          'sourceRulesetNsid',
          'targetRulesetNsid',
          'convertedAt',
        ],
        properties: {
          conversionRef: {
            type: 'string',
            format: 'at-uri',
          },
          sourceRulesetNsid: {
            type: 'string',
            format: 'nsid',
          },
          targetRulesetNsid: {
            type: 'string',
            format: 'nsid',
          },
          convertedAt: {
            type: 'string',
            format: 'datetime',
          },
        },
      },
      sessionListItem: {
        type: 'object',
        required: ['sessionRef', 'role', 'playedAt', 'visibility'],
        properties: {
          sessionRef: {
            type: 'string',
            format: 'at-uri',
          },
          role: {
            type: 'string',
            knownValues: ['pl', 'gm'],
          },
          playedAt: {
            type: 'string',
            format: 'datetime',
          },
          scenarioLabel: {
            type: 'string',
            maxLength: 640,
          },
          visibility: {
            type: 'string',
            knownValues: ['draft', 'public'],
          },
        },
      },
      advancementSessionSummary: {
        type: 'object',
        required: ['sessionRef', 'role', 'playedAt'],
        properties: {
          sessionRef: {
            type: 'string',
            format: 'at-uri',
          },
          role: {
            type: 'string',
            knownValues: ['pl', 'gm'],
          },
          playedAt: {
            type: 'string',
            format: 'datetime',
          },
          scenarioLabel: {
            type: 'string',
            maxLength: 640,
          },
        },
      },
      statEntry: {
        type: 'object',
        required: ['fieldId', 'value'],
        properties: {
          fieldId: {
            type: 'string',
          },
          label: {
            type: 'string',
            maxLength: 320,
          },
          value: {
            type: 'ref',
            ref: 'lex:app.cerulia.character.getBranchView#statValue',
          },
        },
      },
      statValue: {
        type: 'object',
        description: 'Bounded public stat value shape.',
        required: ['valueKind'],
        properties: {
          valueKind: {
            type: 'string',
            knownValues: ['integer', 'string', 'boolean', 'enum'],
          },
          numberValue: {
            type: 'integer',
          },
          textValue: {
            type: 'string',
            maxLength: 640,
          },
          boolValue: {
            type: 'boolean',
          },
          enumValue: {
            type: 'string',
            maxLength: 320,
          },
        },
      },
    },
  },
  AppCeruliaCharacterGetHome: {
    lexicon: 1,
    id: 'app.cerulia.character.getHome',
    defs: {
      main: {
        type: 'query',
        description: 'Get owner character home projection.',
        parameters: {
          type: 'params',
          properties: {},
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['ownerDid', 'branches'],
            properties: {
              ownerDid: {
                type: 'string',
                format: 'did',
              },
              branches: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.character.getHome#branchListItem',
                },
              },
              recentSessions: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.character.getHome#sessionListItem',
                },
              },
            },
          },
        },
      },
      branchListItem: {
        type: 'object',
        required: [
          'branchRef',
          'branchLabel',
          'baseSheetRef',
          'branchKind',
          'visibility',
          'revision',
        ],
        properties: {
          branchRef: {
            type: 'string',
            format: 'at-uri',
          },
          branchLabel: {
            type: 'string',
            maxLength: 640,
          },
          baseSheetRef: {
            type: 'string',
            format: 'at-uri',
          },
          branchKind: {
            type: 'string',
            knownValues: ['main', 'campaign-fork', 'local-override'],
          },
          visibility: {
            type: 'string',
            knownValues: ['draft', 'public'],
          },
          revision: {
            type: 'integer',
            minimum: 1,
          },
          updatedAt: {
            type: 'string',
            format: 'datetime',
          },
        },
      },
      sessionListItem: {
        type: 'object',
        required: ['sessionRef', 'role', 'playedAt', 'visibility'],
        properties: {
          sessionRef: {
            type: 'string',
            format: 'at-uri',
          },
          role: {
            type: 'string',
            knownValues: ['pl', 'gm'],
          },
          playedAt: {
            type: 'string',
            format: 'datetime',
          },
          scenarioLabel: {
            type: 'string',
            maxLength: 640,
          },
          characterBranchRef: {
            type: 'string',
            format: 'at-uri',
          },
          visibility: {
            type: 'string',
            knownValues: ['draft', 'public'],
          },
        },
      },
    },
  },
  AppCeruliaCharacterRebaseSheet: {
    lexicon: 1,
    id: 'app.cerulia.character.rebaseSheet',
    defs: {
      main: {
        type: 'procedure',
        description: 'Rebase character sheet to another schema.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: [
              'characterSheetRef',
              'expectedVersion',
              'targetSheetSchemaRef',
            ],
            properties: {
              characterSheetRef: {
                type: 'string',
                format: 'at-uri',
              },
              expectedVersion: {
                type: 'integer',
                minimum: 1,
                description:
                  'Version the client based the rebase on. Used to detect write conflicts and return rebase-needed.',
              },
              targetSheetSchemaRef: {
                type: 'string',
                format: 'at-uri',
              },
              stats: {
                type: 'unknown',
              },
              note: {
                type: 'string',
                maxLength: 3000,
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaCharacterRecordAdvancement: {
    lexicon: 1,
    id: 'app.cerulia.character.recordAdvancement',
    defs: {
      main: {
        type: 'procedure',
        description: 'Record character advancement.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: [
              'characterBranchRef',
              'advancementKind',
              'deltaPayload',
              'effectiveAt',
            ],
            properties: {
              characterBranchRef: {
                type: 'string',
                format: 'at-uri',
              },
              advancementKind: {
                type: 'string',
                knownValues: [
                  'xp-spend',
                  'milestone',
                  'retrain',
                  'respec',
                  'correction',
                ],
              },
              deltaPayload: {
                type: 'unknown',
              },
              effectiveAt: {
                type: 'string',
                format: 'datetime',
              },
              sessionRef: {
                type: 'string',
                format: 'at-uri',
              },
              previousValues: {
                type: 'unknown',
              },
              note: {
                type: 'string',
                maxLength: 3000,
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaCharacterRecordConversion: {
    lexicon: 1,
    id: 'app.cerulia.character.recordConversion',
    defs: {
      main: {
        type: 'procedure',
        description: 'Record character conversion.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: [
              'sourceSheetRef',
              'sourceBranchRef',
              'sourceRulesetNsid',
              'targetSheetRef',
              'targetBranchRef',
              'targetRulesetNsid',
              'convertedAt',
            ],
            properties: {
              sourceSheetRef: {
                type: 'string',
                format: 'at-uri',
              },
              sourceBranchRef: {
                type: 'string',
                format: 'at-uri',
              },
              sourceRulesetNsid: {
                type: 'string',
                format: 'nsid',
              },
              targetSheetRef: {
                type: 'string',
                format: 'at-uri',
              },
              targetBranchRef: {
                type: 'string',
                format: 'at-uri',
              },
              targetRulesetNsid: {
                type: 'string',
                format: 'nsid',
              },
              convertedAt: {
                type: 'string',
                format: 'datetime',
              },
              conversionContractRef: {
                type: 'string',
                format: 'uri',
              },
              note: {
                type: 'string',
                maxLength: 3000,
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaCharacterRetireBranch: {
    lexicon: 1,
    id: 'app.cerulia.character.retireBranch',
    defs: {
      main: {
        type: 'procedure',
        description: 'Retire character branch.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['characterBranchRef', 'expectedRevision'],
            properties: {
              characterBranchRef: {
                type: 'string',
                format: 'at-uri',
              },
              expectedRevision: {
                type: 'integer',
                minimum: 1,
                description:
                  'Revision the client based the retire operation on. Used to detect write conflicts and return rebase-needed.',
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaCharacterUpdateBranch: {
    lexicon: 1,
    id: 'app.cerulia.character.updateBranch',
    defs: {
      main: {
        type: 'procedure',
        description: 'Update character branch.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['characterBranchRef', 'expectedRevision'],
            properties: {
              characterBranchRef: {
                type: 'string',
                format: 'at-uri',
              },
              expectedRevision: {
                type: 'integer',
                minimum: 1,
                description:
                  'Revision the client based the edit on. Used to detect write conflicts and return rebase-needed.',
              },
              branchLabel: {
                type: 'string',
                maxLength: 640,
              },
              overridePayload: {
                type: 'unknown',
              },
              visibility: {
                type: 'string',
                knownValues: ['draft', 'public'],
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaCharacterUpdateSheet: {
    lexicon: 1,
    id: 'app.cerulia.character.updateSheet',
    defs: {
      main: {
        type: 'procedure',
        description: 'Update character sheet.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['characterSheetRef', 'expectedVersion'],
            properties: {
              characterSheetRef: {
                type: 'string',
                format: 'at-uri',
              },
              expectedVersion: {
                type: 'integer',
                minimum: 1,
                description:
                  'Version the client based the edit on. Used to detect write conflicts and return rebase-needed.',
              },
              displayName: {
                type: 'string',
                maxLength: 640,
              },
              portraitBlob: {
                type: 'blob',
              },
              profileSummary: {
                type: 'string',
                maxLength: 3000,
              },
              stats: {
                type: 'unknown',
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaCoreCampaign: {
    lexicon: 1,
    id: 'app.cerulia.core.campaign',
    defs: {
      main: {
        type: 'record',
        key: 'any',
        record: {
          type: 'object',
          properties: {
            campaignId: {
              type: 'string',
            },
            title: {
              type: 'string',
              maxLength: 640,
            },
            houseRef: {
              type: 'string',
              format: 'at-uri',
            },
            rulesetNsid: {
              type: 'string',
              format: 'nsid',
            },
            sharedRuleProfileRefs: {
              type: 'array',
              items: {
                type: 'string',
                format: 'at-uri',
              },
            },
            visibility: {
              type: 'string',
              knownValues: ['draft', 'public'],
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
            archivedAt: {
              type: 'string',
              format: 'datetime',
            },
            updatedAt: {
              type: 'string',
              format: 'datetime',
            },
          },
          required: [
            'campaignId',
            'title',
            'rulesetNsid',
            'visibility',
            'createdAt',
            'updatedAt',
          ],
        },
      },
    },
  },
  AppCeruliaCoreCharacterAdvancement: {
    lexicon: 1,
    id: 'app.cerulia.core.characterAdvancement',
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        record: {
          type: 'object',
          properties: {
            characterBranchRef: {
              type: 'string',
              format: 'at-uri',
            },
            advancementKind: {
              type: 'string',
              knownValues: [
                'xp-spend',
                'milestone',
                'retrain',
                'respec',
                'correction',
              ],
            },
            deltaPayload: {
              type: 'ref',
              ref: 'lex:app.cerulia.core.characterAdvancement#deltaPayload',
            },
            sessionRef: {
              type: 'string',
              format: 'at-uri',
            },
            previousValues: {
              type: 'ref',
              ref: 'lex:app.cerulia.core.characterAdvancement#previousValues',
            },
            effectiveAt: {
              type: 'string',
              format: 'datetime',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
            note: {
              type: 'string',
              maxLength: 3000,
            },
          },
          required: [
            'characterBranchRef',
            'advancementKind',
            'deltaPayload',
            'effectiveAt',
            'createdAt',
          ],
        },
      },
      deltaPayload: {
        type: 'object',
        description:
          'Inline advancement delta payload. Must be a public-safe JSON object.',
        properties: {},
      },
      previousValues: {
        type: 'object',
        description:
          'Previous values snapshot. Must be a public-safe JSON object.',
        properties: {},
      },
    },
  },
  AppCeruliaCoreCharacterBranch: {
    lexicon: 1,
    id: 'app.cerulia.core.characterBranch',
    defs: {
      main: {
        type: 'record',
        key: 'any',
        record: {
          type: 'object',
          properties: {
            ownerDid: {
              type: 'string',
              format: 'did',
            },
            baseSheetRef: {
              type: 'string',
              format: 'at-uri',
            },
            branchKind: {
              type: 'string',
              knownValues: ['main', 'campaign-fork', 'local-override'],
            },
            branchLabel: {
              type: 'string',
              maxLength: 640,
            },
            overridePayload: {
              type: 'ref',
              ref: 'lex:app.cerulia.core.characterBranch#overridePayload',
            },
            visibility: {
              type: 'string',
              knownValues: ['draft', 'public'],
            },
            revision: {
              type: 'integer',
              minimum: 1,
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
            updatedAt: {
              type: 'string',
              format: 'datetime',
            },
            retiredAt: {
              type: 'string',
              format: 'datetime',
            },
          },
          required: [
            'ownerDid',
            'baseSheetRef',
            'branchKind',
            'branchLabel',
            'visibility',
            'revision',
            'createdAt',
            'updatedAt',
          ],
        },
      },
      overridePayload: {
        type: 'object',
        description:
          'Inline override patch payload. Must be a public-safe JSON object.',
        properties: {},
      },
    },
  },
  AppCeruliaCoreCharacterConversion: {
    lexicon: 1,
    id: 'app.cerulia.core.characterConversion',
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        record: {
          type: 'object',
          properties: {
            sourceSheetRef: {
              type: 'string',
              format: 'at-uri',
            },
            sourceSheetVersion: {
              type: 'integer',
              minimum: 1,
            },
            sourceBranchRef: {
              type: 'string',
              format: 'at-uri',
            },
            sourceRulesetNsid: {
              type: 'string',
              format: 'nsid',
            },
            targetSheetRef: {
              type: 'string',
              format: 'at-uri',
            },
            targetSheetVersion: {
              type: 'integer',
              minimum: 1,
            },
            targetBranchRef: {
              type: 'string',
              format: 'at-uri',
            },
            targetRulesetNsid: {
              type: 'string',
              format: 'nsid',
            },
            conversionContractRef: {
              type: 'string',
              format: 'uri',
            },
            convertedAt: {
              type: 'string',
              format: 'datetime',
            },
            note: {
              type: 'string',
              maxLength: 3000,
            },
          },
          required: [
            'sourceSheetRef',
            'sourceSheetVersion',
            'sourceBranchRef',
            'sourceRulesetNsid',
            'targetSheetRef',
            'targetSheetVersion',
            'targetBranchRef',
            'targetRulesetNsid',
            'convertedAt',
          ],
        },
      },
    },
  },
  AppCeruliaCoreCharacterSheet: {
    lexicon: 1,
    id: 'app.cerulia.core.characterSheet',
    defs: {
      main: {
        type: 'record',
        description:
          'Character original. The portable base with settings, stats, and portrait for a character owned by a player.',
        key: 'any',
        record: {
          type: 'object',
          required: [
            'ownerDid',
            'rulesetNsid',
            'displayName',
            'version',
            'createdAt',
            'updatedAt',
          ],
          properties: {
            ownerDid: {
              type: 'string',
              format: 'did',
              description: 'DID of the player who owns this character.',
            },
            sheetSchemaRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'Reference to the character-sheet-schema this sheet conforms to. Required for active records; schema-less is legacy/import/recovery only.',
            },
            rulesetNsid: {
              type: 'string',
              format: 'nsid',
              description:
                'Root NSID of the ruleset this character belongs to.',
            },
            displayName: {
              type: 'string',
              maxLength: 640,
              description: 'Public-safe character name.',
            },
            portraitBlob: {
              type: 'blob',
              description: "Portrait image blob uploaded to the owner's repo.",
            },
            profileSummary: {
              type: 'string',
              maxLength: 3000,
              description: 'Public-safe character introduction text.',
            },
            stats: {
              type: 'unknown',
              description:
                'Structured stats payload conforming to fieldDefs when sheetSchemaRef is present; free-form JSON for legacy/import/recovery otherwise.',
            },
            version: {
              type: 'integer',
              minimum: 1,
              description:
                'Monotonically increasing version counter. Starts at 1 on create.',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
              description: 'UTC datetime when the record was created.',
            },
            updatedAt: {
              type: 'string',
              format: 'datetime',
              description: 'UTC datetime when the record was last updated.',
            },
          },
        },
      },
    },
  },
  AppCeruliaCoreCharacterSheetSchema: {
    lexicon: 1,
    id: 'app.cerulia.core.characterSheetSchema',
    defs: {
      main: {
        type: 'record',
        key: 'any',
        record: {
          type: 'object',
          properties: {
            baseRulesetNsid: {
              type: 'string',
              format: 'nsid',
            },
            schemaVersion: {
              type: 'string',
            },
            title: {
              type: 'string',
              maxLength: 640,
            },
            ownerDid: {
              type: 'string',
              format: 'did',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
            fieldDefs: {
              type: 'array',
              items: {
                type: 'ref',
                ref: 'lex:app.cerulia.core.characterSheetSchema#fieldDefRoot',
              },
            },
          },
          required: [
            'baseRulesetNsid',
            'schemaVersion',
            'title',
            'ownerDid',
            'createdAt',
            'fieldDefs',
          ],
        },
      },
      fieldDefLeaf: {
        type: 'object',
        properties: {
          fieldId: {
            type: 'string',
          },
          label: {
            type: 'string',
            maxLength: 320,
          },
          fieldType: {
            type: 'string',
            knownValues: ['integer', 'string', 'boolean', 'enum'],
          },
          valueRange: {
            type: 'ref',
            ref: 'lex:app.cerulia.core.characterSheetSchema#valueRange',
          },
          required: {
            type: 'boolean',
          },
          description: {
            type: 'string',
          },
        },
        required: ['fieldId', 'label', 'fieldType', 'required'],
      },
      fieldDefNode: {
        type: 'object',
        properties: {
          fieldId: {
            type: 'string',
          },
          label: {
            type: 'string',
            maxLength: 320,
          },
          fieldType: {
            type: 'string',
            knownValues: [
              'integer',
              'string',
              'boolean',
              'enum',
              'group',
              'array',
            ],
          },
          children: {
            type: 'array',
            items: {
              type: 'ref',
              ref: 'lex:app.cerulia.core.characterSheetSchema#fieldDefNode',
            },
          },
          itemDef: {
            type: 'ref',
            ref: 'lex:app.cerulia.core.characterSheetSchema#fieldDefNode',
          },
          valueRange: {
            type: 'ref',
            ref: 'lex:app.cerulia.core.characterSheetSchema#valueRange',
          },
          required: {
            type: 'boolean',
          },
          description: {
            type: 'string',
          },
          extensible: {
            type: 'boolean',
          },
          additionalFieldDef: {
            type: 'ref',
            ref: 'lex:app.cerulia.core.characterSheetSchema#fieldDefAdditional',
          },
        },
        required: ['fieldId', 'label', 'fieldType', 'required'],
      },
      fieldDefRoot: {
        type: 'object',
        properties: {
          fieldId: {
            type: 'string',
          },
          label: {
            type: 'string',
            maxLength: 320,
          },
          fieldType: {
            type: 'string',
            knownValues: [
              'integer',
              'string',
              'boolean',
              'enum',
              'group',
              'array',
            ],
          },
          children: {
            type: 'array',
            items: {
              type: 'ref',
              ref: 'lex:app.cerulia.core.characterSheetSchema#fieldDefNode',
            },
          },
          itemDef: {
            type: 'ref',
            ref: 'lex:app.cerulia.core.characterSheetSchema#fieldDefNode',
          },
          valueRange: {
            type: 'ref',
            ref: 'lex:app.cerulia.core.characterSheetSchema#valueRange',
          },
          required: {
            type: 'boolean',
          },
          description: {
            type: 'string',
          },
          extensible: {
            type: 'boolean',
          },
          additionalFieldDef: {
            type: 'ref',
            ref: 'lex:app.cerulia.core.characterSheetSchema#fieldDefAdditional',
          },
        },
        required: ['fieldId', 'label', 'fieldType', 'required'],
      },
      fieldDefAdditional: {
        type: 'object',
        description: 'Additional child field template. Must not be extensible.',
        properties: {
          fieldId: {
            type: 'string',
          },
          label: {
            type: 'string',
            maxLength: 320,
          },
          fieldType: {
            type: 'string',
            knownValues: [
              'integer',
              'string',
              'boolean',
              'enum',
              'group',
              'array',
            ],
          },
          children: {
            type: 'array',
            items: {
              type: 'ref',
              ref: 'lex:app.cerulia.core.characterSheetSchema#fieldDefNode',
            },
          },
          itemDef: {
            type: 'ref',
            ref: 'lex:app.cerulia.core.characterSheetSchema#fieldDefNode',
          },
          valueRange: {
            type: 'ref',
            ref: 'lex:app.cerulia.core.characterSheetSchema#valueRange',
          },
          required: {
            type: 'boolean',
          },
          description: {
            type: 'string',
          },
        },
        required: ['fieldId', 'label', 'fieldType', 'required'],
      },
      valueRange: {
        type: 'object',
        properties: {
          min: {
            type: 'integer',
          },
          max: {
            type: 'integer',
          },
          enumValues: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
    },
  },
  AppCeruliaCoreHouse: {
    lexicon: 1,
    id: 'app.cerulia.core.house',
    defs: {
      main: {
        type: 'record',
        key: 'any',
        record: {
          type: 'object',
          properties: {
            houseId: {
              type: 'string',
            },
            title: {
              type: 'string',
              maxLength: 640,
            },
            canonSummary: {
              type: 'string',
              maxLength: 3000,
            },
            defaultRuleProfileRefs: {
              type: 'array',
              items: {
                type: 'string',
                format: 'at-uri',
              },
            },
            policySummary: {
              type: 'string',
              maxLength: 3000,
            },
            externalCommunityUri: {
              type: 'string',
              format: 'uri',
            },
            visibility: {
              type: 'string',
              knownValues: ['draft', 'public'],
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
            updatedAt: {
              type: 'string',
              format: 'datetime',
            },
          },
          required: [
            'houseId',
            'title',
            'visibility',
            'createdAt',
            'updatedAt',
          ],
        },
      },
    },
  },
  AppCeruliaCorePlayerProfile: {
    lexicon: 1,
    id: 'app.cerulia.core.playerProfile',
    defs: {
      main: {
        type: 'record',
        key: 'literal:self',
        record: {
          type: 'object',
          properties: {
            ownerDid: {
              type: 'string',
              format: 'did',
            },
            blueskyProfileRef: {
              type: 'string',
              format: 'at-uri',
            },
            displayNameOverride: {
              type: 'string',
              maxLength: 640,
            },
            descriptionOverride: {
              type: 'string',
              maxLength: 3000,
            },
            avatarOverrideBlob: {
              type: 'blob',
            },
            bannerOverrideBlob: {
              type: 'blob',
            },
            websiteOverride: {
              type: 'string',
              format: 'uri',
            },
            pronounsOverride: {
              type: 'string',
              maxLength: 100,
            },
            roleDistribution: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
            },
            playFormats: {
              type: 'array',
              items: {
                type: 'string',
                knownValues: ['text', 'semi-text', 'voice', 'offline'],
              },
            },
            tools: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            ownedRulebooks: {
              type: 'string',
              maxLength: 3000,
            },
            playableTimeSummary: {
              type: 'string',
              maxLength: 3000,
            },
            preferredScenarioStyles: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            playStyles: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            boundaries: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            skills: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
            updatedAt: {
              type: 'string',
              format: 'datetime',
            },
          },
          required: ['ownerDid', 'createdAt', 'updatedAt'],
        },
      },
    },
  },
  AppCeruliaCoreRuleProfile: {
    lexicon: 1,
    id: 'app.cerulia.core.ruleProfile',
    defs: {
      main: {
        type: 'record',
        key: 'any',
        record: {
          type: 'object',
          properties: {
            baseRulesetNsid: {
              type: 'string',
              format: 'nsid',
            },
            profileTitle: {
              type: 'string',
              maxLength: 640,
            },
            scopeKind: {
              type: 'string',
              knownValues: ['house-shared', 'campaign-shared'],
            },
            scopeRef: {
              type: 'string',
              format: 'at-uri',
            },
            rulesPatchUri: {
              type: 'string',
              format: 'uri',
            },
            ownerDid: {
              type: 'string',
              format: 'did',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
            updatedAt: {
              type: 'string',
              format: 'datetime',
            },
          },
          required: [
            'baseRulesetNsid',
            'profileTitle',
            'scopeKind',
            'scopeRef',
            'rulesPatchUri',
            'ownerDid',
            'createdAt',
            'updatedAt',
          ],
        },
      },
    },
  },
  AppCeruliaCoreScenario: {
    lexicon: 1,
    id: 'app.cerulia.core.scenario',
    defs: {
      main: {
        type: 'record',
        key: 'any',
        record: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              maxLength: 640,
            },
            rulesetNsid: {
              type: 'string',
              format: 'nsid',
            },
            recommendedSheetSchemaRef: {
              type: 'string',
              format: 'at-uri',
            },
            sourceCitationUri: {
              type: 'string',
              format: 'uri',
            },
            summary: {
              type: 'string',
              maxLength: 3000,
            },
            ownerDid: {
              type: 'string',
              format: 'did',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
            updatedAt: {
              type: 'string',
              format: 'datetime',
            },
          },
          required: ['title', 'ownerDid', 'createdAt', 'updatedAt'],
        },
      },
    },
  },
  AppCeruliaCoreSession: {
    lexicon: 1,
    id: 'app.cerulia.core.session',
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        record: {
          type: 'object',
          properties: {
            scenarioRef: {
              type: 'string',
              format: 'at-uri',
            },
            scenarioLabel: {
              type: 'string',
              maxLength: 640,
            },
            characterBranchRef: {
              type: 'string',
              format: 'at-uri',
            },
            role: {
              type: 'string',
              knownValues: ['pl', 'gm'],
            },
            campaignRef: {
              type: 'string',
              format: 'at-uri',
            },
            playedAt: {
              type: 'string',
              format: 'datetime',
            },
            hoLabel: {
              type: 'string',
              maxLength: 640,
            },
            hoSummary: {
              type: 'string',
              maxLength: 3000,
            },
            outcomeSummary: {
              type: 'string',
              maxLength: 3000,
            },
            externalArchiveUris: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uri',
              },
            },
            visibility: {
              type: 'string',
              knownValues: ['draft', 'public'],
            },
            note: {
              type: 'string',
              maxLength: 3000,
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
            updatedAt: {
              type: 'string',
              format: 'datetime',
            },
          },
          required: [
            'role',
            'playedAt',
            'visibility',
            'createdAt',
            'updatedAt',
          ],
        },
      },
    },
  },
  AppCeruliaDefs: {
    lexicon: 1,
    id: 'app.cerulia.defs',
    defs: {
      mutationAck: {
        type: 'object',
        description:
          'Mutation result acknowledgement. Returned by all mutation procedures.',
        required: ['resultKind'],
        properties: {
          resultKind: {
            type: 'string',
            knownValues: ['accepted', 'rejected', 'rebase-needed'],
            description: 'Outcome of the mutation attempt.',
          },
          emittedRecordRefs: {
            type: 'array',
            items: {
              type: 'string',
              format: 'at-uri',
            },
            description:
              'Persistent record refs emitted on accepted. Present only when resultKind=accepted and at least one record was written.',
          },
          reasonCode: {
            type: 'string',
            description: 'Machine-readable stable failure category.',
            knownValues: [
              'forbidden-owner-mismatch',
              'invalid-required-field',
              'invalid-exactly-one',
              'invalid-schema-link',
              'invalid-public-uri',
              'rebase-required',
              'terminal-state-readonly',
            ],
          },
          correlationId: {
            type: 'string',
            description: 'Support and log correlation request identifier.',
          },
          message: {
            type: 'string',
            description: 'Human-readable short explanation.',
          },
        },
      },
    },
  },
  AppCeruliaHouseCreate: {
    lexicon: 1,
    id: 'app.cerulia.house.create',
    defs: {
      main: {
        type: 'procedure',
        description: 'Create house.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['title'],
            properties: {
              title: {
                type: 'string',
                maxLength: 640,
              },
              canonSummary: {
                type: 'string',
                maxLength: 3000,
              },
              defaultRuleProfileRefs: {
                type: 'array',
                items: {
                  type: 'string',
                  format: 'at-uri',
                },
              },
              policySummary: {
                type: 'string',
                maxLength: 3000,
              },
              externalCommunityUri: {
                type: 'string',
                format: 'uri',
              },
              visibility: {
                type: 'string',
                knownValues: ['draft', 'public'],
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaHouseGetView: {
    lexicon: 1,
    id: 'app.cerulia.house.getView',
    defs: {
      main: {
        type: 'query',
        description:
          'Get house owner/public projection. Owner mode returns raw record fields. Public/anonymous mode returns summary fields only.',
        parameters: {
          type: 'params',
          required: ['houseRef'],
          properties: {
            houseRef: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            properties: {
              house: {
                type: 'ref',
                ref: 'lex:app.cerulia.core.house',
                description: 'Full house record. Present in owner mode only.',
              },
              campaigns: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.house.getView#campaignListItem',
                },
                description: 'Campaign list items. Present in owner mode only.',
              },
              sessions: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.house.getView#sessionListItem',
                },
                description: 'Session list items. Present in owner mode only.',
              },
              houseSummary: {
                type: 'ref',
                ref: 'lex:app.cerulia.house.getView#houseSummary',
                description:
                  'Public-safe house summary. Present in public/anonymous mode only.',
              },
              campaignSummaries: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.house.getView#campaignSummary',
                },
                description:
                  'Public-safe campaign summaries. Present in public/anonymous mode only.',
              },
              sessionSummaries: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.house.getView#sessionSummary',
                },
                description:
                  'Public-safe session summaries. Present in public/anonymous mode only.',
              },
            },
          },
        },
      },
      campaignListItem: {
        type: 'object',
        required: ['campaignRef', 'title', 'rulesetNsid', 'visibility'],
        properties: {
          campaignRef: {
            type: 'string',
            format: 'at-uri',
          },
          title: {
            type: 'string',
            maxLength: 640,
          },
          rulesetNsid: {
            type: 'string',
            format: 'nsid',
          },
          visibility: {
            type: 'string',
            knownValues: ['draft', 'public'],
          },
          updatedAt: {
            type: 'string',
            format: 'datetime',
          },
        },
      },
      sessionListItem: {
        type: 'object',
        required: ['sessionRef', 'role', 'playedAt', 'visibility'],
        properties: {
          sessionRef: {
            type: 'string',
            format: 'at-uri',
          },
          role: {
            type: 'string',
            knownValues: ['pl', 'gm'],
          },
          playedAt: {
            type: 'string',
            format: 'datetime',
          },
          scenarioLabel: {
            type: 'string',
            maxLength: 640,
          },
          visibility: {
            type: 'string',
            knownValues: ['draft', 'public'],
          },
        },
      },
      houseSummary: {
        type: 'object',
        description: 'Public-safe house display fields.',
        required: ['houseRef', 'title', 'visibility'],
        properties: {
          houseRef: {
            type: 'string',
            format: 'at-uri',
          },
          title: {
            type: 'string',
            maxLength: 640,
          },
          visibility: {
            type: 'string',
            knownValues: ['draft', 'public'],
          },
          canonSummary: {
            type: 'string',
            maxLength: 3000,
          },
          externalCommunityUri: {
            type: 'string',
            format: 'uri',
          },
        },
      },
      campaignSummary: {
        type: 'object',
        description: 'Public-safe campaign display fields.',
        required: ['campaignRef', 'title', 'rulesetNsid', 'visibility'],
        properties: {
          campaignRef: {
            type: 'string',
            format: 'at-uri',
          },
          title: {
            type: 'string',
            maxLength: 640,
          },
          rulesetNsid: {
            type: 'string',
            format: 'nsid',
          },
          visibility: {
            type: 'string',
            knownValues: ['draft', 'public'],
          },
          updatedAt: {
            type: 'string',
            format: 'datetime',
          },
        },
      },
      sessionSummary: {
        type: 'object',
        description:
          'Public-safe session summary. Excludes note and characterBranchRef.',
        required: ['sessionRef', 'role', 'playedAt'],
        properties: {
          sessionRef: {
            type: 'string',
            format: 'at-uri',
          },
          role: {
            type: 'string',
            knownValues: ['pl', 'gm'],
          },
          playedAt: {
            type: 'string',
            format: 'datetime',
          },
          scenarioLabel: {
            type: 'string',
            maxLength: 640,
          },
          hoLabel: {
            type: 'string',
            maxLength: 640,
          },
          hoSummary: {
            type: 'string',
            maxLength: 3000,
          },
          outcomeSummary: {
            type: 'string',
            maxLength: 3000,
          },
        },
      },
    },
  },
  AppCeruliaHouseUpdate: {
    lexicon: 1,
    id: 'app.cerulia.house.update',
    defs: {
      main: {
        type: 'procedure',
        description: 'Update house.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['houseRef'],
            properties: {
              houseRef: {
                type: 'string',
                format: 'at-uri',
              },
              title: {
                type: 'string',
                maxLength: 640,
              },
              canonSummary: {
                type: 'string',
                maxLength: 3000,
              },
              defaultRuleProfileRefs: {
                type: 'array',
                items: {
                  type: 'string',
                  format: 'at-uri',
                },
              },
              policySummary: {
                type: 'string',
                maxLength: 3000,
              },
              externalCommunityUri: {
                type: 'string',
                format: 'uri',
              },
              visibility: {
                type: 'string',
                knownValues: ['draft', 'public'],
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaRuleCreateProfile: {
    lexicon: 1,
    id: 'app.cerulia.rule.createProfile',
    defs: {
      main: {
        type: 'procedure',
        description: 'Create rule profile.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: [
              'baseRulesetNsid',
              'profileTitle',
              'scopeKind',
              'scopeRef',
              'rulesPatchUri',
            ],
            properties: {
              baseRulesetNsid: {
                type: 'string',
                format: 'nsid',
              },
              profileTitle: {
                type: 'string',
                maxLength: 640,
              },
              scopeKind: {
                type: 'string',
                knownValues: ['house-shared', 'campaign-shared'],
              },
              scopeRef: {
                type: 'string',
                format: 'at-uri',
              },
              rulesPatchUri: {
                type: 'string',
                format: 'uri',
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaRuleCreateSheetSchema: {
    lexicon: 1,
    id: 'app.cerulia.rule.createSheetSchema',
    defs: {
      main: {
        type: 'procedure',
        description: 'Create character sheet schema.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: [
              'baseRulesetNsid',
              'schemaVersion',
              'title',
              'fieldDefs',
            ],
            properties: {
              baseRulesetNsid: {
                type: 'string',
                format: 'nsid',
              },
              schemaVersion: {
                type: 'string',
              },
              title: {
                type: 'string',
                maxLength: 640,
              },
              fieldDefs: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.core.characterSheetSchema#fieldDefRoot',
                },
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaRuleGetProfile: {
    lexicon: 1,
    id: 'app.cerulia.rule.getProfile',
    defs: {
      main: {
        type: 'query',
        description: 'Get rule profile.',
        parameters: {
          type: 'params',
          required: ['ruleProfileRef'],
          properties: {
            ruleProfileRef: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['ruleProfile'],
            properties: {
              ruleProfile: {
                type: 'ref',
                ref: 'lex:app.cerulia.core.ruleProfile',
              },
            },
          },
        },
      },
    },
  },
  AppCeruliaRuleGetSheetSchema: {
    lexicon: 1,
    id: 'app.cerulia.rule.getSheetSchema',
    defs: {
      main: {
        type: 'query',
        description: 'Get character sheet schema.',
        parameters: {
          type: 'params',
          required: ['characterSheetSchemaRef'],
          properties: {
            characterSheetSchemaRef: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['characterSheetSchema'],
            properties: {
              characterSheetSchema: {
                type: 'ref',
                ref: 'lex:app.cerulia.core.characterSheetSchema',
              },
            },
          },
        },
      },
    },
  },
  AppCeruliaRuleListProfiles: {
    lexicon: 1,
    id: 'app.cerulia.rule.listProfiles',
    defs: {
      main: {
        type: 'query',
        description: 'List rule profiles.',
        parameters: {
          type: 'params',
          properties: {
            scopeRef: {
              type: 'string',
              format: 'at-uri',
            },
            baseRulesetNsid: {
              type: 'string',
              format: 'nsid',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['items'],
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.rule.listProfiles#ruleProfileListItem',
                },
              },
              cursor: {
                type: 'string',
              },
            },
          },
        },
      },
      ruleProfileListItem: {
        type: 'object',
        required: [
          'ruleProfileRef',
          'baseRulesetNsid',
          'profileTitle',
          'scopeKind',
          'scopeRef',
        ],
        properties: {
          ruleProfileRef: {
            type: 'string',
            format: 'at-uri',
          },
          baseRulesetNsid: {
            type: 'string',
            format: 'nsid',
          },
          profileTitle: {
            type: 'string',
            maxLength: 640,
          },
          scopeKind: {
            type: 'string',
            knownValues: ['house-shared', 'campaign-shared'],
          },
          scopeRef: {
            type: 'string',
            format: 'at-uri',
          },
        },
      },
    },
  },
  AppCeruliaRuleListSheetSchemas: {
    lexicon: 1,
    id: 'app.cerulia.rule.listSheetSchemas',
    defs: {
      main: {
        type: 'query',
        description: 'List character sheet schemas.',
        parameters: {
          type: 'params',
          properties: {
            rulesetNsid: {
              type: 'string',
              format: 'nsid',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['items'],
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.rule.listSheetSchemas#sheetSchemaListItem',
                },
              },
              cursor: {
                type: 'string',
              },
            },
          },
        },
      },
      sheetSchemaListItem: {
        type: 'object',
        required: ['schemaRef', 'baseRulesetNsid', 'schemaVersion', 'title'],
        properties: {
          schemaRef: {
            type: 'string',
            format: 'at-uri',
          },
          baseRulesetNsid: {
            type: 'string',
            format: 'nsid',
          },
          schemaVersion: {
            type: 'string',
          },
          title: {
            type: 'string',
            maxLength: 640,
          },
        },
      },
    },
  },
  AppCeruliaRuleUpdateProfile: {
    lexicon: 1,
    id: 'app.cerulia.rule.updateProfile',
    defs: {
      main: {
        type: 'procedure',
        description: 'Update rule profile.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['ruleProfileRef'],
            properties: {
              ruleProfileRef: {
                type: 'string',
                format: 'at-uri',
              },
              profileTitle: {
                type: 'string',
                maxLength: 640,
              },
              rulesPatchUri: {
                type: 'string',
                format: 'uri',
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaScenarioCreate: {
    lexicon: 1,
    id: 'app.cerulia.scenario.create',
    defs: {
      main: {
        type: 'procedure',
        description: 'Create scenario.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['title'],
            properties: {
              title: {
                type: 'string',
                maxLength: 640,
              },
              rulesetNsid: {
                type: 'string',
                format: 'nsid',
              },
              recommendedSheetSchemaRef: {
                type: 'string',
                format: 'at-uri',
              },
              sourceCitationUri: {
                type: 'string',
                format: 'uri',
              },
              summary: {
                type: 'string',
                maxLength: 3000,
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaScenarioGetView: {
    lexicon: 1,
    id: 'app.cerulia.scenario.getView',
    defs: {
      main: {
        type: 'query',
        description:
          'Get scenario owner/public view. Owner mode can return raw record fields. Public/anonymous mode returns summary fields.',
        parameters: {
          type: 'params',
          required: ['scenarioRef'],
          properties: {
            scenarioRef: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            properties: {
              scenario: {
                type: 'ref',
                ref: 'lex:app.cerulia.core.scenario',
                description:
                  'Full scenario record. Present in owner mode only.',
              },
              scenarioSummary: {
                type: 'ref',
                ref: 'lex:app.cerulia.scenario.getView#scenarioSummary',
                description:
                  'Public-safe scenario summary. Present in public/anonymous mode only.',
              },
            },
          },
        },
      },
      scenarioSummary: {
        type: 'object',
        required: ['scenarioRef', 'title', 'hasRecommendedSheetSchema'],
        properties: {
          scenarioRef: {
            type: 'string',
            format: 'at-uri',
          },
          title: {
            type: 'string',
            maxLength: 640,
          },
          rulesetNsid: {
            type: 'string',
            format: 'nsid',
          },
          hasRecommendedSheetSchema: {
            type: 'boolean',
          },
          summary: {
            type: 'string',
            maxLength: 3000,
          },
          sourceCitationUri: {
            type: 'string',
            format: 'uri',
          },
        },
      },
    },
  },
  AppCeruliaScenarioList: {
    lexicon: 1,
    id: 'app.cerulia.scenario.list',
    defs: {
      main: {
        type: 'query',
        description: 'List scenarios.',
        parameters: {
          type: 'params',
          properties: {
            rulesetNsid: {
              type: 'string',
              format: 'nsid',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['items'],
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.scenario.list#scenarioListItem',
                },
              },
              cursor: {
                type: 'string',
              },
            },
          },
        },
      },
      scenarioListItem: {
        type: 'object',
        required: ['scenarioRef', 'title', 'hasRecommendedSheetSchema'],
        properties: {
          scenarioRef: {
            type: 'string',
            format: 'at-uri',
          },
          title: {
            type: 'string',
            maxLength: 640,
          },
          rulesetNsid: {
            type: 'string',
            format: 'nsid',
          },
          hasRecommendedSheetSchema: {
            type: 'boolean',
          },
          summary: {
            type: 'string',
            maxLength: 3000,
          },
        },
      },
    },
  },
  AppCeruliaScenarioUpdate: {
    lexicon: 1,
    id: 'app.cerulia.scenario.update',
    defs: {
      main: {
        type: 'procedure',
        description: 'Update scenario.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['scenarioRef'],
            properties: {
              scenarioRef: {
                type: 'string',
                format: 'at-uri',
              },
              title: {
                type: 'string',
                maxLength: 640,
              },
              rulesetNsid: {
                type: 'string',
                format: 'nsid',
              },
              recommendedSheetSchemaRef: {
                type: 'string',
                format: 'at-uri',
              },
              sourceCitationUri: {
                type: 'string',
                format: 'uri',
              },
              summary: {
                type: 'string',
                maxLength: 3000,
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaSessionCreate: {
    lexicon: 1,
    id: 'app.cerulia.session.create',
    defs: {
      main: {
        type: 'procedure',
        description: 'Create session.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['role', 'playedAt'],
            properties: {
              role: {
                type: 'string',
                knownValues: ['pl', 'gm'],
              },
              playedAt: {
                type: 'string',
                format: 'datetime',
              },
              scenarioRef: {
                type: 'string',
                format: 'at-uri',
              },
              scenarioLabel: {
                type: 'string',
                maxLength: 640,
              },
              characterBranchRef: {
                type: 'string',
                format: 'at-uri',
              },
              campaignRef: {
                type: 'string',
                format: 'at-uri',
              },
              hoLabel: {
                type: 'string',
                maxLength: 640,
              },
              hoSummary: {
                type: 'string',
                maxLength: 3000,
              },
              outcomeSummary: {
                type: 'string',
                maxLength: 3000,
              },
              externalArchiveUris: {
                type: 'array',
                items: {
                  type: 'string',
                  format: 'uri',
                },
              },
              visibility: {
                type: 'string',
                knownValues: ['draft', 'public'],
              },
              note: {
                type: 'string',
                maxLength: 3000,
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaSessionGetView: {
    lexicon: 1,
    id: 'app.cerulia.session.getView',
    defs: {
      main: {
        type: 'query',
        description:
          'Get session owner/public projection. Owner mode returns raw record fields. Public/anonymous mode returns summary fields only.',
        parameters: {
          type: 'params',
          required: ['sessionRef'],
          properties: {
            sessionRef: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            properties: {
              session: {
                type: 'ref',
                ref: 'lex:app.cerulia.core.session',
                description: 'Full session record. Present in owner mode only.',
              },
              sessionSummary: {
                type: 'ref',
                ref: 'lex:app.cerulia.session.getView#sessionSummary',
                description:
                  'Public-safe session summary. Present in public/anonymous mode only.',
              },
            },
          },
        },
      },
      sessionSummary: {
        type: 'object',
        description:
          'Public-safe session summary. Excludes note and characterBranchRef.',
        required: ['sessionRef', 'role', 'playedAt', 'visibility'],
        properties: {
          sessionRef: {
            type: 'string',
            format: 'at-uri',
          },
          role: {
            type: 'string',
            knownValues: ['pl', 'gm'],
          },
          playedAt: {
            type: 'string',
            format: 'datetime',
          },
          scenarioLabel: {
            type: 'string',
            maxLength: 640,
          },
          hoLabel: {
            type: 'string',
            maxLength: 640,
          },
          hoSummary: {
            type: 'string',
            maxLength: 3000,
          },
          outcomeSummary: {
            type: 'string',
            maxLength: 3000,
          },
          visibility: {
            type: 'string',
            knownValues: ['draft', 'public'],
          },
          externalArchiveUris: {
            type: 'array',
            items: {
              type: 'string',
              format: 'uri',
            },
          },
        },
      },
    },
  },
  AppCeruliaSessionList: {
    lexicon: 1,
    id: 'app.cerulia.session.list',
    defs: {
      main: {
        type: 'query',
        description: 'List sessions.',
        parameters: {
          type: 'params',
          properties: {
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['items'],
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.session.list#sessionListItem',
                },
              },
              cursor: {
                type: 'string',
              },
            },
          },
        },
      },
      sessionListItem: {
        type: 'object',
        required: ['sessionRef', 'role', 'playedAt', 'visibility'],
        properties: {
          sessionRef: {
            type: 'string',
            format: 'at-uri',
          },
          role: {
            type: 'string',
            knownValues: ['pl', 'gm'],
          },
          playedAt: {
            type: 'string',
            format: 'datetime',
          },
          scenarioLabel: {
            type: 'string',
            maxLength: 640,
          },
          characterBranchRef: {
            type: 'string',
            format: 'at-uri',
          },
          visibility: {
            type: 'string',
            knownValues: ['draft', 'public'],
          },
        },
      },
    },
  },
  AppCeruliaSessionUpdate: {
    lexicon: 1,
    id: 'app.cerulia.session.update',
    defs: {
      main: {
        type: 'procedure',
        description: 'Update session.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['sessionRef'],
            properties: {
              sessionRef: {
                type: 'string',
                format: 'at-uri',
              },
              scenarioRef: {
                type: 'string',
                format: 'at-uri',
              },
              scenarioLabel: {
                type: 'string',
                maxLength: 640,
              },
              characterBranchRef: {
                type: 'string',
                format: 'at-uri',
              },
              role: {
                type: 'string',
                knownValues: ['pl', 'gm'],
              },
              campaignRef: {
                type: 'string',
                format: 'at-uri',
              },
              playedAt: {
                type: 'string',
                format: 'datetime',
              },
              hoLabel: {
                type: 'string',
                maxLength: 640,
              },
              hoSummary: {
                type: 'string',
                maxLength: 3000,
              },
              outcomeSummary: {
                type: 'string',
                maxLength: 3000,
              },
              externalArchiveUris: {
                type: 'array',
                items: {
                  type: 'string',
                  format: 'uri',
                },
              },
              visibility: {
                type: 'string',
                knownValues: ['draft', 'public'],
              },
              note: {
                type: 'string',
                maxLength: 3000,
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.defs#mutationAck',
          },
        },
      },
    },
  },
} as const satisfies Record<string, LexiconDoc>
export const schemas = Object.values(schemaDict) satisfies LexiconDoc[]
export const lexicons: Lexicons = new Lexicons(schemas)

export function validate<T extends { $type: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType: true,
): ValidationResult<T>
export function validate<T extends { $type?: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: false,
): ValidationResult<T>
export function validate(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: boolean,
): ValidationResult {
  return (requiredType ? is$typed : maybe$typed)(v, id, hash)
    ? lexicons.validate(`${id}#${hash}`, v)
    : {
        success: false,
        error: new ValidationError(
          `Must be an object with "${hash === 'main' ? id : `${id}#${hash}`}" $type property`,
        ),
      }
}

export const ids = {
  AppCeruliaActorGetProfileView: 'app.cerulia.actor.getProfileView',
  AppCeruliaActorUpdateProfile: 'app.cerulia.actor.updateProfile',
  AppCeruliaAuthCoreReader: 'app.cerulia.authCoreReader',
  AppCeruliaAuthCoreWriter: 'app.cerulia.authCoreWriter',
  AppCeruliaCampaignCreate: 'app.cerulia.campaign.create',
  AppCeruliaCampaignGetView: 'app.cerulia.campaign.getView',
  AppCeruliaCampaignUpdate: 'app.cerulia.campaign.update',
  AppCeruliaCharacterCreateBranch: 'app.cerulia.character.createBranch',
  AppCeruliaCharacterCreateSheet: 'app.cerulia.character.createSheet',
  AppCeruliaCharacterGetBranchView: 'app.cerulia.character.getBranchView',
  AppCeruliaCharacterGetHome: 'app.cerulia.character.getHome',
  AppCeruliaCharacterRebaseSheet: 'app.cerulia.character.rebaseSheet',
  AppCeruliaCharacterRecordAdvancement:
    'app.cerulia.character.recordAdvancement',
  AppCeruliaCharacterRecordConversion: 'app.cerulia.character.recordConversion',
  AppCeruliaCharacterRetireBranch: 'app.cerulia.character.retireBranch',
  AppCeruliaCharacterUpdateBranch: 'app.cerulia.character.updateBranch',
  AppCeruliaCharacterUpdateSheet: 'app.cerulia.character.updateSheet',
  AppCeruliaCoreCampaign: 'app.cerulia.core.campaign',
  AppCeruliaCoreCharacterAdvancement: 'app.cerulia.core.characterAdvancement',
  AppCeruliaCoreCharacterBranch: 'app.cerulia.core.characterBranch',
  AppCeruliaCoreCharacterConversion: 'app.cerulia.core.characterConversion',
  AppCeruliaCoreCharacterSheet: 'app.cerulia.core.characterSheet',
  AppCeruliaCoreCharacterSheetSchema: 'app.cerulia.core.characterSheetSchema',
  AppCeruliaCoreHouse: 'app.cerulia.core.house',
  AppCeruliaCorePlayerProfile: 'app.cerulia.core.playerProfile',
  AppCeruliaCoreRuleProfile: 'app.cerulia.core.ruleProfile',
  AppCeruliaCoreScenario: 'app.cerulia.core.scenario',
  AppCeruliaCoreSession: 'app.cerulia.core.session',
  AppCeruliaDefs: 'app.cerulia.defs',
  AppCeruliaHouseCreate: 'app.cerulia.house.create',
  AppCeruliaHouseGetView: 'app.cerulia.house.getView',
  AppCeruliaHouseUpdate: 'app.cerulia.house.update',
  AppCeruliaRuleCreateProfile: 'app.cerulia.rule.createProfile',
  AppCeruliaRuleCreateSheetSchema: 'app.cerulia.rule.createSheetSchema',
  AppCeruliaRuleGetProfile: 'app.cerulia.rule.getProfile',
  AppCeruliaRuleGetSheetSchema: 'app.cerulia.rule.getSheetSchema',
  AppCeruliaRuleListProfiles: 'app.cerulia.rule.listProfiles',
  AppCeruliaRuleListSheetSchemas: 'app.cerulia.rule.listSheetSchemas',
  AppCeruliaRuleUpdateProfile: 'app.cerulia.rule.updateProfile',
  AppCeruliaScenarioCreate: 'app.cerulia.scenario.create',
  AppCeruliaScenarioGetView: 'app.cerulia.scenario.getView',
  AppCeruliaScenarioList: 'app.cerulia.scenario.list',
  AppCeruliaScenarioUpdate: 'app.cerulia.scenario.update',
  AppCeruliaSessionCreate: 'app.cerulia.session.create',
  AppCeruliaSessionGetView: 'app.cerulia.session.getView',
  AppCeruliaSessionList: 'app.cerulia.session.list',
  AppCeruliaSessionUpdate: 'app.cerulia.session.update',
} as const
