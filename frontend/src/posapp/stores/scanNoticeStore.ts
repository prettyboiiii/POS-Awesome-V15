/**
 * The last scan that found no item, shown as a snackbar for a few seconds.
 * It never blocks: the scanner stays open, so the next scan is not lost.
 */
import { defineStore } from "pinia";
import { ref } from "vue";

export const SCAN_NOTICE_MS = 5000;

export interface ScanNotice {
	message: string;
	code: string;
}

export const useScanNoticeStore = defineStore("scanNotice", () => {
	const last = ref<ScanNotice | null>(null);
	let timer: ReturnType<typeof setTimeout> | null = null;

	const clear = () => {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		last.value = null;
	};

	const record = (notice: ScanNotice) => {
		clear();
		last.value = notice;
		timer = setTimeout(clear, SCAN_NOTICE_MS);
	};

	return { last, record, clear };
});
