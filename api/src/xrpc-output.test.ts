import { describe, expect, test } from "bun:test";

import { COLLECTIONS } from "./constants.js";
import { assertValidXrpcOutputPayload } from "./xrpc-output.js";

const DID = "did:plc:alice";

describe("assertValidXrpcOutputPayload", () => {
	test("rejects owner-mode raw records that violate the embedded record contract", () => {
		expect(() =>
			assertValidXrpcOutputPayload("app.cerulia.campaign.getView", {
				campaign: {
					$type: COLLECTIONS.campaign,
					campaignId: "broken-campaign",
					title: "Broken Campaign",
					houseRef: `at://${DID}/${COLLECTIONS.house}/broken-house`,
					rulesetNsid: "not-a-valid-nsid",
					visibility: "public",
					createdAt: "2026-04-20T08:05:00.000Z",
					updatedAt: "2026-04-20T08:05:00.000Z",
				},
				sessions: [],
				ruleOverlay: [],
			}),
		).toThrow();
	});

	test("rejects owner-mode raw records when the embedded record loses $type", () => {
		expect(() =>
			assertValidXrpcOutputPayload("app.cerulia.campaign.getView", {
				campaign: {
					campaignId: "missing-type-campaign",
					title: "Missing Type Campaign",
					houseRef: `at://${DID}/${COLLECTIONS.house}/missing-type-house`,
					rulesetNsid: "app.cerulia.rules.coc7",
					visibility: "public",
					createdAt: "2026-04-20T08:05:00.000Z",
					updatedAt: "2026-04-20T08:05:00.000Z",
				},
				sessions: [],
				ruleOverlay: [],
			}),
		).toThrow();
	});

	test("rejects owner-mode raw record arrays when an embedded record loses $type", () => {
		expect(() =>
			assertValidXrpcOutputPayload("app.cerulia.campaign.getView", {
				campaign: {
					$type: COLLECTIONS.campaign,
					campaignId: "valid-campaign",
					title: "Valid Campaign",
					houseRef: `at://${DID}/${COLLECTIONS.house}/valid-house`,
					rulesetNsid: "app.cerulia.rules.coc7",
					visibility: "public",
					createdAt: "2026-04-20T08:05:00.000Z",
					updatedAt: "2026-04-20T08:05:00.000Z",
				},
				sessions: [],
				ruleOverlay: [
					{
						baseRulesetNsid: "app.cerulia.rules.coc7",
						profileTitle: "Broken Overlay",
						scopeKind: "house-shared",
						scopeRef: `at://${DID}/${COLLECTIONS.house}/valid-house`,
						rulesPatchUri: "https://example.com/rules/overlay.json",
						ownerDid: DID,
						createdAt: "2026-04-20T08:05:00.000Z",
						updatedAt: "2026-04-20T08:05:00.000Z",
					},
				],
			}),
		).toThrow();
	});

	test("rejects owner-mode outputs with unexpected top-level properties", () => {
		expect(() =>
			assertValidXrpcOutputPayload("app.cerulia.campaign.getView", {
				campaign: {
					$type: COLLECTIONS.campaign,
					campaignId: "valid-campaign",
					title: "Valid Campaign",
					houseRef: `at://${DID}/${COLLECTIONS.house}/valid-house`,
					rulesetNsid: "app.cerulia.rules.coc7",
					visibility: "public",
					createdAt: "2026-04-20T08:05:00.000Z",
					updatedAt: "2026-04-20T08:05:00.000Z",
				},
				sessions: [],
				ruleOverlay: [],
				unexpected: true,
			}),
		).toThrow("unexpected property unexpected");
	});
});