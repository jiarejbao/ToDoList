# ToDoList

A local-first task management web application with workflow visualization, note-taking, and date-based organization. Built with FastAPI, PostgreSQL, Cytoscape.js, and Tiptap.

---

## 任务要求

### 1. 页面结构

网站包含**主页面**和**任务页面**两级结构：

- **主页面**：展示任务列表，每个任务以卡片形式呈现基本信息（创建日期、截止日期、优先级、描述等），支持图标/列表等多种展示格式切换。
- **任务页面**：点击主页面的具体任务后进入，页面主体为该任务下辖的各个子任务卡片。

### 2. 任务页面功能

- **子任务卡片**：展示每个子任务的基本信息（创建日期、截止日期、优先级、描述等）。
- **工作流可视化**：以图形式展示子任务之间的工作流关系，支持拖拽、缩放、点击查看详情等交互。采用 **Cytoscape.js + dagre** 方案实现专业的有向图（DAG）布局。
- **Note 侧边栏**：任务页面包含可打开/关闭的侧边栏 Note 功能，打开后可在侧边栏进行执行笔记的编辑。采用 **Tiptap Editor** 实现 headless 富文本编辑，支持 Markdown 输入输出，可完美融入 Linear 设计风格。

### 3. 子任务 Note 页面

- 点击子任务卡片可进入该卡片的独立 Note 页面，使用 Tiptap Editor 进行详细笔记记录。

### 4. 技术设计要求

- 在现有技术栈（FastAPI + PostgreSQL + 原生前端）基础上完善，引入工作流图和笔记编辑器相关技术。
- 重构 API 接口设计，补充 Note 管理、工作流管理等新接口。
- 重构数据库设计，新增笔记表、子任务依赖关系表等。
- 重构目录结构，明确各模块职责。

---

## 整体目标

1. 搭建一个可在本地运行的任务管理网站，实现以下核心功能：
   - Task 的增删改查与列表展示
   - Subtask 的增删改查与卡片化展示
   - **子任务之间的工作流依赖关系可视化**（DAG 有向图）
   - **任务级与亚任务级笔记功能**（富文本，支持 Markdown）
   - 按日期分类展示任务（日历功能）
   - 任务完成与回收站管理

2. Task/Subtask 属性：
   - `content`: 任务内容
   - `description`: 任务描述
   - `due_date`: 截止日期
   - `order`: 排序权重（用于 UI 拖拽调整显示顺序）
   - `priority`: 优先级（1-4 级）
   - `created_at`: 创建时间
   - `updated_at`: 更新时间

3. 数据管理：
   - **所有数据存储在 PostgreSQL 数据库中**（包括活跃、已完成、已删除、笔记、依赖关系）
   - 活跃任务存储在 `tasks` 表，子任务存储在 `subtasks` 表
   - 已完成的任务存储在 `completed_tasks` 表
   - 已删除的任务存储在 `deleted_tasks` 表（30 天后自动清理）
   - **任务笔记存储在 `task_notes` 表**
   - **子任务笔记存储在 `subtask_notes` 表**
   - **子任务依赖关系存储在 `subtask_dependencies` 表**
   - 支持从已完成/已删除状态恢复任务

4. 页面设计风格：
   - **采用 Linear 风格** —— 参考 `Design.md` 详细设计规范

---

## 技术架构

### 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端 | HTML5 + CSS3 + JavaScript (ES6+) | 原生实现，无框架依赖 |
| 前端图可视化 | **Cytoscape.js + cytoscape-dagre** | 专业图论库，支持 DAG 布局与交互 |
| 前端富文本编辑器 | **Tiptap (UMD)** + ProseMirror | Headless 编辑器，支持 Markdown，可完美自定义为 Linear 风格 |
| 后端 | **Python FastAPI** | 高性能异步 Web 框架 |
| 数据库 | **PostgreSQL** | 本地安装的 PostgreSQL 服务 |
| ORM | SQLAlchemy + asyncpg | 异步数据库操作 |
| UI 设计 | Custom CSS | Linear 风格设计系统 |

#### 前端技术选型说明

**工作流可视化：Cytoscape.js + dagre**

经过调研，Cytoscape.js 是当前前端图可视化的主流方案之一，与 dagre 布局扩展配合可完美呈现子任务间的 DAG（有向无环图）工作流：

- **原生图论支持**：专为网络/图可视化设计，内置丰富的图论算法
- **DAG 专用布局**：通过 `cytoscape-dagre` 扩展实现自动分层布局，自动计算节点层级和边的走向
- **丰富的交互 API**：支持节点拖拽、画布缩放、点击事件、高亮路径、框选等
- **样式与数据分离**：通过 JSON 配置样式表，易于动态切换主题
- **高性能**：基于 HTML5 Canvas 渲染，可流畅处理数千节点
- **导出能力**：支持导出 JSON、PNG、JPG，便于保存工作流快照

**笔记编辑器：Tiptap**

Tiptap 是基于 ProseMirror 的 headless 富文本编辑器框架，是当前网页嵌入笔记功能的主流选择：

- **Headless 架构**：不预设任何 UI，开发者可完全自定义工具栏和编辑器外观，完美融入 Linear 暗黑风格
- **Markdown 支持**：通过 `@tiptap/extension-markdown` 实现 Markdown 与富文本的双向转换
- **丰富的扩展**：StarterKit 提供粗体、斜体、列表、代码块、任务列表等常用功能
- **侧边栏嵌入友好**：无框架依赖，纯 JavaScript 即可初始化，适合在侧边栏面板中动态创建/销毁
- **输出格式灵活**：可输出 HTML、JSON、Markdown，便于数据库存储

### 项目目录结构

```
D:/ToDoList/
├── backend/                       # 后端代码
│   ├── main.py                    # FastAPI 主应用入口
│   ├── config.py                  # 配置管理
│   ├── models/
│   │   ├── database.py            # SQLAlchemy 模型定义（含新增模型）
│   │   └── schemas.py             # Pydantic 数据验证模型（含新增 Schema）
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── tasks.py               # Task API 路由（活跃任务）
│   │   ├── subtasks.py            # Subtask API 路由
│   │   ├── calendar.py            # 日期分类 API 路由
│   │   ├── completed.py           # 已完成任务 API 路由
│   │   ├── trash.py               # 已删除任务 API 路由（回收站）
│   │   ├── notes.py               # 【新增】笔记 API 路由（Task & Subtask Notes）
│   │   └── workflow.py            # 【新增】工作流 API 路由（子任务依赖关系）
│   ├── services/
│   │   ├── __init__.py
│   │   ├── task_service.py        # Task 业务逻辑
│   │   ├── subtask_service.py     # Subtask 业务逻辑
│   │   ├── calendar_service.py    # 日期分类服务
│   │   ├── completed_service.py   # 已完成任务服务
│   │   ├── trash_service.py       # 回收站服务
│   │   ├── note_service.py        # 【新增】笔记业务逻辑
│   │   └── workflow_service.py    # 【新增】工作流依赖关系业务逻辑
│   └── utils/
│       └── validators.py
├── frontend/                      # 前端代码
│   ├── index.html                 # 主页面（任务列表）
│   ├── task.html                  # 【新增】任务详情页面（子任务卡片 + 工作流图 + Note 侧边栏）
│   ├── note.html                  # 【新增】子任务独立 Note 页面
│   ├── css/
│   │   ├── linear-theme.css       # Linear 风格主题变量与基础样式
│   │   ├── components.css         # 通用组件样式（按钮、卡片、模态框等）
│   │   ├── date-group.css         # 日期分组样式
│   │   ├── task-page.css          # 【新增】任务页面布局样式
│   │   ├── workflow-graph.css     # 【新增】Cytoscape.js 工作流图样式
│   │   └── note-editor.css        # 【新增】Tiptap 编辑器与侧边栏样式
│   └── js/
│       ├── app.js                 # 主页面应用入口
│       ├── api.js                 # 通用 API 请求封装
│       ├── taskManager.js         # 主页面任务列表管理
│       ├── dateGroup.js           # 日期分组逻辑
│       ├── completed.js           # 已完成任务页面逻辑
│       ├── trash.js               # 回收站页面逻辑
│       ├── uiComponents.js        # 通用 UI 组件
│       ├── taskPage.js            # 【新增】任务页面逻辑（子任务渲染 + 工作流图初始化）
│       ├── workflowGraph.js       # 【新增】Cytoscape.js 工作流图封装
│       ├── noteEditor.js          # 【新增】Tiptap 编辑器封装与侧边栏控制
│       └── subtaskNote.js         # 【新增】子任务独立 Note 页面逻辑
├── Design.md                      # Linear 设计规范文档
├── README.md                      # 项目说明文档
└── requirements.txt               # Python 依赖
```

---

## 数据存储架构

### ER 图

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                    PostgreSQL 数据库                                      │
│                                                                                           │
│  ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐              │
│  │     tasks       │         │ completed_tasks │         │  deleted_tasks  │              │
│  │   (活跃任务)     │         │  (已完成任务)    │         │  (已删除任务)    │              │
│  │                 │         │                 │         │                 │              │
│  │ • 可编辑         │         │ • 只读存档       │         │ • 支持恢复       │              │
│  │ • 参与排序       │         │ • 完成时间记录   │         │ • 删除时间记录   │              │
│  │ • 日期分类展示   │         │ • 可恢复为活跃   │         │ • 30天后自动清理 │              │
│  └────────┬────────┘         └─────────────────┘         └─────────────────┘              │
│           │                                                                               │
│           │ 1:N                                                                           │
│           ▼                                                                               │
│  ┌─────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐              │
│  │    subtasks     │    │    task_notes        │    │  subtask_notes       │              │
│  │   (活跃子任务)   │    │  (任务级笔记)         │    │  (子任务级笔记)       │              │
│  │                 │◄───┤  • task_id (FK)      │    │  • subtask_id (FK)   │              │
│  │ • 工作流节点     │    │  • content (Markdown)│    │  • content (Markdown)│              │
│  │ • 可被依赖       │    │  • updated_at        │    │  • updated_at        │              │
│  └────────┬────────┘    └──────────────────────┘    └──────────────────────┘              │
│           │                                                                               │
│           │ 1:N (self-referencing via junction table)                                    │
│           ▼                                                                               │
│  ┌─────────────────────────────┐                                                          │
│  │   subtask_dependencies      │                                                          │
│  │   (子任务依赖关系/工作流边)   │                                                          │
│  │                             │                                                          │
│  │ • from_subtask_id (FK) ─────┼──► subtasks.id                                          │
│  │ • to_subtask_id (FK) ───────┼──► subtasks.id                                          │
│  │ • dependency_type           │    (BLOCKS / REQUIRES / TRIGGERS)                        │
│  │ • created_at                │                                                          │
│  └─────────────────────────────┘                                                          │
│                                                                                           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                       │
│  │completed_subtask│    │ deleted_subtask │    │  (archived notes │                       │
│  │  (已完成子任务)  │    │  (已删除子任务)  │    │   on complete)  │                       │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘                       │
│                                                                                           │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### 数据状态流转

```
┌──────────┐    创建    ┌──────────┐
│   新建    │ ────────► │  tasks   │
└──────────┘           │  (活跃)   │
                       └────┬─────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
       ┌─────────┐    ┌─────────┐     ┌─────────┐
       │  编辑   │    │  完成   │     │  删除   │
       │ 更新    │    │         │     │         │
       └─────────┘    └────┬────┘     └────┬────┘
                           │               │
                           ▼               ▼
                   ┌───────────────┐ ┌───────────────┐
                   │completed_tasks│ │ deleted_tasks │
                   │  (已完成表)    │ │  (回收站表)   │
                   └───────┬───────┘ └───────┬───────┘
                           │                 │
                           │    恢复操作     │
                           └────────┬────────┘
                                    ▼
                             ┌──────────┐
                             │  tasks   │
                             │ (恢复为活跃)│
                             └──────────┘
```

### 数据库表结构

#### 1. tasks 表（活跃任务）

```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    content VARCHAR(500) NOT NULL,
    description TEXT,
    due_date DATE,                    -- 用于日期分类
    priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 1 AND 4),
    order_index INTEGER DEFAULT 0,    -- 用于 UI 拖拽排序
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_due_date ON tasks(due_date);
CREATE INDEX idx_task_order ON tasks(order_index);
CREATE INDEX idx_task_priority ON tasks(priority);
```

#### 2. subtasks 表（活跃子任务）

```sql
CREATE TABLE subtasks (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    content VARCHAR(500) NOT NULL,
    description TEXT,
    due_date DATE,
    priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 1 AND 4),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subtask_task_id ON subtasks(task_id);
CREATE INDEX idx_subtask_order ON subtasks(order_index);
```

#### 3. completed_tasks 表（已完成任务）

```sql
CREATE TABLE completed_tasks (
    id SERIAL PRIMARY KEY,
    original_id INTEGER,              -- 原 Task ID（参考）
    content VARCHAR(500) NOT NULL,
    description TEXT,
    due_date DATE,
    priority INTEGER,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP              -- 原创建时间
);

CREATE INDEX idx_completed_task_date ON completed_tasks(completed_at);
CREATE INDEX idx_completed_task_original ON completed_tasks(original_id);
```

#### 4. completed_subtasks 表（已完成子任务）

```sql
CREATE TABLE completed_subtasks (
    id SERIAL PRIMARY KEY,
    completed_task_id INTEGER NOT NULL REFERENCES completed_tasks(id) ON DELETE CASCADE,
    original_id INTEGER,
    content VARCHAR(500) NOT NULL,
    description TEXT,
    due_date DATE,
    priority INTEGER,
    created_at TIMESTAMP
);
```

#### 5. deleted_tasks 表（已删除任务 - 回收站）

```sql
CREATE TABLE deleted_tasks (
    id SERIAL PRIMARY KEY,
    original_id INTEGER,              -- 原 Task ID
    content VARCHAR(500) NOT NULL,
    description TEXT,
    due_date DATE,
    priority INTEGER,
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,             -- 自动清理时间（30天后）
    created_at TIMESTAMP
);

CREATE INDEX idx_deleted_task_expires ON deleted_tasks(expires_at);
CREATE INDEX idx_deleted_task_date ON deleted_tasks(deleted_at);
CREATE INDEX idx_deleted_task_original ON deleted_tasks(original_id);
```

#### 6. deleted_subtasks 表（已删除子任务）

```sql
CREATE TABLE deleted_subtasks (
    id SERIAL PRIMARY KEY,
    deleted_task_id INTEGER NOT NULL REFERENCES deleted_tasks(id) ON DELETE CASCADE,
    original_id INTEGER,
    content VARCHAR(500) NOT NULL,
    description TEXT,
    due_date DATE,
    priority INTEGER,
    created_at TIMESTAMP
);
```

#### 7. task_notes 表（任务级笔记）【新增】

```sql
CREATE TABLE task_notes (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',  -- Markdown / HTML 内容
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_note_task_id ON task_notes(task_id);
```

**设计说明**：
- 与 `tasks` 表为 **1:1 关系**，每个任务对应一条笔记记录
- 内容存储为 Markdown 文本，前端 Tiptap 编辑器负责渲染和编辑
- `updated_at` 由后端在每次更新时自动刷新

#### 8. subtask_notes 表（子任务级笔记）【新增】

```sql
CREATE TABLE subtask_notes (
    id SERIAL PRIMARY KEY,
    subtask_id INTEGER NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',  -- Markdown / HTML 内容
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subtask_note_subtask_id ON subtask_notes(subtask_id);
```

**设计说明**：
- 与 `subtasks` 表为 **1:1 关系**，每个子任务对应一条笔记记录
- 当子任务被标记完成或删除时，对应的笔记应一并迁移到归档表或随级联删除清理

#### 9. subtask_dependencies 表（子任务依赖关系/工作流边）【新增】

```sql
CREATE TABLE subtask_dependencies (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    from_subtask_id INTEGER NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
    to_subtask_id INTEGER NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(20) DEFAULT 'BLOCKS',  -- BLOCKS / REQUIRES / TRIGGERS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束：同一条边不能重复创建
    CONSTRAINT uq_dependency UNIQUE (from_subtask_id, to_subtask_id),
    -- 约束：禁止自环
    CONSTRAINT chk_no_self_loop CHECK (from_subtask_id <> to_subtask_id)
);

CREATE INDEX idx_dep_task_id ON subtask_dependencies(task_id);
CREATE INDEX idx_dep_from ON subtask_dependencies(from_subtask_id);
CREATE INDEX idx_dep_to ON subtask_dependencies(to_subtask_id);
```

**设计说明**：
- `task_id` 用于快速筛选某任务下的所有依赖关系
- `dependency_type` 定义边的语义：
  - `BLOCKS`：前置子任务阻塞后续子任务（默认）
  - `REQUIRES`：后续子任务依赖前置子任务的输出
  - `TRIGGERS`：前置子任务完成后自动触发后续子任务
- 通过 `uq_dependency` 唯一约束防止重复边
- 通过 `chk_no_self_loop` 禁止子任务依赖自身

---

## API 接口设计

**Base URL**: `http://localhost:8000/api/v1`

### Task 接口（活跃任务）

| 方法 | 端点 | 功能 | 请求参数 |
|------|------|------|----------|
| GET | `/tasks` | 获取活跃任务列表 | `?priority=&date_from=&date_to=&view_mode=` |
| POST | `/tasks` | 创建任务 | Task JSON |
| GET | `/tasks/{id}` | 获取单个任务详情（含子任务） | - |
| PUT | `/tasks/{id}` | 更新任务 | Task JSON |
| PATCH | `/tasks/{id}/order` | 更新任务排序 | `{"order": number}` |
| POST | `/tasks/{id}/complete` | 标记任务完成（移至 completed 表） | - |
| DELETE | `/tasks/{id}` | 删除任务（移至 deleted 表） | - |

**实现方式**（`backend/routers/tasks.py`）：

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from models.database import get_db
from models.schemas import TaskCreate, TaskUpdate, TaskResponse, TaskOrderUpdate, APIResponse
from services import task_service
from services.completed_service import complete_task
from services.trash_service import move_to_trash

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    priority: Optional[int] = Query(None, ge=1, le=4),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    view_mode: Optional[str] = Query("card", description="list | card | icon"),
    db: AsyncSession = Depends(get_db)
):
    """获取活跃任务列表，支持多种视图模式参数传递"""
    tasks = await task_service.get_tasks(db, priority=priority, date_from=date_from, date_to=date_to)
    return tasks

@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(task_data: TaskCreate, db: AsyncSession = Depends(get_db)):
    if task_data.order_index == 0:
        max_order = await task_service.get_max_order(db)
        task_data.order_index = max_order + 1
    task = await task_service.create_task(db, task_data)
    return task

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: int, db: AsyncSession = Depends(get_db)):
    task = await task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: int, task_data: TaskUpdate, db: AsyncSession = Depends(get_db)):
    task = await task_service.update_task(db, task_id, task_data)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.patch("/{task_id}/order", response_model=TaskResponse)
async def update_task_order(task_id: int, order_data: TaskOrderUpdate, db: AsyncSession = Depends(get_db)):
    task = await task_service.update_task_order(db, task_id, order_data.order_index)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post("/{task_id}/complete", response_model=APIResponse)
async def complete_task_endpoint(task_id: int, db: AsyncSession = Depends(get_db)):
    completed = await complete_task(db, task_id)
    if not completed:
        raise HTTPException(status_code=404, detail="Task not found")
    return APIResponse(success=True, message="Task completed", data={"id": completed.id})

@router.delete("/{task_id}", response_model=APIResponse)
async def delete_task(task_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await move_to_trash(db, task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")
    return APIResponse(success=True, message="Task moved to trash", data={"id": deleted.id})
```

### Subtask 接口

| 方法 | 端点 | 功能 | 请求参数 |
|------|------|------|----------|
| POST | `/tasks/{id}/subtasks` | 为任务创建子任务 | Subtask JSON |
| GET | `/subtasks/{id}` | 获取单个子任务详情 | - |
| PUT | `/subtasks/{id}` | 更新子任务 | Subtask JSON |
| PATCH | `/subtasks/{id}/order` | 更新子任务排序 | `{"order": number}` |
| POST | `/subtasks/{id}/complete` | 标记子任务完成 | - |
| DELETE | `/subtasks/{id}` | 删除子任务 | - |

**实现方式**（`backend/routers/subtasks.py`）：

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.schemas import SubtaskCreate, SubtaskUpdate, SubtaskResponse, APIResponse
from services import subtask_service

router = APIRouter(prefix="/subtasks", tags=["subtasks"])

@router.post("/tasks/{task_id}/subtasks", response_model=SubtaskResponse, status_code=201)
async def create_subtask(task_id: int, subtask_data: SubtaskCreate, db: AsyncSession = Depends(get_db)):
    subtask = await subtask_service.create_subtask(db, task_id, subtask_data)
    if not subtask:
        raise HTTPException(status_code=404, detail="Task not found")
    return subtask

@router.get("/{subtask_id}", response_model=SubtaskResponse)
async def get_subtask(subtask_id: int, db: AsyncSession = Depends(get_db)):
    subtask = await subtask_service.get_subtask(db, subtask_id)
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    return subtask

@router.put("/{subtask_id}", response_model=SubtaskResponse)
async def update_subtask(subtask_id: int, subtask_data: SubtaskUpdate, db: AsyncSession = Depends(get_db)):
    subtask = await subtask_service.update_subtask(db, subtask_id, subtask_data)
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    return subtask

@router.patch("/{subtask_id}/order", response_model=SubtaskResponse)
async def update_subtask_order(subtask_id: int, order_data: dict, db: AsyncSession = Depends(get_db)):
    from services.subtask_service import update_subtask_order
    subtask = await update_subtask_order(db, subtask_id, order_data.get("order_index", 0))
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    return subtask

@router.post("/{subtask_id}/complete", response_model=APIResponse)
async def complete_subtask(subtask_id: int, db: AsyncSession = Depends(get_db)):
    # 标记完成时，级联删除关联的依赖边和笔记（或归档）
    success = await subtask_service.complete_subtask(db, subtask_id)
    if not success:
        raise HTTPException(status_code=404, detail="Subtask not found")
    return APIResponse(success=True, message="Subtask completed")

@router.delete("/{subtask_id}", response_model=APIResponse)
async def delete_subtask(subtask_id: int, db: AsyncSession = Depends(get_db)):
    success = await subtask_service.delete_subtask(db, subtask_id)
    if not success:
        raise HTTPException(status_code=404, detail="Subtask not found")
    return APIResponse(success=True, message="Subtask deleted")
```

### Note 接口（笔记功能）【新增】

| 方法 | 端点 | 功能 | 请求参数 |
|------|------|------|----------|
| GET | `/tasks/{id}/note` | 获取任务笔记 | - |
| PUT | `/tasks/{id}/note` | 更新任务笔记 | `{"content": "markdown text"}` |
| DELETE | `/tasks/{id}/note` | 清空任务笔记 | - |
| GET | `/subtasks/{id}/note` | 获取子任务笔记 | - |
| PUT | `/subtasks/{id}/note` | 更新子任务笔记 | `{"content": "markdown text"}` |
| DELETE | `/subtasks/{id}/note` | 清空子任务笔记 | - |

**实现方式**（`backend/routers/notes.py`）：

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.schemas import NoteCreate, NoteResponse, APIResponse
from services import note_service

router = APIRouter(tags=["notes"])

# ========== Task Notes ==========

@router.get("/tasks/{task_id}/note", response_model=NoteResponse)
async def get_task_note(task_id: int, db: AsyncSession = Depends(get_db)):
    """获取任务笔记，不存在则返回空内容"""
    note = await note_service.get_task_note(db, task_id)
    if not note:
        return NoteResponse(id=None, task_id=task_id, content="", created_at=None, updated_at=None)
    return note

@router.put("/tasks/{task_id}/note", response_model=NoteResponse)
async def upsert_task_note(task_id: int, note_data: NoteCreate, db: AsyncSession = Depends(get_db)):
    """创建或更新任务笔记（UPSERT）"""
    note = await note_service.upsert_task_note(db, task_id, note_data.content)
    return note

@router.delete("/tasks/{task_id}/note", response_model=APIResponse)
async def delete_task_note(task_id: int, db: AsyncSession = Depends(get_db)):
    """清空任务笔记"""
    success = await note_service.delete_task_note(db, task_id)
    return APIResponse(success=success, message="Task note cleared")

# ========== Subtask Notes ==========

@router.get("/subtasks/{subtask_id}/note", response_model=NoteResponse)
async def get_subtask_note(subtask_id: int, db: AsyncSession = Depends(get_db)):
    """获取子任务笔记"""
    note = await note_service.get_subtask_note(db, subtask_id)
    if not note:
        return NoteResponse(id=None, subtask_id=subtask_id, content="", created_at=None, updated_at=None)
    return note

@router.put("/subtasks/{subtask_id}/note", response_model=NoteResponse)
async def upsert_subtask_note(subtask_id: int, note_data: NoteCreate, db: AsyncSession = Depends(get_db)):
    """创建或更新子任务笔记（UPSERT）"""
    note = await note_service.upsert_subtask_note(db, subtask_id, note_data.content)
    return note

@router.delete("/subtasks/{subtask_id}/note", response_model=APIResponse)
async def delete_subtask_note(subtask_id: int, db: AsyncSession = Depends(get_db)):
    """清空子任务笔记"""
    success = await note_service.delete_subtask_note(db, subtask_id)
    return APIResponse(success=success, message="Subtask note cleared")
```

**业务逻辑实现**（`backend/services/note_service.py`）：

```python
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import TaskNote, SubtaskNote


async def get_task_note(db: AsyncSession, task_id: int) -> Optional[TaskNote]:
    result = await db.execute(select(TaskNote).where(TaskNote.task_id == task_id))
    return result.scalar_one_or_none()


async def upsert_task_note(db: AsyncSession, task_id: int, content: str) -> TaskNote:
    note = await get_task_note(db, task_id)
    if note:
        note.content = content
        note.updated_at = datetime.utcnow()
    else:
        note = TaskNote(task_id=task_id, content=content)
        db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


async def delete_task_note(db: AsyncSession, task_id: int) -> bool:
    note = await get_task_note(db, task_id)
    if note:
        await db.delete(note)
        await db.commit()
        return True
    return False


async def get_subtask_note(db: AsyncSession, subtask_id: int) -> Optional[SubtaskNote]:
    result = await db.execute(select(SubtaskNote).where(SubtaskNote.subtask_id == subtask_id))
    return result.scalar_one_or_none()


async def upsert_subtask_note(db: AsyncSession, subtask_id: int, content: str) -> SubtaskNote:
    note = await get_subtask_note(db, subtask_id)
    if note:
        note.content = content
        note.updated_at = datetime.utcnow()
    else:
        note = SubtaskNote(subtask_id=subtask_id, content=content)
        db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


async def delete_subtask_note(db: AsyncSession, subtask_id: int) -> bool:
    note = await get_subtask_note(db, subtask_id)
    if note:
        await db.delete(note)
        await db.commit()
        return True
    return False
```

### Workflow 接口（工作流依赖关系）【新增】

| 方法 | 端点 | 功能 | 请求参数 |
|------|------|------|----------|
| GET | `/tasks/{id}/workflow` | 获取任务的工作流图数据（节点+边） | - |
| GET | `/tasks/{id}/dependencies` | 获取该任务下所有子任务依赖关系列表 | - |
| POST | `/tasks/{id}/dependencies` | 创建子任务依赖关系 | Dependency JSON |
| DELETE | `/dependencies/{dep_id}` | 删除某条依赖关系 | - |
| GET | `/subtasks/{id}/upstream` | 获取某子任务的上游依赖（前置节点） | - |
| GET | `/subtasks/{id}/downstream` | 获取某子任务的下游依赖（后续节点） | - |

**实现方式**（`backend/routers/workflow.py`）：

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from models.database import get_db
from models.schemas import WorkflowResponse, DependencyCreate, DependencyResponse, APIResponse
from services import workflow_service

router = APIRouter(tags=["workflow"])

@router.get("/tasks/{task_id}/workflow", response_model=WorkflowResponse)
async def get_task_workflow(task_id: int, db: AsyncSession = Depends(get_db)):
    """获取任务的工作流图数据，包含节点（子任务）和边（依赖关系）"""
    workflow = await workflow_service.get_workflow(db, task_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return workflow

@router.get("/tasks/{task_id}/dependencies", response_model=List[DependencyResponse])
async def list_task_dependencies(task_id: int, db: AsyncSession = Depends(get_db)):
    """获取任务下所有子任务依赖关系"""
    deps = await workflow_service.get_dependencies_by_task(db, task_id)
    return deps

@router.post("/tasks/{task_id}/dependencies", response_model=DependencyResponse, status_code=201)
async def create_dependency(task_id: int, dep_data: DependencyCreate, db: AsyncSession = Depends(get_db)):
    """创建子任务依赖关系"""
    dep = await workflow_service.create_dependency(db, task_id, dep_data)
    if not dep:
        raise HTTPException(status_code=400, detail="Invalid dependency: self-loop or duplicate edge")
    return dep

@router.delete("/dependencies/{dep_id}", response_model=APIResponse)
async def delete_dependency(dep_id: int, db: AsyncSession = Depends(get_db)):
    """删除依赖关系"""
    success = await workflow_service.delete_dependency(db, dep_id)
    if not success:
        raise HTTPException(status_code=404, detail="Dependency not found")
    return APIResponse(success=True, message="Dependency removed")

@router.get("/subtasks/{subtask_id}/upstream", response_model=List[DependencyResponse])
async def get_upstream_dependencies(subtask_id: int, db: AsyncSession = Depends(get_db)):
    """获取子任务的上游依赖（哪些子任务阻塞了当前子任务）"""
    deps = await workflow_service.get_upstream(db, subtask_id)
    return deps

@router.get("/subtasks/{subtask_id}/downstream", response_model=List[DependencyResponse])
async def get_downstream_dependencies(subtask_id: int, db: AsyncSession = Depends(get_db)):
    """获取子任务的下游依赖（当前子任务阻塞了哪些子任务）"""
    deps = await workflow_service.get_downstream(db, subtask_id)
    return deps
```

**业务逻辑实现**（`backend/services/workflow_service.py`）：

```python
from typing import List, Optional, Dict, Any

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.database import Task, Subtask, SubtaskDependency
from models.schemas import WorkflowResponse, DependencyCreate, DependencyResponse


async def get_workflow(db: AsyncSession, task_id: int) -> Optional[WorkflowResponse]:
    """构建工作流图数据：节点为子任务，边为依赖关系"""
    # 验证任务存在
    task_result = await db.execute(select(Task).where(Task.id == task_id))
    task = task_result.scalar_one_or_none()
    if not task:
        return None
    
    # 获取所有子任务作为节点
    subtasks_result = await db.execute(
        select(Subtask).where(Subtask.task_id == task_id).order_by(Subtask.order_index)
    )
    subtasks = subtasks_result.scalars().all()
    
    # 构建节点列表
    nodes = []
    for st in subtasks:
        nodes.append({
            "data": {
                "id": f"subtask_{st.id}",
                "label": st.content,
                "priority": st.priority,
                "due_date": st.due_date.isoformat() if st.due_date else None,
                "description": st.description,
            }
        })
    
    # 获取所有依赖关系作为边
    deps_result = await db.execute(
        select(SubtaskDependency).where(SubtaskDependency.task_id == task_id)
    )
    dependencies = deps_result.scalars().all()
    
    edges = []
    for dep in dependencies:
        edges.append({
            "data": {
                "id": f"edge_{dep.id}",
                "source": f"subtask_{dep.from_subtask_id}",
                "target": f"subtask_{dep.to_subtask_id}",
                "type": dep.dependency_type,
            }
        })
    
    return WorkflowResponse(
        task_id=task_id,
        task_name=task.content,
        nodes=nodes,
        edges=edges
    )


async def get_dependencies_by_task(db: AsyncSession, task_id: int) -> List[SubtaskDependency]:
    result = await db.execute(
        select(SubtaskDependency).where(SubtaskDependency.task_id == task_id)
    )
    return result.scalars().all()


async def create_dependency(
    db: AsyncSession, task_id: int, dep_data: DependencyCreate
) -> Optional[SubtaskDependency]:
    """创建依赖关系，禁止自环和重复边"""
    if dep_data.from_subtask_id == dep_data.to_subtask_id:
        return None  # 自环
    
    # 检查重复边
    existing = await db.execute(
        select(SubtaskDependency).where(
            and_(
                SubtaskDependency.from_subtask_id == dep_data.from_subtask_id,
                SubtaskDependency.to_subtask_id == dep_data.to_subtask_id,
            )
        )
    )
    if existing.scalar_one_or_none():
        return None  # 重复边
    
    dep = SubtaskDependency(
        task_id=task_id,
        from_subtask_id=dep_data.from_subtask_id,
        to_subtask_id=dep_data.to_subtask_id,
        dependency_type=dep_data.dependency_type or "BLOCKS",
    )
    db.add(dep)
    await db.commit()
    await db.refresh(dep)
    return dep


async def delete_dependency(db: AsyncSession, dep_id: int) -> bool:
    dep_result = await db.execute(select(SubtaskDependency).where(SubtaskDependency.id == dep_id))
    dep = dep_result.scalar_one_or_none()
    if not dep:
        return False
    await db.delete(dep)
    await db.commit()
    return True


async def get_upstream(db: AsyncSession, subtask_id: int) -> List[SubtaskDependency]:
    """获取前置依赖（哪些子任务指向当前子任务）"""
    result = await db.execute(
        select(SubtaskDependency).where(SubtaskDependency.to_subtask_id == subtask_id)
    )
    return result.scalars().all()


async def get_downstream(db: AsyncSession, subtask_id: int) -> List[SubtaskDependency]:
    """获取后续依赖（当前子任务指向哪些子任务）"""
    result = await db.execute(
        select(SubtaskDependency).where(SubtaskDependency.from_subtask_id == subtask_id)
    )
    return result.scalars().all()
```

### 日期分类接口

| 方法 | 端点 | 功能 | 请求参数 |
|------|------|------|----------|
| GET | `/calendar/dates` | 获取有任务的日期列表 | `?year=&month=` |
| GET | `/calendar/by-date` | 按日期获取分组任务 | `?date=YYYY-MM-DD` |
| GET | `/calendar/range` | 获取日期范围内的任务 | `?start=&end=` |
| GET | `/calendar/today` | 获取今日任务 | - |
| GET | `/calendar/upcoming` | 获取未来 N 天任务 | `?days=7` |

### 已完成任务接口

| 方法 | 端点 | 功能 |
|------|------|------|
| GET | `/completed` | 获取已完成任务列表（分页） |
| GET | `/completed/{id}` | 获取已完成任务详情 |
| POST | `/completed/{id}/restore` | 恢复任务到活跃状态 |
| DELETE | `/completed/{id}` | 永久删除已完成记录 |

### 回收站接口（已删除任务）

| 方法 | 端点 | 功能 |
|------|------|------|
| GET | `/trash` | 获取回收站任务列表（分页） |
| GET | `/trash/{id}` | 获取已删除任务详情 |
| POST | `/trash/{id}/restore` | 恢复任务到活跃状态 |
| DELETE | `/trash/{id}/permanent` | 永久删除 |
| DELETE | `/trash/cleanup` | 清理过期任务（30天以上） |
| DELETE | `/trash/empty?confirm=true` | 清空回收站 |

---

## Pydantic Schema 扩展（新增模型）

```python
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from datetime import datetime


# ==================== Note Schemas ====================

class NoteCreate(BaseModel):
    content: str = Field(default="", description="Markdown/HTML content")


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: Optional[int] = None
    task_id: Optional[int] = None
    subtask_id: Optional[int] = None
    content: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ==================== Workflow Schemas ====================

class DependencyCreate(BaseModel):
    from_subtask_id: int = Field(..., description="Source subtask ID")
    to_subtask_id: int = Field(..., description="Target subtask ID")
    dependency_type: Optional[str] = Field(default="BLOCKS", pattern="^(BLOCKS|REQUIRES|TRIGGERS)$")


class DependencyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    task_id: int
    from_subtask_id: int
    to_subtask_id: int
    dependency_type: str
    created_at: datetime


class WorkflowNode(BaseModel):
    data: dict


class WorkflowEdge(BaseModel):
    data: dict


class WorkflowResponse(BaseModel):
    task_id: int
    task_name: str
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]
```

---

## 前端实现要点

### 工作流图初始化（`frontend/js/workflowGraph.js`）

```javascript
class WorkflowGraph {
    constructor(containerId, taskId) {
        this.container = document.getElementById(containerId);
        this.taskId = taskId;
        this.cy = null;
    }

    async init() {
        const workflowData = await TaskAPI.getWorkflow(this.taskId);
        
        this.cy = cytoscape({
            container: this.container,
            elements: [
                ...workflowData.nodes,
                ...workflowData.edges
            ],
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#191a1b',
                        'border-color': 'rgba(255,255,255,0.08)',
                        'border-width': 1,
                        'label': 'data(label)',
                        'color': '#d0d6e0',
                        'font-size': '13px',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'width': 140,
                        'height': 50,
                        'shape': 'roundrectangle',
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': '#5e6ad2',
                        'target-arrow-color': '#5e6ad2',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'arrow-scale': 1.2,
                    }
                },
                {
                    selector: ':selected',
                    style: {
                        'background-color': '#5e6ad2',
                        'border-color': '#7170ff',
                        'color': '#f7f8f8',
                    }
                }
            ],
            layout: {
                name: 'dagre',
                rankDir: 'TB',        // 从上到下布局
                nodeSep: 60,          // 节点水平间距
                edgeSep: 20,          // 边水平间距
                rankSep: 80,          // 层级间距
                padding: 20,
            }
        });

        // 绑定点击事件：选中子任务时高亮相关路径
        this.cy.on('tap', 'node', (evt) => {
            const nodeId = evt.target.id();
            this.highlightPath(nodeId);
        });
    }

    highlightPath(nodeId) {
        // 高亮从该节点出发的所有下游路径
        const successors = this.cy.successors(nodeId);
        this.cy.elements().addClass('dimmed');
        this.cy.getElementById(nodeId).removeClass('dimmed');
        successors.removeClass('dimmed');
    }
}
```

### Tiptap 编辑器封装（`frontend/js/noteEditor.js`）

```javascript
class NoteEditor {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.onSave = options.onSave || (() => {});
        this.editor = null;
    }

    async init(initialContent = '') {
        const { Editor } = await import('https://unpkg.com/@tiptap/core@2.x/dist/index.js');
        const { StarterKit } = await import('https://unpkg.com/@tiptap/starter-kit@2.x/dist/index.js');
        const { Markdown } = await import('https://unpkg.com/@tiptap/extension-markdown@2.x/dist/index.js');

        this.editor = new Editor({
            element: this.container,
            extensions: [StarterKit, Markdown],
            content: initialContent,
            editorProps: {
                attributes: {
                    class: 'note-editor-content',
                    style: `
                        background: rgba(255,255,255,0.02);
                        border: 1px solid rgba(255,255,255,0.08);
                        border-radius: 8px;
                        padding: 16px;
                        color: #d0d6e0;
                        font-family: Inter Variable, system-ui, sans-serif;
                        font-size: 15px;
                        line-height: 1.6;
                        min-height: 300px;
                        outline: none;
                    `
                }
            },
            onUpdate: ({ editor }) => {
                const markdown = editor.storage.markdown.getMarkdown();
                this.onSave(markdown);
            }
        });

        this.renderToolbar();
    }

    renderToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'note-editor-toolbar';
        toolbar.innerHTML = `
            <button class="toolbar-btn" data-action="bold"><b>B</b></button>
            <button class="toolbar-btn" data-action="italic"><i>I</i></button>
            <button class="toolbar-btn" data-action="bulletList">• List</button>
            <button class="toolbar-btn" data-action="codeBlock">&lt;/&gt;</button>
        `;
        
        toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.editor.chain().focus()[action]().run();
            });
        });

        this.container.parentNode.insertBefore(toolbar, this.container);
    }

    destroy() {
        if (this.editor) {
            this.editor.destroy();
            this.editor = null;
        }
    }
}
```

---

## 设计风格

本项目采用 **Linear** 设计语言。

| 用途 | 颜色值 |
|------|--------|
| 页面背景 | `#08090a` |
| 面板背景 | `#0f1011` |
| 卡片表面 | `#191a1b` |
| 主文字 | `#f7f8f8` |
| 次级文字 | `#d0d6e0` |
| 品牌强调 | `#5e6ad2` / `#7170ff` |

### 工作流图配色

| 元素 | 颜色值 |
|------|--------|
| 节点背景 | `#191a1b` |
| 节点边框 | `rgba(255,255,255,0.08)` |
| 节点文字 | `#d0d6e0` |
| 选中节点背景 | `#5e6ad2` |
| 边线颜色 | `#5e6ad2` |
| 箭头颜色 | `#5e6ad2` |
| 高亮路径边 | `#828fff` |
| 暗淡元素 | `rgba(255,255,255,0.15)` |

### Note 编辑器配色

| 元素 | 颜色值 |
|------|--------|
| 编辑器背景 | `rgba(255,255,255,0.02)` |
| 编辑器边框 | `rgba(255,255,255,0.08)` |
| 编辑器文字 | `#d0d6e0` |
| 工具栏背景 | `#0f1011` |
| 工具栏按钮悬停 | `rgba(255,255,255,0.05)` |
| 占位符文字 | `#62666d` |

> 📄 详细设计规范请参考 `Design.md`

---

## 运行方式

### 环境要求

- Python 3.9+
- **PostgreSQL 14+**
- 现代浏览器（支持 ES Modules 和 ES2020+）

### 安装依赖

```bash
# Python 后端依赖
pip install -r requirements.txt

# requirements.txt 内容：
# fastapi>=0.104.0
# uvicorn[standard]>=0.24.0
# sqlalchemy>=2.0.0
# asyncpg>=0.29.0
# pydantic>=2.5.0
# pydantic-settings>=2.1.0
# python-dateutil>=2.8.2
# python-multipart>=0.0.6
```

### 数据库初始化

```sql
CREATE DATABASE todolist;
CREATE USER todo_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE todolist TO todo_user;
```

启动应用时，FastAPI lifespan 会自动调用 `init_db()` 创建所有表（包括新增的 `task_notes`、`subtask_notes`、`subtask_dependencies`）。

### 配置

```python
# backend/config.py
DATABASE_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "user": os.getenv("DB_USER", "todo_user"),
    "password": os.getenv("DB_PASSWORD", "your_password"),
    "database": os.getenv("DB_NAME", "todolist"),
}
```

### 启动应用

```bash
cd D:/ToDoList/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 访问: http://localhost:8000
# API 文档: http://localhost:8000/docs
```

### 前端页面路由

| 页面 | 路径 | 说明 |
|------|------|------|
| 主页面（任务列表） | `http://localhost:8000/` | 展示所有任务，点击进入任务页面 |
| 任务页面 | `http://localhost:8000/task.html?id={task_id}` | 子任务卡片 + 工作流图 + Note 侧边栏 |
| 子任务 Note 页面 | `http://localhost:8000/note.html?subtask_id={subtask_id}` | 子任务独立笔记编辑 |

---

## 功能特性

- ✅ Task / Subtask 增删改查
- ✅ 优先级设置（4 级）
- ✅ 截止日期管理（日期分类展示）
- ✅ 拖拽排序（通过 order 属性）
- ✅ 完成任务（移至 completed_tasks 表）
- ✅ 删除任务（移至 deleted_tasks 表，30 天自动清理）
- ✅ 任务恢复（从 completed/deleted 表恢复）
- ✅ **【新增】任务级 Note 侧边栏**（Tiptap 富文本编辑器，支持 Markdown）
- ✅ **【新增】子任务级独立 Note 页面**（Tiptap 富文本编辑器）
- ✅ **【新增】子任务工作流可视化**（Cytoscape.js + dagre DAG 布局）
- ✅ **【新增】子任务依赖关系管理**（创建/删除/查询上下游）
- ✅ 响应式设计
- ✅ FastAPI 自动生成的 API 文档

---

## License

MIT License
