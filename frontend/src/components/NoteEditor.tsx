import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useState, useEffect, useRef } from 'react';

interface NoteEditorProps {
  initialContent?: string;
  onSave?: (content: string) => void;
  onChange?: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function NoteEditor({
  initialContent = '',
  onSave,
  onChange,
  placeholder = 'Start writing your notes...',
  readOnly = false,
}: NoteEditorProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<number | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: initialContent,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'note-editor-content',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
      setSaveStatus('saving');

      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = window.setTimeout(() => {
        onSave?.(html);
        setSaveStatus('saved');
        window.setTimeout(() => setSaveStatus('idle'), 2000);
      }, 1000);
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Sync external content changes
  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent);
    }
  }, [initialContent, editor]);

  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleHeading = useCallback(
    (level: 1 | 2 | 3) => {
      editor?.chain().focus().toggleHeading({ level }).run();
    },
    [editor]
  );

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const toggleCodeBlock = useCallback(() => {
    editor?.chain().focus().toggleCodeBlock().run();
  }, [editor]);

  const toggleBlockquote = useCallback(() => {
    editor?.chain().focus().toggleBlockquote().run();
  }, [editor]);

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    active,
    children,
  }: {
    onClick: () => void;
    active: boolean;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '4px 8px',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 510,
        background: active ? 'rgba(94, 106, 210, 0.15)' : 'rgba(255,255,255,0.02)',
        color: active ? '#7170ff' : '#8a8f98',
        border: `1px solid ${active ? 'rgba(113, 112, 255, 0.3)' : 'rgba(255,255,255,0.05)'}`,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.color = '#d0d6e0';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
          e.currentTarget.style.color = '#8a8f98';
        }
      }}
    >
      {children}
    </button>
  );

  const Separator = () => (
    <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', margin: '4px' }} />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!readOnly && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 12px',
            background: '#0f1011',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            flexShrink: 0,
          }}
        >
          <ToolbarButton onClick={toggleBold} active={editor.isActive('bold')}>
            <b>B</b>
          </ToolbarButton>
          <ToolbarButton onClick={toggleItalic} active={editor.isActive('italic')}>
            <i>I</i>
          </ToolbarButton>
          <Separator />
          <ToolbarButton onClick={() => toggleHeading(1)} active={editor.isActive('heading', { level: 1 })}>
            H1
          </ToolbarButton>
          <ToolbarButton onClick={() => toggleHeading(2)} active={editor.isActive('heading', { level: 2 })}>
            H2
          </ToolbarButton>
          <Separator />
          <ToolbarButton onClick={toggleBulletList} active={editor.isActive('bulletList')}>
            • List
          </ToolbarButton>
          <ToolbarButton onClick={toggleOrderedList} active={editor.isActive('orderedList')}>
            1. List
          </ToolbarButton>
          <Separator />
          <ToolbarButton onClick={toggleCodeBlock} active={editor.isActive('codeBlock')}>
            &lt;/&gt;
          </ToolbarButton>
          <ToolbarButton onClick={toggleBlockquote} active={editor.isActive('blockquote')}>
            " "
          </ToolbarButton>

          <div style={{ flex: 1 }} />

          {saveStatus === 'saving' && (
            <span style={{ fontSize: 12, color: '#8a8f98' }}>Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span style={{ fontSize: 12, color: '#10b981' }}>Saved</span>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: 16,
            minHeight: 300,
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
