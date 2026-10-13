/**
 * Thai Kedmanee layout, as [Latin key, Thai character] pairs. A hardware scanner types key codes, so with the
 * OS layout on Thai the barcode arrives as the Thai characters of those keys.
 */
export const KEDMANEE_PAIRS: ReadonlyArray<readonly [string, string]> = [
	// number row
	["_", "_"],
	["1", "ๅ"], ["2", "/"], ["3", "-"], ["4", "ภ"], ["5", "ถ"], ["6", "ุ"], ["7", "ึ"], ["8", "ค"], ["9", "ต"],
	["0", "จ"], ["-", "ข"], ["=", "ช"],
	["%", "%"], ["+", "+"], ["@", "๑"], ["#", "๒"], ["$", "๓"], ["^", "ู"], ["&", "฿"], ["*", "๕"],
	["(", "๖"], [")", "๗"],
	// top row
	["q", "ๆ"], ["w", "ไ"], ["e", "ำ"], ["r", "พ"], ["t", "ะ"], ["y", "ั"], ["u", "ี"], ["i", "ร"], ["o", "น"],
	["p", "ย"], ["[", "บ"], ["]", "ล"], ["\\", "ฃ"],
	["Q", "๐"], ["W", '"'], ["E", "ฎ"], ["R", "ฑ"], ["T", "ธ"], ["Y", "ํ"], ["U", "๊"], ["I", "ณ"], ["O", "ฯ"],
	["P", "ญ"], ["{", "ฐ"], ["}", ","], ["|", "ฅ"],
	// home row
	["a", "ฟ"], ["s", "ห"], ["d", "ก"], ["f", "ด"], ["g", "เ"], ["h", "้"], ["j", "่"], ["k", "า"], ["l", "ส"],
	[";", "ว"], ["'", "ง"],
	["A", "ฤ"], ["S", "ฆ"], ["D", "ฏ"], ["F", "โ"], ["G", "ฌ"], ["H", "็"], ["J", "๋"], ["K", "ษ"], ["L", "ศ"],
	[":", "ซ"], ['"', "."],
	// bottom row
	["z", "ผ"], ["x", "ป"], ["c", "แ"], ["v", "อ"], ["b", "ิ"], ["n", "ื"], ["m", "ท"], [",", "ม"], [".", "ใ"],
	["/", "ฝ"],
	["Z", "("], ["X", ")"], ["C", "ฉ"], ["V", "ฮ"], ["B", "ฺ"], ["N", "์"], ["M", "?"], ["<", "ฒ"], [">", "ฬ"],
	["?", "ฦ"],
];

// Digits 2 and 3, the dash and some symbols come out as Latin characters on the Thai layout ("/" for 2, "-" for 3),
// so the reverse table holds every output character, not only the Thai ones.
const OUTPUT_TO_KEY = new Map<string, string>(KEDMANEE_PAIRS.map(([latin, out]) => [out, latin]));

export function hasThai(text: string): boolean {
	return /[฀-๿]/.test(String(text ?? ""));
}

/**
 * Turn text typed on the Thai Kedmanee layout back into the Latin keys that were pressed. Text without a Thai
 * character was not typed on that layout and is returned as it is.
 */
export function thaiToLatin(text: string): string {
	const value = String(text ?? "");
	if (!hasThai(value)) return value;
	return Array.from(value, (ch) => OUTPUT_TO_KEY.get(ch) ?? ch).join("");
}
