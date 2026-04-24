import { describe, expect, test } from "bun:test";
import {
	isPubliclyRoutableIpLiteral,
	selectPinnedPublicAddress,
	sameIpLiteral,
} from "./ip.js";

describe("ip helpers", () => {
	test("classifies common private and reserved IPv4 ranges as non-public", () => {
		expect(isPubliclyRoutableIpLiteral("127.0.0.1")).toBe(false);
		expect(isPubliclyRoutableIpLiteral("10.0.0.8")).toBe(false);
		expect(isPubliclyRoutableIpLiteral("192.168.1.1")).toBe(false);
		expect(isPubliclyRoutableIpLiteral("192.0.2.1")).toBe(false);
		expect(isPubliclyRoutableIpLiteral("198.51.100.10")).toBe(false);
		expect(isPubliclyRoutableIpLiteral("192.0.4.1")).toBe(true);
		expect(isPubliclyRoutableIpLiteral("8.8.8.8")).toBe(true);
	});

	test("classifies common private and reserved IPv6 ranges as non-public", () => {
		expect(isPubliclyRoutableIpLiteral("::1")).toBe(false);
		expect(isPubliclyRoutableIpLiteral("fc00::1")).toBe(false);
		expect(isPubliclyRoutableIpLiteral("fe80::1")).toBe(false);
		expect(isPubliclyRoutableIpLiteral("2001:db8::1")).toBe(false);
		expect(isPubliclyRoutableIpLiteral("2606:4700:4700::1111")).toBe(true);
	});

	test("compares equivalent IPv6 literals across different textual forms", () => {
		expect(sameIpLiteral("2001:db8:0:0:0:0:0:1", "2001:db8::1")).toBe(true);
		expect(
			sameIpLiteral("[2606:4700:4700::1111]", "2606:4700:4700::1111"),
		).toBe(true);
	});

	test("rejects mixed DNS answers that contain a private address", () => {
		expect(() => selectPinnedPublicAddress(["8.8.8.8", "127.0.0.1"])).toThrow(
			"PDS endpoint host must resolve only to public IP addresses",
		);
		expect(selectPinnedPublicAddress(["8.8.8.8"])).toBe("8.8.8.8");
	});
});
