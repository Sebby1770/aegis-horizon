import { controlWeights, horizonProfiles, lenses, missions } from "./data.js";
import {
  techniqueCatalog,
  techniqueCoverage
} from "./techniques.js";
import {
  buildPacketCsv,
  buildPolicyRows as scorePolicyRows,
  clamp,
  continuityScore as scoreContinuity,
  coverage as scoreCoverage,
  decisionHeadline as scoreHeadline,
  decisionLoad as scoreDecisionLoad,
  decisionSummary as scoreSummary,
  evidenceReady as scoreEvidenceReady,
  integrityScore as scoreIntegrity,
  pressureScore as scorePressure,
  recoveryWindow as scoreRecoveryWindow,
  signalScore as scoreSignal
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
  rehearsalStep: 0
};

/** In-memory portfolio: { [name]: profilePayload } */
let portfolio = {};

/** In-memory snapshots: Array<{ id, name, capturedAt, ...metrics }> */
let snapshots = [];

const els = {
  missionButtons: document.querySelector("#missionButtons"),
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
  horizonCaption: document.querySelector("#horizonCaption"),
  decisionLoad: document.querySelector("#decisionLoad"),
  safeguardMetric: document.querySelector("#safeguardMetric"),
  recoveryWindow: document.querySelector("#recoveryWindow"),
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
  csvExportButton: document.querySelector("#csvExportButton"),
  printReportButton: document.querySelector("#printReportButton"),
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
  printGeneratedAt: document.querySelector("#printGeneratedAt"),
  printDigest: document.querySelector("#printDigest")
};

const twinCtx = els.twinCanvas.getContext("2d");
const continuityCtx = els.continuityCanvas.getContext("2d");

const colors = {
  background: "#0f1214",
  panel: "#14191a",
  line: "rgba(232, 239, 223, 0.13)",
  grid: "rgba(232, 239, 223, 0.07)",
  text: "#f3f6ea",
  muted: "#9aa59a",
  safe: "#8ff0b1",
  cyan: "#47d6ff",
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

function setPressed(buttons, activeValue, dataName) {
  buttons.forEach((button) => {
    const active = button.dataset[dataName] === String(activeValue);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderMissionButtons() {
  els.missionButtons.innerHTML = Object.entries(missions)
    .map(([key, item]) => {
      const active = key === state.mission ? " is-active" : "";
      const pressed = key === state.mission ? "true" : "false";
      return `
        <button class="mission-button${active}" type="button" data-mission="${key}" aria-pressed="${pressed}">
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
  els.mapTelemetry.textContent = `${active.nodes.length} assets, ${active.links.length} trust paths`;

  els.integrityRing.style.setProperty("--integrity", score);
  els.integrityRing.style.setProperty(
    "--integrity-color",
    score >= 66 ? colors.safe : score >= 48 ? colors.amber : colors.red
  );
  els.integrityScore.textContent = String(score);
  els.decisionHeadline.textContent = decisionHeadline(score);
  els.decisionSummary.textContent = decisionSummary(score);
  els.horizonCaption.textContent = `${horizon().caption} via ${lens().caption.toLowerCase()}`;
  els.decisionLoad.textContent = `${decisionLoad()} moves`;
  els.safeguardMetric.textContent = `${cover}%`;
  els.recoveryWindow.textContent = `${recoveryWindow()}m`;

  renderTimeline();
  renderPolicy(score);
  renderSignals();
  renderEvidence();
  drawContinuity();
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

function drawTwin(timestamp = 0) {
  if (timestamp - state.frameTime < 32) {
    requestAnimationFrame(drawTwin);
    return;
  }
  state.frameTime = timestamp;

  const rect = resizeCanvas(els.twinCanvas, twinCtx);
  const width = rect.width;
  const height = rect.height;
  const active = mission();
  const score = integrityScore();
  const pulse = state.pulse;

  twinCtx.clearRect(0, 0, width, height);
  twinCtx.fillStyle = colors.background;
  twinCtx.fillRect(0, 0, width, height);
  drawGrid(twinCtx, width, height);

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

  nodes.forEach((node, index) => {
    const nodeScore = clamp(node.weight * 100 + pressureScore() * 0.18 - coverage() * 0.08, 5, 98);
    const radius = 19 + node.weight * 17 + Math.sin(pulse * 0.035 + index) * 1.8;
    const color = typeColor[node.type] ?? colors.cyan;

    twinCtx.save();
    twinCtx.shadowColor = color;
    twinCtx.shadowBlur = node.type === "crown" ? 24 : 14;
    twinCtx.fillStyle = colors.panel;
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

  state.pulse += 1;
  requestAnimationFrame(drawTwin);
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
  continuityCtx.fillStyle = "#111618";
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
        snapshots = data.snapshots
          .filter((snap) => snap && snap.name && typeof snap.integrity === "number")
          .map((snap) => ({
            id: snap.id || `snap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: sanitizeName(snap.name, "Snapshot"),
            capturedAt: snap.capturedAt ?? new Date().toISOString(),
            mission: snap.mission,
            missionTitle: snap.missionTitle,
            lens: snap.lens,
            horizon: snap.horizon,
            integrity: snap.integrity,
            continuity: snap.continuity,
            decisionLoad: snap.decisionLoad,
            coverage: snap.coverage,
            pressure: snap.pressure ?? { agent: 0, supplier: 0, data: 0 },
            controls: snap.controls ?? {}
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
    const data = JSON.parse(stored);
    snapshots = Array.isArray(data) ? data : [];
  } catch {
    snapshots = [];
  }
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
            <small>I ${snap.integrity}% · C ${snap.continuity}% · ${escapeHtml(when)}</small>
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
              `<option value="${escapeHtml(snap.id)}">${escapeHtml(snap.name)} (${snap.integrity}/${snap.continuity})</option>`
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
          <td>${a.integrity}%</td>
          <td>${b.integrity}%</td>
          <td class="${deltaClass(dIntegrity)}">${formatDelta(dIntegrity, "%")}</td>
        </tr>
        <tr>
          <td>Continuity</td>
          <td>${a.continuity}%</td>
          <td>${b.continuity}%</td>
          <td class="${deltaClass(dContinuity)}">${formatDelta(dContinuity, "%")}</td>
        </tr>
        <tr>
          <td>Decision load</td>
          <td>${a.decisionLoad}</td>
          <td>${b.decisionLoad}</td>
          <td class="${deltaClass(-dLoad)}">${formatDelta(dLoad)}</td>
        </tr>
        <tr>
          <td>Safeguards</td>
          <td>${a.coverage}%</td>
          <td>${b.coverage}%</td>
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
  fillCompareSelects();
  renderCompareResults();
  els.compareModal.hidden = false;
  els.closeCompareModal.focus();
}

function closeCompareModal() {
  els.compareModal.hidden = true;
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
    profileName: state.activeProfileName,
    generatedAt: new Date().toISOString()
  };
}

function techniqueLabelsSafe(ids) {
  return ids.map((id) => techniqueCatalog[id]?.label ?? id);
}

async function exportPacket() {
  const payload = buildPacketPayload();
  const digest = await digestText(JSON.stringify(payload));
  state.lastPacketDigest = digest;
  const packet = { ...payload, integrityDigest: { algorithm: "SHA-256", digest } };
  const blob = new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `aegis-horizon-${mission().code.toLowerCase()}-packet.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

  els.printGeneratedAt.textContent = `Generated ${new Date().toLocaleString()} · Aegis Horizon 1.2 · Local-first defensive twin`;
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

function bindEvents() {
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
  els.csvExportButton.addEventListener("click", exportPacketCsv);
  els.printReportButton.addEventListener("click", () => void printReport());

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

  els.snapshotList.addEventListener("click", (event) => {
    const delBtn = event.target.closest("[data-snapshot-delete]");
    if (delBtn) deleteSnapshot(delBtn.dataset.snapshotDelete);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.compareModal.hidden) {
      closeCompareModal();
      return;
    }
    if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable='true']")) return;
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

  window.addEventListener("resize", drawContinuity);
}

/* ─── Boot ────────────────────────────────────────────────────────── */

loadPortfolioFromStorage();
loadSnapshotsFromStorage();
renderMissionButtons();
els.profileNameInput.value = state.activeProfileName;
updateControlsFromState();
bindEvents();
renderProfileList();
renderSnapshotList();
renderDashboard();
drawTwin();
