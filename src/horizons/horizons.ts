import { getHorizonsColumns } from "./horizons_helpers";

const D2S = 24 * 60 * 60;
const UNIX_EPOCH_JD = 2440587.5;

// https://www.geeksforgeeks.org/javascript/checksum-algorithms-in-javascript/
function calculateCRC(data: string): string {
  const polynomial = 0xedb88320;
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? polynomial : 0);
    }
  }
  return (crc ^ 0xffffffff).toString(16).toUpperCase();
}

/** a cache key for a Horizons file: the CRC of its header (target, center, span, step, frame, generation time) */
export function horizonsHash(rawText: string): string {
  const soe = rawText.indexOf("$$SOE");
  return calculateCRC(soe === -1 ? rawText : rawText.slice(0, soe));
}

/** One Horizons row as given: J2000 ecliptic, relative to the file's center, au and au/day, X, Y, Z order */
export interface HorizonsVector {
  jdtdb: number;
  /** UT */
  date: Date;
  x: number;
  y: number;
  z: number;
  /** only when the table has velocities (VEC_TABLE 2 or 3) */
  vx?: number;
  vy?: number;
  vz?: number;
}

/** Parse a Horizons vector table (JDTDB, calendar date, TDB-UT, X, Y, Z, [VX, VY, VZ]); see horizonsFormatChecker */
export function parseHorizonsVectors(rawText: string): HorizonsVector[] {
  const lines = rawText.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === "$$SOE");
  const end = lines.findIndex((l) => l.trim() === "$$EOE");
  const columns = getHorizonsColumns(rawText);
  const hasVelocity = columns.includes("VX");

  return lines.slice(start + 1, end).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const jdtdb = +values[0];
    const jd = jdtdb - +values[2] / D2S;
    // to the ms (julianToUtc truncates to whole seconds, ~17 km of Voyager's travel)
    const date = new Date((jd - UNIX_EPOCH_JD) * D2S * 1000);
    const [x, y, z] = [+values[3], +values[4], +values[5]];
    if (!hasVelocity) {
      return { jdtdb, date, x, y, z };
    }
    const [vx, vy, vz] = [+values[6], +values[7], +values[8]];
    return { jdtdb, date, x, y, z, vx, vy, vz };
  });
}

// https://stackoverflow.com/a/29197805/11594175
/** index of the last row in [startIdx, endIdx] at or before t (UT ms), or -1 */
function searchRowAtOrBefore(vectors: HorizonsVector[], startIdx: number, endIdx: number, t: number): number {
  if (startIdx === endIdx) {
    return vectors[startIdx].date.getTime() <= t ? startIdx : -1;
  }

  const midIdx = startIdx + Math.floor((endIdx - startIdx) / 2);

  if (t < vectors[midIdx].date.getTime()) {
    return searchRowAtOrBefore(vectors, startIdx, midIdx, t);
  }

  const ret = searchRowAtOrBefore(vectors, midIdx + 1, endIdx, t);
  return ret === -1 ? midIdx : ret;
}

/**
 * index of the last row at or before a UT time (ms), or -1 outside the rows
 *  */
export function horizonsRowIndexAt(vectors: HorizonsVector[], t: number): number {
  if (t < vectors[0].date.getTime() || t > vectors[vectors.length - 1].date.getTime()) {
    return -1;
  }
  return searchRowAtOrBefore(vectors, 0, vectors.length - 1, t);
}

/** first and last row times (UT) */
export function getHorizonsTimeSpan(vectors: HorizonsVector[]): { start: Date; end: Date } {
  return { start: vectors[0].date, end: vectors[vectors.length - 1].date };
}
