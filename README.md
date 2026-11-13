# Voyager Reaches 1 light day from the Earth

On November 18, 2026, 5:16AM EST the Voyager 1 spacecraft will be 1 light day away from the Earth ([JPL](https://science.nasa.gov/mission/voyager/voyager-1/voyager-1-what-is-a-light-day/])). This CosmicDS _Spark!_ celebrates this milestone by taking the viewer the Voyager mission's journey of discovery. 

## To Build and Run localy
Run
```bash
# make sure you have node installed, and corepack is enabled
yarn install
yarn dev # you will see a message with the local URL to open in your browser
```




## Deployment and GitHub Actions

The built story in `./dist/` is just HTML/CSS/JS plus whatever assets you add, so it should be easy to host anywhere. One simple option is GitHub Pages. Two workflows in `.github/workflows` act on what you push:

- Opening a pull request runs `build.yml`, which builds that PR's version of the story — just to confirm it builds successfully. This typically does not require any environment variables. 
- Pushing to `main` or `dev` runs `build-deploy.yml`, which builds the story and pushes the result to the `gh-pages` branch (pushing to `dev` deploys under `/dev`). To serve that, go to `Settings > Pages`, choose `Deploy from a branch`, and select `gh-pages`.
- **Note**: You will need to change the the `github.repository_owner` field from `cosmicds` to your own GitHub username in `build-deploy.yml` and `build.yml` for the workflows to work.

`.env` only covers your own machine — it's never committed, so the deploy workflow can't see it. For the deployed build to have `VITE_ENVIRONMENT_VARIABLE`, add it as a **repository secret**: go to `Settings > Secrets and variables > Actions > New repository secret`, and name it `ENVIRONMENT_VARIABLE`. If you have multiple variables, make sure the `build-deploy` workflows grab and set them properly. 

**Note**: The `build` workflow runs on `pull_request` which does not have access to the secrets. This is good since it prevents secrets from being exposed to untrusted PRs, but it also means that if your story needs secrets to build, you won't be able to test that in a PR.


## License

[MIT](LICENSE.txt)




### Filling in `index.html`

The `<head>` of `index.html` is what search engines and link previews (Facebook, X, LinkedIn, Slack, iMessage) read — the previews don't run JavaScript, so nothing set from Vue reaches them. `setup.sh` fills in the URLs and a placeholder title. Before deploying update:

- **Title**: Same text in `<title>` and `og:title`.
- **Description** — one or two sentences. Same text in `description` and `og:description`.
- **Preview image** — `public/preview.png`, ~1.91:1 (1200×630), subject centred, under ~1 MB. Update `og:image:type`/`width`/`height` to match, and write a real `og:image:alt`.
- **URL** — the deployed URL with a trailing slash, in `canonical`, `og:url` and `og:image`. Never copy another story's `canonical`: it tells Google your page is a duplicate of that one.
- X falls back to the `og:*` tags, so there's no need for `twitter:title`/`description`/`image`. Don't bother with `meta keywords` — Google ignores it.