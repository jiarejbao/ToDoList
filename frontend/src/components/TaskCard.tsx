import { Card, Tag, Space, Typography, Button, Popconfirm } from 'antd';
import {
  CheckCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onComplete?: (id: number) => void;
  onDelete?: (id: number) => void;
  onEdit?: (task: Task) => void;
}

const priorityColors: Record<number, string> = {
  1: '#10b981',
  2: '#8a8f98',
  3: '#f59e0b',
  4: '#ef4444',
};

const priorityLabels: Record<number, string> = {
  1: 'P1',
  2: 'P2',
  3: 'P3',
  4: 'P4',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return '今天';
  if (date.toDateString() === tomorrow.toDateString()) return '明天';

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export function TaskCard({ task, onComplete, onDelete, onEdit }: TaskCardProps) {
  const navigate = useNavigate();
  const overdue = isOverdue(task.due_date);

  return (
    <Card
      hoverable
      onClick={() => navigate(`/task/${task.id}`)}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        marginBottom: 12,
        cursor: 'pointer',
      }}
      bodyStyle={{ padding: '16px 20px' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Button
          type="text"
          size="small"
          icon={<CheckCircleOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onComplete?.(task.id);
          }}
          style={{ color: '#62666d', marginTop: 2 }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <Typography.Text
            strong
            style={{
              color: '#f7f8f8',
              fontSize: 15,
              fontWeight: 510,
              display: 'block',
              marginBottom: 4,
            }}
          >
            {task.content}
          </Typography.Text>

          {task.description && (
            <Typography.Text
              style={{
                color: '#8a8f98',
                fontSize: 13,
                display: 'block',
                marginBottom: 8,
              }}
            >
              {task.description}
            </Typography.Text>
          )}

          <Space size={8}>
            {task.due_date && (
              <span style={{ fontSize: 12, color: overdue ? '#ef4444' : '#8a8f98' }}>
                <CalendarOutlined style={{ marginRight: 4 }} />
                {formatDate(task.due_date)}
              </span>
            )}
            <Tag
              style={{
                background: 'transparent',
                borderColor: priorityColors[task.priority],
                color: priorityColors[task.priority],
                fontSize: 11,
                fontWeight: 510,
                padding: '0 6px',
                margin: 0,
              }}
            >
              {priorityLabels[task.priority]}
            </Tag>
            {task.subtasks && task.subtasks.length > 0 && (
              <span style={{ fontSize: 12, color: '#62666d' }}>
                {task.subtasks.length} 个子任务
              </span>
            )}
          </Space>
        </div>

        <Space size={4} onClick={(e) => e.stopPropagation()}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(task);
            }}
            style={{ color: '#8a8f98' }}
          />
          <Popconfirm
            title="确定要删除此任务吗？"
            description="将移至回收站。"
            onConfirm={() => onDelete?.(task.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              style={{ color: '#8a8f98' }}
            />
          </Popconfirm>
        </Space>
      </div>

      {task.subtasks && task.subtasks.length > 0 && (
        <div style={{ marginTop: 12, paddingLeft: 36 }}>
          {task.subtasks.map((sub) => (
            <div
              key={sub.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 0',
                fontSize: 13,
                color: '#d0d6e0',
              }}
            >
              <span style={{ color: '#62666d' }}>○</span>
              <span>{sub.content}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
