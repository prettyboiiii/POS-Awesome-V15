// A stable colour per item group so cashiers can find "drinks" or "snacks" by eye. The colour is a hint,
// never the only cue: group names are always shown as text next to it.
const GROUP_COLORS = ["#0b7285", "#2b8a3e", "#e67700", "#c2255c", "#5f3dc4", "#1864ab", "#a61e4d", "#495057"];

export function groupColorFor(name: unknown): string {
	const text = String(name || "");
	let hash = 0;
	for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
	return GROUP_COLORS[hash % GROUP_COLORS.length] as string;
}
