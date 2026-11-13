// @ts-check
import eslint from '@eslint/js';
import eslintPluginVue from 'eslint-plugin-vue';
import eslintVueParser from 'vue-eslint-parser';
import globals from 'globals';
import typescriptEslint from 'typescript-eslint';
import eslintPluginVuetify from 'eslint-plugin-vuetify';
import pluginVueA11y from "eslint-plugin-vuejs-accessibility";

export default typescriptEslint.config(
  { ignores: ['**/dist'] },
  
  {
    extends: [
      eslint.configs.recommended,
      ...typescriptEslint.configs.strict,
      ...typescriptEslint.configs.stylistic,
      // ...eslintPluginVue.configs['flat/essential'], // handle Vue specific rules in a separate block
      
    ],
    
    
    languageOptions: {
      parser: typescriptEslint.parser, 
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
      globals: globals.browser,
    },
    
    // keep rules from vue-ds-template
    rules: {
      "indent": ["error", 2],
      "@typescript-eslint/naming-convention": [
        "error", {
          selector: ["variable", "memberLike", "function"],
          format: ["camelCase"],
          leadingUnderscore: "allow"
        },
        {
          selector: ["variable"],
          modifiers: ["const"],
          format: ["camelCase", "UPPER_CASE"],
          leadingUnderscore: "allow"
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
          leadingUnderscore: "allow"
        },
        {
          selector: [
            "classProperty",
            "objectLiteralProperty",
            "typeProperty",
            "classMethod",
            "objectLiteralMethod",
            "typeMethod",
            "accessor",
            "enumMember"
          ],
          format: null,
          modifiers: ["requiresQuotes"]
        },
        {
          // particularly for db things, we need snake case, and this lets you do that without
          // having to add a disalbe comment. 
          selector: ["objectLiteralProperty", "typeProperty"],
          format: null
        }
      ],
      "no-unused-vars": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/no-unused-vars": [
        "error", {
          "args": "all",
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_"
        }
      ],
      
      
      "@/semi": "error",
      "vue/multi-word-component-names": "off"
    },
    
  },
  
  // ESLint configuration for Vue3
  {
    files: ['**/*.vue'],
    
    extends: [
      ...eslintPluginVue.configs['flat/recommended'],
      ...eslintPluginVuetify.configs['flat/recommended'],
    ],
    languageOptions: {
      parser: eslintVueParser,
      parserOptions: {
        parser: typescriptEslint.parser,
        extraFileExtensions: ['.vue'],
      },
    },
    
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/html-self-closing': 'off',
      // this will allow use to to put an id and class on the same line, but a prettier run will break that. 
      'vue/max-attributes-per-line': ['error', { singleline: 2, multiline: { max: 2 } }],
      'vue/first-attribute-linebreak': ["error", {
        "singleline": "ignore",
        "multiline": "below"
      }],
      // In vue, you can define a prop as optional, but if you include withDefaults
      // this rule would require you to define a default. Problems this rule prevents are prevented by typescript.
      'vue/require-default-prop': 'off',
      // we like to live dangerously sometimes and this can be easier than a slot.
      'vue/no-v-html': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/attribute-hyphenation': ['error', 'always'],
    },
  },
  
  // vue-ally linter
  {
    files: ['**/*.vue'],
    extends: [
      ...pluginVueA11y.configs["flat/recommended"],
    ],
    plugins: {
      "vuejs-accessibility": pluginVueA11y,
    },
    rules: {
      // we will probably want to enable this at some point.
      "vuejs-accessibility/media-has-caption": "off",
      // this probably is a good rule to have, but too strict for a starter template
      "vuejs-accessibility/tabindex-no-positive": "off",
      "vuejs-accessibility/label-has-for": ["error",
        {
          required: { some: ["nesting", "id"] },
          allowChildren: true,
        }],
    }
  }

);



