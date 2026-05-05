# Aegis Horizon

Aegis Horizon is a local-first cyber resilience twin studio for future defensive systems, tabletop rehearsals, and executive policy packets. Instead of acting like another SOC dashboard, it lets teams model a future system, tune autonomy and supplier pressure, watch trust paths move across a live canvas, and compile defensive rules with evidence.

The project is intentionally defensive. It contains no exploit code, credential harvesting logic, malware samples, scanner modules, or instructions for unauthorized access.

## What it does

- Models six distinctive future systems: autonomous hospital care, autonomous ports, programmable treasury, frontier research, civic sensor grids, and orbital logistics.
- Draws an animated resilience twin with crown jewels, agents, recovery lanes, policy gates, trust paths, and moving evidence signals.
- Tunes decision lens, 30/90/180-day horizon, agent authority, supplier coupling, data gravity, and four defensive safeguards.
- Generates a tabletop timeline, policy forge rules, futures signals, and evidence ledger from the current local model.
- Produces a local policy packet as JSON with a browser-generated SHA-256 integrity digest when WebCrypto is available.
- Saves and restores one twin profile in local storage, keeping all data inside the browser.
- Ships as a static site suitable for GitHub Pages or any static host.

## Run locally

```bash
npm start
```

Then open:

```text
http://127.0.0.1:4173
```

No install step is required because the app has no runtime dependencies.

## Validate

```bash
npm test
```

The validation script checks that the static app files exist, the mission catalog is present, and the HTML references local assets only.

## Publish on GitHub Pages

In the repository settings, set Pages to deploy from the `main` branch and the repository root. The app is fully static, so no build command is required.

## Project structure

```text
.
├── index.html
├── assets/
│   └── aegis-mark.svg
├── src/
│   ├── app.js
│   ├── data.js
│   └── styles.css
├── tools/
│   └── validate.mjs
└── SECURITY.md
```

## Roadmap

- Add import/export for named twin portfolios.
- Add defensive technique mapping for each generated policy.
- Add printable board-level risk reports.
- Add optional WebCrypto signing for exported policy packets.
- Add multiple named local profiles and comparison snapshots.

## Safety boundary

Aegis Horizon is for education, planning, tabletop exercises, and defensive resilience work. Do not use the project to target systems you do not own or have explicit permission to assess.
