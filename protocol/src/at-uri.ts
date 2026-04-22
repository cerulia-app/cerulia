const DID_PATTERN = /^did:[a-z](?:[a-z0-9]*):[A-Za-z0-9._:%-]+$/;
const NSID_PATTERN =
	/^[a-z](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[a-z](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;
const RKEY_PATTERN = /^[A-Za-z0-9._:~-]+$/;

export class AtUriParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AtUriParseError";
	}
}

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
		throw new AtUriParseError("AT URI must start with at://");
	}

	const parts = uri.slice(5).split("/");
	if (parts.length !== 3) {
		throw new AtUriParseError("AT URI must have exactly 3 segments");
	}

	const [repoDid, collection, rkey] = parts;
	if (!repoDid || !collection || !rkey) {
		throw new AtUriParseError("Invalid AT URI shape");
	}

	if (!DID_PATTERN.test(repoDid)) {
		throw new AtUriParseError("AT URI repo DID is invalid");
	}

	if (!NSID_PATTERN.test(collection)) {
		throw new AtUriParseError("AT URI collection NSID is invalid");
	}

	if (!RKEY_PATTERN.test(rkey)) {
		throw new AtUriParseError("AT URI rkey is invalid");
	}
	if (rkey === "." || rkey === "..") {
		throw new AtUriParseError("AT URI rkey is invalid");
	}

	return {
		repoDid,
		collection,
		rkey,
	};
}