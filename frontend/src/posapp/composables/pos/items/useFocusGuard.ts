import { shouldRefocusSearch } from "../../../utils/focusGuard";

type Options = { focusSearch: () => void; isDialogOpen: () => boolean };

const SEARCH_SELECTOR = "[data-pos-keyboard-target='item-search'], .search-field-shell";

/**
 * Keeps keyboard focus on the item search box so a hardware scanner can fire at any time.
 * It only reacts when focus lands on body or a non-input element, never inside a real input or dialog.
 */
export function useFocusGuard({ focusSearch, isDialogOpen }: Options) {
	const check = () => {
		const active = document.activeElement as HTMLElement | null;
		const editable =
			!!active &&
			(["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName) || active.isContentEditable);
		const searchFocused = !!active?.closest?.(SEARCH_SELECTOR);
		if (
			shouldRefocusSearch({
				activeTag: active?.tagName ?? "BODY",
				isEditable: editable,
				dialogOpen: isDialogOpen(),
				searchFocused,
			})
		) {
			focusSearch();
		}
	};
	const schedule = () => {
		window.setTimeout(check, 0);
	};
	return {
		mount() {
			document.addEventListener("focusout", schedule, true);
			document.addEventListener("click", schedule, true);
		},
		unmount() {
			document.removeEventListener("focusout", schedule, true);
			document.removeEventListener("click", schedule, true);
		},
	};
}
