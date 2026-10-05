import { useLocalSearchParams } from 'expo-router';
import { SendGiftWizard } from '@/features/customer/gifts/SendGiftWizard';

/** Keyed by the entry params so opening the wizard from a service/product/points entry restarts it. */
export default function SendGiftRoute() {
  const p = useLocalSearchParams<{ kind?: string; companyId?: string; serviceId?: string; productId?: string }>();
  return <SendGiftWizard key={[p.kind, p.companyId, p.serviceId, p.productId].join('|')} />;
}
