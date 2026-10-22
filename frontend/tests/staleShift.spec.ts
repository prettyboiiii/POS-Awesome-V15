import { describe, expect, it } from "vitest";

import { buildStaleShiftPrompt, isShiftFromEarlierDay } from "../src/posapp/utils/staleShift";

describe("stale shift", () => {
	const now = new Date(2026, 9, 23, 9, 0, 0);

	it("is stale when the shift started on an earlier day", () => {
		expect(isShiftFromEarlierDay("2026-10-22 23:59:59", now)).toBe(true);
		expect(isShiftFromEarlierDay("2026-10-22 08:00:00.123456", now)).toBe(true);
	});

	it("is not stale on the same day, even late at night", () => {
		expect(isShiftFromEarlierDay("2026-10-23 00:00:01", now)).toBe(false);
		expect(isShiftFromEarlierDay("2026-10-23 08:00:00", now)).toBe(false);
	});

	it("never blocks on unknown or broken data", () => {
		expect(isShiftFromEarlierDay(undefined, now)).toBe(false);
		expect(isShiftFromEarlierDay("", now)).toBe(false);
		expect(isShiftFromEarlierDay("not a date", now)).toBe(false);
	});

	it("builds a prompt with the opening day and translates each line", () => {
		const text = buildStaleShiftPrompt("2026-10-22 08:00:00", (s) => s);
		expect(text).toContain("The open shift is from 2026-10-22, not today.");
		expect(text.split("\n")).toHaveLength(3);
		expect(buildStaleShiftPrompt("2026-10-22 08:00:00", (s) => `T(${s})`)).toContain(
			"T(Close it first so each day's cash is counted on its own.)",
		);
	});
});
