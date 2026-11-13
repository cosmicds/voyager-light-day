import { Planets } from "@wwtelescope/engine";
import type { SolarSystemObjects } from "@wwtelescope/engine-types";
import type { HorizonsVector } from "./horizons";

const AU_KM = 149597870.7;
const C_KM_S = 299792.458;

/**
 * Distance (km) from `body` to a position relative to `frame` (Horizons X, Y, Z, au), both where WWT draws them this
 * frame, so call it with positionAt(now) from a frame callback. Voyager–Earth agrees with Horizons to ~1,400 km in 2026,
 * mostly WWT's delta-T (it reaches one light-day ~1 min before NASA's 2026-11-18 10:16 UTC)
 */
export function distanceFromBodyKm(v: HorizonsVector, frame: SolarSystemObjects, body: SolarSystemObjects): number {
  const f = Planets.getPlanet3dLocation(frame);
  const b = Planets.getPlanet3dLocation(body);
  return Math.hypot(f.x + v.x - b.x, f.y + v.z - b.y, f.z + v.y - b.z) * AU_KM;
}

/** one-way light time (s): distance ÷ c, as NASA's light-day milestone uses (not the signal's travel time) */
export function lightTimeSeconds(distanceKm: number): number {
  return distanceKm / C_KM_S;
}
