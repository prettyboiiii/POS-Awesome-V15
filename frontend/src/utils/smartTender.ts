// Thai banknotes a customer actually hands over. Quick-tender buttons for THB are built from these.
const THAI_NOTES = [20, 50, 100, 500, 1000];

function getThaiTenderSuggestions(amount: number) {
	const exact = Number(amount.toFixed(2));
	const roundUp = (step: number) => Math.ceil(exact / step) * step;
	const values = [exact, roundUp(10), roundUp(50), roundUp(100), roundUp(1000), ...THAI_NOTES.filter((n) => n >= exact)];
	const unique = Array.from(new Set(values.map((v) => Number(v.toFixed(2)))))
		.filter((v) => v >= exact - 0.0001)
		.sort((a, b) => a - b);
	return unique.slice(0, 5);
}

export function getSmartTenderSuggestions(amount: number, currency?: string) {
	if (amount > 0 && String(currency || "").toUpperCase() === "THB") {
		return getThaiTenderSuggestions(amount);
	}
	const magnitude = Math.pow(10, Math.max(Math.floor(Math.log10(Math.max(amount, 1))) - 1, 0));
	const denoms = [1, 2, 5, 10, 20, 50].map((factor) => factor * magnitude);
	const suggestions = new Set<number>();

	if (amount <= 0) return [];

	denoms.forEach((d) => {
		const multiple = Math.ceil(amount / d);
		const val = multiple * d;
		suggestions.add(val);
	});

	const sorted = Array.from(suggestions).sort((a, b) => a - b);

	const unique: number[] = [];
	const seen = new Set<number>();

	sorted.forEach((v) => {
		const fixed = Number(v.toFixed(2));

		if (fixed >= amount - 0.0001 && !seen.has(fixed)) {
			if (!(fixed < amount && Math.abs(fixed - amount) >= 0.001)) {
				seen.add(fixed);
				unique.push(fixed);
			}
		}
	});

	return unique.slice(0, 6);
}
