/**
 * Task Page Logic
 * Handles subtask cards rendering, workflow graph, and note sidebar
 */
class TaskPage {
    constructor() {
        this.taskId = new URLSearchParams(window.location.search).get('id');
        this.task = null;
        this.subtasks = [];
        this.workflowGraph = null;
        this.noteEditor = null;
        this.sidebarOpen = false;
    }

    async init() {
        if (!this.taskId) {
            this.showError('No task ID provided');
            return;
        }

        await this.loadTask();
        this.renderHeader();
        this.renderSubtasks();
        await this.initWorkflowGraph();
        this.bindEvents();
    }

    async loadTask() {
        try {
            this.task = await TaskAPI.getById(this.taskId);
            this.subtasks = this.task.subtasks || [];
        } catch (error) {
            console.error('Failed to load task:', error);
            this.showError('Task not found');
        }
    }

    renderHeader() {
        const header = document.querySelector('.task-page-header h1');
        if (header && this.task) {
            header.textContent = this.task.content;
        }

        const metaEl = document.getElementById('task-meta');
        if (metaEl && this.task) {
            const dueDate = this.task.due_date ? Format.date(this.task.due_date) : 'No due date';
            const priority = Priority.getLabel(this.task.priority);
            metaEl.innerHTML = `
                <span class="priority-badge ${Priority.getClass(this.task.priority)}">${priority}</span>
                <span>Due: ${dueDate}</span>
                <span>${this.subtasks.length} subtasks</span>
            `;
        }
    }

    renderSubtasks() {
        const container = document.getElementById('subtask-cards');
        if (!container) return;

        if (this.subtasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <p>No subtasks yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.subtasks.map(st => this.renderSubtaskCard(st)).join('');

        // Bind click events to subtask cards
        container.querySelectorAll('.subtask-card').forEach(card => {
            card.addEventListener('click', () => {
                const subtaskId = card.dataset.id;
                window.location.href = `/note.html?subtask_id=${subtaskId}`;
            });
        });
    }

    renderSubtaskCard(subtask) {
        const isOverdue = Format.isOverdue(subtask.due_date);
        const dueDateStr = subtask.due_date ? Format.date(subtask.due_date) : 'No date';
        const priorityLabel = Priority.getLabel(subtask.priority);
        const priorityClass = Priority.getClass(subtask.priority);

        return `
            <div class="subtask-card" data-id="${subtask.id}">
                <div class="subtask-card-header">
                    <h4 class="subtask-card-title">${this.escapeHtml(subtask.content)}</h4>
                </div>
                ${subtask.description ? `<p style="font-size:13px;color:#8a8f98;margin:4px 0 0 0;line-height:1.4;">${this.escapeHtml(subtask.description)}</p>` : ''}
                <div class="subtask-card-meta">
                    <span class="priority-badge ${priorityClass}">${priorityLabel}</span>
                    <span ${isOverdue ? 'style="color:#ef4444;"' : ''}>📅 ${dueDateStr}</span>
                </div>
            </div>
        `;
    }

    async initWorkflowGraph() {
        const container = document.getElementById('workflow-graph');
        if (!container || !this.taskId) return;

        this.workflowGraph = new WorkflowGraph('workflow-graph', this.taskId);
        await this.workflowGraph.init();
    }

    bindEvents() {
        // Toggle sidebar
        const toggleBtn = document.getElementById('btn-toggle-note');
        const sidebar = document.querySelector('.task-page-sidebar');

        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', async () => {
                this.sidebarOpen = !this.sidebarOpen;
                sidebar.classList.toggle('open', this.sidebarOpen);

                if (this.sidebarOpen && !this.noteEditor) {
                    await this.initNoteEditor();
                }
            });
        }

        // Close sidebar
        const closeBtn = document.getElementById('btn-close-sidebar');
        if (closeBtn && sidebar) {
            closeBtn.addEventListener('click', () => {
                this.sidebarOpen = false;
                sidebar.classList.remove('open');
            });
        }

        // Back button
        const backBtn = document.getElementById('btn-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = '/';
            });
        }

        // Graph controls
        const zoomInBtn = document.getElementById('btn-zoom-in');
        const zoomOutBtn = document.getElementById('btn-zoom-out');
        const fitBtn = document.getElementById('btn-fit');

        if (zoomInBtn && this.workflowGraph) {
            zoomInBtn.addEventListener('click', () => this.workflowGraph.zoomIn());
        }
        if (zoomOutBtn && this.workflowGraph) {
            zoomOutBtn.addEventListener('click', () => this.workflowGraph.zoomOut());
        }
        if (fitBtn && this.workflowGraph) {
            fitBtn.addEventListener('click', () => this.workflowGraph.fit());
        }
    }

    async initNoteEditor() {
        const container = document.getElementById('note-editor-container');
        if (!container || !this.taskId) return;

        // Load existing note
        let initialContent = '';
        try {
            const note = await TaskAPI.getTaskNote(this.taskId);
            initialContent = note.content || '';
        } catch (e) {
            console.log('No existing note');
        }

        this.noteEditor = new NoteEditor('note-editor-container', {
            onSave: async (markdown) => {
                try {
                    await TaskAPI.updateTaskNote(this.taskId, { content: markdown });
                } catch (error) {
                    console.error('Failed to save note:', error);
                }
            }
        });

        await this.noteEditor.init(initialContent);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        document.body.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#08090a;color:#d0d6e0;">
                <div style="text-align:center;">
                    <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
                    <h2 style="font-size:20px;font-weight:590;color:#f7f8f8;">${message}</h2>
                    <a href="/" style="display:inline-block;margin-top:16px;color:#7170ff;text-decoration:none;">← Back to tasks</a>
                </div>
            </div>
        `;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const taskPage = new TaskPage();
    taskPage.init();
});
