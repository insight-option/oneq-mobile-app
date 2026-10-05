import { create } from 'zustand';
import type { BookingKind, BookingMode, CreateBookingResult, PaymentMethod, SavedAddress } from '@/domain/types';

export interface BookingDraft {
  companyId: string | null;
  serviceId: string | null;
  productId: string | null;
  kind: BookingKind;
  planId: string | null;
  mode: BookingMode;
  address: SavedAddress | null;
  staffId: string | null;
  date: string | null;
  time: string | null;
  isGift: boolean;
  giftName: string;
  giftPhone: string;
  giftMessage: string;
  giftId: string | null;
  usePoints: boolean;
  paymentMethod: PaymentMethod;
  notes: string;
}

const initial: BookingDraft = {
  companyId: null,
  serviceId: null,
  productId: null,
  kind: 'SERVICE',
  planId: null,
  mode: 'ONSITE',
  address: null,
  staffId: null,
  date: null,
  time: null,
  isGift: false,
  giftName: '',
  giftPhone: '',
  giftMessage: '',
  giftId: null,
  usePoints: false,
  paymentMethod: 'CARD',
  notes: '',
};

interface BookingDraftState {
  draft: BookingDraft;
  lastResult: CreateBookingResult | null;
  start: (patch: Partial<BookingDraft> & { companyId: string }) => void;
  set: (patch: Partial<BookingDraft>) => void;
  setResult: (r: CreateBookingResult | null) => void;
  reset: () => void;
}

export const useBookingDraft = create<BookingDraftState>((set) => ({
  draft: initial,
  lastResult: null,
  start: (patch) => set({ draft: { ...initial, ...patch } }),
  set: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  setResult: (lastResult) => set({ lastResult }),
  reset: () => set({ draft: initial }),
}));
