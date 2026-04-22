import { describe, expect, test } from "bun:test";
import type { PublicAgentProvider, PublicRepoAgent } from "../agents.js";
import { AtprotoPublicRecordSource } from "./atproto.js";

const SCENARIO_COLLECTION = "app.cerulia.core.scenario";

class FakePublicRepoAgent implements PublicRepoAgent {
	constructor(
		private readonly pages: Array<{
			records: Array<{ uri: string; value: unknown }>;
			cursor?: string;
		}>,
		private readonly shouldFail = false,
	) {}

	readonly com = {
		atproto: {
			repo: {
				getRecord: async ({ repo, collection, rkey }: { repo: string; collection: string; rkey: string }) => {
					for (const page of this.pages) {
						const record = page.records.find(
							(entry) => entry.uri === scenarioUri(repo, rkey),
						);
						if (record) {
							return { data: record };
						}
					}

					throw new Error(`record not found in ${collection}/${rkey}`);
				},
				listRecords: async ({ cursor }: { cursor?: string }) => {
					if (this.shouldFail) {
						throw new Error("temporary public read failure");
					}

					if (!cursor) {
						return { data: this.pages[0] ?? { records: [] } };
					}

					const index = Number.parseInt(cursor, 10);
					return { data: this.pages[index] ?? { records: [] } };
				},
			},
		},
	};
}

function scenarioUri(repoDid: string, rkey: string): string {
	return `at://${repoDid}/${SCENARIO_COLLECTION}/${rkey}`;
}

describe("AtprotoPublicRecordSource", () => {
	test("aggregates records across known repos and remembers successful repos", async () => {
		const remembered: string[] = [];
		const agents = new Map<string, PublicRepoAgent>([
			[
				"did:plc:alice",
				new FakePublicRepoAgent([
					{
						records: [
							{
								uri: scenarioUri("did:plc:alice", "alpha"),
								value: {
									title: "Alpha",
									createdAt: "2026-04-22T00:00:00.000Z",
									updatedAt: "2026-04-22T00:00:00.000Z",
								},
							},
						],
					},
				]),
			],
			[
				"did:plc:bob",
				new FakePublicRepoAgent([
					{
						records: [
							{
								uri: scenarioUri("did:plc:bob", "beta"),
								value: {
									title: "Beta",
									createdAt: "2026-04-22T00:00:01.000Z",
									updatedAt: "2026-04-22T00:00:01.000Z",
								},
							},
						],
					},
				]),
			],
		]);

		const provider: PublicAgentProvider = {
			async listRepoDids() {
				return ["did:plc:alice", "did:plc:bob"];
			},
			async getPublicAgent(repoDid: string) {
				return agents.get(repoDid) ?? null;
			},
			async rememberRepoDid(repoDid: string) {
				remembered.push(repoDid);
			},
		};

		const source = new AtprotoPublicRecordSource(provider);
		const records = await source.listRecords(SCENARIO_COLLECTION);

		expect(records).toHaveLength(2);
		expect(records.map((record) => record.uri)).toEqual([
			scenarioUri("did:plc:bob", "beta"),
			scenarioUri("did:plc:alice", "alpha"),
		]);
		expect(remembered.sort()).toEqual(["did:plc:alice", "did:plc:bob"]);
	});

	test("fails aggregate discovery when one repo cannot be loaded", async () => {
		const provider: PublicAgentProvider = {
			async listRepoDids() {
				return ["did:plc:alice", "did:plc:bob"];
			},
			async getPublicAgent(repoDid: string) {
				if (repoDid === "did:plc:bob") {
					return new FakePublicRepoAgent([], true);
				}

				return new FakePublicRepoAgent([
					{
						records: [
							{
								uri: scenarioUri("did:plc:alice", "alpha"),
								value: {
									title: "Alpha",
									createdAt: "2026-04-22T00:00:00.000Z",
									updatedAt: "2026-04-22T00:00:00.000Z",
								},
							},
						],
					},
				]);
			},
			async rememberRepoDid() {},
		};

		const source = new AtprotoPublicRecordSource(provider);
		await expect(source.listRecords(SCENARIO_COLLECTION)).rejects.toThrow(
			"failed to load one or more repos",
		);
	});

	test("fails repo-scoped reads when the public agent cannot be resolved", async () => {
		const provider: PublicAgentProvider = {
			async listRepoDids() {
				return ["did:plc:alice"];
			},
			async getPublicAgent() {
				return null;
			},
			async rememberRepoDid() {},
		};

		const source = new AtprotoPublicRecordSource(provider);
		await expect(
			source.listRecords(SCENARIO_COLLECTION, "did:plc:alice"),
		).rejects.toThrow("failed to load repo did:plc:alice");
	});

	test("rejects repo-scoped reads whose AT URI authority does not match the request", async () => {
		const provider: PublicAgentProvider = {
			async listRepoDids() {
				return ["did:plc:alice"];
			},
			async getPublicAgent() {
				return new FakePublicRepoAgent([
					{
						records: [
							{
								uri: scenarioUri("did:plc:bob", "beta"),
								value: {
									title: "Crossed Authority",
									createdAt: "2026-04-22T00:00:01.000Z",
									updatedAt: "2026-04-22T00:00:01.000Z",
								},
							},
						],
					},
				]);
			},
			async rememberRepoDid() {},
		};

		const source = new AtprotoPublicRecordSource(provider);
		await expect(
			source.listRecords(SCENARIO_COLLECTION, "did:plc:alice"),
		).rejects.toThrow("Unexpected repoDid in AT URI");
	});

	test("rejects exact record reads whose returned rkey does not match the request", async () => {
		const provider: PublicAgentProvider = {
			async listRepoDids() {
				return ["did:plc:alice"];
			},
			async getPublicAgent() {
				return {
					com: {
						atproto: {
							repo: {
								getRecord: async () => ({
									data: {
										uri: scenarioUri("did:plc:alice", "wrong-rkey"),
										value: {
											title: "Wrong Rkey",
											createdAt: "2026-04-22T00:00:00.000Z",
											updatedAt: "2026-04-22T00:00:00.000Z",
										},
									},
								}),
								listRecords: async () => ({ data: { records: [] } }),
							},
						},
					},
				} satisfies PublicRepoAgent;
			},
			async rememberRepoDid() {},
		};

		const source = new AtprotoPublicRecordSource(provider);
		await expect(
			source.getRecord(scenarioUri("did:plc:alice", "expected-rkey")),
		).rejects.toThrow("Unexpected rkey in AT URI");
	});
});