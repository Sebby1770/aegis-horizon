import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { controlWeights, horizonProfiles, lenses, missions } from "../src/data.js";
import {
  bestFlip,
  boardBlurb,
  buildPacketCsv,
  buildPacketCsvRecords,
  compareMissions,
  continuityScore,
  controlDeltas,
  coverage,
  crownNeighbors,
  csvEscape,
  hottestNode,
  horizonDrop,
  horizonStrip,
  integrityScore,
  packetMarkdown,
  postureAdvice,
  pressureSweep,
  serializeCsv,
  weakestNode
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

describe("pressureSweep", () => {
  it("samples 0..100 inclusive with finite, monotonic-ish scores", () => {
    const agentBefore = defaultState.pressure.agent;
    const samples = pressureSweep(...argsFor(), { key: "agent", steps: 9 });

    assert.equal(samples.length, 9);
    assert.equal(samples[0].pressure, 0);
    assert.equal(samples.at(-1).pressure, 100);
    assert.equal(defaultState.pressure.agent, agentBefore);

    for (let i = 0; i < samples.length; i += 1) {
      const row = samples[i];
      assert.equal(Number.isFinite(row.pressure), true);
      assert.equal(Number.isFinite(row.integrity), true);
      assert.equal(Number.isFinite(row.continuity), true);
      if (i > 0) {
        assert.ok(row.pressure > samples[i - 1].pressure);
        assert.ok(row.integrity <= samples[i - 1].integrity);
        assert.ok(row.continuity <= samples[i - 1].continuity);
      }
    }
  });

  it("defaults to nine agent-pressure samples", () => {
    const samples = pressureSweep(...argsFor());
    assert.equal(samples.length, 9);
    assert.equal(samples[0].pressure, 0);
    assert.equal(samples.at(-1).pressure, 100);
  });
});

describe("compareMissions", () => {
  it("scores two known missions with the same pressure and controls", () => {
    const result = compareMissions(
      defaultState,
      missions,
      lenses[defaultState.lens],
      horizonProfiles[defaultState.horizon],
      controlWeights,
      "caremesh",
      "watergrid"
    );

    assert.equal(result.a.id, "caremesh");
    assert.equal(result.b.id, "watergrid");
    assert.equal(result.a.coverage, result.b.coverage);
    assert.equal(result.a.coverage, coverage(...argsFor()));
    assert.equal(result.a.integrity, integrityScore(...argsFor(defaultState, "caremesh")));
    assert.equal(result.b.integrity, integrityScore(...argsFor({ ...defaultState, mission: "watergrid" }, "watergrid")));
    assert.equal(result.a.continuity, continuityScore(...argsFor(defaultState, "caremesh")));
    assert.equal(result.b.continuity, continuityScore(...argsFor({ ...defaultState, mission: "watergrid" }, "watergrid")));
    assert.ok(result.a.integrity !== result.b.integrity);
  });
});

describe("controlDeltas", () => {
  it("returns finite flip deltas without mutating state", () => {
    const recoveryBefore = defaultState.controls.recovery;
    const result = controlDeltas(...argsFor());

    assert.equal(Number.isFinite(result.currentIntegrity), true);
    assert.equal(Number.isFinite(result.currentContinuity), true);
    assert.equal(result.currentIntegrity, integrityScore(...argsFor()));
    assert.equal(result.currentContinuity, continuityScore(...argsFor()));
    assert.ok(Array.isArray(result.flips));
    assert.equal(result.flips.length, Object.keys(defaultState.controls).length);

    for (const flip of result.flips) {
      assert.equal(typeof flip.key, "string");
      assert.equal(flip.wouldBe, !defaultState.controls[flip.key]);
      assert.equal(Number.isFinite(flip.integrity), true);
      assert.equal(Number.isFinite(flip.continuity), true);
      assert.equal(Number.isFinite(flip.dIntegrity), true);
      assert.equal(Number.isFinite(flip.dContinuity), true);
      assert.equal(flip.dIntegrity, flip.integrity - result.currentIntegrity);
      assert.equal(flip.dContinuity, flip.continuity - result.currentContinuity);
    }

    assert.equal(defaultState.controls.recovery, recoveryBefore);
  });
});

describe("weakestNode", () => {
  it("returns the lowest-weight watergrid node, first on ties", () => {
    const node = weakestNode(missions.watergrid);
    assert.equal(node.id, "offline-dose");
    assert.equal(node.label, "Offline Dose");
    assert.equal(node.weight, 0.51);

    const tied = {
      nodes: [
        { id: "first", label: "First", weight: 0.4 },
        { id: "second", label: "Second", weight: 0.4 }
      ]
    };
    assert.equal(weakestNode(tied).id, "first");
  });
});

describe("postureAdvice", () => {
  it("includes recovery guidance when recovery is false", () => {
    const state = {
      ...defaultState,
      controls: { ...defaultState.controls, recovery: false }
    };
    const advice = postureAdvice(70, state);
    assert.ok(advice.includes("Stand up an offline recovery owner"));
    assert.ok(advice.length <= 3);
  });

  it("uses the passed integrity score for the autonomy pause", () => {
    const allOn = {
      ...defaultState,
      controls: { approvals: true, recovery: true, attestation: true, privacy: true }
    };
    assert.ok(postureAdvice(54, allOn).includes("Pause new autonomy until safeguards return"));
    assert.equal(postureAdvice(55, allOn).includes("Pause new autonomy until safeguards return"), false);
    assert.ok(postureAdvice(80, { ...allOn, controls: { ...allOn.controls, approvals: false } }).includes("Restore named-owner approvals"));
  });
});

describe("horizonStrip", () => {
  it("scores 30/90/180 from horizonProfiles without mutating state", () => {
    const horizonBefore = defaultState.horizon;
    const rows = horizonStrip(defaultState, missions.caremesh, lenses.board, horizonProfiles, controlWeights);

    assert.equal(rows.length, 3);
    assert.deepEqual(
      rows.map((row) => row.days),
      [30, 90, 180]
    );
    assert.deepEqual(
      rows.map((row) => row.label),
      ["30d", "90d", "180d"]
    );

    for (const row of rows) {
      const horizon = horizonProfiles[row.days];
      assert.equal(Number.isFinite(row.integrity), true);
      assert.equal(Number.isFinite(row.continuity), true);
      assert.equal(row.integrity, integrityScore(defaultState, missions.caremesh, lenses.board, horizon, controlWeights));
      assert.equal(row.continuity, continuityScore(defaultState, missions.caremesh, lenses.board, horizon, controlWeights));
    }

    assert.ok(rows[0].integrity > rows[1].integrity);
    assert.ok(rows[1].integrity > rows[2].integrity);
    assert.equal(defaultState.horizon, horizonBefore);
  });

  it("skips missing horizon keys", () => {
    const partial = { 30: horizonProfiles[30], 180: horizonProfiles[180] };
    const rows = horizonStrip(defaultState, missions.caremesh, lenses.board, partial, controlWeights);
    assert.equal(rows.length, 2);
    assert.deepEqual(
      rows.map((row) => row.days),
      [30, 180]
    );
  });
});

describe("crownNeighbors", () => {
  it("returns undirected neighbors of the watergrid crown", () => {
    const result = crownNeighbors(missions.watergrid);
    assert.equal(result.crown.id, "quality-core");
    assert.equal(result.crown.label, "Quality Core");
    assert.deepEqual(
      result.neighbors.map((node) => node.id),
      ["dose-skid", "offline-dose", "ops-console"]
    );
    assert.deepEqual(
      result.neighbors.map((node) => node.label),
      ["Dose Skid", "Offline Dose", "Ops Console"]
    );
  });

  it("returns empty neighbors when there is no crown", () => {
    const result = crownNeighbors({
      nodes: [{ id: "only", label: "Only", type: "agent" }],
      links: [["only", "only", "loop"]]
    });
    assert.equal(result.crown, null);
    assert.deepEqual(result.neighbors, []);
  });
});

describe("boardBlurb", () => {
  it("names the crown jewel, score, and weakest node", () => {
    const weak = weakestNode(missions.watergrid);
    assert.equal(
      boardBlurb(71, missions.watergrid, weak),
      "Potable water authority at integrity 71; watch Offline Dose."
    );
  });

  it("omits the watch clause when weakest is missing", () => {
    assert.equal(boardBlurb(80, missions.caremesh, null), "Patient continuity ledger at integrity 80.");
  });
});

describe("hottestNode", () => {
  it("returns the highest-weight watergrid node, first on ties", () => {
    const node = hottestNode(missions.watergrid);
    assert.equal(node.id, "quality-core");
    assert.equal(node.label, "Quality Core");
    assert.equal(node.weight, 0.88);

    const tied = {
      nodes: [
        { id: "first", label: "First", weight: 0.9 },
        { id: "second", label: "Second", weight: 0.9 }
      ]
    };
    assert.equal(hottestNode(tied).id, "first");
    assert.equal(hottestNode({ nodes: [] }), null);
  });
});

describe("horizonDrop", () => {
  it("is 30d integrity minus 180d integrity", () => {
    const drop = horizonDrop(defaultState, missions.caremesh, lenses.board, horizonProfiles, controlWeights);
    const at30 = integrityScore(defaultState, missions.caremesh, lenses.board, horizonProfiles[30], controlWeights);
    const at180 = integrityScore(defaultState, missions.caremesh, lenses.board, horizonProfiles[180], controlWeights);
    assert.equal(drop.at30, at30);
    assert.equal(drop.at180, at180);
    assert.equal(drop.drop, at30 - at180);
    assert.ok(drop.drop > 0);
  });

  it("returns null when 30 or 180 is missing", () => {
    assert.equal(
      horizonDrop(defaultState, missions.caremesh, lenses.board, { 90: horizonProfiles[90] }, controlWeights),
      null
    );
  });
});

describe("bestFlip", () => {
  it("is the controlDeltas flip with the largest dIntegrity", () => {
    const deltas = controlDeltas(...argsFor());
    const best = bestFlip(...argsFor());
    const maxDelta = Math.max(...deltas.flips.map((row) => row.dIntegrity));
    assert.equal(best.dIntegrity, maxDelta);
    assert.equal(best.key, deltas.flips.find((row) => row.dIntegrity === maxDelta).key);
    assert.equal(bestFlip({ ...defaultState, controls: {} }, ...argsFor().slice(1)), null);
  });
});

describe("packetMarkdown", () => {
  it("includes the crown jewel and packet sections without secrets", () => {
    const score = integrityScore(...argsFor());
    const markdown = packetMarkdown(score, ...argsFor());

    assert.match(markdown, /^# /);
    assert.match(markdown, /Patient continuity ledger/);
    assert.match(markdown, /## Policies/);
    assert.match(markdown, /## Timeline/);
    assert.match(markdown, /## Evidence/);
    assert.match(markdown, new RegExp(`Integrity: ${score}`));
    assert.doesNotMatch(markdown, /localStorage|password|token|secret|integrityDigest/i);

    const waterState = { ...defaultState, mission: "watergrid" };
    const waterMarkdown = packetMarkdown(
      integrityScore(...argsFor(waterState, "watergrid")),
      ...argsFor(waterState, "watergrid")
    );
    assert.match(waterMarkdown, /Potable water authority/);
  });
});
