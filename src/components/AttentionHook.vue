<template>
  <div
    v-show="visible"
    ref="hook"
    class="attention-hook"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted, useTemplateRef } from "vue";



interface Props {
  visible?: boolean;
  bounceAmount?: string;
  bounceDuration?: number;
  betweenBouncesDuration?: number;
  bounceCount?: number;
  popupTime?: number;
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  bounceAmount: "10%",
  bounceDuration: 500,
  betweenBouncesDuration: 1000,
  bounceCount: Infinity,
  popupTime: 500,
});

// the toolkit's createBounceKeyframes / createBounceAnimation, but sideways (translateX, not translateY)
function createBounceKeyframes(options: Required<Props>) {
  const totalDuration = options.bounceDuration + options.betweenBouncesDuration;
  const bounceFraction = options.bounceDuration / totalDuration;
  return [
    { transform: "translateX(0)", offset: 0 },
    { transform: `translateX(-${options.bounceAmount})`, offset: 0.5 * bounceFraction },
    { transform: "translateX(0)", offset: bounceFraction },
  ];
}

function createBounceAnimation(element: HTMLElement, options: Required<Props>): Animation {
  const keyframes = createBounceKeyframes(options);
  const totalDuration = options.bounceDuration + options.betweenBouncesDuration;
  return element.animate(keyframes, { duration: totalDuration, iterations: options.bounceCount });
}

const root = useTemplateRef<HTMLElement>("hook");

onMounted(() => {
  setupAnimation();
});

function setupAnimation() {
  const element = root.value;
  if (!element) { return; }
  const popupAnimation = element.animate([
    // in from the right-hand edge
    { transform: "translateX(100%)", offset: 0 },
    { transform: "translateX(0)", offset: 1 },
  ],
  { duration: props.popupTime });
  popupAnimation.finished.then(() => {
    const bounceAnimation = createBounceAnimation(element, props);
    bounceAnimation.play();
  });
  popupAnimation.play();
}

watch(() => props.visible, (visible: boolean) => {
  if (visible) {
    setupAnimation();
  }
});

</script>

<style scoped lang="less">
.attention-hook {
  position: absolute;
  bottom: 10px;
  right: 0px;
  width: 40px;
  height: 40px;
  background: #808080;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  overscroll-behavior-y: contain;
  border: 1px solid rgb(var(--v-theme-secondary));

  &:hover {
    cursor: pointer;
  }

  & .attention-hook-icon {
    color: white;
  }
}

@keyframes pop-up {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(0);
  }
}
</style>
