import { controlWeights, modeProfiles, scenarios } from "./data.js";

const state = {
  scenario: "identity",
  mode: "monitor",
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

const els = {
  scenarioButtons: document.querySelector("#scenarioButtons"),
  scenarioCode: document.querySelector("#scenarioCode"),
  scenarioTitle: document.querySelector("#scenarioTitle"),
  modeLabel: document.querySelector("#modeLabel"),
  exposureValue: document.querySelector("#exposureValue"),
  coverageScore: document.querySelector("#coverageScore"),
  signalScore: document.querySelector("#signalScore"),
  assetCount: document.querySelector("#assetCount"),
  mttrScore: document.querySelector("#mttrScore"),
  riskRing: document.querySelector("#riskRing"),
  riskScore: document.querySelector("#riskScore"),
  riskHeadline: document.querySelector("#riskHeadline"),
  riskSummary: document.querySelector("#riskSummary"),
  blastRadius: document.querySelector("#blastRadius"),
  trustCoverage: document.querySelector("#trustCoverage"),
  containmentScore: document.querySelector("#containmentScore"),
  mapLabel: document.querySelector("#mapLabel"),
  mapState: document.querySelector("#mapState"),
  incidentList: document.querySelector("#incidentList"),
  queueCount: document.querySelector("#queueCount"),
  playbookList: document.querySelector("#playbookList"),
  playbookClock: document.querySelector("#playbookClock"),
  futureScore: document.querySelector("#futureScore"),
  identityRange: document.querySelector("#identityRange"),
  cloudRange: document.querySelector("#cloudRange"),
  dataRange: document.querySelector("#dataRange"),
  threatCanvas: document.querySelector("#threatCanvas"),
  forecastCanvas: document.querySelector("#forecastCanvas"),
  forecastButton: document.querySelector("#forecastButton"),
  exportButton: document.querySelector("#exportButton")
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
  const exposurePressure =
    state.ranges.identity * 0.17 +
    state.ranges.cloud * 0.14 +
    state.ranges.data * 0.12;
  const coverageRelief = coverage() * 0.24;
  const modeShift = modeProfiles[state.mode].riskShift;
  return clamp(Math.round(scenario.baseRisk + exposurePressure - coverageRelief + modeShift), 8, 97);
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
  return clamp(Math.round((scenario.mttr + score * 0.25) * modeFactor * controlFactor), 8, 90);
}

function futureLift() {
  const future = activeScenario().future;
  return Math.max(8, future[future.length - 1] - future[0] - Math.round(riskScore() / 12));
}

function formatNumber(value) {
  return new Intl.NumberFormat("en").format(value);
}

function setPressed(buttons, activeValue, dataName) {
  buttons.forEach((button) => {
    const active = button.dataset[dataName] === activeValue;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
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
    .map((item, index) => `<li><span>${index + 1}</span><p>${item}</p></li>`)
    .join("");
}

function renderDashboard() {
  const scenario = activeScenario();
  const score = riskScore();
  const cover = coverage();
  const minutes = containmentMinutes();

  els.scenarioCode.textContent = scenario.code;
  els.scenarioTitle.textContent = scenario.title;
  els.mapLabel.textContent = scenario.mapLabel;
  els.mapState.textContent = state.mode === "contain" ? "Containment live" : state.mode === "harden" ? "Hardening wave" : "Active watch";
  els.modeLabel.textContent = modeProfiles[state.mode].label;
  els.exposureValue.textContent = String(exposure());
  els.coverageScore.textContent = `${cover}%`;
  els.signalScore.textContent = `${clamp(scenario.signal + Math.round((cover - 70) / 4), 44, 99)}%`;
  els.assetCount.textContent = formatNumber(scenario.assets + Math.round(exposure() * 9));
  els.mttrScore.textContent = `${minutes}m`;

  els.riskRing.style.setProperty("--risk", score);
  els.riskRing.style.setProperty("--risk-color", riskColor(score));
  els.riskScore.textContent = String(score);
  els.riskHeadline.textContent = scenario.headline;
  els.riskSummary.textContent = scenario.summary;
  els.blastRadius.textContent = riskBand(score);
  els.trustCoverage.textContent = `${cover}%`;
  els.containmentScore.textContent = `${minutes}m`;
  els.futureScore.textContent = `+${futureLift()}%`;

  renderIncidents(score);
  renderPlaybook(minutes);
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
  const data = activeScenario().future.map((value) => clamp(value + coverage() * 0.08 - riskScore() * 0.05, 10, 98));
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
  const current = state.ranges.identity;
  state.ranges.identity = clamp(current + (Math.random() > 0.5 ? 4 : -4), 0, 100);
  els.identityRange.value = String(state.ranges.identity);
  renderDashboard();
  window.setTimeout(() => els.forecastButton.classList.remove("is-busy"), 420);
}

function exportBrief() {
  const scenario = activeScenario();
  const brief = {
    project: "Aegis Horizon",
    scenario: scenario.title,
    code: scenario.code,
    mode: modeProfiles[state.mode].label,
    risk: riskScore(),
    coverage: coverage(),
    exposure: exposure(),
    containmentMinutes: containmentMinutes(),
    incidents: scenario.incidents,
    playbook: scenario.playbook,
    generatedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(brief, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `aegis-horizon-${scenario.code.toLowerCase()}-brief.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
      renderDashboard();
    });
  });

  document.querySelectorAll("[data-control]").forEach((input) => {
    input.addEventListener("change", () => {
      state.controls[input.dataset.control] = input.checked;
      renderDashboard();
    });
  });

  els.forecastButton.addEventListener("click", runForecastPulse);
  els.exportButton.addEventListener("click", exportBrief);
  window.addEventListener("resize", drawForecast);
}

renderScenarioButtons();
bindEvents();
renderDashboard();
drawThreatMap();
