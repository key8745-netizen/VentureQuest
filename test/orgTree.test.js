import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createStarterOrgTree,
  cloneSubtree,
  unlockManagementNode,
} from '../src/models/orgTree.js';

const INDUSTRY_WORDS = ['food', 'menu', 'room', 'dish', 'guest'];

test('starter org tree uses domain-agnostic node labels', () => {
  const tree = createStarterOrgTree();
  const labels = Object.values(tree.nodes).map((node) => node.label);

  assert.deepEqual(labels.sort(), [
    'Customer Response',
    'Demand Creation',
    'Operating Unit',
    'Value Delivery',
  ]);

  for (const node of Object.values(tree.nodes)) {
    const serialized = JSON.stringify(node).toLowerCase();
    for (const word of INDUSTRY_WORDS) {
      assert.ok(
        !serialized.includes(word),
        `node ${node.id} must not contain industry word "${word}"`,
      );
    }
  }
});

test('clones a subtree without industry-specific fields', () => {
  const tree = createStarterOrgTree();
  // Simulate a node polluted by a hypothetical industry plugin.
  tree.nodes['operating-unit-1'].foodCost = 120;

  const next = cloneSubtree(tree, 'operating-unit-1', 'operating-unit-2');

  const clone = next.nodes['operating-unit-2'];
  assert.ok(clone, 'clone must exist');
  assert.equal(clone.type, 'operating-unit');
  assert.equal(clone.parentId, null);
  assert.ok(!('foodCost' in clone), 'clone must drop non-schema fields');

  const cloneChildren = Object.values(next.nodes).filter(
    (node) => node.parentId === 'operating-unit-2',
  );
  assert.equal(cloneChildren.length, 3, 'clone must copy all descendants');

  // Original tree untouched.
  assert.equal(Object.keys(tree.nodes).length, 4);
});

test('unlocks a higher management node for scaling', () => {
  const starter = createStarterOrgTree();

  const denied = unlockManagementNode(starter);
  assert.equal(denied.unlocked, false);
  assert.equal(denied.reason, 'need-at-least-two-units');

  const scaled = cloneSubtree(starter, 'operating-unit-1', 'operating-unit-2');
  const result = unlockManagementNode(scaled);

  assert.equal(result.unlocked, true);
  assert.equal(result.node.type, 'management-layer');
  assert.equal(result.node.label, 'Management Layer');

  const units = Object.values(result.tree.nodes).filter(
    (node) => node.type === 'operating-unit',
  );
  for (const unit of units) {
    assert.equal(
      unit.parentId,
      result.node.id,
      'operating units must report to the management layer',
    );
  }
});
