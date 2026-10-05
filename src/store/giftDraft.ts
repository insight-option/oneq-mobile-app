import { create } from 'zustand';
import type { GiftKind, PaymentMethod, SendGiftResult } from '@/domain/types';

export interface GiftDraft {
  kind: GiftKind | null;
  points: number;
  companyId: string | null;
  serviceId: string | null;
  productId: string | null;
  recipientPhone: string;
  recipientName: string;
  message: string;
  paymentMethod: PaymentMethod;
}

const initial: GiftDraft = { kind: null, points: 100, companyId: null, serviceId: null, productId: null, recipientPhone: '', recipientName: '', message: '', paymentMethod: 'CARD' };

interface GiftDraftState {
  draft: GiftDraft;
  lastResult: SendGiftResult | null;
  set: (patch: Partial<GiftDraft>) => void;
  reset: (patch?: Partial<GiftDraft>) => void;
  setResult: (r: SendGiftResult | null) => void;
}

export const useGiftDraft = create<GiftDraftState>((set) => ({
  draft: initial,
  lastResult: null,
  set: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  reset: (patch) => set({ draft: { ...initial, ...patch }, lastResult: null }),
  setResult: (lastResult) => set({ lastResult }),
}));
