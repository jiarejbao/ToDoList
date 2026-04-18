# ToDoList 工作流程详解

本文档详细解释 ToDoList 应用的初始化过程和更新维护过程，包含完整的调用链、参数传递和数据流。

---

## 一、网站初始化过程

### 1.1 启动入口

**文件**: `backend/main.py`

```python
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",           # 应用模块:实例名
        host="0.0.0.0",       # 监听所有接口
        port=8000,            # 服务端口
        reload=APP_CONFIG["debug"],  # 热重载（开发模式）
        log_level="info"
    )
```

**参数传递**:
- `main:app` → Uvicorn 加载 `main.py` 中的 `app` 对象
- `APP_CONFIG["debug"]` → 从 `config.py` 读取配置（默认为 `true`）

---

### 1.2 FastAPI 应用实例化

**文件**: `backend/main.py`（第 48-54 行）

```python
from config import APP_CONFIG, CORS_CONFIG
from models.database import init_db
from services.trash_service import cleanup_expired_tasks

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    print("Starting up...")
    
    # 1. 初始化数据库表
    await init_db()
    print("Database initialized")
    
    # 2. 清理过期回收站任务
    async with AsyncSessionLocal() as db:
        count = await cleanup_expired_tasks(db)
        if count > 0:
            print(f"Cleaned up {count} expired tasks from trash")
    
    yield  # 应用运行期间
    
    # Shutdown
    print("Shutting down...")

# 创建应用实例
app = FastAPI(
    title=APP_CONFIG["title"],           # "ToDoList API"
    description=APP_CONFIG["description"],
    version=APP_CONFIG["version"],       # "1.0.0"
    lifespan=lifespan,                   # 生命周期管理
)
```

**参数来源**:
```
backend/config.py
├── APP_CONFIG["title"] = "ToDoList API"
├── APP_CONFIG["description"] = "A local-first task management API..."
└── APP_CONFIG["version"] = "1.0.0"
```

---

### 1.3 配置加载

**文件**: `backend/config.py`

```python
import os
from pathlib import Path

# 从环境变量或默认值读取数据库配置
DATABASE_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),      # 默认 localhost
    "port": int(os.getenv("DB_PORT", "5432")),      # 默认 5432
    "user": os.getenv("DB_USER", "baojiaren"),      # 默认用户名
    "password": os.getenv("DB_PASSWORD", "todolist_baojiaren"),
    "database": os.getenv("DB_NAME", "todolist"),   # 默认数据库名
}

# 构建异步 PostgreSQL URL
DATABASE_URL = (
    f"postgresql+asyncpg://{DATABASE_CONFIG['user']}:{DATABASE_CONFIG['password']}"
    f"@{DATABASE_CONFIG['host']}:{DATABASE_CONFIG['port']}/{DATABASE_CONFIG['database']}"
)
```

**配置传递链**:
```
config.py → main.py → database.py
     ↓
DATABASE_URL = "postgresql+asyncpg://baojiaren:todolist_baojiaren@localhost:5432/todolist"
```

---

### 1.4 数据库引擎初始化

**文件**: `backend/models/database.py`（第 14-20 行）

```python
from config import DATABASE_URL
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# 创建异步数据库引擎
engine = create_async_engine(DATABASE_URL, echo=False)

# 创建异步会话工厂
AsyncSessionLocal = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

Base = declarative_base()  # 所有模型的基类
```

**参数传递**:
- `DATABASE_URL` ← `config.py` 构建的 PostgreSQL 连接字符串
- `echo=False` ← 不输出 SQL 日志
- `expire_on_commit=False` ← 提交后不使会话过期

---

### 1.5 数据库表创建

**文件**: `backend/models/database.py`（第 162-165 行）

```python
async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

**调用链**:
```
main.py:lifespan()
    ↓ await init_db()
    ↓ models/database.py:init_db()
    ↓ engine.begin() 建立连接
    ↓ conn.run_sync(Base.metadata.create_all)
    ↓ 创建以下表（如不存在）:
        - tasks
        - subtasks
        - completed_tasks
        - completed_subtasks
        - deleted_tasks
        - deleted_subtasks
```

**数据模型定义**（`backend/models/database.py`）:

| 模型类 | 表名 | 用途 | 关键字段 |
|--------|------|------|----------|
| `Task` | `tasks` | 活跃任务 | `id`, `content`, `due_date`, `priority`, `order_index` |
| `Subtask` | `subtasks` | 子任务 | `id`, `task_id(FK)`, `content`, `order_index` |
| `CompletedTask` | `completed_tasks` | 已完成归档 | `id`, `original_id`, `completed_at` |
| `CompletedSubtask` | `completed_subtasks` | 已完成子任务 | `id`, `completed_task_id(FK)` |
| `DeletedTask` | `deleted_tasks` | 回收站 | `id`, `original_id`, `deleted_at`, `expires_at` |
| `DeletedSubtask` | `deleted_subtasks` | 已删除子任务 | `id`, `deleted_task_id(FK)` |

---

### 1.6 过期任务清理

**文件**: `backend/services/trash_service.py`（第 147-166 行）

```python
async def cleanup_expired_tasks(db: AsyncSession) -> int:
    """Clean up tasks that have been in trash for more than 30 days"""
    from config import TRASH_CONFIG
    
    cutoff_date = datetime.utcnow() - timedelta(days=TRASH_CONFIG["expire_days"])
    # TRASH_CONFIG["expire_days"] = 30 (来自 config.py)
    
    # 先删除过期任务的子任务
    await db.execute(
        delete(DeletedSubtask).where(
            DeletedSubtask.deleted_task_id.in_(
                select(DeletedTask.id).where(DeletedTask.expires_at < cutoff_date)
            )
        )
    )
    
    # 删除过期任务
    result = await db.execute(
        delete(DeletedTask).where(DeletedTask.expires_at < cutoff_date)
    )
    
    await db.commit()
    return result.rowcount  # 返回删除的记录数
```

**调用链**:
```
main.py:lifespan()
    ↓ async with AsyncSessionLocal() as db:
        ↓ await cleanup_expired_tasks(db)
        ↓ services/trash_service.py:cleanup_expired_tasks()
        ↓ 计算 cutoff_date = 当前时间 - 30天
        ↓ 执行 DELETE 语句
        ↓ 返回删除数量
```

---

### 1.7 CORS 中间件配置

**文件**: `backend/main.py`（第 56-63 行）

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_CONFIG["allow_origins"],      # ["*"] 允许所有来源
    allow_credentials=CORS_CONFIG["allow_credentials"],  # True
    allow_methods=CORS_CONFIG["allow_methods"],      # ["*"] 允许所有方法
    allow_headers=CORS_CONFIG["allow_headers"],      # ["*"] 允许所有头
)
```

**配置来源**:
```python
# backend/config.py
CORS_CONFIG = {
    "allow_origins": ["*"],
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
```

---

### 1.8 路由注册

**文件**: `backend/main.py`（第 65-70 行）

```python
# Import routers
from routers import tasks, subtasks, calendar, completed, trash

# Include routers with prefix
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(subtasks.router, prefix="/api/v1")
app.include_router(calendar.router, prefix="/api/v1")
app.include_router(completed.router, prefix="/api/v1")
app.include_router(trash.router, prefix="/api/v1")
```

**路由结构**:

| 路由文件 | 前缀 | 完整路径前缀 | 功能 |
|----------|------|--------------|------|
| `tasks.router` | `/api/v1` | `/api/v1/tasks` | 任务 CRUD |
| `subtasks.router` | `/api/v1` | `/api/v1/subtasks` | 子任务管理 |
| `calendar.router` | `/api/v1` | `/api/v1/calendar` | 日历视图 |
| `completed.router` | `/api/v1` | `/api/v1/completed` | 已完成任务 |
| `trash.router` | `/api/v1` | `/api/v1/trash` | 回收站 |

---

### 1.9 静态文件挂载

**文件**: `backend/main.py`（第 72-75 行）

```python
from fastapi.staticfiles import StaticFiles

frontend_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
    "frontend"
)
# frontend_path = "项目根目录/frontend"

if os.path.exists(frontend_path):
    app.mount("/static", StaticFiles(directory=frontend_path), name="static")
```

**挂载规则**:
- URL 路径 `/static/` → 映射到 `frontend/` 目录
- 例如: `/static/index.html` → `frontend/index.html`
- `/static/js/app.js` → `frontend/js/app.js`

---

### 1.10 根路由配置

**文件**: `backend/main.py`（第 78-84 行）

```python
from fastapi.responses import FileResponse

@app.get("/")
async def root():
    """Root endpoint - serve index.html"""
    index_path = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "ToDoList API", "docs": "/docs"}
```

**访问流程**:
```
浏览器访问 http://localhost:8000/
    ↓
root() 函数处理
    ↓
返回 frontend/index.html
    ↓
浏览器加载前端应用
```

---

### 1.11 初始化流程图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         启动命令                                     │
│  uvicorn main:app --host 0.0.0.0 --port 8000                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    backend/main.py                                  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 1. 导入配置                                                    │  │
│  │    from config import APP_CONFIG, CORS_CONFIG                 │  │
│  │    APP_CONFIG = {                                            │  │
│  │        "title": "ToDoList API",                              │  │
│  │        "version": "1.0.0",                                   │  │
│  │        "debug": true                                         │  │
│  │    }                                                         │  │
│  └───────────────────────────────────────────────────────────────┘  │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 2. 定义生命周期管理器 lifespan(app)                            │  │
│  │    @asynccontextmanager                                        │  │
│  │    async def lifespan(app: FastAPI):                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 3. 创建 FastAPI 应用实例                                       │  │
│  │    app = FastAPI(                                              │  │
│  │        title=APP_CONFIG["title"],                              │  │
│  │        version=APP_CONFIG["version"],                          │  │
│  │        lifespan=lifespan                                      │  │
│  │    )                                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    启动阶段 (lifespan startup)                       │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 4. 数据库初始化                                                │  │
│  │    await init_db()                                            │  │
│  │        ↓                                                      │  │
│  │    backend/models/database.py:init_db()                       │  │
│  │        ↓                                                      │  │
│  │    async with engine.begin() as conn:                         │  │
│  │        await conn.run_sync(Base.metadata.create_all)          │  │
│  │    # 创建 tasks, subtasks, completed_tasks 等表               │  │
│  └───────────────────────────────────────────────────────────────┘  │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 5. 清理过期回收站任务                                          │  │
│  │    async with AsyncSessionLocal() as db:                      │  │
│  │        count = await cleanup_expired_tasks(db)                │  │
│  │        # 删除超过30天的回收站任务                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    应用配置阶段                                      │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 6. 添加 CORS 中间件                                            │  │
│  │    app.add_middleware(                                         │  │
│  │        CORSMiddleware,                                         │  │
│  │        allow_origins=["*"],                                    │  │
│  │        allow_credentials=True,                                │  │
│  │        allow_methods=["*"],                                   │  │
│  │        allow_headers=["*"]                                    │  │
│  │    )                                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 7. 注册 API 路由                                               │  │
│  │    app.include_router(tasks.router, prefix="/api/v1")         │  │
│  │    app.include_router(subtasks.router, prefix="/api/v1")      │  │
│  │    app.include_router(calendar.router, prefix="/api/v1")      │  │
│  │    app.include_router(completed.router, prefix="/api/v1")     │  │
│  │    app.include_router(trash.router, prefix="/api/v1")         │  │
│  └───────────────────────────────────────────────────────────────┘  │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 8. 挂载静态文件                                                │  │
│  │    app.mount("/static", StaticFiles(directory="frontend"))    │  │
│  │    # 前端文件通过 /static/ 路径访问                           │  │
│  └───────────────────────────────────────────────────────────────┘  │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    应用就绪，等待请求                                │
│                    Uvicorn running on http://0.0.0.0:8000           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 二、网站更新维护过程

以"创建新任务"为例，详细描述从前端点击保存到后端处理再到前端更新的完整流程。

### 2.1 前端初始化

**文件**: `frontend/index.html` → `frontend/js/app.js`

```javascript
// app.js - DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    Toast.init();           // 初始化通知组件
    TaskManager.init();     // 初始化任务管理器
    bindNavigation();       // 绑定侧边栏导航
    checkHealth();          // 检查 API 健康状态
});
```

---

### 2.2 用户点击"新建任务"

**文件**: `frontend/js/taskManager.js`（第 18-21 行）

```javascript
bindEvents() {
    // 新建任务按钮
    document.getElementById('btn-new-task')?.addEventListener('click', () => {
        this.openModal();   // 打开模态框
    });
}
```

**参数**: 无

---

### 2.3 打开任务编辑模态框

**文件**: `frontend/js/taskManager.js`（第 270-286 行）

```javascript
openModal(task = null) {
    // 设置编辑状态
    this.editingTaskId = task ? task.id : null;  // null 表示新建
    this.tempSubtasks = task ? [...task.subtasks] : [];  // 临时子任务列表
    
    // 设置表单字段
    document.getElementById('modal-title').textContent = task ? '编辑任务' : '新建任务';
    document.getElementById('task-id').value = task ? task.id : '';
    document.getElementById('task-content').value = task ? task.content : '';
    document.getElementById('task-description').value = task ? task.description || '' : '';
    document.getElementById('task-due-date').value = task ? Format.dateInput(task.due_date) : '';
    document.getElementById('task-priority').value = task ? task.priority : 2;
    
    Modal.show('task-modal');  // 显示模态框
}
```

**参数**:
- `task`: `null`（新建时）或 `Task` 对象（编辑时）

---

### 2.4 用户填写表单并点击保存

**文件**: `frontend/js/taskManager.js`（第 33-36 行）

```javascript
bindEvents() {
    // 保存任务
    document.getElementById('btn-save')?.addEventListener('click', () => {
        this.saveTask();   // 调用保存方法
    });
}
```

---

### 2.5 前端数据收集与验证

**文件**: `frontend/js/taskManager.js`（第 354-388 行）

```javascript
async saveTask() {
    // 1. 获取并验证任务内容
    const content = document.getElementById('task-content').value.trim();
    if (!content) {
        Toast.error('请输入任务内容');
        return;
    }
    
    // 2. 构建请求数据
    const data = {
        content: content,                                            // 任务内容
        description: document.getElementById('task-description').value.trim() || null,
        due_date: document.getElementById('task-due-date').value || null,  // 截止日期
        priority: parseInt(document.getElementById('task-priority').value), // 优先级 1-4
        subtasks: this.tempSubtasks                                  // 子任务数组
            .filter(s => s.id.startsWith('temp_'))                   // 只保留新建的子任务
            .map(s => ({
                content: s.content,
                priority: s.priority,
            })),
    };
    
    // 3. 调用 API
    try {
        if (this.editingTaskId) {
            // 编辑模式: PUT /api/v1/tasks/{id}
            await TaskAPI.update(this.editingTaskId, data);
            Toast.success('任务已更新');
        } else {
            // 新建模式: POST /api/v1/tasks
            await TaskAPI.create(data);
            Toast.success('任务已创建');
        }
        
        this.closeModal();        // 关闭模态框
        await this.loadTasks();   // 刷新任务列表
    } catch (error) {
        Toast.error('保存失败');   // 显示错误
        console.error(error);
    }
}
```

**构建的数据示例**:
```json
{
    "content": "wildfire to crimerate",
    "description": "完成论文写作",
    "due_date": "2026-05-13",
    "priority": 4,
    "subtasks": []
}
```

---

### 2.6 前端 API 调用

**文件**: `frontend/js/api.js`（第 50-56 行）

```javascript
const TaskAPI = {
    // Create task
    async create(data) {
        return apiFetch('/tasks', {           // endpoint = '/tasks'
            method: 'POST',
            body: JSON.stringify(data),       // 序列化 JSON
        });
    },
}

// 通用 fetch 封装（api.js:8-30）
async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;  // '/api/v1' + '/tasks'
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}
```

**请求详情**:
```
Method: POST
URL: http://localhost:8000/api/v1/tasks
Headers:
    Content-Type: application/json
Body:
    {
        "content": "wildfire to crimerate",
        "description": "完成论文写作",
        "due_date": "2026-05-13",
        "priority": 4,
        "subtasks": []
    }
```

---

### 2.7 后端路由处理

**文件**: `backend/routers/tasks.py`（第 32-44 行）

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from models.database import get_db
from models.schemas import TaskCreate, TaskResponse
from services import task_service

@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(
    task_data: TaskCreate,           # 请求体 → Pydantic 模型
    db: AsyncSession = Depends(get_db)  # 依赖注入: 数据库会话
):
    """Create a new task"""
    # 如果未指定排序索引，追加到末尾
    if task_data.order_index == 0:
        max_order = await task_service.get_max_order(db)
        task_data.order_index = max_order + 1
    
    task = await task_service.create_task(db, task_data)
    return task
```

**参数传递**:
1. **请求体解析**:
   ```
   JSON Body → FastAPI → Pydantic (TaskCreate)
   ```

2. **TaskCreate 模型验证**（`backend/models/schemas.py:51-52`）:
   ```python
   class TaskCreate(TaskBase):
       subtasks: List[SubtaskCreate] = []
   
   class TaskBase(BaseModel):
       content: str = Field(..., min_length=1, max_length=500)
       description: Optional[str] = None
       due_date: Optional[date] = None
       priority: int = Field(default=2, ge=1, le=4)
       order_index: int = 0
   ```

3. **数据库会话注入**（`backend/models/database.py:153-159`）:
   ```python
   async def get_db():
       async with AsyncSessionLocal() as session:
           try:
               yield session
           finally:
               await session.close()
   ```

---

### 2.8 业务逻辑处理

**文件**: `backend/services/task_service.py`（第 15-47 行）

```python
from sqlalchemy.orm import selectinload

async def create_task(db: AsyncSession, task_data: TaskCreate) -> Task:
    """Create a new task with optional subtasks"""
    
    # 1. 创建任务对象
    task = Task(
        content=task_data.content,           # "wildfire to crimerate"
        description=task_data.description,   # "完成论文写作"
        due_date=task_data.due_date,         # date(2026, 5, 13)
        priority=task_data.priority,         # 4
        order_index=task_data.order_index,   # 自动计算的值
    )
    
    # 2. 添加到会话并提交
    db.add(task)
    await db.commit()           # INSERT INTO tasks (...)
    await db.refresh(task)      # 获取生成的 ID
    
    # 3. 创建子任务（如果有）
    if task_data.subtasks:
        for i, subtask_data in enumerate(task_data.subtasks):
            subtask = Subtask(
                task_id=task.id,
                content=subtask_data.content,
                priority=subtask_data.priority,
                order_index=subtask_data.order_index or i,
            )
            db.add(subtask)
        await db.commit()
    
    # 4. 重新加载任务（包含子任务关系）
    result = await db.execute(
        select(Task)
        .where(Task.id == task.id)
        .options(selectinload(Task.subtasks))  # 预加载子任务
    )
    return result.scalar_one()
```

**SQL 执行过程**:
```sql
-- 1. 插入任务
INSERT INTO tasks (content, description, due_date, priority, order_index, created_at, updated_at)
VALUES ('wildfire to crimerate', '完成论文写作', '2026-05-13', 4, 6, NOW(), NOW())
RETURNING id;
-- 返回: id = 9

-- 2. 查询任务（带子任务）
SELECT tasks.*, subtasks.* 
FROM tasks 
LEFT JOIN subtasks ON tasks.id = subtasks.task_id 
WHERE tasks.id = 9;
```

---

### 2.9 响应序列化

**文件**: `backend/models/schemas.py`（第 66-72 行）

```python
class TaskResponse(TaskBase):
    model_config = ConfigDict(from_attributes=True)  # 从 ORM 对象读取
    
    id: int                    # 数据库生成的 ID
    subtasks: List[SubtaskResponse] = []  # 子任务列表
    created_at: datetime       # 创建时间
    updated_at: datetime       # 更新时间
```

**响应转换**:
```
SQLAlchemy Task 对象 → Pydantic TaskResponse → JSON

Task ORM 对象:
    id = 9
    content = "wildfire to crimerate"
    description = "完成论文写作"
    due_date = date(2026, 5, 13)
    priority = 4
    order_index = 6
    subtasks = []  # 关系属性
    created_at = datetime(2026, 4, 11, 18, 9, 0)
    updated_at = datetime(2026, 4, 11, 18, 9, 0)

↓ FastAPI + Pydantic 序列化

JSON Response:
{
    "id": 9,
    "content": "wildfire to crimerate",
    "description": "完成论文写作",
    "due_date": "2026-05-13",
    "priority": 4,
    "order_index": 6,
    "subtasks": [],
    "created_at": "2026-04-11T18:09:00.639272",
    "updated_at": "2026-04-11T18:09:00.639276"
}
```

---

### 2.10 前端接收响应并更新 UI

**文件**: `frontend/js/taskManager.js`（第 373-388 行）

```javascript
async saveTask() {
    // ... 发送请求 ...
    
    try {
        await TaskAPI.create(data);    // ← 接收响应
        Toast.success('任务已创建');    // 显示成功通知
        
        this.closeModal();              // 关闭模态框
        // closeModal() 内部:
        // - Modal.hide('task-modal')
        // - this.editingTaskId = null
        // - this.tempSubtasks = []
        // - document.getElementById('task-form').reset()
        
        await this.loadTasks();         // 刷新任务列表
        
    } catch (error) {
        Toast.error('保存失败');
    }
}
```

---

### 2.11 刷新任务列表

**文件**: `frontend/js/taskManager.js`（第 69-78 行）

```javascript
async loadTasks() {
    try {
        const tasks = await TaskAPI.getAll();  // GET /api/v1/tasks
        this.tasks = tasks;                     // 保存到本地状态
        this.render();                          // 重新渲染
    } catch (error) {
        Toast.error('加载任务失败');
    }
}
```

**获取任务列表**（`frontend/js/api.js:35-42`）:
```javascript
async getAll(priority = null, dateFrom = null, dateTo = null) {
    const params = new URLSearchParams();
    if (priority) params.append('priority', priority);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/tasks${query}`);  // GET /api/v1/tasks
}
```

---

### 2.12 后端获取任务列表

**文件**: `backend/routers/tasks.py`（第 20-29 行）

```python
@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    priority: Optional[int] = Query(None, ge=1, le=4),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get all active tasks with optional filters"""
    tasks = await task_service.get_tasks(
        db, 
        priority=priority, 
        date_from=date_from, 
        date_to=date_to
    )
    return tasks
```

**文件**: `backend/services/task_service.py`（第 58-77 行）

```python
async def get_tasks(
    db: AsyncSession,
    priority: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> List[Task]:
    """Get all active tasks with optional filters"""
    query = select(Task).options(selectinload(Task.subtasks)).order_by(asc(Task.order_index))
    
    if priority:
        query = query.where(Task.priority == priority)
    
    if date_from:
        query = query.where(Task.due_date >= date_from)
    
    if date_to:
        query = query.where(Task.due_date <= date_to)
    
    result = await db.execute(query)
    return result.scalars().all()
```

**执行的 SQL**:
```sql
SELECT tasks.*, subtasks.*
FROM tasks
LEFT JOIN subtasks ON tasks.id = subtasks.task_id
ORDER BY tasks.order_index ASC;
```

---

### 2.13 前端渲染任务列表

**文件**: `frontend/js/taskManager.js`（第 81-131 行）

```javascript
render() {
    const container = document.getElementById('task-container');
    
    // 根据当前视图筛选
    let filteredTasks = this.tasks;
    switch (this.currentView) {
        case 'today':
            const today = new Date().toISOString().split('T')[0];
            filteredTasks = this.tasks.filter(t => t.due_date?.split('T')[0] === today);
            break;
        case 'upcoming':
            // ... 筛选未来任务
            break;
        // ... 其他视图
    }
    
    // 排序
    filteredTasks.sort((a, b) => a.order_index - b.order_index);
    
    // 渲染
    if (filteredTasks.length === 0) {
        container.innerHTML = createEmptyState('📋', '暂无任务', '...');
    } else {
        container.innerHTML = `
            <div class="date-task-list">
                ${filteredTasks.map(task => this.renderTaskCard(task)).join('')}
            </div>
        `;
    }
    
    // 绑定事件
    this.bindTaskEvents();
}
```

**渲染任务卡片**（`frontend/js/taskManager.js:133-174`）:
```javascript
renderTaskCard(task) {
    const isOverdue = Format.isOverdue(task.due_date);
    const priorityClass = Priority.getClass(task.priority);
    
    return `
        <div class="task-card" data-id="${task.id}">
            <div class="task-header">
                <div class="task-checkbox" data-id="${task.id}"></div>
                <div class="task-content">
                    <div class="task-title">${task.content}</div>
                    ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                    <div class="task-meta">
                        ${task.due_date ? `<span class="task-date">${Format.date(task.due_date)}</span>` : ''}
                        <span class="priority-badge ${priorityClass}">${Priority.getLabel(task.priority)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}
```

---

### 2.14 完整流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            用户操作                                          │
│  点击 "新建任务" 按钮                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    frontend/js/taskManager.js                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ openModal(task = null)                                                 │  │
│  │   - this.editingTaskId = null                                          │  │
│  │   - 设置表单默认值                                                     │  │
│  │   - Modal.show('task-modal')                                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           用户填写表单                                       │
│  内容: "wildfire to crimerate"                                              │
│  描述: "完成论文写作"                                                        │
│  日期: "2026-05-13"                                                         │
│  优先级: P4                                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           点击 "保存" 按钮                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    frontend/js/taskManager.js                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ saveTask()                                                             │  │
│  │   1. 收集表单数据:                                                     │  │
│  │      data = {                                                          │  │
│  │          content: "wildfire to crimerate",                            │  │
│  │          description: "完成论文写作",                                  │  │
│  │          due_date: "2026-05-13",                                       │  │
│  │          priority: 4,                                                  │  │
│  │          subtasks: []                                                  │  │
│  │      }                                                                 │  │
│  │   2. await TaskAPI.create(data)                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    frontend/js/api.js                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ TaskAPI.create(data)                                                   │  │
│  │   ↓ apiFetch('/tasks', { method: 'POST', body: JSON.stringify(data) })│  │
│  │       ↓ fetch('/api/v1/tasks', {                                       │  │
│  │             method: 'POST',                                            │  │
│  │             headers: { 'Content-Type': 'application/json' },           │  │
│  │             body: '{"content":"wildfire to crimerate",...}'            │  │
│  │         })                                                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
                                    │ HTTP POST
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    backend/routers/tasks.py                                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ @router.post("", response_model=TaskResponse)                          │  │
│  │ async def create_task(                                                 │  │
│  │     task_data: TaskCreate,           ← Pydantic 解析 JSON              │  │
│  │     db: AsyncSession = Depends(get_db)  ← 注入数据库会话               │  │
│  │ ):                                                                      │  │
│  │     if task_data.order_index == 0:                                     │  │
│  │         max_order = await task_service.get_max_order(db)               │  │
│  │         task_data.order_index = max_order + 1                          │  │
│  │     task = await task_service.create_task(db, task_data)               │  │
│  │     return task                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    backend/services/task_service.py                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ create_task(db, task_data)                                             │  │
│  │   1. task = Task(                                                      │  │
│  │          content=task_data.content,     # "wildfire to crimerate"     │  │
│  │          description=task_data.description,                           │  │
│  │          due_date=task_data.due_date,                                 │  │
│  │          priority=task_data.priority,   # 4                           │  │
│  │          order_index=task_data.order_index,                           │  │
│  │      )                                                                 │  │
│  │   2. db.add(task)                                                      │  │
│  │   3. await db.commit()      -- SQL: INSERT INTO tasks ...             │  │
│  │   4. await db.refresh(task) -- 获取生成的 ID                          │  │
│  │   5. result = await db.execute(                                        │  │
│  │          select(Task)                                                  │  │
│  │          .where(Task.id == task.id)                                    │  │
│  │          .options(selectinload(Task.subtasks))                         │  │
│  │      )                                                                 │  │
│  │   6. return result.scalar_one()                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    backend/models/schemas.py                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ TaskResponse 序列化                                                    │  │
│  │   ORM Task 对象 → Pydantic TaskResponse → JSON                        │  │
│  │                                                                        │  │
│  │   {                                                                    │  │
│  │       "id": 9,                                                         │  │
│  │       "content": "wildfire to crimerate",                             │  │
│  │       "description": "完成论文写作",                                   │  │
│  │       "due_date": "2026-05-13",                                        │  │
│  │       "priority": 4,                                                   │  │
│  │       "order_index": 6,                                                │  │
│  │       "subtasks": [],                                                  │  │
│  │       "created_at": "2026-04-11T18:09:00.639272",                      │  │
│  │       "updated_at": "2026-04-11T18:09:00.639276"                       │  │
│  │   }                                                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
                                    │ HTTP Response
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    frontend/js/api.js                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ apiFetch() 接收响应                                                    │  │
│  │   response.json() → 返回解析后的任务对象                               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    frontend/js/taskManager.js                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ saveTask() 继续执行                                                    │  │
│  │   - Toast.success('任务已创建')                                        │  │
│  │   - this.closeModal()                                                  │  │
│  │   - await this.loadTasks()  -- 刷新列表                                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    frontend/js/taskManager.js                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ loadTasks()                                                            │  │
│  │   - const tasks = await TaskAPI.getAll()  -- GET /api/v1/tasks        │  │
│  │   - this.tasks = tasks                                                 │  │
│  │   - this.render()                                                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ render()                                                               │  │
│  │   - 筛选当前视图的任务                                                 │  │
│  │   - 按 order_index 排序                                                │  │
│  │   - filteredTasks.map(task => renderTaskCard(task))                    │  │
│  │   - container.innerHTML = ...                                          │  │
│  │   - this.bindTaskEvents()  -- 绑定复选框、编辑、删除按钮               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UI 更新完成                                          │
│  新任务出现在任务列表中                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.15 其他操作的数据流

#### 2.15.1 完成任务

```
用户点击任务复选框
    ↓
frontend/js/taskManager.js:completeTask(taskId)
    ↓
TaskAPI.complete(taskId) → POST /api/v1/tasks/{id}/complete
    ↓
backend/routers/tasks.py:complete_task_endpoint(task_id, db)
    ↓
services/completed_service.py:complete_task(db, task_id)
    ↓
    1. 查询 Task (with subtasks)
    2. 创建 CompletedTask 记录
    3. 复制 Subtasks → CompletedSubtasks
    4. 删除原 Task (级联删除原 Subtasks)
    5. commit
    ↓
返回 APIResponse(success=True, ...)
    ↓
前端: Toast.success('任务已完成')
    ↓
loadTasks() 刷新列表
```

#### 2.15.2 删除任务到回收站

```
用户点击删除按钮
    ↓
frontend/js/taskManager.js:deleteTask(taskId)
    ↓
TaskAPI.delete(taskId) → DELETE /api/v1/tasks/{id}
    ↓
backend/routers/tasks.py:delete_task(task_id, db)
    ↓
services/trash_service.py:move_to_trash(db, task_id)
    ↓
    1. 查询 Task (with subtasks)
    2. 创建 DeletedTask 记录
    3. 设置 expires_at = now + 30 days
    4. 复制 Subtasks → DeletedSubtasks
    5. 删除原 Task
    6. commit
    ↓
返回 APIResponse(success=True, message="Task moved to trash")
    ↓
前端: Toast.success('任务已移至回收站')
    ↓
loadTasks() 刷新列表
```

#### 2.15.3 从回收站恢复

```
用户在回收站点击恢复
    ↓
frontend/js/trash.js:restoreTask(taskId)
    ↓
TrashAPI.restore(taskId) → POST /api/v1/trash/{id}/restore
    ↓
backend/routers/trash.py:restore_task(deleted_id, db)
    ↓
services/trash_service.py:restore_deleted_task(db, deleted_id)
    ↓
    1. 查询 DeletedTask (with subtasks)
    2. 创建新 Task (重置 created_at)
    3. 创建 Subtasks
    4. 删除 DeletedTask (级联删除 DeletedSubtasks)
    5. commit
    ↓
返回 TaskResponse
    ↓
前端: Toast.success('任务已恢复')
    ↓
TrashManager.load() 刷新回收站列表
```

---

## 三、数据模型关系图

```
┌─────────────────────────────────────────────────────────────────┐
│                         tasks (活跃任务)                         │
├─────────────────────────────────────────────────────────────────┤
│ id (PK) │ content │ description │ due_date │ priority │ order  │
└─────────────────┬───────────────────────────────────────────────┘
                  │ 1:N
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        subtasks (子任务)                         │
├─────────────────────────────────────────────────────────────────┤
│ id (PK) │ task_id (FK) │ content │ priority │ order_index      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    completed_tasks (已完成)                      │
├─────────────────────────────────────────────────────────────────┤
│ id (PK) │ original_id │ content │ ... │ completed_at            │
└─────────────────┬───────────────────────────────────────────────┘
                  │ 1:N
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  completed_subtasks (已完成子任务)               │
├─────────────────────────────────────────────────────────────────┤
│ id (PK) │ completed_task_id (FK) │ content │ ...                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     deleted_tasks (回收站)                       │
├─────────────────────────────────────────────────────────────────┤
│ id (PK) │ original_id │ content │ ... │ deleted_at │ expires_at │
└─────────────────┬───────────────────────────────────────────────┘
                  │ 1:N
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   deleted_subtasks (已删除子任务)                │
├─────────────────────────────────────────────────────────────────┤
│ id (PK) │ deleted_task_id (FK) │ content │ ...                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 四、目录结构总结

```
ToDoList/
├── backend/                          # 后端代码
│   ├── main.py                       # 应用入口，生命周期管理
│   ├── config.py                     # 配置管理（数据库、CORS等）
│   ├── models/
│   │   ├── database.py               # SQLAlchemy 模型和数据库引擎
│   │   └── schemas.py                # Pydantic 请求/响应模型
│   ├── routers/
│   │   ├── tasks.py                  # 任务路由 (CRUD)
│   │   ├── subtasks.py               # 子任务路由
│   │   ├── calendar.py               # 日历路由
│   │   ├── completed.py              # 已完成任务路由
│   │   └── trash.py                  # 回收站路由
│   └── services/
│       ├── task_service.py           # 任务业务逻辑
│       ├── subtask_service.py        # 子任务业务逻辑
│       ├── completed_service.py      # 完成任务业务逻辑
│       ├── trash_service.py          # 回收站业务逻辑
│       └── calendar_service.py       # 日历业务逻辑
│
└── frontend/                         # 前端代码
    ├── index.html                    # 主页面
    ├── css/                          # 样式文件
    └── js/
        ├── app.js                    # 应用入口
        ├── api.js                    # API 客户端
        ├── taskManager.js            # 任务管理
        ├── uiComponents.js           # UI 组件
        ├── dateGroup.js              # 日期分组
        ├── completed.js              # 已完成任务管理
        └── trash.js                  # 回收站管理
```

---

## 五、关键技术点

### 5.1 异步数据库操作

```python
# backend/models/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession)

# 使用 selectinload 解决 N+1 查询问题
from sqlalchemy.orm import selectinload

result = await db.execute(
    select(Task).options(selectinload(Task.subtasks))
)
```

### 5.2 依赖注入

```python
# backend/routers/tasks.py
from fastapi import Depends

async def create_task(
    task_data: TaskCreate,
    db: AsyncSession = Depends(get_db)  # 依赖注入
):
    ...
```

### 5.3 数据验证

```python
# backend/models/schemas.py
from pydantic import BaseModel, Field

class TaskCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)
    priority: int = Field(default=2, ge=1, le=4)
    due_date: Optional[date] = None
```

### 5.4 前端异步流程

```javascript
// frontend/js/taskManager.js
async saveTask() {
    try {
        await TaskAPI.create(data);      // 异步 API 调用
        Toast.success('任务已创建');      // 成功反馈
        await this.loadTasks();          // 刷新数据
    } catch (error) {
        Toast.error('保存失败');          // 错误处理
    }
}
```

---

*文档生成时间: 2026-04-12*
*版本: 1.0.0*
