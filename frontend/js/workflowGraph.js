/**
 * Cytoscape.js Workflow Graph Wrapper
 * Handles DAG visualization for subtask dependencies
 */
class WorkflowGraph {
    constructor(containerId, taskId) {
        this.containerId = containerId;
        this.taskId = taskId;
        this.cy = null;
    }

    async init() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Load Cytoscape and dagre extension via CDN
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
                    <p>No subtasks to visualize</p>
                </div>
            `;
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
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'width': 160,
                        'height': 56,
                        'shape': 'roundrectangle',
                        'text-wrap': 'wrap',
                        'text-max-width': 140,
                        'padding': 10,
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
                }
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
            }
        });

        this.bindEvents();
        this.applyEdgeColors();
    }

    async loadDependencies() {
        // Cytoscape core
        if (typeof cytoscape === 'undefined') {
            await this.loadScript('https://unpkg.com/cytoscape@3.26.0/dist/cytoscape.min.js');
        }
        // dagre layout extension
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
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    applyEdgeColors() {
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
        // Click node: highlight path
        this.cy.on('tap', 'node', (evt) => {
            const node = evt.target;
            this.highlightPath(node.id());
        });

        // Click background: reset
        this.cy.on('tap', (evt) => {
            if (evt.target === this.cy) {
                this.resetHighlight();
            }
        });

        // Double-click node: navigate to subtask note
        this.cy.on('dbltap', 'node', (evt) => {
            const nodeId = evt.target.id();
            const subtaskId = nodeId.replace('subtask_', '');
            window.open(`/note.html?subtask_id=${subtaskId}`, '_blank');
        });
    }

    highlightPath(nodeId) {
        // Highlight the selected node and all its downstream path
        const node = this.cy.getElementById(nodeId);
        const successors = node.successors();

        this.cy.elements().addClass('dimmed');
        node.removeClass('dimmed');
        successors.removeClass('dimmed');

        node.select();
    }

    resetHighlight() {
        this.cy.elements().removeClass('dimmed');
        this.cy.elements().unselect();
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

    destroy() {
        if (this.cy) {
            this.cy.destroy();
            this.cy = null;
        }
    }
}
