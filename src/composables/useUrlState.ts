
import { watch, ref } from 'vue';
import type { Ref } from 'vue';



export interface UseUrlStateOptions {
    autoUpdate?: boolean;
    inAddressBar?: boolean;
    clearOnLoad?: boolean;
}

export interface UseUrlState {
    track: (key: string, value: Ref) => void;
    getUrl(): string;
    loadedFromUrl: Ref<string[]>;
}

/** 
 * we don't watch the url, it is just at load time

*/
export function useUrlState(options: UseUrlStateOptions): UseUrlState {
    
  const initialUrl = window.location.href;
  const initialUrlParams = new URL(initialUrl).searchParams;
  const loadedFromUrl = ref<string[]>([]);
  
  if (options.clearOnLoad) {
    const url = new URL(initialUrl);
    url.search = '';
    window.history.replaceState({}, '', url.toString());
  }
  
  const trackedValues = new Map<string, Ref>();
  
  function updateUrlParam(key: string, value: unknown) {
    const url = new URL(window.location.href);
    url.searchParams.set(key, `${value}`);
    if (options.inAddressBar) {
      window.history.replaceState({}, '', url.toString());
    }
  };
  
  
  function track(key: string, value: Ref) {
    // let's keep track of the value. always up to date, cuz it's a ref
    if (!trackedValues.has(key)) {
      trackedValues.set(key, value);
      // grab the initial value from the url if it exists
      const initialValue = initialUrlParams.get(key);
      if (initialValue !== null) {
        value.value = initialValue;
        loadedFromUrl.value.push(key);
      }
      // watching the Map itself doesn't see changes to the refs it holds, so watch each one directly
      if (options.autoUpdate) {
        watch(value, (newValue) => updateUrlParam(key, newValue));
      }
      return;
    }
    console.warn(`Key ${key} is already being tracked.`);
  };
  
  /* get url with tracked state values */
  const getUrl = (): string => {
    const url = new URL(window.location.href);
    trackedValues.forEach((value, key) => {
      url.searchParams.set(key, value.value);
    });
    return url.toString();
  };
  
  

  return {
    track,
    getUrl,
    loadedFromUrl,
  };
    
    
}