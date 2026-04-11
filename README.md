# ToDoList

A local-first task management web application with date-based organization, built with FastAPI and PostgreSQL.

---

## 整体目标

1. 搭建一个可以在本地运行的网站，实现以下核心功能：
   - Task 的增删改查
   - Subtask 的增删改查
   - 任务可视化展示
   - **按日期分类展示任务**（日历功能）

2. Task/Subtask 属性：
   - `content`: 任务内容
   - `description`: 任务描述
   - `due_date`: 截止日期
   - `order`: 排序权重（用于 UI 拖拽调整显示顺序）
   - `priority`: 优先级（1-4级）

3. 数据管理：
   - **所有数据存储在 PostgreSQL 数据库中**（包括活跃、已完成、已删除）
   - 活跃任务存储在 `tasks` 表
   - 已完成的任务存储在 `completed_tasks` 表
   - 已删除的任务存储在 `deleted_tasks` 表
   - 支持从已完成/已删除状态恢复任务
   - 数据存储目录：`D:/ToDoList/DataBase`（用于数据库文件或配置）

4. 页面设计风格：
   - **采用 Linear 风格** —— 参考 `Design.md` 详细设计规范

---

## 技术架构

### 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端 | HTML5 + CSS3 + JavaScript (ES6+) | 原生实现 |
| 后端 | **Python FastAPI** | 高性能异步 Web 框架 |
| 数据库 | **PostgreSQL** | 本地安装的 PostgreSQL 服务 |
| ORM | SQLAlchemy + asyncpg | 异步数据库操作 |
| UI 设计 | Custom CSS | Linear 风格设计系统 |

### 项目目录结构

```
D:/ToDoList/
├── DataBase/                      # 数据存储目录（PostgreSQL数据文件）
├── backend/                       # 后端代码
│   ├── main.py                    # FastAPI 主应用入口
│   ├── config.py                  # 配置管理
│   ├── models/
│   │   ├── database.py            # SQLAlchemy 模型定义
│   │   └── schemas.py             # Pydantic 数据验证模型
│   ├── routers/
│   │   ├── tasks.py               # Task API 路由（活跃任务）
│   │   ├── subtasks.py            # Subtask API 路由
│   │   ├── calendar.py            # 日期分类 API 路由
│   │   ├── completed.py           # 已完成任务 API 路由
│   │   └── trash.py               # 已删除任务 API 路由（回收站）
│   ├── services/
│   │   ├── task_service.py        # Task 业务逻辑
│   │   ├── subtask_service.py     # Subtask 业务逻辑
│   │   ├── calendar_service.py    # 日期分类服务
│   │   ├── completed_service.py   # 已完成任务服务
│   │   └── trash_service.py       # 回收站服务
│   └── utils/
│       └── validators.py
├── frontend/
│   ├── index.html
│   ├── css/
│   │   ├── linear-theme.css
│   │   ├── components.css
│   │   └── date-group.css
│   └── js/
│       ├── app.js
│       ├── api.js
│       ├── dateGroup.js
│       ├── taskManager.js
│       ├── completed.js
│       └── trash.js
├── Design.md
├── README.md
└── Architecture.md
```

---

## 数据存储架构

### 数据库表结构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PostgreSQL 数据库                               │
│                                                                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐       │
│  │     tasks       │    │ completed_tasks │    │  deleted_tasks  │       │
│  │   (活跃任务)     │    │  (已完成任务)    │    │  (已删除任务)    │       │
│  │                 │    │                 │    │                 │       │
│  │ • 可编辑         │    │ • 只读存档       │    │ • 支持恢复       │       │
│  │ • 参与排序       │    │ • 完成时间记录   │    │ • 删除时间记录   │       │
│  │ • 日期分类展示   │    │ • 可恢复为活跃   │    │ • 30天后自动清理 │       │
│  └────────┬────────┘    └─────────────────┘    └─────────────────┘       │
│           │                                                              │
│           │ 一对多                                                        │
│           ▼                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐       │
│  │    subtasks     │    │completed_subtask│    │ deleted_subtask │       │
│  │   (活跃子任务)   │    │  (已完成子任务)  │    │  (已删除子任务)  │       │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
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

---

## API 接口设计

**Base URL**: `http://localhost:8000/api/v1`

### Task 接口（活跃任务）

| 方法 | 端点 | 功能 | 请求参数 |
|------|------|------|----------|
| GET | `/tasks` | 获取活跃任务列表 | `?priority=&date_from=&date_to=` |
| POST | `/tasks` | 创建任务 | Task JSON |
| GET | `/tasks/{id}` | 获取单个任务详情 | - |
| PUT | `/tasks/{id}` | 更新任务 | Task JSON |
| PATCH | `/tasks/{id}/order` | 更新任务排序 | `{"order": number}` |
| POST | `/tasks/{id}/complete` | 标记任务完成（移至completed表） | - |
| DELETE | `/tasks/{id}` | 删除任务（移至deleted表） | - |

### Subtask 接口

| 方法 | 端点 | 功能 | 请求参数 |
|------|------|------|----------|
| POST | `/tasks/{id}/subtasks` | 创建子任务 | Subtask JSON |
| GET | `/subtasks/{id}` | 获取子任务 | - |
| PUT | `/subtasks/{id}` | 更新子任务 | Subtask JSON |
| PATCH | `/subtasks/{id}/order` | 更新子任务排序 | `{"order": number}` |
| POST | `/subtasks/{id}/complete` | 标记子任务完成 | - |
| DELETE | `/subtasks/{id}` | 删除子任务 | - |

### 日期分类接口

| 方法 | 端点 | 功能 | 请求参数 |
|------|------|------|----------|
| GET | `/calendar/dates` | 获取有任务的日期列表 | `?month=YYYY-MM` |
| GET | `/calendar/by-date` | 按日期获取分组任务 | `?date=YYYY-MM-DD` |
| GET | `/calendar/range` | 获取日期范围内的任务 | `?start=&end=` |

### 已完成任务接口

| 方法 | 端点 | 功能 |
|------|------|------|
| GET | `/completed` | 获取已完成任务列表 |
| GET | `/completed/{id}` | 获取已完成任务详情 |
| POST | `/completed/{id}/restore` | 恢复任务到活跃状态 |
| DELETE | `/completed/{id}` | 永久删除已完成记录 |

### 回收站接口（已删除任务）

| 方法 | 端点 | 功能 |
|------|------|------|
| GET | `/trash` | 获取回收站任务列表 |
| GET | `/trash/{id}` | 获取已删除任务详情 |
| POST | `/trash/{id}/restore` | 恢复任务到活跃状态 |
| DELETE | `/trash/{id}/permanent` | 永久删除 |
| DELETE | `/trash/cleanup` | 清理过期任务（30天以上）|

---

## 数据模型

### PostgreSQL 表结构

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

-- 创建索引用于过期清理
CREATE INDEX idx_deleted_tasks_expires ON deleted_tasks(expires_at);
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

---

## 日期分类功能设计

基于 `due_date` 字段实现日期分类展示：

- **今日视图**：`due_date = 今天` 的任务
- **未来视图**：按日期升序分组展示
- **无日期视图**：`due_date IS NULL` 的任务
- **日期筛选**：选择特定日期查看

**响应示例** (`/calendar/by-date`):
```json
{
  "success": true,
  "data": {
    "2026-04-11": [
      {
        "id": 1,
        "content": "完成项目文档",
        "priority": 3,
        "subtasks": [...]
      }
    ],
    "2026-04-12": [...]
  }
}
```

---

## 拖拽排序功能设计

`order_index` 字段用于用户通过拖拽调整任务显示顺序：

```python
async def update_task_order(db: AsyncSession, task_id: int, new_order: int):
    """更新任务排序"""
    task = await get_task(db, task_id)
    old_order = task.order_index
    
    if new_order > old_order:
        # 向下移动：中间的任务 order - 1
        await db.execute(
            update(Task)
            .where(Task.order_index > old_order, Task.order_index <= new_order)
            .values(order_index=Task.order_index - 1)
        )
    else:
        # 向上移动：中间的任务 order + 1
        await db.execute(
            update(Task)
            .where(Task.order_index >= new_order, Task.order_index < old_order)
            .values(order_index=Task.order_index + 1)
        )
    
    task.order_index = new_order
    await db.commit()
    return task
```

---

## 自动清理机制

```python
async def cleanup_expired_tasks(db: AsyncSession):
    """清理30天前的已删除任务"""
    expired_date = datetime.utcnow() - timedelta(days=30)
    
    # 删除过期的子任务
    await db.execute(
        delete(DeletedSubtask)
        .where(DeletedSubtask.deleted_task_id.in_(
            select(DeletedTask.id).where(DeletedTask.expires_at < expired_date)
        ))
    )
    
    # 删除过期的任务
    result = await db.execute(
        delete(DeletedTask).where(DeletedTask.expires_at < expired_date)
    )
    
    await db.commit()
    return result.rowcount
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

> 📄 详细设计规范请参考 `Design.md`

---

## 运行方式

### 环境要求

- Python 3.9+
- **PostgreSQL 14+**
- 现代浏览器

### 安装依赖

```bash
pip install fastapi uvicorn sqlalchemy asyncpg pydantic python-dateutil
```

### 数据库初始化

```sql
CREATE DATABASE todolist;
CREATE USER todo_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE todolist TO todo_user;
```

### 配置

```python
# backend/config.py
DATABASE_URL = "postgresql+asyncpg://todo_user:password@localhost/todolist"
```

### 启动应用

```bash
cd D:/ToDoList/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 访问: http://localhost:8000
# API文档: http://localhost:8000/docs
```

---

## 功能特性

- ✅ Task / Subtask 增删改查
- ✅ 优先级设置（4级）
- ✅ 截止日期管理（日期分类展示）
- ✅ **拖拽排序**（通过 order 属性）
- ✅ 完成任务（移至 completed_tasks 表）
- ✅ 删除任务（移至 deleted_tasks 表，30天自动清理）
- ✅ 任务恢复（从 completed/deleted 表恢复）
- ✅ 响应式设计
- ✅ FastAPI 自动生成的 API 文档

---

## License

MIT License
