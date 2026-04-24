import { SqlRecordStore, type SqlDriver } from "./sql.js";
import {
	RecordConflictError,
	scopeStateTokenEquals,
	type ApplyWritesOptions,
	type AtomicRecordStore,
	type RecordWrite,
} from "./types.js";

export class AtomicSqlRecordStore
	extends SqlRecordStore
	implements AtomicRecordStore
{
	constructor(driver: SqlDriver) {
		super(driver);
	}

	async applyWrites(
		writes: RecordWrite[],
		options: ApplyWritesOptions,
	): Promise<void> {
		const collections = [...new Set(writes.map((write) => write.draft.collection))];
		const currentScopeState = await super.getScopeStateToken(
			options.expectedScopeState.repoDid,
			collections,
		);
		if (!scopeStateTokenEquals(currentScopeState, options.expectedScopeState)) {
			throw new RecordConflictError();
		}

		for (const write of writes) {
			if (write.kind === "create") {
				await super.createRecord(write.draft);
				continue;
			}

			await super.updateRecord(write.draft);
		}
	}
}