import { ref, shallowReactive, type Ref } from "vue";
import { engineStore } from "@wwtelescope/engine-pinia";
import { Folder, Place, Imageset, ImageSetLayer, FitsImage, WWTControl } from "@wwtelescope/engine";



interface WtmlLoaderOptions {
  /** do something with the folder when it loads. prefer to use onLoad */
  onNewFolder?: (folder: Folder) => void;
  
  /** do something with a place when it loads.prefer to use onLoad */
  onNewPlace?: (place: Place, index: number) => void;
  
  /** do something with an imageset when it loads (often where we might move to an imageset). prefer to use onLoad */
  onNewImageset?: (imageset: Imageset, index: number) => void; 
  
  /** do something with a layer when it loads. often we will set_opacity or set_enabled here. prefer to use onLoad */
  onNewLayer?: ((layer: ImageSetLayer, index: number) => void); 
  
  /** onLoad - for every layer, out contains the full context, and we can operate on the layer/imageset and place.  */
  onLoad?:(out: {folder: Folder, place: Place, imageset: Imageset, layer: ImageSetLayer, fitsImage?: FitsImage | null }, index: number) => void;

  /** fires for every place's *background* imageset as it loads, with its place, imageset, layer, and fitsImage (if exists) */
  onBackgroundLoad?: (out: { place: Place, imageset: Imageset, layer: ImageSetLayer, fitsImage: FitsImage | null }, index: number) => void;

  /** goTo by a certain criteria, often a boolean if a WTML has a single value. Otherwise use a function to pick a certain one by index of iset.get_name */
  goTo?: ((iset: Imageset) => boolean) | ((iset: Imageset, index: number) => boolean) | boolean;
  
  /** use instant goto. you probably want this to be true if loading at startup */
  instant?: boolean; 
  
  /** print debug messages to the console */
  verbose?: boolean; 
  
  /** useful if there is a stack of imagesets and you want them to load smoothly. don't do too many though. default: false */
  prefetch?: boolean;

  /** force fits mode for the whole file
   * @deprecated fits mode is now auto-detected from the imageset's declared file type via .get_extension.
  */
  useFits?: boolean;

  /** usually true. but set to false if you want to control the load order of multiple WTML files, which impacts which layer is on top. no guarantees otherwise */
  autoload?: boolean; // whether to start loading immediately, defaults to true
  
  /** makes the code self-documenting so we know if the singular names are just the first or truly the only item  */
  single?: boolean;
}

interface WtmlLoaderReturn {
  /** promise that fires once the layer has finished loading. wtml.ready.then(() => // do something //) */
  ready: Promise<void>;
  fetchingComplete: Ref<boolean>;
  /** has this wtml finished loading */
  loaded: Ref<boolean>;
  /** load the wtml. used if autoload = false */
  load: () => void;
  /** is this a sinlge item WTML. Set by the user, and not inferred from the WTML */
  single: boolean;
  
  /** Places in the WMTL file */
  places: Place[];
  /** Each place's foreground/study imageset, in the same order as places */
  imagesets: Imageset[];
  /** Each place's foreground/study ImageSetLayer, in the same order as places */
  imagesetLayers: ImageSetLayer[];
  /** FitsImages in the WTML file (flattened) */
  fitsImages: (FitsImage | null)[];
  /** The names of the places, in the same order as places */
  placeNames: () => string[];
  /** The names of the imagesets, in the same order as imagesets */
  imagesetNames: () => string[];

  /** All the layers (foreground and/or background) loaded for a given place. */
  getImagesetLayersForPlace: (place: Place) => ImageSetLayer[];
  /** The place a given layer was loaded for */
  getPlaceForImagesetLayer: (layer: ImageSetLayer) => Place | undefined;
  /** The place a given imageset was loaded for (matched by imageSetID). */
  getPlaceForImageset: (imageset: Imageset) => Place | undefined;

  // convenience accessors for the common case of a WTML file with just one place
  place: Place;
  imageset: Imageset;
  imagesetLayer: ImageSetLayer;
  fitsImage: FitsImage | null;
  placeName: () => string;
  imagesetName: () => string;

  /** Each place's *background* imageset, where it has one. Loaded and tracked separately
   * from the foreground/study imageset above - a place can have both at once. */
  backgroundImagesets: Imageset[];
  /** Each place's *background* ImageSetLayer, where it has one. */
  backgroundImagesetLayers: ImageSetLayer[];
  /** Whether any background imageset has loaded yet. */
  hasBackground: boolean;
  backgroundImageset: Imageset;
  backgroundImagesetLayer: ImageSetLayer;
}

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

function isTemplateURL(url: string): boolean {
  return url.match(/{[0-9]*}/) != null;
}


function looksLikeFits(imageset: Imageset): boolean {
  return /(fits|fit|fts|ftz)$/i.test(imageset.get_extension());
}


/**
 * Loads a WTML collection and adds an ImageSetLayer for each place's imageset(s).
 *
 * Each place's foreground/study imageset is loaded and tracked separately from its
 * background imageset, if it has one - see {@link WtmlLoaderReturn}. FITS mode is
 * auto-detected per imageset from its declared file type.
 * 
 * Does not support loading child folders
 *
 * @param wtmlUrl - URL of the WTML file to load
 * @param options - see {@link WtmlLoaderOptions}
 *
 * @example multiple places
 * ```
 * const wtml = useWtmlLoader(url);
 * wtml.imagesetLayers[0]?.set_opacity(0.5);
 * ```
 *
 * @example a WTML with just one place
 * ```
 * const jwstCarina = useWtmlLoader(url, { single: true });
 * jwstCarina.imagesetLayer?.set_opacity(0.5);
 * ```
 *
 * @example hijacking background to get two imagesets from one place
 * ```
 * const crossfade = useWtmlLoader(url, { single: true });
 * crossfade.imagesetLayer;           // e.g. Hubble
 * crossfade.backgroundImagesetLayer; // e.g. JWST
 * ```
 */
export function useWtml(
  wtmlUrl: string,
  _options?: WtmlLoaderOptions
): Prettify<WtmlLoaderReturn> {

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function debugLog(...messages: any[]) {
    if (options?.verbose) {
      console.log(...messages);
    }
  }


  // const ready = ref(false);
  let promiseResolve: () => void;
  const ready = new Promise<void>((resolve) => {
    promiseResolve = resolve;
  });

  const loaded = ref(false);
  const options = _options ?? {};

  const folder = ref<Folder>();

  // shallowReactive so mutations (.push) triggers reactivity
  const places: Place[] = shallowReactive([]);
  const imagesets: Imageset[] = shallowReactive([]);
  const imagesetLayers: ImageSetLayer[] = shallowReactive([]);
  const fitsImages: (FitsImage | null)[] = shallowReactive([]);
  const backgroundImagesets: Imageset[] = shallowReactive([]);
  const backgroundImagesetLayers: ImageSetLayer[] = shallowReactive([]);
  
  // places/imagesetLayers/backgroundImagesetLayers are all built in the same order, by
  // each place's own index - so that index is all we need to cross-reference them
  function getImagesetLayersForPlace(place: Place): ImageSetLayer[] {
    const index = places.indexOf(place);
    if (index === -1) return [];
    return [imagesetLayers[index], backgroundImagesetLayers[index]].filter((l): l is ImageSetLayer => l != null);
  }

  function getPlaceForImagesetLayer(layer: ImageSetLayer): Place | undefined {
    let index = imagesetLayers.indexOf(layer);
    if (index === -1) index = backgroundImagesetLayers.indexOf(layer);
    return index === -1 ? undefined : places[index];
  }

  function getPlaceForImageset(imageset: Imageset): Place | undefined {
    const id = imageset.get_imageSetID();
    let index = imagesetLayers.findIndex(l => l.get_imageSet().get_imageSetID() === id);
    if (index === -1) index = backgroundImagesetLayers.findIndex(l => l.get_imageSet().get_imageSetID() === id);
    return index === -1 ? undefined : places[index];
  }

  const placeNames = () => places.map(p => p.get_name());
  const imagesetNames = () => imagesets.map(i => i.get_name());

  const fetchingComplete = ref(false);

  const store = engineStore();

  /**the type may be Thumbnails, but it may contain Folder's or FolderUps - this is why we filter */
  function thumbnails2Places(thumbnails: (ReturnType<Folder["get_children"]>)): Place[] {
    if (thumbnails == null) return [];
    return thumbnails.filter(child => child instanceof Place) as Place[];
  }

  function getOrdered<T>(array: [number, T][]): T[] {
    const tempArray: T[] = [];
    array.forEach(([index, item]) => {
      tempArray[index] = item;
    });
    return tempArray;
  }

  function resolveGoTo(iset: Imageset, index: number): boolean {
    if (options?.goTo === undefined) return false;

    if (typeof options.goTo === "boolean") return options.goTo;

    return options.goTo(iset, index); // js doesn't care if there are too many argument, and TS is happy :)
  }


  function load() {
    store.waitForReady().then(async () => {
      debugLog(`Starting to load WTML file from ${wtmlUrl}...`);
      WWTControl.singleton.renderOneFrame();
      let loadedFolder: Folder;
      try {
        loadedFolder = await store.loadImageCollection({
          url: wtmlUrl,
          loadChildFolders: false,
        });
        folder.value = loadedFolder;
        if (options?.onNewFolder) options.onNewFolder(loadedFolder);
      } catch (error) {
        console.error(`Failed to load WTML file from ${wtmlUrl}:`, error);
        return;
      }

      const children = loadedFolder.get_children();
      if (children === null || children === undefined) {
        console.warn(`No children found in the provided WTML file at ${wtmlUrl}`);
        return;
      }
      // i don't knw why we usually do the "isinstance of Place" check instead of just
      // casting the type, but whoami to question it...
      places.push(...thumbnails2Places(children));

      if (places.length === 0) {
        console.warn(`Folder had ${children.length} children, but no places found in the provided WTML file at ${wtmlUrl}`);
        return;
      }

      // keep track of the index so we don't need a sort operations
      const _isets: [number, Imageset][] = [];
      const _layers: [number, ImageSetLayer][] = [];
      const _fits: [number, FitsImage | null][] = [];
      const _backgroundIsets: [number, Imageset][] = [];
      const _backgroundLayers: [number, ImageSetLayer][] = [];
      // let _addedAtLeastOneLayer = false;

      console.log(`Found ${places.length} places in the WTML file. Starting to load imageset layers...`);

      const toFetch: string[] = [];

      const layerPromises = places.map(async (child: Place, placeIndex: number) => {
        const imageset = child.get_studyImageset();
        const backgroundImageset = child.get_backgroundImageset();

        if (imageset == null && backgroundImageset == null) {
          console.warn(`No imageset found for place with name ${child.get_name()} at index ${placeIndex}`);
          return;
        };

        if (options?.onNewPlace) options.onNewPlace(child, placeIndex);


        const backgroundPromise = backgroundImageset == null ? Promise.resolve() : store.addImageSetLayer({
          url: backgroundImageset.get_url(),
          mode: (options?.useFits || looksLikeFits(backgroundImageset)) ? "fits" : "autodetect",
          name: backgroundImageset.get_name(),
          goto: false,
        }).then(layer => {
          const _layer = store.imagesetLayerById(layer.id.toString());
          const _iset = _layer?.get_imageSet() ?? null;
          if (_iset && _layer) {
            _backgroundIsets.push([placeIndex, _iset]);
            _backgroundLayers.push([placeIndex, _layer]);
            const _fit = _layer.getFitsImage() ?? null;
            if (options?.onBackgroundLoad) options.onBackgroundLoad({ place: child, imageset: _iset, layer: _layer, fitsImage: _fit }, placeIndex);
          }
        }).catch(error => {
          console.error("Failed to load background imageset from", error, backgroundImageset);
        });

        if (imageset == null) {
          await backgroundPromise;
          return;
        }

        const url = imageset.get_url();
        if (options?.prefetch && !isTemplateURL(url)) {
          toFetch.push(url);
        }

        const foregroundPromise = store.addImageSetLayer({
          url,
          mode: (options?.useFits || looksLikeFits(imageset)) ? "fits" : "autodetect",
          name: imageset.get_name(),
          goto: resolveGoTo(imageset, placeIndex) && !options?.instant,
        }).then(async layer => {
          debugLog(`Successfully loaded layer for place with name ${child.get_name()} at index ${placeIndex}`);
          // get the ImageSetLayer, Imageset and FitImage from the actual store
          const _iset = store.imagesetForLayer(layer.id.toString());
          const _layer = store.imagesetLayerById(layer.id.toString());
          const _fit = _layer?.getFitsImage() ?? null;

          if (_iset && _layer) {
            _isets.push([placeIndex,_iset]);
            _layers.push([placeIndex,_layer]);
            _fits.push([placeIndex, _fit]);
            const out = {
              folder: loadedFolder,
              place: child,
              imageset: _iset,
              layer: _layer,
              fitsImage: _fit
            };

            if (options?.onNewImageset) options.onNewImageset(_iset, placeIndex);
            if (options?.onNewLayer) options.onNewLayer(layer, placeIndex);
            if (options?.onLoad) options.onLoad(out, placeIndex);

            if (resolveGoTo(_iset, placeIndex) && options?.instant) {
              const ctl = WWTControl.singleton;
              // const rc = ctl.renderContext;
              const ra = child.get_RA() * 15;
              const dec = child.get_dec();
              const roll = _iset.get_rotation();
              // @ts-expect-error _guessZoomSetting exists
              const zoomDeg = _iset._guessZoomSetting(WWTControl.singleton.renderContext.viewCamera.zoom);
              store.gotoRADecZoom({
                raRad: ra * Math.PI / 180,
                decRad: dec * Math.PI / 180,
                zoomDeg,
                instant: true,
                rollRad: roll * Math.PI / 180,
              });

              await new Promise(requestAnimationFrame);
              ctl.renderOneFrame();

            }
          }

          /* we should never see these two error messages */
          if (!_iset) {
            console.error(`Imageset not found for imageSetID: ${layer.id.toString()}`, _iset);
          }

          if (!_layer) {
            console.error(`layer not found for id: ${layer.id.toString()}`, _layer);
          }


        }).catch(error => {
          console.error("Failed to load imageset from", error, imageset);
        });

        await Promise.all([foregroundPromise, backgroundPromise]);
      });

      const interval = 20;
      function timeoutFetch<T>(callable: () => PromiseLike<T>, timeout: number): Promise<void> {
        return new Promise(resolve => {
          setTimeout(async () => {
            await callable();
            resolve();
          }, timeout);
        });
      }
      const fetchPromises = toFetch.map((url, index) => timeoutFetch(() => fetch(url), index * interval));
      Promise.all(fetchPromises).then(() => fetchingComplete.value = true);

      await Promise.all(layerPromises);

      // this is not getting set, so just skip it
      // if (!_addedAtLeastOneLayer) {
      //   console.warn("No imageset layers were added.");
      //   return;
      // }
      // want to construct these so that they are in the same order as the places
      // just in case the order was important.
      imagesetLayers.push(...getOrdered(_layers));
      imagesets.push(...getOrdered(_isets));
      fitsImages.push(...getOrdered(_fits));
      backgroundImagesetLayers.push(...getOrdered(_backgroundLayers));
      backgroundImagesets.push(...getOrdered(_backgroundIsets));

      promiseResolve();
      loaded.value = true;
      debugLog("Finished loading WTML file.");
    });
  }

  if (options.autoload === undefined || options.autoload) {
    load();
  }


  return {
    ready,
    loaded,
    fetchingComplete,
    load,
    single: options.single ?? false,

    places,
    placeNames,
    imagesets,
    imagesetNames,
    imagesetLayers,
    fitsImages,
    getImagesetLayersForPlace,
    getPlaceForImagesetLayer,
    getPlaceForImageset,

    // convenience accessors for the common case of a WTML file with just one place
    get place() { return places[0]; },
    get imageset() { return imagesets[0]; },
    get imagesetLayer() { return imagesetLayers[0]; },
    get fitsImage() { return fitsImages[0] ?? null; },
    placeName: () => placeNames()[0],
    imagesetName: () => imagesetNames()[0],

    backgroundImagesets,
    backgroundImagesetLayers,
    get hasBackground() { return backgroundImagesetLayers.length > 0; },
    get backgroundImageset() { return backgroundImagesets[0]; },
    get backgroundImagesetLayer() { return backgroundImagesetLayers[0]; },
  };
}
