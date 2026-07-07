import React from 'react';
import { cloneSubtree, unlockManagementNode } from '../models/orgTree.js';
import { getCopy } from '../models/terminology.js';

function nextUnitId(tree) {
  let index = 1;
  while (tree.nodes[`operating-unit-${index}`]) index += 1;
  return `operating-unit-${index}`;
}

function TreeNode({ tree, node, onCloneUnit }) {
  const children = Object.values(tree.nodes).filter(
    (child) => child.parentId === node.id,
  );

  return (
    <li>
      <span className={`node node-${node.type}`}>
        {node.label}
        {node.type === 'operating-unit' && (
          <button type="button" className="mini" onClick={() => onCloneUnit(node.id)}>
            複製
          </button>
        )}
      </span>
      {children.length > 0 && (
        <ul>
          {children.map((child) => (
            <TreeNode key={child.id} tree={tree} node={child} onCloneUnit={onCloneUnit} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function OrgTreePreview({ mode, tree, onTreeChange }) {
  const roots = Object.values(tree.nodes).filter((node) => node.parentId === null);
  const hasManagement = Object.values(tree.nodes).some(
    (node) => node.type === 'management-layer',
  );

  const handleClone = (sourceNodeId) => {
    onTreeChange(cloneSubtree(tree, sourceNodeId, nextUnitId(tree)));
  };

  const handleUnlock = () => {
    const result = unlockManagementNode(tree);
    if (result.unlocked) onTreeChange(result.tree);
  };

  return (
    <section className="card">
      <h2>{getCopy('orgTree', mode)}</h2>

      <ul className="org-tree">
        {roots.map((node) => (
          <TreeNode key={node.id} tree={tree} node={node} onCloneUnit={handleClone} />
        ))}
      </ul>

      {!hasManagement && (
        <div className="unlock-row">
          <button type="button" onClick={handleUnlock}>
            解鎖 Management Layer
          </button>
          <p className="muted">{getCopy('managementLocked', mode)}</p>
        </div>
      )}
    </section>
  );
}
