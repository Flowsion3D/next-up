# Next Up

A simple, static movie-night discovery dashboard prepared for GitHub Pages.

## What works

- A responsive, poster-led recommendation card with swipe, yes/no buttons, and left/right keyboard controls.
- Yes saves a title and raises similar genres. No hides the title and lowers its genres. Remaining picks re-rank immediately.
- Local saved list, undo, movie/show and streaming-provider filters, source details, and export/import.
- One shared taste profile per browser. There is no account, tracking, or remote preference database.
- Twelve curated titles, fifteen attributed Reddit references, and official US streaming-service links.

## Run and test

Node 24 and Python 3 are sufficient. No npm dependencies or API keys are required.

    npm run build
    npm run dev

Open the printed local address. The dev server serves `public/`. Browser preferences are origin-specific, so local preview data will not automatically move to the deployed site. Export/import can move it deliberately.

## Deploy to GitHub Pages

GitHub is the requested hosting destination. The repository and deployed URL are recorded separately after successful deployment.

1. This dashboard is published from a public repository with the owner’s approval, using GitHub Pages on the existing free plan. It contains only the generated app and supporting files.
2. Commit these files at the repository root, including `.github/workflows/pages.yml` and `public/`.
3. In **Settings → Pages**, choose **GitHub Actions** as the source.
4. Push to `main` (or update the workflow if the default branch differs). The workflow validates the catalog, runs syntax checks and tests, uploads only `public/`, and publishes it using official GitHub Pages actions.
5. Confirm the workflow for the actual commit succeeds. Retrieve the assigned Pages URL and verify it before sharing it.

The website and this repository are public. Browser choices are never written to the repository or sent to a server. No credentials, account history, personal profile, or private notes are included. No paid service or account upgrade is used.

Official workflow guide: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages .

## Data and source honesty

The research snapshot is **November 7, 2026**, for US subscription listings. Provider links are public listings, not a signed-in playback test or a guarantee of availability. No assumption is made about your subscriptions.

The viewer summaries are original paraphrases of linked Reddit posts/comments, not quotations, scores, measured consensus, or independently verified identities. Publication dates and research dates are distinct. Some linked discussions include spoilers, which are marked before opening.

**No TikTok testimonials are included:** public videos could not be verified through the available research access. The UI says so. There are no invented engagement counts or live-trend labels.

The catalog is a manually curated snapshot. The application does not automatically refresh or fetch social feeds. Streaming-account linking and watch-history access are intentionally absent. Personalization uses only the local yes/no feedback.

## Updating the catalog

Edit `public/catalog.json` and replace/add optimized images in `public/assets/`. Keep each title ID stable so saved choices still match. Every title needs at least one verified viewer source and one independently checked provider link. Record original publication dates and the new checked-at date, and rerun `npm run build`.

TVMaze offers a keyless public API with CORS for series metadata, not reliable US streaming availability or social trends. Future refreshes need a supported, licensed source for each type of data. Do not put API credentials in the public directory or a client-side bundle. Static hosting cannot conceal secrets or provide secure shared storage by itself.

## Credits and licenses

- Series metadata adapted from TVMaze, licensed CC BY-SA 4.0: https://www.tvmaze.com/api and https://creativecommons.org/licenses/by-sa/4.0/ . The adapted TVMaze-derived metadata is shared under the same license; original synopses and editorial genre/mood additions are identified by this notice. Per-title source links remain in the catalog and the interface.
- Artwork is promotional material from the linked provider/TVMaze sources and remains owned by its respective rights holders. Metadata licensing is not a blanket artwork license. Review artwork permissions before any commercial expansion.
- DM Sans and Manrope are self-hosted. Their SIL Open Font License files are in `public/licenses/`.

## Verification

`npm run build` runs syntax checks, catalog validation, and 10 focused recommendation/state tests. Static review addressed loading-state errors, keyboard import, card clipping, and focus continuity.

The GitHub Actions run records checks and deployment for the specific commit. Browser verification should cover the published URL on desktop and mobile layouts, yes/no/undo, filters, list changes, reload persistence, source dialogs, keyboard controls, and source/provider links. This is a rough first pass, not a full accessibility or cross-browser certification.
