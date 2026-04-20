import { useEffect, useState, useCallback } from 'react';
import { Typography, Button, Empty, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { TaskCard } from '../components/TaskCard';
import { TaskModal } from '../components/TaskModal';
import { TaskAPI, CompletedAPI, TrashAPI } from '../api';
import type { Task } from '../types';

export function HomePage() {
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const view = (searchParams.get('view') as string) || 'all';

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      let allTasks: Task[] = [];

      if (view === 'completed') {
        allTasks = await CompletedAPI.getAll();
      } else if (view === 'trash') {
        allTasks = await TrashAPI.getAll();
      } else {
        allTasks = await TaskAPI.getAll();
      }

      let filtered = allTasks;

      switch (view) {
        case 'today': {
          const today = new Date().toISOString().split('T')[0];
          filtered = allTasks.filter((t) => t.due_date?.split('T')[0] === today);
          break;
        }
        case 'upcoming': {
          const today = new Date().toISOString().split('T')[0];
          filtered = allTasks.filter((t) => t.due_date && t.due_date.split('T')[0] >= today);
          break;
        }
        case 'no-date':
          filtered = allTasks.filter((t) => !t.due_date);
          break;
        case 'priority-high':
          filtered = allTasks.filter((t) => t.priority >= 3);
          break;
      }

      filtered.sort((a, b) => a.order_index - b.order_index);
      setTasks(filtered);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      message.error('加载任务失败');
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const handler = () => loadTasks();
    window.addEventListener('refresh-tasks', handler);
    return () => window.removeEventListener('refresh-tasks', handler);
  }, [loadTasks]);

  const handleComplete = async (id: number) => {
    try {
      await TaskAPI.complete(id);
      message.success('任务已完成');
      loadTasks();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await TaskAPI.delete(id);
      message.success('任务已移至回收站');
      loadTasks();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleEdit = (task: Task) => {
    setEditTask(task);
    setEditModalOpen(true);
  };

  const pageTitles: Record<string, string> = {
    all: '全部任务',
    today: '今日待办',
    upcoming: '未来任务',
    'no-date': '无截止日期',
    'priority-high': '高优先级',
    completed: '已完成',
    trash: '回收站',
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <Typography.Title
          level={3}
          style={{
            color: '#f7f8f8',
            margin: 0,
            fontWeight: 510,
            letterSpacing: '-0.5px',
          }}
        >
          {pageTitles[view] || '任务'}
        </Typography.Title>
        <Button
          type="text"
          icon={<ReloadOutlined />}
          onClick={loadTasks}
          loading={loading}
          style={{ color: '#8a8f98' }}
        >
          刷新
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Empty
          description={
            <span style={{ color: '#62666d' }}>
              {view === 'all' ? '暂无任务，点击"新建任务"开始添加' : '该筛选条件下没有任务'}
            </span>
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <div>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={handleComplete}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      <TaskModal
        open={editModalOpen}
        task={editTask}
        onClose={() => {
          setEditModalOpen(false);
          setEditTask(null);
        }}
        onSuccess={() => {
          setEditModalOpen(false);
          setEditTask(null);
          loadTasks();
        }}
      />
    </div>
  );
}
