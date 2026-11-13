import { OrbitLineList, Color, Vector3d, Matrix3d, Planets, WWTControl } from "@wwtelescope/engine";
import type { SolarSystemObjects } from "@wwtelescope/engine-types";
import type { HorizonsVector } from "./horizons";
import type { Vec3 } from "./hermite";
import { densifiedRows, splitAtSeams } from "./trajectory";
import { precessEclipticDateToJ2000, precessionMatrix } from "./precession";

// the line colour is in the vertices; the shader multiplies it by this
const WHITE = Color.fromHex("#ffffff");
const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };
/** lines stay within 3 km of the Hermite curve, up to ~5 km on 64-day knots (1–1.5 px at the closest zoom) */
export const LINE_TOLERANCE_AU = 3 / 149597870.7;
// line vertices are float32, good to ~6e-8 of their distance from the line's center: keep the center within this × zoom
// of the camera target (0.1 au at the closest zoom), a quarter pixel at any zoom
const RECENTER_AU_PER_ZOOM = 1700;

/** An OrbitLineList through J2000 rows, in WWT's (x, z, y) order, relative to `center` (in doubles, so the float32 vertices stay small) */
export function createOrbitLineList(vectors: Vec3[], colorHex = "#ffffff", center: Vec3 = ORIGIN): OrbitLineList {
  const lineList = new OrbitLineList();
  const color = Color.fromHex(colorHex);
  const points = vectors.map((v) => Vector3d.create(v.x - center.x, v.z - center.z, v.y - center.y));
  for (let i = 1; i < points.length; i++) {
    lineList.addLine(points[i - 1], points[i], color, color);
  }
  return lineList;
}

/**
 * Where WWT draws `body`'s center in the solar system scene (x, z, y order).
 * The scene is drawn relative to viewTarget: the tracked object plus its radius toward the camera.
 */
export function bodyCenterInScene(body: SolarSystemObjects): Vector3d {
  const viewTarget = WWTControl.singleton.renderContext.viewCamera.viewTarget;
  return Vector3d.subtractVectors(Planets.getPlanet3dLocation(body), viewTarget);
}

/**
 * Draw a line list of J2000 points relative to `center` in `frame`: world = rotation (e.g. precessionMatrix(tdbNow())),
 * then translation to the frame's center plus the rotated `center`, in doubles. Call from a frame callback.
 */
export function drawOrbitLineInFrame(
  lineList: OrbitLineList,
  frame: SolarSystemObjects,
  rotation = Matrix3d.get_identity(),
  center: Vec3 = ORIGIN,
) {
  const ctx = WWTControl.singleton.renderContext;
  const c = rotation.transform(Vector3d.create(center.x, center.z, center.y));
  const o = bodyCenterInScene(frame);
  const offset = Matrix3d.translation(Vector3d.create(c.x + o.x, c.y + o.y, c.z + o.z));
  const world = ctx.get_world();
  ctx.set_world(Matrix3d.multiplyMatrix(Matrix3d.multiplyMatrix(rotation, offset), world));
  lineList.drawLines(ctx, 1, WHITE);
  ctx.set_world(world);
}

/** the camera target (the scene's origin) as a J2000 point relative to `frame` */
function viewTargetInFrame(frame: SolarSystemObjects, jdtdb: number): Vec3 {
  const o = bodyCenterInScene(frame);
  const [x, y, z] = precessEclipticDateToJ2000(-o.x, -o.z, -o.y, jdtdb);
  return { x, y, z };
}

export interface TrajectoryLine {
  /** J2000 points relative to the line's frame: each run between seams, densified */
  runs: HorizonsVector[][];
  colorHex: string;
  /** the vertices are relative to this (J2000, relative to the frame), near the camera target */
  center: Vec3;
  lineLists: OrbitLineList[];
}

/** A line through J2000 rows with velocities: no segment across a seam, and densified to stay within tolAu of the Hermite */
export function createTrajectoryLine(vectors: HorizonsVector[], tolAu: number, colorHex = "#ffffff"): TrajectoryLine {
  const runs = splitAtSeams(vectors).map((rows) => densifiedRows(rows, tolAu));
  return { runs, colorHex, center: ORIGIN, lineLists: [] };
}

/**
 * Draw a trajectory line in `frame` at TDB jdtdb (rotated to that date's ecliptic). Relative to the frame's center, the
 * float32 vertices near a camera far out (following Voyager) were tens to hundreds of px off, or culled. So they're kept
 * relative to a point near the camera target, and rebuilt when the target moves too far from it for the zoom.
 */
export function drawTrajectoryLineInFrame(line: TrajectoryLine, frame: SolarSystemObjects, jdtdb: number) {
  const target = viewTargetInFrame(frame, jdtdb);
  const c = line.center;
  const recenterAu = RECENTER_AU_PER_ZOOM * WWTControl.singleton.renderContext.viewCamera.zoom;
  if (line.lineLists.length === 0 || Math.hypot(target.x - c.x, target.y - c.y, target.z - c.z) > recenterAu) {
    // clear() frees the GL buffers
    line.lineLists.forEach((lineList) => lineList.clear());
    line.center = target;
    line.lineLists = line.runs.map((run) => createOrbitLineList(run, line.colorHex, target));
  }
  const rotation = precessionMatrix(jdtdb);
  line.lineLists.forEach((lineList) => drawOrbitLineInFrame(lineList, frame, rotation, line.center));
}
