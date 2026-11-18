<!-- The User Guide page content. Wrap in TabPage to show it as a tab in TabbedSheet. -->
<template>
  <div class="d-flex flex-column fill-height user-guide">
    <p class="mb-3">
      This Cosmic Data Story is a companion to a <easyLink href="https://www.mos.org/events/beyond-telescope-voyager-1s-journey-one-light-day">presentation</easyLink> given at the Museum of Science's Charles Hayden Planetarium by John Lewis and Pat Udomprasert, in collaboration with Caity Sullivan and Dani LeBlanc.
    </p>
    <p>
      This resource is powered by <easyLink href="https://worldwidetelescope.org/home">WorldWide Telescope</easyLink>.
    </p>
    <h4 class="user-guide-header mt-5 mb-2">Sky Navigation</h4>
    <p>To navigate the WWT view, use the following controls:</p>
    <v-row
      align-content="center"
      dense
      class="mt-2 mx-3"
    >
      <v-col cols="4">
        <v-chip
          label
          density="compact"
          variant="outlined"
        >
          Pan
        </v-chip>
      </v-col>
      <v-col
        cols="8"
        class="pt-1"
      >
        <strong>{{ touchscreen ? "press + drag" : "click + drag" }}</strong> {{ touchscreen ? "" : "or" }}
        <strong>{{ touchscreen ? "" : "W-A-S-D" }}</strong> {{ touchscreen ? "" : "keys" }}<br />
      </v-col>
    </v-row>
    <v-row
      align-content="center"
      dense
      class="mx-3"
    >
      <v-col cols="4">
        <v-chip
          label
          density="compact"
          variant="outlined"
        >
          Zoom
        </v-chip>
      </v-col>
      <v-col
        cols="8"
        class="pt-1"
      >
        <strong>{{ touchscreen ? "pinch in and out" : "scroll in and out" }}</strong> {{ touchscreen ? "" : "or" }}
        <strong>{{ touchscreen ? "" : "I-O" }}</strong> {{ touchscreen ? "" : "keys" }}<br />
      </v-col>
    </v-row>
    <v-row
      align-content="center"
      dense
      class="mx-3"
    >
      <v-col cols="4">
        <v-chip
          label
          density="compact"
          variant="outlined"
        >
          Rotate
        </v-chip>
      </v-col>
      <v-col
        cols="8"
        class="pt-1"
      >
        {{ touchscreen ? "" : "press" }}
        <strong>{{ touchscreen ? "pinch and twist" : "control + click + drag" }}</strong> {{ touchscreen ? "" : "" }}
        <strong>{{ touchscreen ? "" : "" }}</strong> {{ touchscreen ? "" : "" }}<br />
      </v-col>
    </v-row>

    <!-- Credits -->
    <v-row>
      <v-col cols="12">
        <div class="credits">
          <h4 class="user-guide-header mt-3">Credits</h4>
          <h5>
            Technical Note
          </h5>
          <p>Paths for Voyager 1, Voyager 2, Titan, and Miranda are created from <easyLink href="https://ssd.jpl.nasa.gov/horizons/">JPL Horizons Vector Tables</easyLink>.</p>
          <p class="mt-1">The model for the heliosphere comes from the SHIELD "Croissant" model of the heliosphere by <easyLink href="https://www.nature.com/articles/s41550-020-1036-0"> Merav Opher et. al. (2020)</easyLink>. The printable 3D model can be downloaded from the Boston University SHIELD Drive Center <easyLink href="https://shielddrivecenter.com/community-products/">Community Products page</easyLink>.</p>
          <h5>
            <easyLink href="https://www.cosmicds.cfa.harvard.edu/">CosmicDS Team</easyLink>
          </h5>
          <p>John Lewis</p>
          <p>Pat Udomprasert</p>
          <p>Jon Carifio</p>
          <p>Alyssa Goodman</p>

          <h5>
            <easyLink href="https://www.worldwidetelescope.org/home">WorldWide Telescope Team</easyLink>
          </h5>
          <p>Jon Carifio</p>
          <p>David Weigel</p>
          <p>Peter Williams</p>
        </div>
        <v-spacer class="end-spacer"></v-spacer>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <slot name="privacy-settings">
          <v-btn
            prepend-icon="mdi-lock"
            variant="tonal"
            size="small"
            @click="emit('change-privacy-settings')"
          >
            Change Privacy Settings
          </v-btn>
        </slot>
      </v-col>
    </v-row>
    <v-row class="mt-auto">
      <!-- pinned to the bottom of the sheet -->
      <v-col>
        <funding-acknowledgement />
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { h, type SetupContext, toRefs } from "vue";
import { FundingAcknowledgement } from "@cosmicds/vue-toolkit";
import { useAppLayout } from "../composables/useAppLayout";

// https://v3-migration.vuejs.org/breaking-changes/functional-components
const easyLink = (props: { href: string }, { slots }: SetupContext) => {
  return h("a", { href: props.href, target: "_blank", rel: "noopener" }, slots.default?.());
};

const { touchscreen } = toRefs(useAppLayout());

const emit = defineEmits<(e: "change-privacy-settings") => void>();
</script>

<style scoped>
.user-guide {
  font-size: 0.9em;
}
/* the gap under the credits, so the last line clears the bottom of the sheet */
.end-spacer {
  height: 25px;
}

.v-row {
  flex-grow: 0;
}

kbd {
  font-size: 0.8em;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 2px 4px;
  font-family: monospace;
  font-weight: bold;
  box-shadow: 0px 2px 1px #ccc;
}
</style>
