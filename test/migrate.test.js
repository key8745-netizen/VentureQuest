import test from 'node:test';
import assert from 'node:assert/strict';

import { migrateCosts, migrateState, hydrateState } from '../src/models/migrate.js';

test('the old single fixed cost becomes living cost, not business cost', () => {
  const migrated = migrateCosts({
    monthlyFixedCost: 30000,
    unitPrice: 500,
    unitCost: 200,
  });

  assert.equal(migrated.livingCost, 30000);
  assert.equal(migrated.businessFixedCost, 0);
  assert.equal(migrated.monthlyFixedCost, undefined);
  assert.equal(migrated.costsSplitPending, true);
  assert.equal(migrated.unitPrice, 500, 'unrelated fields survive');
});

test('migration is idempotent and leaves new-shape data alone', () => {
  const current = { businessFixedCost: 1200, livingCost: 28000, unitPrice: 500 };
  assert.equal(migrateCosts(current), current);

  const once = migrateCosts({ monthlyFixedCost: 30000 });
  const twice = migrateCosts(once);
  assert.deepEqual(twice, once);
});

test('migrateCosts tolerates junk without throwing', () => {
  assert.equal(migrateCosts(null), null);
  assert.equal(migrateCosts(undefined), undefined);
  const noNumber = { monthlyFixedCost: 'lots' };
  assert.equal(migrateCosts(noNumber), noNumber);
});

test('migrateState migrates both the panel numbers and the profile', () => {
  const migrated = migrateState({
    financial: { monthlyFixedCost: 30000, unitPrice: 500, unitCost: 200 },
    profile: { idea: '便當店', monthlyFixedCost: 30000, weeklyHours: 8 },
    completedGoalIds: ['explore-g1'],
  });

  assert.equal(migrated.financial.livingCost, 30000);
  assert.equal(migrated.profile.livingCost, 30000);
  assert.equal(migrated.profile.idea, '便當店');
  assert.deepEqual(migrated.completedGoalIds, ['explore-g1']);
});

test('migrateState survives a profile-less state', () => {
  const migrated = migrateState({
    financial: { monthlyFixedCost: 30000 },
    profile: null,
  });
  assert.equal(migrated.profile, null);
});

const defaults = () => ({
  mode: 'plain',
  profile: null,
  financial: { businessFixedCost: 0, livingCost: 30000, unitPrice: 500, unitCost: 200 },
  availableMinutes: 20,
  completedGoalIds: [],
  weeklyReviews: [],
  breakdowns: {},
});

test('hydrateState keeps good values and drops wrong-typed ones', () => {
  const state = hydrateState(
    {
      mode: 'pro',
      availableMinutes: 45,
      completedGoalIds: ['explore-g1'],
      breakdowns: { 'explore-g1': [{ id: 'a', label: 'a' }] },
    },
    defaults(),
  );

  assert.equal(state.mode, 'pro');
  assert.equal(state.availableMinutes, 45);
  assert.deepEqual(state.completedGoalIds, ['explore-g1']);
  assert.ok(state.breakdowns['explore-g1']);
});

test('hydrateState refuses values of the wrong shape', () => {
  const state = hydrateState(
    {
      completedGoalIds: 'explore-g1',
      availableMinutes: 'lots',
      breakdowns: ['not', 'an', 'object'],
      weeklyReviews: { nope: true },
      mode: 42,
    },
    defaults(),
  );

  const base = defaults();
  assert.deepEqual(state.completedGoalIds, base.completedGoalIds);
  assert.equal(state.availableMinutes, base.availableMinutes);
  assert.deepEqual(state.breakdowns, base.breakdowns);
  assert.deepEqual(state.weeklyReviews, base.weeklyReviews);
  assert.equal(state.mode, base.mode);
});

test('hydrateState drops keys the app does not know about', () => {
  const state = hydrateState({ evil: 'payload', mode: 'pro' }, defaults());
  assert.equal(state.evil, undefined);
  assert.equal(state.mode, 'pro');
});

test('hydrateState survives anything that is not state at all', () => {
  for (const junk of [null, undefined, 42, 'text', [1, 2, 3]]) {
    const state = hydrateState(junk, defaults());
    assert.deepEqual(state.completedGoalIds, []);
    assert.equal(state.profile, null);
  }
});

test('hydrateState migrates on the way in', () => {
  const state = hydrateState(
    {
      financial: { monthlyFixedCost: 30000, unitPrice: 500, unitCost: 200 },
      profile: { idea: '便當店', monthlyFixedCost: 30000 },
    },
    defaults(),
  );

  assert.equal(state.financial.livingCost, 30000);
  assert.equal(state.financial.monthlyFixedCost, undefined);
  assert.equal(state.profile.livingCost, 30000);
});

test('hydrateState accepts a null profile but not a bogus one', () => {
  assert.equal(hydrateState({ profile: null }, defaults()).profile, null);
  assert.equal(hydrateState({ profile: 'me' }, defaults()).profile, null);
  assert.equal(hydrateState({ profile: [] }, defaults()).profile, null);
  assert.equal(
    hydrateState({ profile: { idea: 'x' } }, defaults()).profile.idea,
    'x',
  );
});
