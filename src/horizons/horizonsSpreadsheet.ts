import {
  Color,
  SpaceTimeController,
  LayerManager,
  LayerMap,
  Matrix3d,
  Vector3d,
  WWTControl,
  type SpreadSheetLayer,
} from "@wwtelescope/engine";
import { CoordinatesType, MarkerScales, PlotTypes, SolarSystemObjects } from "@wwtelescope/engine-types";
import type { engineStore } from "@wwtelescope/engine-pinia";
import type { HorizonsVector } from "./horizons";
import { bodyCenterInScene } from "./orbitLine";
import { drawPointList } from "@/wwt-hacks";

type EngineStore = ReturnType<typeof engineStore>;
// the 7.41 typings give LayerMap no constructor
const LAYER_MAP = LayerMap as unknown as new (name: string, reference: number) => LayerMap;

const ORIGIN_ROW = ["0", "0", "0"];
// layers are only drawn between their start and end times (default 2100-01-01 local time)
const FAR_FUTURE = new Date(Date.UTC(3000, 0, 1));

/**
 * Resolves once the engine has its 'Sky' map. LayerManager.initLayers makes it when moons.txt arrives, after clearing
 * every layer and map, so make ours after this. (If moons.txt fails, there's no 'Sky' and this never resolves.)
 */
export function skyMapReady(): Promise<void> {
  return new Promise((resolve) => {
    const check = () => ("Sky" in LayerManager.get_allMaps() ? resolve() : setTimeout(check, 50));
    check();
  });
}

/** A custom frame under 'Sky' (made once per name); LayerManager._draw sets its worldMatrix from `worldMatrix()` at draw time */
function skyChildFrame(name: string, worldMatrix: () => Matrix3d): string {
  const maps = LayerManager.get_allMaps();
  if (!(name in maps)) {
    const sky = maps["Sky"];
    const map = new LAYER_MAP(name, 18);
    map.frame.name = name;
    map.frame.parent = sky.get_name();
    map.frame.computeFrame = () => {
      map.frame.worldMatrix = worldMatrix();
    };
    sky.addChild(map);
    maps[name] = map;
  }
  return name;
}

/**
 * * For spreadsheet layers, we need a WWT reference frame that matches the Horizons rows' frame (which we may have shifted).
 * By default layers go "on the Sky": 3D au with ecliptic axes and the origin at viewTarget, which is the
 * tracked body's surface point toward the camera, not its center.
 * So we create a frame that is a child of Sky, translated to the center of the body the rows are relative to.
 * WWT's own body frames ('Saturn', ...) don't fit: they spin and tilt with the body.
 */
export function horizonsReferenceFrame(body: SolarSystemObjects): string {
  // the translation to the body's center in the scene, so spreadsheet rows are drawn relative to that point
  return skyChildFrame(`Horizons ${SolarSystemObjects[body]}`, () => Matrix3d.translation(bodyCenterInScene(body)));
}

/** one screen-sized dot at its frame's origin */
function setupMarkerLayer(layer: SpreadSheetLayer, colorHex: string, useTriangle=false) {
  layer.set_xAxisColumn(0);
  layer.set_yAxisColumn(1);
  layer.set_zAxisColumn(2);
  layer.set_coordinatesType(CoordinatesType.rectangular);
  // the far-side test normalizes the vertex, which is 0
  layer.set_showFarSide(true);
  layer.set_markerScale(MarkerScales.screen);
  // normal alpha blending: the default gaussian is additive, and washes out over bright planets
  layer.set_plotType(useTriangle ? PlotTypes.gaussian : PlotTypes.filledCircle);
  layer.set_scaleFactor(useTriangle ? 33 : 25);
  layer.set_color(Color.fromHex(colorHex));
  layer.set_endTime(FAR_FUTURE);

  if (useTriangle) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore Triangle hacking
    layer.prepVertexBuffer(WWTControl.singleton.renderContext, layer.get_opacity()); layer.pointList.draw = drawPointList.bind(layer.pointList);
  }
  return layer;
}

/**
 * A one-row marker layer at `positionAt(now)`, a position relative to `frame`. Engine 7.41 draws layers after the planets, depth buffered.
 * The row is at the origin of its own frame, which moves to the position when it's drawn (in doubles, at the frame's
 * time), so the float32 vertex is exact and the marker doesn't lag a frame. The row is only dropped outside the data.
 * Markers made later are drawn on top.
 */
export function createMovingMarkerLayer(
  store: EngineStore,
  name: string,
  frame: SolarSystemObjects,
  colorHex: string,
  positionAt: (t: number) => HorizonsVector | null,
  useTriangle=false,
): Promise<SpreadSheetLayer> {
  let shown = positionAt(SpaceTimeController.get_now().getTime()) !== null;
  let layer: SpreadSheetLayer | null = null;

  const markerFrame = skyChildFrame(`Marker ${name}`, () => {
    const center = bodyCenterInScene(frame);
    const v = positionAt(SpaceTimeController.get_now().getTime());
    if (layer && (v !== null) !== shown) {
      shown = v !== null;
      layer.get__table().rows = shown ? [ORIGIN_ROW] : [];
      layer.dirty = true;
    }
    return Matrix3d.translation(v ? Vector3d.create(center.x + v.x, center.y + v.z, center.z + v.y) : center);
  });

  const dataCsv = shown ? "x,y,z\r\n0,0,0" : "x,y,z";
  return store
    .createTableLayer({ name, referenceFrame: markerFrame, dataCsv })
    .then((created) => (layer = setupMarkerLayer(created, colorHex, useTriangle)));
}
