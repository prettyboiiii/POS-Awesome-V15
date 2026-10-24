// mart #78: keep the open cart in localStorage so a reload (F5, crash, Wi-Fi blip) mid-sale can offer to resume it.
// Pure helpers only; Invoice.vue decides when to write, ask and restore.

export const CART_SNAPSHOT_KEY = "posawesome:mart-cart:v1";
// A cart older than this is a forgotten one, not a sale in progress.
export const CART_SNAPSHOT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export interface CartSnapshotScope {
	user?: string | null;
	posProfile?: string | null;
	openingShift?: string | null;
}

export interface CartSnapshot {
	version: 1;
	savedAt: number;
	scope: { user: string; posProfile: string; openingShift: string };
	/** Server draft created by an earlier pay attempt, if any. */
	draftName: string;
	customer: string;
	items: any[];
	packedItems: any[];
	doc: Record<string, any>;
}

const text = (value: unknown) => String(value ?? "").trim();

// Header fields worth carrying back; everything else is rebuilt by the server on the next save.
const DOC_FIELDS = ["doctype", "company", "pos_profile", "currency", "selling_price_list", "customer"];

export function buildCartSnapshot(
	input: {
		scope: CartSnapshotScope;
		customer?: string | null;
		invoiceDoc?: Record<string, any> | null;
		items?: any[] | null;
		packedItems?: any[] | null;
	},
	now = Date.now(),
): CartSnapshot | null {
	const items = Array.isArray(input.items) ? input.items : [];
	if (!items.length) return null;
	const scope = {
		user: text(input.scope.user),
		posProfile: text(input.scope.posProfile),
		openingShift: text(input.scope.openingShift),
	};
	if (!scope.user || !scope.posProfile || !scope.openingShift) return null;
	const doc: Record<string, any> = {};
	for (const field of DOC_FIELDS) {
		const value = input.invoiceDoc?.[field];
		if (value !== undefined && value !== null && value !== "") doc[field] = value;
	}
	const draftName = text(input.invoiceDoc?.name);
	return {
		version: 1,
		savedAt: now,
		scope,
		draftName,
		customer: text(input.customer),
		items: JSON.parse(JSON.stringify(items)),
		packedItems: JSON.parse(JSON.stringify(input.packedItems || [])),
		doc,
	};
}

export function isUsableSnapshot(value: any, now = Date.now()): value is CartSnapshot {
	return (
		value?.version === 1 &&
		Array.isArray(value.items) &&
		value.items.length > 0 &&
		Number.isFinite(Number(value.savedAt)) &&
		now - Number(value.savedAt) <= CART_SNAPSHOT_MAX_AGE_MS &&
		Number(value.savedAt) <= now + 60_000 &&
		Boolean(text(value.scope?.user)) &&
		Boolean(text(value.scope?.posProfile)) &&
		Boolean(text(value.scope?.openingShift))
	);
}

export function snapshotMatchesScope(snapshot: CartSnapshot, scope: CartSnapshotScope): boolean {
	return (
		text(snapshot.scope.user) === text(scope.user) &&
		text(snapshot.scope.posProfile) === text(scope.posProfile) &&
		text(snapshot.scope.openingShift) === text(scope.openingShift)
	);
}

const store = (storage?: Storage | null): Storage | null => {
	if (storage !== undefined) return storage;
	try {
		return typeof window !== "undefined" ? window.localStorage : null;
	} catch {
		return null;
	}
};

export function writeCartSnapshot(snapshot: CartSnapshot, storage?: Storage | null): boolean {
	const target = store(storage);
	if (!target) return false;
	try {
		target.setItem(CART_SNAPSHOT_KEY, JSON.stringify(snapshot));
		return true;
	} catch {
		return false;
	}
}

export function clearCartSnapshot(storage?: Storage | null): void {
	try {
		store(storage)?.removeItem(CART_SNAPSHOT_KEY);
	} catch {
		// best effort in restricted browser contexts
	}
}

/** Stored snapshot, or null when missing, broken or too old (a bad one is removed). */
export function readCartSnapshot(storage?: Storage | null, now = Date.now()): CartSnapshot | null {
	const target = store(storage);
	if (!target) return null;
	try {
		const raw = target.getItem(CART_SNAPSHOT_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (isUsableSnapshot(parsed, now)) return parsed;
	} catch {
		// fall through to cleanup
	}
	clearCartSnapshot(storage);
	return null;
}

/** Document handed to load_invoice when the cashier resumes. */
export function snapshotToDraft(snapshot: CartSnapshot): Record<string, any> {
	const draft: Record<string, any> = {
		...snapshot.doc,
		doctype: snapshot.doc.doctype || "Sales Invoice",
		customer: snapshot.customer || snapshot.doc.customer,
		items: JSON.parse(JSON.stringify(snapshot.items)),
		packed_items: JSON.parse(JSON.stringify(snapshot.packedItems || [])),
	};
	if (snapshot.draftName) draft.name = snapshot.draftName;
	return draft;
}
