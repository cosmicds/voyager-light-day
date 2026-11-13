<template>
  <v-app
    id="app"
    :style="cssVars"
    :class="[smallSize ? 'app-is-small' : '', kiosk ? 'kiosk' : '']"
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
        <p class="highlight">the night sky</p>
        <p>&amp; let it inspire you to dare to do mighty things. it's reading rainbow</p>
      </div>
    </SplashScreen>

    <v-main>
      <div id="main-content">
        <WorldWideTelescope :wwt-namespace="wwtNamespace"></WorldWideTelescope>
        <wwt-loader v-model="isLoading" />

        <!-- This block contains the elements (e.g. icon buttons displayed at/near the top of the screen) -->

        <div v-show="!showSplashScreen" id="wwt-overlay">
        
          <div id="top-content">
            <div id="left-buttons">
              <icon-button
                icon="book-open"
                aria-label="Learn More"
                :color="accentColor"
                :focus-color="accentColor"
                tooltip-text="Learn More"
                tooltip-location="start"
                size="lg"
                @activate="() => openInfoSheetTab('information')"
              />
              <icon-button
                icon="question"
                aria-label="User guide"
                :color="accentColor"
                :focus-color="accentColor"
                tooltip-text="User guide"
                tooltip-location="start"
                size="lg"
                @activate="() => openInfoSheetTab('user-guide')"
              />
              <icon-button
                v-model="showTour"
                icon="signs-post"
                aria-label="Show Tour"
                :color="accentColor"
                :focus-color="accentColor"
                tooltip-text="Show Tour"
                tooltip-location="start"
                size="lg"
              />
              <!-- zoom, as in artemis-ii: top of the slider is zoomed in -->
              <div id="zoom-controls">
                <button
                  class="zoom-button"
                  aria-label="Zoom in"
                  title="Zoom in"
                  @click="zoomIn"
                >
                  +
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
                  −
                </button>
              </div>
            </div>
            <div id="center-buttons">
              <div
                v-if="voyagerLightTime"
                id="light-time"
              >
                <div class="light-time-label">Distance from Earth in light time</div>
                <div class="light-time-value">{{ voyagerLightTime }}</div>
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
                size="lg"
                @activate="fullscreen = !fullscreen"
              />
              <div id="frame-controls">
                <v-select
                  v-model="trackingCenter"
                  :items="SOLAR_SYSTEM_OBJECT_ITEMS"
                  label="Track (camera center)"
                  density="compact"
                  hide-details
                />
                <FollowTrajectoryButton
                  :position-at="voyager1PositionAt"
                  :frame="VOYAGER_FRAME"
                  label="Follow Voyager 1"
                />
                <FollowTrajectoryButton
                  :position-at="voyager2PositionAt"
                  :frame="VOYAGER_FRAME"
                  label="Follow Voyager 2"
                />
                <v-switch
                  v-model="modelRealSize"
                  label="Voyager model at real size"
                  density="compact"
                  hide-details
                />
                <v-slider
                  v-model="modelLogScale"
                  :disabled="modelRealSize"
                  :min="0"
                  :max="12"
                  :step="0.01"
                  label="scale (log10)"
                  thumb-label
                  density="compact"
                  hide-details
                />
              </div>
            </div>
          </div>

          <div id="bottom-content">
            <!-- Tab order lands here whether the tour is docked in the drawer right
                 below or floating out of it, so focus order doesn't jump around when
                 the layout switches between the two. -->
            <div id="tour-floating-location" />
            <!-- play/pause + speed to the left of the timeline; below it on small screens (see CSS) -->
            <div id="timeline">
              <wwt-time-control
                hide-time-input
                hide-set-time
                hide-status
                :color="accentColor"
              />
              <!-- the whole mission, log in time since launch -->
              <MissionTimeSlider
                id="mission-slider"
                :start="voyagerSpan.start"
                :end="voyagerSpan.end"
                :step-ms="SLIDER_STEP_MS"
                :log-scale-days="100"
                @mousedown="missionSliderUses.increment()"
              />
            </div>
          </div>
          
          <!-- credit logos $logo-credits.cds-bottom-credits -->
          <credit-logos
            v-if="!xs"
            class="cds-bottom-credits"
            :default-logos="['cosmicds', 'wwt', 'nasa']"
            :logo-size="xs ? '1.5em' : '2em'"
            :extra-logos="extraLogos"
          />
        </div>
      </div>
    </v-main>

    <!--
    This contains the informational content that is displayed when the book icon is clicked.
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
      :width="sidePanel ? drawerWidth : undefined"
      :mobile-breakpoint="0"
      :class="sidePanel ? 'drawer-side' : 'drawer-bottom'"
      :temporary="false"
    >
      <!-- disable=true for non-floating tour -->
      <!-- 
      Teleporting to the "body" places it last in the DOM so last in the tab-focus order.
      we actually want it pretty early, so instead of hacking a focus control, let's just put it where it belongs. 
      This won't help the case where we are in the v-navigation-drawer though
      -->
      <Teleport 
        to="#tour-floating-location" 
        defer
        :disabled="!floatingTour" 
      >
        <TourSheet
          v-if="showTour"
          v-focus-grab="showTour"
          tabindex="-1"
          :class="{'floating-tour': floatingTour}"
          :tour="tour"
          :small-size="false"
        >
          <template #default="{ step }">
            <div class="selected-info-tour voyager-event">
              <h3>{{ step.title }}</h3>
              <p class="event-date">{{ step.event.date.toISOString().replace("T", " ").slice(0, 16) }} UT</p>
              <img
                :src="step.event.image"
                :alt="step.title"
              />
              <p class="event-credit">Image: {{ step.event.imageTaken }} / {{ step.event.credit }}</p>
              <!-- the clock around this event -->
              <MissionTimeSlider
                :start="stepWindow.start"
                :end="stepWindow.end"
                :step-ms="SLIDER_STEP_MS"
              />
              <p
                v-for="(paragraph, i) in step.text"
                :key="i"
              >
                {{ paragraph }}
              </p>
            </div>
          </template>
        </TourSheet>
      </Teleport>
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
        v-focus-toggle="showTextSheet"
        only-show-one
        align-tabs="start"
        @close="showTextSheet = false"
      >
        <!-- tab-page content is wrapped in a .tab-page class  -->
        <tab-page title="Information">
          <!-- everything inside the tab-page is wrapped in a div with class "tab-page" -->
          <!-- we generally use heading level 3 (the same level as the tabs) -->
          <h3>Science Information</h3>
          <p>Sample Science Information</p>
        </tab-page>

        <!-- the user guide is an <TabPage title="User Guide" value="user-guide>...</TabPage>"
         it can be userful to move complex content into a separate component
         -->
        <tab-page title="User Guide" value="user-guide">
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
      @finish="(rating, comment) => {
        updateUserExperienceInfo(rating, comment);
        showRating = false;
      }"
      @opt-out="optOutRating"
      @what-is-this="showPrivacyPolicyInfo = true"
    />
    
    

    <v-slide-y-transition>
      <DataCollectionOptOutFooter
        v-model:show="showDataCollectionOptOut"
        v-model:show-privacy-policy="showPrivacyPolicyInfo"
        v-model:response-opt-out="responseOptOut"
      />
    </v-slide-y-transition>
  </v-app>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, watch } from "vue";
import type { StyleValue } from "vue";
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
const kiosk = new URLSearchParams(window.location.search).get("kiosk")?.toLowerCase() === "true";
if (kiosk) {
  document.body.classList.add("kiosk");
}

const fullscreen = useFullscreen();

// ui visibility //
const splash = new URLSearchParams(window.location.search).get("splash")?.toLowerCase() !== "false";
const showSplashScreen = ref(splash);

const showWebGL2Warning = ref(false);

const showTextSheet = ref(false);
const infoSheetTab = ref("");
const showUserGuideSheet = ref(false);

/** open a tab on the info sheet */
function openInfoSheetTab(tabValue: string) {
  infoSheetTab.value = tabValue;
  showTextSheet.value = true;
  // we don't want both open at the same time
  showUserGuideSheet.value = false;
}

// styles //
import { useAppLayout } from "./composables/useAppLayout";
const { smallSize, sidePanel, floatingPanel: floatingTour, viewportWidth } = useAppLayout();
const DRAWER_WIDTH_FRACTION = 34; // 34% of the viewport width
const drawerWidth = computed(() => Math.round(viewportWidth.value * DRAWER_WIDTH_FRACTION / 100.));

import { useTheme, useDisplay } from "vuetify";
const theme = useTheme();
// in the past we have used accentColor and accentColor2, but these serve the same purpose
// as vuetify's primary and secondary colors, so we tie them to that. vuetify components
// can access them directly as `color="primary" on the prop, and they are aleady available in the CSS as --v-theme-primary and --v-theme-secondary
const accentColor = computed(() => theme.current.value.colors.primary);
const accentColor2 = computed(() => theme.current.value.colors.secondary);

const { xs } = useDisplay();

const cssVars = computed(() => {
  return {
    "--accent-color": accentColor.value,
    "--accent-color-2": accentColor2.value,
    "--drawer-width": `${DRAWER_WIDTH_FRACTION}vw`,
    "--drawer-bottom-height": "40vh",

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
import { createMovingMarkerLayer, skyMapReady } from "./horizons/horizonsSpreadsheet";
import { createSaturnMoonOrbits, createSaturnMoonLayers } from "./horizons/saturnMoons";
import { distanceFromBodyKm, lightTimeSeconds } from "./horizons/lightTime";
import voyager1Data from "@/assets/voyager_spline_knots-sun.ecsv?raw";
import voyager2Data from "@/assets/voyager2_spline_knots-sun.ecsv?raw";

import { useScaledZoom } from "./composables/useScaledZoom";
const { ZOOM_MAX, ZOOM_MIN, zoomSliderValue, onZoomSlider, zoomIn, zoomOut } = useScaledZoom();

// Voyager 1 closest approach to Saturn (the Titan flyby is earlier the same day, ~05:41 UT)
const START_TIME = new Date("1980-11-12T23:46:00Z");

// what the WWT camera tracks (the scene is drawn relative to it)
const trackingCenter = ref<SolarSystemObjects>(SolarSystemObjects.saturn);
watch(trackingCenter, (obj) => store.setTrackedObject(obj));

// Voyager 1, one Horizons table, drawn relative to the Sun (the frame with the smallest flyby errors against WWT's planets)
const voyager1Table = new HorizonsVectorTable(voyager1Data);
const VOYAGER_FRAME = SolarSystemObjects.sun;
const voyager1PositionAt = voyager1Table.positionAt(VOYAGER_FRAME);

// Voyager 2, the same way
const voyager2Table = new HorizonsVectorTable(voyager2Data);
const voyager2PositionAt = voyager2Table.positionAt(VOYAGER_FRAME);
const VOYAGER_2_COLOR = "#00ffff";
const VOYAGER_1_COLOR = "#ffff00";

let voyager1Line: TrajectoryLine | null = null;
let voyager2Line: TrajectoryLine | null = null;
const showV1 = ref(true);
const showv2 = ref(true);
const voyager1Layer = shallowRef<SpreadSheetLayer | null>(null);
const voyager2Layer = shallowRef<SpreadSheetLayer | null>(null);
const saturnMoonLayers = shallowRef<SpreadSheetLayer[]>([]);

function drawVoyagerOrbit() {
  // J2000 points, rotated to the scene's ecliptic of date
  const jdtdb = tdbNow();
  if (voyager1Line && showV1.value) {
    drawTrajectoryLineInFrame(voyager1Line, VOYAGER_FRAME, jdtdb);
  }
  if (voyager2Line && showv2.value) {
    drawTrajectoryLineInFrame(voyager2Line, VOYAGER_FRAME, jdtdb);
  }
}

function createVoyagerOrbit() {
  voyager1Line = createTrajectoryLine(voyager1Table.j2000(VOYAGER_FRAME), LINE_TOLERANCE_AU, VOYAGER_1_COLOR);
  voyager2Line = createTrajectoryLine(voyager2Table.j2000(VOYAGER_FRAME), LINE_TOLERANCE_AU, VOYAGER_2_COLOR);
  store.addFrameCallback(drawVoyagerOrbit);
}

function createVoyagerLayer() {
  createMovingMarkerLayer(store, "Voyager 2", VOYAGER_FRAME, VOYAGER_2_COLOR, voyager2PositionAt)
    .then((layer) => (voyager2Layer.value = layer));
  createMovingMarkerLayer(store, "Voyager 1", VOYAGER_FRAME, VOYAGER_1_COLOR, voyager1PositionAt).then(
    (layer) => (voyager1Layer.value = layer),
  );
}

// time sliders: the whole file, in 1 minute steps
const voyagerSpan = voyager2Table.timeSpan; // voyager 2 is longer
const SLIDER_STEP_MS = 60 * 1000;

import * as THREE from "three";
import { useThreeModel } from "./three-helpers";
import glbUrl from "@/assets/Voyager.glb?url";

const renderThree = ref(true);
let voyager1Model: THREE.Group | null = null;
let voyager2Model: THREE.Group | null = null;
const modelRealSize = ref(false);
const modelLogScale = ref(7);
const METERS_PER_AU = 149597870700;

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
  voyager1Model.visible = p !== null;
  if (!p) {
    return;
  }
  const origin = bodyCenterInScene(VOYAGER_FRAME);
  voyager1Model.position.set(p.x + origin.x, p.y + origin.z, p.z + origin.y);
  voyager1Model.quaternion.setFromUnitVectors(DISH_AXIS, directionTo(SolarSystemObjects.earth, voyager1Model.position, dish));
  const scale = modelRealSize.value ? 1 : 10 ** modelLogScale.value;
  voyager1Model.scale.setScalar(scale / METERS_PER_AU);
}

function setVoyager2ModelPosition(time: Date) {
  if (!voyager2Model) {
    return;
  }
  const t = time.getTime();
  const p = voyager2PositionAt(t);
  voyager2Model.visible = p !== null;
  if (!p) {
    return;
  }
  const origin = bodyCenterInScene(VOYAGER_FRAME);
  voyager2Model.position.set(p.x + origin.x, p.y + origin.z, p.z + origin.y);
  voyager2Model.quaternion.setFromUnitVectors(DISH_AXIS, directionTo(SolarSystemObjects.earth, voyager2Model.position, dish));
  const scale = modelRealSize.value ? 1 : 10 ** modelLogScale.value;
  voyager2Model.scale.setScalar(scale / METERS_PER_AU);
}

const voyagerLightTime = ref("");

/** seconds as "22 h 41 m 07 s" */
function hoursMinutesSeconds(seconds: number): string {
  const s = Math.round(seconds);
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return `${Math.floor(s / 3600)} h ${pad(Math.floor((s % 3600) / 60))} m ${pad(s % 60)} s`;
}

/** Voyager's distance from Earth as light time (distance ÷ c), for the display */
function updateVoyagerLightTime() {
  const v = voyager1PositionAt(SpaceTimeController.get_now().getTime());
  voyagerLightTime.value = v
    ? hoursMinutesSeconds(lightTimeSeconds(distanceFromBodyKm(v, VOYAGER_FRAME, SolarSystemObjects.earth)))
    : "";
}

/** the solar-system view, Voyager's line, marker and model, and Saturn's moons. Call once WWT is ready */
function setUpVoyagerScene() {
  WWTControl.singleton.set_zoomMax(ZOOM_MAX);
  WWTControl.singleton.setSolarSystemMaxZoom(ZOOM_MAX);
  // the wheel and keys stop here too (the engine's own floor is 1e-8, a 665 m camera distance)
  WWTControl.singleton.setSolarSystemMinZoom(ZOOM_MIN);

  store.setBackgroundImageByName("Solar System");
  store.applySetting(["actualPlanetScale", false]);
  store.applySetting(["solarSystemScale", 1]);
  store.applySetting(["solarSystemCosmos", true]);
  store.applySetting(["solarSystemMilkyWay", true]);
  store.applySetting(["solarSystemStars", true]);
  store.applySetting(["solarSystemOrbits", true]);
  store.setClockSync(false);
  store.setTrackedObject(trackingCenter.value);
  // a tour step from the url has already set its event's time (its setup runs first)
  if (!showTour.value) {
    store.setTime(START_TIME);
  }

  createVoyagerOrbit();
  createSaturnMoonOrbits(store);
  // the engine's moon file clears every layer and map when it arrives
  skyMapReady().then(() => {
    createSaturnMoonLayers(store).then((layers) => (saturnMoonLayers.value = layers));
    // after the moons, so Voyager's marker is drawn on top where they overlap
    createVoyagerLayer();
  });

  // before useThreeModel, so the model is placed before three renders in the same frame
  store.addFrameCallback(() => setVoyager1ModelPosition(SpaceTimeController.get_now()));
  store.addFrameCallback(() => setVoyager2ModelPosition(SpaceTimeController.get_now()));
  store.addFrameCallback(updateVoyagerLightTime);
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

/** app tracking setup */
const STORY_NAME = "voyager" as const;
const appTime = createTrackingTimer({active: ref(true)});
const missionSliderUses = createTrackingCounter();
const userGuideTime = createTrackingTimer({active: computed(() => showTextSheet.value && infoSheetTab.value === "user-guide")});

function resetTrackingData() {
  appTime.reset();
  userGuideTime.reset();
  missionSliderUses.reset();
}

function getTrackingData() {
  return {
    app_time_ms: appTime.getTotalTime(),
    user_guide_time_ms: userGuideTime.getTotalTime(),
    mission_slider_use_count: missionSliderUses.count.value,
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
});

const {
  showRating,
  question,
  dismiss: dismissRating,
  optOut: optOutRating,
  updateUserExperienceInfo,
  initializePrompt,
} = useUserExperienceRating(STORY_NAME, userID, { 
  responseOptOut, 
  timeout: 45_000, 
  questions: [
    "How do you like this app?",
  ],
  mixin: false,
});

// rating's timeout runs independently of the splash/privacy dialogs, so gate its visibility on both being done first
const showRatingDialog = computed(() => showRating.value && !showSplashScreen.value && !showDataCollectionOptOut.value);

// tour setup //
const showTour = ref(false);

import {
  TourSheet,
  useTour,
  type BaseTourStepContent,
} from  "@cosmicds/vue-toolkit";

import { VOYAGER_1_EVENTS, eventWindow, type MissionEvent } from "./voyagerEvents";

interface TourStepContent extends BaseTourStepContent {
  event: MissionEvent;
}
const tour = useTour<TourStepContent>({
  /**
   be careful if you have multiple moves when your app starts up
   so that they don't conflict with each other.
   */
  // one step per mission event: the clock goes to it and the camera tracks its body
  steps: VOYAGER_1_EVENTS.map((event) => ({
    id: event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: event.title,
    text: [event.caption],
    event,
    setup: async () => {
      store.waitForReady().then(() => {
        store.setTime(event.date);
        if (event.track !== undefined) {
          trackingCenter.value = event.track;
        }
      });
    },
  })),
});
urlState.track("tour", tour.stepID);

// the step's slider: its event's window (it holds no other event), within the data
const stepWindow = computed(() => {
  const { start, end } = eventWindow(VOYAGER_1_EVENTS, tour.stepIndex.value);
  return {
    start: new Date(Math.max(start.getTime(), voyagerSpan.start.getTime())),
    end: new Date(Math.min(end.getTime(), voyagerSpan.end.getTime())),
  };
});

function startTour() {
  showTour.value = true;
  tour.goToStep(tour.stepIndex.value, true);
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
  get: () => !showSplashScreen.value && (showTextSheet.value || showUserGuideSheet.value || (showTour.value && !floatingTour.value)),
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


function closeSplashScreen() {
  showSplashScreen.value = false;
  // has the user responsed the opt out, then show the privacy dialog
  // pass `true` to only show it once per session, even if the user does not respond (for example if it shows up after an intro sequence)
  conditionalShowPrivacyDialog();
}


</script>

<style lang="less">
@import url(@/css/universal.css);
@import url(@/css/focus-visible.less);
:root {
  --default-font-size: clamp(0.7rem, 1.7vmin, 1.1rem);
  --default-line-height: clamp(1rem, 2.2vmin, 1.6rem);
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
    a { // should not be able click on a kiosk
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
    font-size: 1rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
  }
}

#right-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
  height: auto;
  pointer-events: auto;
}

#bottom-content {
  display: flex;
  flex-direction: row;
  width: 100%;
  pointer-events: auto;
  justify-content: flex-start;
  align-items: center;
  gap: 1rem;

}

#frame-controls {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 260px;
  padding: 8px;
  background-color: rgba(3, 1, 37, 0.8);
}

#center-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
}

#light-time {
  padding: 6px 14px;
  text-align: center;
  background-color: rgba(3, 1, 37, 0.8);

  .light-time-label {
    font-size: 12px;
    opacity: 0.8;
  }

  .light-time-value {
    font-family: monospace;
    font-size: 18px;
  }
}

// time controls + mission slider. the bottom margin leaves room for the credit logos
#timeline {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0 5% 2.5rem;
  display: flex;
  // bottom-align so the buttons line up with the track, not the track + date above it.
  // `end`, not `flex-end`: wrap-reverse flips which edge flex-end means
  align-items: end;
  gap: 0.5rem;
  // when there isn't room for both (e.g. the floating tour is open), wrap-reverse puts the
  // controls under the slider rather than above it, matching the small-screen layout
  flex-wrap: wrap-reverse;
  justify-content: center;
}

#mission-slider {
  // below ~400px the track itself gets too short to scrub
  flex: 1 1 400px;
  min-width: 0;
  // the current date on its own line, centered above the track
  flex-wrap: wrap;
  row-gap: 0;

  .mission-time-now {
    order: -1;
    flex-basis: 100%;
    text-align: center;
    padding-top: 4px;
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

  #mission-slider {
    // the 400px basis above is a width; in a column it would become the height
    flex: 0 0 auto;

    // no scrubbing on small screens: only the current date is shown, above the buttons
    .v-slider,
    .mission-time-end {
      display: none;
    }
  }

  // on phones the toolkit's SpeedControl spaces its buttons wider (~300px), so let "Now" wrap
  .wwt-clock-controls {
    flex-wrap: wrap;
    justify-content: center;
  }
}

.voyager-event {
  img {
    width: 100%;
    max-height: 20vh;
    object-fit: cover;
    border-radius: 4px;
  }

  .event-date,
  .event-credit {
    font-size: 0.85em;
    opacity: 0.8;
  }

  // the track on its own line, the dates and clock under it
  .mission-time-slider {
    flex-wrap: wrap;
    justify-content: space-between;
    margin-bottom: 0.5em;

    .v-slider {
      flex-basis: 100%;
      order: -1;
    }
  }
}

// neither #logo-credits nor #icons-container are flex
#logo-credits.cds-bottom-credits {
  position: absolute;
  bottom: 0.25rem;
  right: 0.5rem;
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

/* floats the tour: pulled out of the drawer (via Teleport) into #bottom-content's flex row, alongside e.g. the crossfade slider */
.floating-tour.tour-text {
  flex: 0 1 auto;
  width: 30vw;
  max-width: calc(100vw - 2rem);
  min-height: 0;
  max-height: 400px;
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


</style>
