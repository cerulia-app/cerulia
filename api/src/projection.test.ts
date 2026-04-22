import { describe, expect, test } from "bun:test";
import {
	createProjectionIngestFeature,
	type ProjectionKnownRepoCatalog,
} from "./projection.js";

function createMemoryKnownRepoCatalog(seed: string[] = []): ProjectionKnownRepoCatalog {
	const repoDids = new Set(seed);

	return {
		async rememberRepoDid(repoDid: string) {
			repoDids.add(repoDid);
		},
		async listRepoDids() {
			return [...repoDids].sort((left, right) => left.localeCompare(right));
		},
	};
}

describe("createProjectionIngestFeature", () => {
	test("remembers repoDid before a failed ingest attempt", async () => {
		const knownRepoCatalog = createMemoryKnownRepoCatalog();
		const feature = createProjectionIngestFeature({
			baseUrl: "http://localhost:8788",
			knownRepoCatalog,
			token: "projection-test-token",
			fetchImpl: async () => {
				throw new Error("projection unavailable");
			},
			timeoutMs: 50,
		});

		await expect(feature.noteRepoDid("did:plc:alice")).rejects.toThrow(
			"projection unavailable",
		);
		expect(await knownRepoCatalog.listRepoDids()).toEqual(["did:plc:alice"]);
	});

	test("replays every remembered repoDid through the ingest endpoint", async () => {
		const knownRepoCatalog = createMemoryKnownRepoCatalog([
			"did:plc:bob",
			"did:plc:alice",
		]);
		const notifiedRepoDids: string[] = [];
		const feature = createProjectionIngestFeature({
			baseUrl: "http://localhost:8788",
			knownRepoCatalog,
			token: "projection-test-token",
			fetchImpl: async (_input, init) => {
				const body = JSON.parse(String(init?.body ?? "{}")) as {
					repoDid?: string;
				};
				notifiedRepoDids.push(body.repoDid ?? "");
				return new Response(null, { status: 200 });
			},
			timeoutMs: 50,
		});

		await feature.replayKnownRepoDids();

		expect(notifiedRepoDids).toEqual(["did:plc:alice", "did:plc:bob"]);
	});
});