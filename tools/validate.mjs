import { readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "src/app.js",
  "src/data.js",
  "src/techniques.js",
  "src/styles.css",
  "assets/aegis-mark.svg",
  "README.md",
  "SECURITY.md",
  "package.json"
];

async function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const files = await Promise.all(requiredFiles.map((path) => readFile(path, "utf8").then((content) => [path, content])));
  const byPath = Object.fromEntries(files);

  await assert(byPath["index.html"].includes("src/app.js"), "index.html must load the app module");
  await assert(byPath["index.html"].includes("src/styles.css"), "index.html must load the stylesheet");
  await assert(!/https?:\/\//.test(byPath["index.html"]), "index.html should not depend on remote assets");

  // Named profiles + portfolio import/export controls
  await assert(byPath["index.html"].includes('id="profileNameInput"'), "profile name input required");
  await assert(byPath["index.html"].includes('id="saveAsProfileButton"'), "Save As profile button required");
  await assert(byPath["index.html"].includes('id="profileList"'), "saved profiles list required");
  await assert(byPath["index.html"].includes('id="exportPortfolioButton"'), "export portfolio button required");
  await assert(byPath["index.html"].includes('id="importPortfolioButton"'), "import portfolio button required");
  await assert(byPath["index.html"].includes('id="importPortfolioInput"'), "import portfolio file input required");

  // Snapshots + compare
  await assert(byPath["index.html"].includes('id="captureSnapshotButton"'), "snapshot capture button required");
  await assert(byPath["index.html"].includes('id="compareSnapshotsButton"'), "compare snapshots button required");
  await assert(byPath["index.html"].includes('id="compareModal"'), "compare modal required");
  await assert(byPath["index.html"].includes('id="snapshotList"'), "snapshot list required");

  // Print report
  await assert(byPath["index.html"].includes('id="printReportButton"'), "print report button required");
  await assert(byPath["index.html"].includes('id="printReport"'), "print report article required");
  await assert(byPath["index.html"].includes('id="printDigest"'), "print digest field required");

  // Techniques module
  await assert(byPath["src/techniques.js"].includes("techniqueCatalog"), "techniques.js must export techniqueCatalog");
  await assert(byPath["src/techniques.js"].includes("techniquesForPolicy"), "techniques.js must export techniquesForPolicy");
  await assert(byPath["src/techniques.js"].includes("Zero Trust"), "technique catalog should include Zero Trust");
  await assert(byPath["src/techniques.js"].includes("Human-in-the-loop"), "technique catalog should include Human-in-the-loop");
  await assert(byPath["src/app.js"].includes("from \"./techniques.js\""), "app.js must import techniques module");
  await assert(byPath["src/app.js"].includes("technique-chip"), "app.js must render technique chips");

  // Multi-profile storage + migration
  await assert(byPath["src/app.js"].includes("aegis-horizon-portfolio-v1"), "portfolio storage key required");
  await assert(byPath["src/app.js"].includes("aegis-horizon-twin-profile"), "legacy profile key migration required");
  await assert(byPath["src/app.js"].includes("exportPortfolio"), "exportPortfolio function required");
  await assert(byPath["src/app.js"].includes("importPortfolioFile"), "importPortfolioFile function required");
  await assert(byPath["src/app.js"].includes("captureSnapshot"), "captureSnapshot function required");
  await assert(byPath["src/app.js"].includes("preparePrintReport"), "preparePrintReport function required");

  // Print stylesheet
  await assert(byPath["src/styles.css"].includes("@media print"), "print stylesheet required");
  await assert(byPath["src/styles.css"].includes(".print-report"), "print-report styles required");
  await assert(byPath["src/styles.css"].includes(".technique-chip"), "technique chip styles required");
  await assert(byPath["src/styles.css"].includes("is-printing"), "is-printing body class styles required");

  // Package version
  const pkg = JSON.parse(byPath["package.json"]);
  await assert(pkg.version === "1.1.0", `package.json version should be 1.1.0 (got ${pkg.version})`);
  await assert(!pkg.dependencies || Object.keys(pkg.dependencies).length === 0, "no runtime npm dependencies allowed");

  // No remote network calls in app modules (blob/data/local only)
  const appSources = ["src/app.js", "src/data.js", "src/techniques.js"].map((p) => byPath[p]).join("\n");
  await assert(!/fetch\s*\(/.test(appSources), "app code must not use fetch");
  await assert(!/XMLHttpRequest/.test(appSources), "app code must not use XMLHttpRequest");
  await assert(!/WebSocket/.test(appSources), "app code must not use WebSocket");

  const scenarioMatches = byPath["src/data.js"].match(/code: "/g) ?? [];
  await assert(scenarioMatches.length >= 6, "scenario catalog should include at least six scenarios");

  const unsafeTerms = ["reverse shell", "credential harvester", "exploit payload"];
  const scannedPaths = requiredFiles.filter((path) => path !== "tools/validate.mjs");
  const combined = scannedPaths.map((path) => byPath[path]).join("\n").toLowerCase();
  const unsafeHit = unsafeTerms.find((term) => combined.includes(term));
  await assert(!unsafeHit, `unsafe offensive term found: ${unsafeHit}`);

  console.log(
    `Validated ${requiredFiles.length} files, ${scenarioMatches.length} scenarios, portfolio/print/techniques/snapshots features, v${pkg.version}.`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
