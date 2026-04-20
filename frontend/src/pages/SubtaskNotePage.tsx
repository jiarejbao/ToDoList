import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Typography, Tag, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { NoteEditor } from '../components/NoteEditor';
import { TaskAPI } from '../api';
import type { Subtask, Note } from '../types';

export function SubtaskNotePage() {
  const { subtaskId } = useParams<{ subtaskId: string }>();
  const navigate = useNavigate();
  const [subtask, setSubtask] = useState<Subtask | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [saveIndicator, setSaveIndicator] = useState('');

  const id = parseInt(subtaskId || '0');

  const loadSubtask = useCallback(async () => {
    if (!id) return;
    try {
      const data = await TaskAPI.getSubtask(id);
      setSubtask(data);
    } catch (error) {
      message.error('Subtask not found');
    }
  }, [id]);

  const loadNote = useCallback(async () => {
    if (!id) return;
    try {
      const note: Note = await TaskAPI.getSubtaskNote(id);
      setNoteContent(note.content || '');
    } catch (error) {
      setNoteContent('');
    }
  }, [id]);

  useEffect(() => {
    loadSubtask();
    loadNote();
  }, [loadSubtask, loadNote]);

  const handleSave = async (content: string) => {
    if (!id) return;
    try {
      await TaskAPI.updateSubtaskNote(id, content);
      setSaveIndicator('Saved');
      setTimeout(() => setSaveIndicator(''), 2000);
    } catch (error) {
      setSaveIndicator('Save failed');
      setTimeout(() => setSaveIndicator(''), 2000);
    }
  };

  const priorityColor = (p?: number) => {
    const colors: Record<number, string> = { 1: '#10b981', 2: '#8a8f98', 3: '#f59e0b', 4: '#ef4444' };
    return colors[p || 2];
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No due date';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!subtask) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#d0d6e0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: '#f7f8f8' }}>Subtask not found</h2>
        <Button type="link" onClick={() => navigate('/')} style={{ color: '#7170ff' }}>
          ← Back to tasks
        </Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div>
          <Typography.Title
            level={3}
            style={{
              color: '#f7f8f8',
              margin: 0,
              fontWeight: 590,
              letterSpacing: '-0.288px',
            }}
          >
            {subtask.content}
          </Typography.Title>
          <div style={{ fontSize: 13, color: '#8a8f98', marginTop: 8 }}>
            <span>
              From:{' '}
              <a
                href={`/task/${subtask.task_id}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/task/${subtask.task_id}`);
                }}
                style={{ color: '#7170ff', textDecoration: 'none' }}
              >
                Task #{subtask.task_id}
              </a>
            </span>
            <span style={{ margin: '0 8px' }}>•</span>
            <span>Due: {formatDate(subtask.due_date)}</span>
            <span style={{ margin: '0 8px' }}>•</span>
            <Tag
              style={{
                background: 'transparent',
                borderColor: priorityColor(subtask.priority),
                color: priorityColor(subtask.priority),
                fontSize: 11,
                padding: '0 4px',
              }}
            >
              P{subtask.priority}
            </Tag>
            {saveIndicator && (
              <span style={{ marginLeft: 12, color: saveIndicator === 'Saved' ? '#10b981' : '#ef4444', fontSize: 12 }}>
                {saveIndicator}
              </span>
            )}
          </div>
        </div>

        <Button
          type="default"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/task/${subtask.task_id}`)}
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgb(36, 40, 44)',
            color: '#e2e4e7',
          }}
        >
          Back to Task
        </Button>
      </div>

      {/* Editor */}
      <NoteEditor
        initialContent={noteContent}
        onSave={handleSave}
        placeholder="Write your notes here..."
      />
    </div>
  );
}
