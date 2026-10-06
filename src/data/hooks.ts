/**
 * React Query hooks over the repository. Feature code should use these instead of calling `repo` directly,
 * so caching/invalidation stays consistent. Keys live in ./keys.ts.
 */
import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { useEffect } from 'react';
import { repo } from './index';
import { queryKeys as k } from './keys';
import type {
  AdminCreateCompanyInput,
  BookingStatus,
  CompanyFilter,
  CompanyProfilePatch,
  CreateBookingInput,
  DateString,
  RateBookingInput,
  SendGiftInput,
  StatsRange,
  UpsertCategoryInput,
  UpsertProductInput,
  UpsertServiceInput,
  UpsertStaffInput,
  UserProfile,
} from '@/domain/types';
import { useIsSignedIn } from '@/store/session';

type QOpts<T> = Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>;

/* ---------- Catalog ---------- */
export const useCategories = (opts?: QOpts<Awaited<ReturnType<typeof repo.catalog.listCategories>>>) =>
  useQuery({ queryKey: k.categories, queryFn: () => repo.catalog.listCategories(), staleTime: 10 * 60 * 1000, ...opts });

export const useCategory = (id: string | undefined) =>
  useQuery({ queryKey: k.category(id ?? ''), queryFn: () => repo.catalog.getCategory(id ?? ''), enabled: Boolean(id) });

export const useCompanies = (filter?: CompanyFilter, opts?: QOpts<Awaited<ReturnType<typeof repo.catalog.listCompanies>>>) =>
  useQuery({ queryKey: k.companies(filter), queryFn: () => repo.catalog.listCompanies(filter), ...opts });

export const useCompany = (id: string | undefined) =>
  useQuery({ queryKey: k.company(id ?? ''), queryFn: () => repo.catalog.getCompany(id ?? ''), enabled: Boolean(id) });

export const useServices = (companyId: string | undefined) =>
  useQuery({ queryKey: k.services(companyId ?? ''), queryFn: () => repo.catalog.listServices(companyId ?? ''), enabled: Boolean(companyId) });

export const useProducts = (companyId: string | undefined) =>
  useQuery({ queryKey: k.products(companyId ?? ''), queryFn: () => repo.catalog.listProducts(companyId ?? ''), enabled: Boolean(companyId) });

export const useStaff = (companyId: string | undefined) =>
  useQuery({ queryKey: k.staff(companyId ?? ''), queryFn: () => repo.catalog.listStaff(companyId ?? ''), enabled: Boolean(companyId) });

export const useStaffMember = (id: string | undefined) =>
  useQuery({ queryKey: k.staffMember(id ?? ''), queryFn: () => repo.catalog.getStaff(id ?? ''), enabled: Boolean(id) });

export const useOffers = (limit?: number) => useQuery({ queryKey: k.offers, queryFn: () => repo.catalog.listOffers(limit) });
export const useFeatured = (limit?: number) => useQuery({ queryKey: k.featured, queryFn: () => repo.catalog.listFeatured(limit) });
export const useTopRated = (limit?: number) => useQuery({ queryKey: k.topRated, queryFn: () => repo.catalog.listTopRated(limit) });
export const usePopular = (limit?: number) => useQuery({ queryKey: k.popular, queryFn: () => repo.catalog.listPopular(limit) });

export const useSearch = (query: string) =>
  useQuery({ queryKey: k.search(query), queryFn: () => repo.catalog.search(query), enabled: query.trim().length >= 2, staleTime: 30 * 1000 });

export const useCompanyReviews = (companyId: string | undefined) =>
  useQuery({ queryKey: k.companyReviews(companyId ?? ''), queryFn: () => repo.catalog.listCompanyReviews(companyId ?? ''), enabled: Boolean(companyId) });

export const useStaffReviews = (staffId: string | undefined) =>
  useQuery({ queryKey: k.staffReviews(staffId ?? ''), queryFn: () => repo.catalog.listStaffReviews(staffId ?? ''), enabled: Boolean(staffId) });

export const useTimeSlots = (input: { companyId: string; date: DateString; staffId?: string | null; durationMin?: number } | null) =>
  useQuery({
    queryKey: k.timeSlots(input?.companyId ?? '', input?.date ?? '', input?.staffId),
    queryFn: () => repo.catalog.listTimeSlots(input as NonNullable<typeof input>),
    enabled: Boolean(input?.companyId && input?.date),
    staleTime: 15 * 1000,
  });

/* ---------- Customer: bookings / subscriptions ---------- */
export const useMyBookings = () => {
  const signedIn = useIsSignedIn();
  const qc = useQueryClient();
  useEffect(() => {
    if (!signedIn) return;
    const off = repo.bookings.subscribeMine((bookings) => qc.setQueryData(k.myBookings, bookings));
    return off;
  }, [signedIn, qc]);
  return useQuery({ queryKey: k.myBookings, queryFn: () => repo.bookings.listMyBookings(), enabled: signedIn });
};

export const useBooking = (id: string | undefined) =>
  useQuery({ queryKey: k.booking(id ?? ''), queryFn: () => repo.bookings.getBooking(id ?? ''), enabled: Boolean(id) });

export const useMySubscriptions = () => {
  const signedIn = useIsSignedIn();
  return useQuery({ queryKey: k.mySubscriptions, queryFn: () => repo.bookings.listMySubscriptions(), enabled: signedIn });
};

export const useSubscription = (id: string | undefined) =>
  useQuery({ queryKey: k.subscription(id ?? ''), queryFn: () => repo.bookings.getSubscription(id ?? ''), enabled: Boolean(id) });

export const useCreateBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => repo.bookings.createBooking(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: k.myBookings });
      void qc.invalidateQueries({ queryKey: k.mySubscriptions });
      void qc.invalidateQueries({ queryKey: k.loyalty });
      void qc.invalidateQueries({ queryKey: k.giftsSent });
      void qc.invalidateQueries({ queryKey: k.notifications });
    },
  });
};

export const useCancelBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.bookings.cancelBooking(id),
    onSuccess: (booking) => {
      qc.setQueryData(k.booking(booking.id), booking);
      void qc.invalidateQueries({ queryKey: k.myBookings });
    },
  });
};

export const useRateBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RateBookingInput) => repo.bookings.rateBooking(input),
    onSuccess: (booking) => {
      qc.setQueryData(k.booking(booking.id), booking);
      void qc.invalidateQueries({ queryKey: k.myBookings });
      void qc.invalidateQueries({ queryKey: k.company(booking.companyId) });
      void qc.invalidateQueries({ queryKey: k.companyReviews(booking.companyId) });
      if (booking.staffId) {
        void qc.invalidateQueries({ queryKey: k.staffMember(booking.staffId) });
        void qc.invalidateQueries({ queryKey: k.staffReviews(booking.staffId) });
      }
    },
  });
};

export const useCancelSubscription = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.bookings.cancelSubscription(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: k.mySubscriptions }),
  });
};

/* ---------- Gifts & loyalty ---------- */
export const useReceivedGifts = () => {
  const signedIn = useIsSignedIn();
  return useQuery({ queryKey: k.giftsReceived, queryFn: () => repo.gifts.listReceived(), enabled: signedIn });
};
export const useSentGifts = () => {
  const signedIn = useIsSignedIn();
  return useQuery({ queryKey: k.giftsSent, queryFn: () => repo.gifts.listSent(), enabled: signedIn });
};
export const useGift = (id: string | undefined) => useQuery({ queryKey: k.gift(id ?? ''), queryFn: () => repo.gifts.getGift(id ?? ''), enabled: Boolean(id) });

export const useSendGift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SendGiftInput) => repo.gifts.sendGift(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: k.giftsSent });
      void qc.invalidateQueries({ queryKey: k.loyalty });
      void qc.invalidateQueries({ queryKey: k.loyaltyHistory });
    },
  });
};

export const useClaimGift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.gifts.claimGift(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: k.giftsReceived });
      void qc.invalidateQueries({ queryKey: k.loyalty });
      void qc.invalidateQueries({ queryKey: k.loyaltyHistory });
    },
  });
};

export const useLoyalty = () => {
  const signedIn = useIsSignedIn();
  return useQuery({ queryKey: k.loyalty, queryFn: () => repo.loyalty.getAccount(), enabled: signedIn });
};
export const useLoyaltyHistory = () => {
  const signedIn = useIsSignedIn();
  return useQuery({ queryKey: k.loyaltyHistory, queryFn: () => repo.loyalty.listHistory(), enabled: signedIn });
};
export const useTransferPoints = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { recipientPhone: string; points: number; message?: string }) => repo.loyalty.transferPoints(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: k.loyalty });
      void qc.invalidateQueries({ queryKey: k.loyaltyHistory });
      void qc.invalidateQueries({ queryKey: k.giftsSent });
    },
  });
};

/* ---------- Notifications ---------- */
export const useNotifications = () => {
  const signedIn = useIsSignedIn();
  const qc = useQueryClient();
  useEffect(() => {
    if (!signedIn) return;
    const off = repo.notifications.subscribe(() => {
      void qc.invalidateQueries({ queryKey: k.notifications });
      void qc.invalidateQueries({ queryKey: k.unreadCount });
    });
    return off;
  }, [signedIn, qc]);
  return useQuery({ queryKey: k.notifications, queryFn: () => repo.notifications.list(), enabled: signedIn });
};
export const useUnreadCount = () => {
  const signedIn = useIsSignedIn();
  return useQuery({ queryKey: k.unreadCount, queryFn: () => repo.notifications.unreadCount(), enabled: signedIn, refetchInterval: 60 * 1000 });
};
export const useMarkRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.notifications.markRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: k.notifications });
      void qc.invalidateQueries({ queryKey: k.unreadCount });
    },
  });
};
export const useMarkAllRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => repo.notifications.markAllRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: k.notifications });
      void qc.invalidateQueries({ queryKey: k.unreadCount });
    },
  });
};

/* ---------- Profile ---------- */
export const useMe = () => {
  const signedIn = useIsSignedIn();
  return useQuery({ queryKey: k.me, queryFn: () => repo.profile.getMe(), enabled: signedIn });
};
export const useUpdateMe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Pick<UserProfile, 'name' | 'email' | 'avatarUrl' | 'language' | 'addresses'>>) => repo.profile.updateMe(patch),
    onSuccess: (me) => qc.setQueryData(k.me, me),
  });
};
export const useFavorites = () => {
  const signedIn = useIsSignedIn();
  return useQuery({ queryKey: k.favorites, queryFn: () => repo.profile.listFavorites(), enabled: signedIn });
};
export const useToggleFavorite = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string) => repo.profile.toggleFavorite(companyId),
    onMutate: async (companyId) => {
      await qc.cancelQueries({ queryKey: k.me });
      const prev = qc.getQueryData<UserProfile | null>(k.me);
      if (prev) {
        const has = prev.favorites.includes(companyId);
        const next: UserProfile = { ...prev, favorites: has ? prev.favorites.filter((id) => id !== companyId) : [...prev.favorites, companyId] };
        qc.setQueryData(k.me, () => next);
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(k.me, ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: k.me });
      void qc.invalidateQueries({ queryKey: k.favorites });
    },
  });
};

/* ---------- Company workspace ---------- */
export const useMyCompany = () => useQuery({ queryKey: k.myCompany, queryFn: () => repo.company.getMyCompany() });
export const useCompanyStats = (range: StatsRange) => useQuery({ queryKey: k.companyStats(range), queryFn: () => repo.company.getStats(range) });
export const useCompanyBookings = (input: { range: 'today' | 'week' | 'month'; kind?: 'SERVICE' | 'PRODUCT' | 'SUBSCRIPTION'; status?: BookingStatus }) =>
  useQuery({ queryKey: k.companyBookings(input.range, input.kind, input.status), queryFn: () => repo.company.listBookings(input) });
export const useCompanySubscriptions = () => useQuery({ queryKey: k.companySubscriptions, queryFn: () => repo.company.listSubscriptions() });
export const useCompanyReviewsMine = () => useQuery({ queryKey: k.companyReviewsMine, queryFn: () => repo.company.listReviews() });
export const useCompanyNotifications = () => useQuery({ queryKey: k.companyNotifications, queryFn: () => repo.company.listNotifications() });

const invalidateCompany = (qc: ReturnType<typeof useQueryClient>, companyId?: string) => {
  void qc.invalidateQueries({ queryKey: k.myCompany });
  void qc.invalidateQueries({ queryKey: ['companyStats'] });
  void qc.invalidateQueries({ queryKey: ['companyBookings'] });
  void qc.invalidateQueries({ queryKey: k.offers });
  if (companyId) {
    void qc.invalidateQueries({ queryKey: k.company(companyId) });
    void qc.invalidateQueries({ queryKey: k.services(companyId) });
    void qc.invalidateQueries({ queryKey: k.products(companyId) });
    void qc.invalidateQueries({ queryKey: k.staff(companyId) });
  }
};

export const useUpdateMyCompany = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: CompanyProfilePatch) => repo.company.updateMyCompany(patch),
    onSuccess: (company) => {
      qc.setQueryData(k.myCompany, company);
      invalidateCompany(qc, company.id);
    },
  });
};
export const useUpsertService = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: UpsertServiceInput) => repo.company.upsertService(input), onSuccess: (s) => invalidateCompany(qc, s.companyId) });
};
export const useDeleteService = (companyId?: string) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => repo.company.deleteService(id), onSuccess: () => invalidateCompany(qc, companyId) });
};
export const useSetServiceOffer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; offer: { offerPrice: number; endsAt?: string | null; imageUrl?: string | null } | null }) => repo.company.setServiceOffer(input.id, input.offer),
    onSuccess: (s) => invalidateCompany(qc, s.companyId),
  });
};
export const useUpsertProduct = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: UpsertProductInput) => repo.company.upsertProduct(input), onSuccess: (p) => invalidateCompany(qc, p.companyId) });
};
export const useDeleteProduct = (companyId?: string) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => repo.company.deleteProduct(id), onSuccess: () => invalidateCompany(qc, companyId) });
};
export const useSetProductOffer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; offer: { offerPrice: number; endsAt?: string | null } | null }) => repo.company.setProductOffer(input.id, input.offer),
    onSuccess: (p) => invalidateCompany(qc, p.companyId),
  });
};
export const useUpsertStaff = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: UpsertStaffInput) => repo.company.upsertStaff(input), onSuccess: (s) => invalidateCompany(qc, s.companyId) });
};
export const useDeleteStaff = (companyId?: string) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => repo.company.deleteStaff(id), onSuccess: () => invalidateCompany(qc, companyId) });
};
export const useUpdateBookingStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; status: BookingStatus }) => repo.company.updateBookingStatus(input.id, input.status),
    onSuccess: (b) => {
      qc.setQueryData(k.booking(b.id), b);
      invalidateCompany(qc, b.companyId);
      void qc.invalidateQueries({ queryKey: ['adminBookingsByDay'] });
    },
  });
};
export const useReplyReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; text: string }) => repo.company.replyReview(input.id, input.text),
    onSuccess: () => void qc.invalidateQueries({ queryKey: k.companyReviewsMine }),
  });
};

/* ---------- Admin ---------- */
export const useAdminStats = (range: StatsRange) => useQuery({ queryKey: k.adminStats(range), queryFn: () => repo.admin.getStats(range) });
export const useAdminCompanies = (filter?: CompanyFilter & { status?: 'active' | 'inactive' | 'pending' }) =>
  useQuery({ queryKey: k.adminCompanies(filter), queryFn: () => repo.admin.listCompanies(filter) });
export const useAdminBookingsByDay = (date: DateString) => useQuery({ queryKey: k.adminBookingsByDay(date), queryFn: () => repo.admin.listBookingsByDay(date) });
export const useAdminPerformance = (range: StatsRange) => useQuery({ queryKey: k.adminPerformance(range), queryFn: () => repo.admin.listPerformance(range) });
export const useAdminActivity = (limit?: number) => useQuery({ queryKey: k.adminActivity, queryFn: () => repo.admin.listActivity(limit) });
export const useAdminNotifications = () => useQuery({ queryKey: k.adminNotifications, queryFn: () => repo.admin.listNotifications() });
export const useAdminCustomers = () => useQuery({ queryKey: k.adminCustomers, queryFn: () => repo.admin.listCustomers() });
export const useAdminCategories = () => useQuery({ queryKey: k.adminCategories, queryFn: () => repo.admin.listCategories() });

const invalidateAdmin = (qc: ReturnType<typeof useQueryClient>) => {
  void qc.invalidateQueries({ queryKey: ['adminCompanies'] });
  void qc.invalidateQueries({ queryKey: ['adminStats'] });
  void qc.invalidateQueries({ queryKey: ['adminPerformance'] });
  void qc.invalidateQueries({ queryKey: k.categories });
  void qc.invalidateQueries({ queryKey: k.adminCategories });
  void qc.invalidateQueries({ queryKey: ['companies'] });
  void qc.invalidateQueries({ queryKey: k.adminActivity });
};
export const useAdminCreateCompany = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: AdminCreateCompanyInput) => repo.admin.createCompany(input), onSuccess: () => invalidateAdmin(qc) });
};
export const useAdminUpdateCompany = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; patch: CompanyProfilePatch }) => repo.admin.updateCompany(input.id, input.patch),
    onSuccess: (c) => {
      qc.setQueryData(k.company(c.id), c);
      invalidateAdmin(qc);
    },
  });
};
export const useAdminSetCompanyActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) => repo.admin.setCompanyActive(input.id, input.isActive),
    onSuccess: (c) => {
      qc.setQueryData(k.company(c.id), c);
      invalidateAdmin(qc);
    },
  });
};
export const useAdminUpsertCategory = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: UpsertCategoryInput) => repo.admin.upsertCategory(input), onSuccess: () => invalidateAdmin(qc) });
};
export const useAdminDeleteCompany = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.admin.deleteCompany(id),
    onSuccess: (_r, id) => {
      qc.removeQueries({ queryKey: k.company(id) });
      invalidateAdmin(qc);
      qc.invalidateQueries({ queryKey: ['companies'] });
    },
  });
};
export const useAdminDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => repo.admin.deleteCategory(id), onSuccess: () => invalidateAdmin(qc) });
};
export const useAdminBroadcast = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: { ar: string; en: string }; body: { ar: string; en: string }; route?: string }) => repo.admin.broadcast(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: k.adminNotifications }),
  });
};
