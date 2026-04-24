import { describe, expect, test } from "bun:test";
import { AtUriParseError, parseAtUri } from "./at-uri.js";

describe("parseAtUri", () => {
	test("accepts valid any-type rkeys that include tilde", () => {
		expect(
			parseAtUri(
				"at://did:web:example.com/app.cerulia.core.scenario/alpha~beta",
			),
		).toEqual({
			repoDid: "did:web:example.com",
			collection: "app.cerulia.core.scenario",
			rkey: "alpha~beta",
		});
	});

	test("accepts current dev collections and syntax-valid uppercase name segments", () => {
		expect(
			parseAtUri(
				"at://did:web:example.com/app.cerulia.dev.core.scenario/alpha~beta",
			),
		).toEqual({
			repoDid: "did:web:example.com",
			collection: "app.cerulia.dev.core.scenario",
			rkey: "alpha~beta",
		});

		expect(
			parseAtUri("at://did:web:example.com/com.example.Foo/alpha~beta"),
		).toEqual({
			repoDid: "did:web:example.com",
			collection: "com.example.Foo",
			rkey: "alpha~beta",
		});
	});

	test("rejects invalid did methods and reserved dot rkeys", () => {
		expect(() =>
			parseAtUri("at://did:1bad:example/app.cerulia.core.scenario/alpha"),
		).toThrow(AtUriParseError);
		expect(() =>
			parseAtUri("at://did:web:example.com/app.cerulia.core.scenario/Alpha"),
		).toThrow(AtUriParseError);
		expect(() =>
			parseAtUri("at://did:web:example.com/app.cerulia.core.scenario/."),
		).toThrow(AtUriParseError);
		expect(() =>
			parseAtUri("at://did:web:example.com/app.cerulia.core.scenario/.."),
		).toThrow(AtUriParseError);
	});
});
