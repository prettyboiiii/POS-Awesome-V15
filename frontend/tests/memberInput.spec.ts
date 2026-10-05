import { describe, expect, it } from "vitest";

import {
	UNKNOWN_BIRTH_YEAR,
	formatThaiPhone,
	normalizeThaiPhone,
	parseBirthday,
} from "../src/posapp/utils/memberInput";

describe("normalizeThaiPhone", () => {
	it.each(["0812345678", "081-234-5678", "081 234 5678", "+66 81-234-5678", "66812345678", "0066812345678"])(
		"normalises %s",
		(raw) => {
			expect(normalizeThaiPhone(raw)).toBe("0812345678");
		},
	);

	it("keeps a Bangkok landline", () => {
		expect(normalizeThaiPhone("02-123-4567")).toBe("021234567");
	});

	it.each(["", "abc", "081234567", "08123456789", "0512345678", "+1 415 555 0100"])("rejects %s", (raw) => {
		expect(normalizeThaiPhone(raw)).toBeNull();
	});
});

describe("formatThaiPhone", () => {
	it("groups a mobile and a landline", () => {
		expect(formatThaiPhone("0812345678")).toBe("081-234-5678");
		expect(formatThaiPhone("021234567")).toBe("02-123-4567");
	});

	it("returns what was typed when it is not a phone yet", () => {
		expect(formatThaiPhone("0812")).toBe("0812");
	});
});

describe("parseBirthday", () => {
	const today = new Date(2026, 9, 5);

	it("reads common separators and the compact form", () => {
		expect(parseBirthday("17/05/1990", today)).toBe("1990-05-17");
		expect(parseBirthday("17-5-1990", today)).toBe("1990-05-17");
		expect(parseBirthday("17.05.1990", today)).toBe("1990-05-17");
		expect(parseBirthday("17051990", today)).toBe("1990-05-17");
	});

	it("converts a Buddhist-era year", () => {
		expect(parseBirthday("17/05/2533", today)).toBe("1990-05-17");
	});

	it("accepts day and month only with the placeholder year", () => {
		expect(parseBirthday("17/05", today)).toBe(`${UNKNOWN_BIRTH_YEAR}-05-17`);
		expect(parseBirthday("29/02", today)).toBe(`${UNKNOWN_BIRTH_YEAR}-02-29`);
	});

	it("rejects impossible, future and too-old dates", () => {
		expect(parseBirthday("31/02/1990", today)).toBeNull();
		expect(parseBirthday("17/13/1990", today)).toBeNull();
		expect(parseBirthday("29/02/1991", today)).toBeNull();
		expect(parseBirthday("01/01/2030", today)).toBeNull();
		expect(parseBirthday("01/01/1850", today)).toBeNull();
		expect(parseBirthday("hello", today)).toBeNull();
		expect(parseBirthday("", today)).toBeNull();
	});
});
