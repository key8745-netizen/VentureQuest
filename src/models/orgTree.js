// Org tree — deliberately industry-agnostic operating nodes.
// A node is only ever { id, type, label, parentId, unlocked }; anything
// like foodCost/menuItem/roomNight belongs in a future per-industry
// presentation layer, never here.

const NODE_KEYS = ['id', 'type', 'label', 'parentId', 'unlocked'];

export function createStarterOrgTree() {
  return {
    nodes: {
      'operating-unit-1': {
        id: 'operating-unit-1',
        type: 'operating-unit',
        label: 'Operating Unit',
        parentId: null,
        unlocked: true,
      },
      'value-delivery-1': {
        id: 'value-delivery-1',
        type: 'value-delivery',
        label: 'Value Delivery',
        parentId: 'operating-unit-1',
        unlocked: true,
      },
      'demand-creation-1': {
        id: 'demand-creation-1',
        type: 'demand-creation',
        label: 'Demand Creation',
        parentId: 'operating-unit-1',
        unlocked: true,
      },
      'customer-response-1': {
        id: 'customer-response-1',
        type: 'customer-response',
        label: 'Customer Response',
        parentId: 'operating-unit-1',
        unlocked: true,
      },
    },
  };
}

function childrenOf(tree, nodeId) {
  return Object.values(tree.nodes).filter((node) => node.parentId === nodeId);
}

function sanitizeNode(node) {
  const clean = {};
  for (const key of NODE_KEYS) {
    if (key in node) clean[key] = node[key];
  }
  return clean;
}

/**
 * Clones a node and all its descendants under a new id. This is how a
 * venture scales sideways: copy a working Operating Unit, point it at a
 * new market, keep the schema identical.
 */
export function cloneSubtree(tree, sourceNodeId, newNodeId) {
  const source = tree.nodes[sourceNodeId];
  if (!source) return tree;

  const nodes = { ...tree.nodes };

  const copyNode = (nodeId, cloneId, parentId) => {
    const original = tree.nodes[nodeId];
    nodes[cloneId] = sanitizeNode({ ...original, id: cloneId, parentId });
    childrenOf(tree, nodeId).forEach((child, index) => {
      copyNode(child.id, `${cloneId}-child-${index + 1}`, cloneId);
    });
  };

  copyNode(sourceNodeId, newNodeId, source.parentId);

  return { nodes };
}

function rootOperatingUnits(tree) {
  return Object.values(tree.nodes).filter(
    (node) => node.type === 'operating-unit' && node.parentId === null,
  );
}

/**
 * Unlocks a Management Layer node above the root operating units.
 * Only allowed once there are at least two units — you cannot manage a
 * team of one, you *are* the team of one.
 */
export function unlockManagementNode(tree, node = {}) {
  const units = rootOperatingUnits(tree);

  if (units.length < 2) {
    return { unlocked: false, reason: 'need-at-least-two-units', tree };
  }

  const managementNode = sanitizeNode({
    id: node.id ?? 'management-layer-1',
    type: 'management-layer',
    label: node.label ?? 'Management Layer',
    parentId: null,
    unlocked: true,
  });

  const nodes = { [managementNode.id]: managementNode };
  for (const existing of Object.values(tree.nodes)) {
    nodes[existing.id] =
      existing.parentId === null && existing.type === 'operating-unit'
        ? { ...existing, parentId: managementNode.id }
        : { ...existing };
  }

  return { unlocked: true, node: managementNode, tree: { nodes } };
}
