<template>
	<v-snackbar
		:model-value="!!undoRemove.last"
		:timeout="-1"
		location="bottom end"
		color="grey-darken-3"
		data-testid="undo-remove-snackbar"
		@update:model-value="onUpdate"
	>
		{{ __("Removed {0}", [undoRemove.last?.itemName || ""]) }}
		<template #actions>
			<v-btn color="warning" variant="text" size="large" data-testid="undo-remove" @click="undo">
				{{ __("Undo remove") }}
			</v-btn>
		</template>
	</v-snackbar>
</template>

<script setup lang="ts">
import { useUndoRemoveStore } from "../../../stores/undoRemoveStore";

declare const __: (_str: string, _args?: any[]) => string;

const emit = defineEmits<{ restore: [entry: { line: Record<string, any>; index: number }] }>();
const undoRemove = useUndoRemoveStore();

const undo = () => {
	const entry = undoRemove.last;
	if (!entry) return;
	undoRemove.clear();
	emit("restore", { line: entry.line, index: entry.index });
};

const onUpdate = (open: boolean) => {
	if (!open) undoRemove.clear();
};
</script>
