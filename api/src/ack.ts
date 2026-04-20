import type { AppCeruliaDefs } from "@cerulia/protocol";

type MutationAck = AppCeruliaDefs.MutationAck;

export function accepted(
	emittedRecordRefs: string[],
	message?: string,
	correlationId?: string,
): MutationAck {
	return {
		$type: "app.cerulia.defs#mutationAck",
		resultKind: "accepted",
		emittedRecordRefs,
		message,
		correlationId,
	};
}

export function rejected(
	reasonCode: MutationAck["reasonCode"],
	message: string,
	correlationId?: string,
): MutationAck {
	return {
		$type: "app.cerulia.defs#mutationAck",
		resultKind: "rejected",
		reasonCode,
		message,
		correlationId,
	};
}

export function rebaseNeeded(
	message: string,
	correlationId?: string,
): MutationAck {
	return {
		$type: "app.cerulia.defs#mutationAck",
		resultKind: "rebase-needed",
		reasonCode: "rebase-required",
		message,
		correlationId,
	};
}
