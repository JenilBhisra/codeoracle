import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CustomDependencyNode from './CustomDependencyNode';
import NodeDetailPanel from './NodeDetailPanel';
import GraphLegend from './GraphLegend';
import { Layers, Maximize2, RotateCcw, Info, Sparkles } from 'lucide-react';
import Button from '../common/Button';
import Badge from '../common/Badge';

const nodeTypes = {
  custom: CustomDependencyNode,
};

/**
 * Calculates deterministic layout coordinates (grid / tree hierarchy)
 * for nodes received from the backend API
 */
function layoutGraphNodes(rawNodes = [], rawEdges = []) {
  if (!rawNodes || rawNodes.length === 0) return [];

  // Calculate in-degree to find root / entry nodes
  const inDegree = {};
  rawNodes.forEach((n) => (inDegree[n.id] = 0));
  rawEdges.forEach((e) => {
    if (inDegree[e.target] !== undefined) {
      inDegree[e.target] += 1;
    }
  });

  // Sort nodes by inDegree and language
  const sortedNodes = [...rawNodes].sort((a, b) => {
    const aDeg = inDegree[a.id] || 0;
    const bDeg = inDegree[b.id] || 0;
    return aDeg - bDeg;
  });

  const columns = Math.ceil(Math.sqrt(sortedNodes.length * 1.5)) || 3;
  const xSpacing = 280;
  const ySpacing = 160;

  return sortedNodes.map((node, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);

    // Stagger odd rows for a more organic DAG aesthetic
    const xOffset = row % 2 === 1 ? 50 : 0;

    return {
      id: node.id,
      type: 'custom',
      position: {
        x: node.position?.x ?? col * xSpacing + xOffset + 40,
        y: node.position?.y ?? row * ySpacing + 40,
      },
      data: {
        label: node.label || node.id,
        language: node.language || 'python',
        path: node.path || '',
        external: Boolean(node.external),
        type: node.type || 'module',
      },
    };
  });
}

function formatGraphEdges(rawEdges = []) {
  if (!rawEdges) return [];
  return rawEdges.map((edge, idx) => ({
    id: edge.id || `e-${edge.source}-${edge.target}-${idx}`,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: true,
    style: {
      stroke: '#8b5cf6',
      strokeWidth: 2,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
      color: '#8b5cf6',
    },
  }));
}

/**
 * Dependency Graph Interactive Visualization View (Phase 7)
 * @param {Object} props
 * @param {{ nodes: Array, edges: Array }} props.graphData
 */
export default function DependencyGraphView({ graphData = { nodes: [], edges: [] } }) {
  const initialNodes = useMemo(() => layoutGraphNodes(graphData.nodes, graphData.edges), [graphData.nodes, graphData.edges]);
  const initialEdges = useMemo(() => formatGraphEdges(graphData.edges), [graphData.edges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleSelectNodeById = (nodeId) => {
    const target = nodes.find((n) => n.id === nodeId);
    if (target) {
      setSelectedNode(target);
    }
  };

  if (!graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="text-center py-20 bg-[#0a0b12]/60 rounded-2xl border border-white/[0.06] flex flex-col items-center justify-center space-y-3">
        <Layers className="w-12 h-12 text-slate-500 mb-1" />
        <h4 className="text-base font-bold text-slate-200">No Dependency Relationships Found</h4>
        <p className="text-xs text-slate-400 max-w-sm">
          This codebase does not contain multi-module imports or declarations detected by AST parsers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Controls & Info Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="cyan" dot size="sm">
            {nodes.length} Nodes
          </Badge>
          <Badge variant="purple" size="sm">
            {edges.length} Dependencies
          </Badge>
          <span className="text-xs text-slate-400 hidden md:inline font-mono">
            • Click any node to inspect imports
          </span>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Interactive Canvas: Scroll to Zoom • Drag to Pan
        </div>
      </div>

      {/* React Flow Canvas Container */}
      <div className="relative w-full h-[580px] rounded-3xl bg-[#080910] border border-white/[0.08] overflow-hidden shadow-2xl shadow-black/50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.2}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        >
          {/* Subtle Cyberpunk Dot Grid */}
          <Background color="#1e233d" gap={20} size={1.5} />

          {/* Standard Canvas Controls */}
          <Controls className="!bg-[#121424] !border-white/10 !rounded-xl !shadow-xl !fill-slate-300" />

          {/* Mini-Map */}
          <MiniMap
            nodeColor={(n) => {
              if (n.data?.external) return '#64748b';
              if (n.data?.language === 'python') return '#06b6d4';
              if (n.data?.language === 'javascript') return '#f59e0b';
              return '#a855f7';
            }}
            maskColor="rgba(10, 11, 18, 0.8)"
            className="!bg-[#0a0b12] !border !border-white/10 !rounded-2xl hidden sm:block"
          />
        </ReactFlow>

        {/* Legend */}
        <GraphLegend />

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <NodeDetailPanel
            node={selectedNode}
            edges={edges}
            nodes={nodes}
            onClose={() => setSelectedNode(null)}
            onSelectNode={handleSelectNodeById}
          />
        )}
      </div>
    </div>
  );
}
