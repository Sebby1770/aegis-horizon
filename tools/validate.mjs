import { readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "src/app.js",
  "src/data.js",
  "src/score.js",
  "src/techniques.js",
  "src/styles.css",
  "assets/aegis-mark.svg",
  "README.md",
  "CHANGELOG.md",
  "SECURITY.md",
  "package.json",
  ".nojekyll"
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

  // Rehearsal stepper + CSV
  await assert(byPath["index.html"].includes('id="rehearseButton"'), "rehearse button required");
  await assert(byPath["index.html"].includes('id="nextBeatButton"'), "next beat button required");
  await assert(byPath["index.html"].includes('id="resetRehearsalButton"'), "reset rehearsal button required");
  await assert(byPath["index.html"].includes('id="csvExportButton"'), "CSV export button required");
  await assert(byPath["src/app.js"].includes("rehearsalStep"), "app.js must track rehearsalStep");
  await assert(byPath["src/app.js"].includes("nextRehearsalBeat"), "app.js must advance rehearsal beats");
  await assert(byPath["src/app.js"].includes("exportPacketCsv"), "app.js must export CSV packets");
  await assert(byPath["src/app.js"].includes('event.key === "]"'), "app.js must bind ] for next beat");
  await assert(byPath["src/app.js"].includes('event.key === "["'), "app.js must bind [ for previous beat");

  // Scoring module
  await assert(byPath["src/app.js"].includes('from "./score.js"'), "app.js must import score module");
  await assert(byPath["src/score.js"].includes("export function clamp"), "score.js must export clamp");
  await assert(byPath["src/score.js"].includes("export function pressureScore"), "score.js must export pressureScore");
  await assert(byPath["src/score.js"].includes("export function coverage"), "score.js must export coverage");
  await assert(byPath["src/score.js"].includes("export function integrityScore"), "score.js must export integrityScore");
  await assert(byPath["src/score.js"].includes("export function continuityScore"), "score.js must export continuityScore");
  await assert(byPath["src/score.js"].includes("export function decisionLoad"), "score.js must export decisionLoad");
  await assert(byPath["src/score.js"].includes("export function evidenceReady"), "score.js must export evidenceReady");
  await assert(byPath["src/score.js"].includes("export function signalScore"), "score.js must export signalScore");
  await assert(byPath["src/score.js"].includes("export function recoveryWindow"), "score.js must export recoveryWindow");
  await assert(byPath["src/score.js"].includes("export function decisionHeadline"), "score.js must export decisionHeadline");
  await assert(byPath["src/score.js"].includes("export function decisionSummary"), "score.js must export decisionSummary");
  await assert(byPath["src/score.js"].includes("export function buildPolicyRows"), "score.js must export buildPolicyRows");
  await assert(byPath["src/score.js"].includes("export function buildPacketCsv"), "score.js must export buildPacketCsv");
  await assert(!/\bdocument\b/.test(byPath["src/score.js"]), "score.js must not use the DOM");
  await assert(!/\bwindow\b/.test(byPath["src/score.js"]), "score.js must not use window");

  // Techniques module
  await assert(byPath["src/techniques.js"].includes("techniqueCatalog"), "techniques.js must export techniqueCatalog");
  await assert(byPath["src/techniques.js"].includes("techniquesForPolicy"), "techniques.js must export techniquesForPolicy");
  await assert(byPath["src/techniques.js"].includes("Zero Trust"), "technique catalog should include Zero Trust");
  await assert(byPath["src/techniques.js"].includes("Human-in-the-loop"), "technique catalog should include Human-in-the-loop");
  await assert(byPath["src/app.js"].includes("from \"./techniques.js\""), "app.js must import techniques module");
  await assert(byPath["src/app.js"].includes("technique-chip"), "app.js must render technique chips");
  await assert(byPath["src/techniques.js"].includes("watergrid:"), "technique mapping must include watergrid");

  // Multi-profile storage + migration
  await assert(byPath["src/app.js"].includes("aegis-horizon-portfolio-v1"), "portfolio storage key required");
  await assert(byPath["src/app.js"].includes("aegis-horizon-twin-profile"), "legacy profile key migration required");
  await assert(byPath["src/app.js"].includes("exportPortfolio"), "exportPortfolio function required");
  await assert(byPath["src/app.js"].includes("importPortfolioFile"), "importPortfolioFile function required");
  await assert(byPath["src/app.js"].includes("captureSnapshot"), "captureSnapshot function required");
  await assert(byPath["src/app.js"].includes("preparePrintReport"), "preparePrintReport function required");

  // Print stylesheet + rehearsal highlight
  await assert(byPath["src/styles.css"].includes("@media print"), "print stylesheet required");
  await assert(byPath["src/styles.css"].includes(".print-report"), "print-report styles required");
  await assert(byPath["src/styles.css"].includes(".technique-chip"), "technique chip styles required");
  await assert(byPath["src/styles.css"].includes("is-printing"), "is-printing body class styles required");
  await assert(byPath["src/styles.css"].includes(".timeline-list li.is-active"), "active timeline beat styles required");

  // Package version
  const pkg = JSON.parse(byPath["package.json"]);
  await assert(pkg.version === "1.2.0", `package.json version should be 1.2.0 (got ${pkg.version})`);
  await assert(!pkg.dependencies || Object.keys(pkg.dependencies).length === 0, "no runtime npm dependencies allowed");
  await assert(byPath["CHANGELOG.md"].includes("[1.2.0]"), "CHANGELOG must include 1.2.0");
  await assert(byPath["README.md"].includes("https://sebby1770.github.io/aegis-horizon/"), "README must document Pages URL");

  // No remote network calls in app modules (blob/data/local only)
  const appSources = ["src/app.js", "src/data.js", "src/score.js", "src/techniques.js"].map((p) => byPath[p]).join("\n");
  await assert(!/fetch\s*\(/.test(appSources), "app code must not use fetch");
  await assert(!/XMLHttpRequest/.test(appSources), "app code must not use XMLHttpRequest");
  await assert(!/WebSocket/.test(appSources), "app code must not use WebSocket");

  const scenarioMatches = byPath["src/data.js"].match(/code: "/g) ?? [];
  await assert(scenarioMatches.length >= 7, "scenario catalog should include at least seven scenarios");
  await assert(byPath["src/data.js"].includes("watergrid:"), "data.js must include watergrid mission");
  await assert((byPath["src/data.js"].match(/id: "source-intake"|id: "plant-agent"|id: "dose-skid"|id: "quality-core"|id: "offline-dose"|id: "ops-console"/g) ?? []).length >= 6, "watergrid should define six nodes");

  const unsafeTerms = ["reverse shell", "credential harvester", "exploit payload"];
  const scannedPaths = requiredFiles.filter((path) => path !== "tools/validate.mjs");
  const combined = scannedPaths.map((path) => byPath[path]).join("\n").toLowerCase();
  const unsafeHit = unsafeTerms.find((term) => combined.includes(term));
  await assert(!unsafeHit, `unsafe offensive term found: ${unsafeHit}`);

  console.log(
    `Validated ${requiredFiles.length} files, ${scenarioMatches.length} scenarios, score/rehearsal/csv/watergrid features, v${pkg.version}.`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
