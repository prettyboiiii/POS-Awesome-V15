/**
 * Which input the in-app numpad is typing into. One numpad serves the whole screen (`NumPad.vue`);
 * inputs opt in with `data-numpad` (see `utils/numpadInput.ts`), and code that has no such input
 * (the scan multiplier button) opens it by hand.
 */
import { defineStore } from "pinia";
import { shallowRef, ref } from "vue";
import type { NumpadKind } from "../utils/numpadInput";

export const useNumpadStore = defineStore("numpad", () => {
	const target = shallowRef<HTMLInputElement | null>(null);
	const kind = ref<NumpadKind>("decimal");
	const label = ref("");

	const open = (el: HTMLInputElement, nextKind: NumpadKind, nextLabel = "") => {
		target.value = el;
		kind.value = nextKind;
		label.value = nextLabel;
	};

	const close = () => {
		target.value = null;
	};

	return { target, kind, label, open, close };
});
