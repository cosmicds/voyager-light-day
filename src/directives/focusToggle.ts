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

import { nextTick, type Directive } from 'vue';


export type FocusToggleDirective = Directive<HTMLElement, boolean>;

declare module 'vue' {
    export interface GlobalDirectives {
        /**
         * :v-focus-toggle=\<boolean\>
         *
         * Focuses the element when the bound value becomes true. When it
         * becomes false, returns focus to whatever was focused beforehand -
         * works regardless of what that was, so any kind of opener is fine.
         *
         * make sure element is focusable. if wrapper is a not a focusable
         * element ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus))
         * add `tabindex="-1"` after the v-focus*
        */
        vFocusToggle: FocusToggleDirective
    }
}

/** the WeakMap persists, but key elements can be garbage-collected so they don't build up when no longer relevant */
const previouslyFocused = new WeakMap<HTMLElement, HTMLElement | null>();

// import { _short } from '../utils';

function activate(el: HTMLElement) {
  previouslyFocused.set(el, document.activeElement as HTMLElement | null);
  // console.log(`focus-toggle: focusing ${_short(el)} (was ${_short(document.activeElement)})`);
  el.focus();
}

function deactivate(el: HTMLElement) {
  const target = previouslyFocused.get(el);
  // defer: focusing immediately will lose out to (likely) vuetify's own focus-management.
  nextTick(() => {
    // console.log(`focus-toggle: returning focus to ${_short(target)}`);
    target?.focus();
  });
}

/**
 * :v-focus-toggle=\<boolean\>
 *
 * Focuses the element when the bound value becomes true. When it becomes
 * false, returns focus to whatever was focused beforehand - works
 * regardless of what that was, so any kind of opener is fine.
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
    // if the element is newly hidden, return focus to the originator
    if (!binding.value && binding.oldValue) {
      deactivate(el);
    }
  },
  // the element may be v-if'd away while still active
  unmounted: (el, binding) => {
    if (binding.value) deactivate(el);
  },
} satisfies FocusToggleDirective;
