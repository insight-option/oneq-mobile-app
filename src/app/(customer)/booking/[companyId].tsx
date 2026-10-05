import { useLocalSearchParams } from 'expo-router';
import { BookingWizard } from '@/features/customer/booking/BookingWizard';

/** Keyed by the entry params so a new entry point (service, product, plan, gift) restarts the wizard. */
export default function BookingRoute() {
  const p = useLocalSearchParams<{ companyId: string; serviceId?: string; productId?: string; staffId?: string; planId?: string; giftId?: string }>();
  return <BookingWizard key={[p.companyId, p.serviceId, p.productId, p.staffId, p.planId, p.giftId].join('|')} />;
}
