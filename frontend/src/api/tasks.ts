import { apiFetch } from './client';
import type { Task, CreateTaskDTO, Note, WorkflowResponse } from '../types';

export const TaskAPI = {
  getAll: (filters?: { priority?: number; date_from?: string; date_to?: string }) =>
    apiFetch<Task[]>('/tasks', { params: filters }),

  getById: (id: number) =>
    apiFetch<Task>(`/tasks/${id}`),

  create: (data: CreateTaskDTO) =>
    apiFetch<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<CreateTaskDTO>) =>
    apiFetch<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' }),

  complete: (id: number) =>
    apiFetch<Record<string, unknown>>(`/tasks/${id}/complete`, { method: 'POST' }),

  updateOrder: (id: number, orderIndex: number) =>
    apiFetch<Task>(`/tasks/${id}/order`, {
      method: 'PATCH',
      body: JSON.stringify({ order_index: orderIndex }),
    }),

  getSubtask: (id: number) =>
    apiFetch<Task['subtasks'] extends (infer U)[] ? U : never>(`/subtasks/${id}`),

  getTaskNote: (taskId: number) =>
    apiFetch<Note>(`/tasks/${taskId}/note`),

  updateTaskNote: (taskId: number, content: string) =>
    apiFetch<Note>(`/tasks/${taskId}/note`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  getSubtaskNote: (subtaskId: number) =>
    apiFetch<Note>(`/subtasks/${subtaskId}/note`),

  updateSubtaskNote: (subtaskId: number, content: string) =>
    apiFetch<Note>(`/subtasks/${subtaskId}/note`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  getWorkflow: (taskId: number) =>
    apiFetch<WorkflowResponse>(`/tasks/${taskId}/workflow`),
};
