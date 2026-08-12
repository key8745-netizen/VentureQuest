// Migrations for state saved by older versions of the app.
//
// Everything lives in one browser's localStorage, so there is no
// server-side backfill and no way to ask the user to re-onboard: a
// returning user's saved state must keep working, forever, in place.

/**
 * v1 asked a single "monthlyFixedCost" question worded as "rent,
 * subscriptions, tools, loans" — which is mostly *personal* living
 * cost, not the business's own overhead. Splitting the two, the honest
 * reading of that old number is living cost, with business overhead
 * unknown and therefore zero rather than invented.
 *
 * Under-stating business overhead is the safe direction to be wrong:
 * it makes the survival line optimistic instead of inventing a deficit
 * the user never had, and the financial panel is one visible edit away
 * for anyone who wants to correct it.
 */
export function migrateCosts(source) {
  if (!source || typeof source !== 'object') return source;
  if (typeof source.monthlyFixedCost !== 'number') return source;
  // Already migrated by a previous load — leave it alone.
  if (typeof source.businessFixedCost === 'number') return source;

  const { monthlyFixedCost, ...rest } = source;
  return {
    ...rest,
    businessFixedCost: 0,
    livingCost: monthlyFixedCost,
    // Lets the UI offer a one-time "check this split" nudge instead of
    // silently changing what the user's headline number means.
    costsSplitPending: true,
  };
}

/** Applies every migration to a loaded app state. */
export function migrateState(state) {
  return {
    ...state,
    financial: migrateCosts(state.financial),
    profile: state.profile ? migrateCosts(state.profile) : state.profile,
  };
}

/**
 * Turns anything claiming to be saved state into state this app can
 * actually render: unknown keys dropped, every key type-checked
 * against its default, then migrated.
 *
 * Both entry points need this. localStorage can be hand-edited or left
 * behind by an older build, and Import JSON accepts a file the user
 * picked off their disk — which previously went straight into setState
 * with no checks at all, so one wrong file replaced the whole app with
 * a blank screen.
 */
export function hydrateState(parsed, defaults) {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ...defaults };
  }

  const merged = { ...defaults };
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = parsed[key];
    if (value === undefined) continue;
    if (!sameShape(value, fallback)) continue;
    merged[key] = value;
  }

  // profile is the one key whose default is null, so it needs its own
  // rule: an object or an explicit null, never anything else.
  if (parsed.profile === null || isPlainObject(parsed.profile)) {
    merged.profile = parsed.profile ?? null;
  }

  return migrateState(merged);
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sameShape(value, fallback) {
  if (Array.isArray(fallback)) return Array.isArray(value);
  if (isPlainObject(fallback)) return isPlainObject(value);
  // A null default carries no type information, so nothing generic can
  // be accepted for it — those keys need their own rule (see profile).
  if (fallback === null) return value === null;
  return typeof value === typeof fallback;
}
