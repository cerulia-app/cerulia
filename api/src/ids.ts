import { TID } from "@atproto/common-web";

function randomBase36(length: number): string {
	const buffer = new Uint8Array(length);
	crypto.getRandomValues(buffer);
	return Array.from(buffer, (value) => (value % 36).toString(36)).join("");
}

export function createTidLikeId(previousTid?: string): string {
	return TID.nextStr(previousTid);
}

export function createOpaqueId(): string {
	return randomBase36(14);
}

export function slugify(input: string): string {
	const normalized = input
		.normalize("NFKD")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return normalized.length > 0 ? normalized : "item";
}
