import { createApp, type Plugin } from "vue";
import vuetify from "./plugins/vuetify";

/* import the toolkit css first so that it can be easily overridden */
import "@cosmicds/vue-toolkit/dist/vue-toolkit.css";

import Voyager from "./Voyager.vue";

import { wwtPinia } from "@wwtelescope/engine-pinia";

import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
  faBookOpen,
  faTimes,
  faQuestion,
  faSliders,
  faLightbulb,
  faSignsPost,
  faHouse,
  faXmark,
  faImage,
  faExpand,
  faCompress,
} from "@fortawesome/free-solid-svg-icons";

library.add(faBookOpen);
library.add(faTimes);
library.add(faQuestion);
library.add(faSliders);
library.add(faLightbulb);
library.add(faSignsPost);
library.add(faHouse);
library.add(faXmark);
library.add(faImage);
library.add(faExpand);
library.add(faCompress);

import hide from "./directives/hide";
import focusToggle from "./directives/focusToggle";
import focusGrab from "./directives/focusGrab";
// need to fix SpeedControl from the toolkit
import { ClickOutside } from "vuetify/directives";

import { addWwtlib } from "./wwt-hacks";
addWwtlib();

createApp(Voyager, {
  wwtNamespace: "voyager",
})
  // Plugins
  .use(wwtPinia as unknown as Plugin<[]>)
  .use(vuetify)

  // global so components don't each need their own FontAwesomeIcon import
  .component("font-awesome-icon", FontAwesomeIcon)

  // Directives
  .directive( "hide", hide)
  .directive("focus-toggle", focusToggle)
  .directive("focus-grab", focusGrab)
  .directive("click-outside", ClickOutside)

  // Mount
  .mount("#app-mount");

  
  

// https://david-gilbertson.medium.com/removing-that-ugly-focus-ring-and-keeping-it-too-6c8727fefcd2
// apparently quite the old problem.
window.addEventListener('keydown', e => { // text inputs always match :focus-visible, so track tab navigation ourselves
  if (e.key === 'Tab') document.documentElement.dataset.focusSource = 'keyboard';
}, true);
window.addEventListener('pointerdown', () => {
  document.documentElement.dataset.focusSource = 'pointer';
}, true);