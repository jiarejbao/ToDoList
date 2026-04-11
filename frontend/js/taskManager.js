/**
 * Task Management
 */

const TaskManager = {
    tasks: [],
    currentView: 'all',
    editingTaskId: null,
    tempSubtasks: [],
    
    // Initialize
    init() {
        this.bindEvents();
        this.loadTasks();
    },
    
    // Bind events
    bindEvents() {
        // New task button
        document.getElementById('btn-new-task')?.addEventListener('click', () => {
            this.openModal();
        });
        
        // Modal close buttons
        document.getElementById('btn-close-modal')?.addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('btn-cancel')?.addEventListener('click', () => {
            this.closeModal();
        });
        
        // Save task
        document.getElementById('btn-save')?.addEventListener('click', () => {
            this.saveTask();
        });
        
        // Add subtask button
        document.getElementById('btn-add-subtask')?.addEventListener('click', () => {
            this.openSubtaskModal();
        });
        
        // Refresh button
        document.getElementById('btn-refresh')?.addEventListener('click', () => {
            this.loadTasks();
        });
        
        // Subtask modal
        document.getElementById('btn-close-subtask-modal')?.addEventListener('click', () => {
            Modal.hide('subtask-modal');
        });
        
        document.getElementById('btn-cancel-subtask')?.addEventListener('click', () => {
            Modal.hide('subtask-modal');
        });
        
        document.getElementById('btn-save-subtask')?.addEventListener('click', () => {
            this.addSubtask();
        });
        
        // Close modal on overlay click
        document.getElementById('task-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'task-modal') {
                this.closeModal();
            }
        });
    },
    
    // Load tasks
    async loadTasks() {
        try {
            const tasks = await TaskAPI.getAll();
            this.tasks = tasks;
            this.render();
        } catch (error) {
            Toast.error('加载任务失败');
            console.error(error);
        }
    },
    
    // Render tasks
    render() {
        const container = document.getElementById('task-container');
        if (!container) return;
        
        let filteredTasks = this.tasks;
        
        // Apply view filter
        switch (this.currentView) {
            case 'today':
                const today = new Date().toISOString().split('T')[0];
                filteredTasks = this.tasks.filter(t => t.due_date?.split('T')[0] === today);
                break;
            case 'upcoming':
                const today2 = new Date().toISOString().split('T')[0];
                filteredTasks = this.tasks.filter(t => t.due_date && t.due_date.split('T')[0] >= today2);
                break;
            case 'no-date':
                filteredTasks = this.tasks.filter(t => !t.due_date);
                break;
            case 'priority-high':
                filteredTasks = this.tasks.filter(t => t.priority >= 3);
                break;
        }
        
        // Sort by order_index
        filteredTasks.sort((a, b) => a.order_index - b.order_index);
        
        // Render based on view
        if (this.currentView === 'today' || this.currentView === 'upcoming') {
            DateGroup.render('task-container', filteredTasks, (task) => this.renderTaskCard(task));
        } else {
            // Simple list view for other filters
            if (filteredTasks.length === 0) {
                container.innerHTML = createEmptyState(
                    '📋',
                    '暂无任务',
                    this.currentView === 'all' ? '点击"新建任务"开始添加' : '该筛选条件下没有任务'
                );
            } else {
                container.innerHTML = `
                    <div class="date-task-list">
                        ${filteredTasks.map(task => this.renderTaskCard(task)).join('')}
                    </div>
                `;
            }
        }
        
        // Bind task events
        this.bindTaskEvents();
    },
    
    // Render task card HTML
    renderTaskCard(task) {
        const isOverdue = Format.isOverdue(task.due_date);
        const isToday = Format.isToday(task.due_date);
        const dateClass = isOverdue ? 'overdue' : isToday ? 'today' : '';
        const priorityClass = Priority.getClass(task.priority);
        
        const subtasksHtml = task.subtasks?.length > 0
            ? `
                <div class="subtasks-container">
                    ${task.subtasks.map(sub => `
                        <div class="subtask-item" data-id="${sub.id}">
                            <div class="subtask-checkbox" data-id="${sub.id}"></div>
                            <span class="subtask-content">${sub.content}</span>
                        </div>
                    `).join('')}
                </div>
            `
            : '';
        
        return `
            <div class="task-card" data-id="${task.id}" draggable="true">
                <div class="task-header">
                    <div class="task-checkbox" data-id="${task.id}"></div>
                    <div class="task-content">
                        <div class="task-title">${task.content}</div>
                        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                        <div class="task-meta">
                            ${task.due_date ? `<span class="task-date ${dateClass}">📅 ${Format.date(task.due_date)}</span>` : ''}
                            <span class="priority-badge ${priorityClass}">${Priority.getLabel(task.priority)}</span>
                            ${task.subtasks?.length > 0 ? `<span class="task-count">${task.subtasks.length} 个子任务</span>` : ''}
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="task-btn btn-edit" data-id="${task.id}" title="编辑">✎</button>
                        <button class="task-btn delete btn-delete" data-id="${task.id}" title="删除">🗑</button>
                    </div>
                </div>
                ${subtasksHtml}
            </div>
        `;
    },
    
    // Bind task events
    bindTaskEvents() {
        // Complete task
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('click', async (e) => {
                e.stopPropagation();
                const taskId = parseInt(checkbox.dataset.id);
                await this.completeTask(taskId);
            });
        });
        
        // Edit task
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = parseInt(btn.dataset.id);
                this.editTask(taskId);
            });
        });
        
        // Delete task
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const taskId = parseInt(btn.dataset.id);
                await this.deleteTask(taskId);
            });
        });
        
        // Complete subtask
        document.querySelectorAll('.subtask-checkbox').forEach(checkbox => {
            checkbox.addEventListener('click', async (e) => {
                e.stopPropagation();
                const subtaskId = parseInt(checkbox.dataset.id);
                await this.completeSubtask(subtaskId);
            });
        });
        
        // Drag and drop for reordering
        this.initDragAndDrop();
    },
    
    // Initialize drag and drop
    initDragAndDrop() {
        const container = document.querySelector('.date-task-list');
        if (!container) return;
        
        const cards = container.querySelectorAll('.task-card');
        let draggedCard = null;
        
        cards.forEach(card => {
            card.draggable = true;
            
            card.addEventListener('dragstart', (e) => {
                draggedCard = card;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                cards.forEach(c => c.classList.remove('drag-over'));
            });
            
            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                return false;
            });
            
            card.addEventListener('dragenter', () => {
                if (card !== draggedCard) {
                    card.classList.add('drag-over');
                }
            });
            
            card.addEventListener('dragleave', () => {
                card.classList.remove('drag-over');
            });
            
            card.addEventListener('drop', async (e) => {
                e.stopPropagation();
                
                if (draggedCard !== card) {
                    const taskId = parseInt(draggedCard.dataset.id);
                    const newIndex = Array.from(container.children).indexOf(card);
                    
                    await this.reorderTask(taskId, newIndex);
                }
                
                return false;
            });
        });
    },
    
    // Open modal for new task
    openModal(task = null) {
        this.editingTaskId = task ? task.id : null;
        this.tempSubtasks = task ? [...task.subtasks] : [];
        
        document.getElementById('modal-title').textContent = task ? '编辑任务' : '新建任务';
        document.getElementById('task-id').value = task ? task.id : '';
        document.getElementById('task-content').value = task ? task.content : '';
        document.getElementById('task-description').value = task ? task.description || '' : '';
        document.getElementById('task-due-date').value = task ? Format.dateInput(task.due_date) : '';
        document.getElementById('task-priority').value = task ? task.priority : 2;
        
        document.getElementById('subtasks-section').style.display = 'block';
        this.renderTempSubtasks();
        
        Modal.show('task-modal');
    },
    
    // Close modal
    closeModal() {
        Modal.hide('task-modal');
        this.editingTaskId = null;
        this.tempSubtasks = [];
        document.getElementById('task-form').reset();
    },
    
    // Open subtask modal
    openSubtaskModal() {
        document.getElementById('subtask-content').value = '';
        document.getElementById('subtask-priority').value = 2;
        Modal.show('subtask-modal');
    },
    
    // Add subtask to temp list
    addSubtask() {
        const content = document.getElementById('subtask-content').value.trim();
        if (!content) {
            Toast.error('请输入子任务内容');
            return;
        }
        
        const priority = parseInt(document.getElementById('subtask-priority').value);
        
        this.tempSubtasks.push({
            id: 'temp_' + Date.now(),
            content,
            priority,
            order_index: this.tempSubtasks.length,
        });
        
        this.renderTempSubtasks();
        Modal.hide('subtask-modal');
    },
    
    // Render temp subtasks
    renderTempSubtasks() {
        const container = document.getElementById('subtasks-list');
        if (!container) return;
        
        if (this.tempSubtasks.length === 0) {
            container.innerHTML = '<div class="text-muted">暂无子任务</div>';
            return;
        }
        
        container.innerHTML = this.tempSubtasks.map((sub, index) => `
            <div class="subtask-form-item">
                <input type="text" value="${sub.content}" readonly>
                <select disabled>
                    <option>${Priority.getLabel(sub.priority)}</option>
                </select>
                <button class="btn-remove" data-index="${index}" title="移除">×</button>
            </div>
        `).join('');
        
        // Bind remove buttons
        container.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                this.tempSubtasks.splice(index, 1);
                this.renderTempSubtasks();
            });
        });
    },
    
    // Save task
    async saveTask() {
        const content = document.getElementById('task-content').value.trim();
        if (!content) {
            Toast.error('请输入任务内容');
            return;
        }
        
        const data = {
            content,
            description: document.getElementById('task-description').value.trim() || null,
            due_date: document.getElementById('task-due-date').value || null,
            priority: parseInt(document.getElementById('task-priority').value),
            subtasks: this.tempSubtasks.filter(s => s.id.startsWith('temp_')).map(s => ({
                content: s.content,
                priority: s.priority,
            })),
        };
        
        try {
            if (this.editingTaskId) {
                await TaskAPI.update(this.editingTaskId, data);
                Toast.success('任务已更新');
            } else {
                await TaskAPI.create(data);
                Toast.success('任务已创建');
            }
            
            this.closeModal();
            await this.loadTasks();
        } catch (error) {
            Toast.error('保存失败');
            console.error(error);
        }
    },
    
    // Edit task
    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            this.openModal(task);
        }
    },
    
    // Complete task
    async completeTask(taskId) {
        if (!await confirmDialog('确定要完成此任务吗？')) return;
        
        try {
            await TaskAPI.complete(taskId);
            Toast.success('任务已完成');
            await this.loadTasks();
        } catch (error) {
            Toast.error('操作失败');
            console.error(error);
        }
    },
    
    // Delete task
    async deleteTask(taskId) {
        if (!await confirmDialog('确定要删除此任务吗？将移至回收站。')) return;
        
        try {
            await TaskAPI.delete(taskId);
            Toast.success('任务已移至回收站');
            await this.loadTasks();
        } catch (error) {
            Toast.error('删除失败');
            console.error(error);
        }
    },
    
    // Complete subtask
    async completeSubtask(subtaskId) {
        try {
            await SubtaskAPI.complete(subtaskId);
            Toast.success('子任务已完成');
            await this.loadTasks();
        } catch (error) {
            Toast.error('操作失败');
            console.error(error);
        }
    },
    
    // Reorder task
    async reorderTask(taskId, newIndex) {
        try {
            await TaskAPI.updateOrder(taskId, newIndex);
            await this.loadTasks();
        } catch (error) {
            console.error(error);
        }
    },
    
    // Set current view
    setView(view) {
        this.currentView = view;
        
        // Update sidebar active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.view === view) {
                item.classList.add('active');
            }
        });
        
        // Update page title
        const titles = {
            'all': '全部任务',
            'today': '今日待办',
            'upcoming': '未来任务',
            'no-date': '无截止日期',
            'priority-high': '高优先级',
        };
        document.getElementById('page-title').textContent = titles[view] || '任务';
        
        this.render();
    },
};
