import type { SpreadSheetLayer } from "@wwtelescope/engine";
import { SolarSystemObjects } from "@wwtelescope/engine-types";
import type { engineStore } from "@wwtelescope/engine-pinia";
import type { HorizonsVector } from "./horizons";
import { HorizonsVectorTable } from "./HorizonsVectorTable";
import { tdbNow } from "./horizons_helpers";
import { precessionMatrix } from "./precession";
import { densifiedRows, j2000PositionAt, precessedToTime } from "./trajectory";
import { createOrbitLineList, drawOrbitLineInFrame, LINE_TOLERANCE_AU } from "./orbitLine";
import { createMovingMarkerLayer } from "./horizonsSpreadsheet";

// one orbit each around Saturn, centered on Voyager 1's flyby
import mimasOrbitData from "@/assets/horizons_mimas-saturn.txt?raw";
import enceladusOrbitData from "@/assets/horizons_enceladus-saturn.txt?raw";
import tethysOrbitData from "@/assets/horizons_tethys-saturn.txt?raw";
import dioneOrbitData from "@/assets/horizons_dione-saturn.txt?raw";
import rheaOrbitData from "@/assets/horizons_rhea-saturn.txt?raw";
import iapetusOrbitData from "@/assets/horizons_iapetus-saturn.txt?raw";
// Titan around the Sun, like Voyager: one orbit at 6 h steps centered on the Titan flyby. Moved to WWT's Saturn
// per row, the marker lands on Horizons' heliocentric Titan, so it meets Voyager (WWT's Saturn is ~6,000 km off)
import titanData from "@/assets/horizons_titan-sun.txt?raw";

type EngineStore = ReturnType<typeof engineStore>;

const SATURN = SolarSystemObjects.saturn;
const TITAN_COLOR = "#ffa000";
const MOON_COLOR = "#afd8e680";
const DAY_MS = 86400000;

interface SaturnMoon {
  name: string;
  table: HorizonsVectorTable;
  /** mean period (days), from https://ssd.jpl.nasa.gov/sats/elem/sep.html */
  periodDays: number;
  color: string;
}

const SATURN_MOONS: SaturnMoon[] = [
  { name: "Mimas", table: new HorizonsVectorTable(mimasOrbitData), periodDays: 0.942422, color: MOON_COLOR },
  { name: "Enceladus", table: new HorizonsVectorTable(enceladusOrbitData), periodDays: 1.370218, color: MOON_COLOR },
  { name: "Tethys", table: new HorizonsVectorTable(tethysOrbitData), periodDays: 1.887802, color: MOON_COLOR },
  { name: "Dione", table: new HorizonsVectorTable(dioneOrbitData), periodDays: 2.736916, color: MOON_COLOR },
  { name: "Rhea", table: new HorizonsVectorTable(rheaOrbitData), periodDays: 4.517503, color: MOON_COLOR },
  { name: "Titan", table: new HorizonsVectorTable(titanData), periodDays: 15.945448, color: TITAN_COLOR },
  { name: "Iapetus", table: new HorizonsVectorTable(iapetusOrbitData), periodDays: 79.331002, color: MOON_COLOR },
];

/** shift t (ms) by whole periods so it lands in [start, start + period), and not past the table's end */
function wrapTimeToOrbit(t: number, start: number, end: number, period: number): number {
  return Math.min(t - Math.floor((t - start) / period) * period, end);
}

/**
 * A moon's position relative to Saturn at a UT time (ms): the Hermite at the time wrapped into its one-orbit table,
 * precessed to the time's ecliptic. Inside the table (Titan's flyby) the wrapped time is the time.
 */
function moonPositionAt(table: HorizonsVectorTable, periodDays: number) {
  const [start, end] = [table.timeSpan.start.getTime(), table.timeSpan.end.getTime()];
  const at = j2000PositionAt(table.j2000(SATURN));
  return (t: number): HorizonsVector | null => {
    const v = at(wrapTimeToOrbit(t, start, end, periodDays * DAY_MS));
    return v && precessedToTime(v, t);
  };
}

/** Orbit lines for Saturn's major moons (their 1980 orbits), drawn around Saturn every frame */
export function createSaturnMoonOrbits(store: EngineStore) {
  const lineLists = SATURN_MOONS.map((moon) =>
    createOrbitLineList(densifiedRows(moon.table.j2000(SATURN), LINE_TOLERANCE_AU), moon.color),
  );
  const drawSaturnMoonOrbits = () => {
    const rotation = precessionMatrix(tdbNow());
    lineLists.forEach((lineList) => drawOrbitLineInFrame(lineList, SATURN, rotation));
  };
  store.addFrameCallback(drawSaturnMoonOrbits);
  return () => store.removeFrameCallback(drawSaturnMoonOrbits);
}

/** Markers for Saturn's major moons that keep going around (each table wraps by the moon's period) */
export function createSaturnMoonLayers(store: EngineStore): Promise<SpreadSheetLayer[]> {
  return Promise.all(
    SATURN_MOONS.map((moon) =>
      createMovingMarkerLayer(store, moon.name, SATURN, moon.color, moonPositionAt(moon.table, moon.periodDays)),
    ),
  );
}
