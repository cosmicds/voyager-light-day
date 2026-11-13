<template>
  <fieldset id="wwt-time-control">
    <legend>WWT Time Control</legend>

    <div
      v-if="!hideTimeInput || !hideSetTime"
      class="wwt-time-set"
    >
      <label v-if="!hideTimeInput">
        UTC Time:
        <input
          v-model="selectedDateTime"
          class="wwt-time-control-input"
          type="datetime-local"
          step="1"
          @focus="inputFocused = true"
          @blur="inputFocused = false"
          @keyup.enter="setTime"
        />
      </label>
      <v-btn
        v-if="!hideSetTime"
        class="text-none"
        rounded="lg"
        density="compact"
        @click="setTime"
      >
        Set time
      </v-btn>
    </div>

    <!-- rate and play/pause (clock sync) are the toolkit's SpeedControl -->
    <div class="wwt-clock-controls">
      <speed-control
        v-if="!hideRate"
        v-model="playing"
        :store="store"
        :default-rate="1000"
        :max-speed="100000000"
        :show-status="!hideStatus"
      />
      <v-btn
        v-if="!hideNow"
        class="text-none"
        rounded="lg"
        density="compact"
        @click="store.setTime(new Date())"
      >
        Now
      </v-btn>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { engineStore } from "@wwtelescope/engine-pinia";
import { SpeedControl } from "@cosmicds/vue-toolkit";

const store = engineStore();

// each control can be hidden
defineProps<{
  /** the UTC date/time input */
  hideTimeInput?: boolean;
  /** the "Set time" button */
  hideSetTime?: boolean;
  /** the playback rate control (SpeedControl, with play/pause) */
  hideRate?: boolean;
  /** SpeedControl's status readout */
  hideStatus?: boolean;
  /** the "Now" button */
  hideNow?: boolean;
}>();

// whether time is running. v-model so the parent can pause it (e.g. when scrubbing)
const playing = defineModel<boolean>({ default: false });

function isoString(date: Date) {
  return date.toISOString().replace("Z", "").split(".")[0] as string;
}

const inputFocused = ref(false);
const selectedDateTime = ref(isoString(store.currentTime));

watch(
  () => isoString(store.currentTime),
  (dateString: string) => {
    if (!inputFocused.value && selectedDateTime.value !== dateString) {
      selectedDateTime.value = dateString;
    }
  },
);

const setTime = () => store.setTime(new Date(selectedDateTime.value + "Z"));
</script>

<style lang="less">
fieldset#wwt-time-control {
  --spacing: 1em;
  pointer-events: auto; // #wwt-overlay turns them off
  display: flex;
  flex-direction: column;
  font-size: 12px;
  font-family: monospace;
  gap: var(--spacing);
  background-color: rgba(3, 1, 37, 0.8);

  input.wwt-time-control-input {
    border: 2px solid rgba(255, 255, 255, 0.388);
    padding: calc(var(--spacing) / 2) var(--spacing);
    border-radius: var(--spacing);
  }

  legend {
    padding-inline: 4px;
    display: none;
  }

  .wwt-time-set {
    display: flex;
    flex-direction: row;
    gap: var(--spacing);
    align-items: center;
  }

  .wwt-time-control-input {
    width: 230px;
  }

  .wwt-clock-controls {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing);
  }
}
</style>
