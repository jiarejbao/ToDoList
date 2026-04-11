/**
 * UI Components and Utilities
 */

// Toast notifications
const Toast = {
    container: null,
    
    init() {
        this.container = document.getElementById('toast-container');
    },
    
    show(message, type = 'success', duration = 3000) {
        if (!this.container) {
            this.init();
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        this.container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    
    success(message) {
        this.show(message, 'success');
    },
    
    error(message) {
        this.show(message, 'error');
    },
};

// Modal utilities
const Modal = {
    show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    },
    
    hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    },
    
    hideAll() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.remove('active');
        });
    },
};

// Format utilities
const Format = {
    // Format date for display
    date(dateStr) {
        if (!dateStr) return '';
        
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Check if today
        if (date.toDateString() === today.toDateString()) {
            return '今天';
        }
        
        // Check if tomorrow
        if (date.toDateString() === tomorrow.toDateString()) {
            return '明天';
        }
        
        // Format as YYYY-MM-DD
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short',
        });
    },
    
    // Format date for input
    dateInput(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
    },
    
    // Check if date is overdue
    isOverdue(dateStr) {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    },
    
    // Check if date is today
    isToday(dateStr) {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const today = new Date();
        return date.toDateString() === today.toDateString();
    },
    
    // Format relative time
    relativeTime(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return '刚刚';
        if (diffMins < 60) return `${diffMins}分钟前`;
        if (diffHours < 24) return `${diffHours}小时前`;
        if (diffDays < 7) return `${diffDays}天前`;
        
        return this.date(dateStr);
    },
};

// Priority utilities
const Priority = {
    getLabel(level) {
        const labels = {
            1: 'P1',
            2: 'P2',
            3: 'P3',
            4: 'P4',
        };
        return labels[level] || 'P2';
    },
    
    getClass(level) {
        return `priority-p${level}`;
    },
};

// Empty state component
function createEmptyState(icon, title, description) {
    return `
        <div class="empty-state">
            <div class="empty-icon">${icon}</div>
            <div class="empty-title">${title}</div>
            <div class="empty-description">${description}</div>
        </div>
    `;
}

// Confirm dialog
function confirmDialog(message) {
    return new Promise((resolve) => {
        const confirmed = window.confirm(message);
        resolve(confirmed);
    });
}

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Drag and drop utilities
const DragDrop = {
    dragSrcEl: null,
    
    init(containerSelector, itemSelector, onReorder) {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        
        const items = container.querySelectorAll(itemSelector);
        
        items.forEach(item => {
            item.draggable = true;
            
            item.addEventListener('dragstart', (e) => {
                this.dragSrcEl = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                container.querySelectorAll(itemSelector).forEach(el => {
                    el.classList.remove('drag-over');
                });
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                return false;
            });
            
            item.addEventListener('dragenter', () => {
                item.classList.add('drag-over');
            });
            
            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });
            
            item.addEventListener('drop', (e) => {
                e.stopPropagation();
                
                if (this.dragSrcEl !== item) {
                    const newIndex = Array.from(container.children).indexOf(item);
                    onReorder(this.dragSrcEl.dataset.id, newIndex);
                }
                
                return false;
            });
        });
    },
};
