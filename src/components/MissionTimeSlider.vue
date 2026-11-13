<template>
  <div class="mission-time-slider">
    <span class="mission-time-end">{{ endLabel(start) }}</span>
    <v-slider
      :model-value="fraction"
      :min="0"
      :max="1"
      :step="0"
      no-keyboard
      density="compact"
      hide-details
      color="white"
      track-fill-color="primary"
      thumb-color="primary"
      :aria-label="label ?? 'Mission time'"
      @keydown="onKeydown"
      @update:model-value="(f: number) => setTime(toTime(f))"
    />
    <span class="mission-time-end">{{ endLabel(end) }}</span>
    <span class="mission-time-now">{{ label ?? nowLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { engineStore } from "@wwtelescope/engine-pinia";

// Scrubs WWT's clock from start to end on a 0–1 slider: linear, or with `logScaleDays` (τ) logarithmic
// in time since `start`, fraction = ln(1 + dt/τ) / ln(1 + span/τ), so early times get more room.
// Times snap to `stepMs`. Arrow keys move the clock one step (shift: 60), Page Up/Down 1% of the slider.
const props = defineProps<{
  start: Date;
  end: Date;
  stepMs: number;
  /** τ: smaller gives the start more room. Omit for linear */
  logScaleDays?: number;
  /** shown instead of the current time */
  label?: string;
}>();

const store = engineStore();

const DAY_MS = 86400000;
const span = computed(() => props.end.getTime() - props.start.getTime());
const tau = computed(() => (props.logScaleDays ?? 0) * DAY_MS);
const logSpan = computed(() => Math.log1p(span.value / tau.value));

// slider fraction (0–1) ↔ time since start (ms)
const ease = (dt: number) => (tau.value ? Math.log1p(dt / tau.value) / logSpan.value : dt / span.value);
const unease = (f: number) => (tau.value ? tau.value * Math.expm1(f * logSpan.value) : f * span.value);

const toTime = (f: number) => new Date(props.start.getTime() + unease(f));

const fraction = computed(() => {
  const dt = Math.max(store.currentTime.getTime() - props.start.getTime(), 0);
  return Math.min(ease(dt), 1);
});

// years for long spans, dates for short ones
const endLabel = (date: Date) =>
  span.value > 2 * 365 * DAY_MS ? `${date.getUTCFullYear()}` : date.toISOString().slice(0, 10);

function setTime(time: Date) {
  const start = props.start.getTime();
  const end = props.end.getTime();
  const t = Math.min(Math.max(time.getTime(), start), end);
  // snapping can round past the end (the event slider's end is off the step grid), into the next event's window
  store.setTime(new Date(Math.min(start + Math.round((t - start) / props.stepMs) * props.stepMs, end)));
}

function onKeydown(e: KeyboardEvent) {
  const step = (e.shiftKey ? 60 : 1) * props.stepMs;
  const now = store.currentTime.getTime();
  let time: Date;
  switch (e.key) {
  case "ArrowRight":
  case "ArrowUp":
    time = new Date(now + step);
    break;
  case "ArrowLeft":
  case "ArrowDown":
    time = new Date(now - step);
    break;
  case "PageUp":
    time = toTime(fraction.value + 0.01);
    break;
  case "PageDown":
    time = toTime(fraction.value - 0.01);
    break;
  case "Home":
    time = props.start;
    break;
  case "End":
    time = props.end;
    break;
  default:
    return;
  }
  e.preventDefault();
  setTime(time);
}

const nowLabel = computed(() => store.currentTime.toISOString().replace("T", " ").slice(0, 16) + " UT");
</script>

<style lang="less">
.mission-time-slider {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 0.75em;
  padding: 0 0.75em;
  font-family: monospace;
  font-size: 12px;
  background-color: rgba(3, 1, 37, 0.8);
  border-radius: 6px;

  .v-slider {
    flex: 1 1 auto;
  }

  .mission-time-now {
    min-width: 17ch;
    text-align: right;
  }
}
</style>
