<template>
  <div class="crossfade-slider">
    <!-- without the key, you get a warning about them having the same key -->
    <slot 
      key="left"
      name="label" 
      :label="leftLabel" 
      :active="crossfade === 0"
      :layer="left"
      :on="{ onClick: selectLeft }"
    >
      <button
        class="crossfade-label"
        @click="selectLeft"
      >
        {{ leftLabel }}
      </button>
    </slot>
    <v-slider
      v-model="crossfade"
      class="crossfade-scrubber"
      :max="1"
      :min="0"
      :step="0.01"
      hide-details
    ></v-slider>
    <slot 
      key="right"
      name="label" 
      :label="rightLabel" 
      :active="crossfade === 1"
      :layer="right"
      :on="{ onClick: selectRight }"
    >
      <button
        class="crossfade-label"
        @click="selectRight"
      >
        {{ rightLabel }}
      </button>
    </slot>
  </div>
</template>

<script setup lang="ts">
import type { ImageSetLayer } from "@wwtelescope/engine";
import { watch } from "vue";

const props = defineProps<{
  left: ImageSetLayer;
  right: ImageSetLayer;
  leftLabel: string;
  rightLabel: string;
}>();

/* v-model for the crossfade value between 0 and 1, default 0. */
const crossfade = defineModel<number>({default: 0});

watch(crossfade, (v) => {
  props.left.set_opacity(1 - v);
  props.right.set_opacity(v);
}, { immediate: true });

const selectLeft = () => crossfade.value = 0;
const selectRight = () => crossfade.value = 1;

defineSlots<{
  /** What to use for the labels. Same component for both left and right label */
  label: (props: { label: string, active: boolean, key: "left" | "right", layer: ImageSetLayer, on: { onClick: () => void } }) => void;
}>();

</script>

<style lang="less">
.crossfade-slider {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  pointer-events: auto;
  width: 50%;
  max-width: 400px;


  .crossfade-label {
    user-select: none;
    padding: 4px 8px;
    border-radius: 4px;
    background-color: rgba(0, 0, 0, 0.8);
    cursor: pointer;

    &:hover {
      outline: 3px solid rgb(var(--v-theme-primary));
    }
  }

  .crossfade-scrubber {
    flex: 1;
  }
}
</style>
