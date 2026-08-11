import test from 'node:test';
import assert from 'node:assert/strict';

import { migrateCosts, migrateState } from '../src/models/migrate.js';

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
