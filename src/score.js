/**
 * Pure scoring and packet helpers. No DOM. Numbers must match the 1.1 twin.
 *
 * Scoring functions take (state, mission, lens, horizon, controlWeights)
 * so Node tests can evaluate posture without the studio shell.
 */

import { techniqueCoverage, techniquesForPolicy } from "./techniques.js";

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function pressureScore(state, _mission, _lens, _horizon, _controlWeights) {
  return Math.round((state.pressure.agent + state.pressure.supplier + state.pressure.data) / 3);
}

export function coverage(state, _mission, _lens, _horizon, controlWeights) {
  const enabled = Object.entries(state.controls).reduce((total, [key, enabledFlag]) => {
    return total + (enabledFlag ? controlWeights[key] : 0);
  }, 0);
  const total = Object.values(controlWeights).reduce((sum, value) => sum + value, 0);
  return Math.round((enabled / total) * 100);
}

export function integrityScore(state, mission, lens, horizon, controlWeights) {
  const pressurePenalty =
    state.pressure.agent * 0.15 + state.pressure.supplier * 0.12 + state.pressure.data * 0.11;
  const safeguardLift = coverage(state, mission, lens, horizon, controlWeights) * 0.28;
  const recoveryLift = state.controls.recovery ? 4 : -4;
  const attestationLift = state.controls.attestation ? 4 : -3;
  return clamp(
    Math.round(
      mission.baseIntegrity +
        safeguardLift -
        pressurePenalty -
        horizon.drift +
        lens.integrityShift +
        recoveryLift +
        attestationLift
    ),
    12,
    98
  );
}

export function continuityScore(state, mission, lens, horizon, controlWeights) {
  const recoveryLift = state.controls.recovery ? 10 : -8;
  const privacyLift = state.controls.privacy ? 3 : -4;
  return clamp(
    Math.round(
      mission.continuity +
        coverage(state, mission, lens, horizon, controlWeights) * 0.16 -
        pressureScore(state, mission, lens, horizon, controlWeights) * 0.13 -
        horizon.drift +
        recoveryLift +
        privacyLift
    ),
    8,
    98
  );
}

export function decisionLoad(state, mission, lens, horizon, controlWeights) {
  const horizonLoad = state.horizon === 180 ? 10 : state.horizon === 30 ? -2 : 4;
  return clamp(
    Math.round(
      12 +
        pressureScore(state, mission, lens, horizon, controlWeights) * 0.34 +
        mission.nodes.length +
        lens.loadShift +
        horizonLoad -
        coverage(state, mission, lens, horizon, controlWeights) * 0.09
    ),
    4,
    72
  );
}

export function evidenceReady(state, _mission, _lens, _horizon, _controlWeights) {
  return Object.values(state.controls).filter(Boolean).length;
}

export function signalScore(state, mission, lens, horizon, controlWeights) {
  return clamp(
    mission.signal +
      Math.round((coverage(state, mission, lens, horizon, controlWeights) - 70) / 5) -
      Math.round((pressureScore(state, mission, lens, horizon, controlWeights) - 50) / 8),
    42,
    99
  );
}

export function recoveryWindow(state, mission, lens, horizon, controlWeights) {
  const lastStep = mission.timeline.at(-1)?.[0] ?? "30m";
  const baseline = Number.parseInt(lastStep, 10) || 30;
  const delay = Math.max(0, Math.round((decisionLoad(state, mission, lens, horizon, controlWeights) - 24) / 3));
  return clamp(baseline + delay - (state.controls.recovery ? 5 : 0), 12, 96);
}

export function decisionHeadline(score, _state, _mission, _lens, _horizon, _controlWeights) {
  if (score >= 82) return "Resilient by design";
  if (score >= 66) return "Continuity-first posture";
  if (score >= 48) return "Decision friction building";
  return "Policy debt is visible";
}

export function decisionSummary(score, _state, mission, lens, horizon, _controlWeights) {
  if (score >= 82) {
    return `${mission.crownJewel} has enough evidence for a high-confidence ${lens.caption.toLowerCase()}.`;
  }
  if (score >= 66) {
    return `${mission.crownJewel} is defensible, but the next rehearsal should reduce authority and supplier ambiguity.`;
  }
  if (score >= 48) {
    return `${mission.crownJewel} needs clearer approval paths before the ${horizon.label} horizon arrives.`;
  }
  return `${mission.crownJewel} should not absorb more autonomy until missing safeguards are restored.`;
}

/**
 * Lowest-weight twin node. Ties keep the first node in the array.
 * @returns {{ id: string, label: string, weight: number } | null}
 */
export function weakestNode(mission) {
  const nodes = mission?.nodes ?? [];
  if (!nodes.length) return null;

  let weakest = nodes[0];
  for (let i = 1; i < nodes.length; i += 1) {
    if (nodes[i].weight < weakest.weight) weakest = nodes[i];
  }

  return { id: weakest.id, label: weakest.label, weight: weakest.weight };
}

/**
 * Up to three defensive posture lines from the passed integrity score and current safeguards.
 * @returns {string[]}
 */
export function postureAdvice(score, state) {
  const advice = [];
  if (!state?.controls?.approvals) {
    advice.push("Restore named-owner approvals");
  }
  if (!state?.controls?.recovery) {
    advice.push("Stand up an offline recovery owner");
  }
  if (score < 55) {
    advice.push("Pause new autonomy until safeguards return");
  }
  return advice.slice(0, 3);
}

/**
 * Build policy rules with defensive technique tags.
 * @returns {Array<{ rule: string, techniques: string[], source: "generated"|"mission" }>}
 */
export function buildPolicyRows(score, state, mission, _lens, _horizon, _controlWeights) {
  const generated = [];

  if (!state.controls.approvals) {
    generated.push(`IF ${mission.crownJewel} changes THEN require named owner approval before action.`);
  }
  if (!state.controls.recovery) {
    generated.push("IF continuity confidence drops THEN activate an offline recovery owner before automation proceeds.");
  }
  if (!state.controls.attestation) {
    generated.push("IF a system writes to a crown-jewel path THEN attach signed evidence to the decision record.");
  }
  if (!state.controls.privacy) {
    generated.push("IF people or sensitive context appears THEN enforce a privacy boundary before publishing.");
  }
  if (state.pressure.agent > 64) {
    generated.push("IF agent authority rises above threshold THEN convert high-impact actions to draft-only mode.");
  }
  if (state.pressure.supplier > 64) {
    generated.push("IF supplier coupling rises THEN require provenance before system-to-system trust.");
  }
  if (score < 55) {
    generated.push("IF integrity is tense THEN pause new autonomy until safeguards are restored.");
  }

  const rows = [];

  generated.forEach((rule) => {
    rows.push({
      rule,
      techniques: techniquesForPolicy(rule, state.mission),
      source: "generated"
    });
  });

  mission.policies.forEach((rule, index) => {
    rows.push({
      rule,
      techniques: techniquesForPolicy(rule, state.mission, index),
      source: "mission"
    });
  });

  return rows.slice(0, 5);
}

export function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Serialize [section, item] records. Header is included by the caller.
 * @param {Array<[string, string]>} records
 */
export function serializeCsv(records) {
  return `${records.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
}

/**
 * Packet CSV rows in deterministic section order: policies, techniques, timeline, evidence.
 * No secrets, digests, profiles, or pressure internals.
 * @returns {Array<[string, string]>}
 */
export function buildPacketCsvRecords(score, state, mission, lens, horizon, controlWeights) {
  const rows = buildPolicyRows(score, state, mission, lens, horizon, controlWeights);
  const records = [["section", "item"]];

  rows.forEach((row) => {
    records.push(["policies", row.rule]);
  });

  techniqueCoverage(rows).forEach((technique) => {
    records.push(["techniques", technique.label]);
  });

  mission.timeline.forEach(([time, action]) => {
    records.push(["timeline", `${time} ${action}`]);
  });

  mission.evidence.forEach((item) => {
    records.push(["evidence", item]);
  });

  return records;
}

export function buildPacketCsv(score, state, mission, lens, horizon, controlWeights) {
  return serializeCsv(buildPacketCsvRecords(score, state, mission, lens, horizon, controlWeights));
}

const PRESSURE_KEYS = new Set(["agent", "supplier", "data"]);

function cloneTwinState(state) {
  return {
    ...state,
    pressure: { ...(state.pressure ?? {}) },
    controls: { ...(state.controls ?? {}) }
  };
}

/**
 * Sample integrity/continuity while sweeping one pressure axis from 0 to 100 inclusive.
 * Does not mutate the caller's state.
 * @returns {Array<{ pressure: number, integrity: number, continuity: number }>}
 */
export function pressureSweep(state, mission, lens, horizon, controlWeights, options = {}) {
  const key = PRESSURE_KEYS.has(options.key) ? options.key : "agent";
  const requested = Number(options.steps);
  const steps = Number.isFinite(requested) && requested >= 2 ? Math.round(requested) : 9;
  const cloned = cloneTwinState(state);
  const samples = [];

  for (let i = 0; i < steps; i += 1) {
    const pressure = (i / (steps - 1)) * 100;
    cloned.pressure[key] = pressure;
    samples.push({
      pressure,
      integrity: integrityScore(cloned, mission, lens, horizon, controlWeights),
      continuity: continuityScore(cloned, mission, lens, horizon, controlWeights)
    });
  }

  return samples;
}

/**
 * Score each safeguard flipped one at a time. Does not mutate the caller's state.
 * @returns {{
 *   currentIntegrity: number,
 *   currentContinuity: number,
 *   flips: Array<{ key: string, wouldBe: boolean, integrity: number, continuity: number, dIntegrity: number, dContinuity: number }>
 * }}
 */
export function controlDeltas(state, mission, lens, horizon, controlWeights) {
  const currentIntegrity = integrityScore(state, mission, lens, horizon, controlWeights);
  const currentContinuity = continuityScore(state, mission, lens, horizon, controlWeights);
  const flips = Object.keys(state.controls ?? {}).map((key) => {
    const cloned = cloneTwinState(state);
    const wouldBe = !cloned.controls[key];
    cloned.controls[key] = wouldBe;
    const integrity = integrityScore(cloned, mission, lens, horizon, controlWeights);
    const continuity = continuityScore(cloned, mission, lens, horizon, controlWeights);
    return {
      key,
      wouldBe,
      integrity,
      continuity,
      dIntegrity: integrity - currentIntegrity,
      dContinuity: continuity - currentContinuity
    };
  });

  return { currentIntegrity, currentContinuity, flips };
}

/**
 * Score two catalog missions with the same pressure and safeguards.
 * @returns {{ a: { id: string, integrity: number, continuity: number, coverage: number }, b: { id: string, integrity: number, continuity: number, coverage: number } }}
 */
export function compareMissions(state, missions, lens, horizon, controlWeights, idA, idB) {
  const side = (id) => {
    const entry = missions[id];
    return {
      id,
      integrity: integrityScore(state, entry, lens, horizon, controlWeights),
      continuity: continuityScore(state, entry, lens, horizon, controlWeights),
      coverage: coverage(state, entry, lens, horizon, controlWeights)
    };
  };

  return { a: side(idA), b: side(idB) };
}

/**
 * Small defensive packet as markdown. No secrets, profiles, or digests.
 */
export function packetMarkdown(score, state, mission, lens, horizon, controlWeights) {
  const continuity = continuityScore(state, mission, lens, horizon, controlWeights);
  const rows = buildPolicyRows(score, state, mission, lens, horizon, controlWeights);
  const policies = rows.map((row) => `- ${row.rule}`).join("\n");
  const timeline = mission.timeline.map(([time, action]) => `- ${time} ${action}`).join("\n");
  const evidence = mission.evidence.map((item) => `- ${item}`).join("\n");

  return [
    `# ${mission.title}`,
    "",
    `Crown jewel: ${mission.crownJewel}`,
    "",
    `Integrity: ${score}`,
    `Continuity: ${continuity}`,
    "",
    "## Policies",
    policies,
    "",
    "## Timeline",
    timeline,
    "",
    "## Evidence",
    evidence,
    ""
  ].join("\n");
}
