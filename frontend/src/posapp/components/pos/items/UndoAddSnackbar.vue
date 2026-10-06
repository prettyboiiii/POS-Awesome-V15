<template>
	<v-snackbar
		:model-value="!!undoAdd.last"
		:timeout="-1"
		location="bottom start"
		color="grey-darken-3"
		data-testid="undo-add-snackbar"
		@update:model-value="onUpdate"
	>
		{{ __("Added {0}", [undoAdd.last?.itemName || ""]) }}
		<template #actions>
			<v-btn color="warning" variant="text" data-testid="undo-add" @click="undo">
				{{ __("Undo") }}
			</v-btn>
		</template>
	</v-snackbar>
</template>

<script setup lang="ts">
import { inject } from "vue";
import { useUndoAddStore } from "../../../stores/undoAddStore";

declare const __: (_str: string, _args?: any[]) => string;

const emit = defineEmits(["undone"]);
const eventBus: any = inject("eventBus", null);
const undoAdd = useUndoAddStore();

const undo = () => {
	const entry = undoAdd.last;
	if (!entry) return;
	eventBus?.emit?.("undo_added_qty", { rowId: entry.rowId, qty: entry.qty });
	undoAdd.clear();
	emit("undone");
};

const onUpdate = (open: boolean) => {
	if (!open) undoAdd.clear();
};
</script>
