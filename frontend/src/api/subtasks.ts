import { apiFetch } from './client';
import type { Subtask, CreateSubtaskDTO } from '../types';

export const SubtaskAPI = {
  create: (taskId: number, data: CreateSubtaskDTO) =>
    apiFetch<Subtask>(`/subtasks/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (id: number) =>
    apiFetch<Subtask>(`/subtasks/${id}`),

  update: (id: number, data: Partial<CreateSubtaskDTO>) =>
    apiFetch<Subtask>(`/subtasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<void>(`/subtasks/${id}`, { method: 'DELETE' }),

  complete: (id: number) =>
    apiFetch<Record<string, unknown>>(`/subtasks/${id}/complete`, { method: 'POST' }),

  updateOrder: (id: number, orderIndex: number) =>
    apiFetch<Subtask>(`/subtasks/${id}/order`, {
      method: 'PATCH',
      body: JSON.stringify({ order_index: orderIndex }),
    }),
};
