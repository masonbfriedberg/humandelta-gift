# Human Delta gift page

A one-page form where people send their shipping address for the Human Delta
cocktail shaker set. Answers go to a Google Form.

Live: https://humandelta-gift.netlify.app

## Two versions

| Folder | What it does |
| --- | --- |
| `simple/` | One open form for everyone. Posts straight to the Google Form. |
| `personal-links/` | One link per person (`?t=CODE`). The name and email are pre-filled, and the link locks after one submission. Uses Netlify Functions and Netlify Blobs. |

Switch the live site with one command (needs the Netlify CLI, logged in, and
each folder linked to the site with `netlify link`):

```sh
./switch.sh simple
./switch.sh personal-links
```

## Making personal links

From `personal-links/`, after `npm install`:

```sh
node make-links.mjs recipients.csv   # header row: name,email
node make-links.mjs --test 2         # test codes; never reach the Google Form
```

Links are written to `links.csv`, which is git-ignored because it holds names
and emails.

## Notes

- The Google Form requires Country, which the page no longer asks for, so
  "United States" is always sent.
- `simple/` is a single static file and can be hosted anywhere (e.g. Vercel).
  `personal-links/` relies on Netlify Functions and Blobs.
