import { ApiError } from "./errors.js";

const DID_PATTERN = /^did:[a-z0-9]+:[A-Za-z0-9._:%-]+$/;
const NSID_PATTERN =
	/^[a-z](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[a-z](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;
const RKEY_PATTERN = /^[A-Za-z0-9._:-]+$/;

export interface ParsedAtUri {
	repoDid: string;
	collection: string;
	rkey: string;
}

export function buildAtUri(
	repoDid: string,
	collection: string,
	rkey: string,
): string {
	return `at://${repoDid}/${collection}/${rkey}`;
}

export function parseAtUri(uri: string): ParsedAtUri {
	if (!uri.startsWith("at://")) {
		throw new ApiError("InvalidRequest", "AT URI must start with at://", 400);
	}

	const parts = uri.slice(5).split("/");
	if (parts.length !== 3) {
		throw new ApiError(
			"InvalidRequest",
			"AT URI must have exactly 3 segments",
			400,
		);
	}

	const [repoDid, collection, rkey] = parts;

	if (!repoDid || !collection || !rkey) {
		throw new ApiError("InvalidRequest", "Invalid AT URI shape", 400);
	}

	if (!DID_PATTERN.test(repoDid)) {
		throw new ApiError("InvalidRequest", "AT URI repo DID is invalid", 400);
	}

	if (!NSID_PATTERN.test(collection)) {
		throw new ApiError(
			"InvalidRequest",
			"AT URI collection NSID is invalid",
			400,
		);
	}

	if (!RKEY_PATTERN.test(rkey)) {
		throw new ApiError("InvalidRequest", "AT URI rkey is invalid", 400);
	}

	return {
		repoDid,
		collection,
		rkey,
	};
}
