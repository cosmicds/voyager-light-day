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
        ref="speedControlRef"
        v-model="playing"
        class="wwt-speed-control"
        :class="{'no-rate-controls': hideRateChangers, 'hide-reverse': hideReverse, 'hide-home': hideHomeButton}"
        :store="store"
        :default-rate="1000"
        :max-speed="100000000"
        :show-status="!hideStatus"
        :rate-delta="2"
        :color="color"
        hide-more-controls
        @speed-up="(r) => (rate = r)"
        @slow-down="(r) => (rate = r)"
        @set-rate="(r) => (rate = r)"
        @update:reverse="(r) => (reverse = r)"
      />
      <v-btn
        v-if="!hideNow"
        class="text-none wwt-now-button"
        rounded="lg"
        density="compact"
        variant="outlined"
        :color="color"
        @click="store.setTime(new Date())"
      >
        Now
      </v-btn>
    </div>
    <div class="wwt-rate">
      Rate: {{ roundedRate(rate) }}{{ playing ? "" : " (paused)" }} 
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, useTemplateRef, type WritableComputedRef } from "vue";
import { engineStore } from "@wwtelescope/engine-pinia";
import { SpeedControl } from "@cosmicds/vue-toolkit";
// import { niceRate } from "../readable_rates";

function roundedRate(rate: number) {
  // just keep 1 significant digit, for display purposes
  if (rate === 0) return 0;
  const sign = Math.sign(rate);
  const absRate = Math.abs(rate);
  const exponent = Math.floor(Math.log10(absRate));
  const rounded = Math.round(absRate / Math.pow(10, exponent)) * Math.pow(10, exponent);
  return `~${(sign * rounded).toLocaleString('en-US')} × real time`;
}

const store = engineStore();

const emit = defineEmits<{
  (e: "play" | "pause"): void;
  (e: "rate-change", rate: number): void;
}>();

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
  /** button color (CSS color). */
  color?: string;
  /** hide the rate changers */
  hideRateChangers?: boolean;
  /** hide reverse */
  hideReverse?: boolean;
  /** hide home button */
  hideHomeButton?: boolean;
}>();

// whether time is running. v-model so the parent can pause it (e.g. when scrubbing)
const playing = defineModel<boolean>({ default: false });
const rate = defineModel<number>("rate", { required: true, default: 1 });
// SpeedControl's reverse button
const reverse = defineModel<boolean>("reverse", { default: false });

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

const speedControlRef = useTemplateRef<InstanceType<typeof SpeedControl>>("speedControlRef");
// SpeedControl has only 1 computed property. Claude found a way (specific to vue 3.5.44) to get a reference.
function findPlaybackRate(): WritableComputedRef<number> | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let link = (speedControlRef.value?.$.effect as any)?.deps;
  while (link) {
    if (link.dep.computed?.setter) return link.dep.computed;
    link = link.nextDep;
  }
}

onMounted(() => {
  const playbackRate = findPlaybackRate();
  console.log(speedControlRef.value);
  if (!playbackRate) {
    console.warn("SpeedControl's playbackRate not found");
    return;
  }
  playbackRate.value = rate.value; // initialize
  watch(
    rate,
    (r) => {
      if (r !== undefined && r !== playbackRate.value) playbackRate.value = r;
    },
    { immediate: true },
  );
  watch(playbackRate, (r) => {
    rate.value = r;
  });
});

watch(playing, (play: boolean) => {
  if (play) {
    emit("play");
  } else {
    emit("pause");
  }
});

const setTime = () => store.setTime(new Date(selectedDateTime.value + "Z"));
</script>

<style lang="less">
fieldset#wwt-time-control {
  --spacing: 0.5em;
  pointer-events: auto; // #wwt-overlay turns them off
  display: flex;
  flex-direction: column;
  font-size: 12px;
  font-family: monospace;
  gap: var(--spacing);
  border: none; // the browser's default fieldset border

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
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing);
  }

  // SpeedControl's icons come in two sizes (18px mdi "play backwards", 12px font-awesome
  // for the rest); make them all 15px so the buttons match. !important beats the
  // icons' inline sizes
  .icon-wrapper > .v-icon {
    font-size: 15px !important;
    width: 15px !important;
    height: 15px !important;
  }

  .wwt-rate {
    text-align: center;
  }

  // match the 2px borders on the icon buttons (vuetify's outlined default is thin, 1px)
  .wwt-now-button {
    border-width: 2px;
  }
}

@media (width <= 600px) {
  #speed-control.wwt-speed-control #speed-buttons {
    gap: 12px;
  }

  fieldset#wwt-time-control .icon-wrapper {
    padding: 6px !important;

    > .v-icon {
      font-size: 12px !important;
      width: 12px !important;
      height: 12px !important;
    }
  }
}

.wwt-speed-control.hide-reverse #speed-buttons {

  > .icon-wrapper:first-child {
    display: none;
  }
}

.wwt-speed-control.no-rate-controls #speed-buttons {

  > #slow-down.icon-wrapper {
    display: none;
  }
  > #speed-up.icon-wrapper {
    display: none;
  }
}

.wwt-speed-control.hide-home #speed-buttons {

  > #reset.icon-wrapper {
    display: none;
  }
}
</style>
