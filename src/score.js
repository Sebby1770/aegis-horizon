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
