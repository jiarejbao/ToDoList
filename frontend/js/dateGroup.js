/**
 * Date Grouping and Calendar View
 */

const DateGroup = {
    // Group tasks by date
    groupByDate(tasks) {
        const groups = {};
        const noDateTasks = [];
        
        tasks.forEach(task => {
            if (task.due_date) {
                const dateKey = task.due_date.split('T')[0];
                if (!groups[dateKey]) {
                    groups[dateKey] = [];
                }
                groups[dateKey].push(task);
            } else {
                noDateTasks.push(task);
            }
        });
        
        // Sort dates
        const sortedDates = Object.keys(groups).sort();
        
        // Sort tasks within each group by order_index
        sortedDates.forEach(date => {
            groups[date].sort((a, b) => a.order_index - b.order_index);
        });
        
        // Add no_date group if exists
        if (noDateTasks.length > 0) {
            noDateTasks.sort((a, b) => a.order_index - b.order_index);
            groups['no_date'] = noDateTasks;
        }
        
        return { groups, sortedDates };
    },
    
    // Get date group header HTML
    getDateHeader(dateKey, tasks) {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        let dateLabel = '';
        let dateClass = '';
        let badgeClass = '';
        
        if (dateKey === 'no_date') {
            dateLabel = '无截止日期';
            dateClass = 'no-date';
        } else if (dateKey === today) {
            dateLabel = '今天';
            dateClass = 'today';
            badgeClass = 'today';
        } else if (dateKey === tomorrowStr) {
            dateLabel = '明天';
            dateClass = 'tomorrow';
            badgeClass = 'tomorrow';
        } else if (dateKey < today) {
            dateLabel = Format.date(dateKey);
            dateClass = 'past';
            badgeClass = 'overdue';
        } else {
            dateLabel = Format.date(dateKey);
            dateClass = 'future';
        }
        
        return `
            <div class="date-group-header">
                <div class="date-group-title">
                    <span class="date-label">${dateLabel}</span>
                    ${dateKey !== 'no_date' ? `<span class="date-badge ${badgeClass}">${dateKey}</span>` : ''}
                </div>
                <span class="date-count">${tasks.length} 个任务</span>
            </div>
        `;
    },
    
    // Render date groups
    render(containerId, tasks, renderTaskFn) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (tasks.length === 0) {
            container.innerHTML = createEmptyState(
                '📋',
                '暂无任务',
                '点击"新建任务"开始添加您的第一个任务'
            );
            return;
        }
        
        const { groups, sortedDates } = this.groupByDate(tasks);
        
        let html = '';
        
        // Render dated groups first (sorted)
        sortedDates.forEach(dateKey => {
            const tasksForDate = groups[dateKey];
            const isPast = dateKey < new Date().toISOString().split('T')[0];
            
            html += `
                <div class="date-group ${isPast ? 'past' : 'future'}" data-date="${dateKey}">
                    ${this.getDateHeader(dateKey, tasksForDate)}
                    <div class="date-task-list">
                        ${tasksForDate.map(task => renderTaskFn(task)).join('')}
                    </div>
                </div>
            `;
        });
        
        // Render no_date group last
        if (groups['no_date']) {
            html += `
                <div class="date-group no-date" data-date="no_date">
                    ${this.getDateHeader('no_date', groups['no_date'])}
                    <div class="date-task-list">
                        ${groups['no_date'].map(task => renderTaskFn(task)).join('')}
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    },
    
    // Render single date view
    renderSingleDate(containerId, dateKey, tasks, renderTaskFn) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (tasks.length === 0) {
            container.innerHTML = createEmptyState(
                '📅',
                '该日期暂无任务',
                '选择其他日期或创建新任务'
            );
            return;
        }
        
        const html = `
            <div class="date-group" data-date="${dateKey}">
                ${this.getDateHeader(dateKey, tasks)}
                <div class="date-task-list">
                    ${tasks.map(task => renderTaskFn(task)).join('')}
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    },
};

// Calendar view for date selection
const CalendarView = {
    currentDate: new Date(),
    selectedDate: null,
    
    // Get calendar HTML
    getCalendarHTML() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();
        
        const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月',
                           '七月', '八月', '九月', '十月', '十一月', '十二月'];
        
        let html = `
            <div class="calendar-header">
                <div class="calendar-nav">
                    <button class="calendar-btn" id="calendar-prev">‹</button>
                    <span class="calendar-title">${year}年 ${monthNames[month]}</span>
                    <button class="calendar-btn" id="calendar-next">›</button>
                </div>
            </div>
            <div class="calendar-grid">
                <div class="calendar-weekday">日</div>
                <div class="calendar-weekday">一</div>
                <div class="calendar-weekday">二</div>
                <div class="calendar-weekday">三</div>
                <div class="calendar-weekday">四</div>
                <div class="calendar-weekday">五</div>
                <div class="calendar-weekday">六</div>
        `;
        
        // Empty cells for days before start of month
        for (let i = 0; i < startingDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }
        
        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const isSelected = dateStr === this.selectedDate;
            
            html += `
                <div class="calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" 
                     data-date="${dateStr}">
                    ${day}
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    },
    
    // Initialize calendar events
    init(onDateSelect) {
        const prevBtn = document.getElementById('calendar-prev');
        const nextBtn = document.getElementById('calendar-next');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.render('calendar-container');
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.render('calendar-container');
            });
        }
        
        // Day click events
        document.querySelectorAll('.calendar-day:not(.empty)').forEach(day => {
            day.addEventListener('click', () => {
                const dateStr = day.dataset.date;
                this.selectedDate = dateStr;
                onDateSelect(dateStr);
                this.render('calendar-container');
            });
        });
    },
    
    // Render calendar
    render(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = this.getCalendarHTML();
        }
    },
};
