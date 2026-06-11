import { readFile } from "node:fs/promises";
import strictAssert from "node:assert/strict";

import { horizonProfiles, lenses, missions } from "../src/data.js";
import { normalizeProfile } from "../src/profile.js";

const requiredFiles = [
  "index.html",
  "src/app.js",
  "src/data.js",
  "src/profile.js",
  "src/styles.css",
  "assets/aegis-mark.svg",
  "README.md",
  "SECURITY.md"
];

async function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateProfileNormalization() {
  const currentState = {
    pressure: {
      agent: 52,
      supplier: 44,
      data: 61
    }
  };
  const catalogs = { missions, lenses, horizons: horizonProfiles };

  const safe = normalizeProfile(
    {
      mission: "caremesh",
      lens: "board",
      horizon: "90",
      pressure: {
        agent: "999",
        supplier: "not-a-number",
        data: "-12"
      },
      controls: {
        approvals: 1,
        recovery: 0,
        attestation: true,
        privacy: false
      }
    },
    currentState,
    catalogs
  );

  strictAssert.equal(safe.pressure.agent, 100);
  strictAssert.equal(safe.pressure.supplier, 44);
  strictAssert.equal(safe.pressure.data, 0);
  strictAssert.equal(safe.controls.approvals, true);
  strictAssert.equal(safe.controls.recovery, false);
  strictAssert.equal(normalizeProfile({ mission: "unknown" }, currentState, catalogs), null);
}

async function main() {
  const files = await Promise.all(requiredFiles.map((path) => readFile(path, "utf8").then((content) => [path, content])));
  const byPath = Object.fromEntries(files);

  await assert(byPath["index.html"].includes("src/app.js"), "index.html must load the app module");
  await assert(byPath["index.html"].includes("src/styles.css"), "index.html must load the stylesheet");
  await assert(!/https?:\/\//.test(byPath["index.html"]), "index.html should not depend on remote assets");

  const scenarioMatches = byPath["src/data.js"].match(/code: "/g) ?? [];
  await assert(scenarioMatches.length >= 6, "scenario catalog should include at least six scenarios");

  const unsafeTerms = ["reverse shell", "credential harvester", "exploit payload"];
  const scannedPaths = requiredFiles.filter((path) => path !== "tools/validate.mjs");
  const combined = scannedPaths.map((path) => byPath[path]).join("\n").toLowerCase();
  const unsafeHit = unsafeTerms.find((term) => combined.includes(term));
  await assert(!unsafeHit, `unsafe offensive term found: ${unsafeHit}`);
  validateProfileNormalization();

  console.log(`Validated ${requiredFiles.length} files and ${scenarioMatches.length} scenarios.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
