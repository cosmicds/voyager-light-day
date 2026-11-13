<!-- eslint-disable vue/max-attributes-per-line -->
<template>
  <!-- the vars go on the root so the tabs, the close icon and every TabPage
       inherit the same set -->
  <v-card
    class="cds-info-sheet"
    color="var(--info-sheet-bg)"
    :style="cssVars"
    height="100%"
    tabindex="-1"
  >
    <!-- Vuetify gives the unselected tab tabindex="-1" (the ARIA roving-tabindex
         pattern, where arrow keys move between tabs) but its own arrow handling
         does not fire here, leaving that tab unreachable by keyboard. Drive it
         ourselves. -->

    <!-- mandatory gets rid of a recursion when v-if'ing away TabPages
     by default has a mandatory = force, means vuetify will pick a tab if nothing is selected
     so if we are v-if'ing away what is selected, this created a cycle where because what is v-if'd
     controls what tabs are available, and so it would spiral. but we don't want that behavior anyway. 
     we want mandatory = true so the user (or the app) has to select a tab. 
      -->
    <v-tabs
      v-if="!hideTabs"
      v-model="tabName"
      :mandatory="true"
      class="cds-info-sheet-tabs"
      color="var(--info-sheet-tab-color)"
      slider-color="var(--info-sheet-slider-color)"
      density="compact"
      :align-tabs="props.alignTabs ?? 'end'"
      @keydown.left.prevent="cycleTab(-1)"
      @keydown.right.prevent="cycleTab(1)"
    >
      <v-tab
        v-for="whichTab in visibleTabs"
        :key="whichTab.value"
        :value="whichTab.value"
        class="cds-info-sheet-tab"
        :class="{ 'cds-info-sheet-tab-compact': compactTabs }"
        :ripple="false"
        tabindex="0"
      >
        <h3>{{ whichTab.title }}</h3>
      </v-tab>
    </v-tabs>
    <!-- v-else to preserve space for tabs. With the tabs hidden this row is the
         only chrome the sheet has, so a `headerTitle` turns it into a proper
         header rather than leaving the close button floating on its own. -->
    <div
      v-else-if="closable"
      class="cds-info-sheet-tabs cds-info-sheet-header"
      style="height: 36px"
    ></div>

    <CloseButton
      v-if="closable"
      id="close-text-icon"
      label="Close Information Sheet"
      @click="handleClose"
    />
    <!-- Information Content -->
    <!-- mandatory for the same same reason  -->
    <v-window
      id="info-sheet-window"
      v-model="tabName"
      :mandatory="true"
    >
      <slot />
    </v-window>
  </v-card>
</template>

<script scoped lang="ts">
import type { InjectionKey, Ref } from "vue";
export const injectionKey = Symbol("vTabs") as InjectionKey<{
  withinTabs: boolean;
  registerTab: (value: string, title: string) => number;
  unregisterTab: (value: string) => boolean;
  activeTab: Readonly<Ref<string>>;
  activateTab: (value: string) => void;
}>;

export interface Props {
  /** tab labels and the close icon */
  tabColor?: string;
  /** the bar under the selected tab. Defaults to `tabColor`. */
  sliderColor?: string;
  /* text color for content of each TabPage --info-sheet-text-color */
  textColor?: string;
  /* --info-sheet-accent-color */
  accentColor?: string;
  /** the sheet's background --info-sheet-bg */
  bgColor?: string;
  /** each TabPage's background. Transparent by default, so `bgColor` shows through. */
  pageColor?: string;
  /** hide the tab bar, preserves some space for the close button if present */
  hideTabs?: boolean;
  /** show the close button. Default: true */
  closable?: boolean;
  /** move tabs left, right or center */
  alignTabs?: "start" | "center" | "end" | "title";
  /** only show the active tab */
  onlyShowOne?: boolean;
  /** make the tabs more compact */
  compactTabs?: boolean;
  /** set an explicit tab order. useful if dynamically populating slots.  */
  tabOrder?: string[];
}
</script>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { provide, readonly } from "vue";
import { CloseButton } from "@cosmicds/vue-toolkit";

const props = withDefaults(defineProps<Props>(), {
  closable: true,
  compactTabs: false,
});

const emit = defineEmits(["close", "update:tabName"]);

function handleClose() {
  emit("close");
}

// adapted from https://vueschool.io/articles/vuejs-tutorials/tightly-coupled-components-vue-components-with-provide-inject/
interface TabSpec {
  title: string;
  value: string;
}

/** this will hold the list of tabs that get registered by child TabPage components */
const tabs = ref<TabSpec[]>([]);
const visibleTabs = computed(() => {
  if (props.onlyShowOne) {
    return tabs.value.filter((tab) => tab.value === tabName.value);
  }
  if (props.tabOrder) {
    // sort the tabs according to the order specified in props.tabOrder
    return props.tabOrder
      .map((value) => tabs.value.find((tab) => tab.value === value))
      .filter((tab) => tab !== undefined);
  }
  return tabs.value;
});

/** name of the currently selected tab. kebab-case of the tab `title` if `value` not set */
const tabName = defineModel<string>("tab", { default: "" });
/** index of currently selected tab */
const tabIndex = defineModel<number>("index", { default: 0 }); // see tab index is what is given to v-tabs and v-window, which work via the index

const indexOfTab = (value: string) => tabs.value.findIndex((tab) => tab.value === value);

watch(tabIndex, (newTab) => {
  const spec = tabs.value[newTab];
  if (spec === undefined) {
    console.warn(`tab index ${newTab} is out of range: ${tabs.value.length} tab(s) registered`);
    return;
  }
  tabName.value = spec.value;
});

// flush: post, and watch tabs.length so that children mounted
// from a v-if can (un)register before we look-up the index.
watch(
  [tabName, () => tabs.value.length],
  () => {
    const index = indexOfTab(tabName.value);
    if (index !== -1) {
      tabIndex.value = index;
      return;
    }
    if (tabs.value.length === 0) {
      // nothing has registered yet;
      return;
    }
    if (tabName.value === "") {
      // default to the first tab.
      tabName.value = tabs.value[0].value;
      return;
    }
    console.warn(`tabName ${tabName.value} not found in tabs: ${tabs.value.map((tab) => tab.value).join(", ")}`);
  },
  { flush: "post" },
);

// This function will allow the child `TabPage` to register their title
// with the parent `TabbedSheet`
function registerTab(value: string, title: string) {
  const existing = indexOfTab(value);
  if (existing !== -1) return existing;
  tabs.value.push({ value, title });
  return tabs.value.length - 1;
}

/* we don't actually use this. it just came from the vueschool article */
function activateTab(value: string) {
  tabName.value = value;
}

function unregisterTab(value: string) {
  const index = indexOfTab(value);
  if (index !== -1) {
    tabs.value.splice(index, 1);
    return true;
  }
  return false;
}

// left/right through the tabs, wrapping, then move focus to the new one so the
// keyboard user can see where they are
function cycleTab(delta: number) {
  const count = tabs.value.length;
  if (count < 2) {
    return;
  }
  const current = indexOfTab(tabName.value);
  tabName.value = tabs.value[(current + delta + count) % count].value;
  nextTick(() => {
    const selected = document.querySelector<HTMLElement>(".cds-info-sheet-tab.v-tab--selected");
    selected?.focus();
  });
}

// This is where the magic happens.
// The provide function exposes the data to the child
// The injection key is a unique identifier so that we can
// "pickup" the data in the child using the same key
provide(injectionKey, {
  // This is just a good way for us to check in the child that the `vTabPanel`
  // was correctly used in the context of the `vTabs` component
  withinTabs: true,

  // We expose the 2 functions defined above to the child
  registerTab,
  activateTab,
  unregisterTab,

  // We expose the active tab to the child
  // but notice we use readonly to keep the child from directly mutating it
  activeTab: readonly(tabName),
});

const cssVars = computed(() => {
  return {
    "--info-sheet-bg": props.bgColor ?? "rgb(var(--v-theme-surface))",
    "--info-sheet-page-bg": props.pageColor ?? "transparent",
    "--info-sheet-text-color": props.textColor ?? "rgb(var(--v-theme-on-surface))",
    "--info-sheet-accent-color": props.accentColor ?? "rgb(var(--v-theme-primary))",
    "--info-sheet-tab-color": props.tabColor ?? "rgb(var(--v-theme-primary))",
    "--info-sheet-slider-color": props.sliderColor ?? "var(--info-sheet-tab-color)",
  };
});
</script>

<style scoped lang="less">
.cds-info-sheet {
  .cds-info-sheet-tab h3 {
    font-size: 1em;
  }

  // use this to make the tabs narrower
  // the double .v-tab is used to beat vuetify's specificity.
  .cds-info-sheet-tab.cds-info-sheet-tab-compact.v-btn.v-tab.v-tab {
    padding-inline: 4px;
    margin-inline: 2px;
    min-width: 0px;
  }

  .cds-info-sheet-tab.v-btn.v-tab.v-tab.v-tab--selected {
    background-color: rgba(255, 255, 255, 0.05);
  }

  .cds-info-sheet-tabs {
    width: calc(100% - 3em);
    align-self: left;
  }

  // make the window and window__container (where the info page goes)
  // fill the space below the tabs
  #info-sheet-window {
    display: flex;
    flex-direction: column;
    // scoped, so need :deep
    :deep(.v-window__container) {
      flex-grow: 1;
      height: 100%;
    }
    height: calc(100% - 36px);
    overflow-y: auto;
  }

  #close-text-icon {
    position: absolute;
    top: 0.5em;
    right: calc((3em - 0.6875em) / 3); // font-awesome-icons have width 0.6875em
    color: var(--info-sheet-tab-color, white);
  }

  #close-text-icon {
    top: 0.5em;
    right: calc((2em - 0.6875em) / 3);
  }

  :deep(.tab-page) {
    a {
      color: currentColor;
      text-decoration-style: dotted;
    }

    h3 {
      font-size: 1.4em;
    }

    h4 {
      font-size: 1.2em;
    }

    h5 {
      font-size: 1em;
      font-weight: bold;
      margin-top: 1em;
    }

    li {
      margin-block: 0.5em;
    }

    details {
      user-select: none;
      margin-block: 0.5em;
      outline: 1px solid rgba(255, 255, 255, 0.5);
      padding: 2px 1em;
      border-radius: 2px;
      cursor: pointer;
    }
    details:hover {
      outline: 2px solid #aeaeae;
    }

    pre {
      background-color: rgb(50, 50, 50);
      padding: 0.5em;
      font-family: "Courier New", Courier, monospace;
      font-size: 0.8em;
    }

    .bullet-icon {
      color: currentColor;
      width: 1.2em;
      padding-right: 0.5em;
    }
  }
}
</style>
