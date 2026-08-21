# Changelog

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
