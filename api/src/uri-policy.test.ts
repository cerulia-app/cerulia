import { describe, expect, test } from "bun:test";
import { isCredentialFreeUri } from "./uri-policy.js";

describe("isCredentialFreeUri", () => {
	test("rejects token-bearing fragments in public URLs", () => {
		expect(isCredentialFreeUri("https://example.com/#access_token=secret")).toBe(
			false,
		);
		expect(isCredentialFreeUri("https://example.com/path#invite-token")).toBe(
			false,
		);
	});
});