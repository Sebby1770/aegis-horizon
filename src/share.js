/**
 * Shareable scenario links.
 *
 * A rehearsal posture — mission, decision lens, horizon, pressures and which
 * safeguards are on — could be saved locally or exported as a file, but there
 * was no way to hand it to a colleague. This encodes the whole posture into a
 * short, readable token that travels in a URL.
 *
 * The token lives in the fragment (`#s=…`), which browsers never send to a
 * server. A resilience posture describes where an organisation believes it is
 * weak, so it should not end up in an access log on the way to being read.
 */

export const SCENARIO_VERSION = 1;
export const SCENARIO_PARAM = "s";

/** Order is part of the format: changing it changes the meaning of a token. */
export const CONTROL_ORDER = ["approvals", "recovery", "attestation", "privacy"];
const PRESSURE_ORDER = ["agent", "supplier", "data"];

export const SCENARIO_PROBLEMS = {
  empty: "No scenario in this link",
  malformed: "That link is not a scenario token",
  version: "That link was made by a newer version of Aegis Horizon",
  mission: "That link names a mission this build does not have",
  lens: "That link names a decision lens this build does not have",
  horizon: "That link names a horizon this build does not have",
  pressure: "That link has an out-of-range pressure value",
  controls: "That link has a malformed safeguard set"
};

function clampPressure(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, Math.round(number)));
}

/**
 * Encodes a posture as `version.mission.lens.horizon.a-s-d.bitmask`.
 *
 * Kept readable on purpose: a scenario token in a chat message or a ticket can
 * be eyeballed, and a corrupted one can be diagnosed without a decoder.
 */
export function encodeScenario(state) {
  const pressures = PRESSURE_ORDER.map((key) => clampPressure(state.pressure?.[key]) ?? 0).join("-");
  const controls = CONTROL_ORDER.map((key) => (state.controls?.[key] ? "1" : "0")).join("");
  return [SCENARIO_VERSION, state.mission, state.lens, state.horizon, pressures, controls].join(".");
}

/**
 * Decodes a token against the catalogs this build actually has.
 * Returns `{ scenario }` or `{ problem, message }` — never a partial posture.
 */
export function decodeScenario(token, catalogs) {
  if (typeof token !== "string" || token.trim() === "") {
    return { problem: "empty", message: SCENARIO_PROBLEMS.empty };
  }

  const parts = token.trim().split(".");
  if (parts.length !== 6) {
    return { problem: "malformed", message: SCENARIO_PROBLEMS.malformed };
  }

  const [rawVersion, mission, lens, rawHorizon, rawPressure, rawControls] = parts;
  if (Number(rawVersion) !== SCENARIO_VERSION) {
    return { problem: "version", message: SCENARIO_PROBLEMS.version };
  }

  if (!Object.prototype.hasOwnProperty.call(catalogs.missions, mission)) {
    return { problem: "mission", message: SCENARIO_PROBLEMS.mission };
  }
  if (!Object.prototype.hasOwnProperty.call(catalogs.lenses, lens)) {
    return { problem: "lens", message: SCENARIO_PROBLEMS.lens };
  }
  if (!Object.prototype.hasOwnProperty.call(catalogs.horizons, String(rawHorizon))) {
    return { problem: "horizon", message: SCENARIO_PROBLEMS.horizon };
  }

  const pressureParts = rawPressure.split("-");
  if (pressureParts.length !== PRESSURE_ORDER.length) {
    return { problem: "pressure", message: SCENARIO_PROBLEMS.pressure };
  }

  const pressure = {};
  for (const [index, key] of PRESSURE_ORDER.entries()) {
    // Reject rather than clamp: a link claiming 900 is a corrupted link, and
    // silently reading it as 100 would show a posture nobody configured.
    if (!/^\d{1,3}$/.test(pressureParts[index])) {
      return { problem: "pressure", message: SCENARIO_PROBLEMS.pressure };
    }
    const value = Number(pressureParts[index]);
    if (value > 100) {
      return { problem: "pressure", message: SCENARIO_PROBLEMS.pressure };
    }
    pressure[key] = value;
  }

  if (!new RegExp(`^[01]{${CONTROL_ORDER.length}}$`).test(rawControls)) {
    return { problem: "controls", message: SCENARIO_PROBLEMS.controls };
  }

  const controls = {};
  CONTROL_ORDER.forEach((key, index) => {
    controls[key] = rawControls[index] === "1";
  });

  return {
    scenario: { mission, lens, horizon: Number(rawHorizon), pressure, controls }
  };
}

/** Builds a shareable URL for a posture, dropping any existing fragment. */
export function scenarioUrl(state, href) {
  const url = new URL(href);
  url.hash = `${SCENARIO_PARAM}=${encodeScenario(state)}`;
  return url.toString();
}

/** Pulls a scenario token out of a URL fragment, or null if there is none. */
export function scenarioTokenFromUrl(href) {
  let hash;
  try {
    hash = new URL(href).hash;
  } catch {
    return null;
  }
  if (!hash) return null;

  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get(SCENARIO_PARAM);
}

/** Convenience: token out of a URL, straight to a validated scenario. */
export function readScenarioFromUrl(href, catalogs) {
  const token = scenarioTokenFromUrl(href);
  if (token === null) return null;
  return decodeScenario(token, catalogs);
}
