export const profileStorageKey = "aegis-horizon-twin-profile";

function clampNumber(value, fallback, min = 0, max = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function hasOwn(map, key) {
  return Object.prototype.hasOwnProperty.call(map, key);
}

export function normalizeProfile(profile, currentState, catalogs) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    return null;
  }

  const horizon = Number(profile.horizon);
  if (
    !hasOwn(catalogs.missions, profile.mission) ||
    !hasOwn(catalogs.lenses, profile.lens) ||
    !hasOwn(catalogs.horizons, String(horizon))
  ) {
    return null;
  }

  return {
    mission: profile.mission,
    lens: profile.lens,
    horizon,
    pressure: {
      agent: clampNumber(profile.pressure?.agent, currentState.pressure.agent),
      supplier: clampNumber(profile.pressure?.supplier, currentState.pressure.supplier),
      data: clampNumber(profile.pressure?.data, currentState.pressure.data)
    },
    controls: {
      approvals: Boolean(profile.controls?.approvals),
      recovery: Boolean(profile.controls?.recovery),
      attestation: Boolean(profile.controls?.attestation),
      privacy: Boolean(profile.controls?.privacy)
    }
  };
}
