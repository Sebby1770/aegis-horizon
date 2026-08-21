export const missions = {
  caremesh: {
    code: "CM-32",
    label: "Care Mesh",
    sector: "Hospital Network",
    title: "Care continuity twin for an autonomous hospital",
    brief:
      "Model patient identity, ward devices, clinical agents, and offline recovery as one living defensive system before disruption reaches care delivery.",
    crownJewel: "Patient continuity ledger",
    promise: "No patient loses care context when identity, devices, or network trust degrades.",
    baseIntegrity: 68,
    signal: 88,
    assets: 2480,
    continuity: 74,
    nodes: [
      { id: "patient-id", label: "Patient ID", x: 0.18, y: 0.28, type: "identity", weight: 0.64 },
      { id: "clinical-agent", label: "Clinical Agent", x: 0.44, y: 0.22, type: "agent", weight: 0.77 },
      { id: "ward-devices", label: "Ward Devices", x: 0.74, y: 0.34, type: "device", weight: 0.72 },
      { id: "care-ledger", label: "Care Ledger", x: 0.58, y: 0.58, type: "crown", weight: 0.86 },
      { id: "offline-pack", label: "Offline Pack", x: 0.28, y: 0.74, type: "recovery", weight: 0.48 },
      { id: "family-portal", label: "Family Portal", x: 0.78, y: 0.76, type: "edge", weight: 0.38 }
    ],
    links: [
      ["patient-id", "clinical-agent", "consent"],
      ["clinical-agent", "ward-devices", "orders"],
      ["ward-devices", "care-ledger", "telemetry"],
      ["care-ledger", "offline-pack", "fallback"],
      ["family-portal", "patient-id", "verification"],
      ["clinical-agent", "care-ledger", "summary"]
    ],
    timeline: [
      ["00m", "Freeze high-impact agent actions and preserve patient context snapshots"],
      ["07m", "Switch ward workflows to approved offline packets"],
      ["18m", "Reconcile clinical orders against the continuity ledger"],
      ["35m", "Release executive care-impact brief with evidence trail"]
    ],
    signals: [
      "Two ward devices reported trust drift outside normal maintenance windows",
      "Clinical agent requested a medication-summary action without fresh consent proof",
      "Offline packet freshness is inside tolerance but near the review line"
    ],
    policies: [
      "Agent-written care summaries require consent proof and clinician attestation",
      "Ward devices fall back to local order queues when identity confidence drops",
      "Family-portal sessions cannot alter care context without second-channel verification"
    ],
    evidence: ["Consent receipt", "Device attestation", "Offline packet hash", "Care-impact owner"],
    future: [62, 66, 70, 73, 76, 82, 86]
  },
  port: {
    code: "AP-29",
    label: "Auto Port",
    sector: "Logistics",
    title: "Autonomous port trust choreography",
    brief:
      "Stress-test cargo robotics, customs data, supplier messages, and manual fallback lanes as one coordinated resilience story.",
    crownJewel: "Berth scheduling authority",
    promise: "Cargo keeps moving safely even when automation confidence becomes uneven.",
    baseIntegrity: 61,
    signal: 82,
    assets: 3910,
    continuity: 67,
    nodes: [
      { id: "berth-ai", label: "Berth AI", x: 0.2, y: 0.24, type: "agent", weight: 0.76 },
      { id: "cargo-robots", label: "Cargo Robots", x: 0.48, y: 0.19, type: "device", weight: 0.82 },
      { id: "customs-feed", label: "Customs Feed", x: 0.78, y: 0.32, type: "data", weight: 0.58 },
      { id: "schedule-core", label: "Schedule Core", x: 0.58, y: 0.58, type: "crown", weight: 0.88 },
      { id: "manual-lane", label: "Manual Lane", x: 0.31, y: 0.76, type: "recovery", weight: 0.52 },
      { id: "supplier-mesh", label: "Supplier Mesh", x: 0.79, y: 0.76, type: "edge", weight: 0.7 }
    ],
    links: [
      ["berth-ai", "cargo-robots", "dispatch"],
      ["cargo-robots", "customs-feed", "status"],
      ["customs-feed", "schedule-core", "release"],
      ["schedule-core", "manual-lane", "fallback"],
      ["supplier-mesh", "customs-feed", "manifest"],
      ["berth-ai", "schedule-core", "decision"]
    ],
    timeline: [
      ["00m", "Pin berth automation to advisory-only mode"],
      ["09m", "Require customs-feed provenance before cargo release"],
      ["21m", "Move high-value containers through the manual lane"],
      ["40m", "Publish dwell-time impact and recovery confidence"]
    ],
    signals: [
      "Supplier manifest cadence shifted from historical rhythm",
      "Robot dispatch confidence dropped near a high-value cargo lane",
      "Manual lane capacity is available but under-tested this quarter"
    ],
    policies: [
      "Berth changes above impact threshold require human dispatcher approval",
      "Cargo robots reject jobs without signed route and cargo context",
      "Supplier messages must carry provenance before scheduling authority consumes them"
    ],
    evidence: ["Route signature", "Manifest provenance", "Dispatcher approval", "Manual-lane drill"],
    future: [52, 58, 64, 68, 73, 79, 84]
  },
  treasury: {
    code: "PT-41",
    label: "Treasury",
    sector: "Financial Services",
    title: "Programmable treasury approval fabric",
    brief:
      "Rehearse payment-agent authority, vendor trust, liquidity telemetry, and board-level decision gates without exposing financial data.",
    crownJewel: "Payment release authority",
    promise: "Money movement remains explainable, reversible, and owner-approved under pressure.",
    baseIntegrity: 72,
    signal: 91,
    assets: 1840,
    continuity: 81,
    nodes: [
      { id: "vendor-id", label: "Vendor ID", x: 0.18, y: 0.3, type: "identity", weight: 0.61 },
      { id: "payment-agent", label: "Payment Agent", x: 0.44, y: 0.2, type: "agent", weight: 0.83 },
      { id: "bank-rails", label: "Bank Rails", x: 0.76, y: 0.31, type: "edge", weight: 0.73 },
      { id: "release-core", label: "Release Core", x: 0.56, y: 0.57, type: "crown", weight: 0.9 },
      { id: "board-gate", label: "Board Gate", x: 0.28, y: 0.75, type: "policy", weight: 0.54 },
      { id: "liquidity-feed", label: "Liquidity Feed", x: 0.78, y: 0.74, type: "data", weight: 0.49 }
    ],
    links: [
      ["vendor-id", "payment-agent", "request"],
      ["payment-agent", "bank-rails", "instruction"],
      ["bank-rails", "release-core", "settlement"],
      ["release-core", "board-gate", "exception"],
      ["liquidity-feed", "release-core", "limits"],
      ["board-gate", "payment-agent", "approval"]
    ],
    timeline: [
      ["00m", "Move payment agent to draft-only output"],
      ["06m", "Require owner proof for vendor master-data changes"],
      ["16m", "Compare release queue against liquidity and fraud thresholds"],
      ["28m", "Send reversible-payment decision packet to executives"]
    ],
    signals: [
      "Vendor-bank change cadence is higher than normal for this business unit",
      "Payment agent confidence is high but approval evidence is incomplete",
      "Liquidity limit model disagrees with a release-batch priority"
    ],
    policies: [
      "Payment agents can draft but cannot release funds without owner proof",
      "Vendor master-data changes require out-of-band verification",
      "Release batches above threshold must include rollback and contact evidence"
    ],
    evidence: ["Owner proof", "Vendor change log", "Liquidity threshold", "Rollback contact"],
    future: [68, 71, 74, 77, 82, 86, 91]
  },
  research: {
    code: "RF-18",
    label: "Research",
    sector: "AI Lab",
    title: "Frontier research fabric with controlled autonomy",
    brief:
      "Balance model-training velocity, secret boundaries, dataset lineage, and agent tooling so research can move quickly without losing governance.",
    crownJewel: "Research lineage vault",
    promise: "Experimental systems stay fast, attributable, and contained.",
    baseIntegrity: 64,
    signal: 85,
    assets: 1320,
    continuity: 70,
    nodes: [
      { id: "dataset-vault", label: "Dataset Vault", x: 0.17, y: 0.28, type: "data", weight: 0.74 },
      { id: "lab-agents", label: "Lab Agents", x: 0.42, y: 0.2, type: "agent", weight: 0.86 },
      { id: "training-fleet", label: "Training Fleet", x: 0.74, y: 0.32, type: "device", weight: 0.7 },
      { id: "lineage-core", label: "Lineage Core", x: 0.56, y: 0.58, type: "crown", weight: 0.89 },
      { id: "review-council", label: "Review Council", x: 0.28, y: 0.76, type: "policy", weight: 0.58 },
      { id: "partner-api", label: "Partner API", x: 0.8, y: 0.76, type: "edge", weight: 0.46 }
    ],
    links: [
      ["dataset-vault", "lab-agents", "context"],
      ["lab-agents", "training-fleet", "jobs"],
      ["training-fleet", "lineage-core", "artifacts"],
      ["lineage-core", "review-council", "review"],
      ["partner-api", "dataset-vault", "exchange"],
      ["review-council", "lab-agents", "scope"]
    ],
    timeline: [
      ["00m", "Freeze new partner-data imports until lineage is proven"],
      ["10m", "Constrain lab agents to approved tool manifests"],
      ["24m", "Compare training artifacts against lineage and review policy"],
      ["42m", "Deliver research-continuity memo to program owners"]
    ],
    signals: [
      "A partner API added fields not present in the approved data contract",
      "Tool-manifest drift appeared in one research agent workspace",
      "Lineage coverage is strong but review-council latency is increasing"
    ],
    policies: [
      "Research agents receive scoped, expiring tool grants per experiment",
      "Training artifacts must cite dataset lineage before sharing",
      "Partner data contracts block unknown fields until reviewed"
    ],
    evidence: ["Tool manifest", "Dataset lineage", "Review decision", "Partner contract"],
    future: [57, 63, 68, 72, 76, 81, 88]
  },
  citygrid: {
    code: "CG-26",
    label: "City Grid",
    sector: "Public Infrastructure",
    title: "Civic sensor grid resilience commons",
    brief:
      "Coordinate street sensors, public dashboards, operator consoles, and privacy rules into a civic-grade defensive operating model.",
    crownJewel: "Public operations picture",
    promise: "The city keeps seeing clearly without exposing people unnecessarily.",
    baseIntegrity: 59,
    signal: 79,
    assets: 5220,
    continuity: 66,
    nodes: [
      { id: "street-sensors", label: "Street Sensors", x: 0.19, y: 0.27, type: "device", weight: 0.69 },
      { id: "ops-agent", label: "Ops Agent", x: 0.45, y: 0.2, type: "agent", weight: 0.72 },
      { id: "public-map", label: "Public Map", x: 0.78, y: 0.34, type: "edge", weight: 0.64 },
      { id: "ops-picture", label: "Ops Picture", x: 0.57, y: 0.58, type: "crown", weight: 0.87 },
      { id: "privacy-board", label: "Privacy Board", x: 0.28, y: 0.75, type: "policy", weight: 0.61 },
      { id: "field-teams", label: "Field Teams", x: 0.79, y: 0.75, type: "recovery", weight: 0.44 }
    ],
    links: [
      ["street-sensors", "ops-agent", "signals"],
      ["ops-agent", "public-map", "updates"],
      ["public-map", "ops-picture", "feedback"],
      ["ops-picture", "privacy-board", "privacy"],
      ["field-teams", "street-sensors", "repair"],
      ["privacy-board", "ops-agent", "rules"]
    ],
    timeline: [
      ["00m", "Disable public-map auto-publish for sensitive districts"],
      ["08m", "Prioritize field teams by safety and sensor confidence"],
      ["19m", "Apply privacy board rules to the operations picture"],
      ["36m", "Issue public-status update with uncertainty labels"]
    ],
    signals: [
      "One district sensor cluster is noisier than normal after maintenance",
      "Public dashboard demand is rising faster than verification capacity",
      "Privacy-rule coverage is strong but district labels need review"
    ],
    policies: [
      "Public updates include confidence and privacy labels before publishing",
      "Sensor clusters require maintenance proof before informing decisions",
      "Ops agents cannot expose sensitive district views without board rules"
    ],
    evidence: ["Sensor maintenance proof", "Privacy rule", "Public update log", "Field-team route"],
    future: [51, 56, 62, 67, 72, 76, 83]
  },
  watergrid: {
    code: "WG-17",
    label: "Water Grid",
    sector: "Municipal Water",
    title: "Civic water SCADA continuity twin",
    brief:
      "Rehearse potable-water operations, operator approval, plant telemetry, and offline chemical-dose packets so civic supply stays safe when automation confidence fades.",
    crownJewel: "Potable water authority",
    promise: "Drinking water stays safe, attributable, and operator-approved even when plant trust degrades.",
    baseIntegrity: 63,
    signal: 84,
    assets: 2760,
    continuity: 71,
    nodes: [
      { id: "source-intake", label: "Source Intake", x: 0.18, y: 0.28, type: "device", weight: 0.66 },
      { id: "plant-agent", label: "Plant Agent", x: 0.44, y: 0.21, type: "agent", weight: 0.78 },
      { id: "dose-skid", label: "Dose Skid", x: 0.75, y: 0.33, type: "device", weight: 0.71 },
      { id: "quality-core", label: "Quality Core", x: 0.57, y: 0.57, type: "crown", weight: 0.88 },
      { id: "offline-dose", label: "Offline Dose", x: 0.28, y: 0.75, type: "recovery", weight: 0.51 },
      { id: "ops-console", label: "Ops Console", x: 0.79, y: 0.76, type: "policy", weight: 0.56 }
    ],
    links: [
      ["source-intake", "plant-agent", "flow"],
      ["plant-agent", "dose-skid", "setpoint"],
      ["dose-skid", "quality-core", "residual"],
      ["quality-core", "offline-dose", "fallback"],
      ["ops-console", "plant-agent", "approval"],
      ["quality-core", "ops-console", "alarm"]
    ],
    timeline: [
      ["00m", "Freeze autonomous dose changes and keep operator-approved setpoints"],
      ["08m", "Switch chemical dosing to signed offline packets"],
      ["20m", "Reconcile residual telemetry against the quality ledger"],
      ["38m", "Issue civic continuity brief with operator evidence"]
    ],
    signals: [
      "Dose-skid confidence drifted after a maintenance window",
      "Plant agent proposed a residual change without fresh operator approval",
      "Offline chemical-dose packet is inside freshness but near review"
    ],
    policies: [
      "Chemical-dose changes require named operator approval before actuation",
      "Plant agents fall back to offline dose packets when telemetry confidence drops",
      "Quality-core alarms cannot clear without signed residual evidence"
    ],
    evidence: ["Operator approval", "Dose packet hash", "Residual attestation", "Civic-impact owner"],
    future: [54, 59, 65, 70, 75, 80, 86]
  },
  orbital: {
    code: "OL-50",
    label: "Orbital",
    sector: "Space Logistics",
    title: "Orbital logistics command assurance",
    brief:
      "Explore how ground stations, mission planners, supplier telemetry, and delayed communications stay trustworthy when timing is unforgiving.",
    crownJewel: "Mission command window",
    promise: "Every command is deliberate, attributable, and recoverable before the window closes.",
    baseIntegrity: 66,
    signal: 87,
    assets: 890,
    continuity: 72,
    nodes: [
      { id: "ground-id", label: "Ground ID", x: 0.17, y: 0.29, type: "identity", weight: 0.62 },
      { id: "mission-agent", label: "Mission Agent", x: 0.42, y: 0.19, type: "agent", weight: 0.8 },
      { id: "station-link", label: "Station Link", x: 0.75, y: 0.32, type: "edge", weight: 0.76 },
      { id: "command-core", label: "Command Core", x: 0.57, y: 0.57, type: "crown", weight: 0.91 },
      { id: "delay-plan", label: "Delay Plan", x: 0.29, y: 0.76, type: "recovery", weight: 0.53 },
      { id: "supplier-telemetry", label: "Supplier Telemetry", x: 0.8, y: 0.75, type: "data", weight: 0.57 }
    ],
    links: [
      ["ground-id", "mission-agent", "authorization"],
      ["mission-agent", "station-link", "proposal"],
      ["station-link", "command-core", "command"],
      ["command-core", "delay-plan", "fallback"],
      ["supplier-telemetry", "station-link", "health"],
      ["delay-plan", "mission-agent", "constraints"]
    ],
    timeline: [
      ["00m", "Lock command window to pre-approved objective set"],
      ["05m", "Confirm station-link health against supplier telemetry"],
      ["14m", "Stage delayed fallback plan and owner confirmations"],
      ["26m", "Archive command evidence before next orbital pass"]
    ],
    signals: [
      "Supplier telemetry arrived late but inside confidence threshold",
      "Mission agent proposed a command outside the pre-approved objective set",
      "Delay plan is complete but owner confirmation is stale"
    ],
    policies: [
      "Mission-agent proposals cannot exceed the objective set for the pass",
      "Station commands require fresh identity and link-health proof",
      "Delayed fallback plans must include owner confirmation and expiry"
    ],
    evidence: ["Objective set", "Link-health proof", "Owner confirmation", "Command archive"],
    future: [60, 65, 69, 74, 78, 84, 90]
  }
};

export const controlWeights = {
  approvals: 12,
  recovery: 11,
  attestation: 9,
  privacy: 8
};

export const lenses = {
  board: { label: "Board", integrityShift: 2, loadShift: -4, caption: "Decision packet" },
  soc: { label: "SOC", integrityShift: 0, loadShift: 6, caption: "Operator drill" },
  legal: { label: "Trust", integrityShift: -1, loadShift: 2, caption: "Evidence review" }
};

export const horizonProfiles = {
  30: { label: "30d", drift: -3, maturity: 0.92, caption: "Immediate operational confidence" },
  90: { label: "90d", drift: 2, maturity: 1, caption: "Quarterly resilience posture" },
  180: { label: "180d", drift: 8, maturity: 1.12, caption: "Long-range governance pressure" }
};
