import { createOpaqueId, createTidLikeId } from "../ids.js";
import type { RecordStore } from "../store/types.js";

export interface ServiceRuntime {
	store: RecordStore;
	now: () => string;
	nextTid: (previousTid?: string) => string;
	nextOpaque: () => string;
}

export function createServiceRuntime(store: RecordStore): ServiceRuntime {
	return {
		store,
		now: () => new Date().toISOString(),
		nextTid: (previousTid?: string) => createTidLikeId(previousTid),
		nextOpaque: () => createOpaqueId(),
	};
}
