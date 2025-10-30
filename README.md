# Retro Boston.com — RSS → GitHub Pages (with header image)

**All on GitHub**: Pages hosts static `/docs`, Actions fetch RSS and publish retro-styled story pages.

## Setup
1. Create a repo and upload these files.
2. Settings → Pages → Source: **Deploy from a branch**, Branch: **main**, Folder: **/docs**.
3. (Optional) Manually run the workflow with your own feeds.

## Default feed
- `https://www.boston.com/tag/local-news/feed` (edit in workflow inputs or scripts/rss_build.mjs)

## Manual run with custom feeds
- Actions → **Build Retro RSS** → Run workflow
  - `feeds`: `https://www.boston.com/tag/local-news/feed`
  - `max`: `10`

## Public URLs
- Home: `https://<user>.github.io/<repo>/`
- Story: `https://<user>.github.io/<repo>/stories/<slug>.html`

## Notes
- The header image is referenced from Imgur (https://i.imgur.com/o34tFuK.png). If you prefer to host it in-repo, save it to `docs/assets/header.png` and update the `<img src>` in `docs/index.html` and `templates/story.ejs`.
- Content is sanitized; links/images are absolutized.
