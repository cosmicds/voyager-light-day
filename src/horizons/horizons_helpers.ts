/**
 * Helpers to grab Horizons data from the headers
 */

import { DYT, SpaceTimeController } from "@wwtelescope/engine";
import { SolarSystemObjects } from "@wwtelescope/engine-types";

// Center body name: Sun (10)
const CENTER_BODY_REGEX = /^Center body name:.*\((-?\d+)\)/m;
// Reference frame : Ecliptic of J2000.0
const REFERENCE_FRAME_REGEX = /^Reference frame\s*:\s*(.*?)\s*$/m;
// Output units : AU-D
const OUTPUT_UNITS_REGEX = /^Output units\s*:\s*(.*?)\s*$/m;
// Output type : GEOMETRIC cartesian states
const OUTPUT_TYPE_REGEX = /^Output type\s*:\s*(.*?)\s*$/m;
const LINE_BREAK_REGEX = /\r?\n/;

export const HORIZONS_CENTER_IDS: Record<number, SolarSystemObjects> = {
  // 0: SolarSystemObjects.sun,
  10: SolarSystemObjects.sun,
  199: SolarSystemObjects.mercury,
  299: SolarSystemObjects.venus,
  399: SolarSystemObjects.earth,
  301: SolarSystemObjects.moon,
  499: SolarSystemObjects.mars,
  599: SolarSystemObjects.jupiter,
  699: SolarSystemObjects.saturn,
  799: SolarSystemObjects.uranus,
  899: SolarSystemObjects.neptune,
  999: SolarSystemObjects.pluto,
};

/** v-select items for the solar system objects a Horizons center can map to */
export const SOLAR_SYSTEM_OBJECT_ITEMS = [...new Set(Object.values(HORIZONS_CENTER_IDS))].map((value) => {
  const name = SolarSystemObjects[value];
  return { title: name.charAt(0).toUpperCase() + name.slice(1), value };
});

/**
 * read the coordinate center from the horizons header, e.g.
 * "Center body name: Sun (10)" or "Center body name: Solar System Barycenter (0)"
 */
export function getHorizonsCenter(rawText: string): SolarSystemObjects {
  const match = rawText.match(CENTER_BODY_REGEX);
  const center = match ? HORIZONS_CENTER_IDS[+match[1]] : undefined;
  if (center === undefined) {
    console.warn(`Unsupported Horizons center "${match?.[0] ?? "(none)"}", assuming the Sun`);
    return SolarSystemObjects.sun;
  }
  return center;
}

export function getHorizonsReferenceFrame(rawText: string): string | undefined {
  return rawText.match(REFERENCE_FRAME_REGEX)?.[1];
}

/** the column names of the vector table: the line starting with JDTDB, above $$SOE */
export function getHorizonsColumns(rawText: string): string[] {
  const lines = rawText.split(LINE_BREAK_REGEX);
  const start = lines.findIndex((l) => l.trim() === "$$SOE");
  for (let i = start - 1; i >= 0; i--) {
    if (lines[i].trim().startsWith("JDTDB")) {
      return lines[i]
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c !== "");
    }
  }
  return [];
}

/**
 * Throw, listing every problem, if a Horizons vector table can't be used here. It needs (see CLAUDE.md):
 * a center body, the ecliptic of J2000 (REF_PLANE='ECLIPTIC'), au and days (OUT_UNITS='AU-D'), geometric states
 * (VEC_CORR='NONE'), and CSV rows (CSV_FORMAT='YES') starting JDTDB, Calendar Date (TDB), delta-T (VEC_DELTA_T='YES'),
 * X, Y, Z, between $$SOE and $$EOE.
 */
export function horizonsFormatChecker(rawText: string): void {
  const problems: string[] = [];

  if (!CENTER_BODY_REGEX.test(rawText)) {
    problems.push("no center body line, e.g. 'Center body name: Sun (10)'");
  }
  const frame = getHorizonsReferenceFrame(rawText);
  if (frame !== "Ecliptic of J2000.0") {
    problems.push(`reference frame is '${frame ?? "missing"}', not 'Ecliptic of J2000.0' (REF_PLANE='ECLIPTIC')`);
  }
  const units = rawText.match(OUTPUT_UNITS_REGEX)?.[1];
  if (units !== "AU-D") {
    problems.push(`output units are '${units ?? "missing"}', not 'AU-D' (OUT_UNITS='AU-D')`);
  }
  // trimmed files may leave this line out
  const outputType = rawText.match(OUTPUT_TYPE_REGEX)?.[1];
  if (outputType !== undefined && !outputType.startsWith("GEOMETRIC")) {
    problems.push(`output type is '${outputType}', not geometric`);
  }

  // the columns the parser reads, in Horizons' order (comma-separated only with CSV_FORMAT='YES')
  const requiredColumns = ["JDTDB", "Calendar Date (TDB)", "delta-T", "X", "Y", "Z"];
  const columns = getHorizonsColumns(rawText);
  if (!requiredColumns.every((name, i) => columns[i] === name)) {
    problems.push("Columns must be JDTDB, Calendar Date (TDB), delta-T, X, Y, Z, [VX, VY, VZ] [optional]");
  }

  const lines = rawText.split(LINE_BREAK_REGEX);
  const start = lines.findIndex((l) => l.trim() === "$$SOE");
  const end = lines.findIndex((l) => l.trim() === "$$EOE");
  if (start === -1 || end === -1 || end < start + 2) {
    problems.push("no rows between $$SOE and $$EOE");
  }

  if (problems.length > 0) {
    throw new Error(`Can't use this Horizons file:\n- ${problems.join("\n- ")}`);
  }
}

/** get any body properties in the top block of an unmodified horizons vector file */
export function getHorizonsProperties(rawText: string): Record<string, string> {
  const lines = rawText.split(LINE_BREAK_REGEX);
  const propertyLines = [] as string[];
  let inFirstBlock = false;
  for (const line of lines) {
    if (!inFirstBlock && line.startsWith("*******")) {
      inFirstBlock = true;
      continue;
    }
    if (inFirstBlock && !line.startsWith("*******")) {
      propertyLines.push(line);
    }
    if (inFirstBlock && line.startsWith("*******")) {
      break;
    }
  }

  const properties: Record<string, string> = {};

  for (const line of propertyLines) {
    if (line.startsWith("  ")) {
      const property1 = line.slice(0, 44).trim();
      const property2 = line.slice(44).trim();
      if (property1 && property1.includes("=")) {
        const [key, value] = property1.split("=");
        properties[key.trim()] = value.trim();
      }
      if (property2 && property2.includes("=")) {
        const [key, value] = property2.split("=");
        properties[key.trim()] = value.trim();
      }
    }
  }
  return properties;
}

/** TDB Julian date of a UT time (ms), with the delta-T WWT's planets use */
export function tdbFromUtc(t: number): number {
  const jd = t / 86400000 + 2440587.5;
  return jd + DYT.deltaT(jd) / 86400;
}

/** TDB Julian date of WWT's clock */
export function tdbNow(): number {
  return tdbFromUtc(SpaceTimeController.get_now().getTime());
}
