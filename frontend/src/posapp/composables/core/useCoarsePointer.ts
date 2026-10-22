import { ref } from "vue";
import { COARSE_POINTER_QUERY, isCoarsePointer } from "../../utils/touchKeyboard";

/**
 * One shared flag for "the primary pointer is a finger" (tablet counter). It is read once and follows
 * the media query, so the scan box keyboard button and the numpad agree without each adding a listener.
 */
const coarsePointer = ref(false);
let started = false;

const read = () => {
	coarsePointer.value = isCoarsePointer(typeof window !== "undefined" ? window.matchMedia?.bind(window) : null);
};

export function useCoarsePointer() {
	if (typeof window !== "undefined") {
		read();
	}
	if (!started && typeof window !== "undefined") {
		started = true;
		try {
			window.matchMedia?.(COARSE_POINTER_QUERY)?.addEventListener?.("change", read);
		} catch {
			/* old browser: the first reading stands */
		}
	}
	return { coarsePointer, refresh: read };
}
