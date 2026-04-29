import { describe, expect, test } from "bun:test";
import { createDidResolverWithFetch, DohHandleResolver } from "./identity.js";

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

describe("createDidResolverWithFetch", () => {
	test("uses the provided fetch implementation for did:web resolution", async () => {
		const didResolver = createDidResolverWithFetch({
			fetch: async (input) => {
				const url = new URL(
					input instanceof URL
						? input
						: typeof input === "string"
							? input
							: input.url,
				);
				expect(url.toString()).toBe("https://example.com/.well-known/did.json");
				return new Response(JSON.stringify(didWebDoc), {
					status: 200,
					headers: { "content-type": "application/json" },
				});
			},
			timeoutMs: 50,
		});

		const resolvedDidDoc = await didResolver.resolve("did:web:example.com");
		expect(resolvedDidDoc).toEqual(didWebDoc);
	});
});

describe("DohHandleResolver", () => {
	test("returns a DID from the DoH TXT response", async () => {
		const resolver = new DohHandleResolver({
			dohEndpoint: "https://dns.example.test/dns-query",
			fetch: async (input) => {
				const url = new URL(
					input instanceof URL
						? input
						: typeof input === "string"
							? input
							: input.url,
				);

				if (url.hostname === "dns.example.test") {
					return new Response(
						JSON.stringify({
							Status: 0,
							Answer: [{ data: '"did=did:plc:resolvertest"' }],
						}),
						{
							status: 200,
							headers: { "content-type": "application/json" },
						},
					);
				}

				return new Response("", { status: 404 });
			},
		});

		await expect(resolver.resolve("resolver.example.test")).resolves.toBe(
			"did:plc:resolvertest",
		);
	});
});