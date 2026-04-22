import {
	AtUriParseError,
	buildAtUri as buildSharedAtUri,
	type ParsedAtUri,
	parseAtUri as parseSharedAtUri,
} from "@cerulia/protocol";
import { ApiError } from "./errors.js";

export type { ParsedAtUri };

export function buildAtUri(
	repoDid: string,
	collection: string,
	rkey: string,
): string {
	return buildSharedAtUri(repoDid, collection, rkey);
}

export function parseAtUri(uri: string): ParsedAtUri {
	try {
		return parseSharedAtUri(uri);
	} catch (error) {
		if (error instanceof AtUriParseError) {
			throw new ApiError("InvalidRequest", error.message, 400);
		}

		throw error;
	}
}
