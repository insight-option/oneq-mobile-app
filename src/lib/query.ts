/**
 * TanStack Query client. The AsyncStorage persister below is prepared for PersistQueryClientProvider but not mounted:
 * media URLs are signed for one hour, so persisted catalogue rows would show expired images after a cold start.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'oneq.query.v1',
  throttleTime: 1000,
});

/** Only persist catalog-ish queries; user-specific data is refetched on launch. */
export const PERSISTED_QUERY_PREFIXES = ['categories', 'category', 'companies', 'company', 'services', 'products', 'staff', 'offers', 'featured', 'topRated', 'popular'];

export const shouldPersistQuery = (queryKey: readonly unknown[]): boolean => {
  const head = queryKey[0];
  return typeof head === 'string' && PERSISTED_QUERY_PREFIXES.includes(head);
};
