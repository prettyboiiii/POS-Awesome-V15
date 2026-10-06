export type FocusState = {
	activeTag: string;
	isEditable: boolean;
	dialogOpen: boolean;
	searchFocused: boolean;
};

/** True when keyboard focus has drifted somewhere harmless and the search box should take it back. */
export function shouldRefocusSearch(state: FocusState): boolean {
	if (state.dialogOpen || state.searchFocused || state.isEditable) return false;
	return true;
}
