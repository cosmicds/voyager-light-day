import { computed } from "vue";
import { WWTControl } from "@wwtelescope/engine";
import { engineStore } from "@wwtelescope/engine-pinia";

export function useScaledZoom() {
  const store = engineStore();

  // WWT's solar-system camera sits 4 * zoom / 9 AU from its target
  const ZOOM_MIN = 0.00006; // the usual floor, ~4,000 km
  // ~130 m, close enough to see a spacecraft model at actual size; see allowCloseZoom
  const ZOOM_MIN_CLOSE = 2e-9;
  const ZOOM_MAX = 2400;
  // the slider always spans the close floor; outside close zoom its top end stops at ZOOM_MIN
  const LOG_MIN = Math.log(ZOOM_MIN_CLOSE);
  const LOG_MAX = Math.log(ZOOM_MAX);
  // Power < 1 stretches the small-fov (zoomed-in) end of the slider.
  const ZOOM_POWER = 3.5;

  // Map linear slider position [0,1] → stretched slider position [0,1].
  const stretchSlider = (t: number) => Math.pow(t, ZOOM_POWER);
  // Inverse: stretched slider position → linear slider position.
  const unstretchSlider = (t: number) => Math.pow(t, 1 / ZOOM_POWER);

  function fovToSlider(fov: number): number {
    const linear = (Math.log(fov) - LOG_MIN) / (LOG_MAX - LOG_MIN);
    return unstretchSlider(Math.max(linear, 0));
  }
  function sliderToFov(t: number): number {
    return Math.exp(LOG_MIN + stretchSlider(t) * (LOG_MAX - LOG_MIN));
  }

  const zoomSliderValue = computed(() => fovToSlider(store.zoomDeg));

  // the floor last given to WWT (which the wheel and keys use), set by allowCloseZoom
  let floor = ZOOM_MIN;

  /** set the zoom directly, within the current floor and ZOOM_MAX */
  function setZoom(zoom: number): number {
    const control = WWTControl.singleton;
    const clamped = Math.min(Math.max(zoom, floor), ZOOM_MAX);
    control.renderContext.targetCamera.zoom = clamped;
    control.renderContext.viewCamera.zoom = clamped;
    control.renderOneFrame();
    return clamped;
  }

  function onZoomSlider(e: Event) {
    const input = e.target as HTMLInputElement;
    const zoom = setZoom(sliderToFov(+input.value));
    // past the floor the zoom doesn't change, so nothing re-renders the thumb back to it
    input.value = `${fovToSlider(zoom)}`;
  }

  // the camera's zoom now: store.zoomDeg only catches up on WWT's next frame (and is 0 before the first)
  const currentZoom = () => WWTControl.singleton.renderContext.viewCamera.zoom;

  function zoomIn() {
    setZoom(currentZoom() / 1.25);
  }

  function zoomOut() {
    setZoom(currentZoom() * 1.25);
  }

  /** lower WWT's floor to ZOOM_MIN_CLOSE, or put it back (pulling the camera out if it's closer than that) */
  function allowCloseZoom(allow: boolean) {
    floor = allow ? ZOOM_MIN_CLOSE : ZOOM_MIN;
    WWTControl.singleton.setSolarSystemMinZoom(floor);
    // WWT only re-clamps the zoom when the view mode changes
    if (currentZoom() < floor) {
      setZoom(floor);
    }
  }

  return {
    zoomSliderValue,
    onZoomSlider,
    ZOOM_MAX,
    zoomIn,
    zoomOut,
    allowCloseZoom,
  };
}
