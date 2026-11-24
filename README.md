# Dias & Frazer Group website

The group's website, built with [Quarto](https://quarto.org). Every page is a Markdown (`.qmd`) file. The publication list is generated from a BibTeX file, and anyone in the lab can add a paper or news post by opening a pull request.

Anything still to be filled in is marked **PLACEHOLDER**: yellow dashed boxes (`::: placeholder` or `class="placeholder"`) and `# PLACEHOLDER` comments. The public build hides the boxes, so missing content simply does not show; run `quarto preview --profile drafts` to see them (the "Build preview" workflow uses that profile too). To list them all: `grep -rn PLACEHOLDER --include=*.qmd --include=*.yml --include=*.bib .`

## Run it locally

1. Install Quarto (1.4 or newer): download from quarto.org, or `conda create -n quarto -c conda-forge quarto`.
2. In this folder run `quarto preview` (or `quarto preview --profile drafts` to also see the placeholder boxes). It opens the site and rebuilds as you edit.

If `quarto preview` fails with a "disk I/O error" or "unable to open database file", the cause is OneDrive: Quarto keeps a small database in `.quarto/` and OneDrive syncing breaks it. Keep your clone of this repo outside OneDrive (for example `~/code/lab-website`). As a stopgap, `quarto render` followed by `python3 -m http.server -d _site 4321` also works.

## Where things live

| What | Where |
|---|---|
| Home page | `index.qmd` |
| Research themes | `research.qmd` |
| Paper posts (one folder each) | `papers/YYYY-short-name/index.qmd` |
| Full publication list | `data/publications.bib` |
| People | `data/people.yml`, photos in `assets/img/people/` |
| News posts | `news/YYYY-MM-short-name/index.qmd` |
| Tools & data, Join us | `tools.qmd`, `join.qmd` |
| Navigation, footer, site settings | `_quarto.yml` |
| Colours, fonts, layout | `assets/light.scss`, `assets/dark.scss`, `assets/site.scss` |
| Card layouts for papers, news, people | `assets/templates/*.ejs` |

## Adding a paper (lead author)

Do this on launch day, alongside your thread.

1. Copy `papers/_template/` to `papers/YYYY-short-name/` (for example `papers/2026-diploid/`). Folders that start with `_` are never published.
2. Fill in the front matter: `title`, `date`, `status` (`preprint` or `published`), `venue`, a two-sentence `summary` for non-specialists, and the links `paper`, `code` and `data`. Leave a link empty (`""`) if it does not exist yet. When a preprint is published, point `paper` at the journal and keep the preprint under `preprint`.
3. Put the key figure in the same folder (PNG or JPG, about 1600 px wide) and set `image: figure.png`. Use a figure you are allowed to reuse: preprint figures are usually fine; for journal figures check the licence, or make a simplified version.
4. Write the body: a one-line TL;DR, then "In plain language" (three short paragraphs, no jargon), then the key figure with a one-sentence caption.
5. Add the BibTeX entry to `data/publications.bib`. For a preprint add `keywords = {preprint, post:papers/YYYY-short-name}`. When it is published, update the entry and remove `preprint`, and change `status` in the post.
6. Add a news post (below) announcing it.

### Threads, press and talks

Each paper page lists its social media threads, press coverage and recorded talks under `outreach:` in the front matter. The buttons on the paper card and page, and the "Threads & press" section, are built from this list, so add a link once and it appears everywhere.

```yaml
outreach:
  - url: https://bsky.app/profile/your.handle/post/abc123   # Bluesky, X, LinkedIn and Mastodon links are recognised as threads
  - url: https://www.eurekalert.org/news-releases/1106854
    kind: press                                               # thread | press | talk
    label: "CRG press release: AI learns from the tree of life"
  - url: https://www.youtube.com/watch?v=...                 # YouTube links are recognised as talks
    label: "Seminar at the Broad Institute (2022)"
```

Threads show as buttons on the paper's card. Press and talks are counted on the card and listed in full on the paper page. Add new links whenever they appear: a co-author's thread, a news story, a recorded talk.

Preprints are always listed first on the Papers page; within each group, newest first.

## Adding a news post

1. Copy `news/_template/` to `news/YYYY-MM-short-name/`.
2. Set `title`, `date`, one `categories` value (Preprint, Paper, Award, Talk, People or Software) and a one-sentence `description`.
3. Write two or three short paragraphs. Link the paper page and the thread.

The three most recent posts appear on the home page automatically. The News page also has an RSS feed (`news.xml`).

## Adding or updating yourself on the People page

Edit your entry in `data/people.yml`: role, a one- or two-line bio, and any of `website`, `scholar`, `orcid`, `github`, `bluesky`, `x`, `linkedin`. Add a photo as `assets/img/people/firstname-lastname.jpg` (square-ish, about 800 px) and set `photo: assets/img/people/firstname-lastname.jpg`. Without a photo, your initials are shown. When you leave, move your entry to `group: Alumni`.

## Making a pull request

1. Create a branch, make your changes, and run `quarto preview` to check they look right.
2. Commit only source files. `_site/` and `.quarto/` are build output and are ignored.
3. Open a pull request. The checklist in the PR template covers what reviewers look for. Mafalda or Jonny merges it, and the site updates itself a minute or two later.

## Previewing and deploying

The repository is **private** and the site is **not public yet**.

**Previews.** Every push and pull request runs the "Build preview" workflow (`.github/workflows/preview.yml`), which builds the site and attaches it as a zip. Open the run under the Actions tab, download `site-preview` from Artifacts, unzip it, and run `python3 -m http.server -d site-preview 4321`, then open http://localhost:4321. Or run `quarto preview` on your own clone.

**Going live** (only when Mafalda and Jonny agree):

1. GitHub Pages sites are always public, and free organisations can only publish Pages from public repositories. So either make this repository public (Settings → General → Danger zone → Change visibility), or move the organisation to a plan that allows Pages from private repositories (GitHub offers free Team plans to academic organisations through GitHub Education).
2. Settings → Pages → Source: **GitHub Actions**.
3. In `.github/workflows/publish.yml`, uncomment the `push:` trigger so every merge to `main` republishes the site. Then run the workflow once from the Actions tab.
4. Because the repository is named `DiasFrazerGroup.github.io`, the site appears at `https://diasfrazergroup.github.io/`.

Custom domain (optional):

1. Register the domain, then at your DNS provider add the GitHub Pages records: an `ALIAS`/`ANAME` or four `A` records for the apex domain, or a `CNAME` record for `www` pointing to `<org>.github.io`. GitHub's "Managing a custom domain" docs list the current IP addresses.
2. Create a file called `CNAME` in this folder containing only the domain (for example `diasfrazerlab.org`). It is already listed under `resources` in `_quarto.yml`, so it is copied into the build.
3. In Settings → Pages, enter the domain and tick "Enforce HTTPS".
4. Set `site-url` in `_quarto.yml` to the new address, so social cards and the RSS feed use the right links.

## Before going public

- Check what is still hidden as a PLACEHOLDER (search command above). Hidden boxes are fine to launch with.
- Check every entry in `data/publications.bib` (only popEVE has been checked against the published paper), or replace it with an export from ORCID or Zotero.
- Add a 1200×630 image as `assets/img/og-card.png` and set it under `open-graph` in `_quarto.yml`. This is the preview image when someone shares a link.
- CRG branding. We found no published CRG rule for group websites outside crg.eu, and other CRG groups link back to crg.eu and their official group page, as the footer here does. Before adding the CRG logo, or Severo Ochoa or CERCA acknowledgements, check with CRG Communications (comunicacio@crg.eu). Ask them too whether a site without cookies, analytics or forms needs its own legal notice. This site sets no cookies and has no analytics.
