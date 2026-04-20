/**
 * Subtask Note Page Logic
 * Handles standalone note editing for a single subtask
 */
class SubtaskNotePage {
    constructor() {
        const params = new URLSearchParams(window.location.search);
        this.subtaskId = params.get('subtask_id');
        this.subtask = null;
        this.noteEditor = null;
    }

    async init() {
        if (!this.subtaskId) {
            this.showError('No subtask ID provided');
            return;
        }

        await this.loadSubtask();
        this.renderHeader();
        await this.initNoteEditor();
    }

    async loadSubtask() {
        try {
            this.subtask = await TaskAPI.getSubtask(this.subtaskId);
        } catch (error) {
            console.error('Failed to load subtask:', error);
            this.showError('Subtask not found');
        }
    }

    renderHeader() {
        const titleEl = document.getElementById('note-title');
        const metaEl = document.getElementById('note-meta');

        if (titleEl && this.subtask) {
            titleEl.textContent = this.subtask.content;
        }

        if (metaEl && this.subtask) {
            const taskName = `Task #${this.subtask.task_id}`;
            const dueDate = this.subtask.due_date ? Format.date(this.subtask.due_date) : 'No due date';
            metaEl.innerHTML = `
                <span>From: <a href="/task.html?id=${this.subtask.task_id}" style="color:#7170ff;text-decoration:none;">${this.escapeHtml(taskName)}</a></span>
                <span style="margin:0 8px;">•</span>
                <span>Due: ${dueDate}</span>
                <span style="margin:0 8px;">•</span>
                <span class="priority-badge ${Priority.getClass(this.subtask.priority)}">${Priority.getLabel(this.subtask.priority)}</span>
            `;
        }

        // Bind back button
        const backBtn = document.getElementById('btn-back-to-task');
        if (backBtn && this.subtask) {
            backBtn.href = `/task.html?id=${this.subtask.task_id}`;
        }
    }

    async initNoteEditor() {
        const container = document.getElementById('note-editor-wrapper');
        if (!container) return;

        // Load existing note
        let initialContent = '';
        try {
            const note = await TaskAPI.getSubtaskNote(this.subtaskId);
            initialContent = note.content || '';
        } catch (e) {
            console.log('No existing note for subtask');
        }

        this.noteEditor = new NoteEditor('#note-editor-wrapper', {
            onSave: async (markdown) => {
                try {
                    await TaskAPI.updateSubtaskNote(this.subtaskId, { content: markdown });
                    this.showSaveIndicator('Saved');
                } catch (error) {
                    console.error('Failed to save subtask note:', error);
                    this.showSaveIndicator('Save failed', true);
                }
            }
        });

        await this.noteEditor.init(initialContent);
    }

    showSaveIndicator(text, isError = false) {
        let indicator = document.getElementById('save-indicator');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.id = 'save-indicator';
            indicator.style.cssText = `
                font-size: 12px;
                margin-left: 12px;
                transition: opacity 0.3s ease;
            `;
            const header = document.querySelector('.note-page-header');
            if (header) header.appendChild(indicator);
        }

        indicator.textContent = text;
        indicator.style.color = isError ? '#ef4444' : '#10b981';
        indicator.style.opacity = '1';

        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 2000);
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
    const page = new SubtaskNotePage();
    page.init();
});
