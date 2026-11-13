<template>
  <v-window-item
    :value="tabValue"
    class="flex-grow-1 tab-page-wrapper"
    :style="cssVars"
  >
    <div
      class="tab-page"
      :class="[`tab-page-${tabValue}`, { 'tab-page-active': _isActive }]"
    >
      <slot />
    </div>
  </v-window-item>
</template>

<script setup lang="ts">
import { inject, computed, onUnmounted } from "vue";

import { injectionKey } from "./TabbedSheet.vue";

const props = defineProps<{
  title: string;
  value?: string;
  bgColor?: string | undefined;
}>();

const cssVars = computed(() => (props.bgColor ? { "--info-sheet-page-bg": props.bgColor } : {}));

const tabsProvider = inject(injectionKey, null);
if (!tabsProvider?.withinTabs) {
  throw new Error("InformationPage must be used within an TabbedSheet");
}

const kebabCase = (str: string) =>
  str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

const tabValue = props.value ?? kebabCase(props.title);

tabsProvider.registerTab(tabValue, props.title);

const _isActive = computed(() => tabsProvider.activeTab.value === tabValue);

onUnmounted(() => {
  const unregisered = tabsProvider.unregisterTab(tabValue);
  if (!unregisered) {
    console.warn(`TabPage "${props.title}" was not unregistered. Check that it was registered properly`);
  } else {
    console.log(`TabPage "${props.title}" unregistered successfully`);
  }
});
</script>

<!-- we also make sure they are "scoped" by specifying them as children of cds-info-sheet belonging in the cds-info-sheet  -->
<style scoped lang="less">
// v-card
.cds-info-sheet .tab-page-wrapper {
  display: block;
  position: relative;
  z-index: 0;

  overflow-x: hidden;
  overflow-wrap: break-word;
  // overscroll-behavior: none;
  background-color: var(--info-sheet-page-bg);

  // takes the place of .scrollable
  overflow-y: visible;
  height: 100%;
}

// the parent is by default display: block,
// so don't define flex attributes here. if you need to, define them
// in the main app
.cds-info-sheet .tab-page {
  line-height: 1.425; // mimic old v-card-text style
  overflow-y: auto;
  height: 100%;
}
</style>
