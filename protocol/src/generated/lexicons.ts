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
  AppCeruliaDevActorGetProfileView: {
    lexicon: 1,
    id: 'app.cerulia.dev.actor.getProfileView',
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
                ref: 'lex:app.cerulia.dev.core.playerProfile',
                description:
                  'Full player profile record. Present in owner mode only.',
              },
              blueskyFallbackProfile: {
                type: 'ref',
                ref: 'lex:app.cerulia.dev.actor.getProfileView#fallbackProfile',
                description:
                  'Bluesky fallback profile fields for owner-side comparison. Present in owner mode only.',
              },
              profileSummary: {
                type: 'ref',
                ref: 'lex:app.cerulia.dev.actor.getProfileView#profileSummary',
                description:
                  'Composed public-safe profile summary. Present in public/anonymous mode only.',
              },
              publicBranches: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.dev.actor.getProfileView#branchLink',
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
          pronouns: {
            type: 'string',
            maxLength: 100,
          },
        },
      },
    },
  },
  AppCeruliaDevActorUpdateProfile: {
    lexicon: 1,
    id: 'app.cerulia.dev.actor.updateProfile',
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
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaDevAuthCoreReader: {
    lexicon: 1,
    id: 'app.cerulia.dev.authCoreReader',
    defs: {
      main: {
        type: 'token',
        description:
          'OAuth scope bundle granting authenticated read access to core projections for the owner.',
      },
    },
  },
  AppCeruliaDevAuthCoreWriter: {
    lexicon: 1,
    id: 'app.cerulia.dev.authCoreWriter',
    defs: {
      main: {
        type: 'token',
        description:
          'OAuth scope bundle granting write access to all core records.',
      },
    },
  },
  AppCeruliaDevCampaignCreate: {
    lexicon: 1,
    id: 'app.cerulia.dev.campaign.create',
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
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaDevCampaignGetView: {
    lexicon: 1,
    id: 'app.cerulia.dev.campaign.getView',
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
                ref: 'lex:app.cerulia.dev.core.campaign',
                description:
                  'Full campaign record. Present in owner mode only.',
              },
              sessions: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.dev.campaign.getView#sessionListItem',
                },
                description: 'Session list items. Present in owner mode only.',
              },
              ruleOverlay: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.dev.core.ruleProfile',
                },
                description:
                  'Full rule profile records. Present in owner mode only.',
              },
              campaignSummary: {
                type: 'ref',
                ref: 'lex:app.cerulia.dev.campaign.getView#campaignSummary',
                description:
                  'Public-safe campaign summary. Present in public/anonymous mode only.',
              },
              sessionSummaries: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.dev.campaign.getView#sessionSummary',
                },
                description:
                  'Public-safe session summaries. Present in public/anonymous mode only.',
              },
              ruleOverlaySummary: {
                type: 'ref',
                ref: 'lex:app.cerulia.dev.campaign.getView#ruleOverlaySummary',
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
              ref: 'lex:app.cerulia.dev.campaign.getView#ruleProfileLink',
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
  AppCeruliaDevCampaignUpdate: {
    lexicon: 1,
    id: 'app.cerulia.dev.campaign.update',
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
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaDevCharacterCreateBranch: {
    lexicon: 1,
    id: 'app.cerulia.dev.character.createBranch',
    defs: {
      main: {
        type: 'procedure',
        description: 'Create character branch.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['sourceBranchRef', 'branchKind', 'branchLabel'],
            properties: {
              sourceBranchRef: {
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
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaDevCharacterCreateSheet: {
    lexicon: 1,
    id: 'app.cerulia.dev.character.createSheet',
    defs: {
      main: {
        type: 'procedure',
        description: 'Create character sheet.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['rulesetNsid', 'sheetSchemaPin', 'displayName', 'stats'],
            properties: {
              rulesetNsid: {
                type: 'string',
                format: 'nsid',
              },
              sheetSchemaPin: {
                type: 'ref',
                ref: 'lex:app.cerulia.dev.defs#exactRecordPin',
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
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaDevCharacterGetBranchView: {
    lexicon: 1,
    id: 'app.cerulia.dev.character.getBranchView',
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
                ref: 'lex:app.cerulia.dev.core.characterBranch',
                description: 'Full branch record. Present in owner mode only.',
              },
              sheet: {
                type: 'ref',
                ref: 'lex:app.cerulia.dev.core.characterSheet',
                description: 'Full sheet record. Present in owner mode only.',
              },
              advancements: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.dev.core.characterAdvancement',
                },
                description:
                  'Full advancement records. Present in owner mode only.',
              },
              conversions: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.dev.core.characterConversion',
                },
                description:
                  'Full conversion records. Present in owner mode only.',
              },
              recentSessions: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.dev.character.getBranchView#sessionListItem',
                },
                description: 'Session list items. Present in owner mode only.',
              },
              branchSummary: {
                type: 'ref',
                ref: 'lex:app.cerulia.dev.character.getBranchView#branchSummary',
                description:
                  'Public-safe branch summary. Present in public/anonymous mode only.',
              },
              sheetSummary: {
                type: 'ref',
                ref: 'lex:app.cerulia.dev.character.getBranchView#sheetSummary',
                description:
                  'Public-safe sheet summary. Present in public/anonymous mode only.',
              },
              recentSessionSummaries: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.dev.character.getBranchView#sessionSummary',
                },
                description:
                  'Public-safe session summaries. Present in public/anonymous mode only.',
              },
              advancementSummaries: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.dev.character.getBranchView#advancementSummary',
                },
                description:
                  'Public-safe advancement summaries. Present in public/anonymous mode only.',
              },
              conversionSummaries: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.dev.character.getBranchView#conversionSummary',
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
          'Public-safe branch display fields. Excludes owner-only linkage.',
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
              ref: 'lex:app.cerulia.dev.character.getBranchView#statEntry',
            },
            description:
              'Schema-backed public stats only. Omitted when sheetSchemaPin is absent.',
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
            ref: 'lex:app.cerulia.dev.character.getBranchView#advancementSessionSummary',
          },
        },
      },
      conversionSummary: {
        type: 'object',
        description:
          'Public-safe conversion provenance. Excludes version pins.',
        required: ['sourceRulesetNsid', 'targetRulesetNsid', 'convertedAt'],
        properties: {
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
            ref: 'lex:app.cerulia.dev.character.getBranchView#statValue',
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
  AppCeruliaDevCharacterGetHome: {
    lexicon: 1,
    id: 'app.cerulia.dev.character.getHome',
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
                  ref: 'lex:app.cerulia.dev.character.getHome#branchListItem',
                },
              },
              recentSessions: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.dev.character.getHome#sessionListItem',
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
          'sheetRef',
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
          sheetRef: {
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
  AppCeruliaDevCharacterRebaseSheet: {
    lexicon: 1,
    id: 'app.cerulia.dev.character.rebaseSheet',
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
              'targetSheetSchemaPin',
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
              targetSheetSchemaPin: {
                type: 'ref',
                ref: 'lex:app.cerulia.dev.defs#exactRecordPin',
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
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaDevCharacterRecordAdvancement: {
    lexicon: 1,
    id: 'app.cerulia.dev.character.recordAdvancement',
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
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaDevCharacterRecordConversion: {
    lexicon: 1,
    id: 'app.cerulia.dev.character.recordConversion',
    defs: {
      main: {
        type: 'procedure',
        description: 'Record character conversion.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: [
              'characterBranchRef',
              'expectedRevision',
              'targetRulesetNsid',
              'targetSheetSchemaPin',
              'convertedAt',
            ],
            properties: {
              characterBranchRef: {
                type: 'string',
                format: 'at-uri',
              },
              expectedRevision: {
                type: 'integer',
                minimum: 1,
              },
              targetRulesetNsid: {
                type: 'string',
                format: 'nsid',
              },
              targetSheetSchemaPin: {
                type: 'ref',
                ref: 'lex:app.cerulia.dev.defs#exactRecordPin',
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
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaDevCharacterRetireBranch: {
    lexicon: 1,
    id: 'app.cerulia.dev.character.retireBranch',
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
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaDevCharacterUpdateBranch: {
    lexicon: 1,
    id: 'app.cerulia.dev.character.updateBranch',
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
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaDevCharacterUpdateSheet: {
    lexicon: 1,
    id: 'app.cerulia.dev.character.updateSheet',
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
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaDevCoreCampaign: {
    lexicon: 1,
    id: 'app.cerulia.dev.core.campaign',
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
  AppCeruliaDevCoreCharacterAdvancement: {
    lexicon: 1,
    id: 'app.cerulia.dev.core.characterAdvancement',
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
              ref: 'lex:app.cerulia.dev.core.characterAdvancement#deltaPayload',
            },
            sessionRef: {
              type: 'string',
              format: 'at-uri',
            },
            previousValues: {
              type: 'ref',
              ref: 'lex:app.cerulia.dev.core.characterAdvancement#previousValues',
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
  AppCeruliaDevCoreCharacterBranch: {
    lexicon: 1,
    id: 'app.cerulia.dev.core.characterBranch',
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
            sheetRef: {
              type: 'string',
              format: 'at-uri',
            },
            forkedFromBranchRef: {
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
            'sheetRef',
            'branchKind',
            'branchLabel',
            'visibility',
            'revision',
            'createdAt',
            'updatedAt',
          ],
        },
      },
    },
  },
  AppCeruliaDevCoreCharacterConversion: {
    lexicon: 1,
    id: 'app.cerulia.dev.core.characterConversion',
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
            sourceSheetPin: {
              type: 'ref',
              ref: 'lex:app.cerulia.dev.defs#exactRecordPin',
            },
            sourceRulesetNsid: {
              type: 'string',
              format: 'nsid',
            },
            targetSheetPin: {
              type: 'ref',
              ref: 'lex:app.cerulia.dev.defs#exactRecordPin',
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
            'characterBranchRef',
            'sourceSheetPin',
            'sourceRulesetNsid',
            'targetSheetPin',
            'targetRulesetNsid',
            'convertedAt',
          ],
        },
      },
    },
  },
  AppCeruliaDevCoreCharacterSheet: {
    lexicon: 1,
    id: 'app.cerulia.dev.core.characterSheet',
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
            sheetSchemaPin: {
              type: 'ref',
              ref: 'lex:app.cerulia.dev.defs#exactRecordPin',
              description:
                'Exact pin to the character-sheet-schema this sheet conforms to. Required for active records; schema-less is legacy/import/recovery only.',
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
                'Structured stats payload conforming to fieldDefs when sheetSchemaPin is present; free-form JSON for legacy/import/recovery otherwise.',
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
  AppCeruliaDevCoreCharacterSheetSchema: {
    lexicon: 1,
    id: 'app.cerulia.dev.core.characterSheetSchema',
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
                ref: 'lex:app.cerulia.dev.core.characterSheetSchema#fieldDefRoot',
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
            ref: 'lex:app.cerulia.dev.core.characterSheetSchema#valueRange',
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
              ref: 'lex:app.cerulia.dev.core.characterSheetSchema#fieldDefNode',
            },
          },
          itemDef: {
            type: 'ref',
            ref: 'lex:app.cerulia.dev.core.characterSheetSchema#fieldDefNode',
          },
          valueRange: {
            type: 'ref',
            ref: 'lex:app.cerulia.dev.core.characterSheetSchema#valueRange',
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
            ref: 'lex:app.cerulia.dev.core.characterSheetSchema#fieldDefAdditional',
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
              ref: 'lex:app.cerulia.dev.core.characterSheetSchema#fieldDefNode',
            },
          },
          itemDef: {
            type: 'ref',
            ref: 'lex:app.cerulia.dev.core.characterSheetSchema#fieldDefNode',
          },
          valueRange: {
            type: 'ref',
            ref: 'lex:app.cerulia.dev.core.characterSheetSchema#valueRange',
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
            ref: 'lex:app.cerulia.dev.core.characterSheetSchema#fieldDefAdditional',
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
              ref: 'lex:app.cerulia.dev.core.characterSheetSchema#fieldDefNode',
            },
          },
          itemDef: {
            type: 'ref',
            ref: 'lex:app.cerulia.dev.core.characterSheetSchema#fieldDefNode',
          },
          valueRange: {
            type: 'ref',
            ref: 'lex:app.cerulia.dev.core.characterSheetSchema#valueRange',
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
  AppCeruliaDevCoreHouse: {
    lexicon: 1,
    id: 'app.cerulia.dev.core.house',
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
  AppCeruliaDevCorePlayerProfile: {
    lexicon: 1,
    id: 'app.cerulia.dev.core.playerProfile',
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
  AppCeruliaDevCoreRuleProfile: {
    lexicon: 1,
    id: 'app.cerulia.dev.core.ruleProfile',
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
  AppCeruliaDevCoreScenario: {
    lexicon: 1,
    id: 'app.cerulia.dev.core.scenario',
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
            recommendedSheetSchemaPin: {
              type: 'ref',
              ref: 'lex:app.cerulia.dev.defs#exactRecordPin',
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
  AppCeruliaDevCoreSession: {
    lexicon: 1,
    id: 'app.cerulia.dev.core.session',
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
  AppCeruliaDevDefs: {
    lexicon: 1,
    id: 'app.cerulia.dev.defs',
    defs: {
      exactRecordPin: {
        type: 'object',
        description:
          'Exact-version pin for a record. The uri identifies the durable record path and cid identifies the exact record content.',
        required: ['uri', 'cid'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
        },
      },
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
              'repair-needed',
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
  AppCeruliaDevHouseCreate: {
    lexicon: 1,
    id: 'app.cerulia.dev.house.create',
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
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaDevHouseGetView: {
    lexicon: 1,
    id: 'app.cerulia.dev.house.getView',
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
                ref: 'lex:app.cerulia.dev.core.house',
                description: 'Full house record. Present in owner mode only.',
              },
              campaigns: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.dev.house.getView#campaignListItem',
                },
                description: 'Campaign list items. Present in owner mode only.',
              },
              sessions: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.dev.house.getView#sessionListItem',
                },
                description: 'Session list items. Present in owner mode only.',
              },
              houseSummary: {
                type: 'ref',
                ref: 'lex:app.cerulia.dev.house.getView#houseSummary',
                description:
                  'Public-safe house summary. Present in public/anonymous mode only.',
              },
              campaignSummaries: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.dev.house.getView#campaignSummary',
                },
                description:
                  'Public-safe campaign summaries. Present in public/anonymous mode only.',
              },
              sessionSummaries: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:app.cerulia.dev.house.getView#sessionSummary',
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
  AppCeruliaDevHouseUpdate: {
    lexicon: 1,
    id: 'app.cerulia.dev.house.update',
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
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaDevRuleCreateProfile: {
    lexicon: 1,
    id: 'app.cerulia.dev.rule.createProfile',
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
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaDevRuleCreateSheetSchema: {
    lexicon: 1,
    id: 'app.cerulia.dev.rule.createSheetSchema',
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
                  ref: 'lex:app.cerulia.dev.core.characterSheetSchema#fieldDefRoot',
                },
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'ref',
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaDevRuleGetProfile: {
    lexicon: 1,
    id: 'app.cerulia.dev.rule.getProfile',
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
                ref: 'lex:app.cerulia.dev.core.ruleProfile',
              },
            },
          },
        },
      },
    },
  },
  AppCeruliaDevRuleGetSheetSchema: {
    lexicon: 1,
    id: 'app.cerulia.dev.rule.getSheetSchema',
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
                ref: 'lex:app.cerulia.dev.core.characterSheetSchema',
              },
            },
          },
        },
      },
    },
  },
  AppCeruliaDevRuleListProfiles: {
    lexicon: 1,
    id: 'app.cerulia.dev.rule.listProfiles',
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
                  ref: 'lex:app.cerulia.dev.rule.listProfiles#ruleProfileListItem',
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
  AppCeruliaDevRuleListSheetSchemas: {
    lexicon: 1,
    id: 'app.cerulia.dev.rule.listSheetSchemas',
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
                  ref: 'lex:app.cerulia.dev.rule.listSheetSchemas#sheetSchemaListItem',
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
        required: ['schemaPin', 'baseRulesetNsid', 'schemaVersion', 'title'],
        properties: {
          schemaPin: {
            type: 'ref',
            ref: 'lex:app.cerulia.dev.defs#exactRecordPin',
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
  AppCeruliaDevRuleUpdateProfile: {
    lexicon: 1,
    id: 'app.cerulia.dev.rule.updateProfile',
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
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaDevScenarioCreate: {
    lexicon: 1,
    id: 'app.cerulia.dev.scenario.create',
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
              recommendedSheetSchemaPin: {
                type: 'ref',
                ref: 'lex:app.cerulia.dev.defs#exactRecordPin',
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
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaDevScenarioGetView: {
    lexicon: 1,
    id: 'app.cerulia.dev.scenario.getView',
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
                ref: 'lex:app.cerulia.dev.core.scenario',
                description:
                  'Full scenario record. Present in owner mode only.',
              },
              scenarioSummary: {
                type: 'ref',
                ref: 'lex:app.cerulia.dev.scenario.getView#scenarioSummary',
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
  AppCeruliaDevScenarioList: {
    lexicon: 1,
    id: 'app.cerulia.dev.scenario.list',
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
                  ref: 'lex:app.cerulia.dev.scenario.list#scenarioListItem',
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
  AppCeruliaDevScenarioUpdate: {
    lexicon: 1,
    id: 'app.cerulia.dev.scenario.update',
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
              recommendedSheetSchemaPin: {
                type: 'ref',
                ref: 'lex:app.cerulia.dev.defs#exactRecordPin',
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
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaDevSessionCreate: {
    lexicon: 1,
    id: 'app.cerulia.dev.session.create',
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
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
          },
        },
      },
    },
  },
  AppCeruliaDevSessionGetView: {
    lexicon: 1,
    id: 'app.cerulia.dev.session.getView',
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
                ref: 'lex:app.cerulia.dev.core.session',
                description: 'Full session record. Present in owner mode only.',
              },
              sessionSummary: {
                type: 'ref',
                ref: 'lex:app.cerulia.dev.session.getView#sessionSummary',
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
  AppCeruliaDevSessionList: {
    lexicon: 1,
    id: 'app.cerulia.dev.session.list',
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
                  ref: 'lex:app.cerulia.dev.session.list#sessionListItem',
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
  AppCeruliaDevSessionUpdate: {
    lexicon: 1,
    id: 'app.cerulia.dev.session.update',
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
            ref: 'lex:app.cerulia.dev.defs#mutationAck',
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
  AppCeruliaDevActorGetProfileView: 'app.cerulia.dev.actor.getProfileView',
  AppCeruliaDevActorUpdateProfile: 'app.cerulia.dev.actor.updateProfile',
  AppCeruliaDevAuthCoreReader: 'app.cerulia.dev.authCoreReader',
  AppCeruliaDevAuthCoreWriter: 'app.cerulia.dev.authCoreWriter',
  AppCeruliaDevCampaignCreate: 'app.cerulia.dev.campaign.create',
  AppCeruliaDevCampaignGetView: 'app.cerulia.dev.campaign.getView',
  AppCeruliaDevCampaignUpdate: 'app.cerulia.dev.campaign.update',
  AppCeruliaDevCharacterCreateBranch: 'app.cerulia.dev.character.createBranch',
  AppCeruliaDevCharacterCreateSheet: 'app.cerulia.dev.character.createSheet',
  AppCeruliaDevCharacterGetBranchView:
    'app.cerulia.dev.character.getBranchView',
  AppCeruliaDevCharacterGetHome: 'app.cerulia.dev.character.getHome',
  AppCeruliaDevCharacterRebaseSheet: 'app.cerulia.dev.character.rebaseSheet',
  AppCeruliaDevCharacterRecordAdvancement:
    'app.cerulia.dev.character.recordAdvancement',
  AppCeruliaDevCharacterRecordConversion:
    'app.cerulia.dev.character.recordConversion',
  AppCeruliaDevCharacterRetireBranch: 'app.cerulia.dev.character.retireBranch',
  AppCeruliaDevCharacterUpdateBranch: 'app.cerulia.dev.character.updateBranch',
  AppCeruliaDevCharacterUpdateSheet: 'app.cerulia.dev.character.updateSheet',
  AppCeruliaDevCoreCampaign: 'app.cerulia.dev.core.campaign',
  AppCeruliaDevCoreCharacterAdvancement:
    'app.cerulia.dev.core.characterAdvancement',
  AppCeruliaDevCoreCharacterBranch: 'app.cerulia.dev.core.characterBranch',
  AppCeruliaDevCoreCharacterConversion:
    'app.cerulia.dev.core.characterConversion',
  AppCeruliaDevCoreCharacterSheet: 'app.cerulia.dev.core.characterSheet',
  AppCeruliaDevCoreCharacterSheetSchema:
    'app.cerulia.dev.core.characterSheetSchema',
  AppCeruliaDevCoreHouse: 'app.cerulia.dev.core.house',
  AppCeruliaDevCorePlayerProfile: 'app.cerulia.dev.core.playerProfile',
  AppCeruliaDevCoreRuleProfile: 'app.cerulia.dev.core.ruleProfile',
  AppCeruliaDevCoreScenario: 'app.cerulia.dev.core.scenario',
  AppCeruliaDevCoreSession: 'app.cerulia.dev.core.session',
  AppCeruliaDevDefs: 'app.cerulia.dev.defs',
  AppCeruliaDevHouseCreate: 'app.cerulia.dev.house.create',
  AppCeruliaDevHouseGetView: 'app.cerulia.dev.house.getView',
  AppCeruliaDevHouseUpdate: 'app.cerulia.dev.house.update',
  AppCeruliaDevRuleCreateProfile: 'app.cerulia.dev.rule.createProfile',
  AppCeruliaDevRuleCreateSheetSchema: 'app.cerulia.dev.rule.createSheetSchema',
  AppCeruliaDevRuleGetProfile: 'app.cerulia.dev.rule.getProfile',
  AppCeruliaDevRuleGetSheetSchema: 'app.cerulia.dev.rule.getSheetSchema',
  AppCeruliaDevRuleListProfiles: 'app.cerulia.dev.rule.listProfiles',
  AppCeruliaDevRuleListSheetSchemas: 'app.cerulia.dev.rule.listSheetSchemas',
  AppCeruliaDevRuleUpdateProfile: 'app.cerulia.dev.rule.updateProfile',
  AppCeruliaDevScenarioCreate: 'app.cerulia.dev.scenario.create',
  AppCeruliaDevScenarioGetView: 'app.cerulia.dev.scenario.getView',
  AppCeruliaDevScenarioList: 'app.cerulia.dev.scenario.list',
  AppCeruliaDevScenarioUpdate: 'app.cerulia.dev.scenario.update',
  AppCeruliaDevSessionCreate: 'app.cerulia.dev.session.create',
  AppCeruliaDevSessionGetView: 'app.cerulia.dev.session.getView',
  AppCeruliaDevSessionList: 'app.cerulia.dev.session.list',
  AppCeruliaDevSessionUpdate: 'app.cerulia.dev.session.update',
} as const
