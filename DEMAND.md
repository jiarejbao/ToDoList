# ToDoList 需求设计文档 (DEMAND.md)

本文档描述 ToDoList 任务管理系统的完整需求设计，包括数据库设计、API 接口设计、后端实现链路以及前端调用方式。

---

## 1. 数据库设计

### 1.1 ER 图

```
┌─────────────────┐         ┌─────────────────────┐         ┌─────────────────────┐
│     tasks       │         │    task_notes       │         │  subtask_notes      │
│   (活跃任务)     │◄────────┤  • task_id (FK)     │         │  • subtask_id (FK)  │
│                 │         │  • content          │         │  • content          │
│ • content       │         │  • updated_at       │         │  • updated_at       │
│ • due_date      │         └─────────────────────┘         └─────────────────────┘
│ • priority      │
│ • order_index   │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐         ┌─────────────────────────────┐
│    subtasks     │◄───────►│   subtask_dependencies      │
│   (活跃子任务)   │         │   (子任务依赖关系/工作流边)    │
│                 │         │                             │
│ • task_id (FK)  │         │ • from_subtask_id (FK) ─────┼──► subtasks.id
│ • content       │         │ • to_subtask_id (FK) ───────┼──► subtasks.id
│ • priority      │         │ • dependency_type           │    (BLOCKS/REQUIRES/TRIGGERS)
│ • order_index   │         │ • task_id (FK)              │
└────────┬────────┘         └─────────────────────────────┘
         │
         │ (完成任务/删除任务时数据迁移)
         ▼
┌─────────────────┐         ┌─────────────────┐
│ completed_tasks │         │  deleted_tasks  │
│  (已完成归档)    │         │  (回收站)        │
│                 │         │                 │
│ • completed_at  │         │ • deleted_at    │
│ • original_id   │         │ • expires_at    │
└────────┬────────┘         └────────┬────────┘
         │ 1:N                        │ 1:N
         ▼                            ▼
┌─────────────────┐         ┌─────────────────┐
│completed_subtask│         │ deleted_subtask │
└─────────────────┘         └─────────────────┘
```

### 1.2 表结构定义

#### tasks（活跃任务）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PRIMARY KEY | 自增主键 |
| content | VARCHAR(500) | NOT NULL | 任务内容 |
| description | TEXT | | 任务描述 |
| due_date | DATE | | 截止日期 |
| priority | INTEGER | DEFAULT 2, CHECK(1-4) | 优先级 P1-P4 |
| order_index | INTEGER | DEFAULT 0 | UI 排序权重 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

#### subtasks（活跃子任务）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PRIMARY KEY | 自增主键 |
| task_id | INTEGER | FK → tasks.id, ON DELETE CASCADE | 所属任务 |
| content | VARCHAR(500) | NOT NULL | 子任务内容 |
| description | TEXT | | 描述 |
| due_date | DATE | | 截止日期 |
| priority | INTEGER | DEFAULT 2, CHECK(1-4) | 优先级 |
| order_index | INTEGER | DEFAULT 0 | 排序权重 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

#### task_notes（任务级笔记）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PRIMARY KEY | 自增主键 |
| task_id | INTEGER | FK → tasks.id, ON DELETE CASCADE | 所属任务 |
| content | TEXT | DEFAULT '' | Markdown/HTML 内容 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

#### subtask_notes（子任务级笔记）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PRIMARY KEY | 自增主键 |
| subtask_id | INTEGER | FK → subtasks.id, ON DELETE CASCADE | 所属子任务 |
| content | TEXT | DEFAULT '' | Markdown/HTML 内容 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

#### subtask_dependencies（子任务依赖关系/工作流边）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PRIMARY KEY | 自增主键 |
| task_id | INTEGER | FK → tasks.id, ON DELETE CASCADE | 所属任务 |
| from_subtask_id | INTEGER | FK → subtasks.id, ON DELETE CASCADE | 源子任务 |
| to_subtask_id | INTEGER | FK → subtasks.id, ON DELETE CASCADE | 目标子任务 |
| dependency_type | VARCHAR(20) | DEFAULT 'BLOCKS' | BLOCKS/REQUIRES/TRIGGERS |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| | | UNIQUE(from_subtask_id, to_subtask_id) | 防止重复边 |
| | | CHECK(from_subtask_id <> to_subtask_id) | 禁止自环 |

#### completed_tasks / deleted_tasks（已完成/已删除）

- 结构与 `tasks` 基本一致，增加 `completed_at` / `deleted_at` / `expires_at` 字段
- 对应的 `completed_subtasks` / `deleted_subtasks` 结构与 `subtasks` 一致

---

## 2. API 接口设计

**Base URL**: `http://localhost:8000/api/v1`

### 2.1 Task API（活跃任务）

前缀: `/tasks`

| 方法 | 端点 | 功能 | 请求参数/Body |
|------|------|------|---------------|
| GET | `/tasks` | 获取任务列表 | `?priority=&date_from=&date_to=` |
| POST | `/tasks` | 创建任务 | `TaskCreate` JSON |
| GET | `/tasks/{id}` | 获取单个任务 | — |
| PUT | `/tasks/{id}` | 更新任务 | `TaskUpdate` JSON |
| PATCH | `/tasks/{id}/order` | 更新排序 | `{"order_index": number}` |
| POST | `/tasks/{id}/complete` | 标记完成 | — |
| DELETE | `/tasks/{id}` | 删除任务 | — |

### 2.2 Subtask API（子任务）

前缀: `/subtasks`

| 方法 | 端点 | 功能 | 请求参数/Body |
|------|------|------|---------------|
| POST | `/subtasks/tasks/{task_id}/subtasks` | 创建子任务 | `SubtaskCreate` JSON |
| GET | `/subtasks/{id}` | 获取子任务 | — |
| PUT | `/subtasks/{id}` | 更新子任务 | `SubtaskUpdate` JSON |
| PATCH | `/subtasks/{id}/order` | 更新排序 | `{"order_index": number}` |
| POST | `/subtasks/{id}/complete` | 标记完成 | — |
| DELETE | `/subtasks/{id}` | 删除子任务 | — |

### 2.3 Note API（笔记）

| 方法 | 端点 | 功能 | 请求参数/Body |
|------|------|------|---------------|
| GET | `/tasks/{id}/note` | 获取任务笔记 | — |
| PUT | `/tasks/{id}/note` | 更新任务笔记 | `{"content": "markdown"}` |
| DELETE | `/tasks/{id}/note` | 清空任务笔记 | — |
| GET | `/subtasks/{id}/note` | 获取子任务笔记 | — |
| PUT | `/subtasks/{id}/note` | 更新子任务笔记 | `{"content": "markdown"}` |
| DELETE | `/subtasks/{id}/note` | 清空子任务笔记 | — |

### 2.4 Workflow API（工作流依赖）

| 方法 | 端点 | 功能 | 请求参数/Body |
|------|------|------|---------------|
| GET | `/tasks/{id}/workflow` | 获取工作流图数据 | — |
| GET | `/tasks/{id}/dependencies` | 获取依赖列表 | — |
| POST | `/tasks/{id}/dependencies` | 创建依赖 | `DependencyCreate` JSON |
| DELETE | `/dependencies/{dep_id}` | 删除依赖 | — |
| GET | `/subtasks/{id}/upstream` | 获取上游依赖 | — |
| GET | `/subtasks/{id}/downstream` | 获取下游依赖 | — |

### 2.5 Calendar API（日历/日期分类）

前缀: `/calendar`

| 方法 | 端点 | 功能 | 请求参数 |
|------|------|------|----------|
| GET | `/calendar/dates` | 有任务的日期 | `?year=&month=` |
| GET | `/calendar/by-date` | 按日期获取任务 | `?date=YYYY-MM-DD` |
| GET | `/calendar/range` | 日期范围内任务 | `?start=&end=` |
| GET | `/calendar/today` | 今日任务 | — |
| GET | `/calendar/upcoming` | 未来 N 天任务 | `?days=7` |

### 2.6 Completed API（已完成任务）

前缀: `/completed`

| 方法 | 端点 | 功能 |
|------|------|------|
| GET | `/completed` | 获取列表（分页） |
| GET | `/completed/{id}` | 获取详情 |
| POST | `/completed/{id}/restore` | 恢复为活跃 |
| DELETE | `/completed/{id}` | 永久删除 |

### 2.7 Trash API（回收站）

前缀: `/trash`

| 方法 | 端点 | 功能 |
|------|------|------|
| GET | `/trash` | 获取列表（分页） |
| GET | `/trash/{id}` | 获取详情 |
| POST | `/trash/{id}/restore` | 恢复为活跃 |
| DELETE | `/trash/{id}/permanent` | 永久删除 |
| DELETE | `/trash/cleanup` | 清理过期任务 |
| DELETE | `/trash/empty?confirm=true` | 清空回收站 |

---

## 3. API 实现链路

### 3.1 架构概览

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Router     │────►│   Service    │────►│   Database   │
│  (HTTP 层)   │     │ (业务逻辑层)  │     │  (数据层)    │
└──────────────┘     └──────────────┘     └──────────────┘
```

**路由层** (`backend/routers/`)：负责 HTTP 请求解析、参数校验、调用 Service、返回响应。
**服务层** (`backend/services/`)：负责业务逻辑、数据库操作、数据转换。
**数据层** (`backend/models/database.py`)：SQLAlchemy ORM 模型定义。

### 3.2 Task API 实现链路

**文件**: `backend/routers/tasks.py`

| Router 端点 | 调用的 Service 方法 | Service 文件 |
|-------------|---------------------|--------------|
| `GET /tasks` | `task_service.get_tasks(db, priority, date_from, date_to)` | `services/task_service.py` |
| `POST /tasks` | `task_service.create_task(db, task_data)` | `services/task_service.py` |
| `GET /tasks/{id}` | `task_service.get_task(db, task_id)` | `services/task_service.py` |
| `PUT /tasks/{id}` | `task_service.update_task(db, task_id, task_data)` | `services/task_service.py` |
| `PATCH /tasks/{id}/order` | `task_service.update_task_order(db, task_id, new_order)` | `services/task_service.py` |
| `POST /tasks/{id}/complete` | `completed_service.complete_task(db, task_id)` | `services/completed_service.py` |
| `DELETE /tasks/{id}` | `trash_service.move_to_trash(db, task_id)` | `services/trash_service.py` |

### 3.3 Subtask API 实现链路

**文件**: `backend/routers/subtasks.py`

| Router 端点 | 调用的 Service 方法 | Service 文件 |
|-------------|---------------------|--------------|
| `POST /subtasks/tasks/{task_id}/subtasks` | `subtask_service.create_subtask(db, task_id, subtask_data)` | `services/subtask_service.py` |
| `GET /subtasks/{id}` | `subtask_service.get_subtask(db, subtask_id)` | `services/subtask_service.py` |
| `PUT /subtasks/{id}` | `subtask_service.update_subtask(db, subtask_id, subtask_data)` | `services/subtask_service.py` |
| `PATCH /subtasks/{id}/order` | `subtask_service.update_subtask_order(db, subtask_id, new_order)` | `services/subtask_service.py` |
| `POST /subtasks/{id}/complete` | `subtask_service.complete_subtask(db, subtask_id)` | `services/subtask_service.py` |
| `DELETE /subtasks/{id}` | `subtask_service.delete_subtask(db, subtask_id)` | `services/subtask_service.py` |

### 3.4 Note API 实现链路

**文件**: `backend/routers/notes.py`

| Router 端点 | 调用的 Service 方法 | Service 文件 |
|-------------|---------------------|--------------|
| `GET /tasks/{id}/note` | `note_service.get_task_note(db, task_id)` | `services/note_service.py` |
| `PUT /tasks/{id}/note` | `note_service.upsert_task_note(db, task_id, content)` | `services/note_service.py` |
| `DELETE /tasks/{id}/note` | `note_service.delete_task_note(db, task_id)` | `services/note_service.py` |
| `GET /subtasks/{id}/note` | `note_service.get_subtask_note(db, subtask_id)` | `services/note_service.py` |
| `PUT /subtasks/{id}/note` | `note_service.upsert_subtask_note(db, subtask_id, content)` | `services/note_service.py` |
| `DELETE /subtasks/{id}/note` | `note_service.delete_subtask_note(db, subtask_id)` | `services/note_service.py` |

### 3.5 Workflow API 实现链路

**文件**: `backend/routers/workflow.py`

| Router 端点 | 调用的 Service 方法 | Service 文件 |
|-------------|---------------------|--------------|
| `GET /tasks/{id}/workflow` | `workflow_service.get_workflow(db, task_id)` | `services/workflow_service.py` |
| `GET /tasks/{id}/dependencies` | `workflow_service.get_dependencies_by_task(db, task_id)` | `services/workflow_service.py` |
| `POST /tasks/{id}/dependencies` | `workflow_service.create_dependency(db, task_id, dep_data)` | `services/workflow_service.py` |
| `DELETE /dependencies/{dep_id}` | `workflow_service.delete_dependency(db, dep_id)` | `services/workflow_service.py` |
| `GET /subtasks/{id}/upstream` | `workflow_service.get_upstream(db, subtask_id)` | `services/workflow_service.py` |
| `GET /subtasks/{id}/downstream` | `workflow_service.get_downstream(db, subtask_id)` | `services/workflow_service.py` |

### 3.6 Calendar API 实现链路

**文件**: `backend/routers/calendar.py`

| Router 端点 | 调用的 Service 方法 | Service 文件 |
|-------------|---------------------|--------------|
| `GET /calendar/dates` | `calendar_service.get_dates_with_tasks(db, year, month)` | `services/calendar_service.py` |
| `GET /calendar/by-date` | `calendar_service.get_tasks_by_date(db, target_date)` | `services/calendar_service.py` |
| `GET /calendar/range` | `calendar_service.get_tasks_by_date_range(db, start, end)` | `services/calendar_service.py` |
| `GET /calendar/today` | `calendar_service.get_today_tasks(db)` | `services/calendar_service.py` |
| `GET /calendar/upcoming` | `calendar_service.get_upcoming_tasks(db, days)` | `services/calendar_service.py` |

### 3.7 Completed API 实现链路

**文件**: `backend/routers/completed.py`

| Router 端点 | 调用的 Service 方法 | Service 文件 |
|-------------|---------------------|--------------|
| `GET /completed` | `completed_service.get_completed_tasks(db, limit, offset)` | `services/completed_service.py` |
| `GET /completed/{id}` | `completed_service.get_completed_task(db, completed_id)` | `services/completed_service.py` |
| `POST /completed/{id}/restore` | `completed_service.restore_completed_task(db, completed_id)` | `services/completed_service.py` |
| `DELETE /completed/{id}` | `completed_service.permanently_delete_completed(db, completed_id)` | `services/completed_service.py` |

### 3.8 Trash API 实现链路

**文件**: `backend/routers/trash.py`

| Router 端点 | 调用的 Service 方法 | Service 文件 |
|-------------|---------------------|--------------|
| `GET /trash` | `trash_service.get_deleted_tasks(db, limit, offset)` | `services/trash_service.py` |
| `GET /trash/{id}` | `trash_service.get_deleted_task(db, deleted_id)` | `services/trash_service.py` |
| `POST /trash/{id}/restore` | `trash_service.restore_deleted_task(db, deleted_id)` | `services/trash_service.py` |
| `DELETE /trash/{id}/permanent` | `trash_service.permanently_delete_trash(db, deleted_id)` | `services/trash_service.py` |
| `DELETE /trash/cleanup` | `trash_service.cleanup_expired_tasks(db)` | `services/trash_service.py` |
| `DELETE /trash/empty` | `trash_service.empty_trash(db)` | `services/trash_service.py` |

---

## 4. 前端调用方式

前端采用 **React + TypeScript**，API 请求封装在 `frontend/src/api/` 目录下，按领域模块组织。

### 4.1 API 客户端架构

```
frontend/src/api/
├── client.ts          # 通用 fetch 封装 + APIError 异常类
├── index.ts           # 统一导出
├── tasks.ts           # TaskAPI
├── subtasks.ts        # SubtaskAPI
├── notes.ts           # NoteAPI（合并 Task/Subtask Notes）
├── workflow.ts        # WorkflowAPI
├── calendar.ts        # CalendarAPI
├── completed.ts       # CompletedAPI
└── trash.ts           # TrashAPI
```

### 4.2 通用请求封装 (`client.ts`)

```typescript
// apiFetch<T>(endpoint, config)
// - 自动拼接 /api/v1 前缀
// - 自动处理 query params
// - 统一 JSON headers
// - 非 2xx 响应抛出 APIError（含 HTTP status 和 detail）
// - 204 响应返回 undefined
```

### 4.3 各模块前端调用映射

#### TaskAPI (`frontend/src/api/tasks.ts`)

| 前端方法 | HTTP 请求 | 调用场景 |
|----------|-----------|----------|
| `TaskAPI.getAll(filters?)` | `GET /api/v1/tasks?...` | 首页任务列表加载 |
| `TaskAPI.getById(id)` | `GET /api/v1/tasks/{id}` | 任务详情页加载 |
| `TaskAPI.create(data)` | `POST /api/v1/tasks` | 新建任务 Modal 提交 |
| `TaskAPI.update(id, data)` | `PUT /api/v1/tasks/{id}` | 编辑任务 Modal 提交 |
| `TaskAPI.delete(id)` | `DELETE /api/v1/tasks/{id}` | 任务卡片删除按钮 |
| `TaskAPI.complete(id)` | `POST /api/v1/tasks/{id}/complete` | 任务卡片完成按钮 |
| `TaskAPI.updateOrder(id, order)` | `PATCH /api/v1/tasks/{id}/order` | 拖拽排序后更新 |
| `TaskAPI.getTaskNote(taskId)` | `GET /api/v1/tasks/{id}/note` | 任务详情页 Note 侧边栏加载 |
| `TaskAPI.updateTaskNote(taskId, content)` | `PUT /api/v1/tasks/{id}/note` | Note 编辑器自动保存 |
| `TaskAPI.getSubtaskNote(subtaskId)` | `GET /api/v1/subtasks/{id}/note` | 子任务笔记页加载 |
| `TaskAPI.updateSubtaskNote(subtaskId, content)` | `PUT /api/v1/subtasks/{id}/note` | 子任务笔记页自动保存 |
| `TaskAPI.getWorkflow(taskId)` | `GET /api/v1/tasks/{id}/workflow` | 工作流图初始化 |

#### SubtaskAPI (`frontend/src/api/subtasks.ts`)

| 前端方法 | HTTP 请求 | 调用场景 |
|----------|-----------|----------|
| `SubtaskAPI.create(taskId, data)` | `POST /api/v1/subtasks/tasks/{task_id}/subtasks` | New Subtask Modal 提交 |
| `SubtaskAPI.get(id)` | `GET /api/v1/subtasks/{id}` | 子任务笔记页加载 |
| `SubtaskAPI.update(id, data)` | `PUT /api/v1/subtasks/{id}` | 编辑子任务 Modal 提交 |
| `SubtaskAPI.delete(id)` | `DELETE /api/v1/subtasks/{id}` | 工作流图右键删除节点 |
| `SubtaskAPI.complete(id)` | `POST /api/v1/subtasks/{id}/complete` | 子任务完成 |

#### WorkflowAPI (`frontend/src/api/workflow.ts`)

| 前端方法 | HTTP 请求 | 调用场景 |
|----------|-----------|----------|
| `WorkflowAPI.createDependency(taskId, data)` | `POST /api/v1/tasks/{id}/dependencies` | Connect 模式下连接两个节点 |
| `WorkflowAPI.deleteDependency(depId)` | `DELETE /api/v1/dependencies/{dep_id}` | 工作流图右键删除边 |
| `WorkflowAPI.getUpstream(subtaskId)` | `GET /api/v1/subtasks/{id}/upstream` | 节点详情展示（预留） |
| `WorkflowAPI.getDownstream(subtaskId)` | `GET /api/v1/subtasks/{id}/downstream` | 节点详情展示（预留） |

#### CompletedAPI / TrashAPI / CalendarAPI

这些 API 在 `frontend/src/api/` 中已定义，主要被 **HomePage** 的侧边栏视图切换调用：

- `CompletedAPI.getAll()` → `GET /api/v1/completed` → 已完成视图
- `TrashAPI.getAll()` → `GET /api/v1/trash` → 回收站视图
- `CalendarAPI.getToday()` → `GET /api/v1/calendar/today` → 今日待办视图
- `CalendarAPI.getUpcoming(days)` → `GET /api/v1/calendar/upcoming` → 未来任务视图

### 4.4 前端页面与 API 调用关系

| 页面/组件 | 调用的 API 模块 | 核心功能 |
|-----------|----------------|----------|
| `HomePage` | `TaskAPI`, `CompletedAPI`, `TrashAPI` | 任务列表、筛选、完成、删除 |
| `TaskCard` | `TaskAPI` | 完成任务、删除任务 |
| `TaskModal` | `TaskAPI` | 新建/编辑任务 |
| `TaskDetailPage` | `TaskAPI`, `SubtaskAPI`, `WorkflowAPI` | 任务详情、工作流图、子任务管理、依赖关系 |
| `SubtaskModal` | `SubtaskAPI` | 新建/编辑子任务 |
| `WorkflowGraph` | `WorkflowAPI` (通过父组件回调) | 创建/删除依赖边 |
| `NoteSidebar` + `NoteEditor` | `TaskAPI` | 任务级笔记的加载与自动保存 |
| `SubtaskNotePage` | `TaskAPI` | 子任务笔记的加载与自动保存 |

---

## 5. 数据流转示例

### 5.1 创建任务 → 创建子任务 → 创建依赖关系

```
用户点击"新建任务"
  → HomePage 打开 TaskModal
  → TaskModal 调用 TaskAPI.create(data)
    → POST /api/v1/tasks
    → routers/tasks.py::create_task()
    → services/task_service.py::create_task()
    → 写入 tasks 表
  → 刷新任务列表

用户进入任务详情页
  → TaskDetailPage 调用 TaskAPI.getById(id) + TaskAPI.getWorkflow(id)
    → GET /api/v1/tasks/{id} + GET /api/v1/tasks/{id}/workflow
    → routers/tasks.py + routers/workflow.py
    → services/task_service.py + services/workflow_service.py

用户点击"New Subtask"
  → TaskDetailPage 打开 SubtaskModal
  → SubtaskModal 调用 SubtaskAPI.create(taskId, data)
    → POST /api/v1/subtasks/tasks/{task_id}/subtasks
    → routers/subtasks.py::create_subtask()
    → services/subtask_service.py::create_subtask()
    → 写入 subtasks 表
  → 刷新工作流图

用户进入 Connect 模式，连接两个节点
  → WorkflowGraph 触发 onCreateDependency
  → TaskDetailPage 调用 WorkflowAPI.createDependency(taskId, data)
    → POST /api/v1/tasks/{id}/dependencies
    → routers/workflow.py::create_dependency()
    → services/workflow_service.py::create_dependency()
    → 写入 subtask_dependencies 表
  → 刷新工作流图
```

### 5.2 笔记编辑与自动保存

```
用户打开任务详情页 → 点击 Notes 按钮
  → NoteSidebar 渲染
  → TaskDetailPage 传入 initialContent（来自 TaskAPI.getTaskNote）
  → NoteEditor 初始化 Tiptap Editor

用户在编辑器中输入
  → Tiptap onUpdate 触发
  → 1秒 debounce 后调用 onSave
  → TaskDetailPage 的 handleSaveNote 调用 TaskAPI.updateTaskNote(taskId, html)
    → PUT /api/v1/tasks/{id}/note
    → routers/notes.py::upsert_task_note()
    → services/note_service.py::upsert_task_note()
    → UPSERT task_notes 表
```

---

## 6. 设计原则

1. **分层架构**：Router → Service → Database，职责边界清晰
2. **异步全链路**：从 HTTP 请求到数据库操作全程使用 `async/await`
3. **软删除**：任务删除不直接删除数据，而是迁移到 `deleted_tasks` / `completed_tasks` 表
4. **级联清理**：删除子任务时自动清理关联的 `subtask_notes` 和 `subtask_dependencies`
5. **数据格式适配**：Workflow API 返回的数据直接适配 Cytoscape.js 的 `elements` 格式
6. **TypeScript 类型安全**：前端 API 模块与后端 Pydantic Schema 一一对应
