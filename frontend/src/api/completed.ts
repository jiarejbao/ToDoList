import { apiFetch } from './client';
import type { Task } from '../types';

export const CompletedAPI = {
  getAll: (limit = 100, offset = 0) =>
    apiFetch<Task[]>(`/completed?limit=${limit}&offset=${offset}`),

  get: (id: number) =>
    apiFetch<Task>(`/completed/${id}`),

  restore: (id: number) =>
    apiFetch<void>(`/completed/${id}/restore`, { method: 'POST' }),

  delete: (id: number) =>
    apiFetch<void>(`/completed/${id}`, { method: 'DELETE' }),
};
