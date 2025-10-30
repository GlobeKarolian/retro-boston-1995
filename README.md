# Retro Boston.com — MSN RSS → GitHub Pages

**All on GitHub.** Pages hosts static `/docs`, Actions fetch the MSN feed and publish retro-styled story pages.

## Default feed
`https://boston.com/bdc-msn-rss` (override when running the workflow or by editing `FEEDS` in `rss.yml` / `scripts/rss_build.mjs`).

## Setup
1. Create a repo and upload these files.
2. Settings → Pages → Source: **Deploy from a branch**, Branch: **main**, Folder: **/docs**.
3. Settings → Actions → General → **Workflow permissions** → **Read and write**.

## Manual run
Actions → **Build Retro RSS** → Run workflow
- `feeds`: leave blank to use the MSN feed, or paste your own
- `max`: e.g., `10`

## Public URLs
- Home: `https://<user>.github.io/<repo>/`
- Story: `https://<user>.github.io/<repo>/stories/<slug>.html`
