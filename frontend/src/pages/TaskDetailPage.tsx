import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Typography, Tag, Select, message, Modal as AntModal } from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  ShareAltOutlined,
  EditOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { WorkflowGraph, type WorkflowGraphRef } from '../components/WorkflowGraph';
import { NoteSidebar } from '../components/NoteSidebar';
import { GraphControls } from '../components/GraphControls';
import { SubtaskModal } from '../components/SubtaskModal';
import { TaskAPI, WorkflowAPI, SubtaskAPI } from '../api';
import type { Task, Subtask, WorkflowNode, WorkflowEdge, Note } from '../types';

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const graphRef = useRef<WorkflowGraphRef>(null);

  const [task, setTask] = useState<Task | null>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [linkMode, setLinkMode] = useState(false);
  const [linkType, setLinkType] = useState('BLOCKS');
  const [subtaskModalOpen, setSubtaskModalOpen] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);

  const id = parseInt(taskId || '0');

  const loadTask = useCallback(async () => {
    if (!id) return;
    try {
      const data = await TaskAPI.getById(id);
      setTask(data);
    } catch (error) {
      message.error('Task not found');
    }
  }, [id]);

  const loadWorkflow = useCallback(async () => {
    if (!id) return;
    try {
      const workflow = await TaskAPI.getWorkflow(id);
      setNodes(workflow.nodes || []);
      setEdges(workflow.edges || []);
    } catch (error) {
      console.error('Failed to load workflow:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadNote = useCallback(async () => {
    if (!id) return;
    try {
      const note: Note = await TaskAPI.getTaskNote(id);
      setNoteContent(note.content || '');
    } catch (error) {
      setNoteContent('');
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    loadTask();
    loadWorkflow();
    loadNote();
  }, [loadTask, loadWorkflow, loadNote]);

  const handleSaveNote = async (content: string) => {
    if (!id) return;
    try {
      await TaskAPI.updateTaskNote(id, content);
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  const handleCreateDependency = async (fromId: number, toId: number, type: string) => {
    if (!id) return;
    try {
      await WorkflowAPI.createDependency(id, {
        from_subtask_id: fromId,
        to_subtask_id: toId,
        dependency_type: type,
      });
      message.success('Dependency created');
      loadWorkflow();
    } catch (error) {
      message.error('Failed to create dependency');
    }
  };

  const handleDeleteDependency = async (edgeId: string) => {
    try {
      await WorkflowAPI.deleteDependency(parseInt(edgeId));
      message.success('Dependency deleted');
      loadWorkflow();
    } catch (error) {
      message.error('Delete failed');
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await SubtaskAPI.delete(parseInt(subtaskId));
      message.success('Subtask deleted');
      loadWorkflow();
      loadTask();
    } catch (error) {
      message.error('Delete failed');
    }
  };

  const handleEditSubtask = (subtaskId: string) => {
    const subtask = task?.subtasks?.find((s) => String(s.id) === subtaskId);
    if (subtask) {
      setEditingSubtask(subtask);
      setSubtaskModalOpen(true);
    }
  };

  const handleOpenNote = (subtaskId: string) => {
    navigate(`/note/${subtaskId}`);
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
      weekday: 'short',
    });
  };

  if (loading && !task) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#62666d' }}>
        Loading...
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#d0d6e0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: '#f7f8f8' }}>Task not found</h2>
        <Button type="link" onClick={() => navigate('/')} style={{ color: '#7170ff' }}>
          ← Back to tasks
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)', margin: '-24px -32px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: '#0f1011',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
            style={{ color: '#d0d6e0' }}
          />
          <div>
            <Typography.Text
              style={{ fontSize: 18, fontWeight: 590, color: '#f7f8f8', display: 'block' }}
            >
              {task.content}
            </Typography.Text>
            <div style={{ fontSize: 12, color: '#8a8f98', marginTop: 2 }}>
              <Tag
                style={{
                  background: 'transparent',
                  borderColor: priorityColor(task.priority),
                  color: priorityColor(task.priority),
                  fontSize: 10,
                  padding: '0 4px',
                  marginRight: 8,
                }}
              >
                P{task.priority}
              </Tag>
              <span>Due: {formatDate(task.due_date)}</span>
              <span style={{ margin: '0 6px' }}>•</span>
              <span>{task.subtasks?.length || 0} subtasks</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button
            type="default"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingSubtask(null);
              setSubtaskModalOpen(true);
            }}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgb(36, 40, 44)',
              color: '#e2e4e7',
            }}
          >
            New Subtask
          </Button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6,
              padding: '2px 6px',
            }}
          >
            <Select
              value={linkType}
              onChange={setLinkType}
              size="small"
              bordered={false}
              popupMatchSelectWidth={false}
              options={[
                { value: 'BLOCKS', label: 'BLOCKS' },
                { value: 'REQUIRES', label: 'REQUIRES' },
                { value: 'TRIGGERS', label: 'TRIGGERS' },
              ]}
              style={{ width: 100 }}
              dropdownStyle={{ background: '#191a1b' }}
            />
            <Button
              type={linkMode ? 'primary' : 'default'}
              size="small"
              icon={<ShareAltOutlined />}
              onClick={() => setLinkMode(!linkMode)}
              style={
                linkMode
                  ? { background: 'rgba(94, 106, 210, 0.15)', borderColor: 'rgba(113, 112, 255, 0.3)', color: '#7170ff' }
                  : { background: 'transparent', border: 'none', color: '#e2e4e7' }
              }
            >
              {linkMode ? 'Cancel' : 'Connect'}
            </Button>
          </div>

          <Button
            type="default"
            icon={<FileTextOutlined />}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgb(36, 40, 44)',
              color: '#e2e4e7',
            }}
          >
            Notes
          </Button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <WorkflowGraph
              ref={graphRef}
              nodes={nodes}
              edges={edges}
              linkMode={linkMode}
              linkType={linkType}
              onNodeEdit={handleEditSubtask}
              onNodeDelete={handleDeleteSubtask}
              onNodeNote={handleOpenNote}
              onEdgeDelete={handleDeleteDependency}
              onCreateDependency={handleCreateDependency}
              onBackgroundDblClick={() => {
                setEditingSubtask(null);
                setSubtaskModalOpen(true);
              }}
            />
          </div>

          <GraphControls
            onZoomIn={() => graphRef.current?.zoomIn()}
            onZoomOut={() => graphRef.current?.zoomOut()}
            onFit={() => graphRef.current?.fit()}
          />
        </div>

        <NoteSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          initialContent={noteContent}
          onSave={handleSaveNote}
        />
      </div>

      {linkMode && (
        <div
          style={{
            position: 'fixed',
            top: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(94, 106, 210, 0.9)',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 510,
            zIndex: 50,
            pointerEvents: 'none',
          }}
        >
          Link mode: Click source node, then target node ({linkType})
        </div>
      )}

      <SubtaskModal
        open={subtaskModalOpen}
        taskId={id}
        subtask={editingSubtask}
        onClose={() => {
          setSubtaskModalOpen(false);
          setEditingSubtask(null);
        }}
        onSuccess={() => {
          setSubtaskModalOpen(false);
          setEditingSubtask(null);
          loadWorkflow();
          loadTask();
        }}
      />
    </div>
  );
}
