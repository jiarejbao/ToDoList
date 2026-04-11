/**
 * Completed Tasks View
 */

const CompletedManager = {
    completedTasks: [],
    
    // Load completed tasks
    async load() {
        try {
            const response = await CompletedAPI.getAll();
            this.completedTasks = response.items || [];
            this.render();
        } catch (error) {
            Toast.error('加载已完成任务失败');
            console.error(error);
        }
    },
    
    // Render completed tasks
    render() {
        const container = document.getElementById('task-container');
        if (!container) return;
        
        document.getElementById('page-title').textContent = '已完成任务';
        
        if (this.completedTasks.length === 0) {
            container.innerHTML = createEmptyState(
                '✓',
                '暂无已完成任务',
                '完成的任务会显示在这里'
            );
            return;
        }
        
        container.innerHTML = `
            <div class="date-task-list">
                ${this.completedTasks.map(task => this.renderCompletedCard(task)).join('')}
            </div>
        `;
        
        this.bindEvents();
    },
    
    // Render completed task card
    renderCompletedCard(task) {
        return `
            <div class="archive-item" data-id="${task.id}">
                <div class="archive-header">
                    <div>
                        <div class="archive-title">${task.content}</div>
                        <div class="archive-meta">
                            <span>完成于: ${Format.relativeTime(task.completed_at)}</span>
                            ${task.subtasks?.length > 0 ? `<span>• ${task.subtasks.length} 个子任务</span>` : ''}
                        </div>
                    </div>
                    <div class="archive-actions">
                        <button class="archive-btn restore" data-id="${task.id}">恢复</button>
                        <button class="archive-btn delete" data-id="${task.id}">删除</button>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Bind events
    bindEvents() {
        // Restore
        document.querySelectorAll('.archive-btn.restore').forEach(btn => {
            btn.addEventListener('click', async () => {
                const taskId = parseInt(btn.dataset.id);
                await this.restore(taskId);
            });
        });
        
        // Delete permanently
        document.querySelectorAll('.archive-btn.delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const taskId = parseInt(btn.dataset.id);
                await this.delete(taskId);
            });
        });
    },
    
    // Restore task
    async restore(taskId) {
        if (!await confirmDialog('确定要恢复此任务吗？')) return;
        
        try {
            const response = await CompletedAPI.restore(taskId);
            Toast.success(response.message || '任务已恢复');
            await this.load();
        } catch (error) {
            Toast.error('恢复失败');
            console.error(error);
        }
    },
    
    // Delete permanently
    async delete(taskId) {
        if (!await confirmDialog('确定要永久删除此任务吗？此操作不可撤销。')) return;
        
        try {
            await CompletedAPI.delete(taskId);
            Toast.success('已永久删除');
            await this.load();
        } catch (error) {
            Toast.error('删除失败');
            console.error(error);
        }
    },
};
