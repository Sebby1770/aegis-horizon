/**
 * Boundary validation for snapshots restored from outside the running page.
 *
 * Snapshots arrive from two untrusted places: localStorage, and a
 * user-supplied portfolio JSON file. Neither was validated on the way in —
 * `loadSnapshotsFromStorage` accepted any array, and the import path checked
 * only `typeof snap.integrity === "number"` — while the renderer interpolates
 * the numeric fields into innerHTML *unescaped*:
 *
 *   <small>I ${snap.integrity}% · C ${snap.continuity}% · …</small>
 *
 * A stored snapshot whose `integrity` was a string of markup therefore executed.
 * localStorage is scoped to the ORIGIN, so every project published under the
 * same GitHub Pages account shares this store.
 *
 * Everything here is pure so it can be tested directly.
 */

export const MAX_SNAPSHOTS = 40;
export const CONTROL_KEYS = ["approvals", "recovery", "attestation", "privacy"];
const PRESSURE_KEYS = ["agent", "supplier", "data"];

/** A 0-100 percentage metric. */
function toScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

/** A non-negative count with no upper bound (decision load). */
function toCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function toText(value, fallback = "", max = 80) {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

/**
 * Coerces one snapshot into a known shape, or returns null if it is unusable.
 *
 * @param {unknown} snap
 * @param {number} index position in the list, used to synthesise a missing id
 * @param {{missions?: object, lenses?: object, horizons?: object}} [catalogs]
 */
export function sanitizeSnapshot(snap, index = 0, catalogs = {}) {
  if (!snap || typeof snap !== "object" || Array.isArray(snap)) return null;

  const name = toText(snap.name, "", 60).trim();
  if (!name) return null;

  const has = (map, key) =>
    Boolean(map) && Object.prototype.hasOwnProperty.call(map, key);

  const pressure = {};
  for (const key of PRESSURE_KEYS) pressure[key] = toScore(snap.pressure?.[key]);

  const controls = {};
  for (const key of CONTROL_KEYS) controls[key] = Boolean(snap.controls?.[key]);

  const clean = {
    id: toText(snap.id, "", 64).trim() || `snapshot-${index + 1}`,
    name,
    capturedAt: toText(snap.capturedAt, "", 40),
    missionTitle: toText(snap.missionTitle, "", 120),
    code: toText(snap.code, "", 24),
    integrity: toScore(snap.integrity),
    continuity: toScore(snap.continuity),
    decisionLoad: toCount(snap.decisionLoad),
    coverage: toScore(snap.coverage),
    pressure,
    controls
  };

  // Catalog-backed fields are kept only when this build actually has them, so a
  // stale or hostile file cannot smuggle an unknown key into a lookup.
  if (has(catalogs.missions, snap.mission)) clean.mission = snap.mission;
  if (has(catalogs.lenses, snap.lens)) clean.lens = snap.lens;
  if (has(catalogs.horizons, String(snap.horizon))) clean.horizon = Number(snap.horizon);

  return clean;
}

/** Sanitises a whole list, dropping unusable rows and enforcing the cap. */
export function sanitizeSnapshotList(list, catalogs = {}) {
  if (!Array.isArray(list)) return [];
  return list
    .map((snap, index) => sanitizeSnapshot(snap, index, catalogs))
    .filter(Boolean)
    .slice(0, MAX_SNAPSHOTS);
}
