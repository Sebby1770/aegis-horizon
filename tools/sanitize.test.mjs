import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { horizonProfiles, lenses, missions } from "../src/data.js";
import { CONTROL_KEYS, MAX_SNAPSHOTS, sanitizeSnapshot, sanitizeSnapshotList } from "../src/sanitize.js";

const catalogs = { missions, lenses, horizons: horizonProfiles };
const XSS = '<img src=x onerror="window.pwned=true">';

const good = {
  id: "snap-1",
  name: "Baseline",
  capturedAt: "2026-09-08T00:00:00.000Z",
  mission: "caremesh",
  missionTitle: "Care continuity twin",
  code: "CM-22",
  lens: "board",
  horizon: 90,
  integrity: 71,
  continuity: 88,
  decisionLoad: 29,
  coverage: 64,
  pressure: { agent: 52, supplier: 44, data: 61 },
  controls: { approvals: true, recovery: true, attestation: false, privacy: true }
};

describe("sanitizeSnapshot", () => {
  it("passes a well-formed snapshot through unchanged", () => {
    const clean = sanitizeSnapshot(good, 0, catalogs);
    assert.deepEqual(clean, good);
  });

  it("coerces markup in numeric metrics to a number", () => {
    // The renderer interpolates these into innerHTML without escaping.
    const clean = sanitizeSnapshot(
      { ...good, integrity: XSS, continuity: XSS, decisionLoad: XSS, coverage: XSS },
      0,
      catalogs
    );
    for (const key of ["integrity", "continuity", "decisionLoad", "coverage"]) {
      assert.equal(typeof clean[key], "number", key);
      assert.ok(!String(clean[key]).includes("<"), key);
    }
  });

  it("coerces markup in pressure values", () => {
    const clean = sanitizeSnapshot({ ...good, pressure: { agent: XSS, supplier: "80", data: null } }, 0, catalogs);
    assert.equal(clean.pressure.agent, 0);
    assert.equal(clean.pressure.supplier, 80);
    assert.equal(clean.pressure.data, 0);
  });

  it("clamps percentages to 0-100", () => {
    const clean = sanitizeSnapshot({ ...good, integrity: 900, continuity: -40, coverage: 55.6 }, 0, catalogs);
    assert.equal(clean.integrity, 100);
    assert.equal(clean.continuity, 0);
    assert.equal(clean.coverage, 56);
  });

  it("forces every control to a boolean", () => {
    const clean = sanitizeSnapshot({ ...good, controls: { approvals: XSS, recovery: 0 } }, 0, catalogs);
    for (const key of CONTROL_KEYS) assert.equal(typeof clean.controls[key], "boolean", key);
    assert.equal(clean.controls.approvals, true);
    assert.equal(clean.controls.recovery, false);
    assert.equal(clean.controls.privacy, false);
  });

  it("drops catalog fields this build does not have", () => {
    const clean = sanitizeSnapshot({ ...good, mission: "atlantis", lens: XSS, horizon: 365 }, 0, catalogs);
    assert.equal(clean.mission, undefined);
    assert.equal(clean.lens, undefined);
    assert.equal(clean.horizon, undefined);
  });

  it("rejects a snapshot with no usable name", () => {
    assert.equal(sanitizeSnapshot({ ...good, name: "" }, 0, catalogs), null);
    assert.equal(sanitizeSnapshot({ ...good, name: 42 }, 0, catalogs), null);
    assert.equal(sanitizeSnapshot(null, 0, catalogs), null);
    assert.equal(sanitizeSnapshot("nope", 0, catalogs), null);
    assert.equal(sanitizeSnapshot([], 0, catalogs), null);
  });

  it("keeps the name as text but bounds its length", () => {
    // The name is escaped at render; the bound is about storage sanity.
    const clean = sanitizeSnapshot({ ...good, name: "x".repeat(500) }, 0, catalogs);
    assert.equal(clean.name.length, 60);
  });

  it("synthesises an id when one is missing", () => {
    assert.equal(sanitizeSnapshot({ ...good, id: undefined }, 4, catalogs).id, "snapshot-5");
    assert.equal(sanitizeSnapshot({ ...good, id: "   " }, 0, catalogs).id, "snapshot-1");
  });

  it("bounds the free-text fields", () => {
    const clean = sanitizeSnapshot(
      { ...good, capturedAt: "y".repeat(200), missionTitle: "z".repeat(500), code: "c".repeat(99) },
      0,
      catalogs
    );
    assert.equal(clean.capturedAt.length, 40);
    assert.equal(clean.missionTitle.length, 120);
    assert.equal(clean.code.length, 24);
    assert.equal(sanitizeSnapshot({ ...good, capturedAt: {} }, 0, catalogs).capturedAt, "");
  });
});

describe("sanitizeSnapshotList", () => {
  it("drops unusable rows and keeps the rest", () => {
    const list = sanitizeSnapshotList([good, null, "junk", { ...good, name: "" }, { ...good, name: "Second" }], catalogs);
    assert.equal(list.length, 2);
    assert.deepEqual(list.map((s) => s.name), ["Baseline", "Second"]);
  });

  it("returns nothing for a non-array payload", () => {
    for (const bad of [null, undefined, {}, "list", 7]) {
      assert.deepEqual(sanitizeSnapshotList(bad, catalogs), []);
    }
  });

  it("enforces the stored cap", () => {
    const many = Array.from({ length: MAX_SNAPSHOTS + 25 }, (_, i) => ({ ...good, name: `S${i}` }));
    assert.equal(sanitizeSnapshotList(many, catalogs).length, MAX_SNAPSHOTS);
  });

  it("neutralises a poisoned store end to end", () => {
    const poisoned = [{ id: "s", name: "Baseline", integrity: XSS, continuity: XSS }];
    const [clean] = sanitizeSnapshotList(poisoned, catalogs);
    const rendered = `<small>I ${clean.integrity}% · C ${clean.continuity}%</small>`;
    assert.ok(!rendered.includes("<img"), rendered);
    assert.equal(rendered, "<small>I 0% · C 0%</small>");
  });
});
