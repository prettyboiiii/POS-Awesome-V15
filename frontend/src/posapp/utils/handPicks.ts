import { ref } from "vue";

declare const frappe: any;

// How many times each item was tapped (not scanned) on recent sales. The server counts them from sale
// lines flagged mart_hand_picked; the last answer is cached so the screen works offline.
const CACHE_KEY = "mart_hand_picks";

const readCache = (): Record<string, number> => {
	try {
		const parsed = JSON.parse(window.localStorage.getItem(CACHE_KEY) || "{}");
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
};

export const handPicks = ref<Record<string, number>>(readCache());

export async function loadHandPicks(posProfileName: string | undefined) {
	if (!posProfileName || typeof frappe === "undefined") return;
	try {
		const response = await frappe.call({
			method: "mart_shop.api.pos.hand_picks",
			args: { pos_profile: posProfileName },
			freeze: false,
		});
		const picks = response?.message;
		if (picks && typeof picks === "object") {
			handPicks.value = picks;
			try {
				window.localStorage.setItem(CACHE_KEY, JSON.stringify(picks));
			} catch {
				// Storage can be blocked; the picks still work for this session.
			}
		}
	} catch (error) {
		console.warn("Could not load frequently used items", error);
	}
}

// Count a tap at once so the favourites move without waiting for the next sale to be saved.
export function bumpHandPick(itemCode: string | undefined) {
	if (!itemCode) return;
	handPicks.value = { ...handPicks.value, [itemCode]: (handPicks.value[itemCode] || 0) + 1 };
}
