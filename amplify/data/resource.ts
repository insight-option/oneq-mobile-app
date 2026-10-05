import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { postConfirmation } from '../auth/post-confirmation/resource';
import { adminFn } from '../functions/admin/resource';
import { bookingsFn } from '../functions/bookings/resource';
import { catalogStream } from '../functions/catalog-stream/resource';
import { expireSubscriptions } from '../functions/expire-subscriptions/resource';
import { giftsFn } from '../functions/gifts/resource';

/**
 * OneQ data model (mirrors src/domain/types.ts).
 * - Catalogue models (Category, Company, Service, Product, Staff, Review) are readable by guests and signed-in users.
 * - Company owners edit their own rows through `owner` (Cognito sub); admins (group ADMINS) can do everything.
 * - Money-moving operations (bookings, gifts, points, ratings, admin company creation, broadcasts) run in Lambda
 *   handlers so prices, balances and notifications are validated server-side.
 * - Bilingual text is the `LocalizedText` custom type; weekly schedules / plans / addresses are JSON blobs.
 */
const schema = a
  .schema({
    LocalizedText: a.customType({ ar: a.string().required(), en: a.string().required() }),
    GeoPoint: a.customType({ lat: a.float().required(), lng: a.float().required() }),

    Category: a
      .model({
        slug: a.string().required(),
        name: a.ref('LocalizedText').required(),
        description: a.ref('LocalizedText').required(),
        icon: a.string().required(),
        color: a.string().required(),
        imageUrl: a.string(),
        sortOrder: a.integer().required(),
        isActive: a.boolean().required(),
        requiresAudience: a.boolean(),
        /** Subcategory[] — small embedded list */
        subcategories: a.json().required(),
      })
      .authorization((allow) => [allow.guest().to(['read']), allow.authenticated().to(['read']), allow.group('ADMINS')]),

    Company: a
      .model({
        slug: a.string().required(),
        categoryId: a.id().required(),
        subcategoryIds: a.string().array().required(),
        name: a.ref('LocalizedText').required(),
        tagline: a.ref('LocalizedText'),
        description: a.ref('LocalizedText').required(),
        logoUrl: a.string(),
        coverUrl: a.string(),
        galleryUrls: a.string().array().required(),
        area: a.string().required(),
        address: a.ref('LocalizedText').required(),
        location: a.ref('GeoPoint').required(),
        phone: a.string().required(),
        whatsapp: a.string(),
        email: a.string(),
        serviceMode: a.string().required(),
        offersSubscriptions: a.boolean().required(),
        hasStaff: a.boolean().required(),
        audience: a.string().required(),
        /** OpeningHours (Record<Weekday, DayHours>) */
        openingHours: a.json().required(),
        amenities: a.string().array().required(),
        tags: a.string().array().required(),
        acceptsInsurance: a.string().array(),
        ratingAvg: a.float().required(),
        ratingCount: a.integer().required(),
        bookingCount: a.integer().required(),
        staffCount: a.integer().required(),
        priceFrom: a.float(),
        isActive: a.boolean().required(),
        isVerified: a.boolean().required(),
        isFeatured: a.boolean().required(),
        ownerUserId: a.string(),
        ownerPhone: a.string(),
        ownerEmail: a.string(),
        /** { location, hours, catalog, media } */
        completion: a.json().required(),
        /** Cognito sub of the owner account (ownerDefinedIn) */
        owner: a.string(),
      })
      .secondaryIndexes((index) => [index('categoryId').queryField('listCompaniesByCategory'), index('ownerUserId').queryField('listCompaniesByOwner')])
      .authorization((allow) => [allow.guest().to(['read']), allow.authenticated().to(['read']), allow.ownerDefinedIn('owner').to(['read', 'update']), allow.group('ADMINS')]),

    Service: a
      .model({
        companyId: a.id().required(),
        name: a.ref('LocalizedText').required(),
        description: a.ref('LocalizedText').required(),
        price: a.float().required(),
        offerPrice: a.float(),
        isOffer: a.boolean().required(),
        /** 'OFFER' while an offer is active (sparse index for the home carousel) */
        offerKey: a.string(),
        offerEndsAt: a.datetime(),
        offerImageUrl: a.string(),
        durationMin: a.integer().required(),
        imageUrl: a.string(),
        allowOneTime: a.boolean().required(),
        allowSubscription: a.boolean().required(),
        /** SubscriptionPlan[] */
        subscriptionPlans: a.json().required(),
        requiresStaff: a.boolean().required(),
        isActive: a.boolean().required(),
        sortOrder: a.integer().required(),
        bookingCount: a.integer().required(),
        owner: a.string(),
      })
      .secondaryIndexes((index) => [index('companyId').queryField('listServicesByCompany'), index('offerKey').queryField('listServiceOffers')])
      .authorization((allow) => [allow.guest().to(['read']), allow.authenticated().to(['read']), allow.ownerDefinedIn('owner'), allow.group('ADMINS')]),

    Product: a
      .model({
        companyId: a.id().required(),
        name: a.ref('LocalizedText').required(),
        description: a.ref('LocalizedText').required(),
        price: a.float().required(),
        offerPrice: a.float(),
        isOffer: a.boolean().required(),
        offerKey: a.string(),
        offerEndsAt: a.datetime(),
        imageUrls: a.string().array().required(),
        stock: a.integer(),
        isActive: a.boolean().required(),
        salesCount: a.integer().required(),
        owner: a.string(),
      })
      .secondaryIndexes((index) => [index('companyId').queryField('listProductsByCompany'), index('offerKey').queryField('listProductOffers')])
      .authorization((allow) => [allow.guest().to(['read']), allow.authenticated().to(['read']), allow.ownerDefinedIn('owner'), allow.group('ADMINS')]),

    Staff: a
      .model({
        companyId: a.id().required(),
        name: a.ref('LocalizedText').required(),
        title: a.string().required(),
        bio: a.ref('LocalizedText'),
        photoUrl: a.string(),
        experienceYears: a.integer().required(),
        /** LocalizedText[] */
        specialties: a.json().required(),
        languages: a.string().array(),
        pricePerSession: a.float(),
        isAvailable: a.boolean().required(),
        /** WeeklyAvailability */
        availability: a.json().required(),
        ratingAvg: a.float().required(),
        ratingCount: a.integer().required(),
        bookingCount: a.integer().required(),
        isActive: a.boolean().required(),
        owner: a.string(),
      })
      .secondaryIndexes((index) => [index('companyId').queryField('listStaffByCompany')])
      .authorization((allow) => [allow.guest().to(['read']), allow.authenticated().to(['read']), allow.ownerDefinedIn('owner'), allow.group('ADMINS')]),

    Booking: a
      .model({
        code: a.string().required(),
        customerId: a.string().required(),
        customerName: a.string().required(),
        customerPhone: a.string().required(),
        companyId: a.id().required(),
        /** Cognito sub of the company owner (read access for the company workspace) */
        companyOwner: a.string().required(),
        companyName: a.ref('LocalizedText').required(),
        companyLogoUrl: a.string(),
        kind: a.string().required(),
        serviceId: a.string(),
        serviceName: a.ref('LocalizedText'),
        productId: a.string(),
        productName: a.ref('LocalizedText'),
        staffId: a.string(),
        staffName: a.ref('LocalizedText'),
        mode: a.string().required(),
        date: a.string().required(),
        time: a.string().required(),
        durationMin: a.integer(),
        /** SavedAddress */
        address: a.json(),
        status: a.string().required(),
        price: a.float().required(),
        discount: a.float().required(),
        pointsUsed: a.integer().required(),
        pointsEarned: a.integer().required(),
        total: a.float().required(),
        paymentMethod: a.string().required(),
        paymentStatus: a.string().required(),
        isGift: a.boolean().required(),
        giftId: a.string(),
        subscriptionId: a.string(),
        notes: a.string(),
        companyRated: a.boolean().required(),
        staffRated: a.boolean().required(),
      })
      .secondaryIndexes((index) => [
        index('customerId').sortKeys(['date']).queryField('listBookingsByCustomer'),
        index('companyId').sortKeys(['date']).queryField('listBookingsByCompany'),
        index('date').sortKeys(['time']).queryField('listBookingsByDate'),
      ])
      .authorization((allow) => [allow.ownerDefinedIn('customerId').to(['read']), allow.ownerDefinedIn('companyOwner').to(['read']), allow.group('ADMINS')]),

    ServiceSubscription: a
      .model({
        code: a.string().required(),
        customerId: a.string().required(),
        customerName: a.string().required(),
        companyId: a.id().required(),
        companyOwner: a.string().required(),
        companyName: a.ref('LocalizedText').required(),
        companyLogoUrl: a.string(),
        serviceId: a.string().required(),
        serviceName: a.ref('LocalizedText').required(),
        planId: a.string().required(),
        planName: a.ref('LocalizedText').required(),
        sessionsPerWeek: a.integer().required(),
        startDate: a.string().required(),
        endDate: a.string().required(),
        totalSessions: a.integer().required(),
        usedSessions: a.integer().required(),
        price: a.float().required(),
        status: a.string().required(),
        staffId: a.string(),
        mode: a.string().required(),
      })
      .secondaryIndexes((index) => [index('customerId').queryField('listSubscriptionsByCustomer'), index('companyId').queryField('listSubscriptionsByCompany')])
      .authorization((allow) => [allow.ownerDefinedIn('customerId').to(['read']), allow.ownerDefinedIn('companyOwner').to(['read']), allow.group('ADMINS')]),

    Gift: a
      .model({
        code: a.string().required(),
        senderId: a.string().required(),
        senderName: a.string().required(),
        senderPhone: a.string().required(),
        recipientPhone: a.string().required(),
        recipientId: a.string(),
        recipientName: a.string(),
        kind: a.string().required(),
        points: a.integer(),
        companyId: a.string(),
        companyName: a.ref('LocalizedText'),
        serviceId: a.string(),
        productId: a.string(),
        itemName: a.ref('LocalizedText'),
        itemImageUrl: a.string(),
        amount: a.float(),
        message: a.string(),
        status: a.string().required(),
        channel: a.string().required(),
        bookingId: a.string(),
        sentAt: a.datetime().required(),
        claimedAt: a.datetime(),
      })
      .secondaryIndexes((index) => [index('senderId').queryField('listGiftsBySender'), index('recipientId').queryField('listGiftsByRecipient'), index('recipientPhone').queryField('listGiftsByRecipientPhone')])
      .authorization((allow) => [allow.ownerDefinedIn('senderId').to(['read']), allow.ownerDefinedIn('recipientId').to(['read']), allow.group('ADMINS')]),

    LoyaltyAccount: a
      .model({
        customerId: a.string().required(),
        points: a.integer().required(),
        lifetimePoints: a.integer().required(),
        tier: a.string().required(),
        nextTierAt: a.integer(),
      })
      .authorization((allow) => [allow.ownerDefinedIn('customerId').to(['read']), allow.group('ADMINS').to(['read'])]),

    PointsTransaction: a
      .model({
        customerId: a.string().required(),
        delta: a.integer().required(),
        type: a.string().required(),
        refId: a.string(),
        note: a.ref('LocalizedText').required(),
        sentAt: a.datetime().required(),
      })
      .secondaryIndexes((index) => [index('customerId').sortKeys(['sentAt']).queryField('listPointsByCustomer')])
      .authorization((allow) => [allow.ownerDefinedIn('customerId').to(['read']), allow.group('ADMINS').to(['read'])]),

    Review: a
      .model({
        customerId: a.string().required(),
        customerName: a.string().required(),
        companyId: a.id().required(),
        companyOwner: a.string().required(),
        staffId: a.string(),
        bookingId: a.string().required(),
        rating: a.integer().required(),
        comment: a.string(),
        /** { text, at } */
        reply: a.json(),
        sentAt: a.datetime().required(),
      })
      .secondaryIndexes((index) => [index('companyId').sortKeys(['sentAt']).queryField('listReviewsByCompany'), index('staffId').sortKeys(['sentAt']).queryField('listReviewsByStaff')])
      .authorization((allow) => [allow.guest().to(['read']), allow.authenticated().to(['read']), allow.ownerDefinedIn('companyOwner').to(['read', 'update']), allow.group('ADMINS')]),

    Notification: a
      .model({
        userId: a.string().required(),
        owner: a.string().required(),
        audience: a.string().required(),
        type: a.string().required(),
        title: a.ref('LocalizedText').required(),
        body: a.ref('LocalizedText').required(),
        imageUrl: a.string(),
        route: a.string(),
        data: a.json(),
        read: a.boolean().required(),
        sentAt: a.datetime().required(),
      })
      .secondaryIndexes((index) => [index('userId').sortKeys(['sentAt']).queryField('listNotificationsByUser')])
      .authorization((allow) => [allow.ownerDefinedIn('owner').to(['read', 'update']), allow.group('ADMINS')]),

    PushToken: a
      .model({
        userId: a.string().required(),
        token: a.string().required(),
        platform: a.string().required(),
      })
      .secondaryIndexes((index) => [index('userId').queryField('listPushTokensByUserId')])
      .authorization((allow) => [allow.ownerDefinedIn('userId'), allow.group('ADMINS').to(['read'])]),

    UserProfile: a
      .model({
        owner: a.string().required(),
        role: a.string().required(),
        name: a.string().required(),
        phone: a.string(),
        /** normalised phone used by the GSI (null for email-only accounts) */
        phoneKey: a.string(),
        email: a.string(),
        avatarUrl: a.string(),
        language: a.string().required(),
        favorites: a.string().array().required(),
        /** SavedAddress[] */
        addresses: a.json().required(),
        companyId: a.string(),
      })
      .secondaryIndexes((index) => [index('phoneKey').queryField('listUserProfilesByPhoneKey'), index('role').queryField('listUserProfilesByRole')])
      .authorization((allow) => [allow.ownerDefinedIn('owner').to(['create', 'read', 'update']), allow.group('ADMINS')]),

    ActivityLog: a
      .model({
        /** constant 'ALL' so the feed can be read newest-first from one partition */
        feed: a.string().required(),
        actorId: a.string().required(),
        actorName: a.string().required(),
        companyId: a.string(),
        companyName: a.ref('LocalizedText'),
        action: a.string().required(),
        summary: a.ref('LocalizedText').required(),
        sentAt: a.datetime().required(),
      })
      .secondaryIndexes((index) => [index('feed').sortKeys(['sentAt']).queryField('listActivityByFeed')])
      .authorization((allow) => [allow.group('ADMINS').to(['read'])]),

    /* ---------- custom operations (Lambda handlers) ---------- */
    listTimeSlots: a
      .query()
      .arguments({ companyId: a.id().required(), date: a.string().required(), staffId: a.string(), durationMin: a.integer() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated(), allow.guest()])
      .handler(a.handler.function(bookingsFn)),
    placeBooking: a
      .mutation()
      .arguments({ input: a.json().required() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(bookingsFn)),
    updateBookingStatus: a
      .mutation()
      .arguments({ bookingId: a.id().required(), status: a.string().required() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(bookingsFn)),
    cancelSubscription: a
      .mutation()
      .arguments({ subscriptionId: a.id().required() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(bookingsFn)),
    rateBooking: a
      .mutation()
      .arguments({ input: a.json().required() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(bookingsFn)),
    replyReview: a
      .mutation()
      .arguments({ reviewId: a.id().required(), text: a.string().required() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(bookingsFn)),
    lookupRecipient: a
      .query()
      .arguments({ phone: a.string().required() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(giftsFn)),
    sendGift: a
      .mutation()
      .arguments({ input: a.json().required() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(giftsFn)),
    claimGift: a
      .mutation()
      .arguments({ giftId: a.id().required() })
      .returns(a.json())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(giftsFn)),
    adminCreateCompany: a
      .mutation()
      .arguments({ input: a.json().required() })
      .returns(a.json())
      .authorization((allow) => [allow.group('ADMINS')])
      .handler(a.handler.function(adminFn)),
    broadcastNotification: a
      .mutation()
      .arguments({ input: a.json().required() })
      .returns(a.json())
      .authorization((allow) => [allow.group('ADMINS')])
      .handler(a.handler.function(adminFn)),
  })
  .authorization((allow) => [
    allow.resource(postConfirmation).to(['query', 'mutate']),
    allow.resource(bookingsFn).to(['query', 'mutate']),
    allow.resource(giftsFn).to(['query', 'mutate']),
    allow.resource(adminFn).to(['query', 'mutate']),
    allow.resource(catalogStream).to(['query', 'mutate']),
    allow.resource(expireSubscriptions).to(['query', 'mutate']),
  ]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
