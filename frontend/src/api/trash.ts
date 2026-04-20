import { apiFetch } from './client';
import type { Task } from '../types';

export const TrashAPI = {
  getAll: (limit = 100, offset = 0) =>
    apiFetch<Task[]>(`/trash?limit=${limit}&offset=${offset}`),

  get: (id: number) =>
    apiFetch<Task>(`/trash/${id}`),

  restore: (id: number) =>
    apiFetch<void>(`/trash/${id}/restore`, { method: 'POST' }),

  delete: (id: number) =>
    apiFetch<void>(`/trash/${id}/permanent`, { method: 'DELETE' }),

  cleanup: () =>
    apiFetch<void>('/trash/cleanup', { method: 'DELETE' }),

  empty: () =>
    apiFetch<void>('/trash/empty?confirm=true', { method: 'DELETE' }),
};
