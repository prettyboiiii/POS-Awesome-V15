// Phone and birthday typing rules for member sign-up. Mirrors mart_shop.members_rules on the server,
// which stays the authority; this only decides when the screen may search or enable the button.

const MOBILE = /^0[689]\d{8}$/;
const LANDLINE = /^0[2-7]\d{7}$/;

/** National form (0812345678) of a Thai number, or null. Accepts spaces, dashes, +66, 66 and 0066. */
export function normalizeThaiPhone(raw: unknown): string | null {
	let digits = String(raw ?? "").replace(/\D/g, "");
	if (digits.startsWith("0066")) {
		digits = `0${digits.slice(4)}`;
	} else if (digits.startsWith("66") && (digits.length === 10 || digits.length === 11)) {
		digits = `0${digits.slice(2)}`;
	}
	return MOBILE.test(digits) || LANDLINE.test(digits) ? digits : null;
}

/** 081-234-5678 for a mobile, 02-123-4567 for a Bangkok landline; anything else is returned as typed. */
export function formatThaiPhone(raw: unknown): string {
	const phone = normalizeThaiPhone(raw);
	if (!phone) return String(raw ?? "");
	if (phone.length === 10) return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
	return phone.startsWith("02")
		? `${phone.slice(0, 2)}-${phone.slice(2, 5)}-${phone.slice(5)}`
		: `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
}

// Year stored when the customer gives only day and month. 1904 is a leap year, so 29 February works.
// Only the day and month are used (birthday perks), never the age.
export const UNKNOWN_BIRTH_YEAR = 1904;

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Parse what a cashier types for a birthday into an ISO date, or null when it is not a real past date.
 *
 * Accepts dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy and ddmmyyyy. A year of 2400 or more is Buddhist era
 * (customers often say it that way) and has 543 taken off. Day and month alone (dd/mm) are accepted
 * and stored with UNKNOWN_BIRTH_YEAR.
 */
export function parseBirthday(text: string, today: Date = new Date()): string | null {
	const value = String(text ?? "").trim();
	if (!value) return null;

	let match = value.match(/^(\d{1,2})[/.\-\s](\d{1,2})(?:[/.\-\s](\d{4}))?$/);
	if (!match && /^\d{8}$/.test(value)) {
		match = [value, value.slice(0, 2), value.slice(2, 4), value.slice(4)] as unknown as RegExpMatchArray;
	}
	if (!match) return null;

	const day = Number(match[1]);
	const month = Number(match[2]);
	let year = match[3] ? Number(match[3]) : UNKNOWN_BIRTH_YEAR;
	if (year >= 2400) year -= 543;
	if (year < 1900 && year !== UNKNOWN_BIRTH_YEAR) return null;

	const date = new Date(Date.UTC(year, month - 1, day));
	if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
		return null;
	}
	const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
	if (date.getTime() > todayUtc) return null;

	return `${year}-${pad(month)}-${pad(day)}`;
}
