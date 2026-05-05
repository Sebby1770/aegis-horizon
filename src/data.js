export const scenarios = {
  identity: {
    code: "ID-07",
    label: "Identity",
    mapLabel: "Identity Abuse",
    title: "Identity mesh breach rehearsal",
    headline: "Guard the privilege chain",
    summary: "Identity telemetry is stable, but privileged session depth needs a tighter verification loop.",
    baseRisk: 48,
    signal: 84,
    assets: 1248,
    mttr: 18,
    nodes: [
      { id: "Workforce", x: 0.17, y: 0.26, weight: 0.42 },
      { id: "SSO", x: 0.38, y: 0.22, weight: 0.58 },
      { id: "Privileged Access", x: 0.61, y: 0.34, weight: 0.76 },
      { id: "Cloud Apps", x: 0.77, y: 0.56, weight: 0.51 },
      { id: "Data Vault", x: 0.47, y: 0.69, weight: 0.64 },
      { id: "Response", x: 0.24, y: 0.73, weight: 0.35 }
    ],
    links: [
      ["Workforce", "SSO"],
      ["SSO", "Privileged Access"],
      ["Privileged Access", "Cloud Apps"],
      ["Cloud Apps", "Data Vault"],
      ["Data Vault", "Response"],
      ["Response", "SSO"]
    ],
    incidents: [
      ["High", "Impossible travel on privileged admin"],
      ["Medium", "Session token lifetime exceeds baseline"],
      ["Medium", "Dormant account touched sensitive app"],
      ["Low", "New OAuth grant needs review"]
    ],
    playbook: [
      "Force step-up verification for privileged roles",
      "Expire risky sessions and rotate admin tokens",
      "Review OAuth grants against business ownership",
      "Snapshot access graph for after-action review"
    ],
    future: [42, 48, 52, 61, 68, 76, 82]
  },
  cloud: {
    code: "CL-19",
    label: "Cloud",
    mapLabel: "Cloud Drift",
    title: "Autonomous cloud guardrail drift",
    headline: "Stabilize the control plane",
    summary: "Policy drift is compressing response time across serverless, storage, and unmanaged workloads.",
    baseRisk: 56,
    signal: 78,
    assets: 1892,
    mttr: 24,
    nodes: [
      { id: "IaC", x: 0.15, y: 0.34, weight: 0.48 },
      { id: "Control Plane", x: 0.39, y: 0.25, weight: 0.82 },
      { id: "Serverless", x: 0.62, y: 0.24, weight: 0.68 },
      { id: "Storage", x: 0.78, y: 0.54, weight: 0.72 },
      { id: "Runtime", x: 0.49, y: 0.72, weight: 0.55 },
      { id: "SOC", x: 0.24, y: 0.66, weight: 0.38 }
    ],
    links: [
      ["IaC", "Control Plane"],
      ["Control Plane", "Serverless"],
      ["Serverless", "Storage"],
      ["Storage", "Runtime"],
      ["Runtime", "SOC"],
      ["SOC", "Control Plane"]
    ],
    incidents: [
      ["High", "Public storage policy drifted from template"],
      ["High", "Serverless function gained broad secret scope"],
      ["Medium", "Runtime image missing signed provenance"],
      ["Low", "Unused region has active service principal"]
    ],
    playbook: [
      "Reconcile drift against approved infrastructure state",
      "Restrict secret scope for serverless workloads",
      "Require signed images before production deploys",
      "Disable inactive regions and service principals"
    ],
    future: [38, 47, 55, 60, 72, 79, 87]
  },
  supply: {
    code: "SC-12",
    label: "Supply",
    mapLabel: "Supply Chain",
    title: "Software supply-chain confidence net",
    headline: "Verify every build handoff",
    summary: "Build provenance is improving, while third-party package trust still needs continuous scoring.",
    baseRisk: 52,
    signal: 81,
    assets: 764,
    mttr: 31,
    nodes: [
      { id: "Source", x: 0.18, y: 0.49, weight: 0.36 },
      { id: "Build", x: 0.39, y: 0.24, weight: 0.63 },
      { id: "Packages", x: 0.66, y: 0.32, weight: 0.78 },
      { id: "Registry", x: 0.79, y: 0.6, weight: 0.59 },
      { id: "Runtime", x: 0.52, y: 0.72, weight: 0.5 },
      { id: "Audit", x: 0.25, y: 0.74, weight: 0.31 }
    ],
    links: [
      ["Source", "Build"],
      ["Build", "Packages"],
      ["Packages", "Registry"],
      ["Registry", "Runtime"],
      ["Runtime", "Audit"],
      ["Audit", "Build"]
    ],
    incidents: [
      ["High", "Package maintainer reputation dropped sharply"],
      ["Medium", "Unsigned build artifact reached staging"],
      ["Medium", "Dependency tree added transitive network library"],
      ["Low", "SBOM freshness breached 14-day target"]
    ],
    playbook: [
      "Pin dependency versions and verify package integrity",
      "Block unsigned artifacts from deployment lanes",
      "Regenerate SBOM and compare against previous release",
      "Escalate owner review for reputation anomalies"
    ],
    future: [44, 51, 59, 65, 70, 77, 84]
  },
  ai: {
    code: "AI-23",
    label: "AI",
    mapLabel: "AI Phishing",
    title: "Synthetic social-engineering pressure test",
    headline: "Harden human-in-the-loop approvals",
    summary: "AI-generated lures are testing payment workflows, vendor changes, and executive impersonation paths.",
    baseRisk: 61,
    signal: 73,
    assets: 936,
    mttr: 27,
    nodes: [
      { id: "Inbox", x: 0.15, y: 0.29, weight: 0.66 },
      { id: "Approvals", x: 0.38, y: 0.24, weight: 0.8 },
      { id: "Finance", x: 0.63, y: 0.42, weight: 0.74 },
      { id: "Vendors", x: 0.78, y: 0.66, weight: 0.56 },
      { id: "Identity", x: 0.46, y: 0.72, weight: 0.69 },
      { id: "Training", x: 0.22, y: 0.65, weight: 0.4 }
    ],
    links: [
      ["Inbox", "Approvals"],
      ["Approvals", "Finance"],
      ["Finance", "Vendors"],
      ["Vendors", "Identity"],
      ["Identity", "Training"],
      ["Training", "Inbox"]
    ],
    incidents: [
      ["High", "Vendor-bank change request mimics CFO style"],
      ["High", "Deepfake meeting request bypassed assistant queue"],
      ["Medium", "Payment approval lacks second-channel proof"],
      ["Low", "New external sender domain resembles partner"]
    ],
    playbook: [
      "Require out-of-band verification for payment changes",
      "Flag executive impersonation with adaptive banners",
      "Tighten approval thresholds for vendor master data",
      "Run targeted micro-training for exposed teams"
    ],
    future: [35, 43, 54, 60, 67, 74, 80]
  },
  agents: {
    code: "AG-44",
    label: "Agents",
    mapLabel: "Agentic Workflows",
    title: "Autonomous agent trust boundary",
    headline: "Put policy between intent and action",
    summary: "AI agents are multiplying access paths, so delegated permissions need strict scope, approvals, and durable audit trails.",
    baseRisk: 59,
    signal: 86,
    assets: 1186,
    mttr: 29,
    nodes: [
      { id: "Prompt Hub", x: 0.16, y: 0.32, weight: 0.6 },
      { id: "Agent Runtime", x: 0.39, y: 0.22, weight: 0.82 },
      { id: "Tool Gateway", x: 0.64, y: 0.34, weight: 0.76 },
      { id: "SaaS APIs", x: 0.8, y: 0.6, weight: 0.58 },
      { id: "Policy Engine", x: 0.49, y: 0.74, weight: 0.47 },
      { id: "Audit Lake", x: 0.23, y: 0.68, weight: 0.38 }
    ],
    links: [
      ["Prompt Hub", "Agent Runtime"],
      ["Agent Runtime", "Tool Gateway"],
      ["Tool Gateway", "SaaS APIs"],
      ["SaaS APIs", "Policy Engine"],
      ["Policy Engine", "Audit Lake"],
      ["Audit Lake", "Agent Runtime"]
    ],
    incidents: [
      ["High", "Agent requested broader tool scope than policy allows"],
      ["Medium", "Delegated SaaS token lacks expiry guard"],
      ["Medium", "Prompt library changed without approval evidence"],
      ["Low", "Audit stream missed a tool invocation tag"]
    ],
    playbook: [
      "Bind each agent action to a named policy decision",
      "Require scoped, expiring tokens for tool calls",
      "Route high-impact requests through human approval",
      "Hash prompt and tool manifests into the audit trail"
    ],
    future: [36, 45, 56, 66, 73, 82, 91]
  },
  quantum: {
    code: "QK-05",
    label: "Quantum",
    mapLabel: "Crypto Agility",
    title: "Post-quantum readiness radar",
    headline: "Map cryptography before urgency spikes",
    summary: "Long-life data stores and unmanaged certificates need a migration path toward crypto-agile services.",
    baseRisk: 44,
    signal: 88,
    assets: 534,
    mttr: 36,
    nodes: [
      { id: "Certificates", x: 0.18, y: 0.26, weight: 0.69 },
      { id: "Key Stores", x: 0.42, y: 0.22, weight: 0.58 },
      { id: "Archives", x: 0.67, y: 0.35, weight: 0.77 },
      { id: "APIs", x: 0.77, y: 0.61, weight: 0.49 },
      { id: "Policies", x: 0.48, y: 0.73, weight: 0.42 },
      { id: "Owners", x: 0.23, y: 0.66, weight: 0.33 }
    ],
    links: [
      ["Certificates", "Key Stores"],
      ["Key Stores", "Archives"],
      ["Archives", "APIs"],
      ["APIs", "Policies"],
      ["Policies", "Owners"],
      ["Owners", "Certificates"]
    ],
    incidents: [
      ["Medium", "Certificate inventory has unknown owners"],
      ["Medium", "Long-life archive lacks crypto classification"],
      ["Low", "Legacy API does not support key agility marker"],
      ["Low", "Rotation policy missing post-quantum milestone"]
    ],
    playbook: [
      "Classify data by confidentiality lifetime",
      "Assign owners to unmanaged certificates",
      "Add crypto-agility markers to API inventory",
      "Stage migration plan for high-value archives"
    ],
    future: [50, 54, 61, 68, 76, 83, 90]
  },
  ransomware: {
    code: "RW-31",
    label: "Recovery",
    mapLabel: "Recovery Mesh",
    title: "Ransomware resilience tabletop",
    headline: "Protect the restore path",
    summary: "Backup confidence is strong, while identity blast radius and recovery sequencing still shape downtime.",
    baseRisk: 58,
    signal: 79,
    assets: 1430,
    mttr: 42,
    nodes: [
      { id: "Endpoints", x: 0.16, y: 0.35, weight: 0.7 },
      { id: "Identity", x: 0.38, y: 0.25, weight: 0.66 },
      { id: "File Shares", x: 0.63, y: 0.32, weight: 0.78 },
      { id: "Backups", x: 0.8, y: 0.57, weight: 0.45 },
      { id: "Restore", x: 0.5, y: 0.74, weight: 0.52 },
      { id: "Comms", x: 0.24, y: 0.69, weight: 0.36 }
    ],
    links: [
      ["Endpoints", "Identity"],
      ["Identity", "File Shares"],
      ["File Shares", "Backups"],
      ["Backups", "Restore"],
      ["Restore", "Comms"],
      ["Comms", "Identity"]
    ],
    incidents: [
      ["High", "Endpoint cluster exceeded encryption-like write pattern"],
      ["High", "Shared admin credential touched file services"],
      ["Medium", "Restore priority list missing business owner"],
      ["Low", "Crisis comms channel needs contact refresh"]
    ],
    playbook: [
      "Isolate affected endpoint cluster",
      "Disable shared admin credential and rotate secrets",
      "Verify restore order with business impact owners",
      "Send crisis comms packet to response channel"
    ],
    future: [37, 42, 50, 62, 71, 81, 89]
  }
};

export const controlWeights = {
  mfa: 10,
  edr: 9,
  backups: 8,
  secrets: 7
};

export const modeProfiles = {
  monitor: { label: "Monitor", riskShift: 0, containment: 1 },
  harden: { label: "Harden", riskShift: -8, containment: 0.86 },
  contain: { label: "Contain", riskShift: -13, containment: 0.68 }
};
