import { apiFetch } from './client';
import type { Dependency, CreateDependencyDTO } from '../types';

export const WorkflowAPI = {
  createDependency: (taskId: number, data: CreateDependencyDTO) =>
    apiFetch<Dependency>(`/tasks/${taskId}/dependencies`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteDependency: (depId: number) =>
    apiFetch<void>(`/dependencies/${depId}`, { method: 'DELETE' }),

  getUpstream: (subtaskId: number) =>
    apiFetch<Dependency[]>(`/subtasks/${subtaskId}/upstream`),

  getDownstream: (subtaskId: number) =>
    apiFetch<Dependency[]>(`/subtasks/${subtaskId}/downstream`),
};
