import { computed } from "vue";
import { useDisplay } from "vuetify";
import { supportsTouchscreen } from "@cosmicds/vue-toolkit";

let layout: ReturnType<typeof createAppLayout> | null = null;

function createAppLayout() {
  /* Properties related to device/screen characteristics */
  const { xs, smAndDown, width: viewportWidth, height: viewportHeight } = useDisplay();
  const isVertical = computed(() => viewportHeight.value > viewportWidth.value);
  const smallSize = computed(() => smAndDown.value);
  const isLandscape = computed(() => viewportWidth.value > viewportHeight.value * 1.25);
  // show side panel if clearly landscape, or a large screen must be just not portrait (it can be barely landscape).
  // if we're even close to vertical on a small screen, push up instead of from the side.
  const sidePanel = computed(() => isLandscape.value || (!smallSize.value && !isVertical.value));
  // a phone. Not `smallSize`, which reaches to 960.
  const isMobile = computed(() => xs.value);
  const touchscreen = supportsTouchscreen();

  // adapted from why-roman roomy layout
  const ROOMY_MIN_HEIGHT = 600;
  const floatingPanel = computed(() => sidePanel.value && !smallSize.value && viewportHeight.value >= ROOMY_MIN_HEIGHT);

  return {
    viewportWidth,
    viewportHeight,
    smallSize,
    isLandscape,
    sidePanel,
    floatingPanel,
    isMobile,
    touchscreen,
  };
}

// `useDisplay` injects, so the first call has to come from a component setup.
export function useAppLayout() {
  if (!layout) {
    layout = createAppLayout();
  }
  return layout;
}
