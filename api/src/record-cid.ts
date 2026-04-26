import { jsonToIpld } from "@atproto/common-web";
import { lexToJson } from "@atproto/lexicon";
import { encode, code as dagCborCode } from "@ipld/dag-cbor";
import { createHash } from "node:crypto";
import { CID } from "multiformats/cid";
import { create as createDigest } from "multiformats/hashes/digest";

function createCidFromBytes(bytes: Uint8Array): string {
	const digest = createHash("sha256").update(bytes).digest();
	const cidClass = CID as unknown as {
		createV1(code: number, digest: unknown): { toString(): string };
	};
	return cidClass
		.createV1(dagCborCode, createDigest(0x12, new Uint8Array(digest)))
		.toString();
}

export function synthesizeRecordCid(value: unknown): string {
	const jsonValue = lexToJson(value as never);
	const bytes = encode(jsonToIpld(jsonValue));
	return createCidFromBytes(bytes);
}
