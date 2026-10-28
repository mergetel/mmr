# Monthly Made-up Revenue

A joke site that pokes fun at revenue screenshots, and a way into [merge.tel](https://merge.tel). It has two pages.

- **The generator** (`index.html`) draws a revenue card from a seed in the URL. The card carries a MADE UP stamp, a `$`/`$$`/`$$$$` axis and a footer strip saying it's made up, all inside the PNG.
- **The leaderboard** (`leaderboard/`) is a daily top 20 of fictional projects whose made-up revenue moves every day. It has one line of fake drama a day and the MMR Index, a single made-up number for the whole economy with a 30 day sparkline. Every row links to that project's card, and the card shows the same number the row does.

There's no build step, no framework, no dependencies and no database. The data is JSON files in the repo.

## Running it

Serve the folder and open it:

```sh
python3 -m http.server 8000
# http://localhost:8000/ and http://localhost:8000/leaderboard/
```

The generator works straight from disk too, but the leaderboard fetches JSON, and browsers block that on `file://`.

Tests need Node 22 and nothing else:

```sh
node --test
```

They check that every committed row opens a card with the same number, using the card's own `makeUp()` lifted out of `index.html`. They also replay the history day by day and expect the files back byte for byte. A change to the card's PRNG or delusion levels fails them, because it would break every leaderboard link.

## How it stays alive

`.github/workflows/daily-leaderboard.yml` runs every day at 07:23 UTC. It runs `scripts/generate.mjs`, which writes `data/leaderboard/YYYY-MM-DD.json` and appends the day to `data/leaderboard/days.json`. Then it runs the tests, opens a PR titled like "Leaderboard for Oct 29: Dashboard of Dashboards on a tear" and merges it. GitHub Pages then rebuilds the site from `main`. If a run gets missed, the next one catches up every missing day in one PR. You can also start it by hand from the Actions tab, with an optional date.

Each day is seeded from its date and the day before it, so the same history always produces the same tomorrow. The generator picks a card seed for each project so the card draws that project's exact figure, then uses the card's figure as the row's.

```sh
node scripts/generate.mjs                    # up to today (UTC)
node scripts/generate.mjs --date 2026-11-02  # up to a given day
node scripts/generate.mjs --backfill 30      # with no history yet, start 30 days back
```

The project list, the drama lines and the pivot rules are in `scripts/lib.mjs`. Names have to fit the card's 24 character name field, and the tests check that.

Two repo settings need to be on for the workflow to work:

1. Settings, Actions, General, Workflow permissions: "Allow GitHub Actions to create and approve pull requests". Without it, `gh pr create` fails with a 403.
2. Settings, Pages, Build and deployment: deploy from the `main` branch, root folder.

Don't make a status check required on `main`. A PR opened with the workflow's token can't start other workflows, so a required check would never report and the PR would sit there. The daily workflow runs the tests itself before it opens the PR.

`.github/workflows/check.yml` runs the tests on every other PR and push, then makes up the next day in a throwaway copy to prove the generator still runs.

## Deploying

The site is on GitHub Pages, at https://mergetel.github.io/mmr/ until it has a domain. Pages serves `main` from the repo root, so every merge, the daily one included, redeploys it. There's no build. The empty `.nojekyll` file tells Pages to serve the files as they are instead of running them through Jekyll.

Every link and fetch in the pages is relative, so the site works under `/mmr/` and at the root of a custom domain alike.

## Setting the domain

The domain lives in one place, `window.MMR_SITE` in `site.js`. Both pages print it in their footer strips, and the generator draws it onto every PNG. Change it there once the domain is bought. Then add the domain under Settings, Pages, Custom domain, and point its DNS at GitHub Pages. GitHub commits a `CNAME` file to `main` when you save it there.

## Rules

- **Obviously fake, and the image says so.** Anything people can download or screenshot carries the tell inside the image itself. The card bakes in its stamp and strip. The leaderboard and the index each have a MADE UP stamp and a yellow strip inside the panel, so a cropped screenshot still says it.
- **Mock the genre, never a name.** Every project is fictional, and the names are jokes rather than plausible brands. If one turns out to belong to something real, find and replace it across `data/` and `scripts/lib.mjs`. A consistent replace keeps the history replaying, because card seeds hang off the project id, not the name.
- **No email capture.** A "join 38,000 founders" box can be a gag, but it saves nothing.
- **Two voices.** The parody copy is overdone growth-thread voice on purpose. The "Why this exists" footers are John speaking in the first person, and they point at merge.tel.

The generator page started life in `jfreal/mergetel` (PR 660) and moved here.
