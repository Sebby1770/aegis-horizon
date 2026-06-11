import { controlWeights, horizonProfiles, lenses, missions } from "./data.js";
import { normalizeProfile, profileStorageKey } from "./profile.js";

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
  pulse: 0,
  frameTime: 0
};

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
  agentRange: document.querySelector("#agentRange"),
  supplierRange: document.querySelector("#supplierRange"),
  dataRange: document.querySelector("#dataRange"),
  rehearseButton: document.querySelector("#rehearseButton"),
  exportButton: document.querySelector("#exportButton"),
  saveProfileButton: document.querySelector("#saveProfileButton"),
  loadProfileButton: document.querySelector("#loadProfileButton")
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mission() {
  return missions[state.mission];
}

function lens() {
  return lenses[state.lens];
}

function horizon() {
  return horizonProfiles[state.horizon] ?? horizonProfiles[90];
}

function pressureScore() {
  return Math.round((state.pressure.agent + state.pressure.supplier + state.pressure.data) / 3);
}

function coverage() {
  const enabled = Object.entries(state.controls).reduce((total, [key, enabled]) => {
    return total + (enabled ? controlWeights[key] : 0);
  }, 0);
  const total = Object.values(controlWeights).reduce((sum, value) => sum + value, 0);
  return Math.round((enabled / total) * 100);
}

function integrityScore() {
  const active = mission();
  const pressurePenalty =
    state.pressure.agent * 0.15 + state.pressure.supplier * 0.12 + state.pressure.data * 0.11;
  const safeguardLift = coverage() * 0.28;
  const recoveryLift = state.controls.recovery ? 4 : -4;
  const attestationLift = state.controls.attestation ? 4 : -3;
  return clamp(
    Math.round(active.baseIntegrity + safeguardLift - pressurePenalty - horizon().drift + lens().integrityShift + recoveryLift + attestationLift),
    12,
    98
  );
}

function continuityScore() {
  const active = mission();
  const recoveryLift = state.controls.recovery ? 10 : -8;
  const privacyLift = state.controls.privacy ? 3 : -4;
  return clamp(Math.round(active.continuity + coverage() * 0.16 - pressureScore() * 0.13 - horizon().drift + recoveryLift + privacyLift), 8, 98);
}

function decisionLoad() {
  const horizonLoad = state.horizon === 180 ? 10 : state.horizon === 30 ? -2 : 4;
  return clamp(Math.round(12 + pressureScore() * 0.34 + mission().nodes.length + lens().loadShift + horizonLoad - coverage() * 0.09), 4, 72);
}

function evidenceReady() {
  return Object.values(state.controls).filter(Boolean).length;
}

function signalScore() {
  return clamp(mission().signal + Math.round((coverage() - 70) / 5) - Math.round((pressureScore() - 50) / 8), 42, 99);
}

function recoveryWindow() {
  const lastStep = mission().timeline.at(-1)?.[0] ?? "30m";
  const baseline = Number.parseInt(lastStep, 10) || 30;
  const delay = Math.max(0, Math.round((decisionLoad() - 24) / 3));
  return clamp(baseline + delay - (state.controls.recovery ? 5 : 0), 12, 96);
}

function band(score) {
  if (score >= 82) return "Resilient";
  if (score >= 66) return "Ready";
  if (score >= 48) return "Tense";
  return "Fragile";
}

function decisionHeadline(score) {
  if (score >= 82) return "Resilient by design";
  if (score >= 66) return "Continuity-first posture";
  if (score >= 48) return "Decision friction building";
  return "Policy debt is visible";
}

function decisionSummary(score) {
  const active = mission();
  if (score >= 82) return `${active.crownJewel} has enough evidence for a high-confidence ${lens().caption.toLowerCase()}.`;
  if (score >= 66) return `${active.crownJewel} is defensible, but the next rehearsal should reduce authority and supplier ambiguity.`;
  if (score >= 48) return `${active.crownJewel} needs clearer approval paths before the ${horizon().label} horizon arrives.`;
  return `${active.crownJewel} should not absorb more autonomy until missing safeguards are restored.`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en").format(value);
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

function generatedPolicies(score) {
  const active = mission();
  const policies = [];

  if (!state.controls.approvals) policies.push(`IF ${active.crownJewel} changes THEN require named owner approval before action.`);
  if (!state.controls.recovery) policies.push("IF continuity confidence drops THEN activate an offline recovery owner before automation proceeds.");
  if (!state.controls.attestation) policies.push("IF a system writes to a crown-jewel path THEN attach signed evidence to the decision record.");
  if (!state.controls.privacy) policies.push("IF people or sensitive context appears THEN enforce a privacy boundary before publishing.");
  if (state.pressure.agent > 64) policies.push("IF agent authority rises above threshold THEN convert high-impact actions to draft-only mode.");
  if (state.pressure.supplier > 64) policies.push("IF supplier coupling rises THEN require provenance before system-to-system trust.");
  if (score < 55) policies.push("IF integrity is tense THEN pause new autonomy until safeguards are restored.");

  return [...policies, ...active.policies].slice(0, 5);
}

function renderPolicy(score) {
  const rules = generatedPolicies(score);
  els.policyState.textContent = score >= 66 ? "Compiled" : "Repair";
  els.policyList.innerHTML = rules
    .map((rule, index) => {
      return `
        <article class="policy-row">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <p>${escapeHtml(rule)}</p>
        </article>
      `;
    })
    .join("");
}

function renderTimeline() {
  const loadDelay = Math.max(0, Math.round((decisionLoad() - 20) / 6));
  els.timelineClock.textContent = `${recoveryWindow()}m`;
  els.timelineList.innerHTML = mission().timeline
    .map(([time, action], index) => {
      const minutes = Number.parseInt(time, 10) + index * loadDelay;
      return `
        <li>
          <span>${String(minutes).padStart(2, "0")}m</span>
          <p>${escapeHtml(action)}</p>
        </li>
      `;
    })
    .join("");
}

function renderSignals() {
  const score = signalScore();
  els.signalScore.textContent = `${score}%`;
  els.signalList.innerHTML = mission().signals
    .map((signal, index) => {
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
  els.integrityRing.style.setProperty("--integrity-color", score >= 66 ? colors.safe : score >= 48 ? colors.amber : colors.red);
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

    twinCtx.strokeStyle = linkColor === colors.red
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

function saveProfile() {
  try {
    window.localStorage.setItem(profileStorageKey, JSON.stringify(profilePayload()));
    markProfileState("Saved");
  } catch {
    markProfileState("Blocked");
  }
}

function loadProfile() {
  try {
    const stored = window.localStorage.getItem(profileStorageKey);
    if (!stored) {
      markProfileState("Empty");
      return;
    }

    const profile = normalizeProfile(JSON.parse(stored), state, {
      missions,
      lenses,
      horizons: horizonProfiles
    });
    if (!profile) {
      markProfileState("Invalid");
      return;
    }

    state.mission = profile.mission;
    state.lens = profile.lens;
    state.horizon = profile.horizon;
    state.pressure = profile.pressure;
    state.controls = profile.controls;

    updateControlsFromState();
    renderDashboard();
    markProfileState("Loaded");
  } catch {
    markProfileState("Invalid");
  }
}

function setInitialProfileState() {
  try {
    markProfileState(window.localStorage.getItem(profileStorageKey) ? "Saved" : "Unsaved");
  } catch {
    markProfileState("Local");
  }
}

function runRehearsal() {
  els.rehearseButton.classList.add("is-busy");
  const direction = Math.random() > 0.5 ? 5 : -4;
  state.pressure.agent = clamp(state.pressure.agent + direction, 0, 100);
  state.pressure.supplier = clamp(state.pressure.supplier + Math.round(direction / 2), 0, 100);
  state.pressure.data = clamp(state.pressure.data + (Math.random() > 0.5 ? 3 : -2), 0, 100);
  updateControlsFromState();
  markProfileChanged();
  renderDashboard();
  window.setTimeout(() => els.rehearseButton.classList.remove("is-busy"), 460);
}

async function digestText(text) {
  if (!window.crypto?.subtle) return "unavailable";
  const buffer = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function exportPacket() {
  const active = mission();
  const payload = {
    project: "Aegis Horizon",
    mode: "resilience-twin-studio",
    mission: active.title,
    code: active.code,
    sector: active.sector,
    crownJewel: active.crownJewel,
    decisionLens: lens().label,
    horizonDays: state.horizon,
    integrity: integrityScore(),
    continuity: continuityScore(),
    decisionLoad: decisionLoad(),
    pressure: { ...state.pressure },
    safeguards: { ...state.controls },
    tabletopTimeline: active.timeline,
    generatedPolicies: generatedPolicies(integrityScore()),
    futuresSignals: active.signals,
    evidence: active.evidence,
    generatedAt: new Date().toISOString()
  };
  const digest = await digestText(JSON.stringify(payload));
  const packet = { ...payload, integrityDigest: { algorithm: "SHA-256", digest } };
  const blob = new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `aegis-horizon-${active.code.toLowerCase()}-packet.json`;
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

  els.rehearseButton.addEventListener("click", runRehearsal);
  els.exportButton.addEventListener("click", () => void exportPacket());
  els.saveProfileButton.addEventListener("click", saveProfile);
  els.loadProfileButton.addEventListener("click", loadProfile);
  window.addEventListener("resize", drawContinuity);
}

renderMissionButtons();
bindEvents();
setInitialProfileState();
renderDashboard();
drawTwin();
