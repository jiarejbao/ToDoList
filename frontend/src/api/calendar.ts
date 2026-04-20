import { apiFetch } from './client';
import type { Task } from '../types';

export const CalendarAPI = {
  getDates: (year?: number, month?: number) => {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (year) params.year = year;
    if (month) params.month = month;
    return apiFetch<string[]>(`/calendar/dates`, { params });
  },

  getByDate: (dateStr?: string) => {
    const query = dateStr ? `?date=${dateStr}` : '';
    return apiFetch<Task[]>(`/calendar/by-date${query}`);
  },

  getRange: (start: string, end: string) =>
    apiFetch<Task[]>(`/calendar/range?start=${start}&end=${end}`),

  getToday: () =>
    apiFetch<Task[]>('/calendar/today'),

  getUpcoming: (days = 7) =>
    apiFetch<Task[]>(`/calendar/upcoming?days=${days}`),
};
