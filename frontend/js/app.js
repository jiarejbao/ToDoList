/**
 * ToDoList Application Entry Point
 */

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Toast container
    Toast.init();
    
    // Initialize TaskManager
    TaskManager.init();
    
    // Bind sidebar navigation
    bindNavigation();
    
    // Check API health
    checkHealth();
});

// Bind sidebar navigation
function bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            if (!view) return;
            
            // Update active state
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Switch view
            switch (view) {
                case 'completed':
                    CompletedManager.load();
                    break;
                case 'trash':
                    TrashManager.load();
                    break;
                default:
                    TaskManager.setView(view);
                    break;
            }
        });
    });
}

// Check API health
async function checkHealth() {
    try {
        const health = await HealthAPI.check();
        console.log('API Health:', health);
    } catch (error) {
        console.warn('API not available:', error);
        Toast.error('无法连接到服务器，请确保后端服务已启动');
    }
}

// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape to close modals
    if (e.key === 'Escape') {
        Modal.hideAll();
    }
    
    // Ctrl/Cmd + N for new task
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        TaskManager.openModal();
    }
    
    // Ctrl/Cmd + R for refresh
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        TaskManager.loadTasks();
    }
});

// Handle window before unload (optional cleanup)
window.addEventListener('beforeunload', () => {
    // Cleanup if needed
});
