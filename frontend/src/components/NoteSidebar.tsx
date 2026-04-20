import { Button, Typography } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { NoteEditor } from './NoteEditor';

interface NoteSidebarProps {
  open: boolean;
  onClose: () => void;
  initialContent?: string;
  onSave?: (content: string) => void;
}

export function NoteSidebar({ open, onClose, initialContent = '', onSave }: NoteSidebarProps) {
  return (
    <div
      style={{
        width: open ? 420 : 0,
        background: '#0f1011',
        borderLeft: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.25s ease',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
        }}
      >
        <Typography.Text
          style={{ fontSize: 14, fontWeight: 590, color: '#f7f8f8' }}
        >
          Task Notes
        </Typography.Text>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={onClose}
          style={{ color: '#8a8f98' }}
        />
      </div>

      <div
        style={{
          padding: '10px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.01)',
          flexShrink: 0,
        }}
      >
        <Typography.Text
          style={{ fontSize: 12, fontWeight: 510, color: '#f7f8f8', display: 'block' }}
        >
          Auto-save enabled
        </Typography.Text>
        <Typography.Text style={{ fontSize: 11, color: '#8a8f98' }}>
          Your notes are saved automatically as you type.
        </Typography.Text>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <NoteEditor
          initialContent={initialContent}
          onSave={onSave}
          placeholder="Start writing your notes..."
        />
      </div>
    </div>
  );
}
