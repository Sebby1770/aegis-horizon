import { controlWeights, horizonProfiles, lenses, missions } from "./data.js";
import { readScenarioFromUrl, scenarioUrl } from "./share.js";
import { sanitizeSnapshotList } from "./sanitize.js";
import { focusableWithin, nextFocusTarget } from "./focus.js";
import {
  techniqueCatalog,
  techniqueCoverage
} from "./techniques.js";
import {
  canonicalJsonBytes,
  ensureDeviceKeys,
  exportPublicJwk,
  PACKET_ALG,
  signPacket,
  webCryptoAvailable
} from "./sign.js";
import {
  buildPacketCsv,
  buildPolicyRows as scorePolicyRows,
  clamp,
  compareMissions as scoreCompareMissions,
  continuityScore as scoreContinuity,
  controlDeltas,
  coverage as scoreCoverage,
  CSF_KEYS,
  CSF_LABELS,
  csfFunctions,
  decisionHeadline as scoreHeadline,
  decisionLoad as scoreDecisionLoad,
  decisionSummary as scoreSummary,
  evidenceReady as scoreEvidenceReady,
  integrityScore as scoreIntegrity,
  packetMarkdown,
  playbookBeats,
  resilienceIndex as scoreResilienceIndex,
  bestFlip,
  boardBlurb,
  continuityDrop,
  crownNeighbors,
  dominantPressure,
  hottestNode,
  horizonDrop,
  horizonStrip,
  isolatedNodes,
  postureAdvice,
  worstFlip,
  pressureScore as scorePressure,
  pressureSweep,
  recoveryWindow as scoreRecoveryWindow,
  signalScore as scoreSignal,
  watchItems,
  weakestNode
} from "./score.js";

/** Legacy single-profile key (migrated on first load). */
const legacyProfileKey = "aegis-horizon-twin-profile";
/** Named multi-profile portfolio. */
const portfolioStorageKey = "aegis-horizon-portfolio-v1";
/** Comparison snapshots store. */
const snapshotsStorageKey = "aegis-horizon-snapshots-v1";

const DEFAULT_PROFILE_NAME = "Default";

const state = {
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
  },
  activeProfileName: DEFAULT_PROFILE_NAME,
  pulse: 0,
  frameTime: 0,
  lastPacketDigest: null,
  rehearsalStep: 0,
  heat: false,
  missionQuery: "",
  packetSigned: false
};

/** In-memory portfolio: { [name]: profilePayload } */
let portfolio = {};

/** In-memory snapshots: Array<{ id, name, capturedAt, ...metrics }> */
let snapshots = [];

const els = {
  missionButtons: document.querySelector("#missionButtons"),
  missionSearch: document.querySelector("#missionSearch"),
  signStatus: document.querySelector("#signStatus"),
  utcClock: document.querySelector("#utcClock"),
  watchList: document.querySelector("#watchList"),
  missionCode: document.querySelector("#missionCode"),
  missionTitle: document.querySelector("#missionTitle"),
  missionBrief: document.querySelector("#missionBrief"),
  sectorLabel: document.querySelector("#sectorLabel"),
  lensLabel: document.querySelector("#lensLabel"),
  horizonLabel: document.querySelector("#horizonLabel"),
  pressureValue: document.querySelector("#pressureValue"),
  coverageScore: document.querySelector("#coverageScore"),
  integrityStatus: document.querySelector("#integrityStatus"),
  decisionStatus: document.querySelector("#decisionStatus"),
  continuityStatus: document.querySelector("#continuityStatus"),
  evidenceStatus: document.querySelector("#evidenceStatus"),
  twinCanvas: document.querySelector("#twinCanvas"),
  continuityCanvas: document.querySelector("#continuityCanvas"),
  crownLabel: document.querySelector("#crownLabel"),
  promiseLabel: document.querySelector("#promiseLabel"),
  mapTelemetry: document.querySelector("#mapTelemetry"),
  integrityRing: document.querySelector("#integrityRing"),
  integrityScore: document.querySelector("#integrityScore"),
  decisionHeadline: document.querySelector("#decisionHeadline"),
  decisionSummary: document.querySelector("#decisionSummary"),
  adviceList: document.querySelector("#adviceList"),
  boardBlurb: document.querySelector("#boardBlurb"),
  horizonStrip: document.querySelector("#horizonStrip"),
  horizonDrop: document.querySelector("#horizonDrop"),
  continuityDrop: document.querySelector("#continuityDrop"),
  dominantPressure: document.querySelector("#dominantPressure"),
  horizonCaption: document.querySelector("#horizonCaption"),
  decisionLoad: document.querySelector("#decisionLoad"),
  safeguardMetric: document.querySelector("#safeguardMetric"),
  recoveryWindow: document.querySelector("#recoveryWindow"),
  resilienceMetric: document.querySelector("#resilienceMetric"),
  csfPanel: document.querySelector("#csfPanel"),
  playbookList: document.querySelector("#playbookList"),
  playbookState: document.querySelector("#playbookState"),
  timelineClock: document.querySelector("#timelineClock"),
  timelineList: document.querySelector("#timelineList"),
  policyState: document.querySelector("#policyState"),
  policyList: document.querySelector("#policyList"),
  signalScore: document.querySelector("#signalScore"),
  signalList: document.querySelector("#signalList"),
  evidenceCount: document.querySelector("#evidenceCount"),
  evidenceList: document.querySelector("#evidenceList"),
  profileState: document.querySelector("#profileState"),
  profileNameInput: document.querySelector("#profileNameInput"),
  profileList: document.querySelector("#profileList"),
  agentRange: document.querySelector("#agentRange"),
  supplierRange: document.querySelector("#supplierRange"),
  dataRange: document.querySelector("#dataRange"),
  rehearseButton: document.querySelector("#rehearseButton"),
  nextBeatButton: document.querySelector("#nextBeatButton"),
  resetRehearsalButton: document.querySelector("#resetRehearsalButton"),
  exportButton: document.querySelector("#exportButton"),
  signPacketButton: document.querySelector("#signPacketButton"),
  csvExportButton: document.querySelector("#csvExportButton"),
  markdownExportButton: document.querySelector("#markdownExportButton"),
  printReportButton: document.querySelector("#printReportButton"),
  sweepButton: document.querySelector("#sweepButton"),
  gapsButton: document.querySelector("#gapsButton"),
  compareMissionsButton: document.querySelector("#compareMissionsButton"),
  heatToggle: document.querySelector("#heatToggle"),
  helpButton: document.querySelector("#helpButton"),
  shareScenarioButton: document.querySelector("#shareScenarioButton"),
  saveProfileButton: document.querySelector("#saveProfileButton"),
  saveAsProfileButton: document.querySelector("#saveAsProfileButton"),
  exportPortfolioButton: document.querySelector("#exportPortfolioButton"),
  importPortfolioButton: document.querySelector("#importPortfolioButton"),
  importPortfolioInput: document.querySelector("#importPortfolioInput"),
  snapshotNameInput: document.querySelector("#snapshotNameInput"),
  captureSnapshotButton: document.querySelector("#captureSnapshotButton"),
  compareSnapshotsButton: document.querySelector("#compareSnapshotsButton"),
  snapshotList: document.querySelector("#snapshotList"),
  snapshotCount: document.querySelector("#snapshotCount"),
  compareModal: document.querySelector("#compareModal"),
  closeCompareModal: document.querySelector("#closeCompareModal"),
  compareSelectA: document.querySelector("#compareSelectA"),
  compareSelectB: document.querySelector("#compareSelectB"),
  compareResults: document.querySelector("#compareResults"),
  printReport: document.querySelector("#printReport"),
  printMissionTitle: document.querySelector("#printMissionTitle"),
  printMissionMeta: document.querySelector("#printMissionMeta"),
  printIntegrity: document.querySelector("#printIntegrity"),
  printContinuity: document.querySelector("#printContinuity"),
  printSafeguards: document.querySelector("#printSafeguards"),
  printDecisionLoad: document.querySelector("#printDecisionLoad"),
  printDecisionSummary: document.querySelector("#printDecisionSummary"),
  printPressureSummary: document.querySelector("#printPressureSummary"),
  printPolicyList: document.querySelector("#printPolicyList"),
  printTechniqueList: document.querySelector("#printTechniqueList"),
  printTimelineList: document.querySelector("#printTimelineList"),
  printEvidenceList: document.querySelector("#printEvidenceList"),
  printCsfList: document.querySelector("#printCsfList"),
  printResilienceIndex: document.querySelector("#printResilienceIndex"),
  printPlaybookList: document.querySelector("#printPlaybookList"),
  printGeneratedAt: document.querySelector("#printGeneratedAt"),
  printDigest: document.querySelector("#printDigest"),
  sweepModal: document.querySelector("#sweepModal"),
  closeSweepModal: document.querySelector("#closeSweepModal"),
  sweepTable: document.querySelector("#sweepTable"),
  gapsModal: document.querySelector("#gapsModal"),
  closeGapsModal: document.querySelector("#closeGapsModal"),
  gapsTable: document.querySelector("#gapsTable"),
  missionCompareModal: document.querySelector("#missionCompareModal"),
  closeMissionCompareModal: document.querySelector("#closeMissionCompareModal"),
  missionCompareSelectA: document.querySelector("#missionCompareSelectA"),
  missionCompareSelectB: document.querySelector("#missionCompareSelectB"),
  missionCompareResults: document.querySelector("#missionCompareResults"),
  helpOverlay: document.querySelector("#helpOverlay"),
  closeHelpOverlay: document.querySelector("#closeHelpOverlay")
};

const twinCtx = els.twinCanvas.getContext("2d");
const continuityCtx = els.continuityCanvas.getContext("2d");

const colors = {
  background: "#050a14",
  panel: "#0a1628",
  line: "rgba(46, 211, 255, 0.16)",
  grid: "rgba(124, 255, 178, 0.08)",
  text: "#e8f6ff",
  muted: "#7f97a8",
  safe: "#7cffb2",
  cyan: "#2ed3ff",
  amber: "#ffbf5a",
  red: "#ff667d",
  blue: "#91a7ff",
  violet: "#c59bff"
};

const typeColor = {
  identity: colors.cyan,
  agent: colors.blue,
  device: colors.amber,
  data: colors.violet,
  crown: colors.safe,
  recovery: colors.safe,
  policy: colors.violet,
  edge: colors.cyan
};

function mission() {
  return missions[state.mission];
}

function lens() {
  return lenses[state.lens];
}

function horizon() {
  return horizonProfiles[state.horizon] ?? horizonProfiles[90];
}

function scoreArgs() {
  return [state, mission(), lens(), horizon(), controlWeights];
}

function pressureScore() {
  return scorePressure(...scoreArgs());
}

function coverage() {
  return scoreCoverage(...scoreArgs());
}

function integrityScore() {
  return scoreIntegrity(...scoreArgs());
}

function continuityScore() {
  return scoreContinuity(...scoreArgs());
}

function decisionLoad() {
  return scoreDecisionLoad(...scoreArgs());
}

function evidenceReady() {
  return scoreEvidenceReady(...scoreArgs());
}

function signalScore() {
  return scoreSignal(...scoreArgs());
}

function recoveryWindow() {
  return scoreRecoveryWindow(...scoreArgs());
}

function decisionHeadline(score) {
  return scoreHeadline(score, ...scoreArgs());
}

function decisionSummary(score) {
  return scoreSummary(score, ...scoreArgs());
}

function rehearsalIndex() {
  const last = Math.max(0, mission().timeline.length - 1);
  return clamp(Number(state.rehearsalStep) || 0, 0, last);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char];
  });
}

function sanitizeName(raw, fallback = DEFAULT_PROFILE_NAME) {
  const cleaned = String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 48);
  return cleaned || fallback;
}

/**
 * Coerces a value that must render as a number.
 *
 * Snapshot metrics are interpolated into innerHTML without escaping. They are
 * sanitised on the way in, but a template that assumes "this is a number"
 * should say so at the point it matters too.
 */
function num(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function setPressed(buttons, activeValue, dataName) {
  buttons.forEach((button) => {
    const active = button.dataset[dataName] === String(activeValue);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function tickUtcClock() {
  if (!els.utcClock) return;
  const iso = new Date().toISOString();
  els.utcClock.dateTime = iso;
  els.utcClock.textContent = iso.slice(11, 19) + "Z";
}

function renderWatchList() {
  if (!els.watchList) return;
  const items = watchItems(mission());
  if (!items.length) {
    els.watchList.innerHTML = `<p class="muted-copy">No watch items.</p>`;
    return;
  }
  els.watchList.innerHTML = `
    <div class="csf-head"><span>Watch</span><strong>${items.length}</strong></div>
    <ul>
      ${items
        .map(
          (item) =>
            `<li><span>${escapeHtml(item.kind)}</span><strong>${escapeHtml(item.label)}</strong></li>`
        )
        .join("")}
    </ul>
  `;
}

function renderSignStatus() {
  if (!els.signStatus) return;
  els.signStatus.textContent = state.packetSigned ? "Packet signed" : "Unsigned packet";
  els.signStatus.classList.toggle("is-signed", Boolean(state.packetSigned));
}

function renderMissionButtons() {
  const query = state.missionQuery.trim().toLowerCase();
  const rows = Object.entries(missions).filter(([, item]) => {
    if (!query) return true;
    const haystack = [item.label, item.sector, item.code, item.title, item.crownJewel].join(" ").toLowerCase();
    return haystack.includes(query);
  });
  if (!rows.length) {
    els.missionButtons.innerHTML = `<p class="muted-copy">No sectors match “${escapeHtml(state.missionQuery)}”.</p>`;
    return;
  }
  els.missionButtons.innerHTML = rows
    .map(([key, item]) => {
      const active = key === state.mission ? " is-active" : "";
      const pressed = key === state.mission ? "true" : "false";
      return `
        <button class="mission-button sector-chip${active}" type="button" data-mission="${key}" aria-pressed="${pressed}">
          <span aria-hidden="true">${escapeHtml(item.code.split("-")[0])}</span>
          <strong>${escapeHtml(item.label)}</strong>
          <small>${escapeHtml(item.sector)}</small>
        </button>
      `;
    })
    .join("");
}

function buildPolicyRows(score) {
  return scorePolicyRows(score, ...scoreArgs());
}

function generatedPolicies(score) {
  return buildPolicyRows(score).map((row) => row.rule);
}

function renderTechniqueChips(techniqueIds) {
  return techniqueIds
    .map((id) => {
      const label = techniqueCatalog[id]?.label ?? id;
      return `<span class="technique-chip" title="${escapeHtml(techniqueCatalog[id]?.blurb ?? label)}">${escapeHtml(label)}</span>`;
    })
    .join("");
}

function renderPolicy(score) {
  const rows = buildPolicyRows(score);
  els.policyState.textContent = score >= 66 ? "Compiled" : "Repair";
  els.policyList.innerHTML = rows
    .map((row, index) => {
      return `
        <article class="policy-row">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <div class="policy-body">
            <p>${escapeHtml(row.rule)}</p>
            <div class="technique-chips" aria-label="Defensive techniques">${renderTechniqueChips(row.techniques)}</div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTimeline() {
  const loadDelay = Math.max(0, Math.round((decisionLoad() - 20) / 6));
  const step = rehearsalIndex();
  const beats = mission().timeline.map(([time, action], index) => {
    const minutes = Number.parseInt(time, 10) + index * loadDelay;
    return { minutes, action, index };
  });
  const current = beats[step];
  els.timelineClock.textContent = current
    ? `${String(current.minutes).padStart(2, "0")}m`
    : `${recoveryWindow()}m`;
  els.timelineList.innerHTML = beats
    .map((beat) => {
      const active = beat.index === step;
      return `
        <li${active ? ' class="is-active" aria-current="step"' : ""} data-beat="${beat.index}">
          <span>${String(beat.minutes).padStart(2, "0")}m</span>
          <p>${escapeHtml(beat.action)}</p>
        </li>
      `;
    })
    .join("");
}

function renderSignals() {
  const score = signalScore();
  els.signalScore.textContent = `${score}%`;
  els.signalList.innerHTML = mission()
    .signals.map((signal, index) => {
      const heat = index === 0 && pressureScore() > 58 ? "hot" : index === 1 ? "watch" : "safe";
      return `
        <article class="signal-row" data-heat="${heat}">
          <strong>${escapeHtml(signal)}</strong>
        </article>
      `;
    })
    .join("");
}

function renderEvidence() {
  const ready = evidenceReady();
  const active = mission();
  els.evidenceCount.textContent = `${active.evidence.length} items`;
  els.evidenceStatus.textContent = `${ready}/${active.evidence.length}`;
  els.evidenceList.innerHTML = active.evidence
    .map((item, index) => {
      const complete = index < ready;
      return `
        <article class="evidence-row" data-ready="${complete}">
          <span aria-hidden="true">${complete ? "OK" : "..."}</span>
          <strong>${escapeHtml(item)}</strong>
        </article>
      `;
    })
    .join("");
}

function futureSeries() {
  const active = mission();
  const controlLift = coverage() * 0.06;
  const pressureDrag = Math.max(0, pressureScore() - 45) * 0.12;
  return active.future.map((value, index) => {
    const horizonSlope = state.horizon === 180 ? index * 1.6 : state.horizon === 30 ? index * -0.45 : index * 0.55;
    return clamp(value * horizon().maturity + controlLift - pressureDrag + horizonSlope, 8, 98);
  });
}

function renderDashboard() {
  const active = mission();
  const score = integrityScore();
  const cover = coverage();
  const continuity = continuityScore();

  els.missionCode.textContent = active.code;
  els.sectorLabel.textContent = active.sector;
  els.missionTitle.textContent = active.title;
  els.missionBrief.textContent = active.brief;
  els.lensLabel.textContent = lens().label;
  els.horizonLabel.textContent = horizon().label;
  els.pressureValue.textContent = String(pressureScore());
  els.coverageScore.textContent = `${cover}%`;

  els.integrityStatus.textContent = `${score}%`;
  els.decisionStatus.textContent = String(decisionLoad());
  els.continuityStatus.textContent = `${continuity}%`;
  els.crownLabel.textContent = active.crownJewel;
  els.promiseLabel.textContent = active.promise;
  const weak = weakestNode(active);
  const hot = hottestNode(active);
  const crown = crownNeighbors(active);
  const neighborLabels = crown.neighbors.map((node) => node.label).join(", ");
  const telemetry = [`${active.nodes.length} assets, ${active.links.length} trust paths`];
  if (weak) telemetry.push(`weakest ${weak.label}`);
  if (hot) telemetry.push(`hottest ${hot.label}`);
  if (crown.crown) {
    telemetry.push(neighborLabels ? `neighbors ${neighborLabels}` : "neighbors none");
  }
  const isolated = isolatedNodes(active);
  telemetry.push(
    isolated.length
      ? `isolated ${isolated.map((node) => node.label).join(", ")}`
      : "isolated none"
  );
  els.mapTelemetry.textContent = telemetry.join(" · ");
  if (els.dominantPressure) {
    const pressure = dominantPressure(state);
    els.dominantPressure.textContent = `${pressure.key} ${Math.round(pressure.value)}`;
  }

  els.integrityRing.style.setProperty("--integrity", score);
  els.integrityRing.style.setProperty(
    "--integrity-color",
    score >= 66 ? colors.safe : score >= 48 ? colors.amber : colors.red
  );
  els.integrityScore.textContent = String(score);
  els.decisionHeadline.textContent = decisionHeadline(score);
  els.decisionSummary.textContent = decisionSummary(score);
  renderAdvice(score);
  els.boardBlurb.textContent = boardBlurb(score, active, weak);
  renderHorizonStrip();
  els.horizonCaption.textContent = `${horizon().caption} via ${lens().caption.toLowerCase()}`;
  els.decisionLoad.textContent = `${decisionLoad()} moves`;
  els.safeguardMetric.textContent = `${cover}%`;
  els.recoveryWindow.textContent = `${recoveryWindow()}m`;
  if (els.resilienceMetric) {
    els.resilienceMetric.textContent = String(scoreResilienceIndex(...scoreArgs()));
  }
  renderCsfPanel();
  renderPlaybook();
  renderSignStatus();
  renderWatchList();

  renderTimeline();
  renderPolicy(score);
  renderSignals();
  renderEvidence();
  drawContinuity();
  if (!els.sweepModal.hidden) renderSweepTable();
  if (!els.gapsModal.hidden) renderGapsTable();
  if (!els.missionCompareModal.hidden) renderMissionCompare();
  // With animation paused the loop is not there to pick the change up.
  if (!twinFrame) drawTwin();
}

function resizeCanvas(canvas, ctx) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return rect;
}

function drawGrid(ctx, width, height, spacing = 44) {
  ctx.save();
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRadarField(ctx, width, height, pulse) {
  const cx = width * 0.5;
  const cy = height * 0.52;
  const maxR = Math.hypot(cx, cy) * 0.92;
  ctx.save();
  ctx.strokeStyle = "rgba(46, 211, 255, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 5; i += 1) {
    ctx.beginPath();
    ctx.arc(cx, cy, (maxR / 5) * i, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - maxR, cy);
  ctx.lineTo(cx + maxR, cy);
  ctx.moveTo(cx, cy - maxR);
  ctx.lineTo(cx, cy + maxR);
  ctx.stroke();

  const angle = (pulse * 0.018) % (Math.PI * 2);
  ctx.fillStyle = "rgba(46, 211, 255, 0.05)";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, maxR, angle - 0.32, angle);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(124, 255, 178, 0.28)";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
  ctx.stroke();
  ctx.restore();
}

function drawRecoveryLane(ctx, nodes, pulse) {
  const crownNode = nodes.find((node) => node.type === "crown");
  if (!crownNode) return;
  nodes
    .filter((node) => node.type === "recovery")
    .forEach((rec, index) => {
      const t = (pulse * 0.012 + index * 0.22) % 1;
      ctx.save();
      ctx.setLineDash([5, 9]);
      ctx.strokeStyle = `rgba(124, 255, 178, ${0.22 + 0.18 * Math.sin(pulse * 0.04 + index)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rec.px, rec.py);
      ctx.lineTo(crownNode.px, crownNode.py);
      ctx.stroke();
      const px = rec.px + (crownNode.px - rec.px) * t;
      const py = rec.py + (crownNode.py - rec.py) * t;
      ctx.setLineDash([]);
      ctx.fillStyle = colors.safe;
      ctx.shadowColor = colors.safe;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(px, py, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
}

function nodeById(nodes, id) {
  return nodes.find((node) => node.id === id);
}

function drawDiamond(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.moveTo(x, y - radius);
  ctx.lineTo(x + radius, y);
  ctx.lineTo(x, y + radius);
  ctx.lineTo(x - radius, y);
  ctx.closePath();
}

function drawHex(ctx, x, y, radius) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = Math.PI / 6 + (Math.PI * 2 * i) / 6;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawNodeShape(ctx, node, x, y, radius) {
  if (node.type === "crown" || node.type === "policy") {
    drawDiamond(ctx, x, y, radius);
    return;
  }
  if (node.type === "agent" || node.type === "device") {
    drawHex(ctx, x, y, radius);
    return;
  }
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
}

function nodeHeatColor(weight, alpha = 1) {
  const t = clamp(Number(weight) || 0, 0, 1);
  const r = Math.round(143 + (255 - 143) * t);
  const g = Math.round(240 + (191 - 240) * t);
  const b = Math.round(177 + (90 - 177) * t);
  return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawTwin() {
  const rect = resizeCanvas(els.twinCanvas, twinCtx);
  const width = rect.width;
  const height = rect.height;
  const active = mission();
  const score = integrityScore();
  const pulse = state.pulse;

  twinCtx.clearRect(0, 0, width, height);
  twinCtx.fillStyle = colors.background;
  twinCtx.fillRect(0, 0, width, height);
  drawGrid(twinCtx, width, height, 36);
  drawRadarField(twinCtx, width, height, pulse);

  const sweepX = (pulse * 1.4) % Math.max(width, 1);
  twinCtx.save();
  twinCtx.fillStyle = "rgba(71, 214, 255, 0.05)";
  twinCtx.fillRect(sweepX - 46, 0, 92, height);
  twinCtx.strokeStyle = "rgba(71, 214, 255, 0.25)";
  twinCtx.beginPath();
  twinCtx.moveTo(sweepX, 0);
  twinCtx.lineTo(sweepX, height);
  twinCtx.stroke();
  twinCtx.restore();

  const nodes = active.nodes.map((node) => ({
    ...node,
    px: node.x * width,
    py: node.y * height
  }));

  twinCtx.save();
  twinCtx.lineCap = "round";
  active.links.forEach(([fromId, toId, label], index) => {
    const from = nodeById(nodes, fromId);
    const to = nodeById(nodes, toId);
    // A link naming a node that no longer exists used to throw here, which
    // killed the animation frame and froze the twin for the rest of the
    // session. tools/validate.mjs now fails on such a link; this keeps a stale
    // catalog from taking the whole map down.
    if (!from || !to) return;
    const activity = (Math.sin(pulse * 0.038 + index * 0.9) + 1) / 2;
    const heat = clamp((pressureScore() / 100 + (from.weight + to.weight) / 2) / 2, 0, 1);
    const linkColor = heat > 0.7 ? colors.red : heat > 0.56 ? colors.amber : colors.cyan;
    const midX = (from.px + to.px) / 2;
    const midY = (from.py + to.py) / 2;
    const curve = (index % 2 === 0 ? -1 : 1) * (36 + activity * 18);

    twinCtx.strokeStyle =
      linkColor === colors.red
        ? `rgba(255, 102, 125, ${0.16 + activity * 0.3})`
        : linkColor === colors.amber
          ? `rgba(255, 191, 90, ${0.18 + activity * 0.3})`
          : `rgba(71, 214, 255, ${0.17 + activity * 0.26})`;
    twinCtx.lineWidth = 2 + activity * 2.3;
    twinCtx.beginPath();
    twinCtx.moveTo(from.px, from.py);
    twinCtx.quadraticCurveTo(midX, midY + curve, to.px, to.py);
    twinCtx.stroke();

    const gateSize = 6 + coverage() / 18;
    twinCtx.save();
    twinCtx.translate(midX, midY + curve * 0.42);
    twinCtx.rotate(Math.PI / 4);
    twinCtx.fillStyle = state.controls.attestation ? "rgba(143, 240, 177, 0.85)" : "rgba(255, 191, 90, 0.75)";
    twinCtx.fillRect(-gateSize / 2, -gateSize / 2, gateSize, gateSize);
    twinCtx.restore();

    const t = (pulse * 0.008 + index * 0.14) % 1;
    const particleX = from.px + (to.px - from.px) * t;
    const particleY = from.py + (to.py - from.py) * t + Math.sin(t * Math.PI) * curve * 0.55;
    twinCtx.fillStyle = score >= 66 ? colors.safe : score >= 48 ? colors.amber : colors.red;
    twinCtx.beginPath();
    twinCtx.arc(particleX, particleY, 3.4, 0, Math.PI * 2);
    twinCtx.fill();

    if (width > 620) {
      twinCtx.fillStyle = colors.muted;
      twinCtx.font = "600 11px Inter, ui-sans-serif, system-ui, sans-serif";
      twinCtx.textAlign = "center";
      twinCtx.fillText(label, midX, midY + curve * 0.42 - 12);
    }
  });
  twinCtx.restore();

  drawRecoveryLane(twinCtx, nodes, pulse);

  nodes.forEach((node, index) => {
    const nodeScore = clamp(node.weight * 100 + pressureScore() * 0.18 - coverage() * 0.08, 5, 98);
    const radius = 19 + node.weight * 17 + Math.sin(pulse * 0.035 + index) * 1.8;
    const color = state.heat ? nodeHeatColor(node.weight) : (typeColor[node.type] ?? colors.cyan);

    twinCtx.save();
    twinCtx.shadowColor = color;
    twinCtx.shadowBlur = node.type === "crown" ? 24 : 14;
    twinCtx.fillStyle = state.heat ? nodeHeatColor(node.weight, 0.22) : colors.panel;
    twinCtx.strokeStyle = color;
    twinCtx.lineWidth = node.type === "crown" ? 3 : 2;
    drawNodeShape(twinCtx, node, node.px, node.py, radius);
    twinCtx.fill();
    twinCtx.stroke();
    twinCtx.shadowBlur = 0;

    if (node.type === "crown") {
      twinCtx.strokeStyle = `rgba(143, 240, 177, ${0.28 + Math.sin(pulse * 0.04) * 0.08})`;
      twinCtx.lineWidth = 2;
      twinCtx.beginPath();
      twinCtx.arc(node.px, node.py, radius + 20, 0, Math.PI * 2);
      twinCtx.stroke();
    }

    twinCtx.fillStyle = colors.text;
    twinCtx.font = "800 12px Inter, ui-sans-serif, system-ui, sans-serif";
    twinCtx.textAlign = "center";
    twinCtx.fillText(node.label, node.px, node.py + radius + 22);
    twinCtx.fillStyle = colors.muted;
    twinCtx.font = "700 11px Inter, ui-sans-serif, system-ui, sans-serif";
    twinCtx.fillText(`${Math.round(nodeScore)}%`, node.px, node.py + 4);
    twinCtx.restore();
  });

}

const reducedMotion =
  typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

let twinFrame = 0;

function twinShouldAnimate() {
  return !document.hidden && !reducedMotion?.matches;
}

function twinLoop(timestamp) {
  if (timestamp - state.frameTime >= 32) {
    state.frameTime = timestamp;
    state.pulse += 1;
    drawTwin();
  }
  twinFrame = requestAnimationFrame(twinLoop);
}

function startTwin() {
  if (twinFrame) return;
  // A hidden tab still burned a full animation loop, and the map animates
  // continuously, which is exactly what prefers-reduced-motion asks us not to
  // do. Both cases render one static frame instead.
  if (!twinShouldAnimate()) {
    drawTwin();
    return;
  }
  twinFrame = requestAnimationFrame(twinLoop);
}

function stopTwin() {
  if (!twinFrame) return;
  cancelAnimationFrame(twinFrame);
  twinFrame = 0;
}

function syncTwinMotion() {
  stopTwin();
  startTwin();
}

function drawContinuity() {
  const rect = resizeCanvas(els.continuityCanvas, continuityCtx);
  const width = rect.width;
  const height = rect.height;
  const data = futureSeries();
  const padding = 24;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  continuityCtx.clearRect(0, 0, width, height);
  continuityCtx.fillStyle = "#07101c";
  continuityCtx.fillRect(0, 0, width, height);
  drawGrid(continuityCtx, width, height, 38);

  continuityCtx.save();
  continuityCtx.strokeStyle = "rgba(154, 165, 154, 0.35)";
  continuityCtx.lineWidth = 1;
  continuityCtx.beginPath();
  continuityCtx.moveTo(padding, height - padding);
  continuityCtx.lineTo(width - padding, height - padding);
  continuityCtx.stroke();

  continuityCtx.strokeStyle = continuityScore() >= 66 ? colors.safe : colors.amber;
  continuityCtx.lineWidth = 4;
  continuityCtx.beginPath();
  data.forEach((value, index) => {
    const x = padding + (innerWidth / (data.length - 1)) * index;
    const y = height - padding - (value / 100) * innerHeight;
    if (index === 0) continuityCtx.moveTo(x, y);
    else continuityCtx.lineTo(x, y);
  });
  continuityCtx.stroke();

  data.forEach((value, index) => {
    const x = padding + (innerWidth / (data.length - 1)) * index;
    const y = height - padding - (value / 100) * innerHeight;
    continuityCtx.fillStyle = index === data.length - 1 ? colors.amber : colors.cyan;
    continuityCtx.beginPath();
    continuityCtx.arc(x, y, 4.8, 0, Math.PI * 2);
    continuityCtx.fill();
  });
  continuityCtx.restore();
}

/* ─── Profile / portfolio ─────────────────────────────────────────── */

/** Applies a decoded scenario to live state and redraws everything. */
function applyScenario(scenario) {
  state.mission = scenario.mission;
  state.lens = scenario.lens;
  state.horizon = scenario.horizon;
  state.pressure = { ...scenario.pressure };
  state.controls = { ...scenario.controls };
  renderMissionButtons();
  updateControlsFromState();
  renderDashboard();
}

async function shareScenario() {
  const url = scenarioUrl(state, window.location.href);
  try {
    await navigator.clipboard.writeText(url);
    markProfileState("Link copied");
  } catch {
    // Clipboard access needs a secure context and permission; falling back to
    // the address bar still gives the reader something to copy by hand.
    window.location.hash = new URL(url).hash;
    markProfileState("Link in URL");
  }
}

/**
 * Loads a posture handed over in the URL fragment.
 *
 * The fragment is cleared afterwards so a reload does not keep resurrecting the
 * shared posture over whatever the reader has since changed.
 */
function loadScenarioFromUrl() {
  const result = readScenarioFromUrl(window.location.href, {
    missions,
    lenses,
    horizons: horizonProfiles
  });
  if (!result) return;

  if (result.scenario) {
    applyScenario(result.scenario);
    markProfileState("Shared");
  } else {
    markProfileState("Bad link");
    console.warn(`Aegis Horizon: ${result.message}`);
  }

  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

function markProfileState(label) {
  els.profileState.textContent = label;
}

function markProfileChanged() {
  markProfileState("Changed");
}

function profilePayload() {
  return {
    mission: state.mission,
    lens: state.lens,
    horizon: state.horizon,
    pressure: { ...state.pressure },
    controls: { ...state.controls },
    savedAt: new Date().toISOString()
  };
}

function applyProfile(profile) {
  if (!missions[profile.mission] || !lenses[profile.lens] || !horizonProfiles[profile.horizon]) {
    return false;
  }

  state.mission = profile.mission;
  state.lens = profile.lens;
  state.horizon = Number(profile.horizon);
  state.pressure = {
    agent: clamp(Number(profile.pressure?.agent ?? state.pressure.agent), 0, 100),
    supplier: clamp(Number(profile.pressure?.supplier ?? state.pressure.supplier), 0, 100),
    data: clamp(Number(profile.pressure?.data ?? state.pressure.data), 0, 100)
  };
  state.controls = {
    approvals: Boolean(profile.controls?.approvals),
    recovery: Boolean(profile.controls?.recovery),
    attestation: Boolean(profile.controls?.attestation),
    privacy: Boolean(profile.controls?.privacy)
  };
  state.rehearsalStep = 0;
  return true;
}

function updateControlsFromState() {
  els.agentRange.value = String(state.pressure.agent);
  els.supplierRange.value = String(state.pressure.supplier);
  els.dataRange.value = String(state.pressure.data);

  document.querySelectorAll("[data-control]").forEach((input) => {
    input.checked = Boolean(state.controls[input.dataset.control]);
  });

  setPressed([...els.missionButtons.querySelectorAll("button")], state.mission, "mission");
  setPressed([...document.querySelectorAll("[data-lens]")], state.lens, "lens");
  setPressed([...document.querySelectorAll("[data-horizon]")], state.horizon, "horizon");
}

function persistPortfolio() {
  try {
    const payload = {
      version: 1,
      activeProfile: state.activeProfileName,
      profiles: portfolio,
      current: profilePayload()
    };
    window.localStorage.setItem(portfolioStorageKey, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function renderProfileList() {
  const names = Object.keys(portfolio).sort((a, b) => a.localeCompare(b));
  if (names.length === 0) {
    els.profileList.innerHTML = `<li class="profile-empty">No saved profiles yet</li>`;
    return;
  }

  els.profileList.innerHTML = names
    .map((name) => {
      const active = name === state.activeProfileName ? " is-active" : "";
      const savedAt = portfolio[name]?.savedAt
        ? new Date(portfolio[name].savedAt).toLocaleString()
        : "";
      return `
        <li class="profile-item${active}" data-profile="${escapeHtml(name)}">
          <div class="profile-item-meta">
            <strong>${escapeHtml(name)}</strong>
            <small>${escapeHtml(savedAt)}</small>
          </div>
          <div class="profile-item-actions">
            <button type="button" data-profile-load="${escapeHtml(name)}" title="Load ${escapeHtml(name)}">Load</button>
            <button type="button" data-profile-delete="${escapeHtml(name)}" title="Delete ${escapeHtml(name)}">Del</button>
          </div>
        </li>
      `;
    })
    .join("");
}

function saveProfile(forceName) {
  const name = sanitizeName(forceName ?? els.profileNameInput.value, state.activeProfileName || DEFAULT_PROFILE_NAME);
  els.profileNameInput.value = name;
  state.activeProfileName = name;
  portfolio[name] = profilePayload();
  if (persistPortfolio()) {
    markProfileState("Saved");
    renderProfileList();
  } else {
    markProfileState("Blocked");
  }
}

function saveAsProfile() {
  const name = sanitizeName(els.profileNameInput.value, "");
  if (!name) {
    els.profileNameInput.focus();
    markProfileState("Name?");
    return;
  }
  if (portfolio[name] && name !== state.activeProfileName) {
    const overwrite = window.confirm(`Profile "${name}" already exists. Overwrite?`);
    if (!overwrite) return;
  }
  saveProfile(name);
}

function loadNamedProfile(name) {
  const profile = portfolio[name];
  if (!profile) {
    markProfileState("Empty");
    return;
  }
  if (!applyProfile(profile)) {
    markProfileState("Invalid");
    return;
  }
  state.activeProfileName = name;
  els.profileNameInput.value = name;
  updateControlsFromState();
  renderDashboard();
  persistPortfolio();
  markProfileState("Loaded");
  renderProfileList();
}

function deleteNamedProfile(name) {
  if (!portfolio[name]) return;
  const confirmed = window.confirm(`Delete profile "${name}"?`);
  if (!confirmed) return;
  delete portfolio[name];
  if (state.activeProfileName === name) {
    state.activeProfileName = Object.keys(portfolio)[0] || DEFAULT_PROFILE_NAME;
    els.profileNameInput.value = state.activeProfileName;
  }
  persistPortfolio();
  markProfileState("Deleted");
  renderProfileList();
}

function migrateLegacyProfile() {
  try {
    const legacy = window.localStorage.getItem(legacyProfileKey);
    if (!legacy) return;
    const profile = JSON.parse(legacy);
    if (profile && missions[profile.mission]) {
      portfolio[DEFAULT_PROFILE_NAME] = {
        mission: profile.mission,
        lens: profile.lens ?? "board",
        horizon: profile.horizon ?? 90,
        pressure: profile.pressure ?? { ...state.pressure },
        controls: profile.controls ?? { ...state.controls },
        savedAt: profile.savedAt ?? new Date().toISOString()
      };
      state.activeProfileName = DEFAULT_PROFILE_NAME;
      applyProfile(portfolio[DEFAULT_PROFILE_NAME]);
    }
    window.localStorage.removeItem(legacyProfileKey);
  } catch {
    // ignore corrupt legacy payload
  }
}

function loadPortfolioFromStorage() {
  try {
    const stored = window.localStorage.getItem(portfolioStorageKey);
    if (!stored) {
      migrateLegacyProfile();
      if (Object.keys(portfolio).length === 0) {
        portfolio[DEFAULT_PROFILE_NAME] = profilePayload();
      }
      persistPortfolio();
      markProfileState(Object.keys(portfolio).length ? "Ready" : "Unsaved");
      return;
    }

    const data = JSON.parse(stored);
    if (data?.profiles && typeof data.profiles === "object") {
      portfolio = {};
      Object.entries(data.profiles).forEach(([name, profile]) => {
        if (profile && missions[profile.mission]) {
          portfolio[sanitizeName(name)] = profile;
        }
      });
    }

    if (data?.current && missions[data.current.mission]) {
      applyProfile(data.current);
    } else if (data?.activeProfile && portfolio[data.activeProfile]) {
      applyProfile(portfolio[data.activeProfile]);
    }

    state.activeProfileName = sanitizeName(
      data?.activeProfile || Object.keys(portfolio)[0] || DEFAULT_PROFILE_NAME
    );
    markProfileState("Loaded");
  } catch {
    migrateLegacyProfile();
    markProfileState("Local");
  }

  if (Object.keys(portfolio).length === 0) {
    portfolio[DEFAULT_PROFILE_NAME] = profilePayload();
  }
}

function exportPortfolio() {
  const payload = {
    project: "Aegis Horizon",
    kind: "twin-portfolio",
    version: 1,
    exportedAt: new Date().toISOString(),
    activeProfile: state.activeProfileName,
    profiles: portfolio,
    current: profilePayload(),
    snapshots
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `aegis-horizon-portfolio-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  markProfileState("Exported");
}

function importPortfolioFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      if (!data || typeof data !== "object") throw new Error("invalid");

      const incoming = data.profiles ?? (data.mission ? { [DEFAULT_PROFILE_NAME]: data } : null);
      if (!incoming || typeof incoming !== "object") {
        markProfileState("Invalid");
        return;
      }

      let imported = 0;
      Object.entries(incoming).forEach(([name, profile]) => {
        if (profile && missions[profile.mission] && lenses[profile.lens] && horizonProfiles[profile.horizon]) {
          portfolio[sanitizeName(name)] = {
            mission: profile.mission,
            lens: profile.lens,
            horizon: Number(profile.horizon),
            pressure: {
              agent: clamp(Number(profile.pressure?.agent ?? 50), 0, 100),
              supplier: clamp(Number(profile.pressure?.supplier ?? 50), 0, 100),
              data: clamp(Number(profile.pressure?.data ?? 50), 0, 100)
            },
            controls: {
              approvals: Boolean(profile.controls?.approvals),
              recovery: Boolean(profile.controls?.recovery),
              attestation: Boolean(profile.controls?.attestation),
              privacy: Boolean(profile.controls?.privacy)
            },
            savedAt: profile.savedAt ?? new Date().toISOString()
          };
          imported += 1;
        }
      });

      if (imported === 0) {
        markProfileState("Invalid");
        return;
      }

      if (data.current && missions[data.current.mission]) {
        applyProfile(data.current);
      } else if (data.activeProfile && portfolio[data.activeProfile]) {
        applyProfile(portfolio[data.activeProfile]);
        state.activeProfileName = sanitizeName(data.activeProfile);
      } else {
        const first = Object.keys(portfolio)[0];
        applyProfile(portfolio[first]);
        state.activeProfileName = first;
      }

      if (Array.isArray(data.snapshots)) {
        // Same boundary check as the localStorage path: an imported file is no
        // more trustworthy than a stored one.
        snapshots = sanitizeSnapshotList(data.snapshots, catalogs()).map((snap) => ({
          ...snap,
          name: sanitizeName(snap.name, "Snapshot"),
          capturedAt: snap.capturedAt || new Date().toISOString()
        }));
        persistSnapshots();
        renderSnapshotList();
      }

      els.profileNameInput.value = state.activeProfileName;
      updateControlsFromState();
      renderDashboard();
      persistPortfolio();
      renderProfileList();
      markProfileState(`Imported ${imported}`);
    } catch {
      markProfileState("Invalid");
    }
  };
  reader.onerror = () => markProfileState("Invalid");
  reader.readAsText(file);
}

/* ─── Snapshots ───────────────────────────────────────────────────── */

function persistSnapshots() {
  try {
    window.localStorage.setItem(snapshotsStorageKey, JSON.stringify(snapshots));
    return true;
  } catch {
    return false;
  }
}

function loadSnapshotsFromStorage() {
  try {
    const stored = window.localStorage.getItem(snapshotsStorageKey);
    if (!stored) {
      snapshots = [];
      return;
    }
    snapshots = sanitizeSnapshotList(JSON.parse(stored), catalogs());
  } catch {
    snapshots = [];
  }
}

/** The catalogs a restored snapshot is allowed to reference. */
function catalogs() {
  return { missions, lenses, horizons: horizonProfiles };
}

function captureSnapshot() {
  const name = sanitizeName(els.snapshotNameInput.value, `Snapshot ${snapshots.length + 1}`);
  els.snapshotNameInput.value = name;
  const snap = {
    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    capturedAt: new Date().toISOString(),
    mission: state.mission,
    missionTitle: mission().title,
    code: mission().code,
    lens: state.lens,
    horizon: state.horizon,
    integrity: integrityScore(),
    continuity: continuityScore(),
    decisionLoad: decisionLoad(),
    coverage: coverage(),
    pressure: { ...state.pressure },
    controls: { ...state.controls }
  };
  snapshots.unshift(snap);
  if (snapshots.length > 40) snapshots = snapshots.slice(0, 40);
  persistSnapshots();
  renderSnapshotList();
  els.snapshotNameInput.value = "";
}

function deleteSnapshot(id) {
  snapshots = snapshots.filter((snap) => snap.id !== id);
  persistSnapshots();
  renderSnapshotList();
  if (!els.compareModal.hidden) {
    fillCompareSelects();
    renderCompareResults();
  }
}

function renderSnapshotList() {
  els.snapshotCount.textContent = String(snapshots.length);
  if (snapshots.length === 0) {
    els.snapshotList.innerHTML = `<li class="profile-empty">No snapshots yet</li>`;
    return;
  }

  els.snapshotList.innerHTML = snapshots
    .map((snap) => {
      const when = new Date(snap.capturedAt).toLocaleString();
      return `
        <li class="snapshot-item" data-snapshot-id="${escapeHtml(snap.id)}">
          <div class="profile-item-meta">
            <strong>${escapeHtml(snap.name)}</strong>
            <small>I ${num(snap.integrity)}% · C ${num(snap.continuity)}% · ${escapeHtml(when)}</small>
          </div>
          <div class="profile-item-actions">
            <button type="button" data-snapshot-delete="${escapeHtml(snap.id)}" title="Delete snapshot">Del</button>
          </div>
        </li>
      `;
    })
    .join("");
}

function fillCompareSelects() {
  const options =
    snapshots.length === 0
      ? `<option value="">No snapshots</option>`
      : snapshots
          .map(
            (snap) =>
              `<option value="${escapeHtml(snap.id)}">${escapeHtml(snap.name)} (${num(snap.integrity)}/${num(snap.continuity)})</option>`
          )
          .join("");
  const prevA = els.compareSelectA.value;
  const prevB = els.compareSelectB.value;
  els.compareSelectA.innerHTML = options;
  els.compareSelectB.innerHTML = options;
  if (snapshots.length >= 2) {
    els.compareSelectA.value = snapshots.some((s) => s.id === prevA) ? prevA : snapshots[0].id;
    els.compareSelectB.value = snapshots.some((s) => s.id === prevB) ? prevB : snapshots[1].id;
  } else if (snapshots.length === 1) {
    els.compareSelectA.value = snapshots[0].id;
    els.compareSelectB.value = snapshots[0].id;
  }
}

function deltaClass(value) {
  if (value > 0) return "delta-up";
  if (value < 0) return "delta-down";
  return "delta-flat";
}

function formatDelta(value, suffix = "") {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${suffix}`;
}

function renderCompareResults() {
  const a = snapshots.find((s) => s.id === els.compareSelectA.value);
  const b = snapshots.find((s) => s.id === els.compareSelectB.value);

  if (!a || !b) {
    els.compareResults.innerHTML = `<p class="muted-copy">Select two snapshots to see integrity, continuity, and pressure deltas.</p>`;
    return;
  }

  const dIntegrity = b.integrity - a.integrity;
  const dContinuity = b.continuity - a.continuity;
  const dLoad = b.decisionLoad - a.decisionLoad;
  const dCoverage = b.coverage - a.coverage;
  const dAgent = (b.pressure?.agent ?? 0) - (a.pressure?.agent ?? 0);
  const dSupplier = (b.pressure?.supplier ?? 0) - (a.pressure?.supplier ?? 0);
  const dData = (b.pressure?.data ?? 0) - (a.pressure?.data ?? 0);

  els.compareResults.innerHTML = `
    <div class="compare-headers">
      <div>
        <span>A</span>
        <strong>${escapeHtml(a.name)}</strong>
        <small>${escapeHtml(a.missionTitle || a.mission || "")}</small>
      </div>
      <div>
        <span>B</span>
        <strong>${escapeHtml(b.name)}</strong>
        <small>${escapeHtml(b.missionTitle || b.mission || "")}</small>
      </div>
    </div>
    <table class="compare-table">
      <thead>
        <tr><th>Metric</th><th>A</th><th>B</th><th>Δ (B−A)</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Integrity</td>
          <td>${num(a.integrity)}%</td>
          <td>${num(b.integrity)}%</td>
          <td class="${deltaClass(dIntegrity)}">${formatDelta(dIntegrity, "%")}</td>
        </tr>
        <tr>
          <td>Continuity</td>
          <td>${num(a.continuity)}%</td>
          <td>${num(b.continuity)}%</td>
          <td class="${deltaClass(dContinuity)}">${formatDelta(dContinuity, "%")}</td>
        </tr>
        <tr>
          <td>Decision load</td>
          <td>${num(a.decisionLoad)}</td>
          <td>${num(b.decisionLoad)}</td>
          <td class="${deltaClass(-dLoad)}">${formatDelta(dLoad)}</td>
        </tr>
        <tr>
          <td>Safeguards</td>
          <td>${num(a.coverage)}%</td>
          <td>${num(b.coverage)}%</td>
          <td class="${deltaClass(dCoverage)}">${formatDelta(dCoverage, "%")}</td>
        </tr>
        <tr>
          <td>Agent authority</td>
          <td>${a.pressure?.agent ?? "—"}</td>
          <td>${b.pressure?.agent ?? "—"}</td>
          <td class="${deltaClass(-dAgent)}">${formatDelta(dAgent)}</td>
        </tr>
        <tr>
          <td>Supplier coupling</td>
          <td>${a.pressure?.supplier ?? "—"}</td>
          <td>${b.pressure?.supplier ?? "—"}</td>
          <td class="${deltaClass(-dSupplier)}">${formatDelta(dSupplier)}</td>
        </tr>
        <tr>
          <td>Data gravity</td>
          <td>${a.pressure?.data ?? "—"}</td>
          <td>${b.pressure?.data ?? "—"}</td>
          <td class="${deltaClass(-dData)}">${formatDelta(dData)}</td>
        </tr>
        <tr>
          <td>Horizon</td>
          <td>${a.horizon}d</td>
          <td>${b.horizon}d</td>
          <td class="delta-flat">${a.horizon === b.horizon ? "same" : `${a.horizon}→${b.horizon}`}</td>
        </tr>
        <tr>
          <td>Lens</td>
          <td>${escapeHtml(a.lens)}</td>
          <td>${escapeHtml(b.lens)}</td>
          <td class="delta-flat">${a.lens === b.lens ? "same" : `${escapeHtml(a.lens)}→${escapeHtml(b.lens)}`}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function openCompareModal() {
  closeOverlays();
  fillCompareSelects();
  renderCompareResults();
  openOverlay(els.compareModal, els.closeCompareModal);
}

/* ─── Dialog focus management ─────────────────────────────────────── */

/** The control that opened the current dialog, so focus can go back to it. */
let overlayReturnFocus = null;

function openOverlay(element, initialFocus) {
  // Remember where focus came from before the dialog steals it. closeOverlays()
  // runs first in several callers, so only record a target outside any dialog.
  const active = document.activeElement;
  if (active instanceof HTMLElement && !active.closest(".modal-panel, .overlay")) {
    overlayReturnFocus = active;
  }
  element.hidden = false;
  initialFocus?.focus();
}

function closeOverlay(element) {
  if (element.hidden) return;
  const active = document.activeElement;
  element.hidden = true;
  // Only reclaim focus if it was inside the dialog we just hid — otherwise the
  // user has already moved on and we would yank them back.
  if (active instanceof HTMLElement && element.contains(active)) {
    if (overlayReturnFocus?.isConnected) overlayReturnFocus.focus();
    else active.blur();
  }
}

function openOverlayElement() {
  return [els.compareModal, els.sweepModal, els.gapsModal, els.missionCompareModal, els.helpOverlay].find(
    (element) => element && !element.hidden
  );
}

/**
 * Keeps Tab inside an open dialog.
 *
 * aria-modal="true" tells assistive technology to ignore the background, but
 * the browser will still tab into it, so the keyboard has to be held here
 * explicitly.
 */
function trapOverlayFocus(event) {
  if (event.key !== "Tab") return;
  const overlay = openOverlayElement();
  if (!overlay) return;

  const focusable = focusableWithin(overlay);
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }

  const target = nextFocusTarget(focusable, document.activeElement, event.shiftKey);
  if (target) {
    event.preventDefault();
    target.focus();
  }
}

function closeCompareModal() {
  closeOverlay(els.compareModal);
}

/* ─── Packet export + print report ────────────────────────────────── */

async function digestText(text) {
  if (!window.crypto?.subtle) return "unavailable";
  const buffer = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function buildPacketPayload() {
  const active = mission();
  const score = integrityScore();
  const rows = buildPolicyRows(score);
  return {
    project: "Aegis Horizon",
    mode: "resilience-twin-studio",
    mission: active.title,
    code: active.code,
    sector: active.sector,
    crownJewel: active.crownJewel,
    decisionLens: lens().label,
    horizonDays: state.horizon,
    integrity: score,
    continuity: continuityScore(),
    decisionLoad: decisionLoad(),
    pressure: { ...state.pressure },
    safeguards: { ...state.controls },
    tabletopTimeline: active.timeline,
    generatedPolicies: rows.map((row) => row.rule),
    policyTechniques: rows.map((row) => ({
      rule: row.rule,
      techniques: techniqueLabelsSafe(row.techniques)
    })),
    techniqueCoverage: techniqueCoverage(rows).map((t) => t.label),
    futuresSignals: active.signals,
    evidence: active.evidence,
    csf: csfFunctions(...scoreArgs()),
    resilienceIndex: scoreResilienceIndex(...scoreArgs()),
    playbook: playbookBeats(...scoreArgs()),
    profileName: state.activeProfileName,
    generatedAt: new Date().toISOString()
  };
}

function techniqueLabelsSafe(ids) {
  return ids.map((id) => techniqueCatalog[id]?.label ?? id);
}

function downloadPacketJson(packet, suffix = "packet") {
  const blob = new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `aegis-horizon-${mission().code.toLowerCase()}-${suffix}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function exportPacket() {
  const payload = buildPacketPayload();
  const digest = await digestText(JSON.stringify(payload));
  state.lastPacketDigest = digest;
  downloadPacketJson({ ...payload, integrityDigest: { algorithm: "SHA-256", digest } });
}

async function signAndExportPacket() {
  const payload = buildPacketPayload();
  const digest = await digestText(JSON.stringify(payload));
  state.lastPacketDigest = digest;
  const packet = { ...payload, integrityDigest: { algorithm: "SHA-256", digest } };

  if (!webCryptoAvailable()) {
    markProfileState("Digest only");
    downloadPacketJson(packet, "packet");
    return;
  }

  try {
    const keys = await ensureDeviceKeys();
    if (!keys?.privateKey) {
      markProfileState("Digest only");
      downloadPacketJson(packet, "packet");
      return;
    }
    const bytes = canonicalJsonBytes(payload);
    const signature = await signPacket(bytes, keys.privateKey);
    const publicKey = await exportPublicJwk(keys.publicKey);
    state.packetSigned = true;
    renderSignStatus();
    markProfileState("Signed");
    downloadPacketJson(
      {
        ...packet,
        alg: PACKET_ALG,
        publicKey,
        signature
      },
      "signed"
    );
  } catch {
    markProfileState("Digest only");
    downloadPacketJson(packet, "packet");
  }
}

async function preparePrintReport() {
  const active = mission();
  const score = integrityScore();
  const continuity = continuityScore();
  const cover = coverage();
  const rows = buildPolicyRows(score);
  const coverageList = techniqueCoverage(rows);
  const loadDelay = Math.max(0, Math.round((decisionLoad() - 20) / 6));
  const ready = evidenceReady();

  // Prefer last export digest; otherwise compute a fresh one for the report.
  let digest = state.lastPacketDigest;
  if (!digest || digest === "unavailable") {
    digest = await digestText(JSON.stringify(buildPacketPayload()));
    state.lastPacketDigest = digest;
  }

  els.printMissionTitle.textContent = active.title;
  els.printMissionMeta.textContent = `${active.code} · ${active.sector} · ${lens().label} lens · ${horizon().label} horizon · Profile: ${state.activeProfileName}`;
  els.printIntegrity.textContent = `${score}%`;
  els.printContinuity.textContent = `${continuity}%`;
  els.printSafeguards.textContent = `${cover}%`;
  els.printDecisionLoad.textContent = String(decisionLoad());
  els.printDecisionSummary.textContent = `${decisionHeadline(score)}. ${decisionSummary(score)}`;
  els.printPressureSummary.textContent = `Pressure — agent ${state.pressure.agent}, supplier ${state.pressure.supplier}, data ${state.pressure.data} (avg ${pressureScore()}). Safeguards: approvals ${state.controls.approvals ? "on" : "off"}, recovery ${state.controls.recovery ? "on" : "off"}, attestation ${state.controls.attestation ? "on" : "off"}, privacy ${state.controls.privacy ? "on" : "off"}. Crown jewel: ${active.crownJewel}.`;

  els.printPolicyList.innerHTML = rows
    .map((row) => {
      const chips = row.techniques.map((id) => techniqueCatalog[id]?.label ?? id).join(", ");
      return `<li><strong>${escapeHtml(row.rule)}</strong><br><span class="print-chips">${escapeHtml(chips)}</span></li>`;
    })
    .join("");

  els.printTechniqueList.innerHTML = coverageList
    .map((t) => `<li><strong>${escapeHtml(t.label)}</strong> — ${escapeHtml(t.blurb)}</li>`)
    .join("");

  els.printTimelineList.innerHTML = active.timeline
    .map(([time, action], index) => {
      const minutes = Number.parseInt(time, 10) + index * loadDelay;
      return `<li><strong>${String(minutes).padStart(2, "0")}m</strong> — ${escapeHtml(action)}</li>`;
    })
    .join("");

  els.printEvidenceList.innerHTML = active.evidence
    .map((item, index) => {
      const mark = index < ready ? "☑" : "☐";
      return `<li>${mark} ${escapeHtml(item)}</li>`;
    })
    .join("");

  const csf = csfFunctions(...scoreArgs());
  const index = scoreResilienceIndex(...scoreArgs());
  const playbook = playbookBeats(...scoreArgs());
  if (els.printCsfList) {
    els.printCsfList.innerHTML = CSF_KEYS.map((key) => {
      return `<li><strong>${escapeHtml(CSF_LABELS[key])}</strong> — ${num(csf[key])}</li>`;
    }).join("");
  }
  if (els.printResilienceIndex) {
    els.printResilienceIndex.textContent = `Resilience index: ${num(index)}`;
  }
  if (els.printPlaybookList) {
    els.printPlaybookList.innerHTML = playbook
      .map((beat) => `<li><strong>${escapeHtml(beat.stage)}</strong> — ${escapeHtml(beat.action)}</li>`)
      .join("");
  }

  els.printGeneratedAt.textContent = `Generated ${new Date().toLocaleString()} · Aegis Horizon 2.0 · Local-first defensive twin`;
  els.printDigest.textContent =
    digest && digest !== "unavailable"
      ? `SHA-256 packet digest: ${digest}`
      : "SHA-256 packet digest: unavailable (WebCrypto not present)";
}

async function printReport() {
  await preparePrintReport();
  document.body.classList.add("is-printing");
  window.print();
  window.setTimeout(() => {
    document.body.classList.remove("is-printing");
  }, 400);
}

/* ─── Events ──────────────────────────────────────────────────────── */

function startRehearsal() {
  state.rehearsalStep = 0;
  els.rehearseButton.classList.add("is-busy");
  renderDashboard();
  window.setTimeout(() => els.rehearseButton.classList.remove("is-busy"), 460);
}

function nextRehearsalBeat() {
  const last = Math.max(0, mission().timeline.length - 1);
  state.rehearsalStep = Math.min(last, rehearsalIndex() + 1);
  renderDashboard();
}

function previousRehearsalBeat() {
  state.rehearsalStep = Math.max(0, rehearsalIndex() - 1);
  renderDashboard();
}

function resetRehearsal() {
  state.rehearsalStep = 0;
  renderDashboard();
}

function exportPacketCsv() {
  const csv = buildPacketCsv(integrityScore(), ...scoreArgs());
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `aegis-horizon-${mission().code.toLowerCase()}-packet.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportPacketMarkdown() {
  const markdown = packetMarkdown(integrityScore(), ...scoreArgs());
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `aegis-horizon-${mission().code.toLowerCase()}-packet.md`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function overlayOpen(el) {
  return Boolean(el) && !el.hidden;
}

function renderAdvice(score) {
  const items = postureAdvice(score, state);
  els.adviceList.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function csfRadarSvg(csf) {
  const cx = 72;
  const cy = 72;
  const radius = 50;
  const axis = (index, mag) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / CSF_KEYS.length;
    return [cx + Math.cos(angle) * mag, cy + Math.sin(angle) * mag];
  };
  const ring = (scale) => CSF_KEYS.map((_, index) => axis(index, radius * scale).map((n) => n.toFixed(1)).join(",")).join(" ");
  const valuePts = CSF_KEYS.map((key, index) =>
    axis(index, radius * (num(csf[key]) / 100)).map((n) => n.toFixed(1)).join(",")
  ).join(" ");
  const short = { govern: "GV", identify: "ID", protect: "PR", detect: "DE", respond: "RS", recover: "RC" };
  const labels = CSF_KEYS.map((key, index) => {
    const [x, y] = axis(index, radius + 14);
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle">${escapeHtml(short[key])}</text>`;
  }).join("");
  return `
    <svg class="csf-radar" viewBox="0 0 144 144" role="img" aria-hidden="true">
      <polygon class="csf-ring" points="${ring(1)}"></polygon>
      <polygon class="csf-ring" points="${ring(0.66)}"></polygon>
      <polygon class="csf-ring" points="${ring(0.33)}"></polygon>
      <polygon class="csf-value" points="${valuePts}"></polygon>
      ${labels}
    </svg>
  `;
}

function renderCsfPanel() {
  if (!els.csfPanel) return;
  const csf = csfFunctions(...scoreArgs());
  const index = scoreResilienceIndex(...scoreArgs());
  const bars = CSF_KEYS.map((key) => {
    const value = num(csf[key]);
    return `
      <div class="csf-bar">
        <span>${escapeHtml(CSF_LABELS[key])}</span>
        <div class="csf-track" aria-hidden="true"><i style="width:${value}%"></i></div>
        <strong>${value}</strong>
      </div>
    `;
  }).join("");
  els.csfPanel.innerHTML = `
    <div class="csf-head">
      <span>NIST CSF 2.0</span>
      <strong>Index ${num(index)}</strong>
    </div>
    <div class="csf-body">
      ${csfRadarSvg(csf)}
      <div class="csf-bars">${bars}</div>
    </div>
  `;
}

function renderPlaybook() {
  if (!els.playbookList) return;
  const beats = playbookBeats(...scoreArgs());
  if (els.playbookState) {
    els.playbookState.textContent = `${beats.length} beats`;
  }
  els.playbookList.innerHTML = beats
    .map((beat, index) => {
      return `
        <li>
          <span>${String(index + 1).padStart(2, "0")} ${escapeHtml(beat.stage)}</span>
          <p>${escapeHtml(beat.action)}</p>
        </li>
      `;
    })
    .join("");
}

function renderHorizonStrip() {
  const rows = horizonStrip(state, mission(), lens(), horizonProfiles, controlWeights);
  els.horizonStrip.innerHTML = rows
    .map((row) => {
      return `
        <div>
          <span>${escapeHtml(row.label)}</span>
          <strong>${row.integrity}</strong>
        </div>
      `;
    })
    .join("");
  const drop = horizonDrop(state, mission(), lens(), horizonProfiles, controlWeights);
  if (els.horizonDrop) {
    els.horizonDrop.textContent = drop
      ? `30d ${drop.at30} → 180d ${drop.at180} · drop ${drop.drop}`
      : "";
  }
  const continuity = continuityDrop(state, mission(), lens(), horizonProfiles, controlWeights);
  if (els.continuityDrop) {
    els.continuityDrop.textContent = continuity
      ? `continuity 30d ${continuity.at30} → 180d ${continuity.at180} · drop ${continuity.drop}`
      : "";
  }
}

function closeSweepModal() {
  closeOverlay(els.sweepModal);
}

function closeGapsModal() {
  closeOverlay(els.gapsModal);
}

function closeMissionCompareModal() {
  closeOverlay(els.missionCompareModal);
}

function closeHelpOverlay() {
  closeOverlay(els.helpOverlay);
}

function closeOverlays() {
  closeCompareModal();
  closeSweepModal();
  closeGapsModal();
  closeMissionCompareModal();
  closeHelpOverlay();
}

function renderSweepTable() {
  const samples = pressureSweep(...scoreArgs(), { key: "agent", steps: 9 });
  els.sweepTable.innerHTML = `
    <table class="compare-table sweep-table">
      <thead>
        <tr>
          <th>Agent pressure</th>
          <th>Integrity</th>
          <th>Continuity</th>
        </tr>
      </thead>
      <tbody>
        ${samples
          .map((row) => {
            return `
              <tr>
                <td>${Math.round(row.pressure)}</td>
                <td>${row.integrity}</td>
                <td>${row.continuity}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function openSweepModal() {
  closeOverlays();
  renderSweepTable();
  openOverlay(els.sweepModal, els.closeSweepModal);
}

function renderGapsTable() {
  const result = controlDeltas(...scoreArgs());
  const best = bestFlip(...scoreArgs());
  const worst = worstFlip(...scoreArgs());
  const bestLine = best
    ? `Best flip ${best.key} (${best.wouldBe ? "on" : "off"}) ${formatDelta(best.dIntegrity)} integrity.`
    : "No safeguard keys to flip.";
  const worstLine = worst
    ? ` Worst flip ${worst.key} (${worst.wouldBe ? "on" : "off"}) ${formatDelta(worst.dIntegrity)}.`
    : "";
  els.gapsTable.innerHTML = `
    <p class="muted-copy">Current integrity ${result.currentIntegrity}% · continuity ${result.currentContinuity}%. ${bestLine}${worstLine}</p>
    <table class="compare-table sweep-table">
      <thead>
        <tr>
          <th>key</th>
          <th>wouldBe</th>
          <th>dIntegrity</th>
        </tr>
      </thead>
      <tbody>
        ${result.flips
          .map((row) => {
            const isBest = best && row.key === best.key;
            const isWorst = worst && row.key === worst.key && (!best || worst.key !== best.key);
            const rowClass = isBest ? "is-best-flip" : isWorst ? "is-worst-flip" : "";
            return `
              <tr${rowClass ? ` class="${rowClass}"` : ""}>
                <td>${escapeHtml(row.key)}</td>
                <td>${row.wouldBe ? "true" : "false"}</td>
                <td class="${deltaClass(row.dIntegrity)}">${formatDelta(row.dIntegrity)}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function openGapsModal() {
  closeOverlays();
  renderGapsTable();
  openOverlay(els.gapsModal, els.closeGapsModal);
}

function missionOptionMarkup() {
  return Object.entries(missions)
    .map(([id, item]) => {
      return `<option value="${escapeHtml(id)}">${escapeHtml(id)} — ${escapeHtml(item.label)}</option>`;
    })
    .join("");
}

function fillMissionCompareSelects() {
  const markup = missionOptionMarkup();
  const previousA = els.missionCompareSelectA.value;
  const previousB = els.missionCompareSelectB.value;
  els.missionCompareSelectA.innerHTML = markup;
  els.missionCompareSelectB.innerHTML = markup;

  const ids = Object.keys(missions);
  const idA = missions[previousA] ? previousA : state.mission;
  const fallbackB = ids.find((id) => id !== idA) ?? idA;
  const idB = missions[previousB] && previousB !== idA ? previousB : fallbackB;

  els.missionCompareSelectA.value = idA;
  els.missionCompareSelectB.value = idB;
}

function renderMissionCompare() {
  const idA = els.missionCompareSelectA.value;
  const idB = els.missionCompareSelectB.value;
  if (!missions[idA] || !missions[idB]) {
    els.missionCompareResults.innerHTML = `<p class="muted-copy">Pick two missions to score at the current pressure and safeguards.</p>`;
    return;
  }

  const result = scoreCompareMissions(state, missions, lens(), horizon(), controlWeights, idA, idB);
  const labelA = missions[result.a.id]?.label ?? result.a.id;
  const labelB = missions[result.b.id]?.label ?? result.b.id;

  els.missionCompareResults.innerHTML = `
    <table class="compare-table">
      <thead>
        <tr>
          <th></th>
          <th>A · ${escapeHtml(labelA)}</th>
          <th>B · ${escapeHtml(labelB)}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>Id</th>
          <td>${escapeHtml(result.a.id)}</td>
          <td>${escapeHtml(result.b.id)}</td>
        </tr>
        <tr>
          <th>Integrity</th>
          <td>${result.a.integrity}%</td>
          <td>${result.b.integrity}%</td>
        </tr>
        <tr>
          <th>Continuity</th>
          <td>${result.a.continuity}%</td>
          <td>${result.b.continuity}%</td>
        </tr>
        <tr>
          <th>Coverage</th>
          <td>${result.a.coverage}%</td>
          <td>${result.b.coverage}%</td>
        </tr>
      </tbody>
    </table>
    <p class="muted-copy">Same pressure and safeguards; only the mission catalog entry is swapped.</p>
  `;
}

function openMissionCompareModal() {
  closeOverlays();
  fillMissionCompareSelects();
  renderMissionCompare();
  openOverlay(els.missionCompareModal, els.closeMissionCompareModal);
}

function openHelpOverlay() {
  closeOverlays();
  openOverlay(els.helpOverlay, els.closeHelpOverlay);
}

function syncHeatToggle() {
  els.heatToggle.classList.toggle("is-active", state.heat);
  els.heatToggle.setAttribute("aria-pressed", String(state.heat));
}

function toggleHeat() {
  state.heat = !state.heat;
  syncHeatToggle();
}

function bindEvents() {
  if (els.missionSearch) {
    els.missionSearch.addEventListener("input", () => {
      state.missionQuery = els.missionSearch.value;
      renderMissionButtons();
    });
  }

  els.missionButtons.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mission]");
    if (!button) return;
    state.mission = button.dataset.mission;
    state.rehearsalStep = 0;
    setPressed([...els.missionButtons.querySelectorAll("button")], state.mission, "mission");
    markProfileChanged();
    renderDashboard();
  });

  document.querySelectorAll("[data-lens]").forEach((button) => {
    button.addEventListener("click", () => {
      state.lens = button.dataset.lens;
      setPressed([...document.querySelectorAll("[data-lens]")], state.lens, "lens");
      markProfileChanged();
      renderDashboard();
    });
  });

  document.querySelectorAll("[data-horizon]").forEach((button) => {
    button.addEventListener("click", () => {
      state.horizon = Number(button.dataset.horizon);
      setPressed([...document.querySelectorAll("[data-horizon]")], state.horizon, "horizon");
      markProfileChanged();
      renderDashboard();
    });
  });

  [
    [els.agentRange, "agent"],
    [els.supplierRange, "supplier"],
    [els.dataRange, "data"]
  ].forEach(([input, key]) => {
    input.addEventListener("input", () => {
      state.pressure[key] = Number(input.value);
      markProfileChanged();
      renderDashboard();
    });
  });

  document.querySelectorAll("[data-control]").forEach((input) => {
    input.addEventListener("change", () => {
      state.controls[input.dataset.control] = input.checked;
      markProfileChanged();
      renderDashboard();
    });
  });

  els.rehearseButton.addEventListener("click", startRehearsal);
  els.nextBeatButton.addEventListener("click", nextRehearsalBeat);
  els.resetRehearsalButton.addEventListener("click", resetRehearsal);
  els.exportButton.addEventListener("click", () => void exportPacket());
  els.signPacketButton?.addEventListener("click", () => void signAndExportPacket());
  els.csvExportButton.addEventListener("click", exportPacketCsv);
  els.markdownExportButton.addEventListener("click", exportPacketMarkdown);
  els.printReportButton.addEventListener("click", () => void printReport());
  els.sweepButton.addEventListener("click", openSweepModal);
  els.gapsButton.addEventListener("click", openGapsModal);
  els.compareMissionsButton.addEventListener("click", openMissionCompareModal);
  els.heatToggle.addEventListener("click", toggleHeat);
  els.helpButton.addEventListener("click", openHelpOverlay);

  els.timelineList.addEventListener("click", (event) => {
    const item = event.target.closest("[data-beat]");
    if (!item) return;
    state.rehearsalStep = Number(item.dataset.beat);
    renderDashboard();
  });

  els.saveProfileButton.addEventListener("click", () => saveProfile());
  els.saveAsProfileButton.addEventListener("click", saveAsProfile);

  els.profileList.addEventListener("click", (event) => {
    const loadBtn = event.target.closest("[data-profile-load]");
    if (loadBtn) {
      loadNamedProfile(loadBtn.dataset.profileLoad);
      return;
    }
    const delBtn = event.target.closest("[data-profile-delete]");
    if (delBtn) {
      deleteNamedProfile(delBtn.dataset.profileDelete);
    }
  });

  els.exportPortfolioButton.addEventListener("click", exportPortfolio);
  els.importPortfolioButton.addEventListener("click", () => els.importPortfolioInput.click());
  els.importPortfolioInput.addEventListener("change", () => {
    const file = els.importPortfolioInput.files?.[0];
    if (file) importPortfolioFile(file);
    els.importPortfolioInput.value = "";
  });

  els.captureSnapshotButton.addEventListener("click", captureSnapshot);
  els.compareSnapshotsButton.addEventListener("click", openCompareModal);
  els.closeCompareModal.addEventListener("click", closeCompareModal);
  els.compareModal.addEventListener("click", (event) => {
    if (event.target === els.compareModal) closeCompareModal();
  });
  els.compareSelectA.addEventListener("change", renderCompareResults);
  els.compareSelectB.addEventListener("change", renderCompareResults);

  els.closeSweepModal.addEventListener("click", closeSweepModal);
  els.sweepModal.addEventListener("click", (event) => {
    if (event.target === els.sweepModal) closeSweepModal();
  });
  els.closeGapsModal.addEventListener("click", closeGapsModal);
  els.gapsModal.addEventListener("click", (event) => {
    if (event.target === els.gapsModal) closeGapsModal();
  });
  els.closeMissionCompareModal.addEventListener("click", closeMissionCompareModal);
  els.missionCompareModal.addEventListener("click", (event) => {
    if (event.target === els.missionCompareModal) closeMissionCompareModal();
  });
  els.missionCompareSelectA.addEventListener("change", renderMissionCompare);
  els.missionCompareSelectB.addEventListener("change", renderMissionCompare);
  els.closeHelpOverlay.addEventListener("click", closeHelpOverlay);
  els.helpOverlay.addEventListener("click", (event) => {
    if (event.target === els.helpOverlay) closeHelpOverlay();
  });

  els.snapshotList.addEventListener("click", (event) => {
    const delBtn = event.target.closest("[data-snapshot-delete]");
    if (delBtn) deleteSnapshot(delBtn.dataset.snapshotDelete);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (
        overlayOpen(els.compareModal) ||
        overlayOpen(els.sweepModal) ||
        overlayOpen(els.gapsModal) ||
        overlayOpen(els.missionCompareModal) ||
        overlayOpen(els.helpOverlay)
      ) {
        closeOverlays();
      }
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable='true']")) return;
    if (event.key === "?") {
      event.preventDefault();
      if (overlayOpen(els.helpOverlay)) closeHelpOverlay();
      else openHelpOverlay();
      return;
    }
    if (event.key === "r" || event.key === "R") {
      event.preventDefault();
      startRehearsal();
      return;
    }
    if (event.key === "n" || event.key === "N") {
      event.preventDefault();
      nextRehearsalBeat();
      return;
    }
    if (event.key === "0") {
      event.preventDefault();
      resetRehearsal();
      return;
    }
    if (event.key === "/") {
      event.preventDefault();
      els.missionSearch?.focus();
      return;
    }
    if (event.key === "s" || event.key === "S") {
      event.preventDefault();
      void signAndExportPacket();
      return;
    }
    if (event.key === "]") {
      event.preventDefault();
      nextRehearsalBeat();
    } else if (event.key === "[") {
      event.preventDefault();
      previousRehearsalBeat();
    }
  });

  window.addEventListener("beforeprint", () => {
    void preparePrintReport();
    document.body.classList.add("is-printing");
  });
  window.addEventListener("afterprint", () => {
    document.body.classList.remove("is-printing");
  });

  els.shareScenarioButton?.addEventListener("click", () => void shareScenario());
  // Pasting a scenario link into an already-open tab is a fragment-only
  // navigation, which does not reload the page — pick it up here too.
  window.addEventListener("hashchange", loadScenarioFromUrl);
  document.addEventListener("keydown", trapOverlayFocus, true);
  window.addEventListener("resize", drawContinuity);
  document.addEventListener("visibilitychange", syncTwinMotion);
  reducedMotion?.addEventListener?.("change", syncTwinMotion);
}

/* ─── Boot ────────────────────────────────────────────────────────── */

loadPortfolioFromStorage();
loadSnapshotsFromStorage();
renderMissionButtons();
els.profileNameInput.value = state.activeProfileName;
updateControlsFromState();
bindEvents();
syncHeatToggle();
renderProfileList();
renderSnapshotList();
renderDashboard();
tickUtcClock();
window.setInterval(tickUtcClock, 1000);
loadScenarioFromUrl();
startTwin();
