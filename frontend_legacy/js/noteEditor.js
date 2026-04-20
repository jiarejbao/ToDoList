/**
 * Tiptap Note Editor Wrapper
 * Handles rich text editing with Markdown support
 */
class NoteEditor {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        this.onSave = options.onSave || (() => {});
        this.onChange = options.onChange || (() => {});
        this.editor = null;
        this.saveTimeout = null;
    }

    async init(initialContent = '') {
        if (!this.container) {
            console.error('NoteEditor: container not found');
            return;
        }

        // Load Tiptap dependencies
        await this.loadDependencies();

        // Create save status indicator
        this.saveStatusEl = document.createElement('div');
        this.saveStatusEl.className = 'save-status';
        this.saveStatusEl.style.cssText = 'font-size:11px;color:#8a8f98;text-align:right;padding:4px 0;height:20px;';
        this.container.appendChild(this.saveStatusEl);

        // Create toolbar
        this.createToolbar();

        // Create editor element
        const editorEl = document.createElement('div');
        editorEl.className = 'note-editor-content';
        this.container.appendChild(editorEl);

        // Initialize Tiptap Editor
        const { Editor } = window.tiptap;
        const { StarterKit } = window.tiptapStarterKit;

        this.editor = new Editor({
            element: editorEl,
            extensions: [
                StarterKit.configure({
                    heading: { levels: [1, 2, 3] },
                }),
            ],
            content: initialContent,
            editorProps: {
                attributes: {
                    class: 'note-editor-content',
                    'data-placeholder': 'Start writing your notes...',
                }
            },
            onUpdate: ({ editor }) => {
                const html = editor.getHTML();
                this.onChange(html);
                this.setSaveStatus('saving');

                // Debounced auto-save
                if (this.saveTimeout) clearTimeout(this.saveTimeout);
                this.saveTimeout = setTimeout(() => {
                    this.onSave(html);
                    this.setSaveStatus('saved');
                    setTimeout(() => this.setSaveStatus('idle'), 2000);
                }, 1000);
            },
            onCreate: ({ editor }) => {
                this.updateToolbarState();
            },
            onSelectionUpdate: () => {
                this.updateToolbarState();
            },
        });

        this.bindToolbarEvents();
    }

    async loadDependencies() {
        const deps = [
            { name: 'tiptap', src: 'https://unpkg.com/@tiptap/core@2.11.7/dist/index.umd.js' },
            { name: 'tiptapStarterKit', src: 'https://unpkg.com/@tiptap/starter-kit@2.11.7/dist/index.umd.js' },
        ];

        for (const dep of deps) {
            if (!window[dep.name]) {
                await this.loadScript(dep.src);
            }
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
        });
    }

    createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'note-editor-toolbar';
        toolbar.innerHTML = `
            <button type="button" class="toolbar-btn" data-action="bold" title="Bold (Ctrl+B)">
                <b>B</b>
            </button>
            <button type="button" class="toolbar-btn" data-action="italic" title="Italic (Ctrl+I)">
                <i>I</i>
            </button>
            <div class="toolbar-separator"></div>
            <button type="button" class="toolbar-btn" data-action="heading1" title="Heading 1">
                H1
            </button>
            <button type="button" class="toolbar-btn" data-action="heading2" title="Heading 2">
                H2
            </button>
            <div class="toolbar-separator"></div>
            <button type="button" class="toolbar-btn" data-action="bulletList" title="Bullet List">
                • List
            </button>
            <button type="button" class="toolbar-btn" data-action="orderedList" title="Numbered List">
                1. List
            </button>
            <div class="toolbar-separator"></div>
            <button type="button" class="toolbar-btn" data-action="codeBlock" title="Code Block">
                &lt;/&gt;
            </button>
            <button type="button" class="toolbar-btn" data-action="blockquote" title="Quote">
                " "
            </button>
        `;
        this.container.appendChild(toolbar);
        this.toolbar = toolbar;
    }

    bindToolbarEvents() {
        if (!this.toolbar) return;

        this.toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                this.executeCommand(action);
            });
        });
    }

    executeCommand(action) {
        if (!this.editor) return;

        const commands = {
            bold: () => this.editor.chain().focus().toggleBold().run(),
            italic: () => this.editor.chain().focus().toggleItalic().run(),
            heading1: () => this.editor.chain().focus().toggleHeading({ level: 1 }).run(),
            heading2: () => this.editor.chain().focus().toggleHeading({ level: 2 }).run(),
            bulletList: () => this.editor.chain().focus().toggleBulletList().run(),
            orderedList: () => this.editor.chain().focus().toggleOrderedList().run(),
            codeBlock: () => this.editor.chain().focus().toggleCodeBlock().run(),
            blockquote: () => this.editor.chain().focus().toggleBlockquote().run(),
        };

        if (commands[action]) {
            commands[action]();
        }
    }

    updateToolbarState() {
        if (!this.editor || !this.toolbar) return;

        const states = {
            bold: this.editor.isActive('bold'),
            italic: this.editor.isActive('italic'),
            heading1: this.editor.isActive('heading', { level: 1 }),
            heading2: this.editor.isActive('heading', { level: 2 }),
            bulletList: this.editor.isActive('bulletList'),
            orderedList: this.editor.isActive('orderedList'),
            codeBlock: this.editor.isActive('codeBlock'),
            blockquote: this.editor.isActive('blockquote'),
        };

        this.toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
            const action = btn.dataset.action;
            btn.classList.toggle('is-active', states[action] || false);
        });
    }

    setSaveStatus(status) {
        if (!this.saveStatusEl) return;
        const map = {
            idle: '',
            saving: '<span style="color:#8a8f98;">Saving...</span>',
            saved: '<span style="color:#10b981;">Saved</span>',
        };
        this.saveStatusEl.innerHTML = map[status] || '';
    }

    getContent() {
        if (!this.editor) return '';
        return this.editor.getHTML();
    }

    setContent(content) {
        if (!this.editor) return;
        // Tiptap expects HTML content by default
        this.editor.commands.setContent(content);
    }

    destroy() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        if (this.editor) {
            this.editor.destroy();
            this.editor = null;
        }
    }
}
