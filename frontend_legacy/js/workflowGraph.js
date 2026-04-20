/**
 * Cytoscape.js Workflow Graph Wrapper
 * Nodes = subtask windows, edges = dependencies
 * Supports: rich node display, context menu, link mode, edge deletion
 */
class WorkflowGraph {
    constructor(containerId, taskId, options = {}) {
        this.containerId = containerId;
        this.taskId = taskId;
        this.cy = null;
        this.onNodeEdit = options.onNodeEdit || (() => {});
        this.onNodeDelete = options.onNodeDelete || (() => {});
        this.onNodeNote = options.onNodeNote || (() => {});
        this.onEdgeDelete = options.onEdgeDelete || (() => {});
        this.onBackgroundDblClick = options.onBackgroundDblClick || (() => {});
        this.onNodeSelect = options.onNodeSelect || (() => {});
        this.linkMode = false;
        this.linkSource = null;
        this.linkType = 'BLOCKS';
    }

    async init() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        await this.loadDependencies();

        let workflowData;
        try {
            workflowData = await TaskAPI.getWorkflow(this.taskId);
        } catch (error) {
            console.error('Failed to load workflow:', error);
            container.innerHTML = '<div class="empty-state"><p>Failed to load workflow</p></div>';
            return;
        }

        if (workflowData.nodes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🕸️</div>
                    <p>No subtasks yet</p>
                    <p style="font-size:12px;margin-top:8px;">Double-click anywhere to create one</p>
                </div>
            `;
            this.bindEmptyContainer(container);
            return;
        }

        this.cy = cytoscape({
            container: container,
            elements: [
                ...workflowData.nodes,
                ...workflowData.edges
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
                        'font-family': 'Inter Variable, system-ui, sans-serif',
                        'text-valign': 'top',
                        'text-halign': 'center',
                        'width': 200,
                        'height': 90,
                        'shape': 'roundrectangle',
                        'text-wrap': 'wrap',
                        'text-max-width': 180,
                        'padding': 12,
                        'text-margin-y': 4,
                    }
                },
                {
                    selector: 'node[priority = 4]',
                    style: {
                        'border-color': '#ef4444',
                        'border-width': 2,
                    }
                },
                {
                    selector: 'node[priority = 3]',
                    style: {
                        'border-color': '#f59e0b',
                        'border-width': 2,
                    }
                },
                {
                    selector: 'node[priority = 1]',
                    style: {
                        'border-color': '#10b981',
                        'border-width': 2,
                    }
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
                    }
                },
                {
                    selector: ':selected',
                    style: {
                        'background-color': '#5e6ad2',
                        'border-color': '#7170ff',
                        'border-width': 2,
                        'color': '#f7f8f8',
                    }
                },
                {
                    selector: '.dimmed',
                    style: {
                        'opacity': 0.2,
                    }
                },
                {
                    selector: '.link-source',
                    style: {
                        'border-color': '#7170ff',
                        'border-width': 3,
                        'background-color': 'rgba(94, 106, 210, 0.3)',
                    }
                }
            ],
            layout: {
                name: 'dagre',
                rankDir: 'TB',
                nodeSep: 80,
                edgeSep: 30,
                rankSep: 100,
                padding: 30,
                animate: true,
                animationDuration: 300,
            },
            minZoom: 0.3,
            maxZoom: 2,
            wheelSensitivity: 0.3,
        });

        this.applyEdgeColors();
        this.bindEvents();
    }

    async loadDependencies() {
        if (typeof cytoscape === 'undefined') {
            await this.loadScript('https://unpkg.com/cytoscape@3.26.0/dist/cytoscape.min.js');
        }
        if (typeof cytoscape !== 'undefined' && !cytoscape('layout', 'dagre')) {
            await this.loadScript('https://unpkg.com/dagre@0.8.5/dist/dagre.min.js');
            await this.loadScript('https://unpkg.com/cytoscape-dagre@2.5.0/cytoscape-dagre.js');
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
        });
    }

    applyEdgeColors() {
        if (!this.cy) return;
        const colorMap = {
            'BLOCKS': '#5e6ad2',
            'REQUIRES': '#10b981',
            'TRIGGERS': '#f59e0b',
        };
        this.cy.edges().forEach(edge => {
            const type = edge.data('type');
            const color = colorMap[type] || '#5e6ad2';
            edge.style({
                'line-color': color,
                'target-arrow-color': color,
            });
        });
    }

    bindEvents() {
        if (!this.cy) return;

        // Node click
        this.cy.on('tap', 'node', (evt) => {
            const node = evt.target;

            if (this.linkMode) {
                this.handleLinkModeClick(node);
                return;
            }

            this.onNodeSelect(node.id().replace('subtask_', ''));
            this.highlightPath(node.id());
        });

        // Background click
        this.cy.on('tap', (evt) => {
            if (evt.target === this.cy) {
                this.resetHighlight();
                this.hideContextMenu();
            }
        });

        // Node double click
        this.cy.on('dbltap', 'node', (evt) => {
            const nodeId = evt.target.id().replace('subtask_', '');
            this.onNodeNote(nodeId);
        });

        // Background double click
        this.cy.on('dbltap', (evt) => {
            if (evt.target === this.cy) {
                this.onBackgroundDblClick();
            }
        });

        // Right-click on node
        this.cy.on('cxttap', 'node', (evt) => {
            evt.originalEvent.preventDefault();
            const nodeId = evt.target.id().replace('subtask_', '');
            this.showNodeContextMenu(evt.originalEvent.clientX, evt.originalEvent.clientY, nodeId);
        });

        // Right-click on edge
        this.cy.on('cxttap', 'edge', (evt) => {
            evt.originalEvent.preventDefault();
            const edgeId = evt.target.id().replace('edge_', '');
            if (confirm('Delete this dependency?')) {
                this.onEdgeDelete(edgeId);
            }
        });

        // Hide context menu on any click
        document.addEventListener('click', () => this.hideContextMenu());
    }

    bindEmptyContainer(container) {
        container.addEventListener('dblclick', () => {
            this.onBackgroundDblClick();
        });
    }

    handleLinkModeClick(node) {
        if (!this.linkSource) {
            // First node selected
            this.linkSource = node;
            node.addClass('link-source');
        } else {
            // Second node selected - create dependency
            const sourceId = parseInt(this.linkSource.id().replace('subtask_', ''));
            const targetId = parseInt(node.id().replace('subtask_', ''));

            if (sourceId === targetId) {
                Toast.error('Cannot connect a node to itself');
            } else {
                this.onCreateDependency(sourceId, targetId, this.linkType);
            }

            this.linkSource.removeClass('link-source');
            this.linkSource = null;
        }
    }

    onCreateDependency(fromId, toId, type) {
        // This is overridden by taskPage.js
        console.log('Create dependency:', fromId, '->', toId, type);
    }

    showNodeContextMenu(x, y, nodeId) {
        const menu = document.getElementById('node-context-menu');
        if (!menu) return;

        menu.style.display = 'block';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.dataset.nodeId = nodeId;

        menu.querySelectorAll('.context-menu-item').forEach(item => {
            item.onclick = (e) => {
                e.stopPropagation();
                const action = item.dataset.action;
                if (action === 'edit') this.onNodeEdit(nodeId);
                else if (action === 'note') this.onNodeNote(nodeId);
                else if (action === 'delete') this.onNodeDelete(nodeId);
                this.hideContextMenu();
            };
        });
    }

    hideContextMenu() {
        const menu = document.getElementById('node-context-menu');
        if (menu) menu.style.display = 'none';
    }

    highlightPath(nodeId) {
        if (!this.cy) return;
        const node = this.cy.getElementById(nodeId);
        const successors = node.successors();
        this.cy.elements().addClass('dimmed');
        node.removeClass('dimmed');
        successors.removeClass('dimmed');
        node.select();
    }

    resetHighlight() {
        if (!this.cy) return;
        this.cy.elements().removeClass('dimmed');
        this.cy.elements().unselect();
    }

    setLinkMode(enabled, type = 'BLOCKS') {
        this.linkMode = enabled;
        this.linkType = type;
        if (!enabled && this.linkSource) {
            this.linkSource.removeClass('link-source');
            this.linkSource = null;
        }
    }

    zoomIn() {
        if (this.cy) this.cy.zoom(this.cy.zoom() * 1.2);
    }

    zoomOut() {
        if (this.cy) this.cy.zoom(this.cy.zoom() * 0.8);
    }

    fit() {
        if (this.cy) this.cy.fit(40);
    }

    async reload() {
        if (this.cy) {
            this.cy.destroy();
            this.cy = null;
        }
        await this.init();
    }

    destroy() {
        if (this.cy) {
            this.cy.destroy();
            this.cy = null;
        }
    }
}
