/**
 * API Client for ToDoList
 */

const API_BASE_URL = '/api/v1';

// Generic fetch wrapper
async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    try {
        const response = await fetch(url, { ...defaultOptions, ...options });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Task APIs
const TaskAPI = {
    // Get all tasks
    async getAll(priority = null, dateFrom = null, dateTo = null) {
        const params = new URLSearchParams();
        if (priority) params.append('priority', priority);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        
        const query = params.toString() ? `?${params.toString()}` : '';
        return apiFetch(`/tasks${query}`);
    },
    
    // Get single task
    async get(id) {
        return apiFetch(`/tasks/${id}`);
    },
    
    // Create task
    async create(data) {
        return apiFetch('/tasks', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    
    // Update task
    async update(id, data) {
        return apiFetch(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
    
    // Delete task (move to trash)
    async delete(id) {
        return apiFetch(`/tasks/${id}`, {
            method: 'DELETE',
        });
    },
    
    // Complete task
    async complete(id) {
        return apiFetch(`/tasks/${id}/complete`, {
            method: 'POST',
        });
    },
    
    // Update task order
    async updateOrder(id, orderIndex) {
        return apiFetch(`/tasks/${id}/order`, {
            method: 'PATCH',
            body: JSON.stringify({ order_index: orderIndex }),
        });
    },
    
    // Get task by ID (alias for get)
    async getById(id) {
        return this.get(id);
    },
    
    // Get subtask
    async getSubtask(id) {
        return apiFetch(`/subtasks/${id}`);
    },
    
    // Get task note
    async getTaskNote(taskId) {
        return apiFetch(`/tasks/${taskId}/note`);
    },
    
    // Update task note
    async updateTaskNote(taskId, data) {
        return apiFetch(`/tasks/${taskId}/note`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
    
    // Get subtask note
    async getSubtaskNote(subtaskId) {
        return apiFetch(`/subtasks/${subtaskId}/note`);
    },
    
    // Update subtask note
    async updateSubtaskNote(subtaskId, data) {
        return apiFetch(`/subtasks/${subtaskId}/note`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
    
    // Get workflow for task
    async getWorkflow(taskId) {
        return apiFetch(`/tasks/${taskId}/workflow`);
    },
};

// Subtask APIs
const SubtaskAPI = {
    // Create subtask
    async create(taskId, data) {
        return apiFetch(`/subtasks/tasks/${taskId}/subtasks`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    
    // Get subtask
    async get(id) {
        return apiFetch(`/subtasks/${id}`);
    },
    
    // Update subtask
    async update(id, data) {
        return apiFetch(`/subtasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
    
    // Delete subtask
    async delete(id) {
        return apiFetch(`/subtasks/${id}`, {
            method: 'DELETE',
        });
    },
    
    // Complete subtask
    async complete(id) {
        return apiFetch(`/subtasks/${id}/complete`, {
            method: 'POST',
        });
    },
    
    // Update subtask order
    async updateOrder(id, orderIndex) {
        return apiFetch(`/subtasks/${id}/order`, {
            method: 'PATCH',
            body: JSON.stringify({ order_index: orderIndex }),
        });
    },
};

// Calendar APIs
const CalendarAPI = {
    // Get dates with tasks
    async getDates(year = null, month = null) {
        const params = new URLSearchParams();
        if (year) params.append('year', year);
        if (month) params.append('month', month);
        
        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await apiFetch(`/calendar/dates${query}`);
        return response.data || response;
    },
    
    // Get tasks by date
    async getByDate(dateStr = null) {
        const params = dateStr ? `?date=${dateStr}` : '';
        const response = await apiFetch(`/calendar/by-date${params}`);
        return response.data || response;
    },
    
    // Get tasks in range
    async getRange(start, end) {
        const response = await apiFetch(`/calendar/range?start=${start}&end=${end}`);
        return response.data || response;
    },
    
    // Get today's tasks
    async getToday() {
        const response = await apiFetch('/calendar/today');
        return response.data || response;
    },
    
    // Get upcoming tasks
    async getUpcoming(days = 7) {
        const response = await apiFetch(`/calendar/upcoming?days=${days}`);
        return response.data || response;
    },
};

// Completed Tasks APIs
const CompletedAPI = {
    // Get all completed tasks
    async getAll(limit = 100, offset = 0) {
        return apiFetch(`/completed?limit=${limit}&offset=${offset}`);
    },
    
    // Get single completed task
    async get(id) {
        return apiFetch(`/completed/${id}`);
    },
    
    // Restore completed task
    async restore(id) {
        return apiFetch(`/completed/${id}/restore`, {
            method: 'POST',
        });
    },
    
    // Permanently delete
    async delete(id) {
        return apiFetch(`/completed/${id}`, {
            method: 'DELETE',
        });
    },
};

// Trash APIs
const TrashAPI = {
    // Get all deleted tasks
    async getAll(limit = 100, offset = 0) {
        return apiFetch(`/trash?limit=${limit}&offset=${offset}`);
    },
    
    // Get single deleted task
    async get(id) {
        return apiFetch(`/trash/${id}`);
    },
    
    // Restore deleted task
    async restore(id) {
        return apiFetch(`/trash/${id}/restore`, {
            method: 'POST',
        });
    },
    
    // Permanently delete
    async delete(id) {
        return apiFetch(`/trash/${id}/permanent`, {
            method: 'DELETE',
        });
    },
    
    // Cleanup expired tasks
    async cleanup() {
        return apiFetch('/trash/cleanup', {
            method: 'DELETE',
        });
    },
    
    // Empty trash
    async empty() {
        return apiFetch('/trash/empty?confirm=true', {
            method: 'DELETE',
        });
    },
};

// Health check
const HealthAPI = {
    async check() {
        return apiFetch('/health');
    },
};
