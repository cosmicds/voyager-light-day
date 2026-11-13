<template>
  <v-dialog
    v-model="open"
    :persistent="persistent"
    :width="width"
    :max-width="maxWidth"
    :scrim="scrim"
    :activator="activator"
  >
    <template v-if="ownButton || $slots.activator" #activator="activatorScope">
      <slot name="activator" v-bind="activatorScope">
        <v-btn v-bind="activatorScope.props">
          Open Dialog
        </v-btn>
      </slot>
    </template>
    <v-card v-bind="cardProps" density="compact">
      <v-card-title v-if="title">
        <span class="closable-dialog-title"> {{ title }}</span>
      </v-card-title>
      <v-card-text>
        <slot />
      </v-card-text>
      <!-- placed last so that it is last in DOM order -->
      <CloseButton
        class="closable-dialog-close-button"
        color="primary"
        label="Close Dialog"
        @click="open = false"
      />
    </v-card>
  </v-dialog>
    
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { VCard, type VDialog } from 'vuetify/components';
import { makeVCardProps } from 'vuetify/lib/components/VCard/VCard.js';
import { CloseButton } from "@cosmicds/vue-toolkit";
const open = defineModel('modelValue', { type: Boolean, default: false });

const props = defineProps({
  ...makeVCardProps(),
  // Add any additional props here if needed
  title: {
    type: String,
    default: undefined,
  },
  persistent: {
    type: Boolean,
    default: true,
  },
  scrim: {
    type: Boolean,
    default: false,
  },
  ownButton: {
    type: Boolean,
    default: false,
  },
  activator: {
    type: [String, Object] as PropType<VDialog['$props']['activator']>,
    default: undefined,
  },
});

const cardProps = computed(() => ({ ...VCard.filterProps(props), title: undefined })); // title is drawn in our own v-card-title

</script>

<style scoped>
.closable-dialog-close-button {
  position: absolute;
  top: 0.55rem;
  right: 0.75rem;
}

</style>