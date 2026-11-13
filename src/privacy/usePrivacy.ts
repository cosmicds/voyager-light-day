import { ref,  watch} from "vue";

import { useDataTracking, type DataTrackingOptions, type TrackingData } from "@cosmicds/vue-toolkit";
import type { Prettify } from "@/types";

const PRIVACY_NOTICE_TIMEOUT_MS = 200_000;

export interface UsePrivacyOptions extends DataTrackingOptions {
  /** default 20 seconds */
  privacyNoticeTimeoutMs?: number;
  /** extend TrackingData per-story for whatever else you track; user_uuid is handled separately */
  getData: () => Omit<TrackingData, "user_uuid">;
}

/**
 * A wrapper around useDataTracking that provides the privacy dialog and privacy policy info display
 * refs, and implements the timeout watcher
 */
export function usePrivacy(options: Prettify<UsePrivacyOptions>) {

  const showDataCollectionOptOut = ref(false);
  const showPrivacyPolicyInfo = ref(false);

  const { createUserEntry, responseOptOut, userID } = useDataTracking({
    optOutKey: options.optOutKey,
    userIDKey: options.userIDKey,
    apiUrl: options.apiUrl ?? "https://api.cosmicds.cfa.harvard.edu",
    storyPath: options.storyPath,
    resetData: options.resetData,
    getData: options.getData,
    updateIntervalMs: options.updateIntervalMs, // optional
  });
  
  // Persistent means the notice cannot be clicked away, so give it its own way
  // out: if it is ignored it stands down rather than blocking the corner forever.
  
  let privacyNoticeTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // when showPrivacyDialog changes, if it is true, 
  // start a timeout to hide it after the specified time. 
  // TODO: if the user clicks to show the Privacy Policy Info, then we should make sure the privacy dialog is not hiddent while it is open and ideally not at all...
  watch(showDataCollectionOptOut, (open) => {
    if (privacyNoticeTimeout !== null) {
      clearTimeout(privacyNoticeTimeout);
      privacyNoticeTimeout = null;
    }
    if (open) {
      privacyNoticeTimeout = setTimeout(() => {
        showDataCollectionOptOut.value = false;
      }, options.privacyNoticeTimeoutMs ?? PRIVACY_NOTICE_TIMEOUT_MS);
    }
  });
  
  // replaying any intro content brings this back up only once per session; the
  // privacy-lock icon still opens it on demand after that
  let privacyNoticeShown = false;
  
  /**
   * Only show the privacy dialog if the user has not yet responded to the opt out
   * and the privacy notice has not yet been shown in this session (if oncePerSession = true). */
  function conditionalShowPrivacyDialog(oncePerSession = false) {
    // we can show it, if we allow it more than once per session, or if it has not yet been shown in this session
    const showThisSession = !oncePerSession || !privacyNoticeShown;
    if (responseOptOut.value === null && showThisSession) {
      privacyNoticeShown = true;
      showDataCollectionOptOut.value = true;
    }
  }
  
  return {
    createUserEntry,
    responseOptOut,
    userID,
    showDataCollectionOptOut,
    showPrivacyPolicyInfo,
    conditionalShowPrivacyDialog,
  };
}
