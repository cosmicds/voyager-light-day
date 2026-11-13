import { ref, watch, type Ref } from "vue";

// set in the index.html
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const GTAG_MEASUREMENT_ID = window.gtagMeasurementId as string;


const CONSENT_STORAGE_KEY = "consentGranted";

// window.gtag already exists - index.html's inline classic script declares it at top level, which attaches it to window
function gtag(...args: unknown[]) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.gtag(...args);
}

function isLocalhost(): boolean {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return !!window.runningOnLocalhost;
}

let scriptLoaded = false;
function loadGtagScript() {
  if (scriptLoaded) {
    return;
  }
  scriptLoaded = true;
  const gtagScript = document.createElement("script");
  gtagScript.async = true;
  gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GTAG_MEASUREMENT_ID}`;
  document.head.appendChild(gtagScript);
}

function updateConsent(granted: boolean) {
  // no `region` here - only documented for 'default', not 'update', which applies to whoever's on the page right now
  gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  // belt-and-suspenders: gtag.js's own kill switch, checked per-attempt - https://developers.google.com/tag-platform/security/guides/privacy
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window[`ga-disable-${GTAG_MEASUREMENT_ID}`] = !granted;
}

// `initialConsent` is the default policy (true = opt-out/US-style); a stored localStorage choice always wins over it
export function useGtagConsent(initialConsent: boolean): Ref<boolean> {
  
  const storedConset = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  const hadStoredChoice = storedConset !== null;
  const consent = ref(hadStoredChoice ? storedConset === "true" : initialConsent);

  // haven't been asked and consent is true - the US is opted in, EU opted out.
  if (!hadStoredChoice && !isLocalhost() && consent.value) {
    loadGtagScript();
  }

  // only push an `update` once we know a real choice: a restored past one, or a live change below
  watch(consent, (granted) => {
    if (isLocalhost()) {
      return;
    }
    window.localStorage.setItem(CONSENT_STORAGE_KEY, String(granted));
    updateConsent(granted);
    if (granted) {
      loadGtagScript();
    }
    // turning it off just tells gtag.js to stop - there's no way to unload the script itself
  }, { immediate: hadStoredChoice });

  return consent;
}
