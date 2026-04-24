import { describe, expect, test } from "bun:test";
import { createPublicAgentProvider } from "./oauth.js";

const didWebDoc = {
	"@context": ["https://www.w3.org/ns/did/v1"],
	id: "did:web:example.com",
	service: [
		{
			id: "#atproto_pds",
			type: "AtprotoPersonalDataServer",
			serviceEndpoint: "https://pds.example.com",
		},
	],
};

describe("createPublicAgentProvider", () => {
	test("returns a public agent for safe did docs in worker-compatible lookup", async () => {
		const provider = createPublicAgentProvider({
			knownRepoCatalog: {
				listRepoDids: async () => [],
				rememberRepoDid: async () => {},
			},
			resolveDidDoc: async (repoDid) =>
				repoDid === "did:web:example.com" ? didWebDoc : null,
		});

		const getPublicAgent = provider.getPublicAgent;
		if (!getPublicAgent) {
			throw new Error("public agent lookup must be configured");
		}
		const agent = await getPublicAgent("did:web:example.com");
		expect(agent).not.toBeNull();
	});
});
