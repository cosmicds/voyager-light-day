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

import type { Directive, DirectiveBinding,  } from 'vue';


export type HideDirective = Directive<HTMLElement, boolean>;

declare module 'vue' {
    export interface GlobalDirectives {
        /**  
         * :v-hide=\<boolean\>
         * 
         * Hides an HTML element, keeping the space it would have used if it were visible (css: Visibility)
        */
        vHide: HideDirective
    }
}

/** v-hide directive taken from https://www.ryansouthgate.com/2020/01/30/vue-js-v-hide-element-whilst-keeping-occupied-space/ */
// Extract the function out, up here, so I'm not writing it twice
const update = (el: HTMLElement, binding: DirectiveBinding) => (el.style.visibility = binding.value ? "hidden" : "");

/**  
 * :v-hide=\<boolean\>
 * 
 * Hides an HTML element, keeping the space it would have used if it were visible (css: Visibility)
*/
export default {
  // Run on initialisation (first render) of the directive on the element
  beforeMount: (el, binding, _vnode, _prevVnode) => {
    update(el, binding);
  },
  // Run on subsequent updates to the value supplied to the directive
  updated: (el, binding, _vnode, _prevVnode) => {
    update(el, binding);
  },
} satisfies HideDirective;