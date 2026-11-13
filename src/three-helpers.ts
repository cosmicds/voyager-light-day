import { type Ref } from "vue";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { WWTControl } from "@wwtelescope/engine";
import type { engineStore } from "@wwtelescope/engine-pinia";

type EngineStore = ReturnType<typeof engineStore>;

// WWT's scene is (x, z, y); with this in the camera the three.js scene is ecliptic (X, Y, Z), so the glb isn't
// mirrored and three's face culling (which assumes a right-handed camera) is right
// prettier-ignore
const ECLIPTIC_TO_WWT = new THREE.Matrix4().set(
  1, 0, 0, 0,
  0, 0, 1, 0,
  0, 1, 0, 0,
  0, 0, 0, 1,
);

/**
 * Draw a three.js scene into WWT's canvas at the end of each frame, with that frame's view and projection,
 * and load a glb into it. The scene is ecliptic (X, Y, Z) au relative to viewTarget. Call once WWT is ready.
 * (The part of @cosmicds/three-wwt's setupFromStore we used, without its bundled copy of the engine.)
 */
export function useThreeModel(
  store: EngineStore,
  glbUrl: string,
  renderThree: Ref<boolean>,
  onLoad: (model: THREE.Group) => void,
) {
  const ctl = WWTControl.singleton;
  const renderer = new THREE.WebGLRenderer({ canvas: ctl.canvas, context: ctl.renderContext.gl });
  // the constructor changes GL state (culling, depth test) that WWT relies on being the default
  renderer.resetState();
  renderer.autoClear = false; // draw over WWT's frame, tested against its depth
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 1));
  const camera = new THREE.PerspectiveCamera();
  camera.matrixWorldAutoUpdate = false; // its matrices are WWT's, set each frame; render() would recompute them

  store.addFrameCallback(() => {
    if (!renderThree.value) {
      return;
    }
    const rc = ctl.renderContext;
    camera.projectionMatrix.fromArray(rc.get_projection().floatArray());
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.matrixWorldInverse.fromArray(rc.get_view().floatArray()).multiply(ECLIPTIC_TO_WWT);
    camera.matrixWorld.copy(camera.matrixWorldInverse).invert();
    // three's GL state cache doesn't see WWT's calls; this also sets the viewport to the canvas
    renderer.resetState();
    renderer.render(scene, camera);
    renderer.resetState();
  });

  new GLTFLoader().load(
    glbUrl,
    (gltf: GLTF) => {
      scene.add(gltf.scene);
      onLoad(gltf.scene);
    },
    undefined,
    (error: unknown) => console.error(error),
  );

  return { scene, camera, renderer };
}
