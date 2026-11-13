<!-- The User Guide page content. Wrap in TabPage to show it as a tab in TabbedSheet. -->
<template>
  <div class="d-flex flex-column fill-height">
    <h4 class="user-guide-header mt-2">Sky Navigation</h4>
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
            <easyLink href="https://www.cosmicds.cfa.harvard.edu/">Science Reference</easyLink>
          </h5>
          <p>Science PI</p>
          <p>Data and Catalog References.</p>
          <h5>
            <easyLink href="https://www.cosmicds.cfa.harvard.edu/">CosmicDS</easyLink>
          </h5>
          <p>Pat Udomprasert</p>
          <p>Jon Carifio</p>
          <p>John Lewis</p>
          <p>Alyssa Goodman</p>

          <h5>
            <easyLink href="https://www.worldwidetelescope.org/home">WorldWide Telescope</easyLink>
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
import { h, type SetupContext } from "vue";
import { FundingAcknowledgement } from "@cosmicds/vue-toolkit";
import { useAppLayout } from "../composables/useAppLayout";

// https://v3-migration.vuejs.org/breaking-changes/functional-components
const easyLink = (props: { href: string }, { slots }: SetupContext) => {
  return h("a", { href: props.href, target: "_blank", rel: "noopener" }, slots.default?.());
};

const { touchscreen } = useAppLayout();

const emit = defineEmits<(e: "change-privacy-settings") => void>();
</script>

<style scoped>
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
