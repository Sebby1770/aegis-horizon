# Aegis Horizon

Aegis Horizon is a local-first cyber resilience twin studio for future defensive systems, tabletop rehearsals, and executive policy packets. Instead of acting like another SOC dashboard, it lets teams model a future system, tune autonomy and supplier pressure, watch trust paths move across a live canvas, and compile defensive rules with evidence.

The project is intentionally defensive. It contains no exploit code, credential harvesting logic, malware samples, scanner modules, or instructions for unauthorized access.

**Live:** [https://sebby1770.github.io/aegis-horizon/](https://sebby1770.github.io/aegis-horizon/)

## What it does

- Models seven distinctive future systems: autonomous hospital care, autonomous ports, programmable treasury, frontier research, civic sensor grids, municipal water SCADA, and orbital logistics.
- Draws an animated resilience twin with crown jewels, agents, recovery lanes, policy gates, trust paths, and moving evidence signals.
- Tunes decision lens, 30/90/180-day horizon, agent authority, supplier coupling, data gravity, and four defensive safeguards.
- Generates a tabletop timeline, policy forge rules with **defensive technique chips**, futures signals, and evidence ledger from the current local model.
- Produces a local policy packet as **JSON** (SHA-256 digest when WebCrypto is available) or **CSV** (`section,item` for policies, techniques, timeline, and evidence).
- Walks a **tabletop rehearsal stepper** through timeline beats (Rehearse / Next beat / Reset, `[` / `]`).
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

## Local UX (v1.7)

### Isolated nodes
- Map telemetry lists nodes with undirected degree 0 (`isolatedNodes`). Self-loops do not count. Empty catalog yields none.

### Dominant pressure
- Under the horizon strip, `dominantPressure` names the highest of agent / supplier / data. Ties keep that order.

### Continuity drop
- Next to integrity drop, `continuityDrop` shows continuity at 30d, 180d, and the difference.

### Worst flip
- The Gaps panel highlights the safeguard flip with the smallest Δ integrity (`worstFlip`) unless it is also the best flip.

## Local UX (v1.6)

### Hottest node
- Map telemetry includes the highest-weight node (`hottestNode`; first node wins ties).

### Horizon drop
- Under the 30/90/180 strip, `horizonDrop` shows integrity at 30d, 180d, and the difference (30 minus 180). Null when either horizon is missing.

### Best flip
- The Gaps panel highlights the safeguard flip with the largest Δ integrity (`bestFlip`) and names it in the caption.

## Local UX (v1.5)

### Horizon strip
- Decision panel shows 30d / 90d / 180d integrity from `horizonStrip` (same pressure and safeguards; missing horizon keys are skipped).

### Crown neighbors
- Map telemetry lists nodes linked to the crown jewel (`crownNeighbors`; undirected). Empty when there is no crown node.

### Board blurb
- One sentence under posture advice (`boardBlurb`): `{crown jewel} at integrity {score}; watch {weakest label}.` Omits the watch clause when there is no weakest node.

## Local UX (v1.4)

### Control gaps
- Toolbar **Gaps** opens a dock-side panel of `controlDeltas`: each safeguard key, the flipped `wouldBe` state, and Δ integrity versus the current twin.

### Weakest node
- Map telemetry on the canvas overlay includes the lowest-weight node label (`weakestNode`; first node wins ties).

### Posture advice
- Up to three defensive bullets under the decision summary (`postureAdvice`): restore named-owner approvals, stand up an offline recovery owner, and pause new autonomy when integrity is below 55.

## Local UX (v1.3)

### Pressure sweep
- Toolbar **Sweep** opens a text table of integrity and continuity as agent authority moves from 0 to 100. Other sliders and safeguards stay put. No chart library.

### Mission compare
- Toolbar **Compare** picks two mission ids and scores integrity / continuity / coverage at the current pressure and safeguards.

### Packet markdown
- Toolbar **MD** downloads a small markdown packet: title, crown jewel, integrity/continuity, policies, timeline, and evidence. No secrets or digests.

### Node heatmap
- Toolbar **Heat** colors twin nodes by existing `node.weight` on a green → amber scale. Off keeps the usual type colors.

### Keyboard
- `R` / `N` / `0` rehearsal (start / next / reset).
- `[` / `]` previous / next beat.
- `?` help overlay. `Esc` closes overlays.

## Local UX (v1.2)

### Tabletop rehearsal
1. **Rehearse** (R) starts at the first timeline beat and highlights it.
2. **Next beat** (N) or `]` advances; `[` steps back. The panel clock follows the active beat's time code.
3. **Reset** (0) returns to the first beat.
4. Click a timeline row to jump to that beat.

### Packet CSV
- Toolbar **CSV** downloads a deterministic `section,item` packet (policies, techniques, timeline, evidence). No secrets, profiles, or digests.

### Water Grid
- **Water Grid** is a municipal / civic water SCADA twin: potable-water continuity, named operator approval, and offline chemical-dose packets.

### Scoring module
- Integrity, continuity, coverage, policy rows, and CSV helpers live in `src/score.js` as pure functions so Node tests do not need the DOM.

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

The validation script checks that static app files exist, the mission catalog (including Water Grid) is present, HTML references local assets only, scoring is extracted to `src/score.js`, rehearsal/CSV/sweep/gaps/compare/markdown/heatmap/help/horizon-strip/blurb/drop/hottest/best-flip/isolated/pressure/continuity/worst-flip controls exist, scenario links round-trip, and package version `1.8.0` is set. `node --test tools/score.test.mjs tools/share.test.mjs` covers scenario link encoding, decoding and rejection, plus integrity bounds, coverage monotonicity, Water Grid shape, CSV order, pressure sweeps, mission compare, packet markdown, finite control-flip deltas, weakest and hottest Water Grid nodes, recovery posture advice, 30/90/180 horizon strips, horizon and continuity drop, crown neighbors, board blurb, best/worst flip, isolated nodes, and dominant pressure. Live Pages URL: https://sebby1770.github.io/aegis-horizon/

## Publish on GitHub Pages

In the repository settings, set Pages to deploy from the `main` branch and the repository root. The app is fully static, so no build command is required. A `.nojekyll` file is included so GitHub Pages serves the tree as-is.

Live URL: [https://sebby1770.github.io/aegis-horizon/](https://sebby1770.github.io/aegis-horizon/)

## Project structure

```text
.
├── index.html
├── .nojekyll
├── CHANGELOG.md
├── assets/
│   └── aegis-mark.svg
├── src/
│   ├── app.js
│   ├── data.js
│   ├── score.js
│   ├── techniques.js
│   └── styles.css
├── tools/
│   ├── validate.mjs
│   └── score.test.mjs
└── SECURITY.md
```

## Roadmap

- [x] Add import/export for named twin portfolios.
- [x] Add defensive technique mapping for each generated policy.
- [x] Add printable board-level risk reports.
- [x] Add multiple named local profiles and comparison snapshots.
- [x] Extract scoring for DOM-free tests.
- [x] Add municipal water SCADA continuity mission.
- [x] Add tabletop rehearsal stepper and CSV packet export.
- [x] Add pressure sweep, mission compare, packet markdown, heatmap, and keyboard help.
- [x] Add control-gap deltas, weakest-node telemetry, and defensive posture advice.
- [x] Add 30/90/180 horizon strip, crown-neighbor telemetry, and board blurb.
- [ ] Add optional WebCrypto signing for exported policy packets (beyond SHA-256 digests).

## Safety boundary

Aegis Horizon is for education, planning, tabletop exercises, and defensive resilience work. Do not use the project to target systems you do not own or have explicit permission to assess.
