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

export default function OrgTreePreview({ mode, activeStageId, tree, onTreeChange }) {
  const stageHint =
    activeStageId === 'scale'
      ? '就是現在:複製你的營運單位開第二個據點,兩個以上就能解鎖管理層。'
      : activeStageId
        ? '這是你事業的藍圖預覽——到第 5 關「規模擴張」時,會在這裡複製第二個營運單位、解鎖管理層。'
        : '';

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
      {stageHint && <p className="muted">{stageHint}</p>}

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
