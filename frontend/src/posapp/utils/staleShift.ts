// mart #122: an open shift from an earlier day must be closed (and its cash counted) before selling.

type Translate = (text: string) => string;

const identity: Translate = (text) => text;

function dayKey(value: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function parseStart(value: unknown): Date | null {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value;
	}
	if (typeof value !== "string" || !value.trim()) {
		return null;
	}
	// Frappe sends "YYYY-MM-DD HH:mm:ss[.ffffff]"; Date wants a T between date and time.
	const parsed = new Date(value.trim().replace(" ", "T"));
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** True when the shift started on a calendar day before `now` (device local time). Unknown start: false. */
export function isShiftFromEarlierDay(periodStart: unknown, now: Date = new Date()): boolean {
	const start = parseStart(periodStart);
	if (!start) {
		return false;
	}
	return dayKey(start) < dayKey(now);
}

/** Text of the "close it first" prompt, with the day the shift was opened. */
export function buildStaleShiftPrompt(periodStart: unknown, translate: Translate = identity): string {
	const start = parseStart(periodStart);
	const day = start ? dayKey(start) : "";
	return [
		translate("The open shift is from {0}, not today.").replace("{0}", day),
		translate("Close it first so each day's cash is counted on its own."),
		translate("OK opens the closing screen. After closing, open a new shift."),
	].join("\n");
}
