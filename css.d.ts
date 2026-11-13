/**
 * v-app complains if a css var is in cssVars because it does not strictly
 * match the typof of StyleValue. The suggest fix is from here
 *  https://github.com/frenic/csstype#what-should-i-do-when-i-get-type-errors
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type * as CSS from "csstype";

declare module "csstype" {
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  interface Properties {
    // Allow any CSS Custom Properties
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [index: `--${string}`]: any;
  }
}
