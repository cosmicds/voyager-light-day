import "@wwtelescope/engine"; // we include top-level import so that it merges with existing engine declarations


/**
 * learn more about declaration files here
 * https://www.typescriptlang.org/docs/handbook/declaration-files/deep-dive.html#advanced-combinations
 * 
 */

/**
 * The web-engine does not export everything that is actually available, so
 * we frequently need to extend some of the types. Whether you use an
 * interface, namespace, or class depends on what you want to extend. 
 * 
 * If the engine does not export it at all in it's .d.ts files, then 
 * you can use a class declaration to add it to the module if it has been exported in the js side. 
 * 
 * For items exported from the engine, you can use
 *  - namespace - when you want to add static methods/properties (like Class.foo, Class.bar)
 *  - interface - when you want to add instance methods/properties (like obj.foot, obj.bar)
 */


declare module "@wwtelescope/engine" {
  // Typescript will merge this with the existing WWTControl interface
  // why not a namespace? Because we have an instance of WWTControl - specifically WWTControl.singleton)
  interface WWTControl {
    canvas: HTMLCanvasElement;
  }
  
  // Coordinates is exported, but without galactictoJ2000. Add it to the namespace. 
  namespace Coordinates {
    /** galactictoJ2000(GalacticL2: degrees, GalacticB2: degrees): [ra: degrees, dec: degrees] */
    export function galactictoJ2000(GalacticL2: number, GalacticB2: number): [number, number];

  }
}
