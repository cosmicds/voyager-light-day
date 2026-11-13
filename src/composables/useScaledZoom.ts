import { computed } from "vue";
import { WWTControl } from "@wwtelescope/engine";
import { engineStore } from "@wwtelescope/engine-pinia";

export function useScaledZoom() {
  const store = engineStore();

  const ZOOM_MIN = 0.00006;
  const ZOOM_MAX = 2400;
  const LOG_MIN = Math.log(ZOOM_MIN);
  const LOG_MAX = Math.log(ZOOM_MAX);
  // Power < 1 stretches the small-fov (zoomed-in) end of the slider.
  const ZOOM_POWER = 3.5;

  // Map linear slider position [0,1] → stretched slider position [0,1].
  const stretchSlider = (t: number) => Math.pow(t, ZOOM_POWER);
  // Inverse: stretched slider position → linear slider position.
  const unstretchSlider = (t: number) => Math.pow(t, 1 / ZOOM_POWER);

  function fovToSlider(fov: number): number {
    const linear = (Math.log(fov) - LOG_MIN) / (LOG_MAX - LOG_MIN);
    return unstretchSlider(linear);
  }
  function sliderToFov(t: number): number {
    return Math.exp(LOG_MIN + stretchSlider(t) * (LOG_MAX - LOG_MIN));
  }

  const zoomSliderValue = computed(() => fovToSlider(store.zoomDeg));

  function onZoomSlider(e: Event) {
    const fov = sliderToFov(+(e.target as HTMLInputElement).value);
    const rc = WWTControl.singleton.renderContext;
    rc.targetCamera.zoom = fov;
    rc.viewCamera.zoom = fov;
    WWTControl.singleton.renderOneFrame();
  }

  function zoomIn() {
    const newZoom = store.zoomDeg / 1.25;
    const clampedZoom = Math.max(newZoom, ZOOM_MIN);
    const rc = WWTControl.singleton.renderContext;
    rc.targetCamera.zoom = clampedZoom;
    rc.viewCamera.zoom = clampedZoom;
    WWTControl.singleton.renderOneFrame();
  }

  function zoomOut() {
    const newZoom = store.zoomDeg * 1.25;
    const clampedZoom = Math.min(newZoom, ZOOM_MAX);
    const rc = WWTControl.singleton.renderContext;
    rc.targetCamera.zoom = clampedZoom;
    rc.viewCamera.zoom = clampedZoom;
    WWTControl.singleton.renderOneFrame();
  }

  return {
    zoomSliderValue,
    onZoomSlider,
    ZOOM_MAX,
    ZOOM_MIN,
    zoomIn,
    zoomOut,
  };
}
