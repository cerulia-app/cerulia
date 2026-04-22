import { describe, expect, test } from "bun:test";
import { assertSafePublicServiceUrl, createPublicAgentProvider } from "./agents.js";

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

describe("assertSafePublicServiceUrl", () => {
	test("rejects loopback and private hosts", () => {
		expect(() => assertSafePublicServiceUrl("https://127.0.0.1"))
			.toThrow("PDS endpoint must not target a private or loopback host");
		expect(() => assertSafePublicServiceUrl("https://[::1]"))
			.toThrow("PDS endpoint must not target a private or loopback host");
		expect(() => assertSafePublicServiceUrl("https://10.0.0.5"))
			.toThrow("PDS endpoint must not target a private or loopback host");
		expect(() => assertSafePublicServiceUrl("https://localhost"))
			.toThrow("PDS endpoint must not target a private or loopback host");
		expect(() => assertSafePublicServiceUrl("https://[fc00::1]"))
			.toThrow("PDS endpoint must not target a private or loopback host");
	});

	test("requires https public endpoints", () => {
		expect(() => assertSafePublicServiceUrl("http://pds.example.com"))
			.toThrow("PDS endpoint must use https");
		expect(assertSafePublicServiceUrl("https://pds.example.com").toString())
			.toBe("https://pds.example.com/");
	});

	test("accepts hostname-based public PDS endpoints for non-PLC dids", async () => {
		const provider = createPublicAgentProvider({
			knownRepoCatalog: {
				listRepoDids: async () => [],
				rememberRepoDid: async () => {},
			},
			resolveDidDoc: async (repoDid) =>
				repoDid === "did:web:example.com" ? didWebDoc : null,
		});

		const agent = await provider.getPublicAgent("did:web:example.com");
		expect(agent).not.toBeNull();
	});
});