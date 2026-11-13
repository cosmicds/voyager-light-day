import {
  SpaceTimeController,
  Planets,
  Settings,
  Vector3d,
  CAAPrecession,
  CAAPluto,
  ELL,
  ABR,
  CAANutation,
  DYT,
} from "@wwtelescope/engine";
import { SolarSystemObjects } from "@wwtelescope/engine-types";

/**
 * Geometric positions for WWT's 3D solar system. The engine's are apparent (light-time, aberration,
 * nutation): Saturn is ~230,000 km off at Voyager 1's flyby. This reruns the engine's own code with those
 * corrections off and at TDB. Output stays ecliptic and mean equinox of date, au, (x, z, y).
 */

const J2000 = 2451545.0;

/** the engine's apparent-place corrections and no-op stand-ins (FK5 is a frame alignment, so it stays) */
const APPARENT_CORRECTIONS: [object: object, name: string, noOp: (...args: number[]) => unknown][] = [
  [ELL, "distanceToLightTime", () => 0],
  [ABR, "eclipticAberration", () => ({ x: 0, y: 0 })],
  [CAANutation, "nutationInLongitude", () => 0],
  [CAANutation, "trueObliquityOfEcliptic", (jd: number) => CAANutation.meanObliquityOfEcliptic(jd)],
];

/** run engine code with the apparent-place corrections switched off */
function withoutApparentCorrections<T>(compute: () => T): T {
  const objects = APPARENT_CORRECTIONS.map(([object]) => object as Record<string, unknown>);
  const originals = APPARENT_CORRECTIONS.map(([, name], i) => objects[i][name]);
  APPARENT_CORRECTIONS.forEach(([, name, noOp], i) => (objects[i][name] = noOp));
  try {
    return compute();
  } finally {
    APPARENT_CORRECTIONS.forEach(([, name], i) => (objects[i][name] = originals[i]));
  }
}

/** the series are in dynamical time; WWT's jNow is UT */
function julianUtToTdb(jdUt: number): number {
  return jdUt + DYT.deltaT(jdUt) / 86400;
}

const GALILEAN: readonly SolarSystemObjects[] = [
  SolarSystemObjects.io,
  SolarSystemObjects.europa,
  SolarSystemObjects.ganymede,
  SolarSystemObjects.callisto,
];

/** the bodies whose 3D position is replaced */
const GEOMETRIC_BODIES: readonly SolarSystemObjects[] = [
  SolarSystemObjects.sun,
  SolarSystemObjects.mercury,
  SolarSystemObjects.venus,
  SolarSystemObjects.earth,
  SolarSystemObjects.mars,
  SolarSystemObjects.jupiter,
  SolarSystemObjects.saturn,
  SolarSystemObjects.uranus,
  SolarSystemObjects.neptune,
  SolarSystemObjects.pluto,
  SolarSystemObjects.moon,
  ...GALILEAN,
];

/** Meeus' Pluto series is J2000 ecliptic, but the engine treats it as ecliptic of date; precess it */
function fixPlutoFrame() {
  const longitudeJ2000 = CAAPluto.eclipticLongitude;
  const latitudeJ2000 = CAAPluto.eclipticLatitude;
  const ofDate = (jd: number) => CAAPrecession.precessEcliptic(longitudeJ2000(jd), latitudeJ2000(jd), J2000, jd);
  CAAPluto.eclipticLongitude = (jd: number) => ofDate(jd).x;
  CAAPluto.eclipticLatitude = (jd: number) => ofDate(jd).y;
}

let installed = false;

/**
 * Use geometric positions in WWT's 3D solar system: the per-frame cache (planets, viewTarget) and
 * Planets.getPlanet3dLocationJD (correctionVector in precession.ts). The 2D sky stays apparent.
 */
export function useGeometricPlanetPositions() {
  if (installed) {
    return;
  }
  installed = true;
  fixPlutoFrame();

  const originalUpdatePlanetLocations = Planets.updatePlanetLocations;
  const originalGetPlanet3dLocationJD = Planets.getPlanet3dLocationJD;

  function geometricLocation(target: SolarSystemObjects, jdUt: number): Vector3d {
    const jde = julianUtToTdb(jdUt);
    return withoutApparentCorrections(() => {
      if (!GALILEAN.includes(target)) {
        return originalGetPlanet3dLocationJD(target, jde);
      }
      // The engine's 3D path places these by sky-plane offsets from Jupiter as seen from Earth.
      // Its jovicentric ecliptic positions (GM.calculate, au) are more accurate.
      const jupiter = originalGetPlanet3dLocationJD(SolarSystemObjects.jupiter, jde);
      const offset = Planets.getPlanetPositionDirect(target, jde);
      const scale = Settings.get_active().get_solarSystemScale();
      return Vector3d.create(jupiter.x + offset.x * scale, jupiter.y + offset.y * scale, jupiter.z + offset.z * scale);
    });
  }

  Planets.updatePlanetLocations = function (threeDee: boolean) {
    originalUpdatePlanetLocations(threeDee);
    if (!threeDee) {
      return;
    }
    const jNow = SpaceTimeController.get_jNow();
    for (const target of GEOMETRIC_BODIES) {
      Planets._planet3dLocations[target] = geometricLocation(target, jNow);
    }
  };

  Planets.getPlanet3dLocationJD = function (target: SolarSystemObjects, jNow: number) {
    return GEOMETRIC_BODIES.includes(target)
      ? geometricLocation(target, jNow)
      : originalGetPlanet3dLocationJD(target, jNow);
  };
}
