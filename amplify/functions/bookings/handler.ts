import type { AppSyncResolverEvent } from 'aws-lambda';
import { env } from '$amplify/env/bookings';
import type { BookingStatus, CreateBookingInput, OpeningHours, RateBookingInput, SubscriptionPlan, WeeklyAvailability } from '../../../src/domain/types';
import { getClient, listAll, unwrap, type DataClient } from '../shared/client';
import { logActivity, notifyCompany, notifyUser } from '../shared/notify';
import { addPoints, getLoyalty } from '../shared/points';
import { ApiError, COMPLETION_BONUS, POINTS_PER_10_QAR, POINTS_PER_QAR, REVIEW_BONUS, addDays, bookingCode, buildWhatsAppUrl, fieldNameOf, fromJson, giftCode, identityOf, jsonArg, newId, normalizePhone, nowIso, qatarNow, requireSub, subscriptionCode, toJson, todayStr, weekdayOf, type LocalizedText } from '../shared/util';

type Args = Record<string, unknown>;
type Event = AppSyncResolverEvent<Args>;

const lt = (t: LocalizedText | null | undefined): LocalizedText => ({ ar: t?.ar ?? '', en: t?.en ?? t?.ar ?? '' });

const getProfile = async (client: DataClient, sub: string) => {
  const r = await client.models.UserProfile.get({ id: sub });
  if (!r.data) throw new ApiError('PROFILE_NOT_FOUND');
  return r.data;
};
const getCompany = async (client: DataClient, id: string) => {
  const r = await client.models.Company.get({ id });
  if (!r.data) throw new ApiError('COMPANY_NOT_FOUND');
  return r.data;
};
const findByPhone = async (client: DataClient, phone: string) => {
  const r = await client.models.UserProfile.listUserProfilesByPhoneKey({ phoneKey: phone }, { limit: 1 });
  return r.data?.[0] ?? null;
};

const WHATSAPP_TEXT = {
  ar: (sender: string, item: string, message: string, link: string) => `🎁 ${sender} أهداك ${item} عبر تطبيق OneQ!\n${message}\nحمّل التطبيق وسجّل برقم جوالك لاستلام هديتك: ${link}`,
  en: (sender: string, item: string, message: string, link: string) => `🎁 ${sender} sent you ${item} on OneQ!\n${message}\nDownload the app and sign in with your phone number to claim your gift: ${link}`,
};

/* ---------- createBooking ---------- */
const createBooking = async (client: DataClient, event: Event) => {
  const sub = requireSub(event);
  const input = jsonArg<CreateBookingInput>(event.arguments.input);
  const me = await getProfile(client, sub);
  const company = await getCompany(client, input.companyId);
  const service = input.serviceId ? (await client.models.Service.get({ id: input.serviceId })).data : null;
  const product = input.productId ? (await client.models.Product.get({ id: input.productId })).data : null;
  if (!service && !product) throw new ApiError('ITEM_REQUIRED');
  const member = input.staffId ? (await client.models.Staff.get({ id: input.staffId })).data : null;
  const plans = fromJson<SubscriptionPlan[]>(service?.subscriptionPlans, []);
  const plan = input.kind === 'SUBSCRIPTION' && service ? (plans.find((p) => p.id === input.planId) ?? null) : null;
  if (input.kind === 'SUBSCRIPTION' && !plan) throw new ApiError('PLAN_REQUIRED');
  if (input.mode === 'HOME' && !input.address) throw new ApiError('ADDRESS_REQUIRED');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) throw new ApiError('INVALID_DATETIME');

  const base = plan ? (plan.offerPrice ?? plan.price) : service ? (service.offerPrice ?? service.price) : (product?.offerPrice ?? product?.price ?? 0);
  const acc = await getLoyalty(client, sub);
  let pointsUsed = 0;
  let discount = 0;
  if (input.paymentMethod === 'POINTS') {
    const needed = Math.ceil(base / 10) * POINTS_PER_10_QAR;
    if ((acc.points ?? 0) < needed) throw new ApiError('INSUFFICIENT_POINTS');
    pointsUsed = needed;
    discount = base;
  } else if (input.usePoints && input.usePoints > 0) {
    pointsUsed = Math.min(acc.points ?? 0, Math.floor(input.usePoints / 100) * 100, Math.floor(base / 10) * 100);
    discount = (pointsUsed / POINTS_PER_10_QAR) * 10;
  }
  const total = Math.max(0, base - discount);
  const bookingId = newId();
  const itemName = lt(service?.name ?? product?.name);
  const companyName = lt(company.name);
  const now = nowIso();

  // Gift booking: deliver in-app when the recipient is registered, otherwise hand back a WhatsApp link.
  let gift: Record<string, unknown> | null = null;
  let whatsappUrl: string | null = null;
  if (input.gift?.recipientPhone) {
    const recipientPhone = normalizePhone(input.gift.recipientPhone);
    if (!recipientPhone) throw new ApiError('INVALID_RECIPIENT');
    const recipient = await findByPhone(client, recipientPhone);
    const created = unwrap(
      await client.models.Gift.create({
        id: newId(),
        code: giftCode(),
        senderId: sub,
        senderName: me.name,
        senderPhone: me.phone ?? '',
        recipientPhone,
        recipientId: recipient?.id ?? null,
        recipientName: recipient?.name ?? input.gift.recipientName ?? null,
        kind: product ? 'PRODUCT' : 'SERVICE',
        points: null,
        companyId: company.id,
        companyName,
        serviceId: service?.id ?? null,
        productId: product?.id ?? null,
        itemName,
        itemImageUrl: service?.imageUrl ?? product?.imageUrls?.[0] ?? null,
        amount: total,
        message: input.gift.message ?? null,
        status: recipient ? 'DELIVERED' : 'WHATSAPP_SENT',
        channel: recipient ? 'APP' : 'WHATSAPP',
        bookingId,
        sentAt: now,
        claimedAt: null,
      }),
      'gift',
    );
    gift = created as unknown as Record<string, unknown>;
    if (recipient) {
      await notifyUser(client, recipient.id, {
        type: 'GIFT',
        title: { ar: `وصلتك هدية من ${me.name} 🎁`, en: `You received a gift from ${me.name} 🎁` },
        body: { ar: `${itemName.ar} في ${companyName.ar}. استلمها من صفحة الهدايا.`, en: `${itemName.en} at ${companyName.en}. Claim it from your gifts page.` },
        route: `/gift/${created.id}`,
      });
    } else {
      const lang = (me.language as 'ar' | 'en') === 'en' ? 'en' : 'ar';
      whatsappUrl = buildWhatsAppUrl(recipientPhone, WHATSAPP_TEXT[lang](me.name, `${itemName[lang]} (${companyName[lang]})`, input.gift.message ?? '', 'https://oneq.qa/app'));
    }
  }

  // Subscription plan → subscription record
  let subscription: Record<string, unknown> | null = null;
  if (plan && service) {
    const start = input.date || todayStr();
    subscription = unwrap(
      await client.models.ServiceSubscription.create({
        id: newId(),
        code: subscriptionCode(),
        customerId: sub,
        customerName: me.name,
        companyId: company.id,
        companyOwner: company.ownerUserId ?? 'none',
        companyName,
        companyLogoUrl: company.logoUrl ?? null,
        serviceId: service.id,
        serviceName: lt(service.name),
        planId: plan.id,
        planName: lt(plan.name),
        sessionsPerWeek: plan.sessionsPerWeek,
        startDate: start,
        endDate: addDays(start, plan.durationWeeks * 7),
        totalSessions: plan.durationWeeks * plan.sessionsPerWeek,
        usedSessions: 0,
        price: total,
        status: 'ACTIVE',
        staffId: member?.id ?? null,
        mode: input.mode,
      }),
      'subscription',
    ) as unknown as Record<string, unknown>;
  }

  const booking = unwrap(
    await client.models.Booking.create({
      id: bookingId,
      code: bookingCode(),
      customerId: sub,
      customerName: me.name,
      customerPhone: me.phone ?? '',
      companyId: company.id,
      companyOwner: company.ownerUserId ?? 'none',
      companyName,
      companyLogoUrl: company.logoUrl ?? null,
      kind: plan ? 'SUBSCRIPTION' : product ? 'PRODUCT' : 'SERVICE',
      serviceId: service?.id ?? null,
      serviceName: service ? lt(service.name) : null,
      productId: product?.id ?? null,
      productName: product ? lt(product.name) : null,
      staffId: member?.id ?? null,
      staffName: member ? lt(member.name) : null,
      mode: input.mode,
      date: input.date,
      time: input.time,
      durationMin: service?.durationMin ?? null,
      address: toJson(input.address ?? null),
      status: 'PENDING',
      price: base,
      discount,
      pointsUsed,
      pointsEarned: Math.round(total * POINTS_PER_QAR) + COMPLETION_BONUS,
      total,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === 'CASH' ? 'ON_ARRIVAL' : 'PAID',
      isGift: Boolean(gift),
      giftId: (gift?.id as string | undefined) ?? null,
      subscriptionId: (subscription?.id as string | undefined) ?? null,
      notes: input.notes ?? null,
      companyRated: false,
      staffRated: false,
    }),
    'booking',
  );

  if (pointsUsed > 0) await addPoints(client, sub, -pointsUsed, 'REDEEM', { ar: `خصم على ${itemName.ar}`, en: `Discount on ${itemName.en}` }, bookingId);
  await client.models.Company.update({ id: company.id, bookingCount: (company.bookingCount ?? 0) + 1 });
  if (service) await client.models.Service.update({ id: service.id, bookingCount: (service.bookingCount ?? 0) + 1 });
  if (product) await client.models.Product.update({ id: product.id, salesCount: (product.salesCount ?? 0) + 1 });
  if (member) await client.models.Staff.update({ id: member.id, bookingCount: (member.bookingCount ?? 0) + 1 });
  await notifyCompany(client, company, {
    type: 'BOOKING',
    title: { ar: `حجز جديد من ${me.name}`, en: `New booking from ${me.name}` },
    body: { ar: `${itemName.ar} — ${input.date} ${input.time}`, en: `${itemName.en} — ${input.date} ${input.time}` },
    route: `/(company)/booking/${bookingId}`,
  });
  return { booking, subscription, gift, whatsappUrl };
};

/* ---------- updateBookingStatus ---------- */
const STATUS_TITLES: Record<BookingStatus, LocalizedText> = {
  PENDING: { ar: 'حجزك قيد التأكيد', en: 'Booking pending' },
  CONFIRMED: { ar: 'تم تأكيد حجزك', en: 'Booking confirmed' },
  IN_PROGRESS: { ar: 'حجزك قيد التنفيذ', en: 'Booking in progress' },
  COMPLETED: { ar: 'اكتمل حجزك', en: 'Booking completed' },
  CANCELLED: { ar: 'تم إلغاء حجزك', en: 'Booking cancelled' },
};

const updateBookingStatus = async (client: DataClient, event: Event) => {
  const { sub, isAdmin } = identityOf(event);
  if (!sub) throw new ApiError('UNAUTHENTICATED');
  const bookingId = String(event.arguments.bookingId);
  const status = String(event.arguments.status) as BookingStatus;
  if (!(status in STATUS_TITLES)) throw new ApiError('INVALID_STATUS');
  const booking = (await client.models.Booking.get({ id: bookingId })).data;
  if (!booking) throw new ApiError('NOT_FOUND');
  const company = await getCompany(client, booking.companyId);
  const isCustomer = booking.customerId === sub;
  const isOwner = company.ownerUserId === sub;
  if (!isCustomer && !isOwner && !isAdmin) throw new ApiError('FORBIDDEN');
  if (isCustomer && !isOwner && !isAdmin && status !== 'CANCELLED') throw new ApiError('FORBIDDEN');
  if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') throw new ApiError('BOOKING_CLOSED');

  const updated = unwrap(await client.models.Booking.update({ id: bookingId, status }), 'booking');
  const itemName = lt(booking.serviceName ?? booking.productName);
  const companyName = lt(booking.companyName);
  if (status === 'COMPLETED') {
    await addPoints(client, booking.customerId, booking.pointsEarned, 'EARN_BOOKING', { ar: `${itemName.ar} — ${companyName.ar}`, en: `${itemName.en} — ${companyName.en}` }, bookingId);
    if (booking.subscriptionId) {
      const s = (await client.models.ServiceSubscription.get({ id: booking.subscriptionId })).data;
      if (s) await client.models.ServiceSubscription.update({ id: s.id, usedSessions: Math.min(s.totalSessions, s.usedSessions + 1) });
    }
    await notifyUser(client, booking.customerId, {
      type: 'BOOKING',
      title: { ar: `قيّم تجربتك في ${companyName.ar}`, en: `Rate your visit to ${companyName.en}` },
      body: { ar: `اكتمل حجزك وأُضيفت ${booking.pointsEarned} نقطة إلى رصيدك.`, en: `Your booking is complete and ${booking.pointsEarned} points were added.` },
      route: `/order/${bookingId}`,
    });
  } else if (status === 'CANCELLED') {
    if (booking.pointsUsed > 0) await addPoints(client, booking.customerId, booking.pointsUsed, 'ADJUST', { ar: 'استرجاع نقاط حجز ملغي', en: 'Points refund for cancelled booking' }, bookingId);
    if (isCustomer && !isOwner) {
      await notifyCompany(client, company, { type: 'BOOKING', title: { ar: 'تم إلغاء حجز', en: 'Booking cancelled' }, body: { ar: `${booking.customerName} ألغى الحجز ${booking.code}`, en: `${booking.customerName} cancelled booking ${booking.code}` }, route: `/(company)/booking/${bookingId}` });
    } else {
      await notifyUser(client, booking.customerId, { type: 'BOOKING', title: STATUS_TITLES.CANCELLED, body: { ar: `${itemName.ar} — ${companyName.ar}`, en: `${itemName.en} — ${companyName.en}` }, route: `/order/${bookingId}` });
    }
  } else {
    await notifyUser(client, booking.customerId, { type: 'BOOKING', title: STATUS_TITLES[status], body: { ar: `${itemName.ar} — ${companyName.ar}`, en: `${itemName.en} — ${companyName.en}` }, route: `/order/${bookingId}` });
  }
  return updated;
};

/* ---------- cancelSubscription ---------- */
const cancelSubscription = async (client: DataClient, event: Event) => {
  const { sub, isAdmin } = identityOf(event);
  if (!sub) throw new ApiError('UNAUTHENTICATED');
  const id = String(event.arguments.subscriptionId);
  const s = (await client.models.ServiceSubscription.get({ id })).data;
  if (!s) throw new ApiError('NOT_FOUND');
  if (s.customerId !== sub && s.companyOwner !== sub && !isAdmin) throw new ApiError('FORBIDDEN');
  return unwrap(await client.models.ServiceSubscription.update({ id, status: 'CANCELLED' }), 'subscription');
};

/* ---------- rateBooking ---------- */
const average = (ratings: number[]) => (ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0);

const rateBooking = async (client: DataClient, event: Event) => {
  const sub = requireSub(event);
  const input = jsonArg<RateBookingInput>(event.arguments.input);
  const booking = (await client.models.Booking.get({ id: input.bookingId })).data;
  if (!booking) throw new ApiError('NOT_FOUND');
  if (booking.customerId !== sub) throw new ApiError('FORBIDDEN');
  if (booking.status !== 'COMPLETED') throw new ApiError('NOT_COMPLETED');
  if (booking.companyRated) throw new ApiError('ALREADY_RATED');
  const company = await getCompany(client, booking.companyId);
  const now = nowIso();
  await client.models.Review.create({ id: newId(), customerId: sub, customerName: booking.customerName, companyId: booking.companyId, companyOwner: company.ownerUserId ?? 'none', staffId: null, bookingId: booking.id, rating: input.companyRating, comment: input.companyComment ?? null, reply: null, sentAt: now });
  let staffRated = false;
  if (booking.staffId && input.staffRating) {
    await client.models.Review.create({ id: newId(), customerId: sub, customerName: booking.customerName, companyId: booking.companyId, companyOwner: company.ownerUserId ?? 'none', staffId: booking.staffId, bookingId: booking.id, rating: input.staffRating, comment: input.staffComment ?? null, reply: null, sentAt: now });
    staffRated = true;
    const staffReviews = await listAll((nextToken) => client.models.Review.listReviewsByStaff({ staffId: booking.staffId as string }, { nextToken: nextToken ?? undefined }));
    await client.models.Staff.update({ id: booking.staffId, ratingAvg: average(staffReviews.map((r) => r.rating)), ratingCount: staffReviews.length });
  }
  const companyReviews = await listAll((nextToken) => client.models.Review.listReviewsByCompany({ companyId: booking.companyId }, { nextToken: nextToken ?? undefined }));
  const companyOnly = companyReviews.filter((r) => !r.staffId);
  await client.models.Company.update({ id: company.id, ratingAvg: average(companyOnly.map((r) => r.rating)), ratingCount: companyOnly.length });
  const updated = unwrap(await client.models.Booking.update({ id: booking.id, companyRated: true, staffRated }), 'booking');
  await addPoints(client, sub, REVIEW_BONUS, 'BONUS', { ar: 'مكافأة تقييم الخدمة', en: 'Review bonus' }, booking.id);
  await notifyCompany(client, company, { type: 'REVIEW', title: { ar: `تقييم جديد ⭐ ${input.companyRating}`, en: `New ${input.companyRating}-star review` }, body: { ar: input.companyComment ?? '', en: input.companyComment ?? '' }, route: '/(company)/reviews' });
  return updated;
};

/* ---------- replyReview ---------- */
const replyReview = async (client: DataClient, event: Event) => {
  const { sub, isAdmin } = identityOf(event);
  if (!sub) throw new ApiError('UNAUTHENTICATED');
  const reviewId = String(event.arguments.reviewId);
  const text = String(event.arguments.text ?? '').trim();
  if (!text) throw new ApiError('TEXT_REQUIRED');
  const review = (await client.models.Review.get({ id: reviewId })).data;
  if (!review) throw new ApiError('NOT_FOUND');
  if (review.companyOwner !== sub && !isAdmin) throw new ApiError('FORBIDDEN');
  const updated = unwrap(await client.models.Review.update({ id: reviewId, reply: toJson({ text, at: nowIso() }) }), 'review');
  const company = await getCompany(client, review.companyId);
  await notifyUser(client, review.customerId, { type: 'REVIEW', title: { ar: `رد من ${lt(company.name).ar} على تقييمك`, en: `${lt(company.name).en} replied to your review` }, body: { ar: text, en: text }, route: `/(customer)/company/${company.id}` });
  return updated;
};

/* ---------- listTimeSlots ---------- */
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const listTimeSlots = async (client: DataClient, event: Event) => {
  const companyId = String(event.arguments.companyId);
  const date = String(event.arguments.date);
  const staffId = event.arguments.staffId ? String(event.arguments.staffId) : null;
  const durationMin = Number(event.arguments.durationMin ?? 0) || 0;
  const company = (await client.models.Company.get({ id: companyId })).data;
  if (!company) return [];
  const wd = weekdayOf(date) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const hours = fromJson<OpeningHours | null>(company.openingHours, null);
  const day = hours?.[wd];
  if (!day?.open) return [];
  let window: { from: string; to: string } | null = null;
  if (staffId) {
    const member = (await client.models.Staff.get({ id: staffId })).data;
    const avail = fromJson<WeeklyAvailability | undefined>(member?.availability, undefined);
    const d = avail?.[wd];
    if (!member || !d?.available) return [];
    window = { from: d.from, to: d.to };
  }
  let start = toMin(day.from);
  let end = toMin(day.to);
  if (end <= start) end = 24 * 60;
  if (window) {
    start = Math.max(start, toMin(window.from));
    end = Math.min(end, toMin(window.to) || end);
  }
  const step = durationMin >= 60 ? 60 : 30;
  const bookings = await listAll((nextToken) => client.models.Booking.listBookingsByCompany({ companyId, date: { eq: date } }, { nextToken: nextToken ?? undefined }));
  const booked = new Set(bookings.filter((b) => b.status !== 'CANCELLED' && (!staffId || b.staffId === staffId)).map((b) => b.time));
  const now = qatarNow();
  const isToday = date === now.toISOString().slice(0, 10);
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const slots: { time: string; available: boolean }[] = [];
  for (let m = start; m + step <= end; m += step) {
    const time = toTime(m);
    slots.push({ time, available: !booked.has(time) && !(isToday && m <= nowMin + 30) });
  }
  return slots;
};

export const handler = async (event: Event) => {
  const client = await getClient(env);
  const field = fieldNameOf(event);
  switch (field) {
    case 'placeBooking':
      return createBooking(client, event);
    case 'updateBookingStatus':
      return updateBookingStatus(client, event);
    case 'cancelSubscription':
      return cancelSubscription(client, event);
    case 'rateBooking':
      return rateBooking(client, event);
    case 'replyReview':
      return replyReview(client, event);
    case 'listTimeSlots':
      return listTimeSlots(client, event);
    default:
      throw new ApiError('UNKNOWN_FIELD_' + field);
  }
};

// keep the activity helper referenced for future owner-side audit hooks
void logActivity;
