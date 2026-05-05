import { readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "src/app.js",
  "src/data.js",
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

  console.log(`Validated ${requiredFiles.length} files and ${scenarioMatches.length} scenarios.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
