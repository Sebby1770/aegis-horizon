# Changelog

## [1.8.0] — 2026-09-06

### Added
- **Shareable scenario links** (`src/share.js`). A rehearsal posture — mission, lens, horizon, pressures and safeguards — encodes to a short readable token (`1.caremesh.board.90.52-44-61.1101`) carried in the URL fragment, so it can be pasted into a ticket or a chat. The Share button copies the link, falling back to the address bar where the clipboard is unavailable, and a link pasted into an already-open tab is picked up too.
- `validate.mjs` fails the build if a scenario token does not round-trip.

### Changed
- The twin map no longer animates while the tab is hidden or when `prefers-reduced-motion` is set; it renders a single static frame that still repaints on state changes.
- Structural mission-graph validation: link endpoints must resolve, node coordinates must sit inside the canvas, weights must be in range.

### Fixed
- A link naming a missing node threw inside the animation frame and froze the twin map for the rest of the session.

## [1.7.0] — 2026-08-21

### Added
- Isolated nodes (`isolatedNodes` / `nodeDegrees`) on map telemetry — degree 0, catalog order.
- Dominant pressure (`dominantPressure`) under the horizon strip — highest of agent / supplier / data; ties keep that order.
- Continuity drop (`continuityDrop`) under integrity drop — continuity at 30d minus 180d.
- Worst control flip (`worstFlip`) highlighted in the Gaps table (smallest Δ integrity; first key on ties).

### Changed
- Package version `1.7.0`.

## [1.6.0] — 2026-08-21

### Added
- Hottest node (`hottestNode`) on map telemetry (highest `weight`; first node on ties).
- Horizon drop (`horizonDrop`) under the 30/90/180 strip — integrity at 30d minus 180d.
- Best control flip (`bestFlip`) highlighted in the Gaps table (largest Δ integrity; first key on ties).

### Changed
- Package version `1.6.0`.

## [1.5.0] — 2026-08-21

### Added
- Horizon strip (`horizonStrip`) under decision scores — 30d / 90d / 180d integrity without changing the selected horizon.
- Crown neighbors (`crownNeighbors`) on map telemetry (undirected links to the `type==="crown"` node).
- Board blurb (`boardBlurb`) under posture advice: crown jewel at integrity, watch the weakest node.

### Changed
- Package version `1.5.0`.

## [1.4.0] — 2026-08-21

### Added
- Control flip deltas (`controlDeltas`) and toolbar **Gaps** panel listing each safeguard key, would-be state, and Δ integrity.
- Weakest node (`weakestNode`) on map telemetry (lowest `weight`; first node on ties).
- Posture advice (`postureAdvice`) under the decision summary — at most three defensive bullets.

### Changed
- Package version `1.4.0`.

## [1.3.0] — 2026-08-21

### Added
- Pressure sweep helper (`pressureSweep`) and toolbar **Sweep** table for agent authority 0–100.
- Mission compare helper (`compareMissions`) and toolbar **Compare** selects scored at current sliders.
- Packet markdown (`packetMarkdown`) and toolbar **MD** download (title, scores, policies, timeline, evidence; no secrets).
- Keyboard help overlay (`?`, Escape closes). Rehearsal keys R / N / 0 plus `[` / `]`.
- Canvas node heatmap toggle (**Heat**) coloring twins by `node.weight` on a green/amber scale.

### Changed
- Package version `1.3.0`.

## [1.2.0] — 2026-08-21

### Added
- `src/score.js` — pure scoring and packet helpers (`clamp`, integrity/continuity/coverage, policy rows, CSV) so tests do not need the DOM.
- Water Grid (`watergrid`) municipal / civic water SCADA continuity mission: potable-water authority, operator approval, and offline chemical-dose packets.
- Tabletop rehearsal stepper: Rehearse / Next beat / Reset, active timeline highlight, clock follows the beat, `[` / `]` keys.
- Policy packet CSV export next to JSON (`section,item` for policies, techniques, timeline, evidence).
- GitHub Pages live URL: https://sebby1770.github.io/aegis-horizon/ plus `.nojekyll`.

### Changed
- Package version `1.2.0`.
- `app.js` imports scoring from `score.js`; numbers stay identical to 1.1.
- Validation and `tools/score.test.mjs` cover Water Grid, coverage monotonicity, integrity bounds, and CSV order.
