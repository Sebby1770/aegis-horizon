# Aegis Horizon

Aegis Horizon is a local-first cyber resilience twin studio for future defensive systems, tabletop rehearsals, and executive policy packets. Instead of acting like another SOC dashboard, it lets teams model a future system, tune autonomy and supplier pressure, watch trust paths move across a live canvas, and compile defensive rules with evidence.

The project is intentionally defensive. It contains no exploit code, credential harvesting logic, malware samples, scanner modules, or instructions for unauthorized access.

## What it does

- Models six distinctive future systems: autonomous hospital care, autonomous ports, programmable treasury, frontier research, civic sensor grids, and orbital logistics.
- Draws an animated resilience twin with crown jewels, agents, recovery lanes, policy gates, trust paths, and moving evidence signals.
- Tunes decision lens, 30/90/180-day horizon, agent authority, supplier coupling, data gravity, and four defensive safeguards.
- Generates a tabletop timeline, policy forge rules with **defensive technique chips**, futures signals, and evidence ledger from the current local model.
- Produces a local policy packet as JSON with a browser-generated SHA-256 integrity digest when WebCrypto is available.
- Supports **multiple named twin profiles** in local storage (Save / Save As / Load / Delete), with migration from the older single-profile key.
- **Import / export** the full twin portfolio (profiles + current state + snapshots) as JSON — all offline, no network calls.
- Captures **comparison snapshots** of scores and pressure settings, with a side-by-side delta view.
- Opens a **printable board-level risk report** (mission, integrity/continuity, policies, techniques, timeline, evidence, SHA-256 digest).
- Ships as a static site suitable for GitHub Pages or any static host. Zero runtime npm dependencies.

## Run locally

```bash
npm start
```

Then open:

```text
http://127.0.0.1:4173
```

No install step is required because the app has no runtime dependencies.

## Local UX (v1.1)

### Named profiles
1. Enter a name under **Local Profile**.
2. **Save** writes the current twin under that name; **Save As** creates/overwrites by the input name.
3. Use **Load** / **Del** on each row in the saved profiles list.
4. Older installs with a single `aegis-horizon-twin-profile` key are migrated into the portfolio automatically.

### Portfolio import / export
- **Export** downloads all named profiles, current state, and snapshots as JSON.
- **Import** merges a previously exported portfolio (or a compatible profile object) back into local storage.

### Defensive technique mapping
Policy Forge rules show blue-team technique chips such as Zero Trust, MFA / step-up auth, Offline continuity, Provenance / attestation, Human-in-the-loop, Least privilege, and Segmented recovery. Mapping lives in `src/techniques.js`.

### Snapshots
- Name a baseline and click **Snapshot** to capture integrity, continuity, decision load, safeguards, and pressure.
- **Compare** opens a modal to pick two snapshots and view B−A deltas.

### Print report
- Toolbar **P** (Print report) builds a print-friendly board packet and opens the browser print dialog.
- `@media print` hides the twin canvas and dock controls and reflows panels / dedicated report content for paper or PDF.

## Validate

```bash
npm test
```

The validation script checks that static app files exist, the mission catalog is present, HTML references local assets only, and that portfolio export controls, techniques data, print styles, and package version `1.1.0` are present.

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
│   ├── techniques.js
│   └── styles.css
├── tools/
│   └── validate.mjs
└── SECURITY.md
```

## Roadmap

- [x] Add import/export for named twin portfolios.
- [x] Add defensive technique mapping for each generated policy.
- [x] Add printable board-level risk reports.
- [x] Add multiple named local profiles and comparison snapshots.
- [ ] Add optional WebCrypto signing for exported policy packets (beyond SHA-256 digests).

## Safety boundary

Aegis Horizon is for education, planning, tabletop exercises, and defensive resilience work. Do not use the project to target systems you do not own or have explicit permission to assess.
