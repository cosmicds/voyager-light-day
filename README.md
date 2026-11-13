# Vue Data Story Template

A template for building a Vue-based [CosmicDS](https://www.cosmicds.cfa.harvard.edu/) data story on top of WorldWide Telescope. It sets up the overall Vue project structure, integrates the WWT component, and provides some basic HTML scaffolding for placing controls in the main component — all built on shared components and composables from [`@cosmicds/vue-toolkit`](https://github.com/cosmicds/vue-toolkit).

## Prerequisites

You'll need `node` and `yarn`.

- Any recent `node` version works locally, but CI is pinned to Node 22.
- This project uses `corepack` and the `packageManager` field in `package.json` to pin the correct `yarn` version. Node ships `corepack` but doesn't enable it by default, so on a fresh install run:
  ```bash
  corepack enable
  ```
  With that done, `yarn` (any command) will automatically fetch and use the exact version this project pins — no separate `yarn` install needed.
- If none of that means anything to you yet, go to [nodejs.org/download](https://nodejs.org/en/download) and use the install wizard to get an LTS `node` release for your platform:
  ```
  Get Node.js [v22.x.x] from <Your OS> using [nvm] with [yarn]
  ```

## Creating a new story

Running `scripts/setup.sh <my-story-name>` will create your new story: it renames `<my-story-name>` throughout the app and writes the result into a **new sibling directory**.

```bash
# 1. Clone the template
git clone https://github.com/cosmicds/vue-ds-template.git
cd vue-ds-template

# 2. Creates your new story in ../<my-story-name> Give the name in kebab-case.
#    The new folder will not be a git repo, so you can `git init` it yourself if you want.
scripts/setup.sh <my-story-name>
# if that errors with a permission denied, run this first:
# chmod +x scripts/setup.sh

# 3. This moves you into the story you just created
cd ../<my-story-name>

# 4. This installs dependencies
yarn install

# 5. This starts the dev server
yarn dev        # or `yarn serve` to also expose it on your network
```

From here, feel free to remove whatever scaffolding doesn't fit your story — it's a starting point, not a framework you're locked into.




## Main `package.json` scripts

| Command | What it does |
| --- | --- |
| `yarn dev` | Start the dev server |
| `yarn serve` | Same, exposed on your network (`vite --host`) |
| `yarn build` | Type-check, then build for production |
| `yarn preview` | Serve the last production build locally, to sanity-check it before deploying |
| `yarn clean` | Remove `dist/` |



## Deployment and GitHub Actions

The built story in `./dist/` is just HTML/CSS/JS plus whatever assets you add, so it should be easy to host anywhere. One simple option is GitHub Pages. Two workflows in `.github/workflows` act on what you push:

- Opening a pull request runs `build.yml`, which builds that PR's version of the story — just to confirm it builds successfully. This typically does not require any environment variables. 
- Pushing to `main` or `dev` runs `build-deploy.yml`, which builds the story and pushes the result to the `gh-pages` branch (pushing to `dev` deploys under `/dev`). To serve that, go to `Settings > Pages`, choose `Deploy from a branch`, and select `gh-pages`.
- **Note**: You will need to change the the `github.repository_owner` field from `cosmicds` to your own GitHub username in `build-deploy.yml` and `build.yml` for the workflows to work.

`.env` only covers your own machine — it's never committed, so the deploy workflow can't see it. For the deployed build to have `VITE_ENVIRONMENT_VARIABLE`, add it as a **repository secret**: go to `Settings > Secrets and variables > Actions > New repository secret`, and name it `ENVIRONMENT_VARIABLE`. If you have multiple variables, make sure the `build-deploy` workflows grab and set them properly. 

**Note**: The `build` workflow runs on `pull_request` which does not have access to the secrets. This is good since it prevents secrets from being exposed to untrusted PRs, but it also means that if your story needs secrets to build, you won't be able to test that in a PR.

## Project structure

- `src/MainComponent.vue` — the story's root component (renamed by `setup.sh` to match your story name)
- `src/components/` — local, story-specific components
- `src/composables/` — local composables
- `src/plugins/vuetify.ts` — This is where you can setup the the `vuetify` color theme.
- `public/` — static assets, served as-is. 

## The toolkit (`@cosmicds/vue-toolkit`)

This template depends on `@cosmicds/vue-toolkit`, the component and composable library shared across CosmicDS's Vue data stories. Check here before writing a local equivalent in `src/components/`.

- Repo: [github.com/cosmicds/vue-toolkit](https://github.com/cosmicds/vue-toolkit)
- Component Storybook \& Docs: [projects.cosmicds.cfa.harvard.edu/vue-toolkit](https://projects.cosmicds.cfa.harvard.edu/vue-toolkit/)

Components:

- `IconButton` — tooltipped icon button (used throughout this template already)
- `ShareButton` — copies the current view to the clipboard
- `TourSheet` — guided-tour step display (text, back/next, breadcrumbs)
- `UserExperience` — the ratings/feedback prompt card
- `CreditLogos` — the CosmicDS/WWT/NASA/CfA credit row
- `AttentionHook` — a highlighted callout for drawing attention to something on screen
- `CloseButton` — a FontAwesome `xmark` icon button, themed to the current Vuetify theme color
- `CDSPrivacyPolicy` / `DataCollectionOptOutCard` / `DataCollectionOptOutFooter` — the privacy-policy dialog and the data-collection opt-out prompt (dialog card and persistent-footer variants)
- `Gallery` — an image lightbox/gallery overlay
- `FolderView` — a WWT folder/catalog tree browser
- `DateTimePicker` — a date/time picker with up/down step controls
- `PlaybackControl` / `SpeedControl` — time/animation playback transport controls
- `GeolocationButton` — requests and displays the user's location
- `LocationSearch` / `LocationSelector` — forward-geocoding search / a Leaflet map for picking a location
- `TapToInput` — click-to-edit numeric input
- `FundingAcknowledgement` — the standard NASA funding acknowledgment text
- `WwtHud` — a camera-settings debug overlay

Composables:

- `useTour` — step-based guided tour state (drives `TourSheet`)
- `useDataTracking` — anonymized usage tracking
- `useUserExperienceRating` — the ratings/feedback prompt's state (drives `UserExperience`)
- `useCounter` / `useElapsedTime` — small tracking helpers (a click counter, time elapsed while some condition holds)
- `useWWTKeyboardControls` — wires keyboard shortcuts to the WWT view
- `useGeolocation` / `useFullscreen` / `useWindowShape` / `usePlaybackControl` — browser geolocation, fullscreen, window-shape, and playback-timing state

Plus `skyBackgroundImagesets`, a small preset list of sky background imagesets.

## Environment variables

Only variables prefixed `VITE_` are read by the app (`import.meta.env.VITE_*`) and end up in the built JavaScript — nothing truly secret belongs here. Copy `.env.example` to `.env` and fill in:

- `VITE_CDS_API_KEY` — the API key the CosmicDS backend expects for usage/rating data submission


## License

[MIT](LICENSE.txt)




### Filling in `index.html`

The `<head>` of `index.html` is what search engines and link previews (Facebook, X, LinkedIn, Slack, iMessage) read — the previews don't run JavaScript, so nothing set from Vue reaches them. `setup.sh` fills in the URLs and a placeholder title. Before deploying update:

- **Title**: Same text in `<title>` and `og:title`.
- **Description** — one or two sentences. Same text in `description` and `og:description`.
- **Preview image** — `public/preview.png`, ~1.91:1 (1200×630), subject centred, under ~1 MB. Update `og:image:type`/`width`/`height` to match, and write a real `og:image:alt`.
- **URL** — the deployed URL with a trailing slash, in `canonical`, `og:url` and `og:image`. Never copy another story's `canonical`: it tells Google your page is a duplicate of that one.
- X falls back to the `og:*` tags, so there's no need for `twitter:title`/`description`/`image`. Don't bother with `meta keywords` — Google ignores it.