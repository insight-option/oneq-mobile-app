import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  title: string;
  body?: string;
  type: ToastType;
  duration: number;
}

interface ToastState {
  items: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => void;
  remove: (id: number) => void;
}

let seq = 1;

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (t) => set((s) => ({ items: [...s.items.slice(-2), { ...t, id: seq++ }] })),
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

export const toast = {
  show: (input: { title: string; body?: string; type?: ToastType; duration?: number }) =>
    useToastStore.getState().push({ title: input.title, body: input.body, type: input.type ?? 'info', duration: input.duration ?? 2800 }),
  success: (title: string, body?: string) => useToastStore.getState().push({ title, body, type: 'success', duration: 2600 }),
  error: (title: string, body?: string) => useToastStore.getState().push({ title, body, type: 'error', duration: 3400 }),
  info: (title: string, body?: string) => useToastStore.getState().push({ title, body, type: 'info', duration: 2600 }),
};
