/**
 * Trash View
 */

const TrashManager = {
    deletedTasks: [],
    
    // Load deleted tasks
    async load() {
        try {
            const response = await TrashAPI.getAll();
            this.deletedTasks = response.items || [];
            this.render();
        } catch (error) {
            Toast.error('加载回收站失败');
            console.error(error);
        }
    },
    
    // Render trash
    render() {
        const container = document.getElementById('task-container');
        if (!container) return;
        
        document.getElementById('page-title').textContent = '回收站';
        
        if (this.deletedTasks.length === 0) {
            container.innerHTML = createEmptyState(
                '🗑',
                '回收站为空',
                '删除的任务会在这里保留30天'
            );
            return;
        }
        
        // Add cleanup button
        const headerActions = document.querySelector('.header-actions');
        if (headerActions && !document.getElementById('btn-cleanup')) {
            headerActions.innerHTML = `
                <button class="btn btn-ghost" id="btn-cleanup">清理过期</button>
                <button class="btn btn-ghost" id="btn-refresh">刷新</button>
            `;
            
            document.getElementById('btn-cleanup')?.addEventListener('click', () => {
                this.cleanup();
            });
            
            document.getElementById('btn-refresh')?.addEventListener('click', () => {
                this.load();
            });
        }
        
        container.innerHTML = `
            <div class="date-task-list">
                ${this.deletedTasks.map(task => this.renderDeletedCard(task)).join('')}
            </div>
        `;
        
        this.bindEvents();
    },
    
    // Render deleted task card
    renderDeletedCard(task) {
        const expiresDate = task.expires_at ? new Date(task.expires_at) : null;
        const daysLeft = expiresDate 
            ? Math.ceil((expiresDate - new Date()) / (1000 * 60 * 60 * 24))
            : 30;
        
        return `
            <div class="archive-item" data-id="${task.id}">
                <div class="archive-header">
                    <div>
                        <div class="archive-title">${task.content}</div>
                        <div class="archive-meta">
                            <span>删除于: ${Format.relativeTime(task.deleted_at)}</span>
                            <span>• ${daysLeft > 0 ? `还有 ${daysLeft} 天过期` : '即将过期'}</span>
                            ${task.subtasks?.length > 0 ? `<span>• ${task.subtasks.length} 个子任务</span>` : ''}
                        </div>
                    </div>
                    <div class="archive-actions">
                        <button class="archive-btn restore" data-id="${task.id}">恢复</button>
                        <button class="archive-btn delete" data-id="${task.id}">永久删除</button>
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
            const response = await TrashAPI.restore(taskId);
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
            await TrashAPI.delete(taskId);
            Toast.success('已永久删除');
            await this.load();
        } catch (error) {
            Toast.error('删除失败');
            console.error(error);
        }
    },
    
    // Cleanup expired tasks
    async cleanup() {
        if (!await confirmDialog('确定要清理所有已过期的任务吗？')) return;
        
        try {
            const response = await TrashAPI.cleanup();
            const count = response.data?.deleted_count || 0;
            Toast.success(`已清理 ${count} 个过期任务`);
            await this.load();
        } catch (error) {
            Toast.error('清理失败');
            console.error(error);
        }
    },
    
    // Empty trash
    async empty() {
        if (!await confirmDialog('确定要清空回收站吗？所有任务将被永久删除。')) return;
        
        try {
            const response = await TrashAPI.empty();
            const count = response.data?.deleted_count || 0;
            Toast.success(`已清空 ${count} 个任务`);
            await this.load();
        } catch (error) {
            Toast.error('清空失败');
            console.error(error);
        }
    },
};
