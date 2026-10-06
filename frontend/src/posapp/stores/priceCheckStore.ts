/**
 * Price-check mode: scans and taps show the item's price instead of adding it to the cart.
 *
 * The mode switches itself off after IDLE_MS without a lookup, so a cashier who forgets it is on
 * is never left wondering why scans stop adding items.
 */
import { defineStore } from "pinia";
import { ref } from "vue";

export const PRICE_CHECK_IDLE_MS = 15000;

export interface PriceCheckResult {
	item_code: string;
	item_name: string;
	retail: number | null;
	wholesale: number | null;
	member: number | null;
}

export const usePriceCheckStore = defineStore("priceCheck", () => {
	const active = ref(false);
	const result = ref<PriceCheckResult | null>(null);
	let timer: ReturnType<typeof setTimeout> | null = null;

	const stopTimer = () => {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	};

	const turnOff = () => {
		stopTimer();
		active.value = false;
		result.value = null;
	};

	const restartTimer = () => {
		stopTimer();
		timer = setTimeout(turnOff, PRICE_CHECK_IDLE_MS);
	};

	const toggle = () => {
		if (active.value) {
			turnOff();
			return;
		}
		active.value = true;
		restartTimer();
	};

	const show = (next: PriceCheckResult) => {
		if (!active.value) return;
		result.value = next;
		restartTimer();
	};

	return { active, result, toggle, turnOff, show };
});
