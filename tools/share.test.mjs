import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { horizonProfiles, lenses, missions } from "../src/data.js";
import {
  CONTROL_ORDER,
  decodeScenario,
  encodeScenario,
  readScenarioFromUrl,
  scenarioTokenFromUrl,
  scenarioUrl,
  SCENARIO_VERSION
} from "../src/share.js";

const catalogs = { missions, lenses, horizons: horizonProfiles };

const sample = {
  mission: "caremesh",
  lens: "board",
  horizon: 90,
  pressure: { agent: 52, supplier: 44, data: 61 },
  controls: { approvals: true, recovery: true, attestation: false, privacy: true }
};

describe("encodeScenario", () => {
  it("produces a short readable token", () => {
    assert.equal(encodeScenario(sample), "1.caremesh.board.90.52-44-61.1101");
  });

  it("orders the control bitmask by CONTROL_ORDER", () => {
    const onlyAttestation = {
      ...sample,
      controls: { approvals: false, recovery: false, attestation: true, privacy: false }
    };
    const bits = encodeScenario(onlyAttestation).split(".")[5];
    assert.equal(bits[CONTROL_ORDER.indexOf("attestation")], "1");
    assert.equal(bits.replaceAll("0", ""), "1");
  });

  it("clamps and rounds pressures on the way out", () => {
    const messy = { ...sample, pressure: { agent: 140, supplier: -20, data: 61.6 } };
    assert.equal(encodeScenario(messy).split(".")[4], "100-0-62");
  });

  it("treats missing pressures and controls as zero and off", () => {
    assert.equal(encodeScenario({ mission: "port", lens: "soc", horizon: 30 }), "1.port.soc.30.0-0-0.0000");
  });
});

describe("round trip", () => {
  it("recovers the posture exactly", () => {
    const { scenario } = decodeScenario(encodeScenario(sample), catalogs);
    assert.deepEqual(scenario, sample);
  });

  it("round-trips every mission, lens and horizon in the catalog", () => {
    for (const mission of Object.keys(missions)) {
      for (const lens of Object.keys(lenses)) {
        for (const horizon of Object.keys(horizonProfiles)) {
          const posture = { ...sample, mission, lens, horizon: Number(horizon) };
          const { scenario } = decodeScenario(encodeScenario(posture), catalogs);
          assert.deepEqual(scenario, posture, `${mission}/${lens}/${horizon}`);
        }
      }
    }
  });

  it("round-trips every safeguard combination", () => {
    for (let mask = 0; mask < 1 << CONTROL_ORDER.length; mask += 1) {
      const controls = {};
      CONTROL_ORDER.forEach((key, index) => {
        controls[key] = Boolean(mask & (1 << (CONTROL_ORDER.length - 1 - index)));
      });
      const { scenario } = decodeScenario(encodeScenario({ ...sample, controls }), catalogs);
      assert.deepEqual(scenario.controls, controls, `mask ${mask}`);
    }
  });
});

describe("decodeScenario", () => {
  it("refuses an empty token", () => {
    assert.equal(decodeScenario("", catalogs).problem, "empty");
    assert.equal(decodeScenario("   ", catalogs).problem, "empty");
    assert.equal(decodeScenario(null, catalogs).problem, "empty");
  });

  it("refuses tokens with the wrong number of fields", () => {
    assert.equal(decodeScenario("1.caremesh.board.90.52-44-61", catalogs).problem, "malformed");
    assert.equal(decodeScenario("1.caremesh.board.90.52-44-61.1101.extra", catalogs).problem, "malformed");
  });

  it("refuses a future format version", () => {
    assert.equal(decodeScenario(`${SCENARIO_VERSION + 1}.caremesh.board.90.52-44-61.1101`, catalogs).problem, "version");
  });

  it("refuses catalog entries this build does not have", () => {
    assert.equal(decodeScenario("1.atlantis.board.90.52-44-61.1101", catalogs).problem, "mission");
    assert.equal(decodeScenario("1.caremesh.oracle.90.52-44-61.1101", catalogs).problem, "lens");
    assert.equal(decodeScenario("1.caremesh.board.365.52-44-61.1101", catalogs).problem, "horizon");
  });

  it("refuses out-of-range or non-numeric pressures rather than clamping them", () => {
    // A link claiming 900 is corrupted; reading it as 100 would show a posture
    // nobody configured.
    assert.equal(decodeScenario("1.caremesh.board.90.900-44-61.1101", catalogs).problem, "pressure");
    assert.equal(decodeScenario("1.caremesh.board.90.-5-44-61.1101", catalogs).problem, "pressure");
    assert.equal(decodeScenario("1.caremesh.board.90.aa-44-61.1101", catalogs).problem, "pressure");
    assert.equal(decodeScenario("1.caremesh.board.90.52-44.1101", catalogs).problem, "pressure");
  });

  it("refuses a malformed safeguard mask", () => {
    assert.equal(decodeScenario("1.caremesh.board.90.52-44-61.110", catalogs).problem, "controls");
    assert.equal(decodeScenario("1.caremesh.board.90.52-44-61.11012", catalogs).problem, "controls");
    assert.equal(decodeScenario("1.caremesh.board.90.52-44-61.abcd", catalogs).problem, "controls");
  });

  it("accepts the boundary pressures", () => {
    const { scenario } = decodeScenario("1.caremesh.board.90.0-100-50.1111", catalogs);
    assert.deepEqual(scenario.pressure, { agent: 0, supplier: 100, data: 50 });
  });

  it("carries a message with every problem", () => {
    for (const token of ["", "nope", "9.caremesh.board.90.52-44-61.1101", "1.atlantis.board.90.52-44-61.1101"]) {
      const result = decodeScenario(token, catalogs);
      assert.ok(result.message, `no message for ${JSON.stringify(token)}`);
      assert.equal(result.scenario, undefined);
    }
  });
});

describe("urls", () => {
  it("puts the token in the fragment, never the query", () => {
    const url = scenarioUrl(sample, "https://example.com/aegis/");
    assert.equal(url, "https://example.com/aegis/#s=1.caremesh.board.90.52-44-61.1101");
    assert.equal(new URL(url).search, "");
  });

  it("replaces an existing fragment rather than appending", () => {
    const url = scenarioUrl(sample, "https://example.com/#s=1.port.soc.30.1-2-3.0000");
    assert.equal(new URL(url).hash, "#s=1.caremesh.board.90.52-44-61.1101");
  });

  it("preserves an existing query string", () => {
    const url = scenarioUrl(sample, "https://example.com/?utm=x");
    assert.equal(new URL(url).search, "?utm=x");
  });

  it("reads a token back out of a url", () => {
    const url = scenarioUrl(sample, "https://example.com/");
    assert.equal(scenarioTokenFromUrl(url), "1.caremesh.board.90.52-44-61.1101");
  });

  it("returns null when there is no scenario in the url", () => {
    assert.equal(scenarioTokenFromUrl("https://example.com/"), null);
    assert.equal(scenarioTokenFromUrl("https://example.com/#other=1"), null);
    assert.equal(scenarioTokenFromUrl("not a url"), null);
    assert.equal(readScenarioFromUrl("https://example.com/", catalogs), null);
  });

  it("round-trips through a url", () => {
    const url = scenarioUrl(sample, "https://example.com/aegis/");
    assert.deepEqual(readScenarioFromUrl(url, catalogs).scenario, sample);
  });

  it("reports a problem for a corrupted token in a url", () => {
    assert.equal(readScenarioFromUrl("https://example.com/#s=broken", catalogs).problem, "malformed");
  });
});
