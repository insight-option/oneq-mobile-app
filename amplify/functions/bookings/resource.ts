import { defineFunction } from '@aws-amplify/backend';

/** createBooking · updateBookingStatus · cancelSubscription · rateBooking · replyReview · listTimeSlots */
export const bookingsFn = defineFunction({
  name: 'bookings',
  entry: './handler.ts',
  resourceGroupName: 'data',
  runtime: 22,
  timeoutSeconds: 30,
  memoryMB: 1024,
});
