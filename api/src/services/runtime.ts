import { createOpaqueId, createTidLikeId } from "../ids.js";
import type { AtomicRecordStore } from "../store/types.js";

export interface ServiceRuntime {
	store: AtomicRecordStore;
	now: () => string;
	nextTid: (previousTid?: string) => string;
	nextOpaque: () => string;
}

export function createServiceRuntime(store: AtomicRecordStore): ServiceRuntime {
	return {
		store,
		now: () => new Date().toISOString(),
		nextTid: (previousTid?: string) => createTidLikeId(previousTid),
		nextOpaque: () => createOpaqueId(),
	};
}
