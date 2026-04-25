import { describe, expect, test } from "bun:test";
import { BlobRef } from "@atproto/lexicon";
import { CID } from "multiformats/cid";
import { create as createDigest } from "multiformats/hashes/digest";
import { COLLECTIONS } from "./constants.js";
import { synthesizeRecordCid } from "./record-cid.js";

const DID = "did:plc:alice";

function createTestCid() {
	const cidClass = CID as unknown as {
		createV1(code: number, digest: unknown): CID;
	};
	return cidClass.createV1(0x55, createDigest(0x12, new Uint8Array(32).fill(7)));
}

describe("synthesizeRecordCid", () => {
	test("normalizes blob instances and wire-json blobs to the same CID", () => {
		const blob = new BlobRef(createTestCid(), "image/png", 128);
		const baseSheet = {
			$type: COLLECTIONS.characterSheet,
			ownerDid: DID,
			rulesetNsid: "app.cerulia.rules.coc7",
			displayName: "Pinned Portrait Character",
			version: 1,
			createdAt: "2026-04-21T00:00:00.000Z",
			updatedAt: "2026-04-21T00:00:00.000Z",
		};

		expect(
			synthesizeRecordCid({
				...baseSheet,
				portraitBlob: blob,
			}),
		).toBe(
			synthesizeRecordCid({
				...baseSheet,
				portraitBlob: blob.toJSON(),
			}),
		);
	});
});