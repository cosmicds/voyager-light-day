import { aliases, mdi } from "vuetify/iconsets/mdi";
import { createVuetify } from "vuetify";

// For test use. Do not include createVuetify()
// see https://next.vuetifyjs.com/en/features/treeshaking/
//import * as components from 'vuetify/components';
//import * as directives from 'vuetify/directives';

// For help makeing simple themes, see https://theme.oliverrr.net/config

// Translations provided by Vuetify
import { en } from "vuetify/locale";

// Styles
import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";

// CosmicDS colors
export const COSMICDS_COLORS = {
  "cosmicds-red": "#E60001",
  "cosmicds-blue": "#0F3A7E",
  "cosmicds-red-lighter": "#ff4e4e",
  "cosmicds-blue-lighter": "#1a63d9",
} as const;

export default createVuetify({
  // Icon Fonts
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: {
      mdi,
    },
  },
  locale: {
    locale: "en",
    fallback: "en",
    messages: { en },
  },
  theme: {
    defaultTheme: "custom",
    themes: {
      /** the unmodified default vuetify light theme */
      light: {
        dark: false,
        colors: {
          background: "#FFFFFF",
          surface: "#FFFFFF",
          "surface-bright": "#FFFFFF",
          "surface-light": "#EEEEEE",
          "surface-variant": "#424242",
          "on-surface-variant": "#EEEEEE",
          primary: "#1867C0",
          "primary-darken-1": "#1F5592",
          secondary: "#48A9A6",
          "secondary-darken-1": "#018786",
          error: "#B00020",
          info: "#2196F3",
          success: "#4CAF50",
          warning: "#FB8C00",
        },
      },
      /** the unmodified default vuetify dark theme */
      dark: {
        dark: true,
        colors: {
          background: "#121212",
          surface: "#212121",
          "surface-bright": "#ccbfd6",
          "surface-light": "#424242",
          "surface-variant": "#c8c8c8",
          "on-surface-variant": "#000000",
          primary: "#2196F3",
          "primary-darken-1": "#277CC1",
          secondary: "#54B6B2",
          "secondary-darken-1": "#48A9A6",
          error: "#CF6679",
          info: "#2196F3",
          success: "#4CAF50",
          warning: "#FB8C00",
        },
      },

      /** custom theme, based on vuetify dark */
      custom: {
        // because this is dark: true, anything not defined falls back to the dark theme above
        dark: true,
        colors: {
          // we often use accent and accent2 (or the old template had button color)
          // to get additional theme colors, and never used primary/secondary which are what
          // we were really doing. so here we define primary (but not secondary) to be the
          // accent color. we alias it in the main app to "accentColor", but `color="primary"`
          // is what should be used on vuetify components
          primary: "#C4A447",
          secondary: "#583671",
          ...COSMICDS_COLORS,
        },
      },
    },
  },
});

// Export for test.
//export { components, directives };
