/**
 * Price tiers for the cashier screen: the per-item wholesale and cold prices, and "cold mode".
 *
 * Cold mode makes the next scans and taps use the cold price, so a run of cold drinks needs no chip
 * taps. It switches itself off after COLD_MODE_IDLE_MS without an add, because a forgotten cold mode
 * would overcharge the next customer.
 */
import { defineStore } from "pinia";
import { ref } from "vue";

import type { PriceTier, TierCheckRow, TierPrices } from "../utils/priceTier";

export type TierCheckAnswer = "keep" | "cold" | "back";

declare const frappe: any;

export const COLD_MODE_IDLE_MS = 20000;
const CACHE_KEY = "mart_tier_prices";

const readCache = (): TierPrices => {
	try {
		const parsed = JSON.parse(window.localStorage.getItem(CACHE_KEY) || "{}");
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
};

export const usePriceTierStore = defineStore("priceTier", () => {
	const prices = ref<TierPrices>(readCache());
	const scanTier = ref<PriceTier>("");
	// Row ids of lines the cashier has decided about (chip tapped, cold mode, or the PAY check answered).
	// Kept here, not on the line: the cart is rebuilt from the saved bill and line flags would be lost.
	const seenRows = ref<Set<string>>(new Set());
	const markSeen = (rowId: unknown) => {
		if (rowId) seenRows.value = new Set(seenRows.value).add(String(rowId));
	};
	const clearSeen = () => {
		seenRows.value = new Set();
	};
	let timer: ReturnType<typeof setTimeout> | null = null;

	const stopTimer = () => {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	};

	const setScanTier = (tier: PriceTier) => {
		stopTimer();
		scanTier.value = tier;
		if (tier) timer = setTimeout(() => (scanTier.value = ""), COLD_MODE_IDLE_MS);
	};

	const toggleCold = () => setScanTier(scanTier.value === "cold" ? "" : "cold");

	/** Call on every add so cold mode stays on while the cashier keeps adding cold items. */
	const touch = () => {
		if (scanTier.value) setScanTier(scanTier.value);
	};

	// The PAY check: lines that could be sold cold but are still on the shelf price. `openCheck` settles
	// when the cashier answers, so show_payment can simply await it.
	const check = ref<{ open: boolean; rows: TierCheckRow[] }>({ open: false, rows: [] });
	let settle: ((answer: TierCheckAnswer) => void) | null = null;

	const openCheck = (rows: TierCheckRow[]): Promise<TierCheckAnswer> => {
		settle?.("back");
		check.value = { open: true, rows };
		return new Promise((resolve) => {
			settle = resolve;
		});
	};

	const answerCheck = (answer: TierCheckAnswer) => {
		check.value = { ...check.value, open: false };
		const done = settle;
		settle = null;
		done?.(answer);
	};

	let loadedOnce = false;
	let inflight: Promise<void> | null = null;

	const fetchPrices = async () => {
		if (typeof frappe === "undefined") return;
		try {
			const response = await frappe.call({ method: "mart_shop.api.pos.tier_prices", freeze: false });
			const loaded = response?.message;
			if (loaded && typeof loaded === "object") {
				prices.value = loaded;
				loadedOnce = true;
				try {
					window.localStorage.setItem(CACHE_KEY, JSON.stringify(loaded));
				} catch {
					// Storage can be blocked; the prices still work for this session.
				}
			}
		} catch (error) {
			console.warn("Could not load wholesale and cold prices", error);
		}
	};

	/** Fetch the prices; calls made while one is running share it. */
	const load = () => {
		inflight ??= fetchPrices().finally(() => {
			inflight = null;
		});
		return inflight;
	};

	/**
	 * Called before an add made in cold mode: make sure this session has fetched the prices, starting the
	 * fetch if the screen has not yet, so a quick scan never silently falls back to the shelf price. A
	 * failed fetch is tried again on the next add.
	 */
	const ensureLoaded = async () => {
		if (!loadedOnce) await load();
	};

	return { prices, scanTier, ensureLoaded, seenRows, markSeen, clearSeen, setScanTier, toggleCold, touch, check, openCheck, answerCheck, load };
});
