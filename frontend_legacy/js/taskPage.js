/**
 * Task Page Logic
 * Coordinates workflow graph, subtask modal, and note sidebar
 */
class TaskPage {
    constructor() {
        this.taskId = new URLSearchParams(window.location.search).get('id');
        this.task = null;
        this.subtasks = [];
        this.workflowGraph = null;
        this.noteEditor = null;
        this.sidebarOpen = false;
        this.linkMode = false;
        this.editingSubtaskId = null;
    }

    async init() {
        if (!this.taskId) {
            this.showError('No task ID provided');
            return;
        }

        await this.loadTask();
        this.renderHeader();
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
        const title = document.getElementById('task-title');
        const meta = document.getElementById('task-meta');
        if (title && this.task) {
            title.textContent = this.task.content;
        }
        if (meta && this.task) {
            const dueDate = this.task.due_date ? Format.date(this.task.due_date) : 'No due date';
            meta.innerHTML = `
                <span class="priority-badge ${Priority.getClass(this.task.priority)}">${Priority.getLabel(this.task.priority)}</span>
                <span style="margin:0 6px;">•</span>
                <span>Due: ${dueDate}</span>
                <span style="margin:0 6px;">•</span>
                <span>${this.subtasks.length} subtasks</span>
            `;
        }
    }

    async initWorkflowGraph() {
        this.workflowGraph = new WorkflowGraph('workflow-graph', this.taskId, {
            onNodeEdit: (id) => this.editSubtask(id),
            onNodeDelete: (id) => this.deleteSubtask(id),
            onNodeNote: (id) => {
                window.open(`/note.html?subtask_id=${id}`, '_blank');
            },
            onEdgeDelete: (id) => this.deleteDependency(id),
            onBackgroundDblClick: () => this.openSubtaskModal(),
            onNodeSelect: (id) => {
                // Optional: show node details somewhere
            },
        });

        // Override dependency creation
        this.workflowGraph.onCreateDependency = async (fromId, toId, type) => {
            try {
                await WorkflowAPI.createDependency(this.taskId, {
                    from_subtask_id: fromId,
                    to_subtask_id: toId,
                    dependency_type: type,
                });
                Toast.success('Dependency created');
                await this.workflowGraph.reload();
            } catch (error) {
                Toast.error(error.message || 'Failed to create dependency');
            }
        };

        await this.workflowGraph.init();
    }

    bindEvents() {
        // Back button
        document.getElementById('btn-back')?.addEventListener('click', () => {
            window.location.href = '/';
        });

        // New subtask button
        document.getElementById('btn-new-subtask')?.addEventListener('click', () => {
            this.openSubtaskModal();
        });

        // Link mode toggle
        const linkBtn = document.getElementById('btn-link-mode');
        const linkType = document.getElementById('link-type');
        if (linkBtn) {
            linkBtn.addEventListener('click', () => {
                this.linkMode = !this.linkMode;
                linkBtn.classList.toggle('active', this.linkMode);
                linkBtn.textContent = this.linkMode ? 'Cancel' : 'Connect';
                this.workflowGraph?.setLinkMode(this.linkMode, linkType?.value || 'BLOCKS');
            });
        }
        if (linkType) {
            linkType.addEventListener('change', () => {
                if (this.linkMode) {
                    this.workflowGraph?.setLinkMode(true, linkType.value);
                }
            });
        }

        // Toggle sidebar
        const toggleBtn = document.getElementById('btn-toggle-note');
        const sidebar = document.getElementById('note-sidebar');
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
        document.getElementById('btn-close-sidebar')?.addEventListener('click', () => {
            this.sidebarOpen = false;
            sidebar?.classList.remove('open');
        });

        // Graph controls
        document.getElementById('btn-zoom-in')?.addEventListener('click', () => this.workflowGraph?.zoomIn());
        document.getElementById('btn-zoom-out')?.addEventListener('click', () => this.workflowGraph?.zoomOut());
        document.getElementById('btn-fit')?.addEventListener('click', () => this.workflowGraph?.fit());

        // Subtask modal
        document.getElementById('btn-close-subtask-modal')?.addEventListener('click', () => this.closeSubtaskModal());
        document.getElementById('btn-cancel-subtask')?.addEventListener('click', () => this.closeSubtaskModal());
        document.getElementById('btn-save-subtask')?.addEventListener('click', () => this.saveSubtask());

        // Close modal on overlay click
        document.getElementById('subtask-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'subtask-modal') this.closeSubtaskModal();
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSubtaskModal();
                if (this.linkMode) {
                    this.linkMode = false;
                    linkBtn?.classList.remove('active');
                    linkBtn && (linkBtn.textContent = 'Connect');
                    this.workflowGraph?.setLinkMode(false);
                }
            }
        });
    }

    // Subtask Modal
    openSubtaskModal(subtask = null) {
        this.editingSubtaskId = subtask ? subtask.id : null;
        const modal = document.getElementById('subtask-modal');
        const title = document.getElementById('subtask-modal-title');

        if (title) title.textContent = subtask ? 'Edit Subtask' : 'New Subtask';
        document.getElementById('subtask-edit-id').value = subtask ? subtask.id : '';
        document.getElementById('subtask-content').value = subtask ? subtask.content : '';
        document.getElementById('subtask-description').value = subtask ? subtask.description || '' : '';
        document.getElementById('subtask-due-date').value = subtask && subtask.due_date
            ? subtask.due_date.split('T')[0]
            : '';
        document.getElementById('subtask-priority').value = subtask ? subtask.priority : 2;

        if (modal) modal.style.display = 'flex';
    }

    closeSubtaskModal() {
        const modal = document.getElementById('subtask-modal');
        if (modal) modal.style.display = 'none';
        this.editingSubtaskId = null;
        document.getElementById('subtask-form')?.reset?.();
    }

    async saveSubtask() {
        const content = document.getElementById('subtask-content').value.trim();
        if (!content) {
            Toast.error('Content is required');
            return;
        }

        const data = {
            content,
            description: document.getElementById('subtask-description').value.trim() || null,
            due_date: document.getElementById('subtask-due-date').value || null,
            priority: parseInt(document.getElementById('subtask-priority').value),
        };

        try {
            if (this.editingSubtaskId) {
                await SubtaskAPI.update(this.editingSubtaskId, data);
                Toast.success('Subtask updated');
            } else {
                await SubtaskAPI.create(this.taskId, data);
                Toast.success('Subtask created');
            }
            this.closeSubtaskModal();
            await this.refreshWorkflow();
            await this.loadTask();
            this.renderHeader();
        } catch (error) {
            Toast.error(error.message || 'Save failed');
        }
    }

    async editSubtask(subtaskId) {
        const subtask = this.subtasks.find(s => String(s.id) === String(subtaskId));
        if (subtask) {
            this.openSubtaskModal(subtask);
        }
    }

    async deleteSubtask(subtaskId) {
        if (!confirm('Delete this subtask? Related notes and dependencies will also be removed.')) return;
        try {
            await SubtaskAPI.delete(subtaskId);
            Toast.success('Subtask deleted');
            await this.refreshWorkflow();
            await this.loadTask();
            this.renderHeader();
        } catch (error) {
            Toast.error(error.message || 'Delete failed');
        }
    }

    async deleteDependency(depId) {
        try {
            await WorkflowAPI.deleteDependency(depId);
            Toast.success('Dependency deleted');
            await this.workflowGraph.reload();
        } catch (error) {
            Toast.error(error.message || 'Delete failed');
        }
    }

    async refreshWorkflow() {
        await this.workflowGraph.reload();
    }

    // Note Editor
    async initNoteEditor() {
        const container = document.getElementById('note-editor-container');
        if (!container || !this.taskId) return;

        let initialContent = '';
        try {
            const note = await TaskAPI.getTaskNote(this.taskId);
            initialContent = note.content || '';
        } catch (e) {
            // No existing note
        }

        this.noteEditor = new NoteEditor('#note-editor-container', {
            onSave: async (html) => {
                try {
                    await TaskAPI.updateTaskNote(this.taskId, { content: html });
                } catch (error) {
                    console.error('Failed to save note:', error);
                }
            }
        });

        await this.noteEditor.init(initialContent);
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
