import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import type { WorkflowNode, WorkflowEdge } from '../types';

cytoscape.use(dagre as any);

interface WorkflowGraphProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  linkMode?: boolean;
  linkType?: string;
  onNodeSelect?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onNodeEdit?: (nodeId: string) => void;
  onNodeDelete?: (nodeId: string) => void;
  onNodeNote?: (nodeId: string) => void;
  onEdgeDelete?: (edgeId: string) => void;
  onCreateDependency?: (fromId: number, toId: number, type: string) => void;
  onBackgroundDblClick?: () => void;
}

export interface WorkflowGraphRef {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  reload: () => void;
}

const edgeColorMap: Record<string, string> = {
  BLOCKS: '#5e6ad2',
  REQUIRES: '#10b981',
  TRIGGERS: '#f59e0b',
  DEFAULT: '#5e6ad2',
};

export const WorkflowGraph = forwardRef<WorkflowGraphRef, WorkflowGraphProps>(
  function WorkflowGraph(props, ref) {
    const {
      nodes,
      edges,
      linkMode = false,
      linkType = 'BLOCKS',
      onNodeSelect,
      onNodeDoubleClick,
      onNodeEdit,
      onNodeDelete,
      onNodeNote,
      onEdgeDelete,
      onCreateDependency,
      onBackgroundDblClick,
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const cyRef = useRef<cytoscape.Core | null>(null);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const linkSourceRef = useRef<cytoscape.NodeSingular | null>(null);

    const initGraph = useCallback(() => {
      if (!containerRef.current) return;

      const cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...nodes.map((n) => ({
            data: { ...n.data },
          })),
          ...edges.map((e) => ({
            data: { ...e.data },
          })),
        ],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#191a1b',
              'border-color': 'rgba(255,255,255,0.08)',
              'border-width': 1,
              'label': 'data(label)',
              'color': '#d0d6e0',
              'font-size': '13px',
              'font-family': 'Inter, system-ui, sans-serif',
              'text-valign': 'center',
              'text-halign': 'center',
              'width': 180,
              'height': 56,
              'shape': 'roundrectangle',
              'text-wrap': 'wrap',
              'text-max-width': 160,
              'padding': 10,
            } as any,
          },
          {
            selector: 'node[priority = 4]',
            style: {
              'border-color': '#ef4444',
              'border-width': 2,
            } as any,
          },
          {
            selector: 'node[priority = 3]',
            style: {
              'border-color': '#f59e0b',
              'border-width': 2,
            } as any,
          },
          {
            selector: 'node[priority = 1]',
            style: {
              'border-color': '#10b981',
              'border-width': 2,
            } as any,
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#5e6ad2',
              'target-arrow-color': '#5e6ad2',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'arrow-scale': 1.2,
              'label': 'data(type)',
              'font-size': '10px',
              'color': '#8a8f98',
              'text-background-color': '#08090a',
              'text-background-opacity': 1,
              'text-background-padding': 3,
              'text-background-shape': 'roundrectangle',
            } as any,
          },
          {
            selector: ':selected',
            style: {
              'background-color': '#5e6ad2',
              'border-color': '#7170ff',
              'border-width': 2,
              'color': '#f7f8f8',
            } as any,
          },
          {
            selector: '.dimmed',
            style: {
              opacity: 0.2,
            } as any,
          },
          {
            selector: '.link-source',
            style: {
              'border-color': '#7170ff',
              'border-width': 3,
              'background-color': 'rgba(94, 106, 210, 0.3)',
            } as any,
          },
        ],
        layout: {
          name: 'dagre',
          rankDir: 'TB',
          nodeSep: 60,
          edgeSep: 20,
          rankSep: 80,
          padding: 20,
          animate: true,
          animationDuration: 300,
        } as any,
        minZoom: 0.3,
        maxZoom: 2,
        wheelSensitivity: 0.3,
      });

      // Apply edge colors
      cy.edges().forEach((edge) => {
        const type = edge.data('type') || 'DEFAULT';
        const color = edgeColorMap[type] || edgeColorMap.DEFAULT;
        edge.style({
          'line-color': color,
          'target-arrow-color': color,
        });
      });

      // Node click
      cy.on('tap', 'node', (evt) => {
        const node = evt.target;

        if (linkMode) {
          if (!linkSourceRef.current) {
            linkSourceRef.current = node;
            node.addClass('link-source');
          } else {
            const sourceId = parseInt(linkSourceRef.current.id().replace('subtask_', ''));
            const targetId = parseInt(node.id().replace('subtask_', ''));
            if (sourceId === targetId) {
              alert('Cannot connect a node to itself');
            } else {
              onCreateDependency?.(sourceId, targetId, linkType);
            }
            linkSourceRef.current.removeClass('link-source');
            linkSourceRef.current = null;
          }
          return;
        }

        const nodeId = node.id().replace('subtask_', '');
        setSelectedNode(nodeId);
        onNodeSelect?.(nodeId);

        const successors = node.successors();
        cy.elements().addClass('dimmed');
        node.removeClass('dimmed');
        successors.removeClass('dimmed');
        node.select();
      });

      // Background click
      cy.on('tap', (evt) => {
        if (evt.target === cy) {
          setSelectedNode(null);
          cy.elements().removeClass('dimmed');
          cy.elements().unselect();
        }
      });

      // Node double click
      cy.on('dbltap', 'node', (evt) => {
        const nodeId = evt.target.id().replace('subtask_', '');
        onNodeDoubleClick?.(nodeId);
      });

      // Background double click
      cy.on('dbltap', (evt) => {
        if (evt.target === cy) {
          onBackgroundDblClick?.();
        }
      });

      // Right-click on node
      cy.on('cxttap', 'node', (evt) => {
        evt.originalEvent.preventDefault();
        const nodeId = evt.target.id().replace('subtask_', '');
        const action = window.prompt('Choose action: edit | note | delete');
        if (action === 'edit') onNodeEdit?.(nodeId);
        else if (action === 'note') onNodeNote?.(nodeId);
        else if (action === 'delete') onNodeDelete?.(nodeId);
      });

      // Right-click on edge
      cy.on('cxttap', 'edge', (evt) => {
        evt.originalEvent.preventDefault();
        const edgeId = evt.target.id().replace('edge_', '');
        if (window.confirm('Delete this dependency?')) {
          onEdgeDelete?.(edgeId);
        }
      });

      cyRef.current = cy;
    }, [nodes, edges, linkMode, linkType, onNodeSelect, onNodeDoubleClick, onNodeEdit, onNodeDelete, onNodeNote, onEdgeDelete, onCreateDependency, onBackgroundDblClick]);

    useEffect(() => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
      if (nodes.length > 0) {
        initGraph();
      }
      return () => {
        if (cyRef.current) {
          cyRef.current.destroy();
          cyRef.current = null;
        }
      };
    }, [nodes, edges]);

    // Handle link mode changes
    useEffect(() => {
      if (!linkMode && linkSourceRef.current) {
        linkSourceRef.current.removeClass('link-source');
        linkSourceRef.current = null;
      }
    }, [linkMode]);

    const zoomIn = useCallback(() => {
      cyRef.current?.zoom(cyRef.current.zoom() * 1.2);
    }, []);

    const zoomOut = useCallback(() => {
      cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
    }, []);

    const fit = useCallback(() => {
      cyRef.current?.fit({ padding: 40 } as any);
    }, []);

    const reload = useCallback(() => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
      initGraph();
    }, [initGraph]);

    useImperativeHandle(ref, () => ({
      zoomIn,
      zoomOut,
      fit,
      reload,
    }));

    if (nodes.length === 0) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#62666d',
            textAlign: 'center',
            background: '#08090a',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>🕸️</div>
          <p>No subtasks yet</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>Double-click anywhere to create one</p>
        </div>
      );
    }

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div
          ref={containerRef}
          style={{ width: '100%', height: '100%', background: '#08090a' }}
        />
        {selectedNode && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              fontSize: 12,
              color: '#8a8f98',
              background: 'rgba(0,0,0,0.7)',
              padding: '4px 8px',
              borderRadius: 4,
            }}
          >
            Selected: {selectedNode}
          </div>
        )}
      </div>
    );
  }
);
