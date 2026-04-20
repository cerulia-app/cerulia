export const XRPC_PREFIX = '/xrpc'

export const AUTH_SCOPES = {
  reader: 'app.cerulia.authCoreReader',
  writer: 'app.cerulia.authCoreWriter',
} as const

export const COLLECTIONS = {
  characterSheet: 'app.cerulia.core.characterSheet',
  characterBranch: 'app.cerulia.core.characterBranch',
  characterAdvancement: 'app.cerulia.core.characterAdvancement',
  characterConversion: 'app.cerulia.core.characterConversion',
  playerProfile: 'app.cerulia.core.playerProfile',
  session: 'app.cerulia.core.session',
  campaign: 'app.cerulia.core.campaign',
  house: 'app.cerulia.core.house',
  scenario: 'app.cerulia.core.scenario',
  ruleProfile: 'app.cerulia.core.ruleProfile',
  characterSheetSchema: 'app.cerulia.core.characterSheetSchema',
  blueskyProfile: 'app.bsky.actor.profile',
} as const

export const SELF_RKEY = 'self'
export const DEFAULT_LIMIT = 50
export const MAX_LIMIT = 100

export type CoreCollection =
  (typeof COLLECTIONS)[Exclude<keyof typeof COLLECTIONS, 'blueskyProfile'>]