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
  await assert(byPath["src/app.js"].includes("exportPacketMarkdown"), "app.js must export markdown packets");
  await assert(byPath["src/app.js"].includes('event.key === "]"'), "app.js must bind ] for next beat");
  await assert(byPath["src/app.js"].includes('event.key === "["'), "app.js must bind [ for previous beat");
  await assert(byPath["src/app.js"].includes('event.key === "?"'), "app.js must bind ? for help");
  await assert(byPath["src/app.js"].includes('event.key === "r"'), "app.js must bind R for rehearsal");
  await assert(byPath["src/app.js"].includes('event.key === "n"'), "app.js must bind N for next beat");
  await assert(byPath["src/app.js"].includes('event.key === "0"'), "app.js must bind 0 for reset rehearsal");

  // Sweep / mission compare / markdown / heatmap / help
  await assert(byPath["index.html"].includes('id="sweepButton"'), "sweep button required");
  await assert(byPath["index.html"].includes('id="sweepModal"'), "sweep modal required");
  await assert(byPath["index.html"].includes('id="sweepTable"'), "sweep table required");
  await assert(byPath["index.html"].includes('id="gapsButton"'), "gapsButton exists");
  await assert(byPath["index.html"].includes('id="gapsModal"'), "gaps modal required");
  await assert(byPath["index.html"].includes('id="gapsTable"'), "gaps table required");
  await assert(byPath["index.html"].includes('id="adviceList"'), "advice list required");
  await assert(byPath["index.html"].includes('id="compareMissionsButton"'), "compare missions button required");
  await assert(byPath["index.html"].includes('id="missionCompareModal"'), "mission compare modal required");
  await assert(byPath["index.html"].includes('id="missionCompareSelectA"'), "mission compare select A required");
  await assert(byPath["index.html"].includes('id="missionCompareSelectB"'), "mission compare select B required");
  await assert(byPath["index.html"].includes('id="markdownExportButton"'), "markdown export button required");
  await assert(byPath["index.html"].includes('id="heatToggle"'), "heat toggle required");
  await assert(byPath["index.html"].includes('id="helpOverlay"'), "help overlay required");
  await assert(byPath["index.html"].includes('id="helpButton"'), "help button required");
  await assert(byPath["src/app.js"].includes("state.heat"), "app.js must track heat flag");
  await assert(byPath["src/app.js"].includes("pressureSweep"), "app.js must call pressureSweep");
  await assert(byPath["src/app.js"].includes("packetMarkdown"), "app.js must call packetMarkdown");
  await assert(byPath["src/app.js"].includes("nodeHeatColor"), "app.js must color nodes for heatmap");
  await assert(byPath["src/app.js"].includes("controlDeltas"), "app.js must call controlDeltas");
  await assert(byPath["src/app.js"].includes("weakestNode"), "app.js must call weakestNode");
  await assert(byPath["src/app.js"].includes("postureAdvice"), "app.js must call postureAdvice");
  await assert(byPath["src/app.js"].includes("horizonStrip"), "app.js must call horizonStrip");
  await assert(byPath["src/app.js"].includes("crownNeighbors"), "app.js must call crownNeighbors");
  await assert(byPath["src/app.js"].includes("boardBlurb"), "app.js must call boardBlurb");
  await assert(byPath["src/app.js"].includes("hottestNode"), "app.js must call hottestNode");
  await assert(byPath["src/app.js"].includes("horizonDrop"), "app.js must call horizonDrop");
  await assert(byPath["src/app.js"].includes("bestFlip"), "app.js must call bestFlip");
  await assert(byPath["src/app.js"].includes("worstFlip"), "app.js must call worstFlip");
  await assert(byPath["src/app.js"].includes("continuityDrop"), "app.js must call continuityDrop");
  await assert(byPath["src/app.js"].includes("dominantPressure"), "app.js must call dominantPressure");
  await assert(byPath["src/app.js"].includes("isolatedNodes"), "app.js must call isolatedNodes");
  await assert(byPath["src/app.js"].includes("openGapsModal"), "app.js must open the Gaps panel");
  await assert(byPath["index.html"].includes('id="horizonStrip"'), "horizon strip required");
  await assert(byPath["index.html"].includes('id="boardBlurb"'), "board blurb required");
  await assert(byPath["index.html"].includes('id="horizonDrop"'), "horizon drop required");
  await assert(byPath["index.html"].includes('id="continuityDrop"'), "continuity drop required");
  await assert(byPath["index.html"].includes('id="dominantPressure"'), "dominant pressure required");

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
  await assert(byPath["src/score.js"].includes("export function pressureSweep"), "score.js must export pressureSweep");
  await assert(byPath["src/score.js"].includes("export function compareMissions"), "score.js must export compareMissions");
  await assert(byPath["src/score.js"].includes("export function packetMarkdown"), "score.js must export packetMarkdown");
  await assert(byPath["src/score.js"].includes("export function controlDeltas"), "score.js must export controlDeltas");
  await assert(byPath["src/score.js"].includes("export function weakestNode"), "score.js must export weakestNode");
  await assert(byPath["src/score.js"].includes("export function postureAdvice"), "score.js must export postureAdvice");
  await assert(byPath["src/score.js"].includes("export function horizonStrip"), "score.js must export horizonStrip");
  await assert(byPath["src/score.js"].includes("export function crownNeighbors"), "score.js must export crownNeighbors");
  await assert(byPath["src/score.js"].includes("export function boardBlurb"), "score.js must export boardBlurb");
  await assert(byPath["src/score.js"].includes("export function hottestNode"), "score.js must export hottestNode");
  await assert(byPath["src/score.js"].includes("export function horizonDrop"), "score.js must export horizonDrop");
  await assert(byPath["src/score.js"].includes("export function bestFlip"), "score.js must export bestFlip");
  await assert(byPath["src/score.js"].includes("export function worstFlip"), "score.js must export worstFlip");
  await assert(byPath["src/score.js"].includes("export function continuityDrop"), "score.js must export continuityDrop");
  await assert(byPath["src/score.js"].includes("export function dominantPressure"), "score.js must export dominantPressure");
  await assert(byPath["src/score.js"].includes("export function isolatedNodes"), "score.js must export isolatedNodes");
  await assert(byPath["src/score.js"].includes("export function nodeDegrees"), "score.js must export nodeDegrees");
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
  await assert(byPath["src/styles.css"].includes(".help-keys"), "help overlay key styles required");
  await assert(byPath["src/styles.css"].includes(".icon-button.is-active"), "active toolbar button styles required");
  await assert(byPath["src/styles.css"].includes(".advice-list"), "advice list styles required");
  await assert(byPath["src/styles.css"].includes(".horizon-strip"), "horizon strip styles required");
  await assert(byPath["src/styles.css"].includes(".board-blurb"), "board blurb styles required");
  await assert(byPath["src/styles.css"].includes(".horizon-drop"), "horizon drop styles required");
  await assert(byPath["src/styles.css"].includes("is-best-flip"), "best-flip row styles required");
  await assert(byPath["src/styles.css"].includes("is-worst-flip"), "worst-flip row styles required");

  // Package version
  const pkg = JSON.parse(byPath["package.json"]);
  await assert(pkg.version === "1.7.0", `package.json version should be 1.7.0 (got ${pkg.version})`);
  await assert(!pkg.dependencies || Object.keys(pkg.dependencies).length === 0, "no runtime npm dependencies allowed");
  await assert(byPath["CHANGELOG.md"].includes("[1.7.0]"), "CHANGELOG must include 1.7.0");
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
    `Validated ${requiredFiles.length} files, ${scenarioMatches.length} scenarios, score/rehearsal/csv/sweep/gaps/compare/markdown/heat/help/horizon/blurb features, v${pkg.version}.`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
