import { describe, expect, it } from "vitest";

import {
	localizePathname,
	normalizePathname,
	resolveLocalePathname,
	selectTranslatedText,
} from "./locale";

describe("normalizePathname", () => {
	it("keeps the root pathname stable", () => {
		expect(normalizePathname("/")).toBe("/");
		expect(normalizePathname("")).toBe("/");
	});

	it("strips a trailing slash from non-root paths", () => {
		expect(normalizePathname("/en/")).toBe("/en");
		expect(normalizePathname("characters/hero/")).toBe("/characters/hero");
	});
});

describe("localizePathname", () => {
	it("keeps Japanese routes unprefixed", () => {
		expect(localizePathname("/", "ja")).toBe("/");
		expect(localizePathname("/characters", "ja")).toBe("/characters");
	});

	it("prefixes non-default locales", () => {
		expect(localizePathname("/", "en")).toBe("/en");
		expect(localizePathname("/characters", "zh")).toBe("/zh/characters");
	});
});

describe("resolveLocalePathname", () => {
	it("resolves unprefixed routes as Japanese", () => {
		expect(resolveLocalePathname("/characters")).toEqual({
			locale: "ja",
			pathLocale: null,
			contentPathname: "/characters",
			canonicalPathname: "/characters",
			shouldRedirectToCanonical: false,
		});
	});

	it("resolves explicit English routes without redirecting", () => {
		expect(resolveLocalePathname("/en/characters")).toEqual({
			locale: "en",
			pathLocale: "en",
			contentPathname: "/characters",
			canonicalPathname: "/en/characters",
			shouldRedirectToCanonical: false,
		});
	});

	it("marks explicit Japanese aliases for canonical redirect", () => {
		expect(resolveLocalePathname("/ja/characters")).toEqual({
			locale: "ja",
			pathLocale: "ja",
			contentPathname: "/characters",
			canonicalPathname: "/characters",
			shouldRedirectToCanonical: true,
		});
	});

	it("supports future Chinese routes without changing the API", () => {
		expect(resolveLocalePathname("/zh/characters")).toEqual({
			locale: "zh",
			pathLocale: "zh",
			contentPathname: "/characters",
			canonicalPathname: "/zh/characters",
			shouldRedirectToCanonical: false,
		});
	});
});

describe("selectTranslatedText", () => {
	it("falls back to Japanese when a translation is missing", () => {
		expect(selectTranslatedText({ ja: "こんにちは", en: "Hello" }, "zh")).toBe(
			"こんにちは",
		);
	});
});
