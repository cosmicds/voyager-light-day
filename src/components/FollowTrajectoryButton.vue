<template>
  <v-btn
    :active="following"
    density="compact"
    variant="tonal"
    @click="following ? stop() : start()"
  >
    {{ following ? "Stop following" : label }}
  </v-btn>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { engineStore } from "@wwtelescope/engine-pinia";
import { Planets, SpaceTimeController, Vector3d, WWTControl } from "@wwtelescope/engine";
import type { SolarSystemObjects } from "@wwtelescope/engine-types";
import type { HorizonsVector } from "@/horizons/horizons";

// WWT can't track a trajectory. So we track nothing (65536), which leaves the camera's target alone,
// and set it ourselves in _updateViewParameters: after the planets move, before the camera is set up.
const props = withDefaults(
  defineProps<{
    /** the position relative to `frame` at a UT time (ms) */
    positionAt: (t: number) => HorizonsVector | null;
    frame: SolarSystemObjects;
    label?: string;
  }>(),
  { label: "Follow" },
);

const NO_TARGET = 65536 as SolarSystemObjects;
const store = engineStore();
const following = ref(false);
let previousTrack = NO_TARGET;
let engineUpdate: () => void;

function start() {
  const control = WWTControl.singleton;
  previousTrack = control.renderContext.get_solarSystemTrack();
  store.setTrackedObject(NO_TARGET);
  engineUpdate = control._updateViewParameters;
  const update = engineUpdate.bind(control);
  control._updateViewParameters = () => {
    update();
    follow();
  };
  following.value = true;
}

// back to the old track; follow() sees it and unhooks
function stop() {
  store.setTrackedObject(previousTrack);
}

function unhook() {
  WWTControl.singleton._updateViewParameters = engineUpdate;
  following.value = false;
}

function follow() {
  const rc = WWTControl.singleton.renderContext;
  // picking another track stops following
  if (rc.get_solarSystemTrack() !== NO_TARGET) {
    unhook();
    return;
  }
  const v = props.positionAt(SpaceTimeController.get_now().getTime());
  if (!v) {
    return;
  }
  // heliocentric, WWT x, z, y order. Both cameras, since WWT eases one toward the other
  const origin = Planets.getPlanet3dLocation(props.frame);
  rc.viewCamera.viewTarget = Vector3d.create(v.x + origin.x, v.z + origin.y, v.y + origin.z);
  rc.targetCamera.viewTarget = Vector3d.create(v.x + origin.x, v.z + origin.y, v.y + origin.z);
}

onBeforeUnmount(() => following.value && unhook());
</script>
