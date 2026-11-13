import { onBeforeUnmount } from "vue";
import { engineStore } from "@wwtelescope/engine-pinia";
import { Planets, SpaceTimeController, Vector3d, WWTControl } from "@wwtelescope/engine";
import type { SolarSystemObjects } from "@wwtelescope/engine-types";
import type { HorizonsVector } from "@/horizons/horizons";

/** the position relative to the frame at a UT time (ms) */
export type PositionAt = (t: number) => HorizonsVector | null;

// WWT can't track a trajectory. So we track nothing (65536), which leaves the camera's target alone,
// and set it ourselves in _updateViewParameters: after the planets move, before the camera is set up.
const NO_TARGET = 65536 as SolarSystemObjects;

/** keep the camera on a trajectory given relative to `frame`. Tracking any object stops it */
export function useFollowTrajectory(frame: SolarSystemObjects) {
  const store = engineStore();
  let positionAt: PositionAt | null = null;
  let engineUpdate: (() => void) | null = null;

  /** follow this trajectory (switching from another one just swaps it) */
  function follow(trajectory: PositionAt) {
    positionAt = trajectory;
    if (engineUpdate) {
      return;
    }
    const control = WWTControl.singleton;
    store.setTrackedObject(NO_TARGET);
    engineUpdate = control._updateViewParameters;
    const update = engineUpdate.bind(control);
    control._updateViewParameters = () => {
      update();
      followStep();
    };
  }

  function unhook() {
    if (engineUpdate) {
      WWTControl.singleton._updateViewParameters = engineUpdate;
    }
    engineUpdate = null;
    positionAt = null;
  }

  function followStep() {
    const rc = WWTControl.singleton.renderContext;
    // picking another track stops following
    if (rc.get_solarSystemTrack() !== NO_TARGET || !positionAt) {
      unhook();
      return;
    }
    const v = positionAt(SpaceTimeController.get_now().getTime());
    if (!v) {
      return;
    }
    // heliocentric, WWT x, z, y order. Both cameras, since WWT eases one toward the other
    const origin = Planets.getPlanet3dLocation(frame);
    rc.viewCamera.viewTarget = Vector3d.create(v.x + origin.x, v.z + origin.y, v.y + origin.z);
    rc.targetCamera.viewTarget = Vector3d.create(v.x + origin.x, v.z + origin.y, v.y + origin.z);
  }

  onBeforeUnmount(unhook);

  return { follow };
}
