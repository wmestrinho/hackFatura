# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dev Server

```bash
python3 server.py 5500
```

Serves the app at `http://localhost:5500` with no-cache headers. The app is pure static HTML/CSS/JS — no build step, no npm, no bundler.

## Architecture

Single-page application. All views live in `index.html` as `<div class="view">` elements. Navigation is `go(viewId)` in `js/app.js`, which toggles the `active` class.

**JS load order matters** (all via `<script>` tags in `index.html`):
1. `js/config.js` — `PCJ` config object + `STATE` (in-memory, backed by localStorage) + persistence helpers
2. `js/sheets.js` — Google Sheets API layer
3. `js/invoice.js` — jsPDF invoice generator (client-side only)
4. `js/app.js` — all UI logic, form handlers, dashboard, invoice dual mode

**Data flow:**
- Every form submit: saves to `STATE.localEntries` (localStorage) first, then fires-and-forgets to Google Sheets
- Dashboard reads exclusively from `STATE.localEntries` — fully offline
- Sheets writes are GET requests (not POST) to work around CORS/redirect limitations; responses are opaque from the browser

**Views:** `mainMenu`, `tableWork`, `partsWork`, `invoiceBuilder`, `newCustomer`, `workCosts`, `eventDashboard`

## Google Apps Script Backend

`google-apps-script/Code.gs` is the authoritative source. To deploy changes:

1. Copy the full file contents
2. Go to [script.google.com](https://script.google.com), open the project, paste and replace all
3. Create a **New Deployment** (do not redeploy — always new deployment)
4. Copy the new URL into `PCJ.SHEETS_SCRIPT_URL` in `js/config.js`

The backend writes to Google Spreadsheet ID `1_I9kaE7ag1aULPneCB8kwuNksjWzI-EIrkTNXUp_VTQ`. Each event gets four tabs: `{Event}_TableWork`, `{Event}_PartsWork`, `{Event}_WorkCosts`, `{Event}_Invoices`. The `Customers` tab is global.

## Key Patterns

**Adding a new form type:**
1. Add a view in `index.html`
2. Add a `submit*` handler in `js/app.js` that calls `saveLocalEntry({ type: '...', ... })`
3. Add an appender function in `google-apps-script/Code.gs`
4. Register the action in `doGet`/`doPost` handlers in `Code.gs`

**Pricing is centralized** in `PCJ.pricing` in `js/config.js`. Service selects use `value="ServiceName|price"` format; split on `|` to extract both.

**localStorage keys:**
- `pcj_user`, `pcj_event` — current session selections
- `pcj_events` — event list array
- `pcj_local_entries` — all form submissions (type, event, org, amount, loggedBy, paymentStatus, savedAt)
- `pcj_local_customers` — org name list for datalist autocomplete

## Deployment

Push to `main` → GitHub Pages auto-deploys via `.github/workflows/deploy.yml`. Live at `https://wmestrinho.github.io/hackFatura/`.

No build step — the workflow uploads the repo root directly.

## Pending: CNAME Restore

`CNAME.bak` exists in the repo root. When DNS for `mech.robotfantome.com` is back:
```bash
mv CNAME.bak CNAME && git add CNAME && git commit -m "restore: CNAME for mech.robotfantome.com" && git push
```
