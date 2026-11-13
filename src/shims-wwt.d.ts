/* eslint-disable @typescript-eslint/naming-convention */

import "@wwtelescope/engine"; // all types are available to typescript here, but i import them specifically below for clarity
import type { Color, FrameCallback } from "@wwtelescope/engine";
import { SolarSystemObjects } from "@wwtelescope/engine-types";

declare module "@wwtelescope/engine" {
  // this seems to be the write way to extend the class. do a normal import
  // and ts will merge? this interface. idk really.
  interface RenderContext {
    readonly gl: WebGL2RenderingContext;
    get_world(): Matrix3d;
    set_world(value: Matrix3d): Matrix3d;
    get_view(): Matrix3d;
    get_projection(): Matrix3d;
  }

  // this on the other hand is not exported at all, so we create the class declaration here
  export class SimpleLineList {
    addLine(pt1: Vector3d, pt2: Vector3d): void;
    drawLines(context: RenderContext, opacity: number, color: Color): void;
    pure2D: boolean;
    viewTransform: Matrix3d;
    useLocalCenters: boolean;
    set_depthBuffered(buffered: boolean): void;
    clear(): void;
  }

  export class AstroRaDec {
    RA: number;
    dec: number;
    distance: number;
    constructor(ra: number, dec: number, distance: number, shadow?: boolean, eclipsed?: boolean);
  }

  interface Coordinates {
    raDecTo3d(ra: number, dec: number): Vector3d;
    horizonToEquitorial(altAz: Coordinates, location: Coordinates, utc: Date): Coordinates;
  }
  namespace Coordinates {
    export function galactictoJ2000(GalacticL2: number, GalacticB2: number): [number, number];
  }

  // in the engine since 7.36, but only typed on the ScriptInterface and the pinia store
  interface WWTControl {
    canvas: HTMLCanvasElement;
    addFrameCallback(callback: FrameCallback): void;
    removeFrameCallback(callback: FrameCallback): void;
    /** renderOneFrame calls it once a frame (when no move is running), after the clock and the planets and before the camera */
    _updateViewParameters(): void;
  }

  // 7.41 declares the Matrix3d class but leaves these instance methods untyped
  interface Matrix3d {
    floatArray(): number[];
    clone(): Matrix3d;
    invert(): void;
  }
  
  namespace Matrix3d {
    function multiplyMatrix(a: Matrix3d, b: Matrix3d): Matrix3d;
    function invertMatrix(m: Matrix3d): Matrix3d;
    function get_identity(): Matrix3d;
    function clone(): Matrix3d;
    function invert(): void;
    function floatArray(): number[];
  }
  
  interface Vector3d {
    normalize(): void;
  }
  namespace Vector3d {
    function dot(left: Vector3d, right: Vector3d): number;
  }

  /**
   *  example use: console.log(AstroCalc.getPlanet(
      SpaceTimeController.utcToJulian(new Date()), // or use SpaceTimeController.get_jNow()
      SolarSystemObjects.sun,
      0, 0, 0 // lat lon height
    ));
   */
  namespace AstroCalc {
    function getPlanet(
      jDate: number,
      planetName: SolarSystemObjects,
      lat: number,
      lng: number,
      height: number,
    ): AstroRaDec;
    function galacticToJ2000(l: number, b: number): AstroRaDec;
    function eclipticToJ2000(l: number, b: number): AstroRaDec;
    function j2000ToGalactic(ra: number, dec: number): AstroRaDec; // l is on RA, and b is on dec
    function j2000ToEcliptic(ra: number, dec: number): AstroRaDec; // l is on RA, and b is on dec
  }

  namespace SpaceTimeController {
    function get_location(): Coordinates;
  }

  interface Imageset {
    // used by useWtml. returns a zoom (deg) that fits the image; never larger than currentZoom when given
    _guessZoomSetting(currentZoom?: number): number;
  }

  export class OrbitLineList {
    addLine(pt1: Vector3d, pt2: Vector3d, color1: Color, color2: Color): void;
    drawLines(context: RenderContext, opacity: number, color: Color): void;
    set_depthBuffered(buffered: boolean): void;
    /** frees the GL buffers, but leaves the colours behind (engine bug), so don't reuse the list */
    clear(): void;
  }

  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  export class Planets {
    static _planetTextures: Texture[];
    static _planetScales: number[];

    // Technically this is a list of AstroRaDec objects, but this is a good enough definition
    static _planetLocations: { RA: number; dec: number }[];

    /** per-frame cache of 3D positions (au, x z y), indexed by SolarSystemObjects */
    static _planet3dLocations: Vector3d[];

    static drawPlanets(renderContext: RenderContext, opacity: number): void;
    static updatePlanetLocations(threeD: boolean): void;
    static getPlanet3dLocationJD(target: SolarSystemObjects, jNow: number): Vector3d;
    /** geometric, ecliptic (x, z, y): heliocentric for planets, relative to the parent for the Moon and Galilean moons */
    static getPlanetPositionDirect(target: SolarSystemObjects, jd: number): Vector3d;
    static _loadPlanetTextures(): void;
  }

  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  export class Planets3d {
    static drawPlanets3D(renderContext: renderContext, opacity: number, centerPoint: Vector3d);
  }

  namespace Planets {
    /** the cached position the planet is drawn at this frame (x, z, y order) */
    function getPlanet3dLocation(target: SolarSystemObjects): Vector3d;
  }

  // exported but untyped in 7.41. only what we use
  export class ReferenceFrame {
    name: string;
    parent: string;
    /** 18 = custom: LayerManager._draw calls computeFrame and draws with world = worldMatrix * world */
    reference: number;
    referenceFrameType: number;
    worldMatrix: Matrix3d;
    computeFrame(renderContext: RenderContext): void;
  }

  // pr/472: the loaded mesh (null until it loads). Object3d.render centers it and scales it by 1 / boundingSphere.radius
  interface Object3d {
    _mesh: { boundingSphere: { radius: number } } | null;
  }
  
  interface Object3dLayer {
    set_roll(value: number): void;
    set_pitch(value: number): void;
    set_heading(value: number): void;
  }

  interface SpreadSheetLayer {
    get__table(): { header: string[]; rows: string[][] };
    /** rebuild the vertex buffer from the table on the next draw */
    dirty: boolean;
  }

  // 7.41 has frame commented out of the typings (and types no constructor: it's (name, reference))
  interface LayerMap {
    frame: ReferenceFrame;
  }

  // 7.41 has this commented out of the typings
  interface CameraParameters {
    /** solar system scene origin: the tracked object's position plus a surface offset toward the camera */
    viewTarget: Vector3d;
  }

  export class COR {
    x: number;
    y: number;
  }

  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  export class CAAPrecession {
    /** precess ecliptic longitude/latitude (degrees) from JD0 to JD. Returns x = longitude, y = latitude (degrees) */
    static precessEcliptic(lambda: number, beta: number, jd0: number, jd: number): COR;
  }

  // Meeus' AA+ classes, exported but untyped in 7.41. Only what geometricPlanets.ts uses.
  // Julian dates are dynamical time (TDB); angles are degrees.
  /* eslint-disable @typescript-eslint/no-extraneous-class */
  /** Pluto (Meeus ch. 37), heliocentric, referred to the J2000 ecliptic */
  export class CAAPluto {
    static eclipticLongitude(jd: number): number;
    static eclipticLatitude(jd: number): number;
  }

  /** dynamical time (was CAADynamicalTime) */
  export class DYT {
    /** TT - UT in seconds */
    static deltaT(jd: number): number;
  }

  /** elliptical motion (was CAAElliptical) */
  export class ELL {
    /** days */
    static distanceToLightTime(distanceAu: number): number;
  }

  /** aberration (was CAAAberration) */
  export class ABR {
    static eclipticAberration(lambda: number, beta: number, jd: number): COR;
  }

  export class CAANutation {
    /** arcseconds */
    static nutationInLongitude(jd: number): number;
    static meanObliquityOfEcliptic(jd: number): number;
    static trueObliquityOfEcliptic(jd: number): number;
  }
  /* eslint-enable @typescript-eslint/no-extraneous-class */
}
