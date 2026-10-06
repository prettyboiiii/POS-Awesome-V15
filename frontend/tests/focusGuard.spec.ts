import { describe, expect, it } from "vitest";

import { shouldRefocusSearch } from "../src/posapp/utils/focusGuard";

const base = { activeTag: "BODY", isEditable: false, dialogOpen: false, searchFocused: false };

describe("focus guard", () => {
	it("refocuses when focus is on body", () => {
		expect(shouldRefocusSearch(base)).toBe(true);
	});

	it("refocuses when focus is on a button", () => {
		expect(shouldRefocusSearch({ ...base, activeTag: "BUTTON" })).toBe(true);
	});

	it("does not steal focus from a real input", () => {
		expect(shouldRefocusSearch({ ...base, activeTag: "INPUT", isEditable: true })).toBe(false);
		expect(shouldRefocusSearch({ ...base, activeTag: "TEXTAREA", isEditable: true })).toBe(false);
		expect(shouldRefocusSearch({ ...base, activeTag: "DIV", isEditable: true })).toBe(false);
	});

	it("does nothing while a dialog is open", () => {
		expect(shouldRefocusSearch({ ...base, dialogOpen: true })).toBe(false);
	});

	it("does nothing when the search box already has focus", () => {
		expect(
			shouldRefocusSearch({ ...base, activeTag: "INPUT", isEditable: true, searchFocused: true }),
		).toBe(false);
	});
});
