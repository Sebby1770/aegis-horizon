/**
 * Defensive (blue-team) technique catalog and policy-to-technique mapping.
 * Purely defensive framing — no offensive content.
 */

export const techniqueCatalog = {
  "zero-trust": {
    id: "zero-trust",
    label: "Zero Trust",
    blurb: "Never trust by default; verify every path to crown jewels."
  },
  "mfa-step-up": {
    id: "mfa-step-up",
    label: "MFA / step-up auth",
    blurb: "Raise assurance for high-impact actions and identity changes."
  },
  "offline-continuity": {
    id: "offline-continuity",
    label: "Offline continuity",
    blurb: "Keep critical workflows alive when network or cloud trust degrades."
  },
  "provenance-attestation": {
    id: "provenance-attestation",
    label: "Provenance / attestation",
    blurb: "Require signed evidence and lineage before consuming system output."
  },
  "human-in-the-loop": {
    id: "human-in-the-loop",
    label: "Human-in-the-loop",
    blurb: "Bind high-impact automation to named human approval gates."
  },
  "least-privilege": {
    id: "least-privilege",
    label: "Least privilege",
    blurb: "Scope agent and service authority to the minimum necessary grant."
  },
  "segmented-recovery": {
    id: "segmented-recovery",
    label: "Segmented recovery",
    blurb: "Isolate recovery paths so failure does not cascade into crown jewels."
  },
  "privacy-boundary": {
    id: "privacy-boundary",
    label: "Privacy boundary",
    blurb: "Prevent sensitive context from leaking into public or partner surfaces."
  },
  "draft-only-autonomy": {
    id: "draft-only-autonomy",
    label: "Draft-only autonomy",
    blurb: "Let agents propose under pressure without releasing irreversible action."
  },
  "integrity-pause": {
    id: "integrity-pause",
    label: "Integrity pause",
    blurb: "Halt new autonomy when integrity drops below a defensive threshold."
  }
};

/** Mission-static policy index → technique tags (order matches each mission.policies array). */
export const missionPolicyTechniques = {
  caremesh: [
    ["human-in-the-loop", "provenance-attestation", "mfa-step-up"],
    ["offline-continuity", "segmented-recovery", "zero-trust"],
    ["mfa-step-up", "zero-trust", "least-privilege"]
  ],
  port: [
    ["human-in-the-loop", "least-privilege"],
    ["provenance-attestation", "zero-trust"],
    ["provenance-attestation", "zero-trust", "least-privilege"]
  ],
  treasury: [
    ["draft-only-autonomy", "human-in-the-loop", "least-privilege"],
    ["mfa-step-up", "provenance-attestation", "zero-trust"],
    ["segmented-recovery", "human-in-the-loop", "provenance-attestation"]
  ],
  research: [
    ["least-privilege", "human-in-the-loop", "zero-trust"],
    ["provenance-attestation", "least-privilege"],
    ["zero-trust", "privacy-boundary", "provenance-attestation"]
  ],
  citygrid: [
    ["privacy-boundary", "provenance-attestation"],
    ["provenance-attestation", "zero-trust"],
    ["privacy-boundary", "least-privilege", "human-in-the-loop"]
  ],
  watergrid: [
    ["human-in-the-loop", "least-privilege"],
    ["offline-continuity", "segmented-recovery", "zero-trust"],
    ["provenance-attestation", "zero-trust"]
  ],
  orbital: [
    ["least-privilege", "human-in-the-loop", "zero-trust"],
    ["mfa-step-up", "provenance-attestation", "zero-trust"],
    ["segmented-recovery", "human-in-the-loop", "offline-continuity"]
  ]
};

/** Dynamic / generated policy phrase patterns → techniques. */
const dynamicPatterns = [
  {
    test: /require named owner approval|human approval|owner proof|owner confirmation|dispatcher approval|clinician attestation|board rules|operator approval/i,
    tags: ["human-in-the-loop"]
  },
  {
    test: /offline recovery|offline pack|offline dose|manual lane|fallback plan|delay plan|local order queues/i,
    tags: ["offline-continuity", "segmented-recovery"]
  },
  {
    test: /signed evidence|attestation|provenance|lineage|signature|manifest provenance/i,
    tags: ["provenance-attestation"]
  },
  {
    test: /privacy boundary|privacy labels|sensitive context|sensitive district/i,
    tags: ["privacy-boundary"]
  },
  {
    test: /draft-only|draft but cannot release|advisory-only/i,
    tags: ["draft-only-autonomy", "least-privilege"]
  },
  {
    test: /pause new autonomy|integrity is tense|freeze high-impact|constrain.*agents|scoped.*grants/i,
    tags: ["integrity-pause", "least-privilege"]
  },
  {
    test: /second-channel|out-of-band|fresh identity|consent proof|verification/i,
    tags: ["mfa-step-up", "zero-trust"]
  },
  {
    test: /supplier coupling|system-to-system trust|partner data|unknown fields/i,
    tags: ["zero-trust", "provenance-attestation"]
  }
];

/**
 * Resolve technique tags for a policy rule string.
 * @param {string} rule
 * @param {string} [missionKey]
 * @param {number} [staticIndex] index within mission.policies when rule is mission-static
 * @returns {string[]} technique ids
 */
export function techniquesForPolicy(rule, missionKey, staticIndex) {
  const tags = new Set();

  if (
    missionKey &&
    Number.isInteger(staticIndex) &&
    staticIndex >= 0 &&
    missionPolicyTechniques[missionKey]?.[staticIndex]
  ) {
    missionPolicyTechniques[missionKey][staticIndex].forEach((tag) => tags.add(tag));
  }

  for (const pattern of dynamicPatterns) {
    if (pattern.test.test(rule)) {
      pattern.tags.forEach((tag) => tags.add(tag));
    }
  }

  if (tags.size === 0) {
    tags.add("zero-trust");
  }

  return [...tags];
}

/**
 * Labels for a list of technique ids.
 * @param {string[]} ids
 */
export function techniqueLabels(ids) {
  return ids.map((id) => techniqueCatalog[id]?.label ?? id);
}

/**
 * Unique technique coverage across a set of policy rules.
 * @param {Array<{ techniques: string[] }>} policyRows
 */
export function techniqueCoverage(policyRows) {
  const seen = new Set();
  policyRows.forEach((row) => {
    (row.techniques ?? []).forEach((id) => seen.add(id));
  });
  return [...seen].map((id) => ({
    id,
    label: techniqueCatalog[id]?.label ?? id,
    blurb: techniqueCatalog[id]?.blurb ?? ""
  }));
}
