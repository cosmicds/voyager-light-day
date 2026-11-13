/**
 * Custom directives
 * https://vuejs.org/guide/typescript/composition-api#typing-global-custom-directives
 * https://vuejs.org/guide/reusability/custom-directives.html#directive-hooks
 *
 * Hints:
 *  - Put the JSDoc comments in the module declaration for it to show up in the template
 *  - Put the JSDoc comments above the `export default` for it to show up where the directive is imported
 *
 */

import type { Directive } from 'vue';


export type FocusGrabDirective = Directive<HTMLElement, boolean>;

declare module 'vue' {
    export interface GlobalDirectives {
        /**
         * :v-focus-grab=\<boolean\>
         *
         * Focuses the element when the bound value becomes true. Unlike
         * v-focus-toggle, it never returns focus anywhere when the value
         * becomes false - it only ever grabs.
         *
         * make sure element is focusable. if wrapper is a not a focusable
         * element ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus))
         * add `tabindex="-1"` after the v-focus*
        */
        vFocusGrab: FocusGrabDirective
    }
}

// import { _short } from '../utils';

function activate(el: HTMLElement) {
  // console.log(`focus-grab: focusing ${_short(el)} (was ${_short(document.activeElement)})`);
  el.focus();
}

/**
 * :v-focus-grab=\<boolean\>
 *
 * Focuses the element when the bound value becomes true. Unlike
 * v-focus-toggle, it never returns focus anywhere when the value becomes
 * false - it only ever grabs.
 *
 * make sure element is focusable. if wrapper is a not a focusable element
 * ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus))
 * add `tabindex="-1"` after the v-focus*
*/
export default {
  // the element may be v-if'd in already active (e.g. default true)
  mounted: (el, binding) => {
    if (binding.value) activate(el);
  },
  updated: (el, binding) => {
    // if the element is newly visible, focus itself
    if (binding.value && !binding.oldValue) {
      activate(el);
    }
  },
} satisfies FocusGrabDirective;
