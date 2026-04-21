import { TID } from "@atproto/common-web";
import { describe, expect, test } from "bun:test";
import { createTidLikeId } from "./ids.js";

describe("createTidLikeId", () => {
	test("returns valid tids in ascending order", () => {
		const first = createTidLikeId();
		const second = createTidLikeId(first);
		const third = createTidLikeId(second);

		expect(TID.is(first)).toBe(true);
		expect(TID.is(second)).toBe(true);
		expect(TID.is(third)).toBe(true);
		expect(first < second).toBe(true);
		expect(second < third).toBe(true);
	});

	test("returns a tid later than the provided previous tid", () => {
		const futureTid = TID.fromTime((Date.now() + 60_000) * 1000, 0).toString();
		const nextTid = createTidLikeId(futureTid);

		expect(nextTid > futureTid).toBe(true);
	});
});