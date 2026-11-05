import { QueryClient } from '@tanstack/react-query';

/** Read cache rules from the roadmap (F3, data pattern). Writes never retry by themselves. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 2,
    },
    mutations: {
      retry: false,
    },
  },
});
