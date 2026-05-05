import { controlWeights, modeProfiles, scenarios } from "./data.js";

const state = {
  scenario: "identity",
  mode: "monitor",
  horizon: 90,
  ranges: {
    identity: 42,
    cloud: 35,
    data: 58
  },
  controls: {
    mfa: true,
    edr: true,
    backups: true,
    secrets: false
  },
  pulse: 0
};

const profileStorageKey = "aegis-horizon-profile";

const horizonProfiles = {
  30: { label: "30d", riskPressure: -2, futureBoost: 0.92, caption: "Near-term control maturity projection" },
  90: { label: "90d", riskPressure: 2, futureBoost: 1, caption: "Quarterly control maturity projection" },
  180: { label: "180d", riskPressure: 7, futureBoost: 1.12, caption: "Long-range resilience projection" }
};

const els = {
  scenarioButtons: document.querySelector("#scenarioButtons"),
  scenarioCode: document.querySelector("#scenarioCode"),
  scenarioTitle: document.querySelector("#scenarioTitle"),
  missionSubtitle: document.querySelector("#missionSubtitle"),
  modeLabel: document.querySelector("#modeLabel"),
  horizonLabel: document.querySelector("#horizonLabel"),
  exposureValue: document.querySelector("#exposureValue"),
  coverageScore: document.querySelector("#coverageScore"),
  signalScore: document.querySelector("#signalScore"),
  assetCount: document.querySelector("#assetCount"),
  mttrScore: document.querySelector("#mttrScore"),
  autonomyScore: document.querySelector("#autonomyScore"),
  riskRing: document.querySelector("#riskRing"),
  riskScore: document.querySelector("#riskScore"),
  riskHeadline: document.querySelector("#riskHeadline"),
  riskSummary: document.querySelector("#riskSummary"),
  futureNote: document.querySelector("#futureNote"),
  blastRadius: document.querySelector("#blastRadius"),
  trustCoverage: document.querySelector("#trustCoverage"),
  containmentScore: document.querySelector("#containmentScore"),
  mapLabel: document.querySelector("#mapLabel"),
  mapState: document.querySelector("#mapState"),
  mapTelemetry: document.querySelector("#mapTelemetry"),
  incidentList: document.querySelector("#incidentList"),
  queueCount: document.querySelector("#queueCount"),
  playbookList: document.querySelector("#playbookList"),
  playbookClock: document.querySelector("#playbookClock"),
  futureScore: document.querySelector("#futureScore"),
  forecastCaption: document.querySelector("#forecastCaption"),
  autopilotList: document.querySelector("#autopilotList"),
  autopilotState: document.querySelector("#autopilotState"),
  profileState: document.querySelector("#profileState"),
  identityRange: document.querySelector("#identityRange"),
  cloudRange: document.querySelector("#cloudRange"),
  dataRange: document.querySelector("#dataRange"),
  threatCanvas: document.querySelector("#threatCanvas"),
  forecastCanvas: document.querySelector("#forecastCanvas"),
  forecastButton: document.querySelector("#forecastButton"),
  exportButton: document.querySelector("#exportButton"),
  saveProfileButton: document.querySelector("#saveProfileButton"),
  loadProfileButton: document.querySelector("#loadProfileButton")
};

const threatCtx = els.threatCanvas.getContext("2d");
const forecastCtx = els.forecastCanvas.getContext("2d");
const colors = {
  background: "#111412",
  grid: "rgba(242, 244, 232, 0.08)",
  text: "#F2F4E8",
  muted: "#9DA89D",
  safe: "#7CFFB2",
  watch: "#FFB84C",
  hot: "#FF5D73",
  cool: "#2ED3FF"
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function activeScenario() {
  return scenarios[state.scenario];
}

function horizonProfile() {
  return horizonProfiles[state.horizon] ?? horizonProfiles[90];
}

function coverage() {
  const enabled = Object.entries(state.controls).reduce((total, [key, isOn]) => {
    return total + (isOn ? controlWeights[key] : 0);
  }, 0);
  const total = Object.values(controlWeights).reduce((sum, value) => sum + value, 0);
  return Math.round((enabled / total) * 100);
}

function exposure() {
  return Math.round((state.ranges.identity + state.ranges.cloud + state.ranges.data) / 3);
}

function riskScore() {
  const scenario = activeScenario();
  const horizon = horizonProfile();
  const exposurePressure =
    state.ranges.identity * 0.17 +
    state.ranges.cloud * 0.14 +
    state.ranges.data * 0.12;
  const coverageRelief = coverage() * 0.24;
  const modeShift = modeProfiles[state.mode].riskShift;
  const longRangePressure = exposure() > 62 ? Math.round((state.horizon / 180) * 5) : 0;
  return clamp(
    Math.round(scenario.baseRisk + exposurePressure - coverageRelief + modeShift + horizon.riskPressure + longRangePressure),
    8,
    97
  );
}

function riskBand(score) {
  if (score >= 72) return "Critical";
  if (score >= 52) return "Medium";
  if (score >= 32) return "Managed";
  return "Low";
}

function riskColor(score) {
  if (score >= 72) return colors.hot;
  if (score >= 52) return colors.watch;
  return colors.safe;
}

function containmentMinutes() {
  const scenario = activeScenario();
  const score = riskScore();
  const modeFactor = modeProfiles[state.mode].containment;
  const controlFactor = 1 - coverage() / 300;
  const horizonFactor = state.horizon === 180 ? 1.08 : state.horizon === 30 ? 0.94 : 1;
  return clamp(Math.round((scenario.mttr + score * 0.25) * modeFactor * controlFactor * horizonFactor), 8, 90);
}

function autonomyScore() {
  const modeBonus = { monitor: 0, harden: 5, contain: 9 }[state.mode];
  const secretBonus = state.controls.secrets ? 8 : -4;
  return clamp(Math.round(46 + coverage() * 0.42 - riskScore() * 0.16 - exposure() * 0.08 + modeBonus + secretBonus), 18, 98);
}

function futureLift() {
  const future = activeScenario().future;
  const horizonBoost = state.horizon === 180 ? 7 : state.horizon === 30 ? -3 : 0;
  return Math.max(8, future[future.length - 1] - future[0] - Math.round(riskScore() / 12) + horizonBoost);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en").format(value);
}

function setPressed(buttons, activeValue, dataName) {
  buttons.forEach((button) => {
    const active = button.dataset[dataName] === String(activeValue);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
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

function renderScenarioButtons() {
  els.scenarioButtons.innerHTML = Object.entries(scenarios)
    .map(([key, scenario]) => {
      const active = key === state.scenario ? " is-active" : "";
      const pressed = key === state.scenario ? "true" : "false";
      return `
        <button class="scenario-button${active}" type="button" data-scenario="${key}" aria-pressed="${pressed}">
          <span aria-hidden="true">${scenario.code.split("-")[0]}</span>
          <strong>${scenario.label}</strong>
        </button>
      `;
    })
    .join("");
}

function renderIncidents(score) {
  const severityRank = { High: 3, Medium: 2, Low: 1 };
  const incidents = [...activeScenario().incidents].sort((a, b) => severityRank[b[0]] - severityRank[a[0]]);
  els.queueCount.textContent = `${incidents.length} signals`;
  els.incidentList.innerHTML = incidents
    .map(([severity, title], index) => {
      const heat = severity === "High" || score > 70 ? "hot" : severity === "Medium" ? "watch" : "safe";
      return `
        <article class="incident-row" data-heat="${heat}">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <div>
            <strong>${title}</strong>
            <small>${severity} priority</small>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderPlaybook(minutes) {
  els.playbookClock.textContent = `${minutes + 26}m`;
  els.playbookList.innerHTML = activeScenario().playbook
    .map((item, index) => `<li><span>${index + 1}</span><p>${escapeHtml(item)}</p></li>`)
    .join("");
}

function recommendedActions(score) {
  const actions = [];

  if (!state.controls.mfa) actions.push("Reinstate phishing-resistant MFA for all privileged paths");
  if (!state.controls.edr) actions.push("Restore endpoint telemetry before expanding autonomous response");
  if (!state.controls.backups) actions.push("Verify restore integrity against the most critical services");
  if (!state.controls.secrets) actions.push("Rotate high-value secrets and shorten delegated token life");
  if (state.ranges.identity > 64) actions.push("Compress dormant identity access and require step-up checks");
  if (state.ranges.cloud > 64) actions.push("Reconcile cloud drift against approved infrastructure state");
  if (state.ranges.data > 64) actions.push("Reduce sensitive data concentration before long-range exposure grows");
  if (score >= 72) actions.push("Move response mode to containment until the queue cools below critical");

  activeScenario().playbook.forEach((item) => actions.push(item));

  return [...new Set(actions)].slice(0, 4);
}

function renderAutopilot(score) {
  els.autopilotState.textContent = score >= 72 ? "Act now" : score >= 52 ? "Tune" : "Ready";
  els.autopilotList.innerHTML = recommendedActions(score)
    .map((action, index) => {
      return `
        <article class="autopilot-row">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <p>${escapeHtml(action)}</p>
        </article>
      `;
    })
    .join("");
}

function forecastData() {
  const horizon = horizonProfile();
  const controlBoost = coverage() * 0.08;
  const riskDrag = riskScore() * 0.05;
  const exposureDrag = Math.max(0, exposure() - 50) * 0.04;
  return activeScenario().future.map((value, index) => {
    const horizonSlope = state.horizon === 180 ? index * 1.2 : state.horizon === 30 ? index * -0.35 : index * 0.35;
    return clamp(value * horizon.futureBoost + controlBoost - riskDrag - exposureDrag + horizonSlope, 10, 98);
  });
}

function futureNote(score) {
  const band = riskBand(score).toLowerCase();
  if (state.horizon === 180) return `180-day ${band} posture with long-range drift pressure.`;
  if (state.horizon === 30) return `30-day ${band} posture focused on immediate containment.`;
  return `90-day ${band} posture with quarterly resilience lift.`;
}

function renderDashboard() {
  const scenario = activeScenario();
  const score = riskScore();
  const cover = coverage();
  const minutes = containmentMinutes();
  const horizon = horizonProfile();

  els.scenarioCode.textContent = scenario.code;
  els.scenarioTitle.textContent = scenario.title;
  els.missionSubtitle.textContent = `${horizon.label} local-only posture forecast`;
  els.mapLabel.textContent = scenario.mapLabel;
  els.mapState.textContent = state.mode === "contain" ? "Containment live" : state.mode === "harden" ? "Hardening wave" : "Active watch";
  els.mapTelemetry.textContent = `${scenario.nodes.length} nodes, ${scenario.links.length} trust paths`;
  els.modeLabel.textContent = modeProfiles[state.mode].label;
  els.horizonLabel.textContent = horizon.label;
  els.exposureValue.textContent = String(exposure());
  els.coverageScore.textContent = `${cover}%`;
  els.signalScore.textContent = `${clamp(scenario.signal + Math.round((cover - 70) / 4), 44, 99)}%`;
  els.assetCount.textContent = formatNumber(scenario.assets + Math.round(exposure() * 9));
  els.mttrScore.textContent = `${minutes}m`;
  els.autonomyScore.textContent = `${autonomyScore()}%`;

  els.riskRing.style.setProperty("--risk", score);
  els.riskRing.style.setProperty("--risk-color", riskColor(score));
  els.riskScore.textContent = String(score);
  els.riskHeadline.textContent = scenario.headline;
  els.riskSummary.textContent = scenario.summary;
  els.futureNote.textContent = futureNote(score);
  els.blastRadius.textContent = riskBand(score);
  els.trustCoverage.textContent = `${cover}%`;
  els.containmentScore.textContent = `${minutes}m`;
  els.futureScore.textContent = `+${futureLift()}%`;
  els.forecastCaption.textContent = horizon.caption;

  renderIncidents(score);
  renderPlaybook(minutes);
  renderAutopilot(score);
  drawForecast();
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

function drawGrid(ctx, width, height) {
  ctx.save();
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 42) {
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

function drawThreatMap() {
  const rect = resizeCanvas(els.threatCanvas, threatCtx);
  const width = rect.width;
  const height = rect.height;
  const scenario = activeScenario();
  const score = riskScore();
  const pulse = state.pulse;

  threatCtx.clearRect(0, 0, width, height);
  threatCtx.fillStyle = colors.background;
  threatCtx.fillRect(0, 0, width, height);
  drawGrid(threatCtx, width, height);

  const nodes = scenario.nodes.map((node) => ({
    ...node,
    px: node.x * width,
    py: node.y * height
  }));

  threatCtx.save();
  threatCtx.lineCap = "round";
  scenario.links.forEach(([fromId, toId], index) => {
    const from = nodeById(nodes, fromId);
    const to = nodeById(nodes, toId);
    const intensity = (Math.sin(pulse * 0.045 + index) + 1) / 2;
    threatCtx.strokeStyle = `rgba(46, 211, 255, ${0.16 + intensity * 0.28})`;
    threatCtx.lineWidth = 2 + intensity * 2;
    threatCtx.beginPath();
    threatCtx.moveTo(from.px, from.py);
    threatCtx.bezierCurveTo(
      (from.px + to.px) / 2,
      from.py - 64 + intensity * 32,
      (from.px + to.px) / 2,
      to.py + 64 - intensity * 28,
      to.px,
      to.py
    );
    threatCtx.stroke();

    const t = (pulse * 0.01 + index * 0.17) % 1;
    const particleX = from.px + (to.px - from.px) * t;
    const particleY = from.py + (to.py - from.py) * t;
    threatCtx.fillStyle = riskColor(score);
    threatCtx.beginPath();
    threatCtx.arc(particleX, particleY, 3.4, 0, Math.PI * 2);
    threatCtx.fill();
  });
  threatCtx.restore();

  nodes.forEach((node, index) => {
    const nodeRisk = clamp(node.weight * 100 + score * 0.18, 0, 100);
    const radius = 20 + node.weight * 20 + Math.sin(pulse * 0.035 + index) * 2;
    const color = nodeRisk > 70 ? colors.hot : nodeRisk > 52 ? colors.watch : colors.safe;

    threatCtx.save();
    threatCtx.shadowColor = color;
    threatCtx.shadowBlur = 18;
    threatCtx.fillStyle = "rgba(17, 20, 18, 0.92)";
    threatCtx.strokeStyle = color;
    threatCtx.lineWidth = 2;
    threatCtx.beginPath();
    threatCtx.arc(node.px, node.py, radius, 0, Math.PI * 2);
    threatCtx.fill();
    threatCtx.stroke();
    threatCtx.shadowBlur = 0;

    threatCtx.fillStyle = colors.text;
    threatCtx.font = "700 13px Inter, ui-sans-serif, system-ui, sans-serif";
    threatCtx.textAlign = "center";
    threatCtx.fillText(node.id, node.px, node.py + radius + 22);
    threatCtx.fillStyle = colors.muted;
    threatCtx.font = "600 11px Inter, ui-sans-serif, system-ui, sans-serif";
    threatCtx.fillText(`${Math.round(nodeRisk)}%`, node.px, node.py + 4);
    threatCtx.restore();
  });

  state.pulse += 1;
  requestAnimationFrame(drawThreatMap);
}

function drawForecast() {
  const rect = resizeCanvas(els.forecastCanvas, forecastCtx);
  const width = rect.width;
  const height = rect.height;
  const data = forecastData();
  const padding = 28;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  forecastCtx.clearRect(0, 0, width, height);
  forecastCtx.fillStyle = "#151916";
  forecastCtx.fillRect(0, 0, width, height);
  drawGrid(forecastCtx, width, height);

  forecastCtx.save();
  forecastCtx.strokeStyle = "rgba(157, 168, 157, 0.35)";
  forecastCtx.lineWidth = 1;
  forecastCtx.beginPath();
  forecastCtx.moveTo(padding, height - padding);
  forecastCtx.lineTo(width - padding, height - padding);
  forecastCtx.stroke();

  forecastCtx.strokeStyle = colors.safe;
  forecastCtx.lineWidth = 4;
  forecastCtx.beginPath();
  data.forEach((value, index) => {
    const x = padding + (innerWidth / (data.length - 1)) * index;
    const y = height - padding - (value / 100) * innerHeight;
    if (index === 0) {
      forecastCtx.moveTo(x, y);
    } else {
      forecastCtx.lineTo(x, y);
    }
  });
  forecastCtx.stroke();

  data.forEach((value, index) => {
    const x = padding + (innerWidth / (data.length - 1)) * index;
    const y = height - padding - (value / 100) * innerHeight;
    forecastCtx.fillStyle = index === data.length - 1 ? colors.watch : colors.cool;
    forecastCtx.beginPath();
    forecastCtx.arc(x, y, 5, 0, Math.PI * 2);
    forecastCtx.fill();
  });
  forecastCtx.restore();
}

function runForecastPulse() {
  els.forecastButton.classList.add("is-busy");
  const direction = Math.random() > 0.5 ? 4 : -4;
  state.ranges.identity = clamp(state.ranges.identity + direction, 0, 100);
  state.ranges.cloud = clamp(state.ranges.cloud + Math.round(direction / 2), 0, 100);
  els.identityRange.value = String(state.ranges.identity);
  els.cloudRange.value = String(state.ranges.cloud);
  markProfileChanged();
  renderDashboard();
  window.setTimeout(() => els.forecastButton.classList.remove("is-busy"), 420);
}

async function digestText(text) {
  if (!window.crypto?.subtle) return "unavailable";
  const buffer = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function exportBrief() {
  const scenario = activeScenario();
  const brief = {
    project: "Aegis Horizon",
    scenario: scenario.title,
    code: scenario.code,
    mode: modeProfiles[state.mode].label,
    horizonDays: state.horizon,
    risk: riskScore(),
    coverage: coverage(),
    autonomy: autonomyScore(),
    exposure: exposure(),
    containmentMinutes: containmentMinutes(),
    incidents: scenario.incidents,
    playbook: scenario.playbook,
    autopilot: recommendedActions(riskScore()),
    controls: state.controls,
    ranges: state.ranges,
    generatedAt: new Date().toISOString()
  };
  const digest = await digestText(JSON.stringify(brief));
  const payload = { ...brief, integrity: { algorithm: "SHA-256", digest } };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `aegis-horizon-${scenario.code.toLowerCase()}-brief.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function markProfileState(label) {
  els.profileState.textContent = label;
}

function markProfileChanged() {
  markProfileState("Changed");
}

function profilePayload() {
  return {
    scenario: state.scenario,
    mode: state.mode,
    horizon: state.horizon,
    ranges: { ...state.ranges },
    controls: { ...state.controls },
    savedAt: new Date().toISOString()
  };
}

function updateControlsFromState() {
  els.identityRange.value = String(state.ranges.identity);
  els.cloudRange.value = String(state.ranges.cloud);
  els.dataRange.value = String(state.ranges.data);

  document.querySelectorAll("[data-control]").forEach((input) => {
    input.checked = Boolean(state.controls[input.dataset.control]);
  });

  setPressed([...els.scenarioButtons.querySelectorAll("button")], state.scenario, "scenario");
  setPressed([...document.querySelectorAll("[data-mode]")], state.mode, "mode");
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

    const profile = JSON.parse(stored);
    if (!scenarios[profile.scenario] || !modeProfiles[profile.mode] || !horizonProfiles[profile.horizon]) {
      markProfileState("Invalid");
      return;
    }

    state.scenario = profile.scenario;
    state.mode = profile.mode;
    state.horizon = Number(profile.horizon);
    state.ranges = {
      identity: clamp(Number(profile.ranges?.identity ?? state.ranges.identity), 0, 100),
      cloud: clamp(Number(profile.ranges?.cloud ?? state.ranges.cloud), 0, 100),
      data: clamp(Number(profile.ranges?.data ?? state.ranges.data), 0, 100)
    };
    state.controls = {
      mfa: Boolean(profile.controls?.mfa),
      edr: Boolean(profile.controls?.edr),
      backups: Boolean(profile.controls?.backups),
      secrets: Boolean(profile.controls?.secrets)
    };

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

function bindEvents() {
  els.scenarioButtons.addEventListener("click", (event) => {
    const button = event.target.closest("[data-scenario]");
    if (!button) return;
    state.scenario = button.dataset.scenario;
    setPressed([...els.scenarioButtons.querySelectorAll("button")], state.scenario, "scenario");
    renderDashboard();
  });

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      setPressed([...document.querySelectorAll("[data-mode]")], state.mode, "mode");
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
    [els.identityRange, "identity"],
    [els.cloudRange, "cloud"],
    [els.dataRange, "data"]
  ].forEach(([input, key]) => {
    input.addEventListener("input", () => {
      state.ranges[key] = Number(input.value);
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

  els.forecastButton.addEventListener("click", runForecastPulse);
  els.exportButton.addEventListener("click", () => void exportBrief());
  els.saveProfileButton.addEventListener("click", saveProfile);
  els.loadProfileButton.addEventListener("click", loadProfile);
  window.addEventListener("resize", drawForecast);
}

renderScenarioButtons();
bindEvents();
setInitialProfileState();
renderDashboard();
drawThreatMap();
