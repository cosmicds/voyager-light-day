<template>
  <v-overlay
    class="splash-overlay"
    :model-value="showSplashScreen"
    :scrim="false"
    absolute
    :style="cssVars"
    transition="fade-transition"
  >
    <focus-trap :active="showSplashScreen">
      <div
        id="splash-screen"
        v-click-outside="closeSplashScreen"
        :style="cssVars"
        :class="{ 'is-fullscreen': props.fullscreenOnSmall }"
      >
        <div class="background">
          <div class="background-blur"></div>
        </div>
        <slot />

        <div
          v-if="!props.hideButton"
          class="splash-cta"
        >
          <v-btn
            class="splash-get-started"
            color="secondary"
            variant="elevated"
            rounded="lg"
            tabindex="0"
            :disabled="props.disabled"
            @click="closeSplashScreen"
          >
            {{ props.loaded ? "Get Started" : "Loading..." }}
          </v-btn>
        </div>

        <div class="splash-acknowledgements">
          <slot name="credits">
            <p class="splash-credits">
              This Data Story is brought to you by
              <a
                href="https://www.cosmicds.cfa.harvard.edu/"
                target="_blank"
                rel="noopener"
              >Cosmic Data Stories</a>
              and
              <a
                href="https://www.worldwidetelescope.org/home/"
                target="_blank"
                rel="noopener"
              >
                WorldWide Telescope </a>.
            </p>
          </slot>
          <div class="splash-logos">
            <credit-logos
              class="splash-credit-logos"
              logo-size="clamp(22px, 4vmin, 60px)"
              :default-logos="['cosmicds', 'wwt', 'nasa']"
              :extra-logos="cfaExtraLogo"
            />
          </div>
        </div>
        <CloseButton
          class="splash-close-button"
          label="Close Splash Screen"
          :disabled="props.disabled"
          @click="closeSplashScreen"
        />
      </div>
    </focus-trap>
  </v-overlay>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { FocusTrap } from "focus-trap-vue";
import { CreditLogos } from "@cosmicds/vue-toolkit";
import { CloseButton } from "@cosmicds/vue-toolkit";

const cfaExtraLogo = [
  {
    src: "./CfA_Logo_Vertical_Reverse.png",
    href: "https://www.cfa.harvard.edu/",
    alt: "Center for Astrophysics | Harvard & Smithsonian Logo",
    name: "cfa",
  },
];

export interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cssVars?: Record<string, any>;
  color?: string;
  highlightColor?: string;
  loaded?: boolean;
  /** an optional background image. this will go into a css url(<background>)
   * If in public: ./background.jpg, if in src: @/assets/background.jpg
   */
  backgroundImage?: string;
  /** hide the built-in "Get Started" button, e.g. when your own slot content has its own CTA */
  hideButton?: boolean;
  /** disable the close button and "Get Started" button, e.g. while the app isn't ready to be shown yet */
  disabled?: boolean;
  /** on a small screen ( < 310px wide), cover the
   * whole viewport instead of floating as a bordered card */
  fullscreenOnSmall?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  cssVars: () => ({}),
  loaded: true,
  color: "white",
  highlightColor: "white",
  disabled: false,
});

const cssVars = computed(() => {
  return {
    ...props.cssVars,
    "--accent-color": props.color,
    "--background-image": props.backgroundImage ? `url("${props.backgroundImage}")` : "none",
    "--background-opacity": props.backgroundImage ? 1 : 0.8,
  };
});

const emits = defineEmits(["close"]);

const showSplashScreen = defineModel<boolean>({ default: true });

// watch(() => props.loaded, (l) =>{
//   if (l) {
//     setTimeout( () => {
//       showSplashScreen.value = false;
//     }, 5000)
//   }
// })

function closeSplashScreen() {
  if (props.disabled) return;
  showSplashScreen.value = false;
  emits("close");
}
</script>

<style lang="less">
.splash-overlay {
  align-items: center;
  justify-content: center;
  // fluid type/spacing
  // https://piccalil.li/blog/fluid-typography-with-css-clamp/,
  // https://www.kevinpowell.co/article/typographic-scale/. also see Scott
  --scale: 1.3333; // perfect fourth
  --fs-0: min(9vw, 6vh); // title / lead-in - .splash-overlay's font-size, inherited
  --fs-1: calc(var(--fs-0) / var(--scale)); // description
  --fs-2: calc(var(--fs-1) / var(--scale)); // button label
  --fs-3: calc(var(--fs-2) / var(--scale));
  --fs-4: calc(var(--fs-3) / var(--scale));
  --fs-5: calc(var(--fs-4) / var(--scale)); // credits line
  font-size: var(--fs-0);
  transition:
    width 0.5s,
    height 0.5s;
}

.v-fade-transition-enter-active,
.v-fade-transition-leave-active {
  transition-duration: 6000ms !important;
}

#splash-screen {
  color: white;
  user-select: none;
  // https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/contain
  contain: paint; // this is like a a super overflow: hidden

  // one continuous curve from phone to desktop instead of a breakpoint jump -
  // grows with the viewport, floored so it's never cramped, capped so it
  // never sprawls on a big monitor
  max-width: clamp(280px, 90vw, 640px);
  max-height: clamp(320px, 85vh, 700px);
  --border-radius: 30px;
  --border-max: 6px;
  --border-min: 2px;
  --border-thickness: clamp(var(--border-min), 0.4vmax, var(--border-max));

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-content: center;
  gap: 0.4em;
  padding-top: 1rem;
  padding-bottom: 1rem;
  // shrinks toward 8px on a narrow phone instead of staying a flat 2rem -
  --panel-padding-inline: clamp(8px, 2vw, 2rem);
  padding-inline: var(--panel-padding-inline);

  border-radius: var(--border-radius);
  border: var(--border-thickness) solid var(--accent-color);
  overflow: auto;
  // switch the fallback fonts to serif for debugging
  font-family: "Highway Gothic Narrow", "Roboto", sans-serif;

  .background {
    position: fixed;
    inset: 0;
    background-color: black;
    background-image: var(--background-image);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    opacity: var(--background-opacity);
    // dims a background photo enough to keep text over it legible; has no
    // visible effect on the plain black fallback
    filter: brightness(0.7);
    contain: strict;
    z-index: -1;
    // we do not need the border radius because of the contain: paint on the #splash-screen
    // but if we did, we'd need to account for the border thickness since this border is nested inside the other
    // border-radius: calc (var(--border-radius) - var(--border-thickness));
  }

  .background-blur {
    backdrop-filter: blur(6px) saturate(1);
    position: fixed;
    inset: 0;
    border-radius: var(--border-radius);
  }

  div {
    margin-inline: auto;
    text-align: center;
  }

  a {
    color: white;
  }
  // make a paragraph inside the div centered horizontally and vertically
  p {
    vertical-align: middle;

    font-size: var(--fs-1);
    font-weight: normal;
    line-height: 1.4;
  }

  // lead-in above the title, e.g. "Explore" before "THE NIGHT SKY" - same
  // size as the title, differs only by weight
  .splash-lead {
    font-size: var(--fs-0);
    line-height: inherit;
    font-weight: normal;
  }

  // allow us to also highlight a <p> or a <span>
  .highlight {
    font-size: var(--fs-0);
    line-height: inherit;
    color: var(--accent-color);
    text-transform: uppercase;
    font-weight: bold;
  }

  // "brought to you by..." - placed above the logos, matching the fleet.
  // named splash-credits, not "small" - this file is unscoped
  .splash-credits {
    font-size: var(--fs-4);
    font-weight: normal;
    margin-block: 0.4em;
  }

  .splash-close-button {
    position: absolute;
    top: 20px;
    right: 20px;
    text-align: end;
    font-size: min(5vw, 4vh);
    padding: 0.25rem;
    margin: -0.25rem;
  }

  .splash-content {
    display: flex;
    flex-direction: column;
    gap: 0.3em;
    line-height: 1.3;
    margin-top: 0.5em;
  }

  .splash-get-started {
    border: 2px solid white;
    font-size: var(--fs-2);
    font-weight: bold !important;
    // override the vuetify passing to be responsive
    padding-inline: 1.2em !important;
    height: auto !important;
    min-height: 2.2em !important;
  }

  .splash-acknowledgements {
    font-size: var(--fs-0);
    line-height: clamp(1rem, 2.2vmin, 1.6rem);
  }

  // the logo row can't wrap (#icons-container below is nowrap), so on a
  // narrow phone it's often wider than its box - flex + justify-content
  // keeps it centered as it overflows; margin: auto doesn't, it just
  // collapses to 0 and overflows to one side
  .splash-logos {
    display: flex;
    justify-content: center;
  }

  .splash-credit-logos {
    // don't wrap the logos - if they don't fit then shrink them
    // so we have to overrid #icons-container from CreditLogos
    #icons-container {
      white-space: nowrap;
      width: fit-content;
    }

    img {
      vertical-align: middle;
      margin-inline: 0.2em;
      margin-block: 0.25em;
    }

    // size the CfA logo so that it's height matches the others
    .logo-cfa img {
      width: auto;
      height: auto;
      max-height: var(--logo-size);
      max-width: 110px;
    }

    svg {
      vertical-align: middle;
      height: 24px;
    }
  }

  @media (max-height: 500px) {
    overflow: hidden;

    .splash-content {
      line-height: 115%;
    }
  }

  @media (max-height: 310px) {
    gap: 0.25em;
    padding-block: 0.5rem;

    // use this instead of v-if. the images still load though, but
    // lets me get rid of the extra js.
    .splash-acknowledgements {
      display: none;
    }
  }

  &.is-fullscreen {
    // set by the prop fullscreenOnSmall. only applies on small screens
    // the 310px size is pretty useless, but also doesn't seem wholly necessary
    // on vuetify's xs size <600px
    @media (max-width: 310px) {
      max-width: 100vw;
      max-height: 100vh;
      width: 100vw;
      height: 100vh;
      border-width: 6px;
      border-radius: 0;
    }
  }
}
</style>
