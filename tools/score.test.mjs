import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { controlWeights, horizonProfiles, lenses, missions } from "../src/data.js";
import {
  buildPacketCsv,
  buildPacketCsvRecords,
  coverage,
  csvEscape,
  integrityScore,
  serializeCsv
} from "../src/score.js";

const defaultState = {
  mission: "caremesh",
  lens: "board",
  horizon: 90,
  pressure: {
    agent: 52,
    supplier: 44,
    data: 61
  },
  controls: {
    approvals: true,
    recovery: true,
    attestation: false,
    privacy: true
  }
};

function argsFor(state = defaultState, missionKey = state.mission) {
  return [
    state,
    missions[missionKey],
    lenses[state.lens],
    horizonProfiles[state.horizon],
    controlWeights
  ];
}

describe("watergrid mission", () => {
  it("exists with six nodes and the civic water shape", () => {
    const water = missions.watergrid;
    assert.ok(water, "watergrid mission must exist");
    assert.equal(water.nodes.length, 6);
    assert.equal(water.timeline.length, 4);
    assert.equal(water.signals.length, 3);
    assert.equal(water.policies.length, 3);
    assert.equal(water.evidence.length, 4);
    assert.equal(water.future.length, 7);
    assert.equal(typeof water.code, "string");
    assert.equal(typeof water.baseIntegrity, "number");
    assert.match(water.brief.toLowerCase(), /potable|water|dose|operator/);
  });
});

describe("integrityScore", () => {
  it("is finite and in 0..100 for default-like state", () => {
    const score = integrityScore(...argsFor());
    assert.equal(Number.isFinite(score), true);
    assert.ok(score >= 0 && score <= 100, `expected 0..100, got ${score}`);
  });

  it("stays in 0..100 on watergrid", () => {
    const state = { ...defaultState, mission: "watergrid" };
    const score = integrityScore(...argsFor(state, "watergrid"));
    assert.equal(Number.isFinite(score), true);
    assert.ok(score >= 0 && score <= 100, `expected 0..100, got ${score}`);
  });
});

describe("coverage", () => {
  it("increases when more controls are true", () => {
    const none = {
      ...defaultState,
      controls: { approvals: false, recovery: false, attestation: false, privacy: false }
    };
    const some = {
      ...defaultState,
      controls: { approvals: true, recovery: false, attestation: false, privacy: false }
    };
    const more = {
      ...defaultState,
      controls: { approvals: true, recovery: true, attestation: false, privacy: false }
    };
    const all = {
      ...defaultState,
      controls: { approvals: true, recovery: true, attestation: true, privacy: true }
    };

    const noneScore = coverage(...argsFor(none));
    const someScore = coverage(...argsFor(some));
    const moreScore = coverage(...argsFor(more));
    const allScore = coverage(...argsFor(all));

    assert.equal(noneScore, 0);
    assert.equal(allScore, 100);
    assert.ok(noneScore < someScore, `${noneScore} !< ${someScore}`);
    assert.ok(someScore < moreScore, `${someScore} !< ${moreScore}`);
    assert.ok(moreScore < allScore, `${moreScore} !< ${allScore}`);
  });
});

describe("CSV helper", () => {
  it("escapes quotes, commas, and newlines", () => {
    assert.equal(csvEscape("plain"), "plain");
    assert.equal(csvEscape('say "hello", now'), '"say ""hello"", now"');
    assert.equal(serializeCsv([["section", "item"], ["policies", 'a, "b"']]), 'section,item\npolicies,"a, ""b"""\n');
  });

  it("emits policies, techniques, timeline, evidence in that order", () => {
    const records = buildPacketCsvRecords(...[integrityScore(...argsFor()), ...argsFor()]);
    assert.deepEqual(records[0], ["section", "item"]);

    const sections = records.slice(1).map((row) => row[0]);
    const unique = [...new Set(sections)];
    assert.deepEqual(unique, ["policies", "techniques", "timeline", "evidence"]);

    const csv = buildPacketCsv(...[integrityScore(...argsFor()), ...argsFor()]);
    assert.ok(csv.startsWith("section,item\n"));
    assert.equal(csv.endsWith("\n"), true);
    assert.doesNotMatch(csv, /localStorage|password|token|secret|integrityDigest/i);

    const waterState = { ...defaultState, mission: "watergrid" };
    const waterCsv = buildPacketCsv(
      integrityScore(...argsFor(waterState, "watergrid")),
      ...argsFor(waterState, "watergrid")
    );
    assert.match(waterCsv, /^section,item\n/);
    assert.match(waterCsv, /\npolicies,/);
    assert.match(waterCsv, /\ntechniques,/);
    assert.match(waterCsv, /\ntimeline,/);
    assert.match(waterCsv, /\nevidence,/);
  });
});
