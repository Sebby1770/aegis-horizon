# Aegis Horizon

Aegis Horizon is a future-facing cybersecurity command center for blue-team planning, executive briefings, and portfolio demos. It turns defensive posture inputs into an animated risk forecast, incident queue, attack-surface map, future horizon model, and mitigation plan without sending data anywhere.

The project is intentionally defensive. It contains no exploit code, credential harvesting logic, malware samples, scanner modules, or instructions for unauthorized access.

## What it does

- Models modern cyber scenarios such as identity abuse, cloud drift, supply-chain exposure, AI phishing, quantum readiness, and ransomware pressure.
- Includes an agentic-workflow scenario for the next wave of autonomous tool access and policy enforcement.
- Scores cyber risk from local controls including MFA, EDR health, backup readiness, secrets rotation, exposure, drift, and data sensitivity.
- Projects 30-, 90-, and 180-day defensive maturity so teams can compare immediate containment with long-range resilience.
- Renders an animated attack-surface graph with scenario-specific nodes, paths, and signal intensity.
- Produces a local incident-response brief that can be downloaded as JSON with a browser-generated SHA-256 integrity digest when WebCrypto is available.
- Saves and restores one posture profile in local storage, keeping all data inside the browser.
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

The validation script checks that the static app files exist, the scenario catalog is present, and the HTML references local assets only.

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

- Add CSV import for asset inventories.
- Add MITRE ATT&CK-inspired defensive technique mapping.
- Add printable board-level risk reports.
- Add optional WebCrypto signing for exported briefs.
- Add multiple named local profiles and comparison snapshots.

## Safety boundary

Aegis Horizon is for education, planning, tabletop exercises, and defensive resilience work. Do not use the project to target systems you do not own or have explicit permission to assess.
