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
