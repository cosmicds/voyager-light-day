// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import * as wwtlib from "@wwtelescope/engine";

/**
 * Attach wwtlib to the window (convenient for dev)
 */
export function addWwtlib(): void {
  window.wwtlib = wwtlib;
}
