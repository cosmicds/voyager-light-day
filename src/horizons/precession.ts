/**
 * Precession and frame changes for Horizons positions (Horizons X, Y, Z order unless noted)
 */
import { CAAPrecession, DYT, Matrix3d, Planets, Vector3d } from "@wwtelescope/engine";
import { SolarSystemObjects } from "@wwtelescope/engine-types";

export type ThreeNumber = [number, number, number];

const D2S = 24 * 60 * 60;
const J2000 = 2451545.0;
const R2D = 180 / Math.PI;
const D2R = Math.PI / 180;

/** Rotate ecliptic (X, Y, Z) from the mean ecliptic and equinox of jd0 to that of jd (TDB) */
export function precessEcliptic(x: number, y: number, z: number, jd0: number, jd: number): ThreeNumber {
  const r = Math.hypot(x, y, z);
  if (r === 0) {
    return [x, y, z];
  }
  const lambda = Math.atan2(y, x) * R2D;
  const beta = Math.asin(z / r) * R2D;
  const precessed = CAAPrecession.precessEcliptic(lambda, beta, jd0, jd);
  const lng = precessed.x * D2R;
  const lat = precessed.y * D2R;
  return [r * Math.cos(lat) * Math.cos(lng), r * Math.cos(lat) * Math.sin(lng), r * Math.sin(lat)];
}

/**
 * Horizons vector tables only offer the ecliptic of J2000, but WWT places planets
 * in the ecliptic of date. Rotate Horizons ecliptic (X, Y, Z) from J2000 to the
 * ecliptic of date.
 **/
export function precessEclipticJ2000ToDate(x: number, y: number, z: number, jdtdb: number): ThreeNumber {
  return precessEcliptic(x, y, z, J2000, jdtdb);
}

/** the reverse: ecliptic of date (TDB jdtdb) to the ecliptic of J2000 */
export function precessEclipticDateToJ2000(x: number, y: number, z: number, jdtdb: number): ThreeNumber {
  return precessEcliptic(x, y, z, jdtdb, J2000);
}

/** precessEclipticJ2000ToDate as a WWT matrix (x, z, y order; the rows are where WWT's x, y, z axes go) */
export function precessionMatrix(jdtdb: number): Matrix3d {
  const ex = precessEclipticJ2000ToDate(1, 0, 0, jdtdb);
  const ey = precessEclipticJ2000ToDate(0, 1, 0, jdtdb);
  // the pole is singular for precessEcliptic, but a rotation keeps X × Y = Z
  const ez = [ex[1] * ey[2] - ex[2] * ey[1], ex[2] * ey[0] - ex[0] * ey[2], ex[0] * ey[1] - ex[1] * ey[0]];
  // WWT x, y, z are Horizons X, Z, Y
  // prettier-ignore
  return Matrix3d.create(
    ex[0], ex[2], ex[1], 0,
    ez[0], ez[2], ez[1], 0,
    ey[0], ey[2], ey[1], 0,
    0, 0, 0, 1,
  );
}

/** where WWT puts `frame` relative to `center` at TDB jdtdb, (x, z, y) order */
function correctionVector(jdtdb: number, center: SolarSystemObjects, frame: SolarSystemObjects): Vector3d {
  // WWT's planets take UT and add their own delta-T
  const jd = jdtdb - DYT.deltaT(jdtdb) / D2S;
  // the Sun is WWT's origin, but computing it costs as much as a planet
  const at = (body: SolarSystemObjects) =>
    body === SolarSystemObjects.sun ? Vector3d.create(0, 0, 0) : Planets.getPlanet3dLocationJD(body, jd);
  return Vector3d.subtractVectors(at(frame), at(center));
}

/** where WWT puts `frame` relative to `center` at TDB jdtdb, J2000 ecliptic (X, Y, Z) */
export function bodyCenterPositionJ2000(jdtdb: number, center: SolarSystemObjects, frame: SolarSystemObjects): ThreeNumber {
  const correction = correctionVector(jdtdb, center, frame);
  // Ecliptic coordinates are: X=vernal equinox, X-Y plane=ecliptic plane, Z=ecliptic north pole.
  // WWT's 3d ecliptic: x=vernal equinox, y=ecliptic north pole, x-z plane =ecliptic plane.
  // So WWT (x, z, y) => Horizons (X, Y, Z).
  return precessEcliptic(correction.x, correction.z, correction.y, jdtdb, J2000);
}

/** its J2000 velocity (au/day), from positions 10 minutes either side */
export function bodyCenterVelocityJ2000(jdtdb: number, center: SolarSystemObjects, frame: SolarSystemObjects): ThreeNumber {
  const dt = 10 / 24 / 60; // day
  const after = bodyCenterPositionJ2000(jdtdb + dt, center, frame);
  const before = bodyCenterPositionJ2000(jdtdb - dt, center, frame);
  return [(after[0] - before[0]) / (2 * dt), (after[1] - before[1]) / (2 * dt), (after[2] - before[2]) / (2 * dt)];
}
