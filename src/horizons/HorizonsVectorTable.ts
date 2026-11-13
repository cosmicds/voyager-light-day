import type { SolarSystemObjects } from "@wwtelescope/engine-types";
import {
  parseHorizonsVectors,
  horizonsHash,
  horizonsRowIndexAt,
  getHorizonsTimeSpan,
  type HorizonsVector,
} from "./horizons";
import {
  getHorizonsCenter,
  getHorizonsReferenceFrame,
  getHorizonsProperties,
  horizonsFormatChecker,
} from "./horizons_helpers";
import { rowsRelativeToFrame, rowsInEclipticOfDate, interpolatedPositionAt } from "./trajectory";

const TABLE_CACHE: Record<string, HorizonsVectorTable> = {};

/**
 * One Horizons file, parsed once. Rows are J2000 ecliptic; each frame's rows are computed on first use and cached.
 * Frame shifts use WWT's planets, so call frame accessors once WWT is ready.
 */
export class HorizonsVectorTable {
  readonly center: SolarSystemObjects;
  readonly referenceFrame: string | undefined;
  readonly properties: Record<string, string>;
  readonly hasVelocity: boolean;
  /** as Horizons gives them: relative to `center` */
  private readonly rows: HorizonsVector[];
  private readonly j2000Cache = new Map<SolarSystemObjects, HorizonsVector[]>();
  private readonly ofDateCache = new Map<SolarSystemObjects, HorizonsVector[]>();
  private readonly positionAtCache = new Map<SolarSystemObjects, (t: number) => HorizonsVector | null>();

  constructor(rawText: string) {
    horizonsFormatChecker(rawText);
    this.rows = parseHorizonsVectors(rawText);
    this.center = getHorizonsCenter(rawText);
    this.referenceFrame = getHorizonsReferenceFrame(rawText);
    this.properties = getHorizonsProperties(rawText);
    this.hasVelocity = this.rows.every((v) => v.vx !== undefined);
  }

  /** the table for a file, parsed once: cached by `key`, or by a hash of the header if none is given */
  static fromText(rawText: string, key: string = horizonsHash(rawText)): HorizonsVectorTable {
    const cached = TABLE_CACHE[key];
    if (cached) {
      return cached;
    }
    const table = new HorizonsVectorTable(rawText);
    TABLE_CACHE[key] = table;
    return table;
  }

  get timeSpan() {
    return getHorizonsTimeSpan(this.rows);
  }

  /** index of the row at or before a UT time (ms), the same in every frame; -1 outside the rows */
  rowIndexAt(t: number): number {
    return horizonsRowIndexAt(this.rows, t);
  }

  /** J2000 rows relative to `frame` (as WWT places it), each moved at its own time */
  j2000(frame: SolarSystemObjects = this.center): HorizonsVector[] {
    let rows = this.j2000Cache.get(frame);
    if (!rows) {
      rows = rowsRelativeToFrame(this.rows, this.center, frame);
      this.j2000Cache.set(frame, rows);
    }
    return rows;
  }

  /** rows relative to `frame`, each precessed to its own date's ecliptic */
  ofDate(frame: SolarSystemObjects = this.center): HorizonsVector[] {
    let rows = this.ofDateCache.get(frame);
    if (!rows) {
      rows = rowsInEclipticOfDate(this.j2000(frame));
      this.ofDateCache.set(frame, rows);
    }
    return rows;
  }

  /** the interpolated position relative to `frame` at a UT time (ms); built on first call. Needs velocities */
  positionAt(frame: SolarSystemObjects = this.center): (t: number) => HorizonsVector | null {
    if (!this.hasVelocity) {
      throw new Error("positionAt needs Horizons rows with velocities (VEC_TABLE 2 or 3)");
    }
    return (t: number) => {
      let at = this.positionAtCache.get(frame);
      if (!at) {
        at = interpolatedPositionAt(this.j2000(frame));
        this.positionAtCache.set(frame, at);
      }
      return at(t);
    };
  }
}
