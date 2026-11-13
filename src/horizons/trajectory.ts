import type { SolarSystemObjects } from "@wwtelescope/engine-types";
import { HermiteTrajectory } from "./hermite";
import type { HorizonsVector } from "./horizons";
import { tdbFromUtc } from "./horizons_helpers";
import { precessEclipticJ2000ToDate, bodyCenterPositionJ2000, bodyCenterVelocityJ2000 } from "./precession";

/**
 * Moves rows from their current (often Horizons) center (`center`, e.g. the Sun) to another body's center (`frame`, e.g. Saturn):
 * each row subtracts the new reference frame's (the body center's) position and velocity at that row's time.
 * The axes stay J2000 ecliptic and don't turn with the new reference frame (planet/body), so the velocities stay instantaneous.
 */
export function rowsRelativeToFrame(
  vectors: HorizonsVector[],
  center: SolarSystemObjects,
  frame: SolarSystemObjects,
): HorizonsVector[] {
  if (frame === center) {
    return vectors;
  }
  return vectors.map((v) => {
    // get the reference frame's position, so we can correct our vector
    const [fx, fy, fz] = bodyCenterPositionJ2000(v.jdtdb, center, frame);
    const [x, y, z] = [v.x - fx, v.y - fy, v.z - fz];
    if (v.vx === undefined) {
      return { ...v, x, y, z };
    }
    // get the reference frame's velocity, so we can correct our vector's instantaneous velocity
    const [fvx, fvy, fvz] = bodyCenterVelocityJ2000(v.jdtdb, center, frame);
    return { ...v, x, y, z, vx: v.vx - fvx, vy: v.vy! - fvy, vz: v.vz! - fvz };
  });
}

/** J2000 rows each precessed to their own date's ecliptic (positions and instantaneous velocities) */
export function rowsInEclipticOfDate(vectors: HorizonsVector[]): HorizonsVector[] {
  return vectors.map((v) => {
    const [x, y, z] = precessEclipticJ2000ToDate(v.x, v.y, v.z, v.jdtdb);
    if (v.vx === undefined) {
      return { ...v, x, y, z };
    }
    const [vx, vy, vz] = precessEclipticJ2000ToDate(v.vx, v.vy!, v.vz!, v.jdtdb);
    return { ...v, x, y, z, vx, vy, vz };
  });
}

/** a J2000 row precessed to the ecliptic of date at UT time t (ms), and dated t */
export function precessedToTime(v: HorizonsVector, t: number): HorizonsVector {
  const jdtdb = tdbFromUtc(t);
  const [x, y, z] = precessEclipticJ2000ToDate(v.x, v.y, v.z, jdtdb);
  if (v.vx === undefined) {
    return { jdtdb, date: new Date(t), x, y, z };
  }
  const [vx, vy, vz] = precessEclipticJ2000ToDate(v.vx, v.vy!, v.vz!, jdtdb);
  return { jdtdb, date: new Date(t), x, y, z, vx, vy, vz };
}

/**
 * Where consecutive rows jump (a seam between trajectory solutions, like Voyager 1's at 1981-01-01): i such that
 * row i → i + 1 moves much faster than the rows' own velocities. Elsewhere the ratio is within 0.2% of 1.
 */
function seamIndices(vectors: HorizonsVector[]): number[] {
  const seams: number[] = [];
  for (let i = 0; i + 1 < vectors.length; i++) {
    const [a, b] = [vectors[i], vectors[i + 1]];
    const chordSpeed = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / (b.jdtdb - a.jdtdb);
    const speed = (Math.hypot(a.vx!, a.vy!, a.vz!) + Math.hypot(b.vx!, b.vy!, b.vz!)) / 2;
    if (chordSpeed > 1.5 * speed) {
      seams.push(i);
    }
  }
  return seams;
}

/** the rows between seams, so nothing interpolates across one (a lone row between two seams can't be, so it's dropped) */
export function splitAtSeams(vectors: HorizonsVector[]): HorizonsVector[][] {
  const runs: HorizonsVector[][] = [];
  let start = 0;
  for (const i of seamIndices(vectors)) {
    runs.push(vectors.slice(start, i + 1));
    start = i + 1;
  }
  runs.push(vectors.slice(start));
  return runs.filter((run) => run.length > 1);
}

/** cubic Hermite through rows with velocities, knots at their TDB */
function hermiteThrough(vectors: HorizonsVector[]): HermiteTrajectory {
  return new HermiteTrajectory(
    vectors.map((v) => v.jdtdb),
    vectors.map((v) => ({ x: v.x, y: v.y, z: v.z })),
    vectors.map((v) => ({ x: v.vx!, y: v.vy!, z: v.vz! })),
  );
}

/** the run a TDB time belongs to; between two runs, the nearer one */
function runIndexAt(runs: HermiteTrajectory[], jdtdb: number): number {
  let k = 0;
  while (k + 1 < runs.length && jdtdb > (runs[k].endTime + runs[k + 1].startTime) / 2) {
    k++;
  }
  return k;
}

/** how many pieces to cut a knot interval into so a chord strays at most tolAu from the curve (sag ≈ dt·|Δv|/8 per piece²) */
function piecesFor(a: HorizonsVector, b: HorizonsVector, tolAu: number): number {
  const dv = Math.hypot(b.vx! - a.vx!, b.vy! - a.vy!, b.vz! - a.vz!);
  return Math.max(1, Math.ceil(Math.sqrt(((b.jdtdb - a.jdtdb) * dv) / 8 / tolAu)));
}

/** the rows (one run, with velocities) plus Hermite points between them, so straight lines through them stay within tolAu of the curve */
export function densifiedRows(vectors: HorizonsVector[], tolAu: number): HorizonsVector[] {
  const hermite = hermiteThrough(vectors);
  const out = [vectors[0]];
  const position = { x: 0, y: 0, z: 0 };
  const velocity = { x: 0, y: 0, z: 0 };
  for (let i = 1; i < vectors.length; i++) {
    const [a, b] = [vectors[i - 1], vectors[i]];
    const n = piecesFor(a, b, tolAu);
    for (let k = 1; k < n; k++) {
      const jdtdb = a.jdtdb + (k * (b.jdtdb - a.jdtdb)) / n;
      hermite.evaluate(jdtdb, position, velocity);
      const date = new Date(a.date.getTime() + (k * (b.date.getTime() - a.date.getTime())) / n);
      const { x, y, z } = position;
      out.push({ jdtdb, date, x, y, z, vx: velocity.x, vy: velocity.y, vz: velocity.z });
    }
    out.push(b);
  }
  return out;
}

/** The J2000 position and velocity at a UT time (ms), or null outside the rows: Hermite through each run between seams. Needs velocities */
export function j2000PositionAt(vectors: HorizonsVector[]): (t: number) => HorizonsVector | null {
  const runs = splitAtSeams(vectors).map((run) => hermiteThrough(run));
  const [start, end] = [vectors[0].date.getTime(), vectors[vectors.length - 1].date.getTime()];
  const position = { x: 0, y: 0, z: 0 };
  const velocity = { x: 0, y: 0, z: 0 };
  return (t: number) => {
    if (t < start || t > end) {
      return null;
    }
    const jdtdb = tdbFromUtc(t);
    const run = runs[runIndexAt(runs, jdtdb)];
    // kept inside the run: WWT's delta-T differs from Horizons' (160 s by 2100), and in a seam's gap it holds the run's end
    run.evaluate(Math.min(Math.max(jdtdb, run.startTime), run.endTime), position, velocity);
    const { x, y, z } = position;
    return { jdtdb, date: new Date(t), x, y, z, vx: velocity.x, vy: velocity.y, vz: velocity.z };
  };
}

/** The position at a UT time (ms), or null outside the data: j2000PositionAt precessed to the time's ecliptic */
export function interpolatedPositionAt(vectors: HorizonsVector[]): (t: number) => HorizonsVector | null {
  const at = j2000PositionAt(vectors);
  return (t: number) => {
    const v = at(t);
    return v && precessedToTime(v, t);
  };
}
