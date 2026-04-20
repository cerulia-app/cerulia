import { createOpaqueId, createTidLikeId } from '../ids.js'
import type { RecordStore } from '../store/types.js'

export interface ServiceRuntime {
  store: RecordStore
  now: () => string
  nextTid: () => string
  nextOpaque: () => string
}

export function createServiceRuntime(store: RecordStore): ServiceRuntime {
  return {
    store,
    now: () => new Date().toISOString(),
    nextTid: () => createTidLikeId(),
    nextOpaque: () => createOpaqueId(),
  }
}