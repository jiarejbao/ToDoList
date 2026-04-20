export interface Task {
  id: number;
  content: string;
  description?: string;
  due_date?: string;
  priority: 1 | 2 | 3 | 4;
  order_index: number;
  subtasks?: Subtask[];
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: number;
  task_id: number;
  content: string;
  description?: string;
  due_date?: string;
  priority: 1 | 2 | 3 | 4;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id?: number;
  task_id?: number;
  subtask_id?: number;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface Dependency {
  id: number;
  task_id: number;
  from_subtask_id: number;
  to_subtask_id: number;
  dependency_type: 'BLOCKS' | 'REQUIRES' | 'TRIGGERS';
  created_at: string;
}

export interface WorkflowResponse {
  task_id: number;
  task_name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowNode {
  data: {
    id: string;
    label: string;
    priority?: number;
    due_date?: string;
    description?: string;
  };
}

export interface WorkflowEdge {
  data: {
    id: string;
    source: string;
    target: string;
    type: string;
  };
}

export interface CreateTaskDTO {
  content: string;
  description?: string;
  due_date?: string;
  priority?: number;
  order_index?: number;
  subtasks?: { content: string; priority?: number }[];
}

export interface CreateSubtaskDTO {
  content: string;
  description?: string;
  due_date?: string;
  priority?: number;
}

export interface CreateDependencyDTO {
  from_subtask_id: number;
  to_subtask_id: number;
  dependency_type?: string;
}

export interface APIResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}
