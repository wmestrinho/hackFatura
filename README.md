# hackFatura | PCJ

**Parazinho Chassis Jig — Field Management App**

> Fine Tuned Since 2007 🏁

Live: [mech.robotfantome.com](https://mech.robotfantome.com)

---

## Stack

| Layer | Tech | Cost |
|-------|------|------|
| Frontend | Static HTML/CSS/JS | $0 |
| Invoice PDF | jsPDF (client-side, offline-capable) | $0 |
| Backend API | Google Apps Script Web App | $0 |
| Database | Google Sheets | $0 |
| Hosting | GitHub Pages + GitHub Actions CI/CD | $0 |
| Domain | mech.robotfantome.com (CNAME) | already owned |

**Total: $0/month**

---

## Features

- 🔧 **Table Work** — Log chassis adjustments with service tier pricing
- ⚙️ **Parts Work** — Log spindles, axles, columns with auto-totals
- 🧾 **Invoice Builder** — Generate branded PDF invoices 100% client-side (works offline)
- 👤 **New Customer** — Register team contacts
- 💸 **Work Costs** — Track overhead: food, hotel, fuel, track fees
- 📊 **Event Dashboard** — Revenue vs. costs summary per event
- 🗓️ **Dynamic Events** — Create events in-app; no hardcoded names
- 👥 **Team attribution** — Wagner, Thiago, Bebeco, Samuel, Henrique

---

## Setup

### 1. Google Sheets

Create a new Google Spreadsheet. Copy the Sheet ID from the URL:
```
https://docs.google.com/spreadsheets/d/[THIS_IS_YOUR_ID]/edit
```

### 2. Google Apps Script

1. Go to [script.google.com](https://script.google.com) → New Project
2. Paste the contents of `google-apps-script/Code.gs`
3. Replace `YOUR_SPREADSHEET_ID` with your Sheet ID
4. Deploy → New Deployment → Web App
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the Web App URL

### 3. Config

In `js/config.js`, update:
```js
SHEETS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
```

### 4. GitHub Repo

```bash
cd projects/hackfatura
git init
git add .
git commit -m "Initial hackFatura build"
gh repo create pcj-hackfatura --public --push --source=.
```

### 5. GitHub Pages

In your GitHub repo:
- Settings → Pages → Source: **GitHub Actions**
- The `deploy.yml` workflow handles everything on every push to `main`

### 6. Custom Domain

In GitHub Pages settings, add custom domain: `mech.robotfantome.com`

In your DNS (robotfantome.com):
```
CNAME  mech  →  yourusername.github.io
```

---

## Pricing Reference

### Table Work
| Service | Price |
|---------|-------|
| Fine Tuning (1st visit, <5mm) | $150 |
| Significant (1st visit, >5mm) | $180 |
| 2nd Visit | $100 |
| 3rd Visit | $50 |
| Weekend Package | $350 |
| Weekend Package (Regular Customer) | $300 |
| Salvage 1 area | $150 |
| Salvage 2 areas | $180 |
| Salvage 3 areas | $210 |
| Salvage 4 areas | $250 |
| Salvage 5+ areas | $300 |
| Free Inspection | $0 |

### Parts
| Part | Price |
|------|-------|
| Spindle | $40 |
| Column / Shaft | $30 |
| Axle 30mm | $40 |
| Axle 40mm | $50 |
| Axle 50mm | $60 |

---

## Team

| Name | Role |
|------|------|
| Wagner | Dev / Owner |
| Thiago | Manager |
| Bebeco | Dad |
| Samuel | Supervisor |
| Henrique | Mechanic |

---

## Brand

- **Black** `#0f0f0f`
- **Red** `#C0392B`
- **Graphite** `#3D3D3D`
