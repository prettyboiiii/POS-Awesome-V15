import { describe, expect, it } from "vitest";

import {
	CART_SNAPSHOT_KEY,
	CART_SNAPSHOT_MAX_AGE_MS,
	buildCartSnapshot,
	clearCartSnapshot,
	readCartSnapshot,
	snapshotMatchesScope,
	snapshotToDraft,
	writeCartSnapshot,
} from "../src/posapp/utils/cartSnapshot";

const scope = { user: "nok@shop", posProfile: "Main", openingShift: "SHIFT-1" };

const memoryStorage = (): Storage => {
	const data = new Map<string, string>();
	return {
		getItem: (k: string) => data.get(k) ?? null,
		setItem: (k: string, v: string) => void data.set(k, String(v)),
		removeItem: (k: string) => void data.delete(k),
		clear: () => data.clear(),
		key: () => null,
		get length() {
			return data.size;
		},
	} as Storage;
};

describe("cart snapshot", () => {
	it("is null for an empty cart or missing scope", () => {
		expect(buildCartSnapshot({ scope, items: [] })).toBeNull();
		expect(buildCartSnapshot({ scope: { user: "a" }, items: [{ item_code: "X" }] })).toBeNull();
	});

	it("keeps items, customer and the pay-dialog draft name", () => {
		const snap = buildCartSnapshot({
			scope,
			customer: "ลูกค้าทั่วไป",
			invoiceDoc: { name: "ACC-SINV-1", currency: "THB", grand_total: 99, junk: 1 },
			items: [{ item_code: "A", qty: 2 }],
		})!;
		expect(snap.draftName).toBe("ACC-SINV-1");
		expect(snap.doc).toEqual({ currency: "THB" });
		const draft = snapshotToDraft(snap);
		expect(draft.name).toBe("ACC-SINV-1");
		expect(draft.items).toEqual([{ item_code: "A", qty: 2 }]);
		expect(draft.customer).toBe("ลูกค้าทั่วไป");
		expect(draft.doctype).toBe("Sales Invoice");
	});

	it("has no draft name when none was saved", () => {
		const snap = buildCartSnapshot({ scope, items: [{ item_code: "A" }] })!;
		expect(snapshotToDraft(snap).name).toBeUndefined();
	});

	it("round-trips through storage and clears", () => {
		const storage = memoryStorage();
		const snap = buildCartSnapshot({ scope, items: [{ item_code: "A" }] })!;
		expect(writeCartSnapshot(snap, storage)).toBe(true);
		expect(readCartSnapshot(storage)?.items).toEqual([{ item_code: "A" }]);
		clearCartSnapshot(storage);
		expect(readCartSnapshot(storage)).toBeNull();
	});

	it("drops old, future and corrupt entries", () => {
		const storage = memoryStorage();
		const now = 1_000_000_000_000;
		const snap = buildCartSnapshot({ scope, items: [{ item_code: "A" }] }, now)!;
		writeCartSnapshot(snap, storage);
		expect(readCartSnapshot(storage, now + CART_SNAPSHOT_MAX_AGE_MS + 1)).toBeNull();
		expect(storage.getItem(CART_SNAPSHOT_KEY)).toBeNull();
		writeCartSnapshot(snap, storage);
		expect(readCartSnapshot(storage, now - 120_000)).toBeNull();
		storage.setItem(CART_SNAPSHOT_KEY, "{not json");
		expect(readCartSnapshot(storage, now)).toBeNull();
		expect(storage.getItem(CART_SNAPSHOT_KEY)).toBeNull();
	});

	it("matches only the same user, profile and shift", () => {
		const snap = buildCartSnapshot({ scope, items: [{ item_code: "A" }] })!;
		expect(snapshotMatchesScope(snap, scope)).toBe(true);
		expect(snapshotMatchesScope(snap, { ...scope, openingShift: "SHIFT-2" })).toBe(false);
		expect(snapshotMatchesScope(snap, { ...scope, user: "other" })).toBe(false);
	});
});
