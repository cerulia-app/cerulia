import { describe, expect, test } from "bun:test";
import { assertSafePublicServiceUrl } from "./agents.js";

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
});