<template>
  <v-app
    id="app"
    :style="cssVars"
    :class="[
      smallSize ? 'app-is-small' : '',
      kiosk ? 'kiosk' : '',
      drawerOpen && !sidePanel ? 'bottom-drawer-open' : '',
    ]"
  >
    <webgl-test @webgl2-disabled="showWebGL2Warning = true" />

    <!-- This contains the splash screen content -->

    <SplashScreen
      v-model="showSplashScreen"
      :color="accentColor"
      fullscreen-on-small
      :disabled="!ready"
      @close="closeSplashScreen"
    >
      <div class="splash-content">
        <p class="splash-lead">Explore</p>
        <p class="highlight">VOYAGER's</p>
        <p>Journey to</p>
        <p class="highlight">One light-day</p>
        <!-- only until Voyager 1 reaches one light-day -->
        <LightDayCountdown
          v-slot="{ time, past }"
          :target="ONE_LIGHT_DAY"
        >
          <div
            v-if="!past"
            class="splash-countdown"
          >
            <p>
              Voyager 1 will reach one light-day from Earth in
              <span class="light-day-countdown">{{ time }}</span>
            </p>
          </div>
        </LightDayCountdown>
      </div>
    </SplashScreen>

    <v-main>
      <div id="main-content">
        <WorldWideTelescope :wwt-namespace="wwtNamespace"></WorldWideTelescope>
        <!-- should go after <world-wide-telescope /> -->
        <wwt-tracked-content
          :store="store"
          :position="voyager1Location"
          :offset-x="15"
          :offset-y="-5"
        >
          <p
            v-show="showVoyagerLabels"
            class="voyager-label"
            :style="`color: ${VOYAGER_1_COLOR}`"
          >
            <strong>Voyager 1</strong>
          </p>
        </wwt-tracked-content>

        <wwt-tracked-content
          :store="store"
          :position="voyager2Location"
          :offset-x="15"
          :offset-y="-5"
        >
          <p
            v-show="showVoyagerLabels"
            class="voyager-label"
            :style="`color: ${VOYAGER_2_COLOR}`"
          >
            <strong>Voyager 2</strong>
          </p>
        </wwt-tracked-content>
        <wwt-loader v-model="isLoading" />

        <!-- This block contains the elements (e.g. icon buttons displayed at/near the top of the screen) -->

        <div
          v-show="!showSplashScreen"
          id="wwt-overlay"
        >
          <div id="top-content">
            <div id="left-buttons">
              <icon-button
                v-if="!showTour"
                v-model="showTour"
                class="sheet-toggle tour-button"
                icon="signs-post"
                aria-label="Show Tour"
                :color="accentColor"
                :focus-color="accentColor"
                tooltip-text="Show Tour"
                tooltip-location="start"
                size="1x"
              />
              <icon-button
                v-if="!showTour"
                class="sheet-toggle user-guide-button"
                :model-value="showTextSheet && infoSheetTab === 'user-guide'"
                icon="question"
                aria-label="User guide"
                :color="accentColor"
                :focus-color="accentColor"
                tooltip-text="User guide"
                tooltip-location="start"
                size="1x"
                @activate="() => toggleInfoSheetTab('user-guide')"
              />
              <!-- zoom, as in artemis-ii: top of the slider is zoomed in -->
              <div v-if="!xs" id="zoom-controls">
                <button
                  class="zoom-button"
                  aria-label="Zoom in"
                  title="Zoom in"
                  @click="zoomIn"
                >
                  <!-- drawn, not "+" text: font glyphs sit below the middle of the line -->
                  <svg
                    viewBox="0 0 10 10"
                    aria-hidden="true"
                  >
                    <path d="M0 5H10M5 0V10" />
                  </svg>
                </button>
                <input
                  type="range"
                  class="zoom-slider"
                  aria-label="Zoom"
                  title="Zoom"
                  min="0"
                  max="1"
                  step="0.001"
                  :value="zoomSliderValue"
                  @input="onZoomSlider"
                />
                <button
                  class="zoom-button"
                  aria-label="Zoom out"
                  title="Zoom out"
                  @click="zoomOut"
                >
                  <svg
                    viewBox="0 0 10 10"
                    aria-hidden="true"
                  >
                    <path d="M0 5H10" />
                  </svg>
                </button>
              </div>
            </div>
            <div id="center-buttons">
              <div
                v-if="voyagerLightTime"
                id="light-time"
              >
                <div class="light-time-label">Voyager 1's Light Speed Distance from Earth</div>
                <div class="light-time-value">
                  <span class="light-time-label">{{ distanceVerb }}</span><span class="light-time-number">&emsp;{{ voyagerLightTime }}</span>
                </div>
                <div class="light-time-label">
                  on<span class="light-time-date">&emsp;{{ shownDate }}</span>
                </div>
              </div>
            </div>
            <div id="right-buttons">
              <icon-button
                v-if="kiosk && !fullscreen"
                id="fullscreen-icon"
                :icon="fullscreen ? 'compress' : 'expand'"
                aria-label="Make fullscreen"
                :color="accentColor"
                :focus-color="accentColor"
                :tooltip-text="`${fullscreen ? 'Exit' : 'Make'} fullscreen`"
                tooltip-location="start"
                size="1x"
                @activate="fullscreen = !fullscreen"
              />
              <icon-button
                v-if="!showTour || !xs"
                v-model="showControls"
                class="sheet-toggle"
                :icon="showControls ? 'xmark' : 'sliders'"
                :aria-label="showControls ? 'Hide controls' : 'View controls'"
                :color="accentColor"
                :focus-color="accentColor"
                :tooltip-text="showControls ? 'Hide controls' : 'View controls'"
                tooltip-location="start"
                size="1x"
              />
              <div
                v-if="showControls"
                id="frame-controls"
              >
                <v-select
                  v-model="trackingCenter"
                  :items="TRACK_ITEMS"
                  item-color="primary"
                  label="Track (camera center)"
                  density="compact"
                  hide-details
                />
                <!-- log10 of the model's magnification: 0 is actual size -->
                <div class="model-size">
                  <div class="model-size-label">Spacecraft size</div>
                  <v-slider
                    v-model="modelLogScale"
                    :min="MIN_MODEL_SCALE"
                    :max="11"
                    :step="0.01"
                    aria-label="Spacecraft size"
                    density="compact"
                    hide-details
                  >
                    <template #prepend>
                      <span class="model-size-end">1,000x</span>
                    </template>
                    <template #append>
                      <span class="model-size-end">Even larger!</span>
                    </template>
                  </v-slider>
                </div>
                <div class="model-visibility">
                  <v-checkbox
                    v-model="showVoyagerModels"
                    label="Show Voyager models"
                    density="compact"
                    hide-details
                  />
                  <v-checkbox
                    v-model="showVoyagerLabels"
                    label="Show Voyager labels"
                    density="compact"
                    hide-details
                  />
                </div>
                <!-- <div class="playback-rate-input">
                  <v-text-field
                    v-model.number="playbackRate"
                    label="Playback rate (seconds per second)"
                    type="number"
                    density="compact"
                    hide-details
                  />
                </div> -->
              </div>
            </div>
          </div>

          <!-- <v-btn
            density="compact"
            variant="outlined"
            style="margin-top: auto; align-self: center; pointer-events: auto"
            @click="_logView"
          >
            Log view
          </v-btn> -->

          <div id="bottom-content">
            <!-- play/pause + speed to the left of the timeline; below it on small screens (see CSS) -->
            <div
              id="timeline"
              :class="{ 'in-tour': showTour, 'with-mission-slider': !showTour && !xs }"
            >
              <wwt-time-control
                v-model="timePlaying"
                v-model:rate="playbackRate"
                v-model:reverse="playbackReversed"
                hide-time-input
                hide-set-time
                hide-status
                :color="accentColor"
                hide-rate-changers
                hide-home-button
                :hide-now="showTour"
                @play="playClickedCounter.increment()"
                @now="goToNowView"
              />
              <!-- the whole mission, log in time since launch -->
              <MissionTimeSlider
                v-if="!showTour"
                v-show="!xs"
                id="mission-slider"
                :start="voyagerSpan.start"
                :end="voyagerSpan.end"
                :step-ms="SLIDER_STEP_MS"
                hide-time
                @mousedown="missionSliderUses.increment()"
              />
              <MissionTimeSlider
                v-else
                v-show="(!TOUR_EVENTS[tour.stepIndex.value]?.noSlider || sidePanel) && (!xs)"
                id="event-slider"
                :class="{ 'outside-step': outsideStepWindow }"
                :inert="outsideStepWindow"
                :start="stepWindow.start"
                :end="stepWindow.end"
                :step-ms="SLIDER_STEP_MS"
                color="tour-accent"
                hide-time
                @mousedown="missionSliderUses.increment()"
              />
            </div>
            <!-- the countdown opens above its button, mirroring #frame-controls below the controls button.
                 On small screens it'd push the time controls off center, so it moves up under the controls button -->
            <Teleport
              to="#right-buttons"
              :disabled="!smallSize"
              defer
            >
              <div id="countdown-control">
                <icon-button
                  v-model="showCountdown"
                  class="sheet-toggle"
                  :icon="showCountdown ? 'xmark' : 'alarm-clock'"
                  :aria-label="showCountdown ? 'Hide countdown' : 'Countdown to one light-day'"
                  :color="accentColor"
                  :focus-color="accentColor"
                  :tooltip-text="showCountdown ? 'Hide countdown' : 'Countdown to one light-day'"
                  tooltip-location="start"
                  size="1x"
                />
                <div
                  v-if="showCountdown"
                  id="countdown-panel"
                >
                  <LightDayCountdown
                    v-slot="{ time, past }"
                    :target="ONE_LIGHT_DAY"
                  >
                    <template v-if="past">
                      Voyager 1 reached one light-day from Earth
                      <span class="light-day-countdown">{{ time }}</span> ago
                    </template>
                    <template v-else>
                      Voyager 1 will reach one light-day from Earth in
                      <span class="light-day-countdown">{{ time }}</span>
                    </template>
                  </LightDayCountdown>
                </div>
              </div>
            </Teleport>
          </div>

          <!-- credit logos $logo-credits.cds-bottom-credits -->
          <credit-logos
            v-if="!xs && !(showTour && !sidePanel)"
            class="cds-bottom-credits"
            :default-logos="['cosmicds', 'wwt', 'nasa']"
            :logo-size="xs ? '1.5em' : '2em'"
            :extra-logos="extraLogos"
          />
        </div>
      </div>
    </v-main>

    <!--
    This contains the tour and the user guide.
    It's an in-flow flex sibling of #main-content, so opening it shrinks the WWT view
    (from the side normally, from the bottom on small screens) instead of covering it.
  -->

    <!--
    the drawer pushes the view rather than covering it  to have it cover the view set temporary=true.
    By default Vuetify makes the drawer cover the view below a certain window width,
    no matter what temporary is set to. mobile-breakpoint=0 turns that off, so temporary
    is always respected.
    -->
    <v-navigation-drawer
      id="drawer"
      :key="sidePanel ? 'side' : 'bottom'"
      v-model="drawerOpen"
      tag="aside"
      aria-label="Information"
      :location="sidePanel ? 'start' : 'bottom'"
      :width="sidePanel ? drawerWidth : drawerHeight"
      :mobile-breakpoint="0"
      :class="sidePanel ? 'drawer-side' : 'drawer-bottom'"
      :temporary="false"
    >
      <TourSheet
        v-if="showTour"
        v-focus-grab="showTour"
        tabindex="-1"
        :tour="tourSheetTour"
        :small-size="false"
        :accent-color="tourAccentColor"
        :border-color="tourAccentColor"
        background-color="black"
        show-next-on-last-step
        :next-text="onLastStep ? 'Close' : 'Next'"
      >
        <template #default="{ step }">
          <TourStep
            :title="step.title"
            :subtitle="`${step.event.date.toISOString().replace('T', ' ').slice(0, 16)} UT`"
            :image="step.event.image"
            :image-label="`Image: ${step.event.credit}`"
            :image-url="step.event.imageUrl"
            :pds-url="step.event.pdsUrl"
            :opus-url="step.event.opusUrl"
            @close="showTour = false"
          >
            <p
              v-for="(paragraph, i) in step.text"
              class="tour-step-text"
              :key="i"
            >
              {{ paragraph }}
            </p>
          </TourStep>
        </template>
      </TourSheet>
      <!--
        The Tabbed Sheet and TabPage are vue "tightly coupled" components
        This means a TabPage can only be used within an TabbedSheet.
        The tab-page automatically registers itself as a tab in the information sheet, and unregisters itself when it is destroyed.

        v-model:tab is the name of the currently selected tab. It comes from the title in kebab-case or the value if specified
        Each tab must havea unique value. If the sheet is closed and you want to show a specific tab, you must set
        the showTextSheet to true and set the infoSheetTab to the value of the tab you want to show.

        Some available options are
        hide-tabs: (default: false) hide the tab bar, but keep space for the close button
        only-show-one: (default: false) only show the active tab, hide the others
        closable: (default: true) show the close button
      -->
      <tabbed-sheet
        v-show="showTextSheet"
        id="side-panel-sheet"
        v-model:tab="infoSheetTab"
        v-focus-grab="showTextSheet"
        only-show-one
        align-tabs="start"
        @close="showTextSheet = false"
      >
        <!-- the user guide is an <TabPage title="User Guide" value="user-guide>...</TabPage>"
         it can be userful to move complex content into a separate component
         -->
        <tab-page
          title="App Info"
          value="user-guide"
        >
          <user-guide @change-privacy-settings="showPrivacyPolicyInfo = true" />
        </tab-page>
      </tabbed-sheet>

      <!--
        You don't have to use the tabbed sheet though.
        If you would rather just have single sheets, controlled by their own button, or something else
        just use a v-sheet (provides the card colors) and make it a
        flex-column with 100% height.
      -->
      <!--
      <v-sheet
        v-if="showUserGuideSheet"
        v-focus-toggle="showUserGuideSheet"
        class="d-flex flex-column page-sheet"
        height="100%"
        tabindex="-1"
      >
        <div class="d-flex align-center justify-space-between pa-3">
          <h3>User Guide</h3>
          <close-button
            label="Close User Guide"
            color="primary"
            @click="showUserGuideSheet = false"
          />
        </div>
        <div class="page-sheet-body">
          <user-guide @change-privacy-settings="showPrivacyPolicyInfo = true" />
        </div>
      </v-sheet>
      -->
    </v-navigation-drawer>

    <!-- privacy setup -->
    <!-- <v-dialog
      id="data-collection-popup-dialog"
      v-model="showDataCollectionOptOut"
      :scrim="false"
      :persistent="true"
      no-click-animation
      width="320px"
      max-width="80vw"
      :capture-focus="false"
    >
      <DataCollectionOptOutCard
        v-model:show="showDataCollectionOptOut"
        v-model:show-privacy-policy="showPrivacyPolicyInfo"
        v-model:response-opt-out="responseOptOut"
      />
    </v-dialog> -->

    <v-dialog
      id="cds-privacy-policy"
      v-model="showPrivacyPolicyInfo"
      class="cds-privacy-policy__dialog"
      :scrim="false"
      max-width="400px"
      :capture-focus="false"
    >
      <CDSPrivacyPolicy
        v-model="showPrivacyPolicyInfo"
        v-model:response-opt-out="responseOptOut"
        v-model:gtag-consent="gtagConsent"
        v-focus-toggle="showDataCollectionOptOut"
        tabindex="-1"
      />
    </v-dialog>

    <!-- rating prompt, shown once a while after load (see useUserExperienceRating) -->
    <UserExperienceDialog
      :show-rating="showRatingDialog"
      :question="question"
      @dismiss="dismissRating"
      @rating="(rating) => updateUserExperienceInfo(rating, null)"
      @finish="
        (rating, comment) => {
          updateUserExperienceInfo(rating, comment);
          showRating = false;
        }
      "
      @opt-out="optOutRating"
      @what-is-this="showPrivacyPolicyInfo = true"
    />

    <v-slide-y-transition>
      <DataCollectionOptOutFooter
        v-model:show="showDataCollectionOptOut"
        v-model:show-privacy-policy="showPrivacyPolicyInfo"
        v-model:response-opt-out="responseOptOut"
        :order="sidePanel ? 0 : -1"
      />
    </v-slide-y-transition>
  </v-app>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, watch, nextTick } from "vue";
import type { StyleValue } from "vue";
import { watchThrottled } from "@vueuse/core";
import { WWTControl } from "@wwtelescope/engine";
import { WWTComponent as WorldWideTelescope, engineStore } from "@wwtelescope/engine-pinia";
import {
  useWWTKeyboardControls,
  useFullscreen,
  IconButton,
  CreditLogos,
} from "@cosmicds/vue-toolkit";

const extraLogos = [
  {
    src: "./CfA_Logo_Vertical_Reverse.png",
    href: "https://www.cfa.harvard.edu/",
    alt: "Center for Astrophysics | Harvard & Smithsonian Logo",
    name: "cfa",
  },
];

// props //
export interface VoyagerProps {
  wwtNamespace?: string;
}

withDefaults(defineProps<VoyagerProps>(), {
  wwtNamespace: "voyager",
});

// engine setup //
const store = engineStore();

useWWTKeyboardControls(store);

// state in the url (the tour step) //
import { useUrlState } from "./composables/useUrlState";
const urlState = useUrlState({ autoUpdate: true, inAddressBar: false, clearOnLoad: true });

// kiosk / fullscreen //
const kiosk = urlState.get("kiosk")?.toLowerCase() === "true";
if (kiosk) {
  document.body.classList.add("kiosk");
}

const fullscreen = useFullscreen();

// ui visibility //
const splash = urlState.get("splash")?.toLowerCase() !== "false";
const showSplashScreen = ref(splash);
const showControls = ref(false);
const showCountdown = ref(false);
// on small screens both open below the top-right buttons, in the same place: one at a time
watch(showControls, (open) => open && smallSize.value && (showCountdown.value = false));
watch(showCountdown, (open) => open && smallSize.value && (showControls.value = false));

const showWebGL2Warning = ref(false);

const showTextSheet = ref(false);
const infoSheetTab = ref("");
const showUserGuideSheet = ref(false);

/** open a tab on the info sheet, or close the sheet if it's already showing that tab */
function toggleInfoSheetTab(tabValue: string) {
  if (showTextSheet.value && infoSheetTab.value === tabValue) {
    showTextSheet.value = false;
    return;
  }
  infoSheetTab.value = tabValue;
  showTextSheet.value = true;
  // we don't want both open at the same time
  showUserGuideSheet.value = false;
}

// styles //
import { useAppLayout } from "./composables/useAppLayout";
const { smallSize, sidePanel, viewportWidth, viewportHeight } = useAppLayout();
const DRAWER_WIDTH_FRACTION = 34; // 34% of the viewport width
const drawerWidth = computed(() => Math.round((viewportWidth.value * DRAWER_WIDTH_FRACTION) / 100));
const DRAWER_HEIGHT_FRACTION = 40;
const drawerHeight = computed(() => Math.round((viewportHeight.value * DRAWER_HEIGHT_FRACTION) / 100));

import { useTheme, useDisplay } from "vuetify";
const theme = useTheme();
// in the past we have used accentColor and accentColor2, but these serve the same purpose
// as vuetify's primary and secondary colors, so we tie them to that. vuetify components
// can access them directly as `color="primary" on the prop, and they are aleady available in the CSS as --v-theme-primary and --v-theme-secondary
const accentColor = computed(() => theme.current.value.colors.primary);
const accentColor2 = computed(() => theme.current.value.colors.secondary);
// lavender, for the tour: its sheet and its step slider
const tourAccentColor = computed(() => theme.current.value.colors["tour-accent"]);

const { xs } = useDisplay();

const cssVars = computed(() => {
  return {
    "--accent-color": accentColor.value,
    "--accent-color-2": accentColor2.value,
    "--drawer-width": `${DRAWER_WIDTH_FRACTION}vw`,
    "--drawer-bottom-height": `${DRAWER_HEIGHT_FRACTION}svh`, // svh: never taller than the drawerHeight px vuetify reserves, URL bar or not
  } as StyleValue;
});

const layersLoaded = ref(false);
const positionSet = ref(false);
const ready = computed(() => layersLoaded.value && positionSet.value);

/* `isLoading` is a bit redundant here, but it could potentially have independent logic */
const isLoading = computed(() => !ready.value);

onMounted(() => {
  if (showWebGL2Warning.value) {
    showSplashScreen.value = false;
    WWTControl.singleton.canvas.setAttribute("hidden", "true");
    WWTControl.singleton.renderOneFrame = function () {};
    return;
  }

  store.waitForReady().then(async () => {
    setUpVoyagerScene();
    positionSet.value = true;
    layersLoaded.value = true;
    active.value = true;

    createUserEntry();
    initializePrompt();
  });
});

// voyager scene //
import { SpaceTimeController, type SpreadSheetLayer } from "@wwtelescope/engine";
import { SolarSystemObjects } from "@wwtelescope/engine-types";
import { useGeometricPlanetPositions } from "./horizons/geometricPlanets";
// WWT's 3D planets are apparent positions; use geometric ones so Horizons data lines up
useGeometricPlanetPositions();

import { tdbNow, SOLAR_SYSTEM_OBJECT_ITEMS } from "./horizons/horizons_helpers";
import { HorizonsVectorTable } from "./horizons/HorizonsVectorTable";
import {
  bodyCenterInScene,
  createTrajectoryLine,
  drawTrajectoryLineInFrame,
  LINE_TOLERANCE_AU,
  type TrajectoryLine,
} from "./horizons/orbitLine";
import type { HorizonsVector } from "./horizons/horizons";
import { createMovingMarkerLayer, skyMapReady } from "./horizons/horizonsSpreadsheet";
import { createMoonOrbits, createMoonLayers } from "./horizons/saturnMoons";
import { distanceFromBodyKm, lightTimeSeconds } from "./horizons/lightTime";
import voyager1Data from "@/assets/voyager_spline_knots-sun.ecsv?raw";
import voyager2Data from "@/assets/voyager2_spline_knots-sun.ecsv?raw";

import { useFollowTrajectory } from "./composables/useFollowTrajectory";
import { useScaledZoom } from "./composables/useScaledZoom";
const { zoomMax, zoomSliderValue, onZoomSlider, zoomIn, zoomOut, setZoomMin } = useScaledZoom();

// Voyager 1 closest approach to Saturn (the Titan flyby is earlier the same day, ~05:41 UT)
const START_TIME = new Date("1980-11-12T23:46:00Z");

// Voyager 1, one Horizons table, drawn relative to the Sun (the frame with the smallest flyby errors against WWT's planets)
const voyager1Table = new HorizonsVectorTable(voyager1Data);
const VOYAGER_FRAME = SolarSystemObjects.sun;
const voyager1PositionAt = voyager1Table.positionAt(VOYAGER_FRAME);

// Voyager 2, the same way
const voyager2Table = new HorizonsVectorTable(voyager2Data);
const voyager2PositionAt = voyager2Table.positionAt(VOYAGER_FRAME);

const voyager1Location = ref<HorizonsVector | null>(null);
const voyager2Location = ref<HorizonsVector | null>(null);

// what the WWT camera tracks (the scene is drawn relative to it): a spacecraft, or a solar system object
const VOYAGER_TRAJECTORIES = { voyager1: voyager1PositionAt, voyager2: voyager2PositionAt };
type TrackTarget = SolarSystemObjects | keyof typeof VOYAGER_TRAJECTORIES;
const TRACK_ITEMS: { title: string; value: TrackTarget }[] = [
  { title: "Voyager 1", value: "voyager1" },
  { title: "Voyager 2", value: "voyager2" },
  ...SOLAR_SYSTEM_OBJECT_ITEMS,
  { title: "Io", value: SolarSystemObjects.io },
];
const trackingCenter = ref<TrackTarget>("voyager1");
const { follow: followTrajectory } = useFollowTrajectory(VOYAGER_FRAME);

// WWT can only track objects; the spacecraft are followed by moving the camera ourselves
// (tracking an object afterwards stops that)
function applyTrack(target: TrackTarget) {
  if (typeof target === "string") {
    followTrajectory(VOYAGER_TRAJECTORIES[target]);
  } else {
    store.setTrackedObject(target);
  }
}
watch(trackingCenter, applyTrack);
const VOYAGER_2_COLOR = "#00ffff";
const VOYAGER_1_COLOR = "#ffda8a";
let voyager1Line: TrajectoryLine | null = null;
let voyager2Line: TrajectoryLine | null = null;
const showV1 = ref(true);
const showv2 = ref(true);
const voyager1Layer = shallowRef<SpreadSheetLayer | null>(null);
const voyager2Layer = shallowRef<SpreadSheetLayer | null>(null);
const saturnMoonLayers = shallowRef<SpreadSheetLayer[]>([]);

function drawVoyagerOrbit() {
  // J2000 points, rotated to the scene's ecliptic of date, drawn only up to WWT's current time (where the spacecraft are)
  const now = SpaceTimeController.get_now().getTime();
  const jdtdb = tdbNow();
  if (voyager1Line && showV1.value) {
    drawTrajectoryLineInFrame(voyager1Line, VOYAGER_FRAME, jdtdb, now);
  }
  if (voyager2Line && showv2.value) {
    drawTrajectoryLineInFrame(voyager2Line, VOYAGER_FRAME, jdtdb, now);
  }
}

function createVoyagerOrbit() {
  voyager1Line = createTrajectoryLine(voyager1Table.j2000(VOYAGER_FRAME), LINE_TOLERANCE_AU, VOYAGER_1_COLOR);
  voyager2Line = createTrajectoryLine(voyager2Table.j2000(VOYAGER_FRAME), LINE_TOLERANCE_AU, VOYAGER_2_COLOR);
  store.addFrameCallback(drawVoyagerOrbit);
}

function createVoyagerLayer() {
  createMovingMarkerLayer(store, "Voyager 2", VOYAGER_FRAME, VOYAGER_2_COLOR, voyager2PositionAt, true).then(
    (layer) => (voyager2Layer.value = layer),
  );
  createMovingMarkerLayer(store, "Voyager 1", VOYAGER_FRAME, VOYAGER_1_COLOR, voyager1PositionAt, true).then(
    (layer) => (voyager1Layer.value = layer),
  );
}

// time sliders: the whole file, in 1 minute steps
const voyagerSpan = voyager2Table.timeSpan; // voyager 2 is longer
voyagerSpan.end = new Date("Dec 31 2037 23:59:59 UTC"); // Cut off time after 2037 (the data goes on to 2099)
const SLIDER_STEP_MS = 60 * 1000;

import * as THREE from "three";
import { useThreeModel } from "./three-helpers";
import glbUrl from "@/assets/Voyager.glb?url";

const renderThree = ref(true);
let voyager1Model: THREE.Group | null = null;
let voyager2Model: THREE.Group | null = null;
// log10 of the models' magnification (0 is actual size)
const modelLogScale = ref(7);
const MIN_MODEL_SCALE = 3; // log10 of the model's magnification (0 is actual size)
const METERS_PER_AU = 149597870700;
const MODEL_REAL_SIZE_METERS = 13;
const showVoyagerModels = ref(true);
const showVoyagerLabels = ref(true);

function setMaximumZoomForView(tc: TrackTarget, scale: number) {
  if (tc === "voyager1" || tc === "voyager2") {
    const modelSize = MODEL_REAL_SIZE_METERS * 10 ** scale; // 31 m at logs scale = 0.
    const VIEW_MULTIPLIER = 1; // about how many times larger than the model should the view be
    setZoomMin((VIEW_MULTIPLIER * modelSize) / METERS_PER_AU);
  } else {
    setZoomMin(null); // null sets to default min zoom which is 0.00006
  }
}

import type { ViewSpec } from "@/types";
import { addToWindow } from "@/utils";

function _logView() {
  const camera = WWTControl.singleton.renderContext.viewCamera;
  const view: ViewSpec = {
    time: SpaceTimeController.get_now().toISOString(),
    track: trackingCenter.value,
    lat: camera.lat,
    lng: camera.lng,
    zoom: camera.zoom,
    rotation: camera.rotation,
    angle: camera.angle,
    modelLogScale: modelLogScale.value,
  };
  console.log(JSON.stringify(view));
}

addToWindow("logView", _logView);

import { Planets, Vector3d } from "@wwtelescope/engine";
import { flyCamera } from "./wwt-hacks";
const FLY_SECONDS = 4;

/** where the camera's viewTarget is for a track at a time (au, x, z, y). null outside a Voyager's data */
function viewTargetAt(track: TrackTarget, lat: number, lng: number, time: Date): Vector3d | null {
  if (typeof track !== "string") {
    return Planets.getPlanetTargetPoint(track, lat, lng, SpaceTimeController.utcToJulian(time)); // as RenderContext.setupMatricesSolarSystem, at `time`
  }
  const v = VOYAGER_TRAJECTORIES[track](time.getTime());
  if (!v) {
    return null;
  }
  const origin = Planets.getPlanet3dLocation(VOYAGER_FRAME); // as useFollowTrajectory does
  return Vector3d.create(v.x + origin.x, v.z + origin.y, v.y + origin.z);
}

/** fly the camera and the clock to a view. `to` is built like WWTControl.gotoTarget's camTo */
function flyToView(view: ViewSpec) {
  const end = new Date(view.time);
  const to = WWTControl.singleton.renderContext.viewCamera.copy();
  to.lat = view.lat;
  to.lng = view.lng;
  to.zoom = view.zoom;
  to.rotation = view.rotation;
  to.angle = view.angle;
  to.target = typeof view.track === "string" ? SolarSystemObjects.undefined : view.track; // 65536: what Follow tracks
  to.viewTarget = viewTargetAt(view.track, view.lat, view.lng, end) ?? to.viewTarget;
  // before the track changes: the zoom-floor watcher renders a frame, which would snap to the new target
  flyCamera(to, FLY_SECONDS, end);
  trackingCenter.value = view.track;
  modelLogScale.value = view.modelLogScale;
}

async function goToView(view: ViewSpec, instant = false) {
  WWTControl.singleton.renderContext.viewMover = null; // stop a flight still under way, or it lands on its own view
  trackingCenter.value = view.track;
  modelLogScale.value = view.modelLogScale;
  store.setTime(new Date(view.time));
  await nextTick();
  const rc = WWTControl.singleton.renderContext;
  for (const camera of instant ? [rc.viewCamera, rc.targetCamera] : [rc.targetCamera]) {
    camera.lat = view.lat;
    camera.lng = view.lng;
    camera.zoom = view.zoom;
    camera.rotation = view.rotation;
    camera.angle = view.angle;
  }
}

watch([trackingCenter, modelLogScale], ([tc, scale]) => {
  setMaximumZoomForView(tc, scale);
});

// the dish faces glb +y
const DISH_AXIS = new THREE.Vector3(0, 1, 0);
const dish = new THREE.Vector3();

/** unit vector from `from` to a body (three.js X, Y, Z) */
function directionTo(body: SolarSystemObjects, from: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  const b = bodyCenterInScene(body);
  return out.set(b.x - from.x, b.z - from.y, b.y - from.z).normalize();
}

/** The model on the red dot, its dish on Earth (no roll). three.js is (X, Y, Z) */
function setVoyager1ModelPosition(time: Date) {
  if (!voyager1Model) {
    return;
  }
  const t = time.getTime();
  const p = voyager1PositionAt(t);
  voyager1Model.visible = showVoyagerModels.value ? p !== null : false;
  if (!p) {
    return;
  }
  const origin = bodyCenterInScene(VOYAGER_FRAME);
  voyager1Model.position.set(p.x + origin.x, p.y + origin.z, p.z + origin.y);
  voyager1Model.quaternion.setFromUnitVectors(
    DISH_AXIS,
    directionTo(SolarSystemObjects.earth, voyager1Model.position, dish),
  );
  const scale = 10 ** modelLogScale.value;
  voyager1Model.scale.setScalar(scale / METERS_PER_AU);
}

function setVoyager2ModelPosition(time: Date) {
  if (!voyager2Model) {
    return;
  }
  const t = time.getTime();
  const p = voyager2PositionAt(t);
  voyager2Model.visible = showVoyagerModels.value ? p !== null : false;
  if (!p) {
    return;
  }
  const origin = bodyCenterInScene(VOYAGER_FRAME);
  voyager2Model.position.set(p.x + origin.x, p.y + origin.z, p.z + origin.y);
  voyager2Model.quaternion.setFromUnitVectors(
    DISH_AXIS,
    directionTo(SolarSystemObjects.earth, voyager2Model.position, dish),
  );
  const scale = 10 ** modelLogScale.value;
  voyager2Model.scale.setScalar(scale / METERS_PER_AU);
}

// The top label (distance, date, and was/is/will be) follows the clock at most every LABEL_THROTTLE_MS,
// so fast playback doesn't flicker its digits. Trailing, so it ends on the time the clock stops at
const LABEL_THROTTLE_MS = 500;
const labelTime = ref<Date | null>(null);
const voyagerLightTime = ref("");
watchThrottled(
  () => store.currentTime,
  (time) => {
    labelTime.value = time;
    updateVoyagerLightTime(time);
  },
  { throttle: LABEL_THROTTLE_MS },
);

// the clock's time, as "Nov 12, 1980, 23:46 UT". h23, since hour12: false can give "24:00" at midnight
const SHOWN_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});
// a one-digit day gets a figure space (U+2007, a digit's width), so the text doesn't change width
// between the 9th and the 10th. A plain space is narrower than a digit
const shownDate = computed(() => {
  if (!labelTime.value) {
    return "";
  }
  const parts = SHOWN_DATE_FORMAT.formatToParts(labelTime.value);
  const text = parts.map(({ type, value }) => (type === "day" ? value.padStart(2, " ") : value)).join("");
  return `${text} UT`;
});

// "is" within a minute of the real time (the date shows minutes), else "was" or "will be".
// Recomputed when the label's time changes, so a paused clock keeps its word as real time moves on
const NOW_TOLERANCE_MS = 60 * 1000;
const distanceVerb = computed(() => {
  if (!labelTime.value) {
    return "";
  }
  const ahead = labelTime.value.getTime() - Date.now();
  if (Math.abs(ahead) < NOW_TOLERANCE_MS) {
    return "is";
  }
  return ahead < 0 ? "was" : "will be";
});

/** seconds as "22 h 41 m 07 s" */
function hoursMinutesSeconds(seconds: number): string {
  const s = Math.round(seconds);
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return `${Math.floor(s / 3600)} h ${pad(Math.floor((s % 3600) / 60))} m ${pad(s % 60)} s`;
}

/** Voyager's distance from Earth as light time (distance ÷ c), for the display */
function updateVoyagerLightTime(time: Date) {
  const v = voyager1PositionAt(time.getTime());
  voyagerLightTime.value = v
    ? hoursMinutesSeconds(lightTimeSeconds(distanceFromBodyKm(v, VOYAGER_FRAME, SolarSystemObjects.earth)))
    : hoursMinutesSeconds(0);
}

const timePlaying = ref(false);
const playbackSpeed = ref(1000); // 1000x real time
const playbackReversed = ref(false); // the speed control's reverse button
// what the controls show: the speed, negative when reversed. Setting it sets the speed; only the reverse button flips it
const playbackRate = computed({
  get: () => (playbackReversed.value ? -1 : 1) * playbackSpeed.value,
  set: (rate: number) => {
    playbackSpeed.value = Math.abs(rate);
  },
});

/** playback past the end of the timeline loops back to launch and keeps playing */
function loopAtEnd() {
  if (timePlaying.value && SpaceTimeController.get_now() > voyagerSpan.end) {
    store.setTime(VOYAGER_1_EVENTS[0].date);
  }
}

function stopAtStart() {
  if (timePlaying.value && SpaceTimeController.get_now() <= voyagerSpan.start) {
    timePlaying.value = false;
    store.setTime(new Date(voyagerSpan.start.getTime() + 1000));
  }
}

/** the solar-system view, Voyager's line, marker and model, and Saturn's moons. Call once WWT is ready */
function setUpVoyagerScene() {
  WWTControl.singleton.set_zoomMax(zoomMax.value);
  WWTControl.singleton.setSolarSystemMaxZoom(zoomMax.value);
  setMaximumZoomForView(trackingCenter.value, modelLogScale.value);

  store.setBackgroundImageByName("Solar System");
  store.applySetting(["actualPlanetScale", false]);
  store.applySetting(["solarSystemScale", 1]);
  store.applySetting(["solarSystemCosmos", true]);
  store.applySetting(["solarSystemMilkyWay", true]);
  store.applySetting(["solarSystemStars", true]);
  store.applySetting(["solarSystemOrbits", true]);
  store.setClockSync(false);
  applyTrack(trackingCenter.value);
  // a tour step from the url has already set its event's time (its setup runs first)
  if (!showTour.value) {
    store.setTime(START_TIME);
  }

  createVoyagerOrbit();
  createMoonOrbits(store);
  // the engine's moon file clears every layer and map when it arrives
  skyMapReady().then(() => {
    createMoonLayers(store).then((layers) => (saturnMoonLayers.value = layers));
    // after the moons, so Voyager's marker is drawn on top where they overlap
    createVoyagerLayer();
  });

  // before useThreeModel, so the model is placed before three renders in the same frame
  store.addFrameCallback(() => {
    const now = SpaceTimeController.get_now();
    const time = now.getTime();
    setVoyager1ModelPosition(now);
    setVoyager2ModelPosition(now);
    voyager1Location.value = voyager1PositionAt(time);
    voyager2Location.value = voyager2PositionAt(time);
    loopAtEnd();
    stopAtStart();
  });
  useThreeModel(store, glbUrl, renderThree, (model) => (voyager1Model = model));
  useThreeModel(store, glbUrl, renderThree, (model) => (voyager2Model = model));
}

// tracking //
import {
  DataCollectionOptOutFooter,
  CDSPrivacyPolicy,
  useUserExperienceRating,
  createTrackingCounter,
  createTrackingTimer,
} from "@cosmicds/vue-toolkit";
import UserExperienceDialog from "./privacy/UserExperienceDialog.vue";
import { usePrivacy } from "./privacy/usePrivacy";
import { useGtagConsent } from "./privacy/useGtagConsent";

// opt-out by default (US-style); index.html's region-scoped defaults keep EU visitors opted out until they say otherwise
const gtagConsent = useGtagConsent(true);

const showTour = ref(false);

/** app tracking setup */
const STORY_NAME = "voyager-light-day" as const;
const active = ref(false);
const appTime = createTrackingTimer({ active });
const missionSliderUses = createTrackingCounter();
const playClickedCounter = createTrackingCounter();
const userGuideTime = createTrackingTimer({
  active: computed(() => showTextSheet.value && infoSheetTab.value === "user-guide"),
});
const tourTimer = createTrackingTimer({ active: showTour });
const countdownTimer = createTrackingTimer({ active: showCountdown });
let maxTourStep = 0;

function resetTrackingData() {
  appTime.reset();
  userGuideTime.reset();
  missionSliderUses.reset();
  tourTimer.reset();
  countdownTimer.reset();
  playClickedCounter.reset();
  maxTourStep = 0;
}

function getTrackingData() {
  return {
    app_time_ms: appTime.getTotalTime(),
    user_guide_time_ms: userGuideTime.getTotalTime(),
    tour_time_ms: tourTimer.getTotalTime(),
    countdown_time_ms: countdownTimer.getTotalTime(),
    mission_slider_use_count: missionSliderUses.count.value,
    play_clicked_count: playClickedCounter.count.value,
    max_tour_step: maxTourStep,
  };
}

const {
  createUserEntry,
  responseOptOut,
  userID,
  showDataCollectionOptOut,
  showPrivacyPolicyInfo,
  conditionalShowPrivacyDialog,
} = usePrivacy({
  apiKey: import.meta.env.VITE_CDS_API_KEY ?? "",
  optOutKey: `${STORY_NAME}:optOut`,
  userIDKey: `${STORY_NAME}:userID`,
  storyPath: `/${STORY_NAME}`,
  resetData: resetTrackingData,
  getData: getTrackingData,
});

watch(responseOptOut, (newVal) => {
  if (newVal === false) {
    gtagConsent.value = true;
  } else if (newVal === true) {
    gtagConsent.value = false;
  }
  if (newVal !== null) { // answered: the footer's Allow / Opt Out don't close it themselves
    showDataCollectionOptOut.value = false;
  }
});

watch(showDataCollectionOptOut, (isOpen, wasOpen) => {
  // if we close it without answering, set responseOptOut to false (this is an opt out not an opt in)
  if (wasOpen && !isOpen && responseOptOut.value === null) {
    responseOptOut.value = false;
  }
});

const {
  showRating,
  question,
  dismiss: dismissRating,
  optOut: optOutRating,
  updateUserExperienceInfo,
  initializePrompt,
} = useUserExperienceRating({
  storyPrefix: STORY_NAME,
  uuid: userID,
  apiKey: import.meta.env.VITE_CDS_API_KEY ?? "",
  responseOptOut,
  timeout: 45_000, 
  questions: ["How do you like this app?"],
  mixin: true,
});

// rating's timeout runs independently of the splash/privacy dialogs, so gate its visibility on both being done first
const showRatingDialog = computed(() => showRating.value && !showSplashScreen.value && !showDataCollectionOptOut.value);

// tour setup //

import { TourSheet, useTour, type BaseTourStepContent } from "@cosmicds/vue-toolkit";

import {
  VOYAGER_1_EVENTS,
  LIGHT_DAY_INTRO,
  ONE_LIGHT_DAY,
  INTERSTITIAL_RATE,
  V1_SATURN_ENCOUNTER,
  V2_NEPTUNE_ENCOUNTER,
  eventWindow,
  eventForTime,
  type MissionEvent,
  type TimeRange,
} from "./voyagerEvents";

interface TourStepContent extends BaseTourStepContent {
  event: MissionEvent;
}
// The tour opens on Voyager 1 at one light-day, then goes through the mission in date order.
// Playback works from VOYAGER_1_EVENTS (it relies on date order), so mission event i is tour step i + INTRO_STEPS
const TOUR_EVENTS = [LIGHT_DAY_INTRO, ...VOYAGER_1_EVENTS];
const INTRO_STEPS = TOUR_EVENTS.length - VOYAGER_1_EVENTS.length;

const tour = useTour<TourStepContent>({
  /**
   be careful if you have multiple moves when your app starts up
   so that they don't conflict with each other.
   */
  // one step per event: the clock goes to it and the camera tracks its body
  steps: TOUR_EVENTS.map((event) => ({
    id: event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: event.title,
    text: Array.isArray(event.caption) ? event.caption : [event.caption],
    event,
    setup: async () => {
      store.waitForReady().then(() => {
        if (timePlaying.value) {
          if (event.view) {
            // playback has the time and camera; only the model size follows the event
            modelLogScale.value = event.view.modelLogScale;
          }
          return;
        }
        if (event.view) {
          if (event.fly && new Date(event.view.time) > SpaceTimeController.get_now()) {
            // only fly forward in time
            flyToView(event.view);
          } else {
            goToView(event.view);
          }
          return;
        }
        store.setTime(event.date);
        if (event.track !== undefined) {
          trackingCenter.value = event.track;
        }
      });
    },
  })),
});
// urlState.track("tour", tour.stepID);

watch(tour.stepIndex, (index: number) => {
  maxTourStep = Math.max(maxTourStep, index);
});

// playback //
// While playing, a frame callback sets the clock rate and the camera for wherever the clock is.
const WINDOWS = VOYAGER_1_EVENTS.map((_, i) => eventWindow(VOYAGER_1_EVENTS, i)); // in date order
const EASING_FRAMES = 30; // easing: a frame covers at most 1/EASING_FRAMES of the way to what's next
const PALE_BLUE_DOT = VOYAGER_1_EVENTS.findIndex((e) => e.title === "Pale Blue Dot");
const WIDE_VIEW = VOYAGER_1_EVENTS.find((e) => e.title === "Termination shock")!.view!;
// The "Now" button will take user to a slightly tweaked version of the interstellar tour stop view.
const INTERSTELLAR_VIEW = VOYAGER_1_EVENTS.find((e) => e.title === "Interstellar space")!.view!;
const NOW_VIEW = { ...INTERSTELLAR_VIEW, lat: INTERSTELLAR_VIEW.lat - 10, zoom: 1200 };
function goToNowView() {
  goToView({ ...NOW_VIEW, time: new Date().toISOString() });
}
let currentStep: number | undefined | null = null; // the event the camera was set for: an index, undefined between windows, null to set it next frame
let lastFrameMs: number | null = null; // wall time (performance.now) of the last frame while playing
let secondsPerFrame = 1 / 60; // average frame length (wall time)

/** sets the engine's rate now, so the next frame already runs at it. playbackRate mirrors it for the controls */
function setClockRate(rate: number) {
  if (rate !== playbackRate.value) {
    store.setClockRate(rate);
    playbackRate.value = rate;
  }
}

/** averaged, so one slow frame doesn't jolt the rate */
function updateSecondsPerFrame() {
  const frameMs = performance.now();
  if (lastFrameMs !== null) {
    const thisFrame = (frameMs - lastFrameMs) / 1000;
    secondsPerFrame = 0.9 * secondsPerFrame + 0.1 * thisFrame;
  }
  lastFrameMs = frameMs;
}

function eventRate(event: MissionEvent): number {
  return event.rate ?? INTERSTITIAL_RATE;
}

/** the window `time` is in, or else the next one in the direction of play. undefined past the last */
function getCurrentOrNextWindow(time: Date, backward: boolean): TimeRange | undefined {
  if (backward) {
    return [...WINDOWS].reverse().find((window) => time >= window.start);
  }
  return WINDOWS.find((window) => time <= window.end);
}

/** the events whose time is in `window` (e.g. Jupiter closest approach and Io) */
function getEventsInWindow(window: TimeRange): MissionEvent[] {
  return VOYAGER_1_EVENTS.filter((e) => e.date >= window.start && e.date <= window.end);
}

/**
 * Ease in and away from a target time. The rate is linear interpolation between
 * them. Cap it between the slow and fast rates so it doesn't blow up far away.
 * The easing scale is the number of frames we want to ease in/out over.
 */
function rateRamp(time: Date, target: Date, slowRate: number, fastRate: number): number {
  const secondsAway = Math.abs(target.getTime() - time.getTime()) / 1000;
  const rate = secondsAway / (EASING_FRAMES * secondsPerFrame);
  return Math.min(fastRate, Math.max(slowRate, rate));
}

/**
 * get the playback rate for a given time.
 */
function playbackRateAt(time: Date, backward = false): number {
  const window = getCurrentOrNextWindow(time, backward);

  if (!window) {
    return INTERSTITIAL_RATE;
  }

  // what events are in this window.
  const events = getEventsInWindow(window);

  const speedMultiplier = (showTour.value ? 1 : 1);

  // get the highest valid rate
  const fastestRateInWindow = Math.max(...events.map(eventRate)) * speedMultiplier;
  // if before a window (after it, going backward), ease in.
  if (backward ? time > window.end : time < window.start) {
    return rateRamp(time, backward ? window.end : window.start, fastestRateInWindow, INTERSTITIAL_RATE);
  }
  // each event can have it's own rate, we should be at the slowest one.
  const eventRatesForTime = events.map((e) => rateRamp(time, e.date, eventRate(e) * speedMultiplier, fastestRateInWindow));
  return Math.min(...eventRatesForTime);
}

function isVoyager(track: TrackTarget): boolean {
  return track === "voyager1" || track === "voyager2";
}

function voyagerAt(time: Date): TrackTarget {
  return time > V1_SATURN_ENCOUNTER.end && time < V2_NEPTUNE_ENCOUNTER.end ? "voyager2" : "voyager1";
}

// for the pale blue dot - if we're following voyager, keep following voyager.
// if on a step but and not following voyager, track that steps track
// otherwise if we were in wide-views then stay in wide view, otherwise follow voyager.
function setCameraForStep(step: number | undefined, time: Date) {
  const followingVoyager = isVoyager(trackingCenter.value);
  // stay wide after the Pale Blue Dot if we went to it via the tour (which sets the tracking center to the sun)
  const stayWide = time > VOYAGER_1_EVENTS[PALE_BLUE_DOT].date && trackingCenter.value === WIDE_VIEW.track;

  if (step === PALE_BLUE_DOT && followingVoyager) {
    goToView({ ...WIDE_VIEW, time: time.toISOString() });
  } else if (step !== undefined && !followingVoyager) {
    const event = VOYAGER_1_EVENTS[step];
    trackingCenter.value = event.view?.track ?? event.track ?? trackingCenter.value;
  } else if (!stayWide) {
    trackingCenter.value = voyagerAt(time);
  }
}

function followEventsWhilePlaying() {
  if (!timePlaying.value) {
    currentStep = null;
    lastFrameMs = null;
    return;
  }
  updateSecondsPerFrame();
  const now = SpaceTimeController.get_now();

  const backward = playbackReversed.value;
  setClockRate((backward ? -1 : 1) * playbackRateAt(now, backward));

  const step = eventForTime(VOYAGER_1_EVENTS, now);

  // if not in tour - don't do tour things
  if (!showTour.value) {
    return;
  }
  if (step !== undefined && step + INTRO_STEPS !== tour.stepIndex.value) {
    tour.goToStep(step + INTRO_STEPS, true);
  }
  if (step !== currentStep) {
    // only on a change, so a track picked by hand lasts until the next one
    currentStep = step;
    setCameraForStep(step, now);
  }
}
store.waitForReady().then(() => store.addFrameCallback(followEventsWhilePlaying));
watch(timePlaying, (playing) => {
  if (playing) {
    // playing from the intro plays the mission, from launch (from the last stop on, it plays to the
    // end of the timeline and loops back: loopAtEnd)
    if (showTour.value && tour.stepIndex.value < INTRO_STEPS) {
      store.setTime(VOYAGER_1_EVENTS[0].date);
    }
    followEventsWhilePlaying(); // before the clock moves, or its first frame runs at the old rate
  }
});

// On the last step the Next button becomes Close. TourSheet's Next calls
// tour.next(), which in the toolkit is an unbounded stepIndex += 1, so the sheet
// gets a copy of the tour whose next() closes it there instead of stepping past
// the end. Same refs, so the step stays in sync with `tour`.
// Changing the step by hand pauses playback, so the step's view (time and camera) applies and stays.
const onLastStep = computed(() => tour.stepIndex.value === tour.length - 1);
const tourSheetTour = {
  ...tour,
  next: async () => {
    if (onLastStep.value) {
      tourFinished = true;
      showTour.value = false;
    } else {
      timePlaying.value = false;
      await tour.next();
    }
  },
  previous: async () => {
    timePlaying.value = false;
    await tour.previous();
  },
  goToStep: async (step: number, force?: boolean) => {
    timePlaying.value = false;
    await tour.goToStep(step, force);
  },
};

// the step's slider: its event's window (it holds no other event), within the data
const stepWindow = computed(() => {
  const i = tour.stepIndex.value;
  // the intro has its own window; a mission event's depends on its neighbors in date order
  const { start, end } = i < INTRO_STEPS ? TOUR_EVENTS[i].window! : eventWindow(VOYAGER_1_EVENTS, i - INTRO_STEPS);
  return {
    start: new Date(Math.max(start.getTime(), voyagerSpan.start.getTime())),
    end: new Date(Math.min(end.getTime(), voyagerSpan.end.getTime())),
  };
});

// the clock is between stops (as it is while playing from one to the next), where the step's slider would
// sit pinned at an end: it fades out until the clock reaches a stop again
const outsideStepWindow = computed(() => {
  const t = store.currentTime.getTime();
  return t < stepWindow.value.start.getTime() || t > stepWindow.value.end.getTime();
});

// Set by the last step's Close, so the next Show Tour starts over at the first
// step. The X keeps resuming where you left off. Not reset at close time,
// since changing the step runs its setup and would move the clock and camera
// back to launch as the tour closes.
let tourFinished = false;

function startTour() {
  showTour.value = true;
  tour.goToStep(tourFinished ? 0 : tour.stepIndex.value, true);
  tourFinished = false;
}

if (urlState.loadedFromUrl.value.includes("tour")) {
  startTour();
}
watch(showTour, (newVal) => {
  if (newVal) {
    startTour();
  }
});

// using the navigation drawer layout for multiple things, means
// it's a bit easier to have a computed combine the logic
const drawerOpen = computed({
  get: () => !showSplashScreen.value && (showTextSheet.value || showUserGuideSheet.value || showTour.value),
  set: (open: boolean) => {
    if (!open) {
      showTextSheet.value = false;
      showUserGuideSheet.value = false;
      showTour.value = false;
    }
  },
});

import { mutuallyExclusive } from "./composables/utils";
// only one of the tour, text sheet, and user guide sheet can be open at a time
mutuallyExclusive(showTour, showTextSheet, showUserGuideSheet);

// When the drawer closes, focus goes back to the button for what it was showing.
// Each content has exactly one opener, so the button follows from the content
// and there's no need to record who opened it -- which v-focus-toggle does, and
// gets wrong after a tab switch, since it only records on the first open.
// Switching between contents leaves the drawer open, so the newly opened
// content keeps the focus it grabs.
// The buttons are found by class, not id: IconButton also copies an id onto its
// tooltip, which duplicates it and points the button's aria-describedby at
// itself. Its class lands on the tooltip too, hence `button.`.
const drawerOpenerClass = computed(() => {
  if (showTour.value) return "tour-button";
  if (showTextSheet.value) return "user-guide-button"; // the text sheet's only tab
  return null;
});
watch(drawerOpenerClass, (now, before) => {
  if (now === null && before) {
    // after the DOM update, so the closing content can't take focus back
    nextTick(() => document.querySelector<HTMLElement>(`button.${before}`)?.focus());
  }
});

function closeSplashScreen() {
  showSplashScreen.value = false;
  // has the user responsed the opt out, then show the privacy dialog
  // pass `true` to only show it once per session, even if the user does not respond (for example if it shows up after an intro sequence)
  conditionalShowPrivacyDialog();
  tour.goToStep(0, true);
  showTour.value = true;
}
</script>

<style lang="less">
@import url(@/css/universal.css);
@import url(@/css/focus-visible.less);
:root {
  --default-font-size: clamp(0.7rem, 1.7vmin, 1.1rem);
  --default-line-height: clamp(1rem, 2.2vmin, 1.6rem);
  --wwt-surface-background: rgba(0, 0, 0, 0.8);
}

html {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #000;
  overflow: hidden;

  -ms-overflow-style: none;
  // scrollbar-width: none;
}

body {
  position: fixed;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;

  font-family: Verdana, Arial, Helvetica, sans-serif;

  &.kiosk {
    a {
      // should not be able click on a kiosk
      pointer-events: none !important;
      text-decoration: none !important;
    }
  }
}

#app {
  margin: 0;
  overflow: hidden;
  overscroll-behavior: none;
  font-size: 11pt;
}

#main-content {
  // containing block for the absolutely positioned WWT host and overlay.
  // v-main sizes this to the space the drawer leaves free.
  position: relative;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

// WWT fills #main-content, which gets its size from the flex layout above.
// This breaks if #main-content stops having a definite size from layout.
.wwtelescope-component {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;

  > canvas {
    display: block;
  }
}

// #wwt-overlay is positioned against #main-content, not the viewport
#wwt-overlay {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  padding-inline: 1rem;
  padding-top: 1rem;
  padding-bottom: 0.5rem;
  pointer-events: none;

  display: flex;
  flex-direction: column;
  justify-content: space-between; // pushes top and bottom content apart
}

#wwt-overlay > * {
  // turns each item in #wwt-overlay into a stacking context
  isolation: isolate;
}

#top-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-grow: 1;
}

#left-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: auto;
}

// adapted from artemis-ii's zoom slider, in the theme gold instead of white
#zoom-controls {
  padding-top: 1em;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;

  .zoom-slider {
    writing-mode: vertical-lr;
    height: 120px;
    accent-color: var(--accent-color);
    cursor: pointer;

    &:hover {
      opacity: 1;
    }
  }

  .zoom-button {
    background: #000;
    border: 2px solid var(--accent-color);
    border-radius: 3px;
    color: var(--accent-color);
    width: 20px;
    height: 20px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;

    // about the size and weight the Verdana +/− had
    svg {
      width: 10px;
      height: 10px;
      stroke: currentColor;
      stroke-width: 1.3;
    }
  }
}

#right-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
  height: auto;
  pointer-events: auto;
  position: relative;
}

#bottom-content {
  display: flex;
  flex-direction: row;
  width: 100%;
  pointer-events: auto;
  justify-content: flex-start;
  align-items: center;
  gap: 1rem;
  flex-grow: 0;
}

// the panels that open from the right-hand buttons
#frame-controls,
#countdown-panel {
  position: absolute;
  right: 0;
  width: 260px;
  padding: 8px;
  pointer-events: auto;
  // 0.8 black, like the time controls; only the background, so the text and border stay full strength
  background-color: var(--wwt-surface-background);
  border: 1px solid var(--accent-color);
  border-radius: 5px;
  font-size: 14px;
}

.light-day-countdown {
  font-weight: 600;
}

// holds the countdown button, so the panel can sit above it
#countdown-control {
  position: relative;
}

// above its button by the gap #frame-controls has below the controls button
#countdown-panel {
  bottom: calc(100% + 10px);
  text-align: center;
}

// small screens: the button's at the top right (teleported), so the panel opens below it, like #frame-controls
.app-is-small #countdown-panel {
  bottom: auto;
  top: calc(100% + 10px);
}

#frame-controls {
  top: calc(100% + 10px);
  display: flex;
  flex-direction: column;
  gap: 8px;

  // the current track in gold, matching the selected item in the open menu (item-color)
  .v-select__selection-text {
    color: rgb(var(--v-theme-primary));
  }

  // 16px insets line the label and "Actual" up with the dropdown's text (v-field's 16px padding)
  .model-size-label {
    font-size: 12px;
    opacity: 0.8;
    padding-inline: 16px;
    margin-top: 1rem;
  }

  .model-size .v-slider {
    margin-inline: 16px; // vuetify's default is 8px
  }

  .model-size-end {
    font-size: 11px;
    opacity: 0.8;
  }

  // styled like the "Spacecraft size" label
  .model-visibility .v-label {
    font-size: 12px;
    opacity: 0.8;
  }

  // a smaller box than vuetify's 24px
  .model-visibility .v-selection-control__input .v-icon {
    font-size: 18px;
  }

  // lines the drawn box (inset in its icon, which is centered in a wider input) up with the 16px text inset above.
  // Measured; retune if the icon size changes
  .model-visibility {
    padding-left: 9px;
  }

  .model-visibility .v-selection-control {
    min-height: 28px;
  }
}

#center-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
}

#light-time {
  padding: 6px 14px;
  text-align: center;
  background-color: var(--wwt-surface-background);
  border-radius: 8px;

  .light-time-label {
    font-size: 14px;
    opacity: 0.8;
  }

  .light-time-value {
    font-size: 16px;
  }

  .light-time-number,
  .light-time-date {
    font-family: monospace;
  }

  // neither the date nor "at light speed" breaks across lines
  .light-time-date {
    white-space: nowrap;
    font-size: 15px;
    font-weight: 600;
    opacity: 1;
  }
}

// time controls + mission slider. the bottom margin leaves room for the credit logos
#timeline {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0 5% 0.25rem;
  display: flex;
  align-items: end;
  gap: 8px;
  flex-wrap: wrap-reverse;
  justify-content: center;
  background-color: var(--wwt-surface-background);
  border-radius: 8px;
  padding-inline: 8px;
  // 2px more on top: the time control has 2px of its own space under the rate line, so this centers
  // the content. (The stacked tour layout below has its own top padding.)
  padding-top: 10px;
  padding-bottom: 8px;
}

// no padding when app is small
#app.is-small #timeline {
  padding-inline: 0;
}

#mission-slider,
#event-slider {
  flex: 1 1 400px;
  min-width: 0;
  // level with the time buttons, not the rate line under them: at the top, as tall as the
  // 35px button row (which tops the time control), with the track centered in it.
  // start, not flex-start, which wrap-reverse would flip to the bottom
  align-self: start;
  height: 35px;
}

// between tour stops (see outsideStepWindow). It keeps its space, so the timeline doesn't shift
#event-slider {
  transition: opacity 0.4s;

  &.outside-step {
    opacity: 0;
  }
}

// small screens: controls go under the timeline. column-reverse keeps the DOM
// (and tab) order the same as on large screens, so tab order is controls -> slider here
// controls keep their natural width, centered; no side margin, since at phone width the
// controls (~330px) don't fit inside the 5% margins
// as wide as the buttons (not the screen) and centered, with the date panel stretched to match
.app-is-small #timeline {
  flex-direction: column-reverse;
  flex: 0 1 auto;
  align-items: stretch;
  margin-inline: auto;

  .wwt-clock-controls {
    flex-wrap: wrap;
    justify-content: center;
  }

  // the mission slider stacks on top like the tour's, down to phone width (xs), where the template
  // hides it: no scrubbing there, just the buttons (the date is in #light-time)
  &.in-tour,
  &.with-mission-slider {
    flex: 1 1 auto;
    // the slider is on top here, and its thumb already sits 6px down in its own box
    padding-top: 4px;
  }

  #mission-slider,
  #event-slider {
    flex: 0 0 auto;
    // stacked here, so back to full width at its own height
    align-self: stretch;
    height: auto;
  }

  // but no wider than 500px, centered over the buttons
  #mission-slider {
    width: 100%;
    max-width: 500px;
    align-self: center;
  }
}

// neither #logo-credits nor #icons-container are flex
#logo-credits.cds-bottom-credits {
  margin-top: 0.5rem;
  justify-self: flex-end;
  align-self: flex-end;
}
#logo-credits.cds-bottom-credits > #icons-container {
  a {
    margin-inline: 0.3em;
  }
}

.icon-wrapper {
  // hack so that non-square icons don't look like ovals
  border-radius: 99999px !important;
  aspect-ratio: 1/1;
  // even padding
  padding: 8px !important;
  border-width: 2px !important;

  // every icon button the size of the time controls' (35px; 28px on phones), whose sizes are
  // set in WwtTimeControl.vue. !important beats the icons' inline sizes
  > .v-icon {
    font-size: 15px !important;
    width: 15px !important;
    height: 15px !important;
  }

  @media (width <= 600px) {
    padding: 6px !important;

    > .v-icon {
      font-size: 12px !important;
      width: 12px !important;
      height: 12px !important;
    }
  }
}

/* The drawer buttons' pressed state: filled gold with a purple icon, instead of
   the toolkit's default of just turning the icon and border white. The id is
   for specificity: it has to beat the toolkit's scoped .active and :focus
   rules, and :focus would otherwise recolor the icon gold on the gold fill
   right after a click. */
.icon-wrapper.sheet-toggle.active {
  background-color: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-secondary));
}

.icon-wrapper.tonal {
  // tonal style
  background-color: rgba(var(--v-theme-primary), 0.4) !important;
  color: rgba(var(--v-theme-primary), 0.9) !important;
  border: none !important;
}

.icon-wrapper.tonal:hover {
  background-color: rgba(var(--v-theme-primary), 0.6) !important;
  color: rgba(var(--v-theme-primary), 1) !important;
}

// It needs to be a flex column so that the children can fill the height
#drawer .v-navigation-drawer__content {
  display: flex;
  flex-direction: column;
}

// Basic text styling for the TabbedSheet's content
// it is better to set in the main app than to set things in the component
// since the component may end up being imported from the toolkit.
.cds-info-sheet .tab-page {
  h3 {
    color: steelblue;
  }

  padding: 1rem;
  display: flex;
  flex-direction: column;
}

.page-sheet-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0 1rem 1rem;
}

/* A fixed title row with a scrolling body under it. The toolkit's own scroll
   area is turned into a plain flex column so that the scrolling happens one
   level down, in .voyager-event-body, and the scrollbar starts below the title
   and close button instead of running up beside them. */
.tour-sheet .selected-info-scroll {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Back/Next: gold with black text, though the rest of the tour sheet is lavender
   (its accent color). The border too, which would otherwise be the lavender
   accent. !important because Vuetify sets a hex `color` prop as inline
   background and text colors. */
.tour-sheet .tour-text-controls .v-btn {
  background-color: rgb(var(--v-theme-primary)) !important;
  border-color: rgb(var(--v-theme-primary)) !important;
  color: black !important;
}

/* The empty dividers between the step dots were 16px each (Vuetify's
   0 8px padding) -- wider than the dots themselves, and why 10 dots overflowed
   a narrow drawer. The toolkit tries to shrink them, but its rule is scoped
   and doesn't reach Vuetify's breadcrumb internals. Dropping them leaves the
   spacing to the row's space-evenly, so the dots spread out when there's room
   and sit close together when there isn't. */
.tour-sheet .tour-dots .v-breadcrumbs-divider {
  display: none;
}

.tour-sheet .tour-text-controls .tour-dots button.tour-dot-active {
  color: hsl(233deg 90% 72%);
}

/* Even touching, the dots don't fit between Back and Next in a narrow box (the
   left drawer on a landscape phone is ~230px), so there they get a row of
   their own above the buttons. The 300px is sized for ~13 steps: 13 dots at
   ~10px each plus a few px of space, plus the 128px of buttons. Revisit it if
   the tour grows well past that. */
.tour-sheet.tour-text {
  container-type: inline-size;
}

@container (max-width: 300px) {
  .tour-sheet.tour-text .tour-text-controls {
    flex-wrap: wrap;
    justify-content: space-between;
    row-gap: 0.5rem;
  }

  .tour-sheet.tour-text .tour-text-controls .tour-dots {
    order: -1;
    flex: 1 1 100%;
    max-width: none;
  }
}

/* easier to just force it than wrestle with vuetify's built-in positioning */
#data-collection-popup-dialog > .v-overlay__content {
  position: fixed;
  top: auto;
  left: auto;
  right: 1rem;
  // keep above the icons
  bottom: 3.5rem;
  margin: 0;
  padding: 0;
}

.voyager-label {
  font-family: monospace;
}

.drawer-bottom .tour-sheet {
  padding: 4px;
}

.app-is-small #light-time {
  padding: 2px 8px;

  .light-time-label {
    font-size: 11px;
  }

  .light-time-value {
    font-size: 14px;
  }

  .light-time-date {
    font-size: 13px;
  }
}

#app.bottom-drawer-open {
  .user-experience-teaser.attention-hook,
  #cds-user-experience.rating-root {
    bottom: calc(var(--drawer-bottom-height) + 5px);
  }
}

.splash-countdown {
  background-color: rgb(var(--v-theme-cosmicds-blue));
  border-radius: 10px;
  padding: 0.25em 0.75em;
}

.app-is-small #wwt-overlay {
  padding-inline: 0.5rem;
  padding-top: 0.5rem;
  padding-bottom: 0.25rem;
}

// short views (e.g. the bottom drawer plus the opt-out footer): the zoom slider gives up height so #bottom-content isn't pushed under the drawer
.app-is-small #top-content {
  min-height: 0;
}

.app-is-small #left-buttons {
  max-height: 100%;
}

.app-is-small #zoom-controls {
  padding-top: 0;
  gap: 0.25rem;
  min-height: 0;

  .zoom-slider {
    flex: 0 1 120px;
    min-height: 40px;
  }
}

// a slimmer opt-out footer: tighter padding, Allow/Opt Out side by side
#app.app-is-small .v-footer.privacy-footer {
  padding: 4px 8px;
  gap: 0.5rem;
  line-height: 1.3;

  .privacy-footer-buttons {
    flex-wrap: nowrap;
  }
}

.app-is-small .tour-sheet.info-box {
  margin: 0;
}

.tour-step-text {
  margin-bottom: 0.5rem;
}
</style>
